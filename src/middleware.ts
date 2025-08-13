import { NextRequest, NextResponse } from 'next/server';

// シンプルなレート制限実装（メモリベース）
const rateLimit = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const key = ip;
  
  // Rate limit check for IP
  
  // 開発環境でローカルホストの場合はレート制限を緩和
  if (process.env.NODE_ENV === 'development' && (ip === 'localhost-dev' || ip === 'unknown')) {
    // Development environment bypass
    return true;
  }
  
  if (!rateLimit.has(key)) {
    rateLimit.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  const entry = rateLimit.get(key)!;
  
  if (now > entry.resetTime) {
    // ウィンドウをリセット
    entry.count = 1;
    entry.resetTime = now + windowMs;
    return true;
  }
  
  if (entry.count >= limit) {
    return false;
  }
  
  entry.count++;
  return true;
}

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/auto-login',
  '/login',
  '/api/migrate-security-enhancements', // Temporary for setup
  '/api/migrate-admin-system' // Temporary for setup
];

// Routes that need authentication but should be accessible
const AUTH_REQUIRED_ROUTES = [
  '/api/auth/logout',
  '/api/auth/me'
];

// Admin-only routes
const ADMIN_ROUTES = [
  '/admin',
  '/api/admin'
];

// Customer-only API routes (admins CANNOT access these)
const CUSTOMER_ONLY_API_ROUTES = [
  '/api/orders',
  '/api/categories',
  '/api/upload',
  '/api/upload-with-category',
  '/api/customers',
  '/api/shipping',
  '/api/ai-insights',
  '/api/chat',
  '/api/settings',
  '/api/yamato'
];

// Customer-only pages (admins CANNOT access these)
const CUSTOMER_ONLY_PAGE_ROUTES = [
  '/orders',
  '/categories',
  '/dashboard',
  '/settings',
  '/prompts'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // レート制限チェック（APIエンドポイントのみ）
  // 開発環境では完全に無効化
  if (pathname.startsWith('/api/') && process.env.NODE_ENV !== 'development') {
    const ip = request.ip || 
              request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
              request.headers.get('x-real-ip') ||
              'localhost-dev';
    
    // Rate limit configuration by endpoint
    
    // APIごとに異なるレート制限
    let limit = 100; // デフォルト: 1分間に100リクエスト
    
    if (pathname.startsWith('/api/auth/login')) {
      limit = 10; // ログインは1分間に10回まで
    } else if (pathname.startsWith('/api/upload')) {
      limit = 5; // アップロードは1分間に5回まで
    } else if (pathname.startsWith('/api/chat')) {
      limit = 30; // チャットは1分間に30回まで
    }
    
    const rateLimitResult = checkRateLimit(ip, limit);
    // Rate limit result processed
    
    if (!rateLimitResult) {
      return NextResponse.json({
        success: false,
        message: 'レート制限に達しました。しばらく待ってから再試行してください。'
      }, { status: 429 });
    }
  }
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check route types
  const isCustomerOnlyAPI = CUSTOMER_ONLY_API_ROUTES.some(route => pathname.startsWith(route));
  const isCustomerOnlyPage = CUSTOMER_ONLY_PAGE_ROUTES.some(route => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route));
  const isAuthRequiredRoute = AUTH_REQUIRED_ROUTES.some(route => pathname === route || pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check authentication for routes that require it
  if (isCustomerOnlyAPI || isCustomerOnlyPage || isAuthRequiredRoute || isAdminRoute) {
    const sessionToken = request.cookies.get('session_token')?.value;
    const rememberToken = request.cookies.get('remember_token')?.value;
    
    if (!sessionToken) {
      // Check for remember token for auto-login
      if (rememberToken && (isCustomerOnlyPage || isAdminRoute)) {
        // Redirect to auto-login then back to the original page
        const autoLoginUrl = new URL('/login', request.url);
        autoLoginUrl.searchParams.set('auto', 'true');
        autoLoginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(autoLoginUrl);
      }
      
      if (isCustomerOnlyAPI || isAuthRequiredRoute || (isAdminRoute && pathname.startsWith('/api'))) {
        return NextResponse.json({
          success: false,
          message: '認証が必要です。'
        }, { status: 401 });
      } else {
        // Redirect to login page
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }

    // **CRITICAL: Role-based access control**
    // For customer-only routes, check if trying to access from admin
    // For admin routes, check if trying to access from customer
    // Detailed validation happens in individual API routes

    // For API routes, pass session token to be validated in the API itself
    if (isCustomerOnlyAPI || isAuthRequiredRoute || (isAdminRoute && pathname.startsWith('/api'))) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-session-token', sessionToken);
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  // Handle root redirect - default to orders, admin check happens in login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/orders', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}