import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  tripsTable, tripLoadsTable, tripExpensesTable,
  driverAdvancesTable, driverSalariesTable, cashBookTable,
  customerDuesTable, driverLoansTable, otherLoansTable, ownerLoansTable,
} from "@workspace/db/schema";
import { sql, eq, ne } from "drizzle-orm";

const router: IRouter = Router();

router.get("/summary", async (req: Request, res: Response) => {
  try {
    const [incomeResult] = (await db.execute(sql`
      SELECT COALESCE((
        SELECT SUM(COALESCE(freight, 0) + COALESCE(loading_charges, 0) + COALESCE(unloading_charges, 0) - COALESCE(broker_commission, 0))
        FROM trip_loads
      ), 0)::double precision AS "total"
    `)).rows as { total: number }[];

    const [expenseResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(COALESCE(amount, 0)), 0)::double precision`,
      })
      .from(tripExpensesTable);

    const [advanceResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(COALESCE(amount, 0)), 0)::double precision`,
      })
      .from(driverAdvancesTable);

    const [salaryResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(COALESCE(amount, 0)), 0)::double precision`,
      })
      .from(driverSalariesTable);

    const [cashInResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(COALESCE(amount, 0)), 0)::double precision`,
      })
      .from(cashBookTable)
      .where(eq(cashBookTable.entryType, "IN"));

    const [cashOutResult] = await db
      .select({
        total: sql<number>`COALESCE(SUM(COALESCE(amount, 0)), 0)::double precision`,
      })
      .from(cashBookTable)
      .where(eq(cashBookTable.entryType, "OUT"));

    const [tripCounts] = await db
      .select({
        total: sql<number>`COUNT(*)::integer`,
        open: sql<number>`COUNT(*) FILTER (WHERE status = 'Open')::integer`,
        closed: sql<number>`COUNT(*) FILTER (WHERE status = 'Closed')::integer`,
      })
      .from(tripsTable);

    const totalCashIn = cashInResult.total;
    const totalCashOut = cashOutResult.total;

    const [custDues] = await db
      .select({
        total: sql<number>`COALESCE(SUM(due_amount::numeric - paid_amount::numeric), 0)::double precision`,
      })
      .from(customerDuesTable)
      .where(ne(customerDuesTable.status, "Cleared"));

    const [drvLoans] = await db
      .select({
        total: sql<number>`COALESCE(SUM(amount::numeric - amount_returned::numeric), 0)::double precision`,
      })
      .from(driverLoansTable)
      .where(ne(driverLoansTable.status, "Cleared"));

    const [othLoans] = await db
      .select({
        total: sql<number>`COALESCE(SUM(amount::numeric - amount_returned::numeric), 0)::double precision`,
      })
      .from(otherLoansTable)
      .where(ne(otherLoansTable.status, "Cleared"));

    const [ownLoans] = await db
      .select({
        total: sql<number>`COALESCE(SUM(amount::numeric - amount_returned::numeric), 0)::double precision`,
      })
      .from(ownerLoansTable)
      .where(ne(ownerLoansTable.status, "Cleared"));

    res.json({
      totalIncome: incomeResult.total,
      totalExpenses: expenseResult.total,
      totalAdvances: advanceResult.total,
      totalSalaryPaid: salaryResult.total,
      totalCashIn,
      totalCashOut,
      currentCashBalance: totalCashIn - totalCashOut,
      openTrips: tripCounts.open,
      closedTrips: tripCounts.closed,
      totalTrips: tripCounts.total,
      outstandingCustomerDues: custDues.total,
      outstandingDriverLoans: drvLoans.total,
      outstandingOtherLoans: othLoans.total,
      outstandingOwnerLoans: ownLoans.total,
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard summary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
