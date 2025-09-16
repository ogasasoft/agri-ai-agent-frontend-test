// React Error Boundary with AI-powered diagnostics
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ClientErrorBuilder, logClientError } from '@/lib/client-error-details';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorDetails: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorDetails: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const context = {
      currentPage: window.location.pathname,
      userAction: 'component_render',
      componentName: this.getComponentName(errorInfo),
      browserInfo: {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href
      }
    };

    // AI判断型エラー分析
    const errorDetails = this.analyzeComponentError(error, errorInfo, context);

    // エラーログ記録
    logClientError('COMPONENT_ERROR', error, context);

    this.setState({
      errorInfo,
      errorDetails
    });
  }

  private getComponentName(errorInfo: ErrorInfo): string {
    const componentStack = errorInfo.componentStack;
    const match = componentStack.match(/in (\w+)/);
    return match ? match[1] : 'UnknownComponent';
  }

  private analyzeComponentError(error: Error, errorInfo: ErrorInfo, context: any) {
    const builder = new ClientErrorBuilder('コンポーネントエラーが発生しました', 'COMPONENT_CRASH');

    builder
      .setContext(context)
      .addProcessingStep('Component Rendering', 'failed', {
        error_name: error.name,
        error_message: error.message,
        component_stack: errorInfo.componentStack.split('\n').slice(0, 5) // 最初の5行のみ
      });

    // エラーの種類に応じた分析と提案
    const suggestions = this.generateErrorSuggestions(error, errorInfo);
    suggestions.forEach(suggestion => builder.addSuggestion(suggestion));

    // ユーザーアクション
    builder
      .addUserAction('ページを更新', 'refresh')
      .addUserAction('前のページに戻る', 'navigate', { url: 'javascript:history.back()' })
      .addUserAction('サポートに連絡', 'contact_support', {
        error: error.message,
        component: context.componentName
      });

    return builder.build();
  }

  private generateErrorSuggestions(error: Error, errorInfo: ErrorInfo): string[] {
    const suggestions: string[] = [];
    const errorMessage = error.message.toLowerCase();
    const componentStack = errorInfo.componentStack.toLowerCase();

    // 一般的なReactエラーパターンの分析
    if (errorMessage.includes('cannot read property') || errorMessage.includes('cannot read properties')) {
      suggestions.push('データの読み込みが完了していない可能性があります');
      suggestions.push('コンポーネントでnullチェックが不足している可能性があります');
    }

    if (errorMessage.includes('hydration')) {
      suggestions.push('サーバーサイドレンダリングとクライアントサイドの不整合が発生しています');
      suggestions.push('ブラウザを更新すると解決する場合があります');
    }

    if (errorMessage.includes('hooks')) {
      suggestions.push('React Hooksの使用方法に問題があります');
      suggestions.push('条件付きでHooksを呼び出している可能性があります');
    }

    if (errorMessage.includes('maximum update depth')) {
      suggestions.push('無限ループによる再レンダリングが発生しています');
      suggestions.push('useEffect の依存配列を確認してください');
    }

    if (componentStack.includes('form')) {
      suggestions.push('フォーム操作中にエラーが発生しました');
      suggestions.push('入力内容をクリアしてから再試行してください');
    }

    if (componentStack.includes('modal') || componentStack.includes('dialog')) {
      suggestions.push('モーダル表示中にエラーが発生しました');
      suggestions.push('モーダルを閉じてから再試行してください');
    }

    // ネットワーク関連
    if (!navigator.onLine) {
      suggestions.push('インターネット接続を確認してください');
    }

    // メモリ不足の可能性
    if (performance.memory && (performance.memory as any).usedJSHeapSize > 50000000) { // 50MB
      suggestions.push('ブラウザのメモリ使用量が多くなっています。他のタブを閉じてください');
    }

    return suggestions;
  }

  render() {
    if (this.state.hasError) {
      // カスタムfallbackが提供されている場合
      if (this.props.fallback && this.state.error && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo);
      }

      // デフォルトのエラー表示
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>

                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  システムエラーが発生しました
                </h3>

                {this.state.errorDetails && (
                  <>
                    <p className="mt-2 text-sm text-gray-600">
                      {this.state.errorDetails.message}
                    </p>

                    {this.state.errorDetails.suggestions && this.state.errorDetails.suggestions.length > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-md">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">解決方法:</h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                          {this.state.errorDetails.suggestions.map((suggestion: string, index: number) => (
                            <li key={index}>• {suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {this.state.errorDetails.user_actions && (
                      <div className="mt-6 space-y-2">
                        {this.state.errorDetails.user_actions.map((userAction: any, index: number) => (
                          <button
                            key={index}
                            onClick={() => this.handleUserAction(userAction)}
                            className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            {userAction.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4 text-left">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                      開発者向け詳細情報
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto max-h-48">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }

  private handleUserAction(userAction: any) {
    const { action, params } = userAction;

    switch (action) {
      case 'refresh':
        window.location.reload();
        break;

      case 'navigate':
        if (params?.url) {
          if (params.url === 'javascript:history.back()') {
            window.history.back();
          } else {
            window.location.href = params.url;
          }
        }
        break;

      case 'contact_support':
        const subject = encodeURIComponent('アプリケーションエラー報告');
        const body = encodeURIComponent(
          `エラーの詳細:\n\n` +
          `エラーメッセージ: ${params?.error || 'Unknown'}\n` +
          `コンポーネント: ${params?.component || 'Unknown'}\n` +
          `ページ: ${window.location.href}\n` +
          `ブラウザ: ${navigator.userAgent}\n` +
          `時刻: ${new Date().toISOString()}`
        );
        window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
        break;

      case 'retry':
        // エラー状態をリセットして再試行
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          errorDetails: null
        });
        break;
    }
  }
}