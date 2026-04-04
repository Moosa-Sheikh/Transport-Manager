import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { cashBookTable } from "@workspace/db/schema";
import { and, gte, lte, eq, asc, lt, sql, type SQL } from "drizzle-orm";

const router: IRouter = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const CATEGORY_MAP: Record<string, string> = {
  customer_payments: "customer_payments",
  customer_dues: "customer_dues",
  driver_advances: "driver_advances",
  driver_loans: "driver_loans",
  driver_salaries: "driver_salaries",
  owner_loans: "owner_loans",
  other_loans: "other_loans",
};

function buildEntityFilters(query: Record<string, unknown>): SQL[] {
  const conditions: SQL[] = [];
  const { entry_type, category, customer_id, driver_id, trip_id } = query;

  if (entry_type && (entry_type === "IN" || entry_type === "OUT")) {
    conditions.push(eq(cashBookTable.entryType, entry_type as string));
  }

  if (typeof category === "string" && CATEGORY_MAP[category]) {
    conditions.push(eq(cashBookTable.referenceTable, CATEGORY_MAP[category]));
  }

  if (typeof customer_id === "string" && customer_id) {
    const cid = Number(customer_id);
    if (Number.isFinite(cid) && cid > 0) {
      conditions.push(sql`(
        (${cashBookTable.referenceTable} = 'customer_payments' AND ${cashBookTable.referenceId} IN (SELECT id FROM customer_payments WHERE customer_id = ${cid}))
        OR
        (${cashBookTable.referenceTable} = 'customer_dues' AND ${cashBookTable.referenceId} IN (SELECT id FROM customer_dues WHERE customer_id = ${cid}))
      )`);
    }
  }

  if (typeof driver_id === "string" && driver_id) {
    const did = Number(driver_id);
    if (Number.isFinite(did) && did > 0) {
      conditions.push(sql`(
        (${cashBookTable.referenceTable} = 'driver_advances' AND ${cashBookTable.referenceId} IN (SELECT id FROM driver_advances WHERE driver_id = ${did}))
        OR
        (${cashBookTable.referenceTable} = 'driver_loans' AND ${cashBookTable.referenceId} IN (SELECT id FROM driver_loans WHERE driver_id = ${did}))
        OR
        (${cashBookTable.referenceTable} = 'driver_salaries' AND ${cashBookTable.referenceId} IN (SELECT id FROM driver_salaries WHERE driver_id = ${did}))
      )`);
    }
  }

  if (typeof trip_id === "string" && trip_id) {
    const tid = Number(trip_id);
    if (Number.isFinite(tid) && tid > 0) {
      conditions.push(sql`(
        (${cashBookTable.referenceTable} = 'customer_payments' AND ${cashBookTable.referenceId} IN (SELECT id FROM customer_payments WHERE trip_id = ${tid}))
        OR
        (${cashBookTable.referenceTable} = 'driver_advances' AND ${cashBookTable.referenceId} IN (SELECT id FROM driver_advances WHERE trip_id = ${tid}))
        OR
        (${cashBookTable.referenceTable} = 'customer_dues' AND ${cashBookTable.referenceId} IN (SELECT id FROM customer_dues WHERE trip_id = ${tid}))
      )`);
    }
  }

  return conditions;
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const { date_from, date_to } = req.query;

    if (date_from && (typeof date_from !== "string" || !dateRegex.test(date_from))) {
      res.status(400).json({ error: "date_from must be YYYY-MM-DD" });
      return;
    }
    if (date_to && (typeof date_to !== "string" || !dateRegex.test(date_to))) {
      res.status(400).json({ error: "date_to must be YYYY-MM-DD" });
      return;
    }
    if (req.query.entry_type && req.query.entry_type !== "IN" && req.query.entry_type !== "OUT") {
      res.status(400).json({ error: "entry_type must be IN or OUT" });
      return;
    }

    const entityFilters = buildEntityFilters(req.query as Record<string, unknown>);

    let openingBalance = 0;
    if (date_from && typeof date_from === "string") {
      const openingConditions: SQL[] = [lt(cashBookTable.entryDate, date_from), ...entityFilters];
      const [result] = await db
        .select({
          totalIn: sql<string>`COALESCE(SUM(CASE WHEN ${cashBookTable.entryType} = 'IN' THEN ${cashBookTable.amount}::numeric ELSE 0 END), 0)`,
          totalOut: sql<string>`COALESCE(SUM(CASE WHEN ${cashBookTable.entryType} = 'OUT' THEN ${cashBookTable.amount}::numeric ELSE 0 END), 0)`,
        })
        .from(cashBookTable)
        .where(and(...openingConditions));

      openingBalance = Number(result.totalIn) - Number(result.totalOut);
    }

    const conditions: SQL[] = [...entityFilters];
    if (date_from && typeof date_from === "string") {
      conditions.push(gte(cashBookTable.entryDate, date_from));
    }
    if (date_to && typeof date_to === "string") {
      conditions.push(lte(cashBookTable.entryDate, date_to));
    }

    const rows = await db
      .select()
      .from(cashBookTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(cashBookTable.entryDate), asc(cashBookTable.id));

    let runningBalance = openingBalance;
    let totalIn = 0;
    let totalOut = 0;

    const entries = rows.map((row) => {
      const amt = Number(row.amount);
      if (row.entryType === "IN") {
        runningBalance += amt;
        totalIn += amt;
      } else {
        runningBalance -= amt;
        totalOut += amt;
      }
      return {
        ...row,
        runningBalance,
      };
    });

    res.json({
      entries,
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
    });
  } catch (err) {
    req.log.error({ err }, "List cash book error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
