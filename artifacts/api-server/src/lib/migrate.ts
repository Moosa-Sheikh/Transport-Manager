import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "./logger";

export async function runMigrations() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      unit VARCHAR(30) NOT NULL DEFAULT 'Bag',
      default_rate_per_round NUMERIC(12, 2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.execute(sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE RESTRICT`);
  await db.execute(sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS item_id INTEGER REFERENCES items(id) ON DELETE RESTRICT`);
  await db.execute(sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS rounds INTEGER DEFAULT 1`);
  await db.execute(sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS rate_per_round NUMERIC(12, 2) DEFAULT 0`);
  await db.execute(sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS commission_per_round NUMERIC(12, 2) DEFAULT 0`);

  const seedItems: { name: string; unit: string; rate: string }[] = [
    { name: "Cement Bag", unit: "Bag", rate: "50" },
    { name: "Sand", unit: "CFT", rate: "25" },
    { name: "Bricks", unit: "Piece", rate: "5" },
    { name: "Crush / Bajri", unit: "CFT", rate: "30" },
    { name: "Steel Bar", unit: "Ton", rate: "1500" },
    { name: "Wheat", unit: "Bag", rate: "60" },
    { name: "Rice", unit: "Bag", rate: "70" },
    { name: "Sugar", unit: "Bag", rate: "80" },
    { name: "Other", unit: "Piece", rate: "0" },
  ];
  for (const it of seedItems) {
    await db.execute(sql`
      INSERT INTO items (name, unit, default_rate_per_round)
      VALUES (${it.name}, ${it.unit}, ${it.rate})
      ON CONFLICT (name) DO NOTHING
    `);
  }

  logger.info("Migrations applied successfully");
}
