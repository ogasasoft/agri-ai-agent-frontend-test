import { NextRequest, NextResponse } from "next/server";
import { validateSession, invalidateSession } from "@/lib/auth";
import { invalidateRememberTokensForUser } from "@/lib/auth-enhanced";
import { logAuthAttempt } from "@/lib/auth-error-details";

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("session_token")?.value;

  if (sessionToken) {
    try {
      const sessionData = await validateSession(sessionToken);

      if (sessionData) {
        await invalidateSession(sessionToken, sessionData.user.id);
        logAuthAttempt("SUCCESS", "logout", {});
      }
    } catch {
      // Session invalidation errors should not prevent logout
    }
  }

  // Clear cookies with Max-Age=0
  const response = NextResponse.json({
    success: true,
    message: "ログアウトしました。",
  });

  response.cookies.set("session_token", "", { maxAge: 0, path: "/" });
  response.cookies.set("csrf_token", "", { maxAge: 0, path: "/" });
  response.cookies.set("remember_token", "", { maxAge: 0, path: "/" });

  return response;
}
