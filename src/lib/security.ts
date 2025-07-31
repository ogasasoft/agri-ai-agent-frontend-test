import { NextResponse } from 'next/server';

// セキュリティヘッダーを追加する関数
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // HSTS (HTTP Strict Transport Security)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // X-Frame-Options (クリックジャッキング防止)
  response.headers.set('X-Frame-Options', 'DENY');
  
  // X-Content-Type-Options (MIMEスニッフィング防止)
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // X-XSS-Protection (XSS攻撃防止)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self' https://api.openai.com; " +
    "frame-ancestors 'none';"
  );
  
  return response;
}

// 標準化されたエラーレスポンス
export function createErrorResponse(
  message: string, 
  status: number = 500, 
  details?: any
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const response = NextResponse.json({
    success: false,
    message,
    timestamp: new Date().toISOString(),
    // 開発環境でのみ詳細エラー情報を含める
    ...(isDevelopment && details && { details })
  }, { status });
  
  return addSecurityHeaders(response);
}

// 標準化された成功レスポンス
export function createSuccessResponse(data: any, status: number = 200): NextResponse {
  const response = NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    ...data
  }, { status });
  
  return addSecurityHeaders(response);
}

// 入力値サニタイゼーション
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // HTMLタグの基本的な無害化
    .slice(0, 1000); // 長さ制限
}

// SQLインジェクション対策のための文字列検証
export function validateSqlInput(input: string): boolean {
  const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b|[';--])/i;
  return !sqlInjectionPattern.test(input);
}

// APIキーやパスワードなどの機密情報をログから除外
export function sanitizeForLogging(obj: any): any {
  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'auth'];
  
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }
  
  return sanitized;
}