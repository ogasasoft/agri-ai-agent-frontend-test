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

    // テストユーザーのメールアドレス一覧
    const testUserEmails = [
      'tanaka@farm.com',
      'suzuki@agri.jp',
      'yamamoto@organic.co.jp',
      'watanabe@veggie.net',
      'sato@greenfield.org',
      'test@demo.com',
      'customer01@example.jp',
      'farmer@local.jp'
    ];

    let deletedCount = 0;

    for (const email of testUserEmails) {
      // Delete from user_passwords first (foreign key constraint)
      await client.query(`
        DELETE FROM user_passwords 
        WHERE user_id IN (
          SELECT id FROM users WHERE email = $1 OR username = $1
        )
      `, [email]);

      // Delete user
      const result = await client.query(`
        DELETE FROM users 
        WHERE email = $1 OR username = $1
        RETURNING id, username
      `, [email]);

      if (result.rows.length > 0) {
        deletedCount++;
        console.log(`Deleted user: ${result.rows[0].username}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount}人のテストユーザーを削除しました`,
      deleted_count: deletedCount
    });

  } catch (error) {
    console.error('Delete test users error:', error);
    return NextResponse.json({
      success: false,
      message: 'テストユーザー削除に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
    }
  }
}