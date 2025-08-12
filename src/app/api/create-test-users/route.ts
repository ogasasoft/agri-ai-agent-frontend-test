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
  // Only allow in development environment
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      success: false,
      message: 'This API is not available in production'
    }, { status: 404 });
  }

  let client: Client | null = null;
  
  try {
    client = await getDbClient();

    // テストユーザーのデータ
    const testUsers = [
      {
        username: 'tanaka@farm.com',
        email: 'tanaka@farm.com',
        password: 'tanaka123',
        role: 'user',
        is_super_admin: false
      },
      {
        username: 'suzuki@agri.jp',
        email: 'suzuki@agri.jp', 
        password: 'suzuki456',
        role: 'user',
        is_super_admin: false
      },
      {
        username: 'yamamoto@organic.co.jp',
        email: 'yamamoto@organic.co.jp',
        password: 'yamamoto789',
        role: 'user',
        is_super_admin: false
      },
      {
        username: 'watanabe@veggie.net',
        email: 'watanabe@veggie.net',
        password: 'watanabe321',
        role: 'user',
        is_super_admin: false
      },
      {
        username: 'sato@greenfield.org',
        email: 'sato@greenfield.org',
        password: 'sato654',
        role: 'user',
        is_super_admin: false
      },
      {
        username: 'test@demo.com',
        email: 'test@demo.com',
        password: 'demo123',
        role: 'admin',
        is_super_admin: false
      },
      {
        username: 'customer01@example.jp',
        email: 'customer01@example.jp',
        password: 'pass123',
        role: 'user',
        is_super_admin: false
      },
      {
        username: 'farmer@local.jp',
        email: 'farmer@local.jp',
        password: 'farmer456',
        role: 'user',
        is_super_admin: false
      }
    ];

    const createdUsers = [];

    for (const userData of testUsers) {
      // ユーザーが既に存在するかチェック
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $1',
        [userData.email]
      );

      if (existingUser.rows.length > 0) {
        console.log(`User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Generate salt
      const crypto = require('crypto');
      const salt = crypto.randomBytes(16).toString('hex');
      
      // パスワードをハッシュ化 (password + salt)
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password + salt, saltRounds);

      // ユーザーを作成
      const result = await client.query(`
        INSERT INTO users (
          username, 
          email, 
          password_hash,
          salt,
          role,
          is_super_admin,
          is_active,
          failed_login_attempts,
          lockout_level,
          consecutive_failures,
          created_at,
          password_changed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id, username, email, created_at, role, is_super_admin
      `, [userData.username, userData.email, hashedPassword, salt, userData.role, userData.is_super_admin, true, 0, 0, 0]);

      const newUser = result.rows[0];

      // プレーンテキストパスワードを保存（管理者表示用）
      await client.query(`
        INSERT INTO user_passwords (user_id, plain_password)
        VALUES ($1, $2)
      `, [newUser.id, userData.password]);

      createdUsers.push({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        password: userData.password,
        role: newUser.role,
        is_super_admin: newUser.is_super_admin,
        created_at: newUser.created_at
      });

      console.log(`Created user: ${userData.email} with password: ${userData.password}`);
    }

    return NextResponse.json({
      success: true,
      message: `${createdUsers.length}人のテストユーザーを作成しました`,
      users: createdUsers
    });

  } catch (error) {
    console.error('Create test users error:', error);
    return NextResponse.json({
      success: false,
      message: 'テストユーザー作成に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
    }
  }
}