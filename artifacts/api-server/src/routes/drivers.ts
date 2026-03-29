import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { driversTable } from "@workspace/db/schema";
import { eq, ilike } from "drizzle-orm";
import { CreateDriverBody, UpdateDriverBody } from "@workspace/api-zod";
import { parseId } from "../lib/validate-id.js";

const router: IRouter = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const search = typeof req.query["search"] === "string" ? req.query["search"] : undefined;
    const rows = search
      ? await db.select().from(driversTable).where(ilike(driversTable.name, `%${search}%`)).orderBy(driversTable.name)
      : await db.select().from(driversTable).orderBy(driversTable.name);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List drivers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = CreateDriverBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const [row] = await db.insert(driversTable).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Create driver error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const parsed = UpdateDriverBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const [row] = await db.update(driversTable).set(parsed.data).where(eq(driversTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "Driver not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Update driver error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const [row] = await db.delete(driversTable).where(eq(driversTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "Driver not found" });
      return;
    }
    res.json({ message: "Driver deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Delete driver error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
