import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  DATABASE_URL: z.string().url(),

  S3_ENDPOINT: z.string().url().default('http://localhost:3900'),
  S3_REGION: z.string().default('garage'),
  S3_BUCKET: z.string().default('physnet'),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_EXPIRES_IN: z.string().default('15m'),

  ONOS_URL: z.string().url().default('http://localhost:8181/onos/v1'),
  ONOS_USER: z.string().default('onos'),
  ONOS_PASSWORD: z.string().default('rocks'),
  ONOS_APP_ID: z.string().default('org.onosproject.physnet'),
  ONOS_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(5000),
  ONOS_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  ONOS_SYNC_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
