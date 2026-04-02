import { pgTable, serial, integer, varchar, numeric, date, text, timestamp, index } from "drizzle-orm/pg-core";
import { tripsTable } from "./trips";
import { customersTable } from "./customers";

export const customerDuesTable = pgTable("customer_dues", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => tripsTable.id, { onDelete: "set null" }),
  loadId: integer("load_id"),
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "restrict" }),
  biltyNumber: varchar("bilty_number", { length: 100 }),
  dueAmount: numeric("due_amount", { precision: 12, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  dueDate: date("due_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("Pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_customer_dues_date").on(table.dueDate),
  index("idx_customer_dues_status").on(table.status),
  index("idx_customer_dues_customer").on(table.customerId),
]);
