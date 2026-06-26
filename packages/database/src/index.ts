import 'dotenv/config';
export * from './repository/index.js';
export * from './lib/logger.js';
export * from './lib/schema.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool);
export type DataBase = typeof db;
export function ProvideDatabase(connectionString: string): DataBase {
  const pool = new Pool({
    connectionString,
  });

  return drizzle(pool);
}

