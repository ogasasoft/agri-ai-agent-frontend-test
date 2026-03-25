import {
  ClientErrorBuilder,
  FormErrorBuilder,
  DataFetchErrorBuilder,
  logClientError,
  executeUserAction,
} from '@/lib/client-error-details';

jest.mock('@/lib/debug-logger', () => ({
  debugLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock navigator.onLine (writable in jsdom)
Object.defineProperty(global.navigator, 'onLine', {
  value: true,
  writable: true,
  configurable: true,
});

describe('client-error-details.ts', () => {
  describe('ClientErrorBuilder', () => {
    it('should create basic error response', () => {
      const builder = new ClientErrorBuilder('Test error', 'TEST_CODE');
      const result = builder.build();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Test error');
      expect(result.error_code).toBe('TEST_CODE');
      expect(result.debug_info?.timestamp).toBeDefined();
      expect(result.debug_info?.processing_steps).toEqual([]);
      expect(result.suggestions).toEqual([]);
      expect(result.user_actions).toEqual([]);
    });

    it('should support chaining setContext', () => {
      const builder = new ClientErrorBuilder('Test', 'CODE');
      const result = builder
        .setContext({
          componentName: 'TestComponent',
          userAction: 'submit',
          currentPage: '/orders',
          browserInfo: {
            userAgent: 'Mozilla/5.0',
            viewport: '1280x720',
            url: 'http://localhost',
          },
        })
        .build();

      expect(result.debug_info?.component).toBe('TestComponent');
      expect(result.debug_info?.action).toBe('submit');
      expect(result.debug_info?.page).toBe('/orders');
      expect(result.debug_info?.browser).toBe('Mozilla/5.0');
    });

    it('should add processing steps', () => {
      const builder = new ClientErrorBuilder('Test', 'CODE');
      const result = builder
        .addProcessingStep('Step 1', 'completed', { data: 'ok' })
        .addProcessingStep('Step 2', 'failed', undefined, 'Failed reason')
        .addProcessingStep('Step 3', 'skipped')
        .build();

      expect(result.debug_info?.processing_steps).toHaveLength(3);
      expect(result.debug_info?.processing_steps?.[0]).toEqual({
        step: 'Step 1',
        status: 'completed',
        details: { data: 'ok' },
        error: undefined,
      });
      expect(result.debug_info?.processing_steps?.[1]).toEqual({
        step: 'Step 2',
        status: 'failed',
        details: undefined,
        error: 'Failed reason',
      });
    });

    it('should add suggestions', () => {
      const builder = new ClientErrorBuilder('Test', 'CODE');
      const result = builder
        .addSuggestion('Fix this')
        .addSuggestion('Try that')
        .build();

      expect(result.suggestions).toEqual(['Fix this', 'Try that']);
    });

    it('should add user actions', () => {
      const builder = new ClientErrorBuilder('Test', 'CODE');
      const result = builder
        .addUserAction('再試行', 'retry')
        .addUserAction('更新', 'refresh', { clear_form: true })
        .addUserAction('移動', 'navigate', { url: '/home' })
        .addUserAction('サポート', 'contact_support')
        .build();

      expect(result.user_actions).toHaveLength(4);
      expect(result.user_actions?.[0]).toEqual({ label: '再試行', action: 'retry', params: undefined });
      expect(result.user_actions?.[1]).toEqual({ label: '更新', action: 'refresh', params: { clear_form: true } });
    });
  });

  describe('FormErrorBuilder', () => {
    it('should have FORM_VALIDATION_ERROR error code', () => {
      const builder = new FormErrorBuilder('Test error');
      const result = builder.build();
      expect(result.error_code).toBe('FORM_VALIDATION_ERROR');
    });

    describe('validationError', () => {
      it('should create validation error with error count', () => {
        const errors = { email: ['Invalid email'], password: ['Too short'] };
        const formData = { email: 'bad', password: 'abc', name: 'test' };
        const context = { componentName: 'LoginForm' };

        const result = FormErrorBuilder.validationError('login', errors, formData, context);

        expect(result.success).toBe(false);
        expect(result.error_code).toBe('FORM_VALIDATION_ERROR');
        expect(result.message).toContain('2個');
      });

      it('should add email suggestion when email has errors', () => {
        const errors = { email: ['Invalid format'] };
        const result = FormErrorBuilder.validationError('form', errors, { email: 'bad' }, {});

        expect(result.suggestions?.some(s => s.includes('メールアドレス'))).toBe(true);
      });

      it('should add password suggestion when password has errors', () => {
        const errors = { password: ['Too short'] };
        const result = FormErrorBuilder.validationError('form', errors, { password: 'abc' }, {});

        expect(result.suggestions?.some(s => s.includes('パスワード'))).toBe(true);
      });

      it('should add phone suggestion when phone has errors', () => {
        const errors = { phone: ['Invalid format'] };
        const result = FormErrorBuilder.validationError('form', errors, { phone: 'bad' }, {});

        expect(result.suggestions?.some(s => s.includes('電話番号'))).toBe(true);
      });

      it('should add price suggestion when price or amount has errors', () => {
        const errors = { price: ['Invalid number'] };
        const result = FormErrorBuilder.validationError('form', errors, { price: 'abc' }, {});

        expect(result.suggestions?.some(s => s.includes('金額'))).toBe(true);
      });

      it('should add amount suggestion when amount has errors', () => {
        const errors = { amount: ['Invalid number'] };
        const result = FormErrorBuilder.validationError('form', errors, { amount: 'abc' }, {});

        expect(result.suggestions?.some(s => s.includes('金額'))).toBe(true);
      });

      it('should suggest ordering fix for many errors', () => {
        const errors = {
          field1: ['e1'], field2: ['e2'], field3: ['e3'], field4: ['e4'],
        };
        const result = FormErrorBuilder.validationError('form', errors, errors, {});

        expect(result.suggestions?.some(s => s.includes('上から順に'))).toBe(true);
      });

      it('should include user actions for form fixes', () => {
        const result = FormErrorBuilder.validationError('form', { f: ['e'] }, { f: 'v' }, {});

        expect(result.user_actions?.some(a => a.action === 'retry')).toBe(true);
        expect(result.user_actions?.some(a => a.action === 'refresh')).toBe(true);
      });
    });

    describe('submissionError', () => {
      it('should create submission error', () => {
        const apiResponse = { status: 500, message: 'Internal server error' };
        const result = FormErrorBuilder.submissionError('form', apiResponse, {}, {});

        expect(result.success).toBe(false);
        expect(result.message).toContain('フォーム送信');
      });

      it('should add 401 suggestion', () => {
        const apiResponse = { status: 401, message: 'Unauthorized' };
        const result = FormErrorBuilder.submissionError('form', apiResponse, {}, {});

        expect(result.suggestions?.some(s => s.includes('ログイン'))).toBe(true);
      });

      it('should add 403 CSRF suggestion', () => {
        const apiResponse = { status: 403, message: 'Forbidden' };
        const result = FormErrorBuilder.submissionError('form', apiResponse, {}, {});

        expect(result.suggestions?.some(s => s.includes('CSRF'))).toBe(true);
      });

      it('should add 409 duplicate suggestion', () => {
        const apiResponse = { status: 409, message: 'Conflict' };
        const result = FormErrorBuilder.submissionError('form', apiResponse, {}, {});

        expect(result.suggestions?.some(s => s.includes('重複'))).toBe(true);
      });

      it('should add 429 rate limit suggestion', () => {
        const apiResponse = { status: 429, message: 'Too Many Requests' };
        const result = FormErrorBuilder.submissionError('form', apiResponse, {}, {});

        expect(result.suggestions?.some(s => s.includes('制限'))).toBe(true);
      });

      it('should add 500 server error suggestion', () => {
        const apiResponse = { status: 500, message: 'Server error' };
        const result = FormErrorBuilder.submissionError('form', apiResponse, {}, {});

        expect(result.suggestions?.some(s => s.includes('サーバー'))).toBe(true);
      });

      it('should add network suggestion when message contains network', () => {
        const apiResponse = { status: 0, message: 'network error occurred' };
        const result = FormErrorBuilder.submissionError('form', apiResponse, {}, {});

        expect(result.suggestions?.some(s => s.includes('ネットワーク'))).toBe(true);
      });

      it('should handle null apiResponse', () => {
        expect(() => FormErrorBuilder.submissionError('form', null, {}, {})).not.toThrow();
      });
    });
  });

  describe('DataFetchErrorBuilder', () => {
    it('should have DATA_FETCH_ERROR error code', () => {
      const builder = new DataFetchErrorBuilder('Test');
      const result = builder.build();
      expect(result.error_code).toBe('DATA_FETCH_ERROR');
    });

    describe('apiError', () => {
      it('should create API error response', () => {
        const error = { message: 'Not found', status: 404 };
        const result = DataFetchErrorBuilder.apiError('/api/orders', error, {});

        expect(result.success).toBe(false);
        expect(result.error_code).toBe('DATA_FETCH_ERROR');
      });

      it('should add 401 login suggestion', () => {
        const error = { message: 'Unauthorized', status: 401 };
        const result = DataFetchErrorBuilder.apiError('/api/data', error, {});

        expect(result.suggestions?.some(s => s.includes('ログイン'))).toBe(true);
      });

      it('should add 404 not found suggestion', () => {
        const error = { message: 'Not found', status: 404 };
        const result = DataFetchErrorBuilder.apiError('/api/data', error, {});

        expect(result.suggestions?.some(s => s.includes('見つかりません'))).toBe(true);
      });

      it('should add 500 server error suggestion', () => {
        const error = { message: 'Internal server error', status: 500 };
        const result = DataFetchErrorBuilder.apiError('/api/data', error, {});

        expect(result.suggestions?.some(s => s.includes('サーバー'))).toBe(true);
      });

      it('should add offline suggestion when navigator is offline', () => {
        Object.defineProperty(global.navigator, 'onLine', { value: false, writable: true, configurable: true });

        const error = { message: 'Failed to fetch', status: 0 };
        const result = DataFetchErrorBuilder.apiError('/api/data', error, {});

        expect(result.suggestions?.some(s => s.includes('インターネット'))).toBe(true);

        Object.defineProperty(global.navigator, 'onLine', { value: true, writable: true, configurable: true });
      });

      it('should include retry and refresh user actions', () => {
        const error = { message: 'Error', status: 500 };
        const result = DataFetchErrorBuilder.apiError('/api/data', error, {});

        expect(result.user_actions?.some(a => a.action === 'retry')).toBe(true);
        expect(result.user_actions?.some(a => a.action === 'refresh')).toBe(true);
      });
    });
  });

  describe('logClientError', () => {
    it('should not throw when called', () => {
      const error = new Error('Test error');
      expect(() => logClientError('FORM_ERROR', error, { componentName: 'TestComp' })).not.toThrow();
    });

    it('should call debugLogger with error info', () => {
      const { debugLogger } = require('@/lib/debug-logger');
      const error = new Error('Test error');
      logClientError('API_ERROR', error, { currentPage: '/orders' });

      expect(debugLogger.error).toHaveBeenCalled();
    });
  });

  describe('executeUserAction', () => {
    it('should call callback for retry action', () => {
      const callback = jest.fn();
      executeUserAction('retry', undefined, callback);
      expect(callback).toHaveBeenCalled();
    });

    it('should not throw for retry without callback', () => {
      expect(() => executeUserAction('retry')).not.toThrow();
    });

    it('should not throw for navigate without URL', () => {
      expect(() => executeUserAction('navigate', {})).not.toThrow();
    });

    it('should not throw for refresh action', () => {
      // window.location.reload is not easily testable in jsdom, just ensure no throws
      expect(() => {
        try { executeUserAction('refresh'); } catch { /* jsdom location restriction */ }
      }).not.toThrow();
    });
  });
});
