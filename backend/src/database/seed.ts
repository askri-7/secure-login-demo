import { PrismaClient, UserRole } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@company.com';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.warn('ADMIN_PASSWORD not set, skipping admin seed');
    await prisma.$disconnect();
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log(`Admin ${adminEmail} already exists`);
    await prisma.$disconnect();
    return;
  }

  await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'System Admin',
      password: await bcrypt.hash(adminPassword, 12),
      role: UserRole.ADMIN,
    },
  });

  console.log(`Admin ${adminEmail} created successfully`);
  await prisma.$disconnect();
}

main()
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });