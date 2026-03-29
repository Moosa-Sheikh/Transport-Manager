import { pgTable, serial, integer, numeric, date, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { driversTable } from "./drivers";

export const driverSalariesTable = pgTable("driver_salaries", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driversTable.id, { onDelete: "cascade" }),
  month: varchar("month", { length: 20 }).notNull(),
  year: integer("year").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDriverSalarySchema = createInsertSchema(driverSalariesTable).omit({ id: true, createdAt: true });
export type InsertDriverSalary = z.infer<typeof insertDriverSalarySchema>;
export type DriverSalary = typeof driverSalariesTable.$inferSelect;
