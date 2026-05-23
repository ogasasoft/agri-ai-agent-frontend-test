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
    }
  );

  // Set cookies directly on the response
  response.headers.set(
    'Set-Cookie',
    'session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
  );
  response.headers.set(
    'Set-Cookie',
    'csrf_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
  );
  response.headers.set(
    'Set-Cookie',
    'remember_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
  );

  return response;
}
