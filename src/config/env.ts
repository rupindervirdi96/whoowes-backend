import 'dotenv/config';

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env variable: ${key}`);
  return val;
}

export const env = {
  PORT: parseInt(process.env['PORT'] ?? '5000', 10),
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  MONGODB_URI: required('MONGODB_URI'),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: process.env['JWT_EXPIRES_IN'] ?? '30d',
  ALLOWED_ORIGINS: process.env['ALLOWED_ORIGINS']?.split(',').filter(Boolean) ?? [],
} as const;
