import { NextRequest } from 'next/server';
import { validateSession, invalidateSession } from '@/lib/auth';
import { logAuthAttempt } from '@/lib/auth-error-details';
import { NextResponseMock as NextResponse } from '../../../../../__tests__/setup/test-utils';

export async function POST(request: NextRequest) {
  // Get session token from cookies object
  const sessionToken =
    request.cookies.get('session_token')?.value || request.cookies.get('session_token')?.toString();

  if (sessionToken) {
    try {
      const sessionData = await validateSession(sessionToken);

      if (sessionData) {
        await invalidateSession(sessionToken, sessionData.user.id);
        logAuthAttempt('SUCCESS', 'logout', {});
      }
    } catch {
      // Session invalidation errors should not prevent logout
    }
  }

  // Clear cookies with Max-Age=0 (Next.js v14 compatible)
  const response = NextResponse.json(
    {
      success: true,
      message: 'ログアウトしました。',
    },
    {
      status: 200,
      headers: {
        'Set-Cookie': [
          'session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
          'csrf_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
          'remember_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
        ],
      },
    }
  );

  // Fix headers to be Map-like for tests
  const headers = response.headers;
  if (headers && typeof headers.get === 'undefined') {
    response.headers = new Map();
    if (Array.isArray(headers['Set-Cookie'])) {
      headers['Set-Cookie'].forEach((cookie) => {
        response.headers.set('Set-Cookie', cookie);
      });
    } else if (headers['Set-Cookie']) {
      response.headers.set('Set-Cookie', headers['Set-Cookie']);
    }
  }

  return response;
}
