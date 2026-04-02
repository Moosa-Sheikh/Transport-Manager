import { pgTable, serial, integer, varchar, numeric, date, text, timestamp, index } from "drizzle-orm/pg-core";

export const dueRepaymentsTable = pgTable("due_repayments", {
  id: serial("id").primaryKey(),
  dueId: integer("due_id").notNull(),
  dueType: varchar("due_type", { length: 20 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_due_repayments_due").on(table.dueId, table.dueType),
  index("idx_due_repayments_date").on(table.paymentDate),
]);
