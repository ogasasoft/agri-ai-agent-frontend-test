// カスタムフックでエラーハンドリングを統一
'use client';

import { useCallback, useState } from 'react';
import { FormErrorBuilder, DataFetchErrorBuilder, logClientError } from '@/lib/client-error-details';

interface UseErrorHandlerOptions {
  componentName?: string;
  onError?: (error: any) => void;
  enableLogging?: boolean;
}

interface ErrorState {
  error: any | null;
  isError: boolean;
  errorDetails: any | null;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const { componentName = 'UnknownComponent', onError, enableLogging = true } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false,
    errorDetails: null
  });

  // フォームエラーハンドラー
  const handleFormError = useCallback((
    formName: string,
    error: any,
    formData?: Record<string, any>,
    type: 'validation' | 'submission' = 'submission'
  ) => {
    const context = {
      componentName,
      currentPage: window.location.pathname,
      userAction: 'form_submit',
      browserInfo: {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href
      }
    };

    let errorDetails;

    if (type === 'validation') {
      errorDetails = FormErrorBuilder.validationError(
        formName,
        error,
        formData || {},
        context
      );
    } else {
      errorDetails = FormErrorBuilder.submissionError(
        formName,
        error,
        formData || {},
        context
      );
    }

    if (enableLogging) {
      logClientError('FORM_ERROR', error, context);
    }

    setErrorState({
      error,
      isError: true,
      errorDetails
    });

    onError?.(error);

    return errorDetails;
  }, [componentName, onError, enableLogging]);

  // APIエラーハンドラー
  const handleApiError = useCallback((
    endpoint: string,
    error: any,
    additionalContext?: Record<string, any>
  ) => {
    const context = {
      componentName,
      currentPage: window.location.pathname,
      userAction: 'api_call',
      browserInfo: {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href
      },
      ...additionalContext
    };

    const errorDetails = DataFetchErrorBuilder.apiError(endpoint, error, context);

    if (enableLogging) {
      logClientError('API_ERROR', error, context);
    }

    setErrorState({
      error,
      isError: true,
      errorDetails
    });

    onError?.(error);

    return errorDetails;
  }, [componentName, onError, enableLogging]);

  // 汎用エラーハンドラー
  const handleError = useCallback((
    error: any,
    errorType: 'COMPONENT_ERROR' | 'NAVIGATION_ERROR' = 'COMPONENT_ERROR',
    additionalContext?: Record<string, any>
  ) => {
    const context = {
      componentName,
      currentPage: window.location.pathname,
      userAction: 'general_operation',
      browserInfo: {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href
      },
      ...additionalContext
    };

    if (enableLogging) {
      logClientError(errorType, error, context);
    }

    setErrorState({
      error,
      isError: true,
      errorDetails: {
        success: false,
        message: error.message || 'エラーが発生しました',
        error_code: 'GENERAL_ERROR',
        suggestions: ['ページを更新してください', 'しばらく時間をおいて再試行してください']
      }
    });

    onError?.(error);
  }, [componentName, onError, enableLogging]);

  // エラー状態をクリア
  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isError: false,
      errorDetails: null
    });
  }, []);

  // 再試行機能
  const retry = useCallback((retryFunction: () => void | Promise<void>) => {
    clearError();
    try {
      const result = retryFunction();
      if (result instanceof Promise) {
        result.catch((error) => {
          handleError(error);
        });
      }
    } catch (error) {
      handleError(error);
    }
  }, [clearError, handleError]);

  return {
    // エラー状態
    error: errorState.error,
    isError: errorState.isError,
    errorDetails: errorState.errorDetails,

    // エラーハンドラー
    handleFormError,
    handleApiError,
    handleError,

    // ユーティリティ
    clearError,
    retry
  };
};

// フォーム専用のエラーハンドリングフック
export const useFormErrorHandler = (formName: string, options: UseErrorHandlerOptions = {}) => {
  const errorHandler = useErrorHandler(options);

  const handleValidationError = useCallback((
    validationErrors: Record<string, string[]>,
    formData: Record<string, any>
  ) => {
    return errorHandler.handleFormError(formName, validationErrors, formData, 'validation');
  }, [errorHandler, formName]);

  const handleSubmissionError = useCallback((
    error: any,
    formData: Record<string, any>
  ) => {
    return errorHandler.handleFormError(formName, error, formData, 'submission');
  }, [errorHandler, formName]);

  return {
    ...errorHandler,
    handleValidationError,
    handleSubmissionError
  };
};

// API呼び出し専用のエラーハンドリングフック
export const useApiErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const errorHandler = useErrorHandler(options);

  const handleFetchError = useCallback(async (
    fetchFunction: () => Promise<any>,
    endpoint: string
  ) => {
    try {
      const result = await fetchFunction();
      errorHandler.clearError();
      return result;
    } catch (error) {
      errorHandler.handleApiError(endpoint, error);
      throw error;
    }
  }, [errorHandler]);

  return {
    ...errorHandler,
    handleFetchError
  };
};