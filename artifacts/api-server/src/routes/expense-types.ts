import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { expenseTypesTable } from "@workspace/db/schema";
import { eq, ilike } from "drizzle-orm";
import { CreateExpenseTypeBody, UpdateExpenseTypeBody } from "@workspace/api-zod";
import { parseId } from "../lib/validate-id.js";

const router: IRouter = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const search = typeof req.query["search"] === "string" ? req.query["search"] : undefined;
    const rows = search
      ? await db.select().from(expenseTypesTable).where(ilike(expenseTypesTable.name, `%${search}%`)).orderBy(expenseTypesTable.name)
      : await db.select().from(expenseTypesTable).orderBy(expenseTypesTable.name);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List expense types error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = CreateExpenseTypeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Expense type name is required" });
      return;
    }
    const [row] = await db.insert(expenseTypesTable).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      res.status(400).json({ error: "Expense type already exists" });
      return;
    }
    req.log.error({ err }, "Create expense type error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const parsed = UpdateExpenseTypeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Expense type name is required" });
      return;
    }
    const [row] = await db.update(expenseTypesTable).set(parsed.data).where(eq(expenseTypesTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "Expense type not found" });
      return;
    }
    res.json(row);
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === "23505") {
      res.status(400).json({ error: "Expense type already exists" });
      return;
    }
    req.log.error({ err }, "Update expense type error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const [row] = await db.delete(expenseTypesTable).where(eq(expenseTypesTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "Expense type not found" });
      return;
    }
    res.json({ message: "Expense type deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Delete expense type error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
