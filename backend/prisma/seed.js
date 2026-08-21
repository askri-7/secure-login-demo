
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@company.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existing) {
    console.log(`Admin ${adminEmail} already exists, skipping.`);
    await prisma.$disconnect();
    return;
  }

  await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'System Admin',
      password: await bcrypt.hash(adminPassword, 12),
      role: 'ADMIN',
      emailVerified: true,
    },
  });

  console.log(`Admin ${adminEmail} created with password: ${adminPassword}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Seed failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});