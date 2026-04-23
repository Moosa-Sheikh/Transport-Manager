import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { requireAuth } from "./auth";

const router = Router();

router.post("/clear-all-data", requireAuth, async (req, res) => {
  await db.execute(sql`
    TRUNCATE TABLE
      due_repayments,
      customer_dues,
      customer_payments,
      customer_loans,
      driver_advances,
      driver_salaries,
      driver_loans,
      trip_expenses,
      trip_loads,
      cash_book,
      other_loans,
      owner_loans,
      trips,
      trucks,
      customers,
      drivers
    RESTART IDENTITY CASCADE
  `);
  res.json({ success: true, message: "All data cleared." });
});

export default router;
