import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { cashBookTable } from "@workspace/db/schema";
import { and, gte, lte, eq, asc, lt, sql, type SQL } from "drizzle-orm";

const router: IRouter = Router();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

router.get("/", async (req: Request, res: Response) => {
  try {
    const { date_from, date_to, entry_type } = req.query;

    if (date_from && (typeof date_from !== "string" || !dateRegex.test(date_from))) {
      res.status(400).json({ error: "date_from must be YYYY-MM-DD" });
      return;
    }
    if (date_to && (typeof date_to !== "string" || !dateRegex.test(date_to))) {
      res.status(400).json({ error: "date_to must be YYYY-MM-DD" });
      return;
    }
    if (entry_type && entry_type !== "IN" && entry_type !== "OUT") {
      res.status(400).json({ error: "entry_type must be IN or OUT" });
      return;
    }

    let openingBalance = 0;
    if (date_from && typeof date_from === "string") {
      const [result] = await db
        .select({
          totalIn: sql<string>`COALESCE(SUM(CASE WHEN ${cashBookTable.entryType} = 'IN' THEN ${cashBookTable.amount}::numeric ELSE 0 END), 0)`,
          totalOut: sql<string>`COALESCE(SUM(CASE WHEN ${cashBookTable.entryType} = 'OUT' THEN ${cashBookTable.amount}::numeric ELSE 0 END), 0)`,
        })
        .from(cashBookTable)
        .where(lt(cashBookTable.entryDate, date_from));

      openingBalance = Number(result.totalIn) - Number(result.totalOut);
    }

    const conditions: SQL[] = [];
    if (date_from && typeof date_from === "string") {
      conditions.push(gte(cashBookTable.entryDate, date_from));
    }
    if (date_to && typeof date_to === "string") {
      conditions.push(lte(cashBookTable.entryDate, date_to));
    }
    if (entry_type && (entry_type === "IN" || entry_type === "OUT")) {
      conditions.push(eq(cashBookTable.entryType, entry_type));
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
