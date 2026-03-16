import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";
import { AuthErrorBuilder } from "@/lib/auth-error-details";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Try multiple sources for session token
    const sessionToken =
      request.headers.get("x-session-token") ||
      request.cookies.get("session_token")?.value;

    if (!sessionToken) {
      const authError = new AuthErrorBuilder("認証が必要です。")
        .setOperation("SESSION_VALIDATION")
        .addProcessingStep("Session Token Check", "failed")
        .addSuggestion("再度ログインしてください")
        .build();
      return NextResponse.json(authError, { status: 401 });
    }

    const sessionData = await validateSession(sessionToken);
    if (!sessionData) {
      const authError = new AuthErrorBuilder("セッションが無効です。")
        .setOperation("SESSION_VALIDATION")
        .addProcessingStep("Session Token Check", "failed", {
          token_present: true,
        })
        .addSuggestion("ブラウザのCookieが無効または削除された可能性があります")
        .addSuggestion("再度ログインしてください")
        .build();
      return NextResponse.json(authError, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: sessionData.user,
      session: sessionData.session,
      isAdmin: sessionData.user.is_super_admin || false,
    });
  } catch (error: any) {
    const systemError = new AuthErrorBuilder("サーバーエラーが発生しました。")
      .addProcessingStep("Session Validation", "failed", {
        error: error.message,
      })
      .addSuggestion(
        "セッションが破損している可能性があります。再ログインしてください",
      )
      .addSuggestion("問題が続く場合は、管理者にお問い合わせください")
      .build();

    return NextResponse.json(systemError, { status: 500 });
  }
}
