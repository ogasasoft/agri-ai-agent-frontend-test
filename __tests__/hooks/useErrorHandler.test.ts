/** @jest-environment jsdom */
// FILE: __tests__/hooks/useErrorHandler.test.ts
/**
 * Tests for useErrorHandler, useFormErrorHandler, and useApiErrorHandler hooks
 */

import { renderHook, act } from '@testing-library/react';
import { useErrorHandler, useFormErrorHandler, useApiErrorHandler } from '@/hooks/useErrorHandler';

// Mock client-error-details
jest.mock('@/lib/client-error-details', () => {
  const mockValidationResult = {
    success: false,
    message: 'フォーム検証エラー: 1個のフィールドに問題があります',
    error_code: 'FORM_VALIDATION_ERROR',
    suggestions: ['メールアドレスの形式を確認してください'],
    user_actions: [
      { label: '入力内容を修正', action: 'retry' },
      { label: 'フォームをクリア', action: 'refresh' },
    ],
  };

  const mockSubmissionResult = {
    success: false,
    message: 'フォーム送信に失敗しました',
    error_code: 'FORM_VALIDATION_ERROR',
    suggestions: ['再試行してください'],
    user_actions: [{ label: '再試行', action: 'retry' }],
  };

  const mockApiResult = {
    success: false,
    message: 'データの取得に失敗しました',
    error_code: 'DATA_FETCH_ERROR',
    suggestions: ['ページを更新してください'],
    user_actions: [{ label: '再読み込み', action: 'retry' }],
  };

  return {
    FormErrorBuilder: {
      validationError: jest.fn().mockReturnValue(mockValidationResult),
      submissionError: jest.fn().mockReturnValue(mockSubmissionResult),
    },
    DataFetchErrorBuilder: {
      apiError: jest.fn().mockReturnValue(mockApiResult),
    },
    logClientError: jest.fn(),
  };
});

// Mock browser globals - set up once before all tests
const mockPathname = '/test-page';
const mockHref = 'http://localhost/test-page';

beforeAll(() => {
  // Use delete + reassign to avoid "Cannot redefine property" in jsdom
  delete (window as any).location;
  (window as any).location = {
    pathname: mockPathname,
    href: mockHref,
  };

  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: 768, writable: true, configurable: true });

  try {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Test Agent',
      writable: true,
      configurable: true,
    });
  } catch {
    // navigator.userAgent may not be reconfigurable in all environments — ignore
  }
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useErrorHandler', () => {
  describe('Initial state', () => {
    it('starts with no error', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(result.current.error).toBeNull();
      expect(result.current.isError).toBe(false);
      expect(result.current.errorDetails).toBeNull();
    });

    it('provides all expected handler functions', () => {
      const { result } = renderHook(() => useErrorHandler());

      expect(typeof result.current.handleFormError).toBe('function');
      expect(typeof result.current.handleApiError).toBe('function');
      expect(typeof result.current.handleError).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.retry).toBe('function');
    });
  });

  describe('handleError', () => {
    it('sets error state when handleError is called', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('Test error');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.error).toBe(testError);
      expect(result.current.isError).toBe(true);
    });

    it('sets errorDetails with standard structure', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('Something went wrong');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.errorDetails).not.toBeNull();
      expect(result.current.errorDetails.success).toBe(false);
      expect(result.current.errorDetails.error_code).toBe('GENERAL_ERROR');
    });

    it('uses error.message in errorDetails', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('Specific error message');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.errorDetails.message).toBe('Specific error message');
    });

    it('uses default message when error has no message', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = {} as Error; // no message property

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.errorDetails.message).toBe('エラーが発生しました');
    });

    it('includes suggestions in errorDetails', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError(new Error('test'));
      });

      expect(result.current.errorDetails.suggestions).toEqual([
        'ページを更新してください',
        'しばらく時間をおいて再試行してください',
      ]);
    });

    it('accepts NAVIGATION_ERROR as error type', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('Navigation error');

      act(() => {
        result.current.handleError(testError, 'NAVIGATION_ERROR');
      });

      expect(result.current.isError).toBe(true);
    });

    it('calls onError callback when provided', () => {
      const onErrorMock = jest.fn();
      const { result } = renderHook(() => useErrorHandler({ onError: onErrorMock }));
      const testError = new Error('Callback test');

      act(() => {
        result.current.handleError(testError);
      });

      expect(onErrorMock).toHaveBeenCalledWith(testError);
    });

    it('calls logClientError when enableLogging is true (default)', () => {
      const { logClientError } = require('@/lib/client-error-details');
      const { result } = renderHook(() => useErrorHandler({ componentName: 'TestComponent' }));

      act(() => {
        result.current.handleError(new Error('Logged error'));
      });

      expect(logClientError).toHaveBeenCalled();
    });

    it('does not call logClientError when enableLogging is false', () => {
      const { logClientError } = require('@/lib/client-error-details');
      const { result } = renderHook(() =>
        useErrorHandler({ enableLogging: false })
      );

      act(() => {
        result.current.handleError(new Error('Unlogged error'));
      });

      expect(logClientError).not.toHaveBeenCalled();
    });
  });

  describe('handleFormError', () => {
    it('sets error state for form validation error', () => {
      const { FormErrorBuilder } = require('@/lib/client-error-details');
      const { result } = renderHook(() => useErrorHandler());
      const formError = { email: ['Invalid email format'] };

      act(() => {
        result.current.handleFormError('login-form', formError, { email: 'bad' }, 'validation');
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(formError);
      expect(FormErrorBuilder.validationError).toHaveBeenCalledWith(
        'login-form',
        formError,
        { email: 'bad' },
        expect.any(Object)
      );
    });

    it('sets error state for form submission error', () => {
      const { FormErrorBuilder } = require('@/lib/client-error-details');
      const { result } = renderHook(() => useErrorHandler());
      const submissionError = { status: 500, message: 'Server error' };

      act(() => {
        result.current.handleFormError('contact-form', submissionError, { name: 'test' }, 'submission');
      });

      expect(result.current.isError).toBe(true);
      expect(FormErrorBuilder.submissionError).toHaveBeenCalledWith(
        'contact-form',
        submissionError,
        { name: 'test' },
        expect.any(Object)
      );
    });

    it('defaults to submission type when type not specified', () => {
      const { FormErrorBuilder } = require('@/lib/client-error-details');
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleFormError('test-form', new Error('Oops'), {});
      });

      expect(FormErrorBuilder.submissionError).toHaveBeenCalled();
    });

    it('returns the error details from the builder', () => {
      const { result } = renderHook(() => useErrorHandler());
      let returnValue: any;

      act(() => {
        returnValue = result.current.handleFormError('test-form', new Error('test'), {}, 'validation');
      });

      expect(returnValue).toBeDefined();
      expect(returnValue.error_code).toBe('FORM_VALIDATION_ERROR');
    });

    it('sets errorDetails on the state', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleFormError('test-form', new Error('test'), {}, 'validation');
      });

      expect(result.current.errorDetails).not.toBeNull();
      expect(result.current.errorDetails.error_code).toBe('FORM_VALIDATION_ERROR');
    });
  });

  describe('handleApiError', () => {
    it('sets error state for API errors', () => {
      const { DataFetchErrorBuilder } = require('@/lib/client-error-details');
      const { result } = renderHook(() => useErrorHandler());
      const apiError = new Error('Network error');
      (apiError as any).status = 500;

      act(() => {
        result.current.handleApiError('/api/orders', apiError);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(apiError);
      expect(DataFetchErrorBuilder.apiError).toHaveBeenCalledWith(
        '/api/orders',
        apiError,
        expect.any(Object)
      );
    });

    it('sets errorDetails from DataFetchErrorBuilder', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleApiError('/api/test', new Error('API failed'));
      });

      expect(result.current.errorDetails).not.toBeNull();
      expect(result.current.errorDetails.error_code).toBe('DATA_FETCH_ERROR');
    });

    it('merges additional context into the error context', () => {
      const { DataFetchErrorBuilder } = require('@/lib/client-error-details');
      const { result } = renderHook(() => useErrorHandler({ componentName: 'OrdersPage' }));

      act(() => {
        result.current.handleApiError('/api/orders', new Error('Fail'), { orderId: '123' });
      });

      expect(DataFetchErrorBuilder.apiError).toHaveBeenCalledWith(
        '/api/orders',
        expect.any(Error),
        expect.objectContaining({ orderId: '123', componentName: 'OrdersPage' })
      );
    });

    it('returns the error details', () => {
      const { result } = renderHook(() => useErrorHandler());
      let returnValue: any;

      act(() => {
        returnValue = result.current.handleApiError('/api/test', new Error('test'));
      });

      expect(returnValue).toBeDefined();
      expect(returnValue.message).toBe('データの取得に失敗しました');
    });
  });

  describe('clearError', () => {
    it('clears error state after an error was set', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError(new Error('to be cleared'));
      });

      expect(result.current.isError).toBe(true);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isError).toBe(false);
      expect(result.current.errorDetails).toBeNull();
    });

    it('does nothing when there is no error to clear', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isError).toBe(false);
    });
  });

  describe('retry', () => {
    it('clears error and calls the retry function', () => {
      const { result } = renderHook(() => useErrorHandler());
      const retryFn = jest.fn();

      act(() => {
        result.current.handleError(new Error('error before retry'));
      });

      expect(result.current.isError).toBe(true);

      act(() => {
        result.current.retry(retryFn);
      });

      expect(retryFn).toHaveBeenCalledTimes(1);
      expect(result.current.isError).toBe(false);
    });

    it('handles async retry function', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const asyncRetryFn = jest.fn().mockResolvedValue('success');

      act(() => {
        result.current.handleError(new Error('error'));
      });

      await act(async () => {
        result.current.retry(asyncRetryFn);
      });

      expect(asyncRetryFn).toHaveBeenCalledTimes(1);
    });

    it('handles errors in sync retry function', () => {
      const { result } = renderHook(() => useErrorHandler());
      const failingRetryFn = jest.fn().mockImplementation(() => {
        throw new Error('Retry also failed');
      });

      act(() => {
        result.current.handleError(new Error('original error'));
      });

      act(() => {
        result.current.retry(failingRetryFn);
      });

      // After retry function throws, error state should be set again
      expect(result.current.isError).toBe(true);
    });

    it('handles rejected async retry function', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const rejectingFn = jest.fn().mockRejectedValue(new Error('Async retry failed'));

      act(() => {
        result.current.handleError(new Error('original error'));
      });

      await act(async () => {
        result.current.retry(rejectingFn);
        // Wait a tick for the promise rejection to be handled
        await Promise.resolve();
      });

      expect(result.current.isError).toBe(true);
    });
  });

  describe('componentName option', () => {
    it('uses provided componentName in context', () => {
      const { logClientError } = require('@/lib/client-error-details');
      const { result } = renderHook(() =>
        useErrorHandler({ componentName: 'MySpecialComponent' })
      );

      act(() => {
        result.current.handleError(new Error('test'));
      });

      expect(logClientError).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error),
        expect.objectContaining({ componentName: 'MySpecialComponent' })
      );
    });

    it('defaults to UnknownComponent when no componentName provided', () => {
      const { logClientError } = require('@/lib/client-error-details');
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError(new Error('test'));
      });

      expect(logClientError).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error),
        expect.objectContaining({ componentName: 'UnknownComponent' })
      );
    });
  });
});

describe('useFormErrorHandler', () => {
  describe('Initial state', () => {
    it('starts with no error', () => {
      const { result } = renderHook(() => useFormErrorHandler('test-form'));

      expect(result.current.error).toBeNull();
      expect(result.current.isError).toBe(false);
    });

    it('provides handleValidationError and handleSubmissionError', () => {
      const { result } = renderHook(() => useFormErrorHandler('test-form'));

      expect(typeof result.current.handleValidationError).toBe('function');
      expect(typeof result.current.handleSubmissionError).toBe('function');
    });

    it('also provides base hook functions', () => {
      const { result } = renderHook(() => useFormErrorHandler('test-form'));

      expect(typeof result.current.handleError).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.retry).toBe('function');
    });
  });

  describe('handleValidationError', () => {
    it('calls FormErrorBuilder.validationError with form name', () => {
      const { FormErrorBuilder } = require('@/lib/client-error-details');
      const { result } = renderHook(() => useFormErrorHandler('login-form'));
      const errors = { email: ['Required'], password: ['Too short'] };
      const formData = { email: '', password: 'abc' };

      act(() => {
        result.current.handleValidationError(errors, formData);
      });

      expect(FormErrorBuilder.validationError).toHaveBeenCalledWith(
        'login-form',
        errors,
        formData,
        expect.any(Object)
      );
    });

    it('sets isError to true after validation error', () => {
      const { result } = renderHook(() => useFormErrorHandler('my-form'));

      act(() => {
        result.current.handleValidationError({ field: ['error'] }, {});
      });

      expect(result.current.isError).toBe(true);
    });

    it('returns error details', () => {
      const { result } = renderHook(() => useFormErrorHandler('my-form'));
      let details: any;

      act(() => {
        details = result.current.handleValidationError({ field: ['error'] }, {});
      });

      expect(details).toBeDefined();
      expect(details.error_code).toBe('FORM_VALIDATION_ERROR');
    });
  });

  describe('handleSubmissionError', () => {
    it('calls FormErrorBuilder.submissionError with form name', () => {
      const { FormErrorBuilder } = require('@/lib/client-error-details');
      const { result } = renderHook(() => useFormErrorHandler('register-form'));
      const error = { status: 409, message: 'Conflict' };
      const formData = { username: 'test' };

      act(() => {
        result.current.handleSubmissionError(error, formData);
      });

      expect(FormErrorBuilder.submissionError).toHaveBeenCalledWith(
        'register-form',
        error,
        formData,
        expect.any(Object)
      );
    });

    it('sets isError to true after submission error', () => {
      const { result } = renderHook(() => useFormErrorHandler('submit-form'));

      act(() => {
        result.current.handleSubmissionError(new Error('Submit failed'), {});
      });

      expect(result.current.isError).toBe(true);
    });
  });

  describe('Options forwarding', () => {
    it('passes options to underlying useErrorHandler', () => {
      const onErrorMock = jest.fn();
      const { result } = renderHook(() =>
        useFormErrorHandler('test-form', { onError: onErrorMock, componentName: 'FormComp' })
      );
      const error = new Error('Form error');

      act(() => {
        result.current.handleSubmissionError(error, {});
      });

      expect(onErrorMock).toHaveBeenCalledWith(error);
    });
  });
});

describe('useApiErrorHandler', () => {
  describe('Initial state', () => {
    it('starts with no error', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      expect(result.current.error).toBeNull();
      expect(result.current.isError).toBe(false);
    });

    it('provides handleFetchError function', () => {
      const { result } = renderHook(() => useApiErrorHandler());

      expect(typeof result.current.handleFetchError).toBe('function');
    });
  });

  describe('handleFetchError', () => {
    it('returns result and clears error when fetch succeeds', async () => {
      const { result } = renderHook(() => useApiErrorHandler());

      // First set an error to confirm it gets cleared on success
      act(() => {
        result.current.handleError(new Error('previous error'));
      });
      expect(result.current.isError).toBe(true);

      const fetchFn = jest.fn().mockResolvedValue({ data: 'success' });

      await act(async () => {
        const res = await result.current.handleFetchError(fetchFn, '/api/test');
        expect(res).toEqual({ data: 'success' });
      });

      expect(result.current.isError).toBe(false);
    });

    it('sets error state and rethrows when fetch fails', async () => {
      const { result } = renderHook(() => useApiErrorHandler());
      const fetchError = new Error('Network failed');
      const fetchFn = jest.fn().mockRejectedValue(fetchError);

      await act(async () => {
        try {
          await result.current.handleFetchError(fetchFn, '/api/orders');
        } catch (e) {
          expect(e).toBe(fetchError);
        }
      });

      expect(result.current.isError).toBe(true);
    });

    it('calls DataFetchErrorBuilder.apiError on failure', async () => {
      const { DataFetchErrorBuilder } = require('@/lib/client-error-details');
      const { result } = renderHook(() => useApiErrorHandler());
      const fetchFn = jest.fn().mockRejectedValue(new Error('API down'));

      await act(async () => {
        try {
          await result.current.handleFetchError(fetchFn, '/api/data');
        } catch (e) {
          // expected
        }
      });

      expect(DataFetchErrorBuilder.apiError).toHaveBeenCalledWith(
        '/api/data',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('calls the fetch function with the provided fetchFn', async () => {
      const { result } = renderHook(() => useApiErrorHandler());
      const fetchFn = jest.fn().mockResolvedValue({ orders: [] });

      await act(async () => {
        await result.current.handleFetchError(fetchFn, '/api/orders');
      });

      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Options forwarding', () => {
    it('forwards componentName to underlying handler', () => {
      const { DataFetchErrorBuilder } = require('@/lib/client-error-details');
      const { result } = renderHook(() =>
        useApiErrorHandler({ componentName: 'OrdersPage' })
      );

      act(() => {
        result.current.handleApiError('/api/orders', new Error('fail'));
      });

      expect(DataFetchErrorBuilder.apiError).toHaveBeenCalledWith(
        '/api/orders',
        expect.any(Error),
        expect.objectContaining({ componentName: 'OrdersPage' })
      );
    });
  });
});
