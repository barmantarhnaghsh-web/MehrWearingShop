import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  API_PUBLIC_URL: z.string().default('http://localhost:4000'),
  WEB_PUBLIC_URL: z.string().default('http://localhost:3000'),
  PAYMENT_PROVIDER: z.enum(['mock', 'zarinpal', 'cod']).default('mock'),
  ZARINPAL_MERCHANT_ID: z.string().optional().default(''),
  ZARINPAL_SANDBOX: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(30),
  ADMIN_EMAIL: z.string().email().default('admin@mwrshop.ir'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin@1234'),
  ADMIN_PHONE: z.string().default('09120000001'),
});

export type Env = z.infer<typeof schema>;

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast with an actionable message instead of a stack trace deep in the app.
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env: Env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
