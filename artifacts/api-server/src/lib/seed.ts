import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { logger } from "./logger";

export async function seedAdminUser() {
  try {
    const existing = await db.select().from(usersTable).limit(1);
    if (existing.length > 0) {
      return;
    }

    const hash = await bcrypt.hash("admin123", 10);
    await db.insert(usersTable).values({
      username: "admin",
      password: hash,
    });

    logger.info("Default admin user created (username: admin, password: admin123)");
  } catch (err) {
    logger.error({ err }, "Failed to seed admin user");
  }
}
