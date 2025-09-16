// 認証システム専用のエラー詳細分析
import { ErrorDetailBuilder, DetailedErrorResponse } from './error-details';
import { debugLogger } from './debug-logger';

interface AuthenticationContext {
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  attemptCount?: number;
  lockoutDuration?: number;
}

export class AuthErrorBuilder extends ErrorDetailBuilder {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR');
  }

  setAuthContext(context: AuthenticationContext): this {
    if (this.errorResponse.debug_info) {
      this.errorResponse.debug_info.user_id = context.username;
      this.errorResponse.debug_info.operation = 'USER_AUTHENTICATION';
    }
    return this.setDetails({
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      attempt_count: context.attemptCount,
      lockout_duration: context.lockoutDuration
    });
  }

  // ログイン失敗の詳細分析
  static loginFailure(
    username: string,
    reason: 'INVALID_CREDENTIALS' | 'USER_NOT_FOUND' | 'ACCOUNT_LOCKED' | 'RATE_LIMITED',
    context: AuthenticationContext
  ): DetailedErrorResponse {
    const messages = {
      INVALID_CREDENTIALS: 'ユーザー名またはパスワードが正しくありません',
      USER_NOT_FOUND: 'ユーザーが見つかりません',
      ACCOUNT_LOCKED: 'アカウントが一時的にロックされています',
      RATE_LIMITED: 'ログイン試行回数が上限に達しました'
    };

    const builder = new AuthErrorBuilder(messages[reason]);

    builder
      .setAuthContext({ ...context, username })
      .addProcessingStep('Username Validation', reason === 'USER_NOT_FOUND' ? 'failed' : 'completed')
      .addProcessingStep('Password Verification', reason === 'INVALID_CREDENTIALS' ? 'failed' : 'completed')
      .addProcessingStep('Account Status Check', reason === 'ACCOUNT_LOCKED' ? 'failed' : 'completed')
      .addProcessingStep('Rate Limit Check', reason === 'RATE_LIMITED' ? 'failed' : 'completed');

    // 攻撃パターンの分析
    const suggestions = AuthErrorBuilder.analyzeAttackPattern(reason, context);
    builder.addSuggestions(suggestions);

    return builder.build();
  }

  // セッション関連エラー
  static sessionError(
    errorType: 'INVALID_SESSION' | 'EXPIRED_SESSION' | 'CSRF_MISMATCH',
    sessionInfo?: { token?: string; created?: string; userId?: string }
  ): DetailedErrorResponse {
    const messages = {
      INVALID_SESSION: 'セッションが無効です',
      EXPIRED_SESSION: 'セッションが期限切れです',
      CSRF_MISMATCH: 'CSRF検証に失敗しました'
    };

    const builder = new AuthErrorBuilder(messages[errorType]);

    builder
      .setOperation('SESSION_VALIDATION')
      .addProcessingStep('Session Token Check', errorType === 'INVALID_SESSION' ? 'failed' : 'completed')
      .addProcessingStep('Session Expiry Check', errorType === 'EXPIRED_SESSION' ? 'failed' : 'completed')
      .addProcessingStep('CSRF Token Validation', errorType === 'CSRF_MISMATCH' ? 'failed' : 'completed');

    if (sessionInfo) {
      builder.setDetails({
        session_info: {
          token_present: !!sessionInfo.token,
          created_at: sessionInfo.created,
          user_id: sessionInfo.userId
        }
      });
    }

    // セキュリティ提案
    const suggestions = AuthErrorBuilder.generateSecuritySuggestions(errorType);
    builder.addSuggestions(suggestions);

    return builder.build();
  }

  private static analyzeAttackPattern(
    reason: string,
    context: AuthenticationContext
  ): string[] {
    const suggestions: string[] = [];

    if (context.attemptCount && context.attemptCount > 3) {
      suggestions.push('短時間での複数回ログイン試行が検出されました。ブルートフォース攻撃の可能性があります');
    }

    if (reason === 'RATE_LIMITED') {
      suggestions.push(`IP: ${context.ipAddress} からの過度なアクセスが検出されました`);
      suggestions.push('正当なユーザーの場合は、しばらく時間をおいてから再試行してください');
    }

    if (reason === 'USER_NOT_FOUND') {
      suggestions.push('存在しないユーザー名での試行が検出されました。アカウント列挙攻撃の可能性があります');
    }

    if (context.lockoutDuration) {
      suggestions.push(`アカウントは ${context.lockoutDuration} 分間ロックされます`);
      suggestions.push('パスワードを忘れた場合は、管理者にお問い合わせください');
    }

    return suggestions;
  }

  private static generateSecuritySuggestions(errorType: string): string[] {
    const suggestions: string[] = [];

    switch (errorType) {
      case 'INVALID_SESSION':
        suggestions.push('ブラウザのCookieが無効または削除された可能性があります');
        suggestions.push('再度ログインしてください');
        break;

      case 'EXPIRED_SESSION':
        suggestions.push('セッションの有効期限が切れました');
        suggestions.push('セキュリティのため、定期的な再認証が必要です');
        break;

      case 'CSRF_MISMATCH':
        suggestions.push('CSRF攻撃の可能性が検出されました');
        suggestions.push('ページを更新してから再度お試しください');
        break;
    }

    return suggestions;
  }
}

// 認証関連ログ機能
export const logAuthAttempt = (
  result: 'SUCCESS' | 'FAILURE',
  username: string,
  context: AuthenticationContext
) => {
  const logData = {
    result,
    username,
    ip_address: context.ipAddress,
    user_agent: context.userAgent,
    timestamp: new Date().toISOString()
  };

  if (result === 'SUCCESS') {
    debugLogger.info('認証成功', logData);
  } else {
    debugLogger.warn('認証失敗', logData);
  }
};

export const logSecurityEvent = (
  eventType: 'BRUTE_FORCE' | 'ACCOUNT_ENUMERATION' | 'CSRF_ATTACK' | 'SESSION_HIJACK',
  details: any,
  context: AuthenticationContext
) => {
  debugLogger.error(`セキュリティイベント: ${eventType}`, {
    event_type: eventType,
    details,
    context,
    timestamp: new Date().toISOString()
  });
};