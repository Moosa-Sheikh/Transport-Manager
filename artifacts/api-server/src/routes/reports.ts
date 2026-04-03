import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  tripsTable, tripLoadsTable, tripExpensesTable,
  driverAdvancesTable, driverSalariesTable, cashBookTable,
  customerPaymentsTable, driversTable, trucksTable, citiesTable,
  customersTable, driverLoansTable, customerDuesTable,
} from "@workspace/db/schema";
import { sql, eq, and, gte, lte, type SQL } from "drizzle-orm";

const router: IRouter = Router();
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function validateDateParam(val: unknown): string | null {
  if (!val || typeof val !== "string") return null;
  if (!dateRegex.test(val)) return null;
  return val;
}

async function buildTripReportData(filters: {
  date_from?: string | null;
  date_to?: string | null;
  driver_id?: number;
  truck_id?: number;
  status?: string;
}) {
  const conditions: SQL[] = [];
  if (filters.date_from) conditions.push(gte(tripsTable.tripDate, filters.date_from));
  if (filters.date_to) conditions.push(lte(tripsTable.tripDate, filters.date_to));
  if (filters.driver_id) conditions.push(eq(tripsTable.driverId, filters.driver_id));
  if (filters.truck_id) conditions.push(eq(tripsTable.truckId, filters.truck_id));
  if (filters.status) conditions.push(eq(tripsTable.status, filters.status));

  const fromCity = db.$with("from_city").as(
    db.select({ id: citiesTable.id, name: citiesTable.name }).from(citiesTable)
  );
  const toCity = db.$with("to_city").as(
    db.select({ id: citiesTable.id, name: citiesTable.name }).from(citiesTable)
  );

  const rows = await db.execute(sql`
    SELECT
      t.id AS "tripId",
      t.trip_date AS "tripDate",
      d.name AS "driverName",
      tr.truck_number AS "truckNumber",
      fc.name AS "fromCity",
      tc.name AS "toCity",
      t.status,
      COALESCE(t.driver_commission, 0)::double precision AS "driverCommission",
      COALESCE((
        SELECT SUM(COALESCE(freight, 0) + COALESCE(loading_charges, 0) + COALESCE(unloading_charges, 0) - COALESCE(broker_commission, 0))
        FROM trip_loads WHERE trip_id = t.id
      ), 0)::double precision AS "totalIncome",
      COALESCE((
        SELECT SUM(COALESCE(amount, 0)::numeric)
        FROM trip_expenses WHERE trip_id = t.id
      ), 0)::double precision AS "totalExpenses",
      COALESCE((
        SELECT SUM(COALESCE(amount, 0)::numeric)
        FROM driver_advances WHERE trip_id = t.id
      ), 0)::double precision AS "totalAdvances",
      COALESCE((
        SELECT SUM(COALESCE(amount, 0)::numeric)
        FROM customer_payments WHERE trip_id = t.id
      ), 0)::double precision AS "totalReceived"
    FROM trips t
    JOIN drivers d ON d.id = t.driver_id
    JOIN trucks tr ON tr.id = t.truck_id
    JOIN cities fc ON fc.id = t.from_city_id
    JOIN cities tc ON tc.id = t.to_city_id
    ${conditions.length ? sql`WHERE ${and(...conditions)}` : sql``}
    ORDER BY t.trip_date DESC, t.id DESC
  `);

  return (rows.rows as Record<string, unknown>[]).map((r) => {
    const totalIncome = Number(r.totalIncome);
    const totalExpenses = Number(r.totalExpenses);
    const totalAdvances = Number(r.totalAdvances);
    const totalReceived = Number(r.totalReceived);
    const driverCommission = Number(r.driverCommission);
    const expectedProfit = totalIncome - totalExpenses;
    const actualProfit = totalIncome - totalExpenses - totalAdvances;
    const outstanding = totalIncome - totalReceived;
    return {
      tripId: Number(r.tripId),
      tripDate: String(r.tripDate),
      driverName: String(r.driverName),
      truckNumber: String(r.truckNumber),
      fromCity: String(r.fromCity),
      toCity: String(r.toCity),
      status: String(r.status),
      driverCommission,
      totalIncome,
      totalExpenses,
      totalAdvances,
      expectedProfit,
      actualProfit,
      totalReceived,
      outstanding,
    };
  });
}

async function buildDriverReportData(dateFrom?: string | null, dateTo?: string | null) {
  const dateCondition = [];
  if (dateFrom) dateCondition.push(sql`t.trip_date >= ${dateFrom}`);
  if (dateTo) dateCondition.push(sql`t.trip_date <= ${dateTo}`);
  const dateWhere = dateCondition.length ? sql`AND ${sql.join(dateCondition, sql` AND `)}` : sql``;

  const salaryDateCondition = [];
  if (dateFrom) salaryDateCondition.push(sql`ds.payment_date >= ${dateFrom}`);
  if (dateTo) salaryDateCondition.push(sql`ds.payment_date <= ${dateTo}`);
  const salaryWhere = salaryDateCondition.length ? sql`WHERE ${sql.join(salaryDateCondition, sql` AND `)}` : sql``;

  const loanDateCondition = [];
  if (dateFrom) loanDateCondition.push(sql`dl.loan_date >= ${dateFrom}`);
  if (dateTo) loanDateCondition.push(sql`dl.loan_date <= ${dateTo}`);
  const loanWhere = loanDateCondition.length ? sql`AND ${sql.join(loanDateCondition, sql` AND `)}` : sql``;

  const rows = await db.execute(sql`
    SELECT
      d.id AS "driverId",
      d.name AS "driverName",
      COALESCE((
        SELECT COUNT(*)::integer FROM trips t WHERE t.driver_id = d.id ${dateWhere}
      ), 0) AS "totalTrips",
      COALESCE((
        SELECT SUM(COALESCE(l.freight, 0) + COALESCE(l.loading_charges, 0) + COALESCE(l.unloading_charges, 0) - COALESCE(l.broker_commission, 0))
        FROM trip_loads l JOIN trips t ON t.id = l.trip_id WHERE t.driver_id = d.id ${dateWhere}
      ), 0)::double precision AS "totalIncome",
      COALESCE((
        SELECT SUM(COALESCE(e.amount, 0)::numeric)
        FROM trip_expenses e JOIN trips t ON t.id = e.trip_id WHERE t.driver_id = d.id ${dateWhere}
      ), 0)::double precision AS "totalExpenses",
      COALESCE((
        SELECT SUM(COALESCE(da.amount, 0)::numeric)
        FROM driver_advances da JOIN trips t ON t.id = da.trip_id WHERE t.driver_id = d.id ${dateWhere}
      ), 0)::double precision AS "totalAdvances",
      COALESCE((
        SELECT SUM(COALESCE(ds.amount, 0)::numeric)
        FROM driver_salaries ds WHERE ds.driver_id = d.id ${salaryWhere}
      ), 0)::double precision AS "totalSalary",
      COALESCE((
        SELECT SUM(COALESCE(dl.amount, 0)::numeric)
        FROM driver_loans dl WHERE dl.driver_id = d.id ${loanWhere}
      ), 0)::double precision AS "totalLoans",
      COALESCE((
        SELECT SUM(COALESCE(dl.amount_returned, 0)::numeric)
        FROM driver_loans dl WHERE dl.driver_id = d.id ${loanWhere}
      ), 0)::double precision AS "totalLoanReturned"
    FROM drivers d
    ORDER BY d.name
  `);

  return (rows.rows as Record<string, unknown>[]).map((r) => {
    const totalIncome = Number(r.totalIncome);
    const totalExpenses = Number(r.totalExpenses);
    const totalAdvances = Number(r.totalAdvances);
    const totalSalary = Number(r.totalSalary);
    const totalLoans = Number(r.totalLoans);
    const totalLoanReturned = Number(r.totalLoanReturned);
    return {
      driverId: Number(r.driverId),
      driverName: String(r.driverName),
      totalTrips: Number(r.totalTrips),
      totalIncome,
      totalExpenses,
      totalAdvances,
      totalSalary,
      netPaid: totalAdvances + totalSalary,
      profitGenerated: totalIncome - totalExpenses,
      totalLoans,
      totalLoanReturned,
      outstandingLoanBalance: totalLoans - totalLoanReturned,
    };
  });
}

async function buildCustomerReportData(dateFrom?: string | null, dateTo?: string | null, customerId?: number) {
  const dateCondition = [];
  if (dateFrom) dateCondition.push(sql`t.trip_date >= ${dateFrom}`);
  if (dateTo) dateCondition.push(sql`t.trip_date <= ${dateTo}`);
  const dateWhere = dateCondition.length ? sql`AND ${sql.join(dateCondition, sql` AND `)}` : sql``;

  const dueDateCondition = [];
  if (dateFrom) dueDateCondition.push(sql`cd.due_date >= ${dateFrom}`);
  if (dateTo) dueDateCondition.push(sql`cd.due_date <= ${dateTo}`);
  const dueWhere = dueDateCondition.length ? sql`AND ${sql.join(dueDateCondition, sql` AND `)}` : sql``;

  const customerCondition = customerId ? sql`WHERE c.id = ${customerId}` : sql``;

  const rows = await db.execute(sql`
    SELECT
      c.id AS "customerId",
      c.name AS "customerName",
      c.company_name AS "companyName",
      COALESCE((
        SELECT COUNT(DISTINCT tl.trip_id)::integer
        FROM trip_loads tl JOIN trips t ON t.id = tl.trip_id
        WHERE tl.customer_id = c.id ${dateWhere}
      ), 0) AS "totalTrips",
      COALESCE((
        SELECT SUM(COALESCE(tl.freight, 0))
        FROM trip_loads tl JOIN trips t ON t.id = tl.trip_id
        WHERE tl.customer_id = c.id ${dateWhere}
      ), 0)::double precision AS "totalFreight",
      COALESCE((
        SELECT SUM(COALESCE(cp.amount, 0)::numeric)
        FROM customer_payments cp JOIN trips t ON t.id = cp.trip_id
        WHERE cp.customer_id = c.id ${dateWhere}
      ), 0)::double precision AS "totalReceived",
      COALESCE((
        SELECT SUM(COALESCE(cd.due_amount, 0)::numeric)
        FROM customer_dues cd
        WHERE cd.customer_id = c.id ${dueWhere}
      ), 0)::double precision AS "totalDues",
      COALESCE((
        SELECT SUM(COALESCE(cd.due_amount, 0)::numeric - COALESCE(cd.paid_amount, 0)::numeric)
        FROM customer_dues cd
        WHERE cd.customer_id = c.id AND cd.status != 'Cleared' ${dueWhere}
      ), 0)::double precision AS "outstandingBalance"
    FROM customers c
    ${customerCondition}
    ORDER BY c.name
  `);

  return (rows.rows as Record<string, unknown>[]).map((r) => ({
    customerId: Number(r.customerId),
    customerName: String(r.customerName),
    companyName: r.companyName ? String(r.companyName) : null,
    totalTrips: Number(r.totalTrips),
    totalFreight: Number(r.totalFreight),
    totalReceived: Number(r.totalReceived),
    totalDues: Number(r.totalDues),
    outstandingBalance: Number(r.outstandingBalance),
  }));
}

async function buildTruckReportData(dateFrom?: string | null, dateTo?: string | null) {
  const dateCondition = [];
  if (dateFrom) dateCondition.push(sql`t.trip_date >= ${dateFrom}`);
  if (dateTo) dateCondition.push(sql`t.trip_date <= ${dateTo}`);
  const dateWhere = dateCondition.length ? sql`AND ${sql.join(dateCondition, sql` AND `)}` : sql``;

  const rows = await db.execute(sql`
    SELECT
      tr.id AS "truckId",
      tr.truck_number AS "truckNumber",
      COALESCE((
        SELECT COUNT(*)::integer FROM trips t WHERE t.truck_id = tr.id ${dateWhere}
      ), 0) AS "totalTrips",
      COALESCE((
        SELECT SUM(COALESCE(l.freight, 0) + COALESCE(l.loading_charges, 0) + COALESCE(l.unloading_charges, 0) - COALESCE(l.broker_commission, 0))
        FROM trip_loads l JOIN trips t ON t.id = l.trip_id WHERE t.truck_id = tr.id ${dateWhere}
      ), 0)::double precision AS "totalIncome",
      COALESCE((
        SELECT SUM(COALESCE(e.amount, 0)::numeric)
        FROM trip_expenses e JOIN trips t ON t.id = e.trip_id WHERE t.truck_id = tr.id ${dateWhere}
      ), 0)::double precision AS "totalExpenses"
    FROM trucks tr
    ORDER BY tr.truck_number
  `);

  return (rows.rows as Record<string, unknown>[]).map((r) => ({
    truckId: Number(r.truckId),
    truckNumber: String(r.truckNumber),
    totalTrips: Number(r.totalTrips),
    totalIncome: Number(r.totalIncome),
    totalExpenses: Number(r.totalExpenses),
    profit: Number(r.totalIncome) - Number(r.totalExpenses),
  }));
}

async function buildCashFlowData(dateFrom?: string | null, dateTo?: string | null) {
  const conditions: SQL[] = [];
  if (dateFrom) conditions.push(sql`entry_date >= ${dateFrom}`);
  if (dateTo) conditions.push(sql`entry_date <= ${dateTo}`);
  const where = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  let openingBalance = 0;
  if (dateFrom) {
    const [result] = (await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN entry_type = 'IN' THEN amount::numeric ELSE 0 END), 0)::double precision AS "totalIn",
        COALESCE(SUM(CASE WHEN entry_type = 'OUT' THEN amount::numeric ELSE 0 END), 0)::double precision AS "totalOut"
      FROM cash_book WHERE entry_date < ${dateFrom}
    `)).rows as { totalIn: number; totalOut: number }[];
    openingBalance = Number(result.totalIn) - Number(result.totalOut);
  }

  const rows = await db.execute(sql`
    SELECT
      entry_date AS "date",
      COALESCE(SUM(CASE WHEN entry_type = 'IN' THEN amount::numeric ELSE 0 END), 0)::double precision AS "totalIn",
      COALESCE(SUM(CASE WHEN entry_type = 'OUT' THEN amount::numeric ELSE 0 END), 0)::double precision AS "totalOut"
    FROM cash_book
    ${where}
    GROUP BY entry_date
    ORDER BY entry_date
  `);

  let runningBalance = openingBalance;
  return (rows.rows as Record<string, unknown>[]).map((r) => {
    const totalIn = Number(r.totalIn);
    const totalOut = Number(r.totalOut);
    const net = totalIn - totalOut;
    runningBalance += net;
    return {
      date: String(r.date),
      totalIn,
      totalOut,
      net,
      runningBalance,
    };
  });
}

async function buildProfitData(dateFrom?: string | null, dateTo?: string | null) {
  const dateCondition = [];
  if (dateFrom) dateCondition.push(sql`t.trip_date >= ${dateFrom}`);
  if (dateTo) dateCondition.push(sql`t.trip_date <= ${dateTo}`);
  const dateWhere = dateCondition.length ? sql`WHERE ${sql.join(dateCondition, sql` AND `)}` : sql``;

  const salaryDateCondition = [];
  if (dateFrom) salaryDateCondition.push(sql`payment_date >= ${dateFrom}`);
  if (dateTo) salaryDateCondition.push(sql`payment_date <= ${dateTo}`);
  const salaryWhere = salaryDateCondition.length ? sql`WHERE ${sql.join(salaryDateCondition, sql` AND `)}` : sql``;

  const [result] = (await db.execute(sql`
    SELECT
      COALESCE((
        SELECT SUM(COALESCE(l.freight, 0) + COALESCE(l.loading_charges, 0) + COALESCE(l.unloading_charges, 0) - COALESCE(l.broker_commission, 0))
        FROM trip_loads l JOIN trips t ON t.id = l.trip_id ${dateWhere}
      ), 0)::double precision AS "totalIncome",
      COALESCE((
        SELECT SUM(COALESCE(e.amount, 0)::numeric)
        FROM trip_expenses e JOIN trips t ON t.id = e.trip_id ${dateWhere}
      ), 0)::double precision AS "totalExpenses",
      COALESCE((
        SELECT SUM(COALESCE(da.amount, 0)::numeric)
        FROM driver_advances da JOIN trips t ON t.id = da.trip_id ${dateWhere}
      ), 0)::double precision AS "totalAdvances",
      COALESCE((
        SELECT SUM(COALESCE(ds.amount, 0)::numeric)
        FROM driver_salaries ds ${salaryWhere}
      ), 0)::double precision AS "totalSalary",
      COALESCE((
        SELECT SUM(COALESCE(cp.amount, 0)::numeric)
        FROM customer_payments cp JOIN trips t ON t.id = cp.trip_id ${dateWhere}
      ), 0)::double precision AS "totalReceived"
  `)).rows as Record<string, unknown>[];

  const totalIncome = Number(result.totalIncome);
  const totalExpenses = Number(result.totalExpenses);
  const totalAdvances = Number(result.totalAdvances);
  const totalSalary = Number(result.totalSalary);
  const totalReceived = Number(result.totalReceived);

  return {
    totalIncome,
    totalExpenses,
    totalAdvances,
    totalSalary,
    expectedProfit: totalIncome - totalExpenses,
    actualProfit: totalIncome - totalExpenses - totalAdvances,
    totalReceived,
    outstanding: totalIncome - totalReceived,
  };
}

router.get("/customers", async (req: Request, res: Response) => {
  try {
    const dateFrom = validateDateParam(req.query.date_from);
    const dateTo = validateDateParam(req.query.date_to);
    const custId = req.query.customer_id ? Number(req.query.customer_id) : undefined;
    const data = await buildCustomerReportData(dateFrom, dateTo, Number.isInteger(custId) && custId! > 0 ? custId : undefined);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Customer report error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/trips", async (req: Request, res: Response) => {
  try {
    const dateFrom = validateDateParam(req.query.date_from);
    const dateTo = validateDateParam(req.query.date_to);
    const rawDriverId = req.query.driver_id ? Number(req.query.driver_id) : undefined;
    const rawTruckId = req.query.truck_id ? Number(req.query.truck_id) : undefined;
    if (rawDriverId !== undefined && (!Number.isInteger(rawDriverId) || rawDriverId <= 0)) {
      res.status(400).json({ error: "Invalid driver_id" });
      return;
    }
    if (rawTruckId !== undefined && (!Number.isInteger(rawTruckId) || rawTruckId <= 0)) {
      res.status(400).json({ error: "Invalid truck_id" });
      return;
    }
    const driverId = rawDriverId;
    const truckId = rawTruckId;
    const status = req.query.status === "Open" || req.query.status === "Closed" ? String(req.query.status) : undefined;

    const data = await buildTripReportData({ date_from: dateFrom, date_to: dateTo, driver_id: driverId, truck_id: truckId, status });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Trip report error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/drivers", async (req: Request, res: Response) => {
  try {
    const dateFrom = validateDateParam(req.query.date_from);
    const dateTo = validateDateParam(req.query.date_to);
    const data = await buildDriverReportData(dateFrom, dateTo);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Driver report error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/trucks", async (req: Request, res: Response) => {
  try {
    const dateFrom = validateDateParam(req.query.date_from);
    const dateTo = validateDateParam(req.query.date_to);
    const data = await buildTruckReportData(dateFrom, dateTo);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Truck report error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/cashflow", async (req: Request, res: Response) => {
  try {
    const dateFrom = validateDateParam(req.query.date_from);
    const dateTo = validateDateParam(req.query.date_to);
    const data = await buildCashFlowData(dateFrom, dateTo);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Cash flow report error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/profit", async (req: Request, res: Response) => {
  try {
    const dateFrom = validateDateParam(req.query.date_from);
    const dateTo = validateDateParam(req.query.date_to);
    const data = await buildProfitData(dateFrom, dateTo);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Profit report error");
    res.status(500).json({ error: "Internal server error" });
  }
});

function sanitizeCsvCell(val: string): string {
  let s = val;
  if (/^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsvRow(values: (string | number)[]): string {
  return values.map((v) => sanitizeCsvCell(String(v))).join(",");
}

router.get("/export/csv", async (req: Request, res: Response) => {
  try {
    const reportType = String(req.query.type || "");
    const dateFrom = validateDateParam(req.query.date_from);
    const dateTo = validateDateParam(req.query.date_to);

    let csvContent = "";
    let filename = "report.csv";

    switch (reportType) {
      case "trips": {
        const driverId = req.query.driver_id ? Number(req.query.driver_id) : undefined;
        const truckId = req.query.truck_id ? Number(req.query.truck_id) : undefined;
        const status = req.query.status === "Open" || req.query.status === "Closed" ? String(req.query.status) : undefined;
        const data = await buildTripReportData({ date_from: dateFrom, date_to: dateTo, driver_id: driverId, truck_id: truckId, status });
        const header = ["Trip ID", "Date", "Driver", "Truck", "From", "To", "Status", "Commission", "Income", "Expenses", "Advances", "Expected Profit", "Actual Profit", "Received", "Outstanding"];
        csvContent = toCsvRow(header) + "\n" + data.map((r) =>
          toCsvRow([r.tripId, r.tripDate, r.driverName, r.truckNumber, r.fromCity, r.toCity, r.status, r.driverCommission, r.totalIncome, r.totalExpenses, r.totalAdvances, r.expectedProfit, r.actualProfit, r.totalReceived, r.outstanding])
        ).join("\n");
        filename = "trip-report.csv";
        break;
      }
      case "drivers": {
        const data = await buildDriverReportData(dateFrom, dateTo);
        const header = ["Driver ID", "Driver", "Total Trips", "Income", "Expenses", "Advances", "Salary", "Net Paid", "Profit Generated", "Total Loans", "Loan Returned", "Loan Balance"];
        csvContent = toCsvRow(header) + "\n" + data.map((r) =>
          toCsvRow([r.driverId, r.driverName, r.totalTrips, r.totalIncome, r.totalExpenses, r.totalAdvances, r.totalSalary, r.netPaid, r.profitGenerated, r.totalLoans, r.totalLoanReturned, r.outstandingLoanBalance])
        ).join("\n");
        filename = "driver-report.csv";
        break;
      }
      case "trucks": {
        const data = await buildTruckReportData(dateFrom, dateTo);
        const header = ["Truck ID", "Truck Number", "Total Trips", "Income", "Expenses", "Profit"];
        csvContent = toCsvRow(header) + "\n" + data.map((r) =>
          toCsvRow([r.truckId, r.truckNumber, r.totalTrips, r.totalIncome, r.totalExpenses, r.profit])
        ).join("\n");
        filename = "truck-report.csv";
        break;
      }
      case "cashflow": {
        const data = await buildCashFlowData(dateFrom, dateTo);
        const header = ["Date", "Cash IN", "Cash OUT", "Net", "Running Balance"];
        csvContent = toCsvRow(header) + "\n" + data.map((r) =>
          toCsvRow([r.date, r.totalIn, r.totalOut, r.net, r.runningBalance])
        ).join("\n");
        filename = "cashflow-report.csv";
        break;
      }
      case "profit": {
        const data = await buildProfitData(dateFrom, dateTo);
        const header = ["Metric", "Amount"];
        csvContent = [
          toCsvRow(header),
          toCsvRow(["Total Income", data.totalIncome]),
          toCsvRow(["Total Expenses", data.totalExpenses]),
          toCsvRow(["Total Advances", data.totalAdvances]),
          toCsvRow(["Total Salary", data.totalSalary]),
          toCsvRow(["Expected Profit", data.expectedProfit]),
          toCsvRow(["Actual Profit", data.actualProfit]),
          toCsvRow(["Total Received", data.totalReceived]),
          toCsvRow(["Outstanding", data.outstanding]),
        ].join("\n");
        filename = "profit-report.csv";
        break;
      }
      case "customers": {
        const custIdCsv = req.query.customer_id ? Number(req.query.customer_id) : undefined;
        const data = await buildCustomerReportData(dateFrom, dateTo, Number.isInteger(custIdCsv) && custIdCsv! > 0 ? custIdCsv : undefined);
        const header = ["Customer ID", "Customer", "Company", "Total Trips", "Total Freight", "Total Received", "Total Dues", "Outstanding Balance"];
        csvContent = toCsvRow(header) + "\n" + data.map((r) =>
          toCsvRow([r.customerId, r.customerName, r.companyName ?? "", r.totalTrips, r.totalFreight, r.totalReceived, r.totalDues, r.outstandingBalance])
        ).join("\n");
        filename = "customer-report.csv";
        break;
      }
      default:
        res.status(400).json({ error: "Invalid report type. Must be: trips, drivers, trucks, cashflow, profit, customers" });
        return;
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.send(csvContent);
  } catch (err) {
    req.log.error({ err }, "CSV export error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
