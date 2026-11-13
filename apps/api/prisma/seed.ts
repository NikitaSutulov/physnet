import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const email = (process.env['SEED_ADMIN_EMAIL'] ?? 'admin@physnet.local')
  .trim()
  .toLowerCase();
const password = process.env['SEED_ADMIN_PASSWORD'] ?? 'changeme123';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.administrator.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
    },
  });
  console.log(`Seeded administrator ${admin.email} (${admin.id})`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
