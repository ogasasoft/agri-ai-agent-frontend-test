import { NextRequest, NextResponse } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/auto-login',
  '/login',
  '/api/migrate-auth', // Temporary for setup
  '/api/migrate-security-enhancements' // Temporary for setup
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

// API routes that require authentication
const PROTECTED_API_ROUTES = [
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

// Pages that require authentication
const PROTECTED_PAGE_ROUTES = [
  '/orders',
  '/categories',
  '/dashboard',
  '/settings',
  '/prompts'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    pathname === '/api/migrate-auth'
  ) {
    return NextResponse.next();
  }

  // Check if route requires authentication
  const isProtectedAPI = PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));
  const isProtectedPage = PROTECTED_PAGE_ROUTES.some(route => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route));
  const isAuthRequiredRoute = AUTH_REQUIRED_ROUTES.some(route => pathname === route || pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname.startsWith(route));

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  if (isProtectedAPI || isProtectedPage || isAuthRequiredRoute || isAdminRoute) {
    const sessionToken = request.cookies.get('session_token')?.value;
    const rememberToken = request.cookies.get('remember_token')?.value;
    
    if (!sessionToken) {
      // Check for remember token for auto-login
      if (rememberToken && isProtectedPage) {
        // Redirect to auto-login then back to the original page
        const autoLoginUrl = new URL('/login', request.url);
        autoLoginUrl.searchParams.set('auto', 'true');
        autoLoginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(autoLoginUrl);
      }
      
      if (isProtectedAPI || isAuthRequiredRoute || (isAdminRoute && pathname.startsWith('/api'))) {
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

    // For API routes, pass session token to be validated in the API itself
    if (isProtectedAPI || isAuthRequiredRoute || (isAdminRoute && pathname.startsWith('/api'))) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-session-token', sessionToken);
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    // For page routes, do a lightweight session check
    try {
      // Simple session check - just verify token exists and looks valid
      if (!sessionToken || sessionToken.length < 64) {
        // Redirect to login page
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('session_token');
        response.cookies.delete('csrf_token');
        response.cookies.delete('remember_token');
        return response;
      }
    } catch (error) {
      console.error('Session check error:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Handle root redirect
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