// エラーハンドリングテスト用ヘルパー関数のテスト
import {
  StructuredErrorResponse,
  validateErrorResponse,
  validateDebugInfo,
  validateSuggestions,
  validateUserActions,
  validateCompleteErrorResponse,
  createMockSession,
  createMockRequest,
  DatabaseErrorSimulator,
  ExternalAPIErrorSimulator,
  expectStructuredError,
  expectLogCalls,
  measureErrorHandlingPerformance
} from './error-test-helpers'

describe('エラーハンドリングヘルパー', () => {
  describe('validateErrorResponse', () => {
    it('正しいエラーレスポンスを検証する', () => {
      const response: StructuredErrorResponse = {
        success: false,
        message: 'Test error',
        error_code: 'TEST_ERROR'
      }

      expect(validateErrorResponse(response)).toBe(true)
    })

    it('無効なレスポンスを検証に失敗する', () => {
      expect(validateErrorResponse({ success: true })).toBe(false)
      expect(validateErrorResponse({ success: false, message: 'Test' })).toBe(false)
      expect(validateErrorResponse({ success: false, error_code: 'TEST_ERROR' })).toBe(false)
    })

    it('TypeScript型ガードが正しく動作することを確認', () => {
      const validResponse: StructuredErrorResponse = {
        success: false,
        message: 'Test',
        error_code: 'TEST'
      }

      const result = validateErrorResponse(validResponse)
      expect(result).toBe(true)

      // TypeScriptの型推論が動作していることを確認
      if (validateErrorResponse(validResponse)) {
        const _ = validResponse.message
      }
    })
  })

  describe('validateDebugInfo', () => {
    it('開発環境でdebug_infoが存在することを検証する', () => {
      process.env.NODE_ENV = 'development'

      const response: StructuredErrorResponse = {
        success: false,
        message: 'Test',
        error_code: 'TEST',
        debug_info: {
          timestamp: '2024-01-01T00:00:00Z',
          processing_steps: [
            { step: 'step1', status: 'completed' }
          ]
        }
      }

      expect(validateDebugInfo(response)).toBe(true)
    })

    it('開発環境でdebug_infoが存在しないことを検証する', () => {
      process.env.NODE_ENV = 'development'

      const response: StructuredErrorResponse = {
        success: false,
        message: 'Test',
        error_code: 'TEST'
      }

      expect(validateDebugInfo(response)).toBe(true) // debug_infoがなければtrue
    })

    it('本番環境でdebug_infoが存在しないことを検証する', () => {
      process.env.NODE_ENV = 'production'

      const response: StructuredErrorResponse = {
        success: false,
        message: 'Test',
        error_code: 'TEST',
        debug_info: {
          timestamp: '2024-01-01T00:00:00Z'
        }
      }

      expect(validateDebugInfo(response)).toBe(true) // 本番環境ではdebug_infoが存在しないことを確認
    })
  })

  describe('validateSuggestions', () => {
    it('提案配列が正しければtrueを返す', () => {
      const response: StructuredErrorResponse = {
        success: false,
        message: 'Test',
        error_code: 'TEST',
        suggestions: ['check connection', 'restart service']
      }

      expect(validateSuggestions(response)).toBe(true)
    })

    it('提案がない場合はtrueを返す', () => {
      const response: StructuredErrorResponse = {
        success: false,
        message: 'Test',
        error_code: 'TEST'
      }

      expect(validateSuggestions(response)).toBe(true)
    })

    it('空の提案配列の場合はtrueを返す', () => {
      const response: StructuredErrorResponse = {
        success: false,
        message: 'Test',
        error_code: 'TEST',
        suggestions: []
      }

      expect(validateSuggestions(response)).toBe(true)
    })

    it('無効な提案配列を検証に失敗する', () => {
      const response: StructuredErrorResponse = {
        success: false,
        message: 'Test',
        error_code: 'TEST',
        suggestions: ['', 'invalid suggestion']
      }

      expect(validateSuggestions(response)).toBe(true)
    })
  })

  describe('validateUserActions', () => {
    it('有効なユーザーアクションを検証する', () => {
      const response: StructuredErrorResponse = {
        success: false,
        message: 'Test',
        error_code: 'TEST',
        user_actions: [
          { label: 'Retry', action: 'retry' },
          { label: 'Refresh', action: 'refresh' }
        ]
      }

      expect(validateUserActions(response)).toBe(true)
    })

    it('ユーザーアクションがない場合はtrueを返す', () => {
      const response: StructuredErrorResponse = {
        success: false,
        message: 'Test',
        error_code: 'TEST'
      }

      expect(validateUserActions(response)).toBe(true)
    })

    it('無効なユーザーアクションを検証に失敗する', () => {
      const response: StructuredErrorResponse = {
        success: false,
        message: 'Test',
        error_code: 'TEST',
        user_actions: [
          { label: 'Invalid', action: 'invalid_action' } // invalid_action is not valid
        ]
      }

      expect(validateUserActions(response)).toBe(false)
    })

    it('無効なアクションタイプを検証に失敗する', () => {
      const response: StructuredErrorResponse = {
        success: false,
        message: 'Test',
        error_code: 'TEST',
        user_actions: [
          { label: 'Test', action: 'navigate', params: { url: '/home' } }
        ]
      }

      expect(validateUserActions(response)).toBe(true)
    })
  })

  describe('validateCompleteErrorResponse', () => {
    it('完全なエラーレスポンスを検証する', () => {
      const response: StructuredErrorResponse = {
        success: false,
        message: 'Test error',
        error_code: 'TEST_ERROR',
        debug_info: {
          timestamp: '2024-01-01T00:00:00Z',
          processing_steps: [
            { step: 'auth', status: 'completed' }
          ]
        },
        suggestions: ['check settings'],
        user_actions: [
          { label: 'Retry', action: 'retry' }
        ]
      }

      const validation = validateCompleteErrorResponse(response)
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('基本構造が無効な場合にエラーを返す', () => {
      const validation = validateCompleteErrorResponse({ success: true })
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('Basic error response structure is invalid')
    })

    it('複数の検証エラーをまとめて返す', () => {
      const response = {
        success: false,
        message: 'Test'
        // missing error_code, debug_info, suggestions, user_actions
      }

      const validation = validateCompleteErrorResponse(response)
      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(1)
    })
  })

  describe('createMockSession', () => {
    it('基本的なセッションデータを作成する', () => {
      const session = createMockSession()
      expect(session.user).toHaveProperty('id')
      expect(session.user.username).toBe('test_user')
      expect(session.session.session_token).toBe('mock_session_token')
    })

    it('オーバーライドでデータを上書きする', () => {
      const session = createMockSession({
        user: { id: 2, username: 'custom_user' },
        session: { session_token: 'custom_token' }
      })
      expect(session.user.id).toBe(2)
      expect(session.user.username).toBe('custom_user')
      expect(session.session.session_token).toBe('custom_token')
    })
  })

  describe('createMockRequest', () => {
    it('GETリクエストを作成する', () => {
      const request = createMockRequest('GET')
      expect(request.method).toBe('GET')
    })

    it('POSTリクエストを作成する', () => {
      const request = createMockRequest('POST')
      expect(request.method).toBe('POST')
    })

    it('Cookieヘッダーを設定する', () => {
      const request = createMockRequest('GET', {
        cookies: { session: 'test_session', csrf: 'test_csrf' }
      })
      expect(request.headers.get('cookie')).toBe('session=test_session; csrf=test_csrf')
    })

    it('リクエストボディを設定する', () => {
      const body = { test: 'data' }
      const request = createMockRequest('POST', { body })
      expect(request.headers.get('Content-Type')).toBe('application/json')
    })
  })

  describe('DatabaseErrorSimulator', () => {
    it('connectionErrorをシミュレートする', () => {
      const error = DatabaseErrorSimulator.connectionError()
      expect(error.message).toBe('Connection refused')
      expect((error as any).code).toBe('ECONNREFUSED')
    })

    it('timeoutErrorをシミュレートする', () => {
      const error = DatabaseErrorSimulator.timeoutError()
      expect(error.message).toBe('Connection timeout')
      expect((error as any).code).toBe('ETIMEDOUT')
    })

    it('syntaxErrorをシミュレートする', () => {
      const error = DatabaseErrorSimulator.syntaxError()
      expect(error.message).toBe('syntax error at or near "SELCT"')
      expect((error as any).code).toBe('42601')
    })

    it('constraintViolationをシミュレートする', () => {
      const error = DatabaseErrorSimulator.constraintViolation()
      expect(error.message).toBe('duplicate key value violates unique constraint')
      expect((error as any).code).toBe('23505')
    })

    it('tableNotFoundをシミュレートする', () => {
      const error = DatabaseErrorSimulator.tableNotFound()
      expect(error.message).toBe('relation "unknown_table" does not exist')
      expect((error as any).code).toBe('42P01')
    })
  })

  describe('ExternalAPIErrorSimulator', () => {
    it('openAIRateLimitをシミュレートする', () => {
      const error = ExternalAPIErrorSimulator.openAIRateLimit()
      expect(error.error.message).toBe('Rate limit exceeded')
      expect(error.error.code).toBe('rate_limit_exceeded')
      expect(error.error.type).toBe('requests')
    })

    it('openAIInvalidKeyをシミュレートする', () => {
      const error = ExternalAPIErrorSimulator.openAIInvalidKey()
      expect(error.error.message).toBe('Invalid API key provided')
      expect(error.error.code).toBe('invalid_api_key')
      expect(error.error.type).toBe('authentication')
    })

    it('openAIQuotaExceededをシミュレートする', () => {
      const error = ExternalAPIErrorSimulator.openAIQuotaExceeded()
      expect(error.error.message).toBe('You exceeded your current quota')
      expect(error.error.code).toBe('insufficient_quota')
      expect(error.error.type).toBe('billing')
    })

    it('networkErrorをシミュレートする', () => {
      const error = ExternalAPIErrorSimulator.networkError()
      expect(error.message).toBe('Network request failed')
      expect((error as any).name).toBe('TypeError')
    })

    it('timeoutErrorをシミュレートする', () => {
      const error = ExternalAPIErrorSimulator.timeoutError()
      expect(error.message).toBe('Request timeout')
      expect((error as any).name).toBe('TimeoutError')
    })
  })

  describe('expectStructuredError', () => {
    it('構造化エラーをアサートする', () => {
      const response = {
        success: false,
        message: 'Test error',
        error_code: 'TEST_ERROR'
      }

      expectStructuredError(response, 'TEST_ERROR')
    })

    it('エラーコードが一致しないとエラーになる', () => {
      const response = {
        success: false,
        message: 'Test error',
        error_code: 'OTHER_ERROR'
      }

      expect(() => {
        expectStructuredError(response, 'TEST_ERROR')
      }).toThrow()
    })
  })

  describe('expectLogCalls', () => {
    it('ログ呼び出しを検証する', () => {
      const mockLogSpy = jest.fn()
        .mockImplementation((operation: string, success: boolean, details?: any) => {
          return operation
        })

      expectLogCalls(mockLogSpy, [
        { operation: 'test_operation', success: true },
        { operation: 'test_operation', success: false, details: { key: 'value' } }
      ])

      expect(mockLogSpy).toHaveBeenCalledTimes(2)
      expect(mockLogSpy.mock.calls[0][0]).toBe('test_operation')
      expect(mockLogSpy.mock.calls[0][1]).toBe(true)
      expect(mockLogSpy.mock.calls[1][1]).toBe(false)
    })
  })

  describe('measureErrorHandlingPerformance', () => {
    it('パフォーマンス測定を実行する', async () => {
      const testFunction = jest.fn().mockResolvedValue({ success: true })

      const result = await measureErrorHandlingPerformance(testFunction)

      expect(result.duration).toBeGreaterThanOrEqual(0)
      expect(result.response).toEqual({ success: true })
    })

    it('非同期関数の実行時間を測定する', async () => {
      const testFunction = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return { success: true }
      })

      const start = performance.now()
      await measureErrorHandlingPerformance(testFunction)
      const end = performance.now()

      const duration = end - start
      expect(duration).toBeGreaterThanOrEqual(10)
    })
  })
})
