import { Client } from 'pg';

export async function getDbClient(): Promise<Client> {
  // Try multiple environment variables in order of preference
  const connectionString = process.env.DATABASE_URL || 
                           process.env.POSTGRES_URL || 
                           process.env.POSTGRES_URL_NON_POOLING;
  
  if (!connectionString) {
    throw new Error('No database connection string found in environment variables');
  }
  
  const client = new Client({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  await client.connect();
  return client;
}

export async function withDatabase<T>(
  callback: (client: Client) => Promise<T>
): Promise<T> {
  const client = await getDbClient();
  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}