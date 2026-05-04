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

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS warehouses (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE RESTRICT,
      address TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_warehouses_city ON warehouses(city_id)`);
  await db.execute(sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS from_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE RESTRICT`);
  await db.execute(sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS to_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE RESTRICT`);
  await db.execute(sql`ALTER TABLE trips ALTER COLUMN from_city_id DROP NOT NULL`);
  await db.execute(sql`ALTER TABLE trips ALTER COLUMN to_city_id DROP NOT NULL`);

  await db.execute(sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id) ON DELETE RESTRICT`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS _meta_migrations (
      key VARCHAR(100) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);
  const inserted = await db.execute(
    sql`INSERT INTO _meta_migrations (key) VALUES ('inhouse_redesign_purge_v1') ON CONFLICT (key) DO NOTHING RETURNING key`
  );
  const insertedRows = (inserted.rows as Record<string, unknown>[]);
  if (Array.isArray(insertedRows) && insertedRows.length > 0) {
    await db.execute(sql`DELETE FROM trips WHERE movement_type = 'in_house_shifting'`);
  }

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS trip_round_entries (
      id SERIAL PRIMARY KEY,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
      rate_per_round NUMERIC(12, 2) NOT NULL DEFAULT 0,
      rounds INTEGER NOT NULL DEFAULT 1,
      entry_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trip_round_entries_trip ON trip_round_entries(trip_id)`);

  await db.execute(sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS inhouse_warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE RESTRICT`);

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

  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trips_truck_id ON trips(truck_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trips_trip_date ON trips(trip_date)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trips_customer_id ON trips(customer_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trip_loads_trip_id ON trip_loads(trip_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trip_loads_customer_id ON trip_loads(customer_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip_id ON trip_expenses(trip_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_customer_payments_trip_id ON customer_payments(trip_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_driver_advances_trip_id ON driver_advances(trip_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_customer_dues_customer_id ON customer_dues(customer_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_customer_dues_trip_id ON customer_dues(trip_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_cash_book_ref ON cash_book(reference_table, reference_id)`);

  logger.info("Migrations applied successfully");
}
