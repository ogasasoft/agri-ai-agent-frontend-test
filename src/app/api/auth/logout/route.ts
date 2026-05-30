import { NextRequest, NextResponse } from 'next/server';
import { validateSession, invalidateSession } from '@/lib/auth';
import { logAuthAttempt } from '@/lib/auth-error-details';

export async function POST(request: NextRequest) {
  // Get session token from cookies object
  const sessionToken =
    request.headers.get('x-session-token') ||
    (request.cookies.get('session_token')?.value || request.cookies.get('session_token')?.name);

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

  // Clear cookies with Max-Age=0
  const response = NextResponse.json(
    {
      success: true,
      message: 'ログアウトしました。',
    },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': [
          'session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
          'csrf_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
          'remember_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax',
        ].join(', '),
      },
    }
  );

  return response;
}
