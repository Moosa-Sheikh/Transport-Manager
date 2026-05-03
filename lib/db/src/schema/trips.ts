import { pgTable, serial, date, integer, varchar, timestamp, numeric, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { trucksTable } from "./trucks";
import { driversTable } from "./drivers";
import { citiesTable } from "./cities";
import { customersTable } from "./customers";
import { itemsTable } from "./items";
import { warehousesTable } from "./warehouses";

export const tripsTable = pgTable("trips", {
  id: serial("id").primaryKey(),
  tripDate: date("trip_date").notNull(),
  truckId: integer("truck_id").notNull().references(() => trucksTable.id, { onDelete: "restrict" }),
  driverId: integer("driver_id").notNull().references(() => driversTable.id, { onDelete: "restrict" }),
  fromCityId: integer("from_city_id").references(() => citiesTable.id, { onDelete: "restrict" }),
  toCityId: integer("to_city_id").references(() => citiesTable.id, { onDelete: "restrict" }),
  fromWarehouseId: integer("from_warehouse_id").references(() => warehousesTable.id, { onDelete: "restrict" }),
  toWarehouseId: integer("to_warehouse_id").references(() => warehousesTable.id, { onDelete: "restrict" }),
  driverCommission: numeric("driver_commission", { precision: 12, scale: 2 }).default("0"),
  status: varchar("status", { length: 20 }).notNull().default("Open"),
  movementType: varchar("movement_type", { length: 30 }).notNull().default("customer_trip"),
  notes: text("notes"),
  customerId: integer("customer_id").references(() => customersTable.id, { onDelete: "restrict" }),
  itemId: integer("item_id").references(() => itemsTable.id, { onDelete: "restrict" }),
  rounds: integer("rounds").default(1),
  ratePerRound: numeric("rate_per_round", { precision: 12, scale: 2 }).default("0"),
  commissionPerRound: numeric("commission_per_round", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTripSchema = createInsertSchema(tripsTable).omit({ id: true, status: true, createdAt: true });
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof tripsTable.$inferSelect;
