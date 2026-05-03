import { pgTable, serial, integer, numeric, text, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tripsTable } from "./trips";
import { itemsTable } from "./items";

export const tripRoundEntriesTable = pgTable("trip_round_entries", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull().references(() => tripsTable.id, { onDelete: "cascade" }),
  itemId: integer("item_id").notNull().references(() => itemsTable.id, { onDelete: "restrict" }),
  ratePerRound: numeric("rate_per_round", { precision: 12, scale: 2 }).notNull().default("0"),
  rounds: integer("rounds").notNull().default(1),
  entryDate: date("entry_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTripRoundEntrySchema = createInsertSchema(tripRoundEntriesTable).omit({ id: true, createdAt: true });
export type InsertTripRoundEntry = z.infer<typeof insertTripRoundEntrySchema>;
export type TripRoundEntry = typeof tripRoundEntriesTable.$inferSelect;
