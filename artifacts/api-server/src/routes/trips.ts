import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { tripsTable, trucksTable, driversTable, citiesTable } from "@workspace/db/schema";
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

export default router;
