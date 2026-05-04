import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { customersTable, tripsTable, tripLoadsTable, customerDuesTable } from "@workspace/db/schema";
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

    const [linkedTrip] = await db
      .select({ id: tripsTable.id })
      .from(tripsTable)
      .where(eq(tripsTable.customerId, id))
      .limit(1);
    if (linkedTrip) {
      res.status(409).json({ error: "Cannot delete this customer — they have shifting trips linked to them. Delete those trips first." });
      return;
    }

    const [linkedLoad] = await db
      .select({ id: tripLoadsTable.id })
      .from(tripLoadsTable)
      .where(eq(tripLoadsTable.customerId, id))
      .limit(1);
    if (linkedLoad) {
      res.status(409).json({ error: "Cannot delete this customer — they have loads (bilties) on record. Delete those loads first." });
      return;
    }

    const [linkedDue] = await db
      .select({ id: customerDuesTable.id })
      .from(customerDuesTable)
      .where(eq(customerDuesTable.customerId, id))
      .limit(1);
    if (linkedDue) {
      res.status(409).json({ error: "Cannot delete this customer — they have outstanding dues. Settle or remove those dues first." });
      return;
    }

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
