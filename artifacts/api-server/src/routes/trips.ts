import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  tripsTable, trucksTable, driversTable, citiesTable,
  tripLoadsTable, customersTable,
  tripExpensesTable, expenseTypesTable,
  customerPaymentsTable, driverAdvancesTable, cashBookTable,
  customerDuesTable,
} from "@workspace/db/schema";
import { eq, and, gte, lte, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { parseId } from "../lib/validate-id.js";

const fromCities = alias(citiesTable, "from_city");
const toCities = alias(citiesTable, "to_city");

const router: IRouter = Router();

const incomeSubquery = sql<number>`COALESCE((
  SELECT SUM(COALESCE(freight, 0) + COALESCE(loading_charges, 0) + COALESCE(unloading_charges, 0) - COALESCE(broker_commission, 0))
  FROM trip_loads WHERE trip_loads.trip_id = ${tripsTable.id}
), 0)::double precision`;

const expenseSubquery = sql<number>`COALESCE((
  SELECT SUM(COALESCE(amount, 0))
  FROM trip_expenses WHERE trip_expenses.trip_id = ${tripsTable.id}
), 0)::double precision`;

const totalReceivedSubquery = sql<number>`COALESCE((
  SELECT SUM(COALESCE(amount, 0))
  FROM customer_payments WHERE customer_payments.trip_id = ${tripsTable.id}
), 0)::double precision`;

const totalAdvancesSubquery = sql<number>`COALESCE((
  SELECT SUM(COALESCE(amount, 0))
  FROM driver_advances WHERE driver_advances.trip_id = ${tripsTable.id}
), 0)::double precision`;

function buildTripQuery() {
  return db
    .select({
      id: tripsTable.id,
      tripDate: tripsTable.tripDate,
      truckId: tripsTable.truckId,
      truckNumber: trucksTable.truckNumber,
      driverId: tripsTable.driverId,
      driverName: driversTable.name,
      fromCityId: tripsTable.fromCityId,
      fromCityName: fromCities.name,
      toCityId: tripsTable.toCityId,
      toCityName: toCities.name,
      driverCommission: tripsTable.driverCommission,
      status: tripsTable.status,
      createdAt: tripsTable.createdAt,
      income: incomeSubquery.as("income"),
      expense: expenseSubquery.as("expense"),
      profit: sql<number>`(${incomeSubquery} - ${expenseSubquery})::double precision`.as("profit"),
      totalReceived: totalReceivedSubquery.as("total_received"),
      totalAdvances: totalAdvancesSubquery.as("total_advances"),
      actualProfit: sql<number>`(${incomeSubquery} - ${expenseSubquery} - ${totalAdvancesSubquery})::double precision`.as("actual_profit"),
    })
    .from(tripsTable)
    .innerJoin(trucksTable, eq(tripsTable.truckId, trucksTable.id))
    .innerJoin(driversTable, eq(tripsTable.driverId, driversTable.id))
    .innerJoin(fromCities, eq(tripsTable.fromCityId, fromCities.id))
    .innerJoin(toCities, eq(tripsTable.toCityId, toCities.id));
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const { date_from, date_to, truck_id, driver_id, status, profit } = req.query;
    const conditions: SQL[] = [];

    if (typeof date_from === "string" && date_from) {
      conditions.push(gte(tripsTable.tripDate, date_from));
    }
    if (typeof date_to === "string" && date_to) {
      conditions.push(lte(tripsTable.tripDate, date_to));
    }
    if (typeof truck_id === "string" && truck_id) {
      const tid = Number(truck_id);
      if (Number.isFinite(tid) && tid > 0) {
        conditions.push(eq(tripsTable.truckId, tid));
      }
    }
    if (typeof driver_id === "string" && driver_id) {
      const did = Number(driver_id);
      if (Number.isFinite(did) && did > 0) {
        conditions.push(eq(tripsTable.driverId, did));
      }
    }
    if (typeof status === "string" && (status === "Open" || status === "Closed")) {
      conditions.push(eq(tripsTable.status, status));
    }

    const query = buildTripQuery();
    let rows = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(sql`${tripsTable.tripDate} DESC`)
      : await query.orderBy(sql`${tripsTable.tripDate} DESC`);

    if (typeof profit === "string") {
      if (profit === "positive") {
        rows = rows.filter((r) => r.profit > 0);
      } else if (profit === "negative") {
        rows = rows.filter((r) => r.profit < 0);
      }
    }

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List trips error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { tripDate, truckId, driverId, fromCityId, toCityId, driverCommission } = req.body;

    if (!tripDate || !truckId || !driverId || !fromCityId || !toCityId) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    const numTruckId = Number(truckId);
    const numDriverId = Number(driverId);
    const numFromCityId = Number(fromCityId);
    const numToCityId = Number(toCityId);

    if (
      !Number.isInteger(numTruckId) ||
      !Number.isInteger(numDriverId) ||
      !Number.isInteger(numFromCityId) ||
      !Number.isInteger(numToCityId)
    ) {
      res.status(400).json({ error: "Invalid ID values" });
      return;
    }

    if (numFromCityId === numToCityId) {
      res.status(400).json({ error: "From city and To city cannot be the same" });
      return;
    }

    const commissionVal = driverCommission !== undefined && driverCommission !== null && driverCommission !== ""
      ? String(driverCommission) : "0";

    const [inserted] = await db
      .insert(tripsTable)
      .values({
        tripDate: String(tripDate),
        truckId: numTruckId,
        driverId: numDriverId,
        fromCityId: numFromCityId,
        toCityId: numToCityId,
        driverCommission: commissionVal,
      })
      .returning();

    const [row] = await buildTripQuery().where(eq(tripsTable.id, inserted.id));
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Create trip error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const [row] = await buildTripQuery().where(eq(tripsTable.id, id));
    if (!row) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Get trip error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id/close", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const [existing] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    if (existing.status === "Closed") {
      res.status(400).json({ error: "Trip is already closed" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.update(tripsTable).set({ status: "Closed" }).where(eq(tripsTable.id, id));

      const loads = await tx
        .select({
          id: tripLoadsTable.id,
          customerId: tripLoadsTable.customerId,
          biltyNumber: tripLoadsTable.biltyNumber,
          freight: tripLoadsTable.freight,
          loadingCharges: tripLoadsTable.loadingCharges,
          unloadingCharges: tripLoadsTable.unloadingCharges,
          brokerCommission: tripLoadsTable.brokerCommission,
        })
        .from(tripLoadsTable)
        .where(eq(tripLoadsTable.tripId, id));

      const totalPayments = await tx
        .select({
          total: sql<number>`COALESCE(SUM(amount::numeric), 0)::double precision`,
        })
        .from(customerPaymentsTable)
        .where(eq(customerPaymentsTable.tripId, id));

      const totalReceived = totalPayments[0]?.total ?? 0;

      let totalIncome = 0;
      for (const load of loads) {
        totalIncome += calcNetLoadIncome(load);
      }

      const outstanding = totalIncome - totalReceived;

      if (outstanding > 0 && loads.length > 0) {
        const customerTotals = new Map<number, { income: number; biltyNumbers: string[]; loadIds: number[] }>();

        for (const load of loads) {
          const loadIncome = calcNetLoadIncome(load);
          const existing = customerTotals.get(load.customerId);
          if (existing) {
            existing.income += loadIncome;
            existing.biltyNumbers.push(load.biltyNumber);
            existing.loadIds.push(load.id);
          } else {
            customerTotals.set(load.customerId, {
              income: loadIncome,
              biltyNumbers: [load.biltyNumber],
              loadIds: [load.id],
            });
          }
        }

        for (const [custId, data] of customerTotals) {
          const custShare = totalIncome > 0 ? (data.income / totalIncome) * outstanding : 0;
          if (custShare > 0.01) {
            await tx.insert(customerDuesTable).values({
              tripId: id,
              loadId: data.loadIds[0],
              customerId: custId,
              biltyNumber: data.biltyNumbers.join(", "),
              dueAmount: String(Math.round(custShare * 100) / 100),
              dueDate: existing.tripDate,
              notes: `Auto-generated on trip #${id} close`,
            });
          }
        }
      }
    });

    const [row] = await buildTripQuery().where(eq(tripsTable.id, id));
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Close trip error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id/commission", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const [existing] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    if (existing.status === "Closed") {
      res.status(400).json({ error: "Cannot update commission on a closed trip" });
      return;
    }

    const { driverCommission } = req.body;
    const numVal = Number(driverCommission);
    if (!Number.isFinite(numVal) || numVal < 0) {
      res.status(400).json({ error: "Driver commission must be a valid non-negative number" });
      return;
    }

    await db.update(tripsTable).set({ driverCommission: String(numVal) }).where(eq(tripsTable.id, id));

    const [row] = await buildTripQuery().where(eq(tripsTable.id, id));
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Update trip commission error");
    res.status(500).json({ error: "Internal server error" });
  }
});

function calcNetLoadIncome(load: {
  freight: string | null;
  loadingCharges: string | null;
  unloadingCharges: string | null;
  brokerCommission: string | null;
}): number {
  return (
    Number(load.freight ?? 0) +
    Number(load.loadingCharges ?? 0) +
    Number(load.unloadingCharges ?? 0) -
    Number(load.brokerCommission ?? 0)
  );
}

router.get("/:id/loads", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const [trip] = await db.select({ id: tripsTable.id }).from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    const rows = await db
      .select({
        id: tripLoadsTable.id,
        tripId: tripLoadsTable.tripId,
        biltyNumber: tripLoadsTable.biltyNumber,
        customerId: tripLoadsTable.customerId,
        customerName: customersTable.name,
        itemDescription: tripLoadsTable.itemDescription,
        weight: tripLoadsTable.weight,
        freight: tripLoadsTable.freight,
        loadingCharges: tripLoadsTable.loadingCharges,
        unloadingCharges: tripLoadsTable.unloadingCharges,
        brokerCommission: tripLoadsTable.brokerCommission,
        createdAt: tripLoadsTable.createdAt,
      })
      .from(tripLoadsTable)
      .innerJoin(customersTable, eq(tripLoadsTable.customerId, customersTable.id))
      .where(eq(tripLoadsTable.tripId, id))
      .orderBy(tripLoadsTable.id);

    const loads = rows.map((r) => ({
      ...r,
      netLoadIncome: calcNetLoadIncome(r),
    }));

    let totalFreight = 0;
    let totalLoadingCharges = 0;
    let totalUnloadingCharges = 0;
    let totalBrokerCommission = 0;
    for (const l of rows) {
      totalFreight += Number(l.freight ?? 0);
      totalLoadingCharges += Number(l.loadingCharges ?? 0);
      totalUnloadingCharges += Number(l.unloadingCharges ?? 0);
      totalBrokerCommission += Number(l.brokerCommission ?? 0);
    }

    res.json({
      loads,
      summary: {
        totalFreight,
        totalLoadingCharges,
        totalUnloadingCharges,
        totalBrokerCommission,
        tripIncome: totalFreight + totalLoadingCharges + totalUnloadingCharges - totalBrokerCommission,
      },
    });
  } catch (err) {
    req.log.error({ err }, "List trip loads error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/loads", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    if (trip.status === "Closed") {
      res.status(400).json({ error: "Cannot add load to a closed trip" });
      return;
    }

    const { biltyNumber, customerId, itemDescription, weight, freight, loadingCharges, unloadingCharges, brokerCommission } = req.body;

    if (!biltyNumber || typeof biltyNumber !== "string" || !biltyNumber.trim()) {
      res.status(400).json({ error: "Bilty number is required" });
      return;
    }
    const numCustomerId = Number(customerId);
    if (!Number.isInteger(numCustomerId) || numCustomerId <= 0) {
      res.status(400).json({ error: "Valid customer is required" });
      return;
    }

    function parseOptionalNumeric(val: unknown, fieldName: string): string {
      if (val === undefined || val === null || val === "") return "0";
      const n = Number(val);
      if (!Number.isFinite(n) || n < 0) {
        throw new Error(`${fieldName} must be a valid non-negative number`);
      }
      return String(val);
    }

    let parsedWeight: string | null = null;
    let parsedFreight: string;
    let parsedLoading: string;
    let parsedUnloading: string;
    let parsedCommission: string;

    try {
      if (weight !== undefined && weight !== null && weight !== "") {
        const w = Number(weight);
        if (!Number.isFinite(w) || w < 0) {
          res.status(400).json({ error: "Weight must be a valid non-negative number" });
          return;
        }
        parsedWeight = String(weight);
      }
      parsedFreight = parseOptionalNumeric(freight, "Freight");
      parsedLoading = parseOptionalNumeric(loadingCharges, "Loading charges");
      parsedUnloading = parseOptionalNumeric(unloadingCharges, "Unloading charges");
      parsedCommission = parseOptionalNumeric(brokerCommission, "Broker commission");
    } catch (validationErr: unknown) {
      res.status(400).json({ error: (validationErr as Error).message });
      return;
    }

    const [inserted] = await db
      .insert(tripLoadsTable)
      .values({
        tripId: id,
        biltyNumber: biltyNumber.trim(),
        customerId: numCustomerId,
        itemDescription: itemDescription ? String(itemDescription) : null,
        weight: parsedWeight,
        freight: parsedFreight,
        loadingCharges: parsedLoading,
        unloadingCharges: parsedUnloading,
        brokerCommission: parsedCommission,
      })
      .returning();

    const [row] = await db
      .select({
        id: tripLoadsTable.id,
        tripId: tripLoadsTable.tripId,
        biltyNumber: tripLoadsTable.biltyNumber,
        customerId: tripLoadsTable.customerId,
        customerName: customersTable.name,
        itemDescription: tripLoadsTable.itemDescription,
        weight: tripLoadsTable.weight,
        freight: tripLoadsTable.freight,
        loadingCharges: tripLoadsTable.loadingCharges,
        unloadingCharges: tripLoadsTable.unloadingCharges,
        brokerCommission: tripLoadsTable.brokerCommission,
        createdAt: tripLoadsTable.createdAt,
      })
      .from(tripLoadsTable)
      .innerJoin(customersTable, eq(tripLoadsTable.customerId, customersTable.id))
      .where(eq(tripLoadsTable.id, inserted.id));

    res.status(201).json({
      ...row,
      netLoadIncome: calcNetLoadIncome(row),
    });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      res.status(400).json({ error: "Duplicate bilty number in this trip" });
      return;
    }
    req.log.error({ err }, "Add trip load error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id/loads/:loadId", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const loadIdRaw = Number(req.params["loadId"]);
    if (!Number.isFinite(loadIdRaw) || loadIdRaw <= 0 || !Number.isInteger(loadIdRaw)) {
      res.status(400).json({ error: "Invalid load ID" });
      return;
    }

    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    if (trip.status === "Closed") {
      res.status(400).json({ error: "Cannot delete load from a closed trip" });
      return;
    }

    const [deleted] = await db
      .delete(tripLoadsTable)
      .where(and(eq(tripLoadsTable.id, loadIdRaw), eq(tripLoadsTable.tripId, id)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Load not found" });
      return;
    }

    res.json({ message: "Load deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Delete trip load error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/expenses", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const [trip] = await db.select({ id: tripsTable.id }).from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }

    const rows = await db
      .select({
        id: tripExpensesTable.id,
        tripId: tripExpensesTable.tripId,
        expenseTypeId: tripExpensesTable.expenseTypeId,
        expenseTypeName: expenseTypesTable.name,
        amount: tripExpensesTable.amount,
        expenseDate: tripExpensesTable.expenseDate,
        notes: tripExpensesTable.notes,
        createdAt: tripExpensesTable.createdAt,
      })
      .from(tripExpensesTable)
      .innerJoin(expenseTypesTable, eq(tripExpensesTable.expenseTypeId, expenseTypesTable.id))
      .where(eq(tripExpensesTable.tripId, id))
      .orderBy(tripExpensesTable.expenseDate);

    let totalExpense = 0;
    for (const r of rows) {
      totalExpense += Number(r.amount ?? 0);
    }

    res.json({ expenses: rows, totalExpense });
  } catch (err) {
    req.log.error({ err }, "List trip expenses error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/expenses", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    if (trip.status === "Closed") {
      res.status(400).json({ error: "Cannot add expense to a closed trip" });
      return;
    }

    const { expenseTypeId, amount, expenseDate, notes } = req.body;

    const numExpenseTypeId = Number(expenseTypeId);
    if (!Number.isInteger(numExpenseTypeId) || numExpenseTypeId <= 0) {
      res.status(400).json({ error: "Valid expense type is required" });
      return;
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: "Amount must be greater than 0" });
      return;
    }

    if (!expenseDate || typeof expenseDate !== "string") {
      res.status(400).json({ error: "Expense date is required" });
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(expenseDate) || isNaN(Date.parse(expenseDate))) {
      res.status(400).json({ error: "Expense date must be a valid date (YYYY-MM-DD)" });
      return;
    }

    const [expenseType] = await db
      .select({ id: expenseTypesTable.id })
      .from(expenseTypesTable)
      .where(eq(expenseTypesTable.id, numExpenseTypeId))
      .limit(1);
    if (!expenseType) {
      res.status(400).json({ error: "Expense type not found" });
      return;
    }

    const [inserted] = await db
      .insert(tripExpensesTable)
      .values({
        tripId: id,
        expenseTypeId: numExpenseTypeId,
        amount: String(numAmount),
        expenseDate: expenseDate,
        notes: notes ? String(notes) : null,
      })
      .returning();

    const [row] = await db
      .select({
        id: tripExpensesTable.id,
        tripId: tripExpensesTable.tripId,
        expenseTypeId: tripExpensesTable.expenseTypeId,
        expenseTypeName: expenseTypesTable.name,
        amount: tripExpensesTable.amount,
        expenseDate: tripExpensesTable.expenseDate,
        notes: tripExpensesTable.notes,
        createdAt: tripExpensesTable.createdAt,
      })
      .from(tripExpensesTable)
      .innerJoin(expenseTypesTable, eq(tripExpensesTable.expenseTypeId, expenseTypesTable.id))
      .where(eq(tripExpensesTable.id, inserted.id));

    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Add trip expense error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id/expenses/:expenseId", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const expenseIdRaw = Number(req.params["expenseId"]);
    if (!Number.isFinite(expenseIdRaw) || expenseIdRaw <= 0 || !Number.isInteger(expenseIdRaw)) {
      res.status(400).json({ error: "Invalid expense ID" });
      return;
    }

    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) {
      res.status(404).json({ error: "Trip not found" });
      return;
    }
    if (trip.status === "Closed") {
      res.status(400).json({ error: "Cannot delete expense from a closed trip" });
      return;
    }

    const [deleted] = await db
      .delete(tripExpensesTable)
      .where(and(eq(tripExpensesTable.id, expenseIdRaw), eq(tripExpensesTable.tripId, id)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Delete trip expense error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/customer-payments", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (!id) return;

    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }

    const payments = await db
      .select()
      .from(customerPaymentsTable)
      .where(eq(customerPaymentsTable.tripId, id))
      .orderBy(customerPaymentsTable.paymentDate);

    const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    res.json({ payments, totalReceived });
  } catch (err) {
    req.log.error({ err }, "List customer payments error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/customer-payments", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (!id) return;

    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }

    const { amount, paymentDate, paymentMode, notes } = req.body;

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: "Amount must be greater than 0" });
      return;
    }

    if (!paymentDate || typeof paymentDate !== "string") {
      res.status(400).json({ error: "Payment date is required" });
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(paymentDate) || isNaN(Date.parse(paymentDate))) {
      res.status(400).json({ error: "Payment date must be valid (YYYY-MM-DD)" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [payment] = await tx
        .insert(customerPaymentsTable)
        .values({
          tripId: id,
          amount: String(numAmount),
          paymentDate,
          paymentMode: paymentMode ? String(paymentMode) : null,
          notes: notes ? String(notes) : null,
        })
        .returning();

      await tx.insert(cashBookTable).values({
        entryType: "IN",
        referenceTable: "customer_payments",
        referenceId: payment.id,
        amount: String(numAmount),
        entryDate: paymentDate,
        description: `Customer payment for Trip #${id}${paymentMode ? ` (${paymentMode})` : ""}`,
      });

      return payment;
    });

    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err }, "Add customer payment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id/driver-advances", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (!id) return;

    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }

    const advances = await db
      .select()
      .from(driverAdvancesTable)
      .where(eq(driverAdvancesTable.tripId, id))
      .orderBy(driverAdvancesTable.advanceDate);

    const totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount), 0);

    res.json({ advances, totalAdvances });
  } catch (err) {
    req.log.error({ err }, "List driver advances error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/driver-advances", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (!id) return;

    const [trip] = await db.select({ id: tripsTable.id, driverId: tripsTable.driverId, status: tripsTable.status })
      .from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }

    if (trip.status !== "Open") {
      res.status(400).json({ error: "Driver advances can only be added to open trips" });
      return;
    }

    const { amount, advanceDate, notes } = req.body;

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: "Amount must be greater than 0" });
      return;
    }

    if (!advanceDate || typeof advanceDate !== "string") {
      res.status(400).json({ error: "Advance date is required" });
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(advanceDate) || isNaN(Date.parse(advanceDate))) {
      res.status(400).json({ error: "Advance date must be valid (YYYY-MM-DD)" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [advance] = await tx
        .insert(driverAdvancesTable)
        .values({
          driverId: trip.driverId,
          tripId: id,
          amount: String(numAmount),
          advanceDate,
          notes: notes ? String(notes) : null,
        })
        .returning();

      await tx.insert(cashBookTable).values({
        entryType: "OUT",
        referenceTable: "driver_advances",
        referenceId: advance.id,
        amount: String(numAmount),
        entryDate: advanceDate,
        description: `Driver advance for Trip #${id}`,
      });

      return advance;
    });

    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err }, "Add driver advance error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
