import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";
import { createDatabasePool, validateDatabaseConfiguration } from "../src/database/database.config";
import * as bcrypt from "bcryptjs";

validateDatabaseConfiguration();
const pool = createDatabasePool();
const adapter = new PrismaPg(pool, { disposeExternalPool: true });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@company.com";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.warn("ADMIN_PASSWORD not set, skipping admin seed");
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log(`Admin ${adminEmail} already exists, skipping.`);
    return;
  }

  await prisma.user.create({
    data: {
      email: adminEmail,
      name: "System Admin",
      password: await bcrypt.hash(adminPassword, 12),
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  console.log(`Admin ${adminEmail} created successfully`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });