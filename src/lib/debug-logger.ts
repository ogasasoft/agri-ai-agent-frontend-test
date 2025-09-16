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
  data?: any;
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

  debug(message: string, data?: any, context?: LogContext) {
    if (!this.isDebugMode) return;
    
    const logData: LogData = {
      level: 'DEBUG',
      message,
      context,
      data,
      timestamp: new Date().toISOString()
    };

    console.log('🐛 ' + this.formatLog(logData));
    if (data) {
      console.log('📊 Data:', data);
    }
  }

  info(message: string, data?: any, context?: LogContext) {
    if (!this.isDebugMode) return;

    const logData: LogData = {
      level: 'INFO',
      message,
      context,
      data,
      timestamp: new Date().toISOString()
    };

    console.log('ℹ️ ' + this.formatLog(logData));
    if (data) {
      console.log('📊 Data:', data);
    }
  }

  warn(message: string, data?: any, context?: LogContext) {
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

  error(message: string, error?: any, context?: LogContext) {
    const logData: LogData = {
      level: 'ERROR',
      message,
      context,
      data: error,
      timestamp: new Date().toISOString(),
      stack: error?.stack
    };

    console.error('❌ ' + this.formatLog(logData));
    if (error) {
      console.error('📊 Error Details:', error);
      if (error.stack) {
        console.error('📚 Stack Trace:', error.stack);
      }
    }
  }

  // CSV専用のデバッグ機能
  csvDebug(phase: string, data: any, context?: LogContext) {
    if (!this.isDebugMode) return;
    
    console.log(`📄 CSV Debug [${phase}]:`, data);
    
    if (phase === 'headers' && Array.isArray(data)) {
      console.log('📋 CSV Headers Analysis:');
      data.forEach((header, index) => {
        console.log(`  ${index + 1}: "${header}" (length: ${header.length})`);
      });
    }
    
    if (phase === 'mapping' && typeof data === 'object') {
      console.log('🗺️ Field Mapping Results:');
      Object.entries(data).forEach(([field, value]) => {
        console.log(`  ${field}: "${value}" ${value ? '✅' : '❌'}`);
      });
    }
    
    if (phase === 'validation_errors' && Array.isArray(data)) {
      console.log('🚨 Validation Errors Summary:');
      const errorCounts = data.reduce((acc: Record<string, number>, error: string) => {
        const errorType = error.split(':')[1]?.trim() || 'unknown';
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(errorCounts).forEach(([errorType, count]) => {
        console.log(`  ${errorType}: ${count} occurrences`);
      });
    }
  }

  // API リクエスト/レスポンスのトレース
  apiTrace(phase: 'REQUEST' | 'RESPONSE' | 'ERROR', data: any, context?: LogContext) {
    if (!this.isDebugMode) return;
    
    const emoji = phase === 'REQUEST' ? '📤' : phase === 'RESPONSE' ? '📥' : '💥';
    console.log(`${emoji} API ${phase}:`, data);
  }

  // パフォーマンス測定
  startTimer(label: string): () => void {
    if (!this.isDebugMode) return () => {};
    
    const start = performance.now();
    console.log(`⏱️ Timer Started: ${label}`);
    
    return () => {
      const end = performance.now();
      const duration = end - start;
      console.log(`⏱️ Timer End: ${label} - ${duration.toFixed(2)}ms`);
    };
  }
}

// シングルトンインスタンス
export const debugLogger = new DebugLogger();

// 便利なヘルパー関数
export const logCSVProcessing = (
  phase: 'start' | 'headers' | 'parsing' | 'validation' | 'mapping' | 'saving' | 'complete',
  data: any,
  context?: LogContext
) => {
  debugLogger.csvDebug(phase, data, context);
};

export const logAPICall = (
  method: string,
  url: string,
  data?: any,
  context?: LogContext
) => {
  debugLogger.apiTrace('REQUEST', { method, url, ...data }, context);
};

export const logAPIResponse = (
  status: number,
  data?: any,
  context?: LogContext
) => {
  debugLogger.apiTrace('RESPONSE', { status, ...data }, context);
};

export const logAPIError = (
  error: any,
  context?: LogContext
) => {
  debugLogger.apiTrace('ERROR', error, context);
};