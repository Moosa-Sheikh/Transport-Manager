import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  customerDuesTable, driverLoansTable, otherLoansTable, ownerLoansTable,
  dueRepaymentsTable, cashBookTable, customersTable, driversTable,
  tripLoadsTable, tripsTable,
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

router.get("/trip-loads/search", async (req: Request, res: Response) => {
  try {
    const { bilty_number } = req.query;
    if (!bilty_number || typeof bilty_number !== "string" || bilty_number.trim().length === 0) {
      res.json([]);
      return;
    }
    const rows = await db
      .select({
        loadId: tripLoadsTable.id,
        tripId: tripLoadsTable.tripId,
        biltyNumber: tripLoadsTable.biltyNumber,
        customerId: tripLoadsTable.customerId,
        customerName: customersTable.name,
        freight: tripLoadsTable.freight,
      })
      .from(tripLoadsTable)
      .innerJoin(customersTable, eq(tripLoadsTable.customerId, customersTable.id))
      .where(ilike(tripLoadsTable.biltyNumber, `%${bilty_number.trim()}%`))
      .orderBy(sql`${tripLoadsTable.id} DESC`)
      .limit(20);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Search trip loads error");
    res.status(500).json({ error: "Internal server error" });
  }
});

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
    const { customerId, biltyNumber, dueAmount, dueDate, notes, tripId, loadId } = req.body;

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

    let numTripId: number | null = null;
    let numLoadId: number | null = null;

    if (loadId) {
      numLoadId = Number(loadId);
      if (!Number.isInteger(numLoadId) || numLoadId <= 0) {
        res.status(400).json({ error: "Invalid load ID" });
        return;
      }
      const [load] = await db.select({
        id: tripLoadsTable.id,
        tripId: tripLoadsTable.tripId,
        customerId: tripLoadsTable.customerId,
        biltyNumber: tripLoadsTable.biltyNumber,
      }).from(tripLoadsTable).where(eq(tripLoadsTable.id, numLoadId));
      if (!load) {
        res.status(400).json({ error: "Trip load not found" });
        return;
      }
      if (load.customerId !== numCustomerId) {
        res.status(400).json({ error: "Load does not belong to the selected customer" });
        return;
      }
      numTripId = load.tripId;
    } else if (tripId) {
      numTripId = Number(tripId);
      if (!Number.isInteger(numTripId) || numTripId <= 0) {
        res.status(400).json({ error: "Invalid trip ID" });
        return;
      }
    }

    const [inserted] = await db.insert(customerDuesTable).values({
      customerId: numCustomerId,
      biltyNumber: biltyNumber ? String(biltyNumber) : null,
      dueAmount: String(numAmount),
      dueDate,
      notes: notes ? String(notes) : null,
      tripId: numTripId,
      loadId: numLoadId,
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

router.put("/customers/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [existing] = await db.select().from(customerDuesTable).where(eq(customerDuesTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Customer due not found" });
      return;
    }

    const { dueAmount, dueDate, biltyNumber, notes } = req.body;
    const updates: Record<string, unknown> = {};

    if (dueAmount !== undefined) {
      const num = parsePositiveNum(dueAmount);
      if (!num) { res.status(400).json({ error: "Due amount must be greater than 0" }); return; }
      const paid = Number(existing.paidAmount);
      if (num < paid) { res.status(400).json({ error: `Due amount cannot be less than already paid amount (${paid})` }); return; }
      updates.dueAmount = String(num);
      const newBalance = num - paid;
      updates.status = newBalance <= 0 ? "Cleared" : paid > 0 ? "Partial" : "Pending";
    }
    if (dueDate !== undefined) {
      if (!isValidDate(dueDate)) { res.status(400).json({ error: "Valid due date is required (YYYY-MM-DD)" }); return; }
      updates.dueDate = dueDate;
    }
    if (biltyNumber !== undefined) updates.biltyNumber = biltyNumber || null;
    if (notes !== undefined) updates.notes = notes || null;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [updated] = await db.update(customerDuesTable).set(updates).where(eq(customerDuesTable.id, id)).returning();
    const [customer] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, updated.customerId));

    res.json({
      ...updated,
      customerName: customer?.name ?? "Unknown",
      balance: Number(updated.dueAmount) - Number(updated.paidAmount),
    });
  } catch (err) {
    req.log.error({ err }, "Update customer due error");
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
    const [existing] = await db.select({ id: customerDuesTable.id, tripId: customerDuesTable.tripId }).from(customerDuesTable).where(eq(customerDuesTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Customer due not found" });
      return;
    }
    if (existing.tripId) {
      res.status(400).json({ error: "Cannot delete a due linked to a trip. The due is attached to trip data and must be managed through the trip." });
      return;
    }
    await db.transaction(async (tx) => {
      await tx.delete(cashBookTable).where(
        and(eq(cashBookTable.referenceTable, "customer_dues"), eq(cashBookTable.referenceId, id))
      );
      await tx.delete(dueRepaymentsTable).where(
        and(eq(dueRepaymentsTable.dueType, "customer"), eq(dueRepaymentsTable.dueId, id))
      );
      await tx.delete(customerDuesTable).where(eq(customerDuesTable.id, id));
    });
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

router.put("/drivers/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [existing] = await db.select().from(driverLoansTable).where(eq(driverLoansTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Driver loan not found" });
      return;
    }

    const { amount, loanDate, returnDate, notes } = req.body;
    const updates: Record<string, unknown> = {};
    let amountChanged = false;

    if (amount !== undefined) {
      const num = parsePositiveNum(amount);
      if (!num) { res.status(400).json({ error: "Amount must be greater than 0" }); return; }
      const returned = Number(existing.amountReturned);
      if (num < returned) { res.status(400).json({ error: `Amount cannot be less than already returned amount (${returned})` }); return; }
      updates.amount = String(num);
      const newBalance = num - returned;
      updates.status = newBalance <= 0 ? "Cleared" : returned > 0 ? "Partial" : "Outstanding";
      amountChanged = true;
    }
    if (loanDate !== undefined) {
      if (!isValidDate(loanDate)) { res.status(400).json({ error: "Valid loan date is required (YYYY-MM-DD)" }); return; }
      updates.loanDate = loanDate;
    }
    if (returnDate !== undefined) updates.returnDate = isValidDate(returnDate) ? returnDate : null;
    if (notes !== undefined) updates.notes = notes || null;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [upd] = await tx.update(driverLoansTable).set(updates).where(eq(driverLoansTable.id, id)).returning();

      if (amountChanged) {
        await tx.update(cashBookTable).set({
          amount: updates.amount as string,
        }).where(
          sql`${cashBookTable.referenceTable} = 'driver_loans' AND ${cashBookTable.referenceId} = ${id} AND ${cashBookTable.entryType} = 'OUT'`
        );
      }

      return upd;
    });

    const [driver] = await db.select({ name: driversTable.name }).from(driversTable).where(eq(driversTable.id, result.driverId));

    res.json({
      ...result,
      driverName: driver?.name ?? "Unknown",
      balance: Number(result.amount) - Number(result.amountReturned),
    });
  } catch (err) {
    req.log.error({ err }, "Update driver loan error");
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
    const [existing] = await db.select({ id: driverLoansTable.id }).from(driverLoansTable).where(eq(driverLoansTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Driver loan not found" });
      return;
    }
    await db.transaction(async (tx) => {
      await tx.delete(cashBookTable).where(
        and(eq(cashBookTable.referenceTable, "driver_loans"), eq(cashBookTable.referenceId, id))
      );
      await tx.delete(dueRepaymentsTable).where(
        and(eq(dueRepaymentsTable.dueType, "driver"), eq(dueRepaymentsTable.dueId, id))
      );
      await tx.delete(driverLoansTable).where(eq(driverLoansTable.id, id));
    });
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

router.get("/drivers/:id/history", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [loan] = await db.select({
      id: driverLoansTable.id,
      driverId: driverLoansTable.driverId,
      driverName: driversTable.name,
      amount: driverLoansTable.amount,
      amountReturned: driverLoansTable.amountReturned,
      loanDate: driverLoansTable.loanDate,
      status: driverLoansTable.status,
      notes: driverLoansTable.notes,
    }).from(driverLoansTable)
      .leftJoin(driversTable, eq(driversTable.id, driverLoansTable.driverId))
      .where(eq(driverLoansTable.id, id));
    if (!loan) {
      res.status(404).json({ error: "Driver loan not found" });
      return;
    }

    const repayments = await db.select({
      id: dueRepaymentsTable.id,
      amount: dueRepaymentsTable.amount,
      paymentDate: dueRepaymentsTable.paymentDate,
      notes: dueRepaymentsTable.notes,
      createdAt: dueRepaymentsTable.createdAt,
    }).from(dueRepaymentsTable)
      .where(and(eq(dueRepaymentsTable.dueId, id), eq(dueRepaymentsTable.dueType, "driver")))
      .orderBy(sql`${dueRepaymentsTable.paymentDate} ASC`);

    res.json({
      id: loan.id,
      label: loan.driverName ?? "Unknown Driver",
      personId: loan.driverId,
      amount: loan.amount,
      amountReturned: loan.amountReturned,
      balance: Number(loan.amount) - Number(loan.amountReturned),
      date: loan.loanDate,
      status: loan.status,
      notes: loan.notes,
      repayments,
    });
  } catch (err) {
    req.log.error({ err }, "Driver loan history error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/customers/:id/history", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [due] = await db.select({
      id: customerDuesTable.id,
      customerId: customerDuesTable.customerId,
      customerName: customersTable.name,
      dueAmount: customerDuesTable.dueAmount,
      paidAmount: customerDuesTable.paidAmount,
      dueDate: customerDuesTable.dueDate,
      biltyNumber: customerDuesTable.biltyNumber,
      status: customerDuesTable.status,
      notes: customerDuesTable.notes,
    }).from(customerDuesTable)
      .leftJoin(customersTable, eq(customersTable.id, customerDuesTable.customerId))
      .where(eq(customerDuesTable.id, id));
    if (!due) {
      res.status(404).json({ error: "Customer due not found" });
      return;
    }

    const repayments = await db.select({
      id: dueRepaymentsTable.id,
      amount: dueRepaymentsTable.amount,
      paymentDate: dueRepaymentsTable.paymentDate,
      notes: dueRepaymentsTable.notes,
      createdAt: dueRepaymentsTable.createdAt,
    }).from(dueRepaymentsTable)
      .where(and(eq(dueRepaymentsTable.dueId, id), eq(dueRepaymentsTable.dueType, "customer")))
      .orderBy(sql`${dueRepaymentsTable.paymentDate} ASC`);

    res.json({
      id: due.id,
      label: `${due.customerName ?? "Unknown"} — ${due.biltyNumber ?? "No Bilty"}`,
      personId: due.customerId,
      amount: due.dueAmount,
      amountReturned: due.paidAmount,
      balance: Number(due.dueAmount) - Number(due.paidAmount),
      date: due.dueDate,
      status: due.status,
      notes: due.notes,
      repayments,
    });
  } catch (err) {
    req.log.error({ err }, "Customer due history error");
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

router.put("/others/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [existing] = await db.select().from(otherLoansTable).where(eq(otherLoansTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Other loan not found" });
      return;
    }

    const { personName, phone, amount, loanDate, returnDate, notes } = req.body;
    const updates: Record<string, unknown> = {};

    if (personName !== undefined) {
      if (!personName || typeof personName !== "string" || !personName.trim()) {
        res.status(400).json({ error: "Person name is required" });
        return;
      }
      updates.personName = personName.trim();
    }
    if (phone !== undefined) updates.phone = phone || null;
    let amountChanged = false;
    if (amount !== undefined) {
      const num = parsePositiveNum(amount);
      if (!num) { res.status(400).json({ error: "Amount must be greater than 0" }); return; }
      const returned = Number(existing.amountReturned);
      if (num < returned) { res.status(400).json({ error: `Amount cannot be less than already returned amount (${returned})` }); return; }
      updates.amount = String(num);
      const newBalance = num - returned;
      updates.status = newBalance <= 0 ? "Cleared" : returned > 0 ? "Partial" : "Outstanding";
      amountChanged = true;
    }
    if (loanDate !== undefined) {
      if (!isValidDate(loanDate)) { res.status(400).json({ error: "Valid loan date is required (YYYY-MM-DD)" }); return; }
      updates.loanDate = loanDate;
    }
    if (returnDate !== undefined) updates.returnDate = isValidDate(returnDate) ? returnDate : null;
    if (notes !== undefined) updates.notes = notes || null;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [upd] = await tx.update(otherLoansTable).set(updates).where(eq(otherLoansTable.id, id)).returning();

      if (amountChanged) {
        await tx.update(cashBookTable).set({
          amount: updates.amount as string,
        }).where(
          sql`${cashBookTable.referenceTable} = 'other_loans' AND ${cashBookTable.referenceId} = ${id} AND ${cashBookTable.entryType} = 'OUT'`
        );
      }

      return upd;
    });

    res.json({
      ...result,
      balance: Number(result.amount) - Number(result.amountReturned),
    });
  } catch (err) {
    req.log.error({ err }, "Update other loan error");
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
    const [existing] = await db.select({ id: otherLoansTable.id }).from(otherLoansTable).where(eq(otherLoansTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }
    await db.transaction(async (tx) => {
      await tx.delete(cashBookTable).where(
        and(eq(cashBookTable.referenceTable, "other_loans"), eq(cashBookTable.referenceId, id))
      );
      await tx.delete(dueRepaymentsTable).where(
        and(eq(dueRepaymentsTable.dueType, "other"), eq(dueRepaymentsTable.dueId, id))
      );
      await tx.delete(otherLoansTable).where(eq(otherLoansTable.id, id));
    });
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

router.get("/others/:id/history", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [loan] = await db.select().from(otherLoansTable).where(eq(otherLoansTable.id, id));
    if (!loan) {
      res.status(404).json({ error: "Other loan not found" });
      return;
    }

    const repayments = await db.select({
      id: dueRepaymentsTable.id,
      amount: dueRepaymentsTable.amount,
      paymentDate: dueRepaymentsTable.paymentDate,
      notes: dueRepaymentsTable.notes,
      createdAt: dueRepaymentsTable.createdAt,
    }).from(dueRepaymentsTable)
      .where(and(eq(dueRepaymentsTable.dueId, id), eq(dueRepaymentsTable.dueType, "other")))
      .orderBy(sql`${dueRepaymentsTable.paymentDate} ASC`);

    res.json({
      id: loan.id,
      label: loan.personName,
      amount: loan.amount,
      amountReturned: loan.amountReturned,
      balance: Number(loan.amount) - Number(loan.amountReturned),
      date: loan.loanDate,
      status: loan.status,
      notes: loan.notes,
      repayments,
    });
  } catch (err) {
    req.log.error({ err }, "Other loan history error");
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
        sourceType: ownerLoansTable.sourceType,
        sourceId: ownerLoansTable.sourceId,
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
    const { borrowedFrom, sourceType, sourceId, amount, loanDate, returnDate, notes } = req.body;

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

    const validSourceTypes = ["Customer", "Driver", "Other"];
    const cleanSourceType = sourceType && validSourceTypes.includes(sourceType) ? sourceType : null;
    const cleanSourceId = cleanSourceType && sourceId && Number.isInteger(Number(sourceId)) && Number(sourceId) > 0 ? Number(sourceId) : null;

    if (cleanSourceType === "Customer" && cleanSourceId) {
      const [c] = await db.select({ id: customersTable.id }).from(customersTable).where(eq(customersTable.id, cleanSourceId));
      if (!c) { res.status(400).json({ error: "Selected customer does not exist" }); return; }
    }
    if (cleanSourceType === "Driver" && cleanSourceId) {
      const [d] = await db.select({ id: driversTable.id }).from(driversTable).where(eq(driversTable.id, cleanSourceId));
      if (!d) { res.status(400).json({ error: "Selected driver does not exist" }); return; }
    }

    const result = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(ownerLoansTable).values({
        borrowedFrom: borrowedFrom.trim(),
        sourceType: cleanSourceType,
        sourceId: cleanSourceId,
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

router.put("/owner/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [existing] = await db.select().from(ownerLoansTable).where(eq(ownerLoansTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Owner loan not found" });
      return;
    }

    const { borrowedFrom, sourceType, sourceId, amount, loanDate, returnDate, notes } = req.body;
    const updates: Record<string, unknown> = {};

    if (borrowedFrom !== undefined) {
      if (!borrowedFrom || typeof borrowedFrom !== "string" || !borrowedFrom.trim()) {
        res.status(400).json({ error: "Borrowed from is required" });
        return;
      }
      updates.borrowedFrom = borrowedFrom.trim();
    }
    if (sourceType !== undefined) {
      const validSourceTypes = ["Customer", "Driver", "Other"];
      updates.sourceType = sourceType && validSourceTypes.includes(sourceType) ? sourceType : null;
    }
    if (sourceId !== undefined) {
      updates.sourceId = sourceId && Number.isInteger(Number(sourceId)) && Number(sourceId) > 0 ? Number(sourceId) : null;
    }
    const finalSourceType = updates.sourceType !== undefined ? updates.sourceType : existing.sourceType;
    const finalSourceId = updates.sourceId !== undefined ? updates.sourceId : existing.sourceId;
    if (finalSourceType === "Customer" && finalSourceId) {
      const [c] = await db.select({ id: customersTable.id }).from(customersTable).where(eq(customersTable.id, finalSourceId));
      if (!c) { res.status(400).json({ error: "Selected customer does not exist" }); return; }
    }
    if (finalSourceType === "Driver" && finalSourceId) {
      const [d] = await db.select({ id: driversTable.id }).from(driversTable).where(eq(driversTable.id, finalSourceId));
      if (!d) { res.status(400).json({ error: "Selected driver does not exist" }); return; }
    }
    let amountChanged = false;
    if (amount !== undefined) {
      const num = parsePositiveNum(amount);
      if (!num) { res.status(400).json({ error: "Amount must be greater than 0" }); return; }
      const returned = Number(existing.amountReturned);
      if (num < returned) { res.status(400).json({ error: `Amount cannot be less than already returned amount (${returned})` }); return; }
      updates.amount = String(num);
      const newBalance = num - returned;
      updates.status = newBalance <= 0 ? "Cleared" : returned > 0 ? "Partial" : "Outstanding";
      amountChanged = true;
    }
    if (loanDate !== undefined) {
      if (!isValidDate(loanDate)) { res.status(400).json({ error: "Valid loan date is required (YYYY-MM-DD)" }); return; }
      updates.loanDate = loanDate;
    }
    if (returnDate !== undefined) updates.returnDate = isValidDate(returnDate) ? returnDate : null;
    if (notes !== undefined) updates.notes = notes || null;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [upd] = await tx.update(ownerLoansTable).set(updates).where(eq(ownerLoansTable.id, id)).returning();

      if (amountChanged) {
        await tx.update(cashBookTable).set({
          amount: updates.amount as string,
        }).where(
          sql`${cashBookTable.referenceTable} = 'owner_loans' AND ${cashBookTable.referenceId} = ${id} AND ${cashBookTable.entryType} = 'IN'`
        );
      }

      return upd;
    });

    res.json({
      ...result,
      balance: Number(result.amount) - Number(result.amountReturned),
    });
  } catch (err) {
    req.log.error({ err }, "Update owner loan error");
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
    const [existing] = await db.select({ id: ownerLoansTable.id }).from(ownerLoansTable).where(eq(ownerLoansTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }
    await db.transaction(async (tx) => {
      await tx.delete(cashBookTable).where(
        and(eq(cashBookTable.referenceTable, "owner_loans"), eq(cashBookTable.referenceId, id))
      );
      await tx.delete(dueRepaymentsTable).where(
        and(eq(dueRepaymentsTable.dueType, "owner"), eq(dueRepaymentsTable.dueId, id))
      );
      await tx.delete(ownerLoansTable).where(eq(ownerLoansTable.id, id));
    });
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

router.get("/owner/:id/history", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [loan] = await db.select().from(ownerLoansTable).where(eq(ownerLoansTable.id, id));
    if (!loan) {
      res.status(404).json({ error: "Owner loan not found" });
      return;
    }

    const repayments = await db.select({
      id: dueRepaymentsTable.id,
      amount: dueRepaymentsTable.amount,
      paymentDate: dueRepaymentsTable.paymentDate,
      notes: dueRepaymentsTable.notes,
      createdAt: dueRepaymentsTable.createdAt,
    }).from(dueRepaymentsTable)
      .where(and(eq(dueRepaymentsTable.dueId, id), eq(dueRepaymentsTable.dueType, "owner")))
      .orderBy(sql`${dueRepaymentsTable.paymentDate} ASC`);

    res.json({
      id: loan.id,
      label: loan.borrowedFrom,
      amount: loan.amount,
      amountReturned: loan.amountReturned,
      balance: Number(loan.amount) - Number(loan.amountReturned),
      date: loan.loanDate,
      status: loan.status,
      notes: loan.notes,
      repayments,
    });
  } catch (err) {
    req.log.error({ err }, "Owner loan history error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
