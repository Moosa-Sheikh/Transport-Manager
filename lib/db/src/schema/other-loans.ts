import { pgTable, serial, varchar, numeric, date, text, timestamp, index } from "drizzle-orm/pg-core";

export const otherLoansTable = pgTable("other_loans", {
  id: serial("id").primaryKey(),
  personName: varchar("person_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  amountReturned: numeric("amount_returned", { precision: 12, scale: 2 }).notNull().default("0"),
  loanDate: date("loan_date").notNull(),
  returnDate: date("return_date"),
  status: varchar("status", { length: 20 }).notNull().default("Outstanding"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_other_loans_date").on(table.loanDate),
  index("idx_other_loans_status").on(table.status),
]);
