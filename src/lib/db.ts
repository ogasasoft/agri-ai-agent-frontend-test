import { Client } from 'pg';

export async function getDbClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
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