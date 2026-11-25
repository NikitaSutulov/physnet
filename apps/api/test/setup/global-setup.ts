import { execFileSync } from 'node:child_process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { testDatabaseUrl } from './test-database.js';

export default async function setup() {
  const url = testDatabaseUrl();
  await createDatabaseIfMissing(url);

  const env = { ...process.env, DATABASE_URL: url };
  const run = (args: string[]) =>
    execFileSync('pnpm', ['exec', ...args], { env, stdio: 'pipe' });
  run(['prisma', 'migrate', 'deploy']);
  run(['tsx', 'prisma/seed.ts']);
}

async function createDatabaseIfMissing(url: string) {
  const target = new URL(url);
  const name = decodeURIComponent(target.pathname.replace(/^\//, ''));
  if (!/^[\w-]+$/.test(name)) {
    throw new Error(`Unexpected test database name: ${name}`);
  }

  const maintenance = new URL(url);
  maintenance.pathname = '/postgres';
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: maintenance.toString() }),
  });
  try {
    const rows = await prisma.$queryRaw<unknown[]>`
      SELECT 1 FROM pg_database WHERE datname = ${name}`;
    if (rows.length === 0) {
      await prisma.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
    }
  } finally {
    await prisma.$disconnect();
  }
}
