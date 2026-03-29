import bcrypt from "bcrypt";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

export async function seedAdminUser() {
  try {
    const existing = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, ADMIN_USERNAME))
      .limit(1);

    if (existing.length === 0) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await db.insert(usersTable).values({
        username: ADMIN_USERNAME,
        password: hash,
      });
      logger.info("Default admin user seeded successfully");
      return;
    }

    const admin = existing[0]!;
    const isBcrypt = admin.password.startsWith("$2");
    if (!isBcrypt) {
      logger.warn("Admin password is not hashed — rehashing now");
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await db
        .update(usersTable)
        .set({ password: hash })
        .where(eq(usersTable.username, ADMIN_USERNAME));
      logger.info("Admin password rehashed successfully");
    }
  } catch (err) {
    logger.error({ err }, "Failed to seed admin user");
  }
}
