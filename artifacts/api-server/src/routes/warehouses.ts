import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { warehousesTable, citiesTable } from "@workspace/db/schema";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import { parseId } from "../lib/validate-id.js";

const router: IRouter = Router();

interface WarehouseBody {
  name?: unknown;
  cityId?: unknown;
  address?: unknown;
}

function validateBody(body: WarehouseBody): { name: string; cityId: number; address: string | null } | string {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return "Warehouse name is required";
  const cid = Number(body.cityId);
  if (!Number.isInteger(cid) || cid <= 0) return "Valid city is required";
  const address = typeof body.address === "string" && body.address.trim() ? body.address.trim() : null;
  return { name, cityId: cid, address };
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const search = typeof req.query["search"] === "string" ? req.query["search"] : undefined;
    const cityIdRaw = typeof req.query["city_id"] === "string" ? req.query["city_id"] : undefined;
    const cityId = cityIdRaw ? Number(cityIdRaw) : undefined;
    const conditions: SQL[] = [];
    if (search) conditions.push(ilike(warehousesTable.name, `%${search}%`));
    if (cityId && Number.isInteger(cityId) && cityId > 0) conditions.push(eq(warehousesTable.cityId, cityId));

    const baseQuery = db
      .select({
        id: warehousesTable.id,
        name: warehousesTable.name,
        cityId: warehousesTable.cityId,
        cityName: citiesTable.name,
        address: warehousesTable.address,
        createdAt: warehousesTable.createdAt,
      })
      .from(warehousesTable)
      .innerJoin(citiesTable, eq(warehousesTable.cityId, citiesTable.id));

    const rows = conditions.length > 0
      ? await baseQuery.where(and(...conditions)).orderBy(warehousesTable.name)
      : await baseQuery.orderBy(warehousesTable.name);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List warehouses error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const validated = validateBody(req.body);
    if (typeof validated === "string") {
      res.status(400).json({ error: validated });
      return;
    }
    const [inserted] = await db.insert(warehousesTable).values(validated).returning();
    const [row] = await db
      .select({
        id: warehousesTable.id,
        name: warehousesTable.name,
        cityId: warehousesTable.cityId,
        cityName: citiesTable.name,
        address: warehousesTable.address,
        createdAt: warehousesTable.createdAt,
      })
      .from(warehousesTable)
      .innerJoin(citiesTable, eq(warehousesTable.cityId, citiesTable.id))
      .where(eq(warehousesTable.id, inserted.id));
    res.status(201).json(row);
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23503") {
      res.status(400).json({ error: "Selected city does not exist" });
      return;
    }
    req.log.error({ err }, "Create warehouse error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const validated = validateBody(req.body);
    if (typeof validated === "string") {
      res.status(400).json({ error: validated });
      return;
    }
    const [updated] = await db.update(warehousesTable).set(validated).where(eq(warehousesTable.id, id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Warehouse not found" });
      return;
    }
    const [row] = await db
      .select({
        id: warehousesTable.id,
        name: warehousesTable.name,
        cityId: warehousesTable.cityId,
        cityName: citiesTable.name,
        address: warehousesTable.address,
        createdAt: warehousesTable.createdAt,
      })
      .from(warehousesTable)
      .innerJoin(citiesTable, eq(warehousesTable.cityId, citiesTable.id))
      .where(eq(warehousesTable.id, id));
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Update warehouse error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const [row] = await db.delete(warehousesTable).where(eq(warehousesTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "Warehouse not found" });
      return;
    }
    res.json({ message: "Warehouse deleted successfully" });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23503") {
      res.status(400).json({ error: "Cannot delete warehouse — it is referenced by one or more trips" });
      return;
    }
    req.log.error({ err }, "Delete warehouse error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
