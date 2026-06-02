import { Client } from 'pg';

// Global variable to track if db.ts is being used in tests
declare global {
  var __TESTING_DB__: boolean;
}

// Mock database client for testing
let mockClient: any = null;

console.log('[DEBUG] src/lib/db.ts loading, NODE_ENV:', process.env.NODE_ENV, '__TESTING_DB__:', typeof globalThis.__TESTING_DB__);

// Check for test environment - try multiple indicators
const isTestEnvironment =
  process.env.NODE_ENV === 'test' ||
  process.env.JEST_WORKER_ID ||
  !process.env.DATABASE_URL ||
  (globalThis as any).__TESTING_DB__;

if (isTestEnvironment && !mockClient) {
  console.log('[DEBUG] Loading MockDbClient from __tests__/setup/test-utils');
  try {
    // Use dynamic import for test utils
    const path = require('path');
    const testUtilsPath = path.join(process.cwd(), '__tests__/setup/test-utils');
    const { MockDbClient } = require(testUtilsPath);
    console.log('[DEBUG] MockDbClient loaded:', typeof MockDbClient);
    mockClient = MockDbClient.getInstance();
    console.log('[DEBUG] MockDbClient instance created:', !!mockClient, 'mockClient:', !!mockClient);
  } catch (error) {
    console.error('[ERROR] Failed to load mock database client:', error);
  }
}

export async function getDbClient(): Promise<any> {
  // In test environment, use mock client
  // Also check if we're running in a Jest environment
  const isTestEnvironment =
    process.env.NODE_ENV === 'test' ||
    process.env.JEST_WORKER_ID ||
    !process.env.DATABASE_URL ||
    (globalThis as any).__TESTING_DB__;

  console.log('[DEBUG] getDbClient called, isTestEnvironment:', isTestEnvironment, 'mockClient:', !!mockClient);

  if (isTestEnvironment && mockClient) {
    console.log('[DEBUG] getDbClient returning mock client');
    return mockClient as any;
  }

  // Try multiple environment variables in order of preference
  const connectionString =
    process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;

  if (!connectionString) {
    throw new Error(
      'No database connection string found in environment variables. ' +
        'Please set DATABASE_URL, POSTGRES_URL, or POSTGRES_URL_NON_POOLING.'
    );
  }

  console.log('[DEBUG] Attempting to connect to database:', connectionString.replace(/:[^:@]+@/, ':***@'));

  const client = new Client({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log('[DEBUG] Database connection successful');
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
    if (process.env.NODE_ENV !== 'test' && !('query' in client && typeof client.query === 'function')) {
      await client.end();
    }
  }
}
