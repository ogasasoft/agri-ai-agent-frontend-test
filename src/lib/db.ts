import { Client } from 'pg';

export async function getDbClient(): Promise<Client> {
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
    await client.end();
  }
}
