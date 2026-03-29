import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { tripsTable, trucksTable, driversTable, citiesTable, tripLoadsTable, customersTable } from "@workspace/db/schema";
import { eq, and, gte, lte, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { parseId } from "../lib/validate-id.js";

const fromCities = alias(citiesTable, "from_city");
const toCities = alias(citiesTable, "to_city");

const router: IRouter = Router();

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
      status: tripsTable.status,
      createdAt: tripsTable.createdAt,
      income: sql<number>`COALESCE((
        SELECT SUM(COALESCE(freight, 0) + COALESCE(loading_charges, 0) + COALESCE(unloading_charges, 0) - COALESCE(broker_commission, 0))
        FROM trip_loads WHERE trip_loads.trip_id = ${tripsTable.id}
      ), 0)::double precision`.as("income"),
    })
    .from(tripsTable)
    .innerJoin(trucksTable, eq(tripsTable.truckId, trucksTable.id))
    .innerJoin(driversTable, eq(tripsTable.driverId, driversTable.id))
    .innerJoin(fromCities, eq(tripsTable.fromCityId, fromCities.id))
    .innerJoin(toCities, eq(tripsTable.toCityId, toCities.id));
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const { date_from, date_to, truck_id, driver_id, status } = req.query;
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
    const rows = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(sql`${tripsTable.tripDate} DESC`)
      : await query.orderBy(sql`${tripsTable.tripDate} DESC`);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List trips error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { tripDate, truckId, driverId, fromCityId, toCityId } = req.body;

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

    const [inserted] = await db
      .insert(tripsTable)
      .values({
        tripDate: String(tripDate),
        truckId: numTruckId,
        driverId: numDriverId,
        fromCityId: numFromCityId,
        toCityId: numToCityId,
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

    await db.update(tripsTable).set({ status: "Closed" }).where(eq(tripsTable.id, id));

    const [row] = await buildTripQuery().where(eq(tripsTable.id, id));
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Close trip error");
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

export default router;
