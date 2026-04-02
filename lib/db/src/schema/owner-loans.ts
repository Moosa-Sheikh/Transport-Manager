import { pgTable, serial, varchar, numeric, date, text, timestamp, index } from "drizzle-orm/pg-core";

export const ownerLoansTable = pgTable("owner_loans", {
  id: serial("id").primaryKey(),
  borrowedFrom: varchar("borrowed_from", { length: 100 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  amountReturned: numeric("amount_returned", { precision: 12, scale: 2 }).notNull().default("0"),
  loanDate: date("loan_date").notNull(),
  returnDate: date("return_date"),
  status: varchar("status", { length: 20 }).notNull().default("Outstanding"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_owner_loans_date").on(table.loanDate),
  index("idx_owner_loans_status").on(table.status),
]);
