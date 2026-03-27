// FILE: __tests__/lib/debug-logger.test.ts

// Helper to load a fresh DebugLogger with specific env settings
function loadFreshLogger(debugMode: boolean) {
  // Save and override env
  const originalNodeEnv = process.env.NODE_ENV
  const originalDebugMode = process.env.DEBUG_MODE

  if (debugMode) {
    process.env.DEBUG_MODE = 'true'
  } else {
    process.env.DEBUG_MODE = 'false'
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true, writable: true })
  }

  jest.resetModules()
  const mod = require('../../src/lib/debug-logger')

  // Restore env
  Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, configurable: true, writable: true })
  process.env.DEBUG_MODE = originalDebugMode

  return mod
}

describe('debug-logger.ts', () => {
  let consoleSpy: {
    log: jest.SpyInstance
    warn: jest.SpyInstance
    error: jest.SpyInstance
  }

  beforeEach(() => {
    consoleSpy = {
      log: jest.spyOn(console, 'log').mockImplementation(() => {}),
      warn: jest.spyOn(console, 'warn').mockImplementation(() => {}),
      error: jest.spyOn(console, 'error').mockImplementation(() => {})
    }
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('DebugLogger', () => {
    describe('debug()', () => {
      it('should call console.log when DEBUG_MODE is true', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        debugLogger.debug('test debug message')

        expect(consoleSpy.log).toHaveBeenCalled()
        const logCall = consoleSpy.log.mock.calls[0][0]
        expect(logCall).toContain('DEBUG')
        expect(logCall).toContain('test debug message')
      })

      it('should not call console.log when debug mode is disabled', () => {
        const { debugLogger } = loadFreshLogger(false)
        consoleSpy.log.mockClear()

        debugLogger.debug('should not be logged')

        expect(consoleSpy.log).not.toHaveBeenCalled()
      })

      it('should log data separately when data is provided', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        debugLogger.debug('test message', { someData: 123 })

        expect(consoleSpy.log).toHaveBeenCalledTimes(2)
        expect(consoleSpy.log).toHaveBeenCalledWith('📊 Data:', { someData: 123 })
      })

      it('should include context in log output when context is provided', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const context = { userId: 'user-1', apiRoute: '/api/test' }
        debugLogger.debug('test message with context', undefined, context)

        expect(consoleSpy.log).toHaveBeenCalledTimes(1)
        const logCall = consoleSpy.log.mock.calls[0][0]
        expect(logCall).toContain('DEBUG')
        expect(logCall).toContain('test message with context')
      })

      it('should not log data when data is undefined', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        debugLogger.debug('just a message')

        expect(consoleSpy.log).toHaveBeenCalledTimes(1)
      })
    })

    describe('info()', () => {
      it('should call console.log when DEBUG_MODE is true', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        debugLogger.info('test info message')

        expect(consoleSpy.log).toHaveBeenCalled()
        const logCall = consoleSpy.log.mock.calls[0][0]
        expect(logCall).toContain('INFO')
        expect(logCall).toContain('test info message')
      })

      it('should not call console.log when debug mode is disabled', () => {
        const { debugLogger } = loadFreshLogger(false)
        consoleSpy.log.mockClear()

        debugLogger.info('should not appear')

        expect(consoleSpy.log).not.toHaveBeenCalled()
      })

      it('should log data separately when data is provided in debug mode', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        debugLogger.info('info with data', { count: 42 })

        expect(consoleSpy.log).toHaveBeenCalledTimes(2)
        expect(consoleSpy.log).toHaveBeenCalledWith('📊 Data:', { count: 42 })
      })

      it('should accept optional context parameter', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const context = { sessionId: 'sess-1' }
        debugLogger.info('info with context', undefined, context)

        expect(consoleSpy.log).toHaveBeenCalledTimes(1)
      })
    })

    describe('warn()', () => {
      it('should always call console.warn regardless of debug mode', () => {
        // Import from the module-level (debug mode irrelevant for warn)
        jest.resetModules()
        const { debugLogger } = require('../../src/lib/debug-logger')
        consoleSpy.warn.mockClear()

        debugLogger.warn('test warning message')

        expect(consoleSpy.warn).toHaveBeenCalled()
        const warnCall = consoleSpy.warn.mock.calls[0][0]
        expect(warnCall).toContain('WARN')
        expect(warnCall).toContain('test warning message')
      })

      it('should call console.warn even when DEBUG_MODE is false', () => {
        const { debugLogger } = loadFreshLogger(false)
        consoleSpy.warn.mockClear()

        debugLogger.warn('warning in production')

        expect(consoleSpy.warn).toHaveBeenCalled()
      })

      it('should log data separately via console.warn when data is provided', () => {
        jest.resetModules()
        const { debugLogger } = require('../../src/lib/debug-logger')
        consoleSpy.warn.mockClear()

        debugLogger.warn('warning with data', { errorCode: 42 })

        expect(consoleSpy.warn).toHaveBeenCalledTimes(2)
        expect(consoleSpy.warn).toHaveBeenCalledWith('📊 Data:', { errorCode: 42 })
      })

      it('should include context in warn output', () => {
        jest.resetModules()
        const { debugLogger } = require('../../src/lib/debug-logger')
        consoleSpy.warn.mockClear()

        const context = { userId: 'user-1', operation: 'UPDATE' }
        debugLogger.warn('contextual warning', undefined, context)

        expect(consoleSpy.warn).toHaveBeenCalledTimes(1)
        const warnCall = consoleSpy.warn.mock.calls[0][0]
        expect(warnCall).toContain('WARN')
      })
    })

    describe('error()', () => {
      it('should always call console.error regardless of debug mode', () => {
        jest.resetModules()
        const { debugLogger } = require('../../src/lib/debug-logger')
        consoleSpy.error.mockClear()

        debugLogger.error('test error message')

        expect(consoleSpy.error).toHaveBeenCalled()
        const errorCall = consoleSpy.error.mock.calls[0][0]
        expect(errorCall).toContain('ERROR')
        expect(errorCall).toContain('test error message')
      })

      it('should call console.error even when debug mode is disabled', () => {
        const { debugLogger } = loadFreshLogger(false)
        consoleSpy.error.mockClear()

        debugLogger.error('error in production')

        expect(consoleSpy.error).toHaveBeenCalled()
      })

      it('should log error details when error object is provided', () => {
        jest.resetModules()
        const { debugLogger } = require('../../src/lib/debug-logger')
        consoleSpy.error.mockClear()

        const err = new Error('Something went wrong')
        // Remove stack to avoid the third call
        delete (err as any).stack
        debugLogger.error('an error occurred', err)

        expect(consoleSpy.error).toHaveBeenCalledTimes(2)
        expect(consoleSpy.error).toHaveBeenCalledWith('📊 Error Details:', err)
      })

      it('should log stack trace when error has a stack', () => {
        jest.resetModules()
        const { debugLogger } = require('../../src/lib/debug-logger')
        consoleSpy.error.mockClear()

        const err = new Error('Error with stack')
        err.stack = 'Error: Error with stack\n    at Test.run (test.ts:1:1)'

        debugLogger.error('error with stack', err)

        expect(consoleSpy.error).toHaveBeenCalledTimes(3)
        expect(consoleSpy.error).toHaveBeenCalledWith('📚 Stack Trace:', err.stack)
      })

      it('should handle error without stack trace', () => {
        jest.resetModules()
        const { debugLogger } = require('../../src/lib/debug-logger')
        consoleSpy.error.mockClear()

        const errWithoutStack = { message: 'no stack error' }
        debugLogger.error('error without stack', errWithoutStack)

        // Should log the formatted message and error details, but NOT stack trace
        expect(consoleSpy.error).toHaveBeenCalledTimes(2)
        expect(consoleSpy.error).toHaveBeenCalledWith('📊 Error Details:', errWithoutStack)
      })

      it('should include context in error output', () => {
        jest.resetModules()
        const { debugLogger } = require('../../src/lib/debug-logger')
        consoleSpy.error.mockClear()

        const context = { userId: 'user-1', apiRoute: '/api/orders' }
        debugLogger.error('error with context', undefined, context)

        expect(consoleSpy.error).toHaveBeenCalledTimes(1)
        const errorCall = consoleSpy.error.mock.calls[0][0]
        expect(errorCall).toContain('ERROR')
        expect(errorCall).toContain('error with context')
      })
    })

    describe('csvDebug()', () => {
      it('should not log anything when debug mode is disabled', () => {
        const { debugLogger } = loadFreshLogger(false)
        consoleSpy.log.mockClear()

        debugLogger.csvDebug('headers', ['col1', 'col2'])

        expect(consoleSpy.log).not.toHaveBeenCalled()
      })

      it('should log phase data when debug mode is enabled', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        debugLogger.csvDebug('processing', { rowCount: 100 })

        expect(consoleSpy.log).toHaveBeenCalledWith('📄 CSV Debug [processing]:', { rowCount: 100 })
      })

      it('should analyze headers array and log each header with index', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const headers = ['注文番号', '顧客名', '金額']
        debugLogger.csvDebug('headers', headers)

        expect(consoleSpy.log).toHaveBeenCalledWith('📋 CSV Headers Analysis:')
        expect(consoleSpy.log).toHaveBeenCalledWith('  1: "注文番号" (length: 4)')
        expect(consoleSpy.log).toHaveBeenCalledWith('  2: "顧客名" (length: 3)')
        expect(consoleSpy.log).toHaveBeenCalledWith('  3: "金額" (length: 2)')
      })

      it('should analyze field mapping object and log each field mapping result', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const mapping = {
          orderNumber: '注文番号',
          customerName: '',
          price: '金額'
        }
        debugLogger.csvDebug('mapping', mapping)

        expect(consoleSpy.log).toHaveBeenCalledWith('🗺️ Field Mapping Results:')
        expect(consoleSpy.log).toHaveBeenCalledWith('  orderNumber: "注文番号" ✅')
        expect(consoleSpy.log).toHaveBeenCalledWith('  customerName: "" ❌')
        expect(consoleSpy.log).toHaveBeenCalledWith('  price: "金額" ✅')
      })

      it('should analyze validation_errors array and summarize error counts', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const errors = [
          'Row 1: Missing required field',
          'Row 2: Missing required field',
          'Row 3: Invalid date format',
          'Row 4: Missing required field'
        ]
        debugLogger.csvDebug('validation_errors', errors)

        expect(consoleSpy.log).toHaveBeenCalledWith('🚨 Validation Errors Summary:')
        expect(consoleSpy.log).toHaveBeenCalledWith('  Missing required field: 3 occurrences')
        expect(consoleSpy.log).toHaveBeenCalledWith('  Invalid date format: 1 occurrences')
      })

      it('should handle validation_errors with entries that have no colon separator', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const errors = ['simple error no colon', 'another no colon']
        debugLogger.csvDebug('validation_errors', errors)

        // No colon means the errorType falls back to 'unknown'
        expect(consoleSpy.log).toHaveBeenCalledWith('🚨 Validation Errors Summary:')
        expect(consoleSpy.log).toHaveBeenCalledWith('  unknown: 2 occurrences')
      })

      it('should pass context to csvDebug calls', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const context = { requestId: 'req-123' }
        debugLogger.csvDebug('headers', ['col1'], context)

        expect(consoleSpy.log).toHaveBeenCalledWith('📄 CSV Debug [headers]:', ['col1'])
      })
    })

    describe('apiTrace()', () => {
      it('should not log when debug mode is disabled', () => {
        const { debugLogger } = loadFreshLogger(false)
        consoleSpy.log.mockClear()

        debugLogger.apiTrace('REQUEST', { method: 'GET', url: '/api/test' })

        expect(consoleSpy.log).not.toHaveBeenCalled()
      })

      it('should log with 📤 emoji for REQUEST phase', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const data = { method: 'POST', url: '/api/orders' }
        debugLogger.apiTrace('REQUEST', data)

        expect(consoleSpy.log).toHaveBeenCalledWith('📤 API REQUEST:', data)
      })

      it('should log with 📥 emoji for RESPONSE phase', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const data = { status: 200, body: { success: true } }
        debugLogger.apiTrace('RESPONSE', data)

        expect(consoleSpy.log).toHaveBeenCalledWith('📥 API RESPONSE:', data)
      })

      it('should log with 💥 emoji for ERROR phase', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const data = { message: 'Timeout error' }
        debugLogger.apiTrace('ERROR', data)

        expect(consoleSpy.log).toHaveBeenCalledWith('💥 API ERROR:', data)
      })

      it('should accept optional context parameter', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const context = { userId: 'user-1', apiRoute: '/api/chat' }
        debugLogger.apiTrace('REQUEST', { method: 'GET' }, context)

        expect(consoleSpy.log).toHaveBeenCalledWith('📤 API REQUEST:', { method: 'GET' })
      })
    })

    describe('startTimer()', () => {
      it('should return a no-op function when debug mode is disabled', () => {
        const { debugLogger } = loadFreshLogger(false)
        consoleSpy.log.mockClear()

        const endTimer = debugLogger.startTimer('test-operation')

        expect(consoleSpy.log).not.toHaveBeenCalled()
        expect(typeof endTimer).toBe('function')

        // Calling the returned function should not log anything
        endTimer()
        expect(consoleSpy.log).not.toHaveBeenCalled()
      })

      it('should log timer start and return a function that logs duration', () => {
        const { debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const endTimer = debugLogger.startTimer('test-operation')

        expect(consoleSpy.log).toHaveBeenCalledWith('⏱️ Timer Started: test-operation')

        // Call the returned function to end the timer
        endTimer()

        expect(consoleSpy.log).toHaveBeenCalledTimes(2)
        const endCall = consoleSpy.log.mock.calls[1][0]
        expect(endCall).toContain('⏱️ Timer End: test-operation')
        expect(endCall).toMatch(/\d+\.\d{2}ms/)
      })
    })
  })

  describe('Exported helper functions', () => {
    describe('logCSVProcessing()', () => {
      it('should call debugLogger.csvDebug with the given phase and data', () => {
        const { logCSVProcessing, debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const csvDebugSpy = jest.spyOn(debugLogger, 'csvDebug')
        logCSVProcessing('headers', ['col1', 'col2'])

        expect(csvDebugSpy).toHaveBeenCalledWith('headers', ['col1', 'col2'], undefined)
      })

      it('should pass context to csvDebug when provided', () => {
        const { logCSVProcessing, debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const csvDebugSpy = jest.spyOn(debugLogger, 'csvDebug')
        const context = { requestId: 'req-abc' }
        logCSVProcessing('mapping', { field: 'value' }, context)

        expect(csvDebugSpy).toHaveBeenCalledWith('mapping', { field: 'value' }, context)
      })
    })

    describe('logAPICall()', () => {
      it('should call debugLogger.apiTrace with REQUEST phase and combined data', () => {
        const { logAPICall, debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const apiTraceSpy = jest.spyOn(debugLogger, 'apiTrace')
        logAPICall('GET', '/api/orders', { userId: '1' })

        expect(apiTraceSpy).toHaveBeenCalledWith(
          'REQUEST',
          { method: 'GET', url: '/api/orders', userId: '1' },
          undefined
        )
      })

      it('should work without optional data parameter', () => {
        const { logAPICall, debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const apiTraceSpy = jest.spyOn(debugLogger, 'apiTrace')
        logAPICall('POST', '/api/chat')

        expect(apiTraceSpy).toHaveBeenCalledWith(
          'REQUEST',
          { method: 'POST', url: '/api/chat' },
          undefined
        )
      })
    })

    describe('logAPIResponse()', () => {
      it('should call debugLogger.apiTrace with RESPONSE phase and combined data', () => {
        const { logAPIResponse, debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const apiTraceSpy = jest.spyOn(debugLogger, 'apiTrace')
        logAPIResponse(200, { rows: 5 })

        expect(apiTraceSpy).toHaveBeenCalledWith(
          'RESPONSE',
          { status: 200, rows: 5 },
          undefined
        )
      })

      it('should pass context to RESPONSE apiTrace', () => {
        const { logAPIResponse, debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const apiTraceSpy = jest.spyOn(debugLogger, 'apiTrace')
        const context = { userId: 'user-99' }
        logAPIResponse(201, undefined, context)

        expect(apiTraceSpy).toHaveBeenCalledWith(
          'RESPONSE',
          { status: 201 },
          context
        )
      })
    })

    describe('logAPIError()', () => {
      it('should call debugLogger.apiTrace with ERROR phase and error data', () => {
        const { logAPIError, debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const apiTraceSpy = jest.spyOn(debugLogger, 'apiTrace')
        const err = new Error('Network timeout')
        logAPIError(err)

        expect(apiTraceSpy).toHaveBeenCalledWith('ERROR', err, undefined)
      })

      it('should pass context when provided', () => {
        const { logAPIError, debugLogger } = loadFreshLogger(true)
        consoleSpy.log.mockClear()

        const apiTraceSpy = jest.spyOn(debugLogger, 'apiTrace')
        const err = { code: 'ECONNREFUSED' }
        const context = { apiRoute: '/api/shipping' }
        logAPIError(err, context)

        expect(apiTraceSpy).toHaveBeenCalledWith('ERROR', err, context)
      })
    })
  })
})
