import { pgTable, serial, integer, varchar, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tripsTable } from "./trips";
import { customersTable } from "./customers";

export const tripLoadsTable = pgTable("trip_loads", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => tripsTable.id, { onDelete: "cascade" }),
  biltyNumber: varchar("bilty_number", { length: 100 }).notNull(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "restrict" }),
  itemDescription: varchar("item_description", { length: 150 }),
  weight: numeric("weight", { precision: 12, scale: 2 }),
  freight: numeric("freight", { precision: 12, scale: 2 }).default("0"),
  loadingCharges: numeric("loading_charges", { precision: 12, scale: 2 }).default("0"),
  unloadingCharges: numeric("unloading_charges", { precision: 12, scale: 2 }).default("0"),
  brokerCommission: numeric("broker_commission", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTripLoadSchema = createInsertSchema(tripLoadsTable).omit({ id: true, createdAt: true });
export type InsertTripLoad = z.infer<typeof insertTripLoadSchema>;
export type TripLoad = typeof tripLoadsTable.$inferSelect;
