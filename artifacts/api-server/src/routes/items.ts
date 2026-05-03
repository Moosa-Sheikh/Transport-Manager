import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { itemsTable } from "@workspace/db/schema";
import { eq, ilike } from "drizzle-orm";
import { parseId } from "../lib/validate-id.js";

const router: IRouter = Router();

interface ItemBody {
  name?: unknown;
  unit?: unknown;
  defaultRatePerRound?: unknown;
}

function validateBody(body: ItemBody): { name: string; unit: string; defaultRatePerRound: string } | string {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return "Item name is required";
  const unit = typeof body.unit === "string" && body.unit.trim() ? body.unit.trim() : "Bag";
  const rateRaw = body.defaultRatePerRound;
  const rateStr = rateRaw === undefined || rateRaw === null || rateRaw === "" ? "0" : String(rateRaw);
  const rateNum = Number(rateStr);
  if (!Number.isFinite(rateNum) || rateNum < 0) return "Default rate must be a non-negative number";
  return { name, unit, defaultRatePerRound: rateStr };
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const search = typeof req.query["search"] === "string" ? req.query["search"] : undefined;
    const rows = search
      ? await db.select().from(itemsTable).where(ilike(itemsTable.name, `%${search}%`)).orderBy(itemsTable.name)
      : await db.select().from(itemsTable).orderBy(itemsTable.name);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List items error");
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
    const [row] = await db.insert(itemsTable).values(validated).returning();
    res.status(201).json(row);
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      res.status(400).json({ error: "Item already exists" });
      return;
    }
    req.log.error({ err }, "Create item error");
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
    const [row] = await db.update(itemsTable).set(validated).where(eq(itemsTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(row);
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      res.status(400).json({ error: "Item name already exists" });
      return;
    }
    req.log.error({ err }, "Update item error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const [row] = await db.delete(itemsTable).where(eq(itemsTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json({ message: "Item deleted successfully" });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23503") {
      res.status(400).json({ error: "Cannot delete item — it is referenced by one or more trips" });
      return;
    }
    req.log.error({ err }, "Delete item error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
