import { pgTable, serial, varchar, integer, numeric, date, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cashBookTable = pgTable("cash_book", {
  id: serial("id").primaryKey(),
  entryType: varchar("entry_type", { length: 20 }).notNull(),
  referenceTable: varchar("reference_table", { length: 50 }),
  referenceId: integer("reference_id"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  entryDate: date("entry_date").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCashBookSchema = createInsertSchema(cashBookTable).omit({ id: true, createdAt: true });
export type InsertCashBook = z.infer<typeof insertCashBookSchema>;
export type CashBookEntry = typeof cashBookTable.$inferSelect;
