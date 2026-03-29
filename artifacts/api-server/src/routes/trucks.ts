import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { trucksTable } from "@workspace/db/schema";
import { eq, ilike } from "drizzle-orm";
import { CreateTruckBody, UpdateTruckBody } from "@workspace/api-zod";
import { parseId } from "../lib/validate-id.js";

const router: IRouter = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const search = typeof req.query["search"] === "string" ? req.query["search"] : undefined;
    const rows = search
      ? await db.select().from(trucksTable).where(ilike(trucksTable.truckNumber, `%${search}%`)).orderBy(trucksTable.truckNumber)
      : await db.select().from(trucksTable).orderBy(trucksTable.truckNumber);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List trucks error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = CreateTruckBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Truck number and owner type are required" });
      return;
    }
    const [row] = await db.insert(trucksTable).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      res.status(400).json({ error: "Truck number already exists" });
      return;
    }
    req.log.error({ err }, "Create truck error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const parsed = UpdateTruckBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Truck number and owner type are required" });
      return;
    }
    const [row] = await db.update(trucksTable).set(parsed.data).where(eq(trucksTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "Truck not found" });
      return;
    }
    res.json(row);
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      res.status(400).json({ error: "Truck number already exists" });
      return;
    }
    req.log.error({ err }, "Update truck error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const [row] = await db.delete(trucksTable).where(eq(trucksTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "Truck not found" });
      return;
    }
    res.json({ message: "Truck deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Delete truck error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
