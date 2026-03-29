import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db/schema";
import { eq, ilike } from "drizzle-orm";
import { CreateCustomerBody, UpdateCustomerBody } from "@workspace/api-zod";
import { parseId } from "../lib/validate-id.js";

const router: IRouter = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const search = typeof req.query["search"] === "string" ? req.query["search"] : undefined;
    const rows = search
      ? await db.select().from(customersTable).where(ilike(customersTable.name, `%${search}%`)).orderBy(customersTable.name)
      : await db.select().from(customersTable).orderBy(customersTable.name);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List customers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = CreateCustomerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const [row] = await db.insert(customersTable).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Create customer error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const parsed = UpdateCustomerBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Name is required" });
      return;
    }
    const [row] = await db.update(customersTable).set(parsed.data).where(eq(customersTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Update customer error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseId(req, res);
    if (id === null) return;
    const [row] = await db.delete(customersTable).where(eq(customersTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Delete customer error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
