import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { citiesTable } from "@workspace/db/schema";
import { eq, ilike } from "drizzle-orm";
import { CreateCityBody, UpdateCityBody } from "@workspace/api-zod";
import { parseId } from "../lib/validate-id.js";

const router: IRouter = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const search = typeof req.query["search"] === "string" ? req.query["search"] : undefined;
    const rows = search
      ? await db.select().from(citiesTable).where(ilike(citiesTable.name, `%${search}%`)).orderBy(citiesTable.name)
      : await db.select().from(citiesTable).orderBy(citiesTable.name);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List cities error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = CreateCityBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "City name is required" });
      return;
    }
    const [row] = await db.insert(citiesTable).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      res.status(400).json({ error: "City already exists" });
      return;
    }
    req.log.error({ err }, "Create city error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const parsed = UpdateCityBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "City name is required" });
      return;
    }
    const [row] = await db.update(citiesTable).set(parsed.data).where(eq(citiesTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "City not found" });
      return;
    }
    res.json(row);
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      res.status(400).json({ error: "City already exists" });
      return;
    }
    req.log.error({ err }, "Update city error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const [row] = await db.delete(citiesTable).where(eq(citiesTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "City not found" });
      return;
    }
    res.json({ message: "City deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Delete city error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
