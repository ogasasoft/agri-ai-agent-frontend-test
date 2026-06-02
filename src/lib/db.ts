import { Client } from 'pg';

// Global variable to track if db.ts is being used in tests
declare global {
  var __TESTING_DB__: boolean;
}

// In test environment, mock DB client is loaded via jest.mock in test files.
// db.ts never imports test-utils directly to avoid Turbopack bundling issues.
// Tests should mock '@/lib/db' or use jest.mock for the mock client.

export async function getDbClient(): Promise<any> {
  // In test environment, tests should mock this function entirely
  // via jest.mock('@/lib/db', ...) in their test setup files.
  // If we reach here during a test, something went wrong with mocking.

  // Try multiple environment variables in order of preference
  const connectionString =
    process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;

  if (!connectionString) {
    throw new Error(
      'No database connection string found in environment variables. ' +
        'Please set DATABASE_URL, POSTGRES_URL, or POSTGRES_URL_NON_POOLING.'
    );
  }

  const client = new Client({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
  } catch (error) {
    console.error('[ERROR] Database connection failed:', error);
    throw error;
  }

  return client;
}

export async function withDatabase<T>(callback: (client: Client) => Promise<T>): Promise<T> {
  const client = await getDbClient();
  try {
    return await callback(client);
  } finally {
    // Only close real client in non-test environment
    if (process.env.NODE_ENV !== 'test') {
      await client.end();
    }
  }
}
