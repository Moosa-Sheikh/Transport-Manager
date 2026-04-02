import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  customerDuesTable, driverLoansTable, otherLoansTable, ownerLoansTable,
  dueRepaymentsTable, cashBookTable, customersTable, driversTable,
} from "@workspace/db/schema";
import { eq, and, gte, lte, sql, ilike, type SQL } from "drizzle-orm";

const router: IRouter = Router();

function isValidDate(val: unknown): val is string {
  if (typeof val !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const d = new Date(val + "T00:00:00Z");
  if (isNaN(d.getTime())) return false;
  const [y, m, day] = val.split("-").map(Number);
  return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day;
}

function parsePositiveNum(val: unknown): number | null {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : null;
}

router.get("/customers", async (req: Request, res: Response) => {
  try {
    const { customer_id, status, date_from, date_to, bilty_number, amount_min, amount_max } = req.query;
    const conditions: SQL[] = [];

    if (customer_id) {
      const cid = Number(customer_id);
      if (Number.isInteger(cid) && cid > 0) conditions.push(eq(customerDuesTable.customerId, cid));
    }
    if (status && typeof status === "string" && ["Pending", "Partial", "Cleared"].includes(status)) {
      conditions.push(eq(customerDuesTable.status, status));
    }
    if (isValidDate(date_from)) {
      conditions.push(gte(customerDuesTable.dueDate, date_from));
    }
    if (isValidDate(date_to)) {
      conditions.push(lte(customerDuesTable.dueDate, date_to));
    }
    if (bilty_number && typeof bilty_number === "string") {
      conditions.push(ilike(customerDuesTable.biltyNumber, `%${bilty_number}%`));
    }
    if (amount_min) {
      const min = Number(amount_min);
      if (Number.isFinite(min)) conditions.push(gte(sql`(${customerDuesTable.dueAmount}::numeric - ${customerDuesTable.paidAmount}::numeric)`, min));
    }
    if (amount_max) {
      const max = Number(amount_max);
      if (Number.isFinite(max)) conditions.push(lte(sql`(${customerDuesTable.dueAmount}::numeric - ${customerDuesTable.paidAmount}::numeric)`, max));
    }

    const rows = await db
      .select({
        id: customerDuesTable.id,
        tripId: customerDuesTable.tripId,
        loadId: customerDuesTable.loadId,
        customerId: customerDuesTable.customerId,
        customerName: customersTable.name,
        biltyNumber: customerDuesTable.biltyNumber,
        dueAmount: customerDuesTable.dueAmount,
        paidAmount: customerDuesTable.paidAmount,
        balance: sql<number>`(${customerDuesTable.dueAmount}::numeric - ${customerDuesTable.paidAmount}::numeric)::double precision`.as("balance"),
        dueDate: customerDuesTable.dueDate,
        status: customerDuesTable.status,
        notes: customerDuesTable.notes,
        createdAt: customerDuesTable.createdAt,
      })
      .from(customerDuesTable)
      .innerJoin(customersTable, eq(customerDuesTable.customerId, customersTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`${customerDuesTable.dueDate} DESC`);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List customer dues error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/customers", async (req: Request, res: Response) => {
  try {
    const { customerId, biltyNumber, dueAmount, dueDate, notes } = req.body;

    const numCustomerId = Number(customerId);
    if (!Number.isInteger(numCustomerId) || numCustomerId <= 0) {
      res.status(400).json({ error: "Valid customer is required" });
      return;
    }
    const numAmount = parsePositiveNum(dueAmount);
    if (!numAmount) {
      res.status(400).json({ error: "Due amount must be greater than 0" });
      return;
    }
    if (!isValidDate(dueDate)) {
      res.status(400).json({ error: "Valid due date is required (YYYY-MM-DD)" });
      return;
    }

    const [customer] = await db.select({ id: customersTable.id, name: customersTable.name })
      .from(customersTable).where(eq(customersTable.id, numCustomerId));
    if (!customer) {
      res.status(400).json({ error: "Customer not found" });
      return;
    }

    const [inserted] = await db.insert(customerDuesTable).values({
      customerId: numCustomerId,
      biltyNumber: biltyNumber ? String(biltyNumber) : null,
      dueAmount: String(numAmount),
      dueDate,
      notes: notes ? String(notes) : null,
    }).returning();

    res.status(201).json({
      ...inserted,
      customerName: customer.name,
      balance: numAmount,
    });
  } catch (err) {
    req.log.error({ err }, "Create customer due error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/customers/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [deleted] = await db.delete(customerDuesTable).where(eq(customerDuesTable.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Customer due not found" });
      return;
    }
    res.json({ message: "Customer due deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Delete customer due error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/customers/:id/repay", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const { amount, paymentDate, notes } = req.body;
    const numAmount = parsePositiveNum(amount);
    if (!numAmount) {
      res.status(400).json({ error: "Amount must be greater than 0" });
      return;
    }
    if (!isValidDate(paymentDate)) {
      res.status(400).json({ error: "Valid payment date is required (YYYY-MM-DD)" });
      return;
    }

    const [due] = await db.select().from(customerDuesTable).where(eq(customerDuesTable.id, id));
    if (!due) {
      res.status(404).json({ error: "Customer due not found" });
      return;
    }
    if (due.status === "Cleared") {
      res.status(400).json({ error: "This due is already cleared" });
      return;
    }

    const currentBalance = Number(due.dueAmount) - Number(due.paidAmount);
    if (numAmount > currentBalance) {
      res.status(400).json({ error: `Payment exceeds remaining balance of ${currentBalance}` });
      return;
    }

    const [customer] = await db.select({ name: customersTable.name })
      .from(customersTable).where(eq(customersTable.id, due.customerId));

    const newPaid = Number(due.paidAmount) + numAmount;
    const newBalance = Number(due.dueAmount) - newPaid;
    const newStatus = newBalance <= 0 ? "Cleared" : "Partial";

    const result = await db.transaction(async (tx) => {
      await tx.insert(dueRepaymentsTable).values({
        dueId: id,
        dueType: "customer",
        amount: String(numAmount),
        paymentDate,
        notes: notes ? String(notes) : null,
      });

      const [updated] = await tx.update(customerDuesTable).set({
        paidAmount: String(newPaid),
        status: newStatus,
      }).where(eq(customerDuesTable.id, id)).returning();

      await tx.insert(cashBookTable).values({
        entryType: "IN",
        referenceTable: "customer_dues",
        referenceId: id,
        amount: String(numAmount),
        entryDate: paymentDate,
        description: `Customer due repayment from ${customer?.name ?? "Unknown"} (Bilty: ${due.biltyNumber ?? "N/A"})`,
      });

      return updated;
    });

    res.json({
      ...result,
      customerName: customer?.name ?? "",
      balance: newBalance,
    });
  } catch (err) {
    req.log.error({ err }, "Repay customer due error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/drivers", async (req: Request, res: Response) => {
  try {
    const { driver_id, status, date_from, date_to, amount_min, amount_max } = req.query;
    const conditions: SQL[] = [];

    if (driver_id) {
      const did = Number(driver_id);
      if (Number.isInteger(did) && did > 0) conditions.push(eq(driverLoansTable.driverId, did));
    }
    if (status && typeof status === "string" && ["Outstanding", "Partial", "Cleared"].includes(status)) {
      conditions.push(eq(driverLoansTable.status, status));
    }
    if (isValidDate(date_from)) {
      conditions.push(gte(driverLoansTable.loanDate, date_from));
    }
    if (isValidDate(date_to)) {
      conditions.push(lte(driverLoansTable.loanDate, date_to));
    }
    if (amount_min) {
      const min = Number(amount_min);
      if (Number.isFinite(min)) conditions.push(gte(sql`(${driverLoansTable.amount}::numeric - ${driverLoansTable.amountReturned}::numeric)`, min));
    }
    if (amount_max) {
      const max = Number(amount_max);
      if (Number.isFinite(max)) conditions.push(lte(sql`(${driverLoansTable.amount}::numeric - ${driverLoansTable.amountReturned}::numeric)`, max));
    }

    const rows = await db
      .select({
        id: driverLoansTable.id,
        driverId: driverLoansTable.driverId,
        driverName: driversTable.name,
        amount: driverLoansTable.amount,
        amountReturned: driverLoansTable.amountReturned,
        balance: sql<number>`(${driverLoansTable.amount}::numeric - ${driverLoansTable.amountReturned}::numeric)::double precision`.as("balance"),
        loanDate: driverLoansTable.loanDate,
        returnDate: driverLoansTable.returnDate,
        status: driverLoansTable.status,
        notes: driverLoansTable.notes,
        createdAt: driverLoansTable.createdAt,
      })
      .from(driverLoansTable)
      .innerJoin(driversTable, eq(driverLoansTable.driverId, driversTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`${driverLoansTable.loanDate} DESC`);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List driver loans error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/drivers", async (req: Request, res: Response) => {
  try {
    const { driverId, amount, loanDate, returnDate, notes } = req.body;

    const numDriverId = Number(driverId);
    if (!Number.isInteger(numDriverId) || numDriverId <= 0) {
      res.status(400).json({ error: "Valid driver is required" });
      return;
    }
    const numAmount = parsePositiveNum(amount);
    if (!numAmount) {
      res.status(400).json({ error: "Amount must be greater than 0" });
      return;
    }
    if (!isValidDate(loanDate)) {
      res.status(400).json({ error: "Valid loan date is required (YYYY-MM-DD)" });
      return;
    }

    const [driver] = await db.select({ id: driversTable.id, name: driversTable.name })
      .from(driversTable).where(eq(driversTable.id, numDriverId));
    if (!driver) {
      res.status(400).json({ error: "Driver not found" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(driverLoansTable).values({
        driverId: numDriverId,
        amount: String(numAmount),
        loanDate,
        returnDate: isValidDate(returnDate) ? returnDate : null,
        notes: notes ? String(notes) : null,
      }).returning();

      await tx.insert(cashBookTable).values({
        entryType: "OUT",
        referenceTable: "driver_loans",
        referenceId: inserted.id,
        amount: String(numAmount),
        entryDate: loanDate,
        description: `Loan given to driver ${driver.name}`,
      });

      return inserted;
    });

    res.status(201).json({
      ...result,
      driverName: driver.name,
      balance: numAmount,
    });
  } catch (err) {
    req.log.error({ err }, "Create driver loan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/drivers/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [deleted] = await db.delete(driverLoansTable).where(eq(driverLoansTable.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Driver loan not found" });
      return;
    }
    res.json({ message: "Driver loan deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Delete driver loan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/drivers/:id/repay", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const { amount, paymentDate, notes } = req.body;
    const numAmount = parsePositiveNum(amount);
    if (!numAmount) {
      res.status(400).json({ error: "Amount must be greater than 0" });
      return;
    }
    if (!isValidDate(paymentDate)) {
      res.status(400).json({ error: "Valid payment date is required (YYYY-MM-DD)" });
      return;
    }

    const [loan] = await db.select().from(driverLoansTable).where(eq(driverLoansTable.id, id));
    if (!loan) {
      res.status(404).json({ error: "Driver loan not found" });
      return;
    }
    if (loan.status === "Cleared") {
      res.status(400).json({ error: "This loan is already cleared" });
      return;
    }

    const currentBalance = Number(loan.amount) - Number(loan.amountReturned);
    if (numAmount > currentBalance) {
      res.status(400).json({ error: `Payment exceeds remaining balance of ${currentBalance}` });
      return;
    }

    const [driver] = await db.select({ name: driversTable.name })
      .from(driversTable).where(eq(driversTable.id, loan.driverId));

    const newReturned = Number(loan.amountReturned) + numAmount;
    const newBalance = Number(loan.amount) - newReturned;
    const newStatus = newBalance <= 0 ? "Cleared" : "Partial";

    const result = await db.transaction(async (tx) => {
      await tx.insert(dueRepaymentsTable).values({
        dueId: id,
        dueType: "driver",
        amount: String(numAmount),
        paymentDate,
        notes: notes ? String(notes) : null,
      });

      const [updated] = await tx.update(driverLoansTable).set({
        amountReturned: String(newReturned),
        status: newStatus,
      }).where(eq(driverLoansTable.id, id)).returning();

      await tx.insert(cashBookTable).values({
        entryType: "IN",
        referenceTable: "driver_loans",
        referenceId: id,
        amount: String(numAmount),
        entryDate: paymentDate,
        description: `Loan repayment from driver ${driver?.name ?? "Unknown"}`,
      });

      return updated;
    });

    res.json({
      ...result,
      driverName: driver?.name ?? "",
      balance: newBalance,
    });
  } catch (err) {
    req.log.error({ err }, "Repay driver loan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/others", async (req: Request, res: Response) => {
  try {
    const { person_name, status, date_from, date_to, amount_min, amount_max } = req.query;
    const conditions: SQL[] = [];

    if (person_name && typeof person_name === "string") {
      conditions.push(ilike(otherLoansTable.personName, `%${person_name}%`));
    }
    if (status && typeof status === "string" && ["Outstanding", "Partial", "Cleared"].includes(status)) {
      conditions.push(eq(otherLoansTable.status, status));
    }
    if (isValidDate(date_from)) {
      conditions.push(gte(otherLoansTable.loanDate, date_from));
    }
    if (isValidDate(date_to)) {
      conditions.push(lte(otherLoansTable.loanDate, date_to));
    }
    if (amount_min) {
      const min = Number(amount_min);
      if (Number.isFinite(min)) conditions.push(gte(sql`(${otherLoansTable.amount}::numeric - ${otherLoansTable.amountReturned}::numeric)`, min));
    }
    if (amount_max) {
      const max = Number(amount_max);
      if (Number.isFinite(max)) conditions.push(lte(sql`(${otherLoansTable.amount}::numeric - ${otherLoansTable.amountReturned}::numeric)`, max));
    }

    const rows = await db
      .select({
        id: otherLoansTable.id,
        personName: otherLoansTable.personName,
        phone: otherLoansTable.phone,
        amount: otherLoansTable.amount,
        amountReturned: otherLoansTable.amountReturned,
        balance: sql<number>`(${otherLoansTable.amount}::numeric - ${otherLoansTable.amountReturned}::numeric)::double precision`.as("balance"),
        loanDate: otherLoansTable.loanDate,
        returnDate: otherLoansTable.returnDate,
        status: otherLoansTable.status,
        notes: otherLoansTable.notes,
        createdAt: otherLoansTable.createdAt,
      })
      .from(otherLoansTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`${otherLoansTable.loanDate} DESC`);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List other loans error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/others", async (req: Request, res: Response) => {
  try {
    const { personName, phone, amount, loanDate, returnDate, notes } = req.body;

    if (!personName || typeof personName !== "string" || !personName.trim()) {
      res.status(400).json({ error: "Person name is required" });
      return;
    }
    const numAmount = parsePositiveNum(amount);
    if (!numAmount) {
      res.status(400).json({ error: "Amount must be greater than 0" });
      return;
    }
    if (!isValidDate(loanDate)) {
      res.status(400).json({ error: "Valid loan date is required (YYYY-MM-DD)" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(otherLoansTable).values({
        personName: personName.trim(),
        phone: phone ? String(phone) : null,
        amount: String(numAmount),
        loanDate,
        returnDate: isValidDate(returnDate) ? returnDate : null,
        notes: notes ? String(notes) : null,
      }).returning();

      await tx.insert(cashBookTable).values({
        entryType: "OUT",
        referenceTable: "other_loans",
        referenceId: inserted.id,
        amount: String(numAmount),
        entryDate: loanDate,
        description: `Loan given to ${personName.trim()}`,
      });

      return inserted;
    });

    res.status(201).json({
      ...result,
      balance: numAmount,
    });
  } catch (err) {
    req.log.error({ err }, "Create other loan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/others/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [deleted] = await db.delete(otherLoansTable).where(eq(otherLoansTable.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }
    res.json({ message: "Loan deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Delete other loan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/others/:id/repay", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const { amount, paymentDate, notes } = req.body;
    const numAmount = parsePositiveNum(amount);
    if (!numAmount) {
      res.status(400).json({ error: "Amount must be greater than 0" });
      return;
    }
    if (!isValidDate(paymentDate)) {
      res.status(400).json({ error: "Valid payment date is required (YYYY-MM-DD)" });
      return;
    }

    const [loan] = await db.select().from(otherLoansTable).where(eq(otherLoansTable.id, id));
    if (!loan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }
    if (loan.status === "Cleared") {
      res.status(400).json({ error: "This loan is already cleared" });
      return;
    }

    const currentBalance = Number(loan.amount) - Number(loan.amountReturned);
    if (numAmount > currentBalance) {
      res.status(400).json({ error: `Payment exceeds remaining balance of ${currentBalance}` });
      return;
    }

    const newReturned = Number(loan.amountReturned) + numAmount;
    const newBalance = Number(loan.amount) - newReturned;
    const newStatus = newBalance <= 0 ? "Cleared" : "Partial";

    const result = await db.transaction(async (tx) => {
      await tx.insert(dueRepaymentsTable).values({
        dueId: id,
        dueType: "other",
        amount: String(numAmount),
        paymentDate,
        notes: notes ? String(notes) : null,
      });

      const [updated] = await tx.update(otherLoansTable).set({
        amountReturned: String(newReturned),
        status: newStatus,
      }).where(eq(otherLoansTable.id, id)).returning();

      await tx.insert(cashBookTable).values({
        entryType: "IN",
        referenceTable: "other_loans",
        referenceId: id,
        amount: String(numAmount),
        entryDate: paymentDate,
        description: `Loan repayment from ${loan.personName}`,
      });

      return updated;
    });

    res.json({
      ...result,
      balance: newBalance,
    });
  } catch (err) {
    req.log.error({ err }, "Repay other loan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/owner", async (req: Request, res: Response) => {
  try {
    const { borrowed_from, status, date_from, date_to, amount_min, amount_max } = req.query;
    const conditions: SQL[] = [];

    if (borrowed_from && typeof borrowed_from === "string") {
      conditions.push(ilike(ownerLoansTable.borrowedFrom, `%${borrowed_from}%`));
    }
    if (status && typeof status === "string" && ["Outstanding", "Partial", "Cleared"].includes(status)) {
      conditions.push(eq(ownerLoansTable.status, status));
    }
    if (isValidDate(date_from)) {
      conditions.push(gte(ownerLoansTable.loanDate, date_from));
    }
    if (isValidDate(date_to)) {
      conditions.push(lte(ownerLoansTable.loanDate, date_to));
    }
    if (amount_min) {
      const min = Number(amount_min);
      if (Number.isFinite(min)) conditions.push(gte(sql`(${ownerLoansTable.amount}::numeric - ${ownerLoansTable.amountReturned}::numeric)`, min));
    }
    if (amount_max) {
      const max = Number(amount_max);
      if (Number.isFinite(max)) conditions.push(lte(sql`(${ownerLoansTable.amount}::numeric - ${ownerLoansTable.amountReturned}::numeric)`, max));
    }

    const rows = await db
      .select({
        id: ownerLoansTable.id,
        borrowedFrom: ownerLoansTable.borrowedFrom,
        amount: ownerLoansTable.amount,
        amountReturned: ownerLoansTable.amountReturned,
        balance: sql<number>`(${ownerLoansTable.amount}::numeric - ${ownerLoansTable.amountReturned}::numeric)::double precision`.as("balance"),
        loanDate: ownerLoansTable.loanDate,
        returnDate: ownerLoansTable.returnDate,
        status: ownerLoansTable.status,
        notes: ownerLoansTable.notes,
        createdAt: ownerLoansTable.createdAt,
      })
      .from(ownerLoansTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`${ownerLoansTable.loanDate} DESC`);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List owner loans error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/owner", async (req: Request, res: Response) => {
  try {
    const { borrowedFrom, amount, loanDate, returnDate, notes } = req.body;

    if (!borrowedFrom || typeof borrowedFrom !== "string" || !borrowedFrom.trim()) {
      res.status(400).json({ error: "Borrowed from name is required" });
      return;
    }
    const numAmount = parsePositiveNum(amount);
    if (!numAmount) {
      res.status(400).json({ error: "Amount must be greater than 0" });
      return;
    }
    if (!isValidDate(loanDate)) {
      res.status(400).json({ error: "Valid loan date is required (YYYY-MM-DD)" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(ownerLoansTable).values({
        borrowedFrom: borrowedFrom.trim(),
        amount: String(numAmount),
        loanDate,
        returnDate: isValidDate(returnDate) ? returnDate : null,
        notes: notes ? String(notes) : null,
      }).returning();

      await tx.insert(cashBookTable).values({
        entryType: "IN",
        referenceTable: "owner_loans",
        referenceId: inserted.id,
        amount: String(numAmount),
        entryDate: loanDate,
        description: `Loan borrowed from ${borrowedFrom.trim()}`,
      });

      return inserted;
    });

    res.status(201).json({
      ...result,
      balance: numAmount,
    });
  } catch (err) {
    req.log.error({ err }, "Create owner loan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/owner/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [deleted] = await db.delete(ownerLoansTable).where(eq(ownerLoansTable.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }
    res.json({ message: "Loan deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Delete owner loan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/owner/:id/repay", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }

    const { amount, paymentDate, notes } = req.body;
    const numAmount = parsePositiveNum(amount);
    if (!numAmount) {
      res.status(400).json({ error: "Amount must be greater than 0" });
      return;
    }
    if (!isValidDate(paymentDate)) {
      res.status(400).json({ error: "Valid payment date is required (YYYY-MM-DD)" });
      return;
    }

    const [loan] = await db.select().from(ownerLoansTable).where(eq(ownerLoansTable.id, id));
    if (!loan) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }
    if (loan.status === "Cleared") {
      res.status(400).json({ error: "This loan is already cleared" });
      return;
    }

    const currentBalance = Number(loan.amount) - Number(loan.amountReturned);
    if (numAmount > currentBalance) {
      res.status(400).json({ error: `Payment exceeds remaining balance of ${currentBalance}` });
      return;
    }

    const newReturned = Number(loan.amountReturned) + numAmount;
    const newBalance = Number(loan.amount) - newReturned;
    const newStatus = newBalance <= 0 ? "Cleared" : "Partial";

    const result = await db.transaction(async (tx) => {
      await tx.insert(dueRepaymentsTable).values({
        dueId: id,
        dueType: "owner",
        amount: String(numAmount),
        paymentDate,
        notes: notes ? String(notes) : null,
      });

      const [updated] = await tx.update(ownerLoansTable).set({
        amountReturned: String(newReturned),
        status: newStatus,
      }).where(eq(ownerLoansTable.id, id)).returning();

      await tx.insert(cashBookTable).values({
        entryType: "OUT",
        referenceTable: "owner_loans",
        referenceId: id,
        amount: String(numAmount),
        entryDate: paymentDate,
        description: `Loan repayment to ${loan.borrowedFrom}`,
      });

      return updated;
    });

    res.json({
      ...result,
      balance: newBalance,
    });
  } catch (err) {
    req.log.error({ err }, "Repay owner loan error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
