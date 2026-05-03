import { pgTable, serial, varchar, timestamp, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { citiesTable } from "./cities";

export const warehousesTable = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  cityId: integer("city_id").notNull().references(() => citiesTable.id, { onDelete: "restrict" }),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWarehouseSchema = createInsertSchema(warehousesTable).omit({ id: true, createdAt: true });
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type Warehouse = typeof warehousesTable.$inferSelect;
