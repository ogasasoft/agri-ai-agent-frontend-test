import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

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
    const { username, password } = await request.json();
    
    client = await getDbClient();

    // Check if user exists
    const userResult = await client.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'User not found',
        found: false
      });
    }

    const user = userResult.rows[0];
    
    // Check password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    
    // Check user_passwords table for plain text password
    const plainPasswordResult = await client.query(
      'SELECT plain_password FROM user_passwords WHERE user_id = $1',
      [user.id]
    );

    return NextResponse.json({
      success: true,
      found: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        locked_until: user.locked_until,
        failed_login_attempts: user.failed_login_attempts,
      },
      password_check: {
        provided_password: password,
        stored_plain_password: plainPasswordResult.rows[0]?.plain_password || 'Not found',
        bcrypt_hash_match: passwordValid,
        stored_hash: user.password_hash.substring(0, 20) + '...'
      }
    });

  } catch (error) {
    console.error('Check user login error:', error);
    return NextResponse.json({
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
    }
  }
}