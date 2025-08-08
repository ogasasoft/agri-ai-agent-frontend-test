import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

async function getDbClient(): Promise<Client> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  await client.connect();
  return client;
}

export async function POST(request: NextRequest) {
  let client: Client | null = null;
  
  try {
    client = await getDbClient();

    // Create user_passwords table for storing plain text passwords for admin access
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_passwords (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plain_password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      );
    `);

    // Add indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_passwords_user_id ON user_passwords(user_id);
    `);

    // Insert existing test users' passwords
    await client.query(`
      INSERT INTO user_passwords (user_id, plain_password) 
      SELECT u.id, 
        CASE 
          WHEN u.username = 'admin' THEN 'admin123'
          WHEN u.email = 'silentogasasoft@gmail.com' THEN 'Ogasa1995'
          ELSE '1995'
        END
      FROM users u
      WHERE NOT EXISTS (SELECT 1 FROM user_passwords WHERE user_id = u.id);
    `);

    console.log('User passwords table created and initialized successfully');

    return NextResponse.json({
      success: true,
      message: 'User passwords migration completed successfully'
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      message: 'Migration failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
    }
  }
}