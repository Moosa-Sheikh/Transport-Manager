import { pgTable, serial, integer, numeric, date, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tripsTable } from "./trips";
import { expenseTypesTable } from "./expense-types";
import { customersTable } from "./customers";

export const tripExpensesTable = pgTable("trip_expenses", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => tripsTable.id, { onDelete: "cascade" }),
  expenseTypeId: integer("expense_type_id").notNull().references(() => expenseTypesTable.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  expenseDate: date("expense_date").notNull(),
  expenseCategory: text("expense_category").notNull().default("truck"),
  customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "restrict" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTripExpenseSchema = createInsertSchema(tripExpensesTable).omit({ id: true, createdAt: true });
export type InsertTripExpense = z.infer<typeof insertTripExpenseSchema>;
export type TripExpense = typeof tripExpensesTable.$inferSelect;
