import { neon } from '@neondatabase/serverless';

let client;

/** Tagged-template SQL client for Neon (HTTP driver — no pooling needed). */
export const sql = (strings, ...values) => {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    client = neon(process.env.DATABASE_URL);
  }
  return client(strings, ...values);
};
