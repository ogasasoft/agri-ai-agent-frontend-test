import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import { getDbClient } from '@/lib/db';

export async function POST(request: NextRequest) {
  let client: Client | null = null;
  
  try {
    client = await getDbClient();

    // テストユーザー tanaka@farm.com を作成
    const userData = {
      username: 'tanaka@farm.com',
      email: 'tanaka@farm.com',
      password: 'tanaka123',
      role: 'user',
      is_super_admin: false
    };

    // ユーザーが既に存在するかチェック
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1 OR username = $1',
      [userData.email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'ユーザーは既に存在します'
      });
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

    return NextResponse.json({
      success: true,
      message: 'プロダクション用テストユーザーを作成しました',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        password: userData.password,
        role: newUser.role,
        is_super_admin: newUser.is_super_admin,
        created_at: newUser.created_at
      }
    });

  } catch (error) {
    console.error('Production setup error:', error);
    return NextResponse.json({
      success: false,
      message: 'プロダクション設定に失敗しました',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
    }
  }
}