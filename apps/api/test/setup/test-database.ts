import 'dotenv/config';

export function testDatabaseUrl(): string {
  const explicit = process.env['TEST_DATABASE_URL'];
  if (explicit) return explicit;

  const base = process.env['DATABASE_URL'];
  if (!base) {
    throw new Error('Set DATABASE_URL or TEST_DATABASE_URL in apps/api/.env');
  }
  const url = new URL(base);
  const name = url.pathname.replace(/^\//, '');
  url.pathname = `/${name}_test`;
  return url.toString();
}
