import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { driverSalariesTable, driversTable, cashBookTable } from "@workspace/db/schema";
import { eq, and, type SQL } from "drizzle-orm";

const router: IRouter = Router();

router.get("/driver-salaries", async (req: Request, res: Response) => {
  try {
    const { driver_id, month, year } = req.query;

    const validMonths = new Set(["January","February","March","April","May","June","July","August","September","October","November","December"]);

    const conditions: SQL[] = [];

    if (driver_id) {
      const dId = Number(driver_id);
      if (!Number.isInteger(dId) || dId <= 0) {
        res.status(400).json({ error: "Invalid driver_id filter" });
        return;
      }
      conditions.push(eq(driverSalariesTable.driverId, dId));
    }
    if (month && typeof month === "string") {
      if (!validMonths.has(month)) {
        res.status(400).json({ error: "Invalid month filter" });
        return;
      }
      conditions.push(eq(driverSalariesTable.month, month));
    }
    if (year) {
      const y = Number(year);
      if (!Number.isInteger(y) || y < 2000 || y > 2100) {
        res.status(400).json({ error: "Invalid year filter" });
        return;
      }
      conditions.push(eq(driverSalariesTable.year, y));
    }

    const rows = await db
      .select({
        id: driverSalariesTable.id,
        driverId: driverSalariesTable.driverId,
        driverName: driversTable.name,
        month: driverSalariesTable.month,
        year: driverSalariesTable.year,
        amount: driverSalariesTable.amount,
        paymentDate: driverSalariesTable.paymentDate,
        notes: driverSalariesTable.notes,
        createdAt: driverSalariesTable.createdAt,
      })
      .from(driverSalariesTable)
      .innerJoin(driversTable, eq(driverSalariesTable.driverId, driversTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(driverSalariesTable.paymentDate);

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "List driver salaries error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/driver-salaries", async (req: Request, res: Response) => {
  try {
    const { driverId, month, year, amount, paymentDate, notes } = req.body;

    const numDriverId = Number(driverId);
    if (!Number.isInteger(numDriverId) || numDriverId <= 0) {
      res.status(400).json({ error: "Valid driver is required" });
      return;
    }

    if (!month || typeof month !== "string") {
      res.status(400).json({ error: "Month is required" });
      return;
    }

    const numYear = Number(year);
    if (!Number.isInteger(numYear) || numYear < 2000) {
      res.status(400).json({ error: "Valid year is required" });
      return;
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      res.status(400).json({ error: "Amount must be greater than 0" });
      return;
    }

    if (!paymentDate || typeof paymentDate !== "string") {
      res.status(400).json({ error: "Payment date is required" });
      return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(paymentDate) || isNaN(Date.parse(paymentDate))) {
      res.status(400).json({ error: "Payment date must be valid (YYYY-MM-DD)" });
      return;
    }

    const [driver] = await db.select({ id: driversTable.id, name: driversTable.name })
      .from(driversTable).where(eq(driversTable.id, numDriverId)).limit(1);
    if (!driver) {
      res.status(400).json({ error: "Driver not found" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [salary] = await tx
        .insert(driverSalariesTable)
        .values({
          driverId: numDriverId,
          month,
          year: numYear,
          amount: String(numAmount),
          paymentDate,
          notes: notes ? String(notes) : null,
        })
        .returning();

      await tx.insert(cashBookTable).values({
        entryType: "OUT",
        referenceTable: "driver_salaries",
        referenceId: salary.id,
        amount: String(numAmount),
        entryDate: paymentDate,
        description: `Salary payment to ${driver.name} (${month} ${numYear})`,
      });

      return { ...salary, driverName: driver.name };
    });

    res.status(201).json(result);
  } catch (err) {
    req.log.error({ err }, "Add driver salary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
