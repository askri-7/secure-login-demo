import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";
import * as bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
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
    await pool.end();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });