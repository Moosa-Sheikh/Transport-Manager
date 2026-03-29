import { pgTable, serial, integer, numeric, date, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { driversTable } from "./drivers";
import { tripsTable } from "./trips";

export const driverAdvancesTable = pgTable("driver_advances", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driversTable.id, { onDelete: "cascade" }),
  tripId: integer("trip_id").references(() => tripsTable.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  advanceDate: date("advance_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDriverAdvanceSchema = createInsertSchema(driverAdvancesTable).omit({ id: true, createdAt: true });
export type InsertDriverAdvance = z.infer<typeof insertDriverAdvanceSchema>;
export type DriverAdvance = typeof driverAdvancesTable.$inferSelect;
