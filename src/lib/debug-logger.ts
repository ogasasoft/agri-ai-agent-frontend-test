// 包括的なデバッグ・ログシステム
interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  apiRoute?: string;
  operation?: string;
}

interface LogData {
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context?: LogContext;
  data?: unknown;
  timestamp?: string;
  stack?: string;
}

class DebugLogger {
  private isDevelopment: boolean;
  private isDebugMode: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isDebugMode = process.env.DEBUG_MODE === 'true' || this.isDevelopment;
  }

  private formatLog(logData: LogData): string {
    const timestamp = logData.timestamp || new Date().toISOString();
    const context = logData.context ? JSON.stringify(logData.context) : '';
    return `[${timestamp}] ${logData.level} ${context} ${logData.message}`;
  }

  debug(message: string, data?: unknown, context?: LogContext) {
    if (!this.isDebugMode) return;

    const logData: LogData = {
      level: 'DEBUG',
      message,
      context,
      data,
      timestamp: new Date().toISOString()
    };

    if (data) {
    }
  }

  info(message: string, data?: unknown, context?: LogContext) {
    if (!this.isDebugMode) return;

    const logData: LogData = {
      level: 'INFO',
      message,
      context,
      data,
      timestamp: new Date().toISOString()
    };

    if (data) {
    }
  }

  warn(message: string, data?: unknown, context?: LogContext) {
    const logData: LogData = {
      level: 'WARN',
      message,
      context,
      data,
      timestamp: new Date().toISOString()
    };

    console.warn('⚠️ ' + this.formatLog(logData));
    if (data) {
      console.warn('📊 Data:', data);
    }
  }

  error(message: string, error?: unknown, context?: LogContext) {
    const logData: LogData = {
      level: 'ERROR',
      message,
      context,
      data: error,
      timestamp: new Date().toISOString(),
      stack: error instanceof Error ? error.stack : undefined
    };

    console.error('❌ ' + this.formatLog(logData));
    if (error) {
      console.error('📊 Error Details:', error);
      if (error instanceof Error && error.stack) {
        console.error('📚 Stack Trace:', error.stack);
      }
    }
  }

  // CSV専用のデバッグ機能
  csvDebug(phase: string, data: unknown, context?: LogContext) {
    if (!this.isDebugMode) return;


    if (phase === 'headers' && Array.isArray(data)) {
      data.forEach((header, index) => {
      });
    }

    if (phase === 'mapping' && typeof data === 'object' && data !== null) {
      Object.entries(data).forEach(([field, value]) => {
      });
    }

    if (phase === 'validation_errors' && Array.isArray(data)) {
      const errorCounts = data.reduce((acc: Record<string, number>, error: string) => {
        const errorType = error.split(':')[1]?.trim() || 'unknown';
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {});

      Object.entries(errorCounts).forEach(([errorType, count]) => {
      });
    }
  }

  // API リクエスト/レスポンスのトレース
  apiTrace(phase: 'REQUEST' | 'RESPONSE' | 'ERROR', data: unknown, context?: LogContext, extraData?: unknown) {
    if (!this.isDebugMode) return;

    const emoji = phase === 'REQUEST' ? '📤' : phase === 'RESPONSE' ? '📥' : '💥';
    const logData = extraData ? { ...data as Record<string, unknown>, ...extraData as Record<string, unknown> } : data;
    if (logData && typeof logData === 'object' && logData !== null) {
    }
  }

  // パフォーマンス測定
  startTimer(label: string): () => void {
    if (!this.isDebugMode) return () => {};

    const start = performance.now();

    return () => {
      const end = performance.now();
      const duration = end - start;
    };
  }
}

// シングルトンインスタンス
export const debugLogger = new DebugLogger();

// 便利なヘルパー関数
export const logCSVProcessing = (
  phase: 'start' | 'headers' | 'parsing' | 'validation' | 'mapping' | 'saving' | 'complete',
  data: unknown,
  context?: LogContext
) => {
  debugLogger.csvDebug(phase, data, context);
};

export const logAPICall = (
  method: string,
  url: string,
  data?: unknown,
  context?: LogContext
) => {
  debugLogger.apiTrace('REQUEST', { method, url }, context, data);
};

export const logAPIResponse = (
  status: number,
  data?: unknown,
  context?: LogContext
) => {
  debugLogger.apiTrace('RESPONSE', { status }, context, data);
};

export const logAPIError = (
  error: unknown,
  context?: LogContext
) => {
  debugLogger.apiTrace('ERROR', error, context);
};
