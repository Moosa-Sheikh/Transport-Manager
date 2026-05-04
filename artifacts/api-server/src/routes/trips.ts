import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  tripsTable, trucksTable, driversTable, citiesTable, warehousesTable,
  tripLoadsTable, customersTable,
  tripExpensesTable, expenseTypesTable,
  customerPaymentsTable, driverAdvancesTable, cashBookTable,
  customerDuesTable, itemsTable, tripRoundEntriesTable,
} from "@workspace/db/schema";
import { eq, and, gte, lte, sql, inArray, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { parseId } from "../lib/validate-id.js";

const fromCities = alias(citiesTable, "from_city");
const toCities = alias(citiesTable, "to_city");
const inHouseCity = alias(citiesTable, "in_house_city");
const fromWarehouses = alias(warehousesTable, "from_warehouse");
const toWarehouses = alias(warehousesTable, "to_warehouse");
const inHouseWarehouse = alias(warehousesTable, "inhouse_warehouse");
const inHouseWarehouseCity = alias(citiesTable, "inhouse_warehouse_city");

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

const customerShiftingRevenueExpr = sql<number>`(CASE WHEN ${tripsTable.movementType} = 'customer_shifting' THEN COALESCE(${tripsTable.rounds}, 0) * COALESCE(${tripsTable.ratePerRound}, 0) ELSE 0 END)::double precision`;
const customerShiftingCommissionExpr = sql<number>`(CASE WHEN ${tripsTable.movementType} = 'customer_shifting' THEN COALESCE(${tripsTable.commissionPerRound}, 0) * COALESCE(${tripsTable.rounds}, 0) ELSE 0 END)::double precision`;
const tripRevenueExpr = sql<number>`(CASE
  WHEN ${tripsTable.movementType} = 'customer_shifting' THEN ${customerShiftingRevenueExpr}
  ELSE ${incomeSubquery}
END)::double precision`;

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
      cityId: tripsTable.cityId,
      cityName: inHouseCity.name,
      fromWarehouseId: tripsTable.fromWarehouseId,
      fromWarehouseName: fromWarehouses.name,
      toWarehouseId: tripsTable.toWarehouseId,
      toWarehouseName: toWarehouses.name,
      inhouseWarehouseId: tripsTable.inhouseWarehouseId,
      inhouseWarehouseName: inHouseWarehouse.name,
      inhouseWarehouseCityName: inHouseWarehouseCity.name,
      driverCommission: tripsTable.driverCommission,
      status: tripsTable.status,
      movementType: tripsTable.movementType,
      notes: tripsTable.notes,
      customerId: tripsTable.customerId,
      customerName: customersTable.name,
      companyName: customersTable.companyName,
      itemId: tripsTable.itemId,
      itemName: itemsTable.name,
      itemUnit: itemsTable.unit,
      rounds: tripsTable.rounds,
      ratePerRound: tripsTable.ratePerRound,
      commissionPerRound: tripsTable.commissionPerRound,
      createdAt: tripsTable.createdAt,
      income: tripRevenueExpr.as("income"),
      expense: expenseSubquery.as("expense"),
      profit: sql<number>`(${tripRevenueExpr} - ${expenseSubquery})::double precision`.as("profit"),
      totalReceived: totalReceivedSubquery.as("total_received"),
      totalAdvances: totalAdvancesSubquery.as("total_advances"),
      actualProfit: sql<number>`(${tripRevenueExpr} - ${expenseSubquery} - ${totalAdvancesSubquery})::double precision`.as("actual_profit"),
      shiftingRevenue: sql<number>`(CASE WHEN ${tripsTable.movementType} = 'customer_shifting' THEN ${customerShiftingRevenueExpr} ELSE 0 END)::double precision`.as("shifting_revenue"),
      driverCommissionTotal: sql<number>`(CASE
        WHEN ${tripsTable.movementType} = 'customer_shifting' THEN ${customerShiftingCommissionExpr}
        WHEN ${tripsTable.movementType} = 'in_house_shifting' THEN (COALESCE(${tripsTable.commissionPerRound}, 0) * COALESCE(${tripsTable.rounds}, 0))::double precision
        ELSE COALESCE(${tripsTable.driverCommission}, 0)::double precision
      END)::double precision`.as("driver_commission_total"),
    })
    .from(tripsTable)
    .innerJoin(trucksTable, eq(tripsTable.truckId, trucksTable.id))
    .innerJoin(driversTable, eq(tripsTable.driverId, driversTable.id))
    .leftJoin(fromCities, eq(tripsTable.fromCityId, fromCities.id))
    .leftJoin(toCities, eq(tripsTable.toCityId, toCities.id))
    .leftJoin(inHouseCity, eq(tripsTable.cityId, inHouseCity.id))
    .leftJoin(fromWarehouses, eq(tripsTable.fromWarehouseId, fromWarehouses.id))
    .leftJoin(toWarehouses, eq(tripsTable.toWarehouseId, toWarehouses.id))
    .leftJoin(inHouseWarehouse, eq(tripsTable.inhouseWarehouseId, inHouseWarehouse.id))
    .leftJoin(inHouseWarehouseCity, eq(inHouseWarehouse.cityId, inHouseWarehouseCity.id))
    .leftJoin(customersTable, eq(tripsTable.customerId, customersTable.id))
    .leftJoin(itemsTable, eq(tripsTable.itemId, itemsTable.id));
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const { date_from, date_to, truck_id, driver_id, status, profit, from_city_id, to_city_id, customer_id, movement_type } = req.query;
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
    if (typeof from_city_id === "string" && from_city_id) {
      const fcid = Number(from_city_id);
      if (Number.isFinite(fcid) && fcid > 0) {
        conditions.push(eq(tripsTable.fromCityId, fcid));
      }
    }
    if (typeof to_city_id === "string" && to_city_id) {
      const tcid = Number(to_city_id);
      if (Number.isFinite(tcid) && tcid > 0) {
        conditions.push(eq(tripsTable.toCityId, tcid));
      }
    }
    if (typeof status === "string" && (status === "Open" || status === "Closed")) {
      conditions.push(eq(tripsTable.status, status));
    }
    if (typeof customer_id === "string" && customer_id) {
      const cid = Number(customer_id);
      if (Number.isFinite(cid) && cid > 0) {
        conditions.push(sql`(EXISTS (SELECT 1 FROM trip_loads WHERE trip_loads.trip_id = ${tripsTable.id} AND trip_loads.customer_id = ${cid}) OR (${tripsTable.movementType} IN ('customer_shifting', 'in_house_shifting') AND ${tripsTable.customerId} = ${cid}))`);
      }
    }
    if (typeof city_id === "string" && city_id) {
      const cid = Number(city_id);
      if (Number.isFinite(cid) && cid > 0) {
        conditions.push(eq(tripsTable.cityId, cid));
      }
    }
    if (typeof movement_type === "string") {
      if (movement_type === "shifting") {
        conditions.push(sql`${tripsTable.movementType} IN ('customer_shifting', 'in_house_shifting')`);
      } else if (movement_type === "customer_trip" || movement_type === "in_house_shifting" || movement_type === "customer_shifting") {
        conditions.push(eq(tripsTable.movementType, movement_type));
      }
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
    const {
      tripDate, truckId, driverId, fromCityId, toCityId,
      fromWarehouseId, toWarehouseId, cityId, inhouseWarehouseId,
      driverCommission, movementType, notes,
      customerId, itemId, rounds, ratePerRound, commissionPerRound,
    } = req.body;

    if (!tripDate || !truckId || !driverId) {
      res.status(400).json({ error: "Trip date, truck and driver are required" });
      return;
    }

    const numTruckId = Number(truckId);
    const numDriverId = Number(driverId);

    if (!Number.isInteger(numTruckId) || !Number.isInteger(numDriverId)) {
      res.status(400).json({ error: "Invalid truck or driver ID" });
      return;
    }

    const validModes = new Set(["customer_trip", "in_house_shifting", "customer_shifting"]);
    const resolvedMovementType = validModes.has(movementType) ? movementType as string : "customer_trip";

    let numFromCityId: number | null = null;
    let numToCityId: number | null = null;
    let numFromWarehouseId: number | null = null;
    let numToWarehouseId: number | null = null;
    let numCityId: number | null = null;
    let numInhouseWarehouseId: number | null = null;

    if (resolvedMovementType === "customer_trip") {
      numFromCityId = Number(fromCityId);
      numToCityId = Number(toCityId);
      if (!Number.isInteger(numFromCityId) || !Number.isInteger(numToCityId)) {
        res.status(400).json({ error: "From city and To city are required for customer trips" });
        return;
      }
      if (numFromCityId === numToCityId) {
        res.status(400).json({ error: "From city and To city cannot be the same" });
        return;
      }
    } else if (resolvedMovementType === "customer_shifting") {
      numFromWarehouseId = Number(fromWarehouseId);
      numToWarehouseId = Number(toWarehouseId);
      if (!Number.isInteger(numFromWarehouseId) || numFromWarehouseId <= 0 ||
          !Number.isInteger(numToWarehouseId) || numToWarehouseId <= 0) {
        res.status(400).json({ error: "From and To warehouses are required for customer shifting" });
        return;
      }
    } else {
      numFromWarehouseId = Number(fromWarehouseId);
      numToWarehouseId = Number(toWarehouseId);
      if (!Number.isInteger(numFromWarehouseId) || numFromWarehouseId <= 0 ||
          !Number.isInteger(numToWarehouseId) || numToWarehouseId <= 0) {
        res.status(400).json({ error: "From and To warehouses are required for in-house shifting" });
        return;
      }
    }

    let resolvedCustomerId: number | null = null;
    let resolvedItemId: number | null = null;
    let resolvedRounds: number = 1;
    let resolvedRate = "0";
    let resolvedCommissionPerRound = "0";

    if (resolvedMovementType === "customer_shifting") {
      const cId = Number(customerId);
      const iId = Number(itemId);
      const rNum = Number(rounds);
      const rateNum = Number(ratePerRound);
      const commNum = Number(commissionPerRound);
      if (!Number.isInteger(cId) || cId <= 0) {
        res.status(400).json({ error: "Customer is required for customer shifting" });
        return;
      }
      if (!Number.isInteger(iId) || iId <= 0) {
        res.status(400).json({ error: "Item is required for customer shifting" });
        return;
      }
      if (!Number.isInteger(rNum) || rNum <= 0) {
        res.status(400).json({ error: "Rounds must be a positive integer" });
        return;
      }
      if (!Number.isFinite(rateNum) || rateNum <= 0) {
        res.status(400).json({ error: "Rate per round must be greater than zero for customer shifting" });
        return;
      }
      if (!Number.isFinite(commNum) || commNum < 0) {
        res.status(400).json({ error: "Commission per round must be non-negative" });
        return;
      }
      resolvedCustomerId = cId;
      resolvedItemId = iId;
      resolvedRounds = rNum;
      resolvedRate = String(ratePerRound);
      resolvedCommissionPerRound = String(commissionPerRound);
    } else if (resolvedMovementType === "in_house_shifting") {
      const iId = Number(itemId);
      const rNum = Number(rounds);
      const rateNum = Number(ratePerRound);
      const commNum = Number(commissionPerRound);
      if (!Number.isInteger(iId) || iId <= 0) {
        res.status(400).json({ error: "Item is required for in-house shifting" });
        return;
      }
      if (!Number.isInteger(rNum) || rNum <= 0) {
        res.status(400).json({ error: "Rounds must be a positive integer" });
        return;
      }
      if (!Number.isFinite(rateNum) || rateNum < 0) {
        res.status(400).json({ error: "Rate per round must be non-negative" });
        return;
      }
      resolvedItemId = iId;
      resolvedRounds = rNum;
      resolvedRate = String(ratePerRound);
      if (Number.isFinite(commNum) && commNum >= 0) {
        resolvedCommissionPerRound = String(commissionPerRound);
      }
    }

    const commissionVal = resolvedMovementType === "customer_trip" && driverCommission !== undefined && driverCommission !== null && driverCommission !== ""
      ? String(driverCommission)
      : "0";

    const [inserted] = await db
      .insert(tripsTable)
      .values({
        tripDate: String(tripDate),
        truckId: numTruckId,
        driverId: numDriverId,
        fromCityId: numFromCityId,
        toCityId: numToCityId,
        fromWarehouseId: numFromWarehouseId,
        toWarehouseId: numToWarehouseId,
        cityId: numCityId,
        inhouseWarehouseId: numInhouseWarehouseId,
        driverCommission: commissionVal,
        movementType: resolvedMovementType,
        notes: notes ? String(notes).trim() : null,
        customerId: resolvedCustomerId,
        itemId: resolvedItemId,
        rounds: resolvedRounds,
        ratePerRound: resolvedRate,
        commissionPerRound: resolvedCommissionPerRound,
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

      if (existing.movementType === "customer_shifting") {
        const rounds = Number(existing.rounds ?? 1);
        const rate = Number(existing.ratePerRound ?? 0);
        const revenue = rounds * rate;
        const paidRows = await tx
          .select({ total: sql<number>`COALESCE(SUM(amount::numeric), 0)::double precision` })
          .from(customerPaymentsTable)
          .where(eq(customerPaymentsTable.tripId, id));
        const paid = Number(paidRows[0]?.total ?? 0);
        const due = Math.round((revenue - paid) * 100) / 100;
        if (existing.customerId && due > 0.01) {
          await tx.insert(customerDuesTable).values({
            tripId: id,
            loadId: null,
            customerId: existing.customerId,
            biltyNumber: null,
            dueAmount: String(due),
            dueDate: existing.tripDate,
            notes: `Auto-generated on customer shifting trip #${id} close`,
          });
        }
        return;
      }

      if (existing.movementType === "in_house_shifting") {
        return;
      }

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

      const payments = await tx
        .select({
          customerId: customerPaymentsTable.customerId,
          total: sql<number>`COALESCE(SUM(amount::numeric), 0)::double precision`,
        })
        .from(customerPaymentsTable)
        .where(eq(customerPaymentsTable.tripId, id))
        .groupBy(customerPaymentsTable.customerId);

      const customerPaid = new Map<number | null, number>();
      for (const p of payments) {
        customerPaid.set(p.customerId, (customerPaid.get(p.customerId) ?? 0) + p.total);
      }

      const unattributedPaid = customerPaid.get(null) ?? 0;

      const customerLoadIncomes = new Map<number, { totalIncome: number; loads: typeof loads }>();
      for (const load of loads) {
        const loadIncome = calcNetLoadIncome(load);
        const entry = customerLoadIncomes.get(load.customerId);
        if (entry) {
          entry.totalIncome += loadIncome;
          entry.loads.push(load);
        } else {
          customerLoadIncomes.set(load.customerId, { totalIncome: loadIncome, loads: [load] });
        }
      }

      let totalIncomeAll = 0;
      for (const data of customerLoadIncomes.values()) {
        totalIncomeAll += data.totalIncome;
      }

      for (const [custId, data] of customerLoadIncomes) {
        const attributedPaid = customerPaid.get(custId) ?? 0;
        const unattributedShare = totalIncomeAll > 0
          ? (data.totalIncome / totalIncomeAll) * unattributedPaid
          : 0;
        const totalPaidForCustomer = attributedPaid + unattributedShare;
        const customerOutstanding = data.totalIncome - totalPaidForCustomer;

        if (customerOutstanding <= 0.01) continue;

        for (const load of data.loads) {
          const loadIncome = calcNetLoadIncome(load);
          const loadDue = data.totalIncome > 0
            ? Math.round((loadIncome / data.totalIncome) * customerOutstanding * 100) / 100
            : 0;

          if (loadDue > 0.01) {
            await tx.insert(customerDuesTable).values({
              tripId: id,
              loadId: load.id,
              customerId: custId,
              biltyNumber: load.biltyNumber,
              dueAmount: String(loadDue),
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

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (!id) return;

    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }

    if (trip.status === "Closed") {
      res.status(400).json({ error: "Cannot delete a closed trip" });
      return;
    }

    await db.transaction(async (tx) => {
      const payments = await tx.select({ id: customerPaymentsTable.id }).from(customerPaymentsTable).where(eq(customerPaymentsTable.tripId, id));
      const advances = await tx.select({ id: driverAdvancesTable.id }).from(driverAdvancesTable).where(eq(driverAdvancesTable.tripId, id));
      const expenses = await tx.select({ id: tripExpensesTable.id }).from(tripExpensesTable).where(eq(tripExpensesTable.tripId, id));

      if (payments.length > 0) {
        const paymentIds = payments.map((p) => p.id);
        await tx.delete(cashBookTable).where(and(eq(cashBookTable.referenceTable, "customer_payments"), inArray(cashBookTable.referenceId, paymentIds)));
      }
      if (advances.length > 0) {
        const advanceIds = advances.map((a) => a.id);
        await tx.delete(cashBookTable).where(and(eq(cashBookTable.referenceTable, "driver_advances"), inArray(cashBookTable.referenceId, advanceIds)));
      }
      if (expenses.length > 0) {
        const expenseIds = expenses.map((e) => e.id);
        await tx.delete(cashBookTable).where(and(eq(cashBookTable.referenceTable, "trip_expenses"), inArray(cashBookTable.referenceId, expenseIds)));
      }

      await tx.delete(customerPaymentsTable).where(eq(customerPaymentsTable.tripId, id));
      await tx.delete(driverAdvancesTable).where(eq(driverAdvancesTable.tripId, id));
      await tx.delete(tripExpensesTable).where(eq(tripExpensesTable.tripId, id));
      await tx.delete(tripLoadsTable).where(eq(tripLoadsTable.tripId, id));
      await tx.delete(tripRoundEntriesTable).where(eq(tripRoundEntriesTable.tripId, id));
      await tx.delete(tripsTable).where(eq(tripsTable.id, id));
    });

    res.json({ message: "Trip deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Delete trip error");
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

router.get("/:id/round-entries", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const [trip] = await db.select({ id: tripsTable.id, movementType: tripsTable.movementType }).from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }
    if (trip.movementType !== "in_house_shifting") { res.status(400).json({ error: "Round entries are only for in-house shifting trips" }); return; }

    const rows = await db
      .select({
        id: tripRoundEntriesTable.id,
        tripId: tripRoundEntriesTable.tripId,
        itemId: tripRoundEntriesTable.itemId,
        itemName: itemsTable.name,
        itemUnit: itemsTable.unit,
        ratePerRound: tripRoundEntriesTable.ratePerRound,
        rounds: tripRoundEntriesTable.rounds,
        entryDate: tripRoundEntriesTable.entryDate,
        notes: tripRoundEntriesTable.notes,
        createdAt: tripRoundEntriesTable.createdAt,
      })
      .from(tripRoundEntriesTable)
      .innerJoin(itemsTable, eq(tripRoundEntriesTable.itemId, itemsTable.id))
      .where(eq(tripRoundEntriesTable.tripId, id))
      .orderBy(tripRoundEntriesTable.id);

    const entries = rows.map((r) => ({
      ...r,
      revenue: Number(r.ratePerRound ?? 0) * Number(r.rounds ?? 0),
    }));
    const totalRevenue = entries.reduce((s, e) => s + e.revenue, 0);
    const totalRounds = entries.reduce((s, e) => s + Number(e.rounds ?? 0), 0);

    res.json({ entries, summary: { totalRevenue, totalRounds } });
  } catch (err) {
    req.log.error({ err }, "List trip round entries error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/round-entries", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;

    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }
    if (trip.status === "Closed") { res.status(400).json({ error: "Cannot add to a closed trip" }); return; }
    if (trip.movementType !== "in_house_shifting") { res.status(400).json({ error: "Round entries are only for in-house shifting trips" }); return; }

    const { itemId, ratePerRound, rounds, entryDate, notes } = req.body;
    const numItemId = Number(itemId);
    if (!Number.isInteger(numItemId) || numItemId <= 0) { res.status(400).json({ error: "Item is required" }); return; }
    const rateNum = Number(ratePerRound);
    if (!Number.isFinite(rateNum) || rateNum < 0) { res.status(400).json({ error: "Rate per round must be a non-negative number" }); return; }
    const roundsNum = Number(rounds);
    if (!Number.isInteger(roundsNum) || roundsNum <= 0) { res.status(400).json({ error: "Rounds must be a positive integer" }); return; }

    const [inserted] = await db
      .insert(tripRoundEntriesTable)
      .values({
        tripId: id,
        itemId: numItemId,
        ratePerRound: String(rateNum),
        rounds: roundsNum,
        entryDate: entryDate ? String(entryDate) : null,
        notes: notes ? String(notes).trim() || null : null,
      })
      .returning();

    const [row] = await db
      .select({
        id: tripRoundEntriesTable.id,
        tripId: tripRoundEntriesTable.tripId,
        itemId: tripRoundEntriesTable.itemId,
        itemName: itemsTable.name,
        itemUnit: itemsTable.unit,
        ratePerRound: tripRoundEntriesTable.ratePerRound,
        rounds: tripRoundEntriesTable.rounds,
        entryDate: tripRoundEntriesTable.entryDate,
        notes: tripRoundEntriesTable.notes,
        createdAt: tripRoundEntriesTable.createdAt,
      })
      .from(tripRoundEntriesTable)
      .innerJoin(itemsTable, eq(tripRoundEntriesTable.itemId, itemsTable.id))
      .where(eq(tripRoundEntriesTable.id, inserted.id));

    res.status(201).json({ ...row, revenue: Number(row.ratePerRound ?? 0) * Number(row.rounds ?? 0) });
  } catch (err) {
    req.log.error({ err }, "Add trip round entry error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id/round-entries/:entryId", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const entryIdRaw = Number(req.params["entryId"]);
    if (!Number.isInteger(entryIdRaw) || entryIdRaw <= 0) { res.status(400).json({ error: "Invalid entry ID" }); return; }

    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }
    if (trip.movementType !== "in_house_shifting") { res.status(400).json({ error: "Round entries are only for in-house shifting trips" }); return; }
    if (trip.status === "Closed") { res.status(400).json({ error: "Cannot delete from a closed trip" }); return; }

    const [deleted] = await db
      .delete(tripRoundEntriesTable)
      .where(and(eq(tripRoundEntriesTable.id, entryIdRaw), eq(tripRoundEntriesTable.tripId, id)))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Round entry not found" }); return; }

    res.json({ message: "Round entry deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Delete trip round entry error");
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
        expenseCategory: tripExpensesTable.expenseCategory,
        customerId: tripExpensesTable.customerId,
        customerName: customersTable.name,
        notes: tripExpensesTable.notes,
        createdAt: tripExpensesTable.createdAt,
      })
      .from(tripExpensesTable)
      .innerJoin(expenseTypesTable, eq(tripExpensesTable.expenseTypeId, expenseTypesTable.id))
      .leftJoin(customersTable, eq(tripExpensesTable.customerId, customersTable.id))
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

    const { expenseTypeId, amount, expenseDate, expenseCategory, customerId, notes } = req.body;

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

    const validCategories = ["driver", "truck", "customer"];
    if (!expenseCategory || !validCategories.includes(expenseCategory)) {
      res.status(400).json({ error: "Expense category must be one of: driver, truck, customer" });
      return;
    }

    let numCustomerId: number | null = null;
    if (expenseCategory === "customer") {
      numCustomerId = Number(customerId);
      if (!Number.isInteger(numCustomerId) || numCustomerId <= 0) {
        res.status(400).json({ error: "Customer is required when expense is for Customer" });
        return;
      }
      const [cust] = await db
        .select({ id: customersTable.id })
        .from(customersTable)
        .where(eq(customersTable.id, numCustomerId))
        .limit(1);
      if (!cust) {
        res.status(400).json({ error: "Customer not found" });
        return;
      }
    }

    const [expenseType] = await db
      .select({ id: expenseTypesTable.id, name: expenseTypesTable.name })
      .from(expenseTypesTable)
      .where(eq(expenseTypesTable.id, numExpenseTypeId))
      .limit(1);
    if (!expenseType) {
      res.status(400).json({ error: "Expense type not found" });
      return;
    }

    const inserted = await db.transaction(async (tx) => {
      const [expense] = await tx
        .insert(tripExpensesTable)
        .values({
          tripId: id,
          expenseTypeId: numExpenseTypeId,
          amount: String(numAmount),
          expenseDate: expenseDate,
          expenseCategory: expenseCategory,
          customerId: numCustomerId,
          notes: notes ? String(notes) : null,
        })
        .returning();

      await tx.insert(cashBookTable).values({
        entryType: "OUT",
        referenceTable: "trip_expenses",
        referenceId: expense.id,
        amount: String(numAmount),
        entryDate: expenseDate,
        description: `Trip #${id} expense — ${expenseType.name} (${expenseCategory})`,
      });

      return expense;
    });

    const [row] = await db
      .select({
        id: tripExpensesTable.id,
        tripId: tripExpensesTable.tripId,
        expenseTypeId: tripExpensesTable.expenseTypeId,
        expenseTypeName: expenseTypesTable.name,
        amount: tripExpensesTable.amount,
        expenseDate: tripExpensesTable.expenseDate,
        expenseCategory: tripExpensesTable.expenseCategory,
        customerId: tripExpensesTable.customerId,
        customerName: customersTable.name,
        notes: tripExpensesTable.notes,
        createdAt: tripExpensesTable.createdAt,
      })
      .from(tripExpensesTable)
      .innerJoin(expenseTypesTable, eq(tripExpensesTable.expenseTypeId, expenseTypesTable.id))
      .leftJoin(customersTable, eq(tripExpensesTable.customerId, customersTable.id))
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
      .select({ id: tripExpensesTable.id })
      .from(tripExpensesTable)
      .where(and(eq(tripExpensesTable.id, expenseIdRaw), eq(tripExpensesTable.tripId, id)));

    if (!deleted) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.delete(cashBookTable).where(
        and(eq(cashBookTable.referenceTable, "trip_expenses"), eq(cashBookTable.referenceId, expenseIdRaw))
      );
      await tx.delete(tripExpensesTable).where(eq(tripExpensesTable.id, expenseIdRaw));
    });

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

router.get("/:id/customer-dues", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (!id) return;

    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }

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
      })
      .from(customerDuesTable)
      .innerJoin(customersTable, eq(customerDuesTable.customerId, customersTable.id))
      .where(eq(customerDuesTable.tripId, id))
      .orderBy(sql`${customerDuesTable.dueDate} DESC`);

    const totalDue = rows.reduce((sum, r) => sum + Number(r.dueAmount), 0);
    const totalPaid = rows.reduce((sum, r) => sum + Number(r.paidAmount), 0);
    const totalBalance = rows.reduce((sum, r) => sum + (r.balance ?? 0), 0);

    res.json({ dues: rows, totalDue, totalPaid, totalBalance });
  } catch (err) {
    req.log.error({ err }, "List trip customer dues error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/customer-payments", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (!id) return;

    const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, id));
    if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }

    if (trip.status === "Closed") {
      res.status(400).json({ error: "Cannot add payments to a closed trip. Use Customer Dues to manage remaining amounts." });
      return;
    }

    const { amount, paymentDate, paymentMode, notes, customerId } = req.body;

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

    const custId = customerId ? Number(customerId) : null;
    if (!custId || !Number.isInteger(custId) || custId <= 0) {
      res.status(400).json({ error: "Customer is required" });
      return;
    }

    if (trip.movementType === "customer_shifting") {
      if (!trip.customerId) {
        res.status(400).json({ error: "Customer shifting trip is missing its customer" });
        return;
      }
      if (custId !== trip.customerId) {
        res.status(400).json({ error: "Payments for customer shifting must use the trip's customer" });
        return;
      }
    } else if (trip.movementType === "in_house_shifting") {
      res.status(400).json({ error: "In-house shifting trips do not accept customer payments" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [payment] = await tx
        .insert(customerPaymentsTable)
        .values({
          tripId: id,
          customerId: custId,
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
