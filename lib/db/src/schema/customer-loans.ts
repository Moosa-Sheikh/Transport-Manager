import { pgTable, serial, integer, numeric, date, text, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

export const customerLoansTable = pgTable("customer_loans", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  amountReturned: numeric("amount_returned", { precision: 12, scale: 2 }).notNull().default("0"),
  loanDate: date("loan_date").notNull(),
  returnDate: date("return_date"),
  status: varchar("status", { length: 20 }).notNull().default("Outstanding"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_customer_loans_date").on(table.loanDate),
  index("idx_customer_loans_status").on(table.status),
  index("idx_customer_loans_customer").on(table.customerId),
]);
