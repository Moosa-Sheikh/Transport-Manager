import { pgTable, serial, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trucksTable = pgTable("trucks", {
  id: serial("id").primaryKey(),
  truckNumber: varchar("truck_number", { length: 50 }).unique().notNull(),
  ownerType: varchar("owner_type", { length: 20 }).notNull(),
  model: varchar("model", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTruckSchema = createInsertSchema(trucksTable).omit({ id: true, createdAt: true });
export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type Truck = typeof trucksTable.$inferSelect;
