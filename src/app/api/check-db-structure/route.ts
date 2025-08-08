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

export async function GET(request: NextRequest) {
  let client: Client | null = null;
  
  try {
    client = await getDbClient();

    // Check users table structure
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    // Check existing users
    const existingUsers = await client.query('SELECT * FROM users LIMIT 5');

    return NextResponse.json({
      success: true,
      table_structure: tableStructure.rows,
      existing_users: existingUsers.rows
    });

  } catch (error) {
    console.error('Check DB structure error:', error);
    return NextResponse.json({
      success: false,
      message: 'データベース構造確認に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
    }
  }
}