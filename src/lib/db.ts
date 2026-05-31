import { Client } from 'pg';

// Mock database client for testing
let mockClient: any = null;

if (process.env.NODE_ENV === 'test') {
  try {
    const { MockDbClient } = require('../__tests__/setup/test-utils');
    mockClient = MockDbClient.getInstance();
    console.log('Using mock database client for testing');
  } catch (error) {
    console.error('Failed to load mock database client:', error);
  }
}

export async function getDbClient(): Promise<Client> {
  // In test environment, use mock client
  if (process.env.NODE_ENV === 'test' && mockClient) {
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

  console.log('Attempting to connect to database:', connectionString.replace(/:[^:@]+@/, ':***@'));

  const client = new Client({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log('Database connection successful');
  } catch (error) {
    console.error('Database connection failed:', error);
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
