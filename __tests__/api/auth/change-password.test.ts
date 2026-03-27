/** @jest-environment node */
// FILE: __tests__/api/auth/change-password.test.ts

import { POST } from '@/app/api/auth/change-password/route'
import { createMockRequest, createMockUser, createMockSession, resetTestDatabase } from '../../setup/test-utils'

// Mock the auth module
jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
  changePassword: jest.fn(),
}))

// Mock the auth-error-details module
// AuthErrorBuilder is used both as a class (new AuthErrorBuilder()) and with static methods
jest.mock('@/lib/auth-error-details', () => {
  const mockBuilderInstance = {
    setAuthContext: jest.fn().mockReturnThis(),
    addProcessingStep: jest.fn().mockReturnThis(),
    addSuggestion: jest.fn().mockReturnThis(),
    addSuggestions: jest.fn().mockReturnThis(),
    setDetails: jest.fn().mockReturnThis(),
    setOperation: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({
      success: false,
      message: 'パスワード変更処理中にエラーが発生しました',
      error_code: 'AUTHENTICATION_ERROR'
    })
  }

  const MockAuthErrorBuilderClass = jest.fn().mockImplementation(() => mockBuilderInstance)
  MockAuthErrorBuilderClass.sessionError = jest.fn().mockImplementation((type: string) => ({
    success: false,
    message: `Auth error: ${type}`,
    error_code: 'AUTHENTICATION_ERROR',
    type
  }))

  return {
    AuthErrorBuilder: MockAuthErrorBuilderClass,
    logAuthAttempt: jest.fn()
  }
})

describe('/api/auth/change-password', () => {
  const { validateSession, changePassword } = require('@/lib/auth')
  const { AuthErrorBuilder, logAuthAttempt } = require('@/lib/auth-error-details')

  beforeEach(async () => {
    await resetTestDatabase()
    jest.clearAllMocks()
    // Restore the static sessionError mock after clearAllMocks clears it
    AuthErrorBuilder.sessionError = jest.fn().mockImplementation((type: string) => ({
      success: false,
      message: `Auth error: ${type}`,
      error_code: 'AUTHENTICATION_ERROR',
      type
    }))
    // Restore the fluent instance builder mock after clearAllMocks
    const mockBuilderInstance = new AuthErrorBuilder()
    mockBuilderInstance.setAuthContext.mockReturnThis()
    mockBuilderInstance.addProcessingStep.mockReturnThis()
    mockBuilderInstance.addSuggestion.mockReturnThis()
    mockBuilderInstance.build.mockReturnValue({
      success: false,
      message: 'パスワード変更処理中にエラーが発生しました',
      error_code: 'AUTHENTICATION_ERROR'
    })
  })

  describe('POST /api/auth/change-password', () => {
    it('should return 401 when no session_token cookie is present', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'POST',
        body: {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        }
        // No session_token cookie
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(AuthErrorBuilder.sessionError).toHaveBeenCalledWith('INVALID_SESSION')
      expect(validateSession).not.toHaveBeenCalled()
    })

    it('should return 401 when session is invalid or expired', async () => {
      // Arrange
      validateSession.mockResolvedValue(null)

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'invalid-session-token'
        },
        body: {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(validateSession).toHaveBeenCalledWith('invalid-session-token')
      expect(AuthErrorBuilder.sessionError).toHaveBeenCalledWith(
        'EXPIRED_SESSION',
        expect.objectContaining({ token: 'invalid-session-token' })
      )
      expect(changePassword).not.toHaveBeenCalled()
    })

    it('should return 403 when CSRF token is missing', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1, username: 'testuser' })
      const mockSessionData = {
        user: mockUser,
        session: { csrf_token: 'expected-csrf-token' }
      }
      validateSession.mockResolvedValue(mockSessionData)

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'valid-session-token'
        },
        // No x-csrf-token header
        body: {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(AuthErrorBuilder.sessionError).toHaveBeenCalledWith(
        'CSRF_MISMATCH',
        expect.objectContaining({ token: 'valid-session-token' })
      )
      expect(changePassword).not.toHaveBeenCalled()
    })

    it('should return 403 when CSRF token does not match', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1, username: 'testuser' })
      const mockSessionData = {
        user: mockUser,
        session: { csrf_token: 'expected-csrf-token' }
      }
      validateSession.mockResolvedValue(mockSessionData)

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'valid-session-token'
        },
        headers: {
          'x-csrf-token': 'wrong-csrf-token'
        },
        body: {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(changePassword).not.toHaveBeenCalled()
    })

    it('should return 400 when newPassword is missing', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1, username: 'testuser' })
      const mockSessionData = {
        user: mockUser,
        session: { csrf_token: 'correct-csrf-token' }
      }
      validateSession.mockResolvedValue(mockSessionData)

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'valid-session-token'
        },
        headers: {
          'x-csrf-token': 'correct-csrf-token'
        },
        body: {
          currentPassword: 'oldpassword',
          // newPassword is missing
          confirmPassword: 'newpassword123'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('新しいパスワードと確認パスワードは必須です。')
      expect(changePassword).not.toHaveBeenCalled()
    })

    it('should return 400 when confirmPassword is missing', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1, username: 'testuser' })
      const mockSessionData = {
        user: mockUser,
        session: { csrf_token: 'correct-csrf-token' }
      }
      validateSession.mockResolvedValue(mockSessionData)

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'valid-session-token'
        },
        headers: {
          'x-csrf-token': 'correct-csrf-token'
        },
        body: {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123'
          // confirmPassword is missing
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('新しいパスワードと確認パスワードは必須です。')
      expect(changePassword).not.toHaveBeenCalled()
    })

    it('should return 400 when newPassword and confirmPassword do not match', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1, username: 'testuser' })
      const mockSessionData = {
        user: mockUser,
        session: { csrf_token: 'correct-csrf-token' }
      }
      validateSession.mockResolvedValue(mockSessionData)

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'valid-session-token'
        },
        headers: {
          'x-csrf-token': 'correct-csrf-token'
        },
        body: {
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123',
          confirmPassword: 'differentpassword456'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('新しいパスワードと確認パスワードが一致しません。')
      expect(changePassword).not.toHaveBeenCalled()
    })

    it('should return 400 when changePassword fails due to wrong current password', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1, username: 'testuser' })
      const mockSessionData = {
        user: mockUser,
        session: { csrf_token: 'correct-csrf-token' }
      }
      validateSession.mockResolvedValue(mockSessionData)
      changePassword.mockResolvedValue({
        success: false,
        message: '現在のパスワードが正しくありません。'
      })

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'valid-session-token'
        },
        headers: {
          'x-csrf-token': 'correct-csrf-token'
        },
        body: {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      // The route creates a new AuthErrorBuilder instance and calls .build() when changePassword fails.
      // Our mock's .build() returns { success: false, message: 'パスワード変更処理中にエラーが発生しました' }
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      // Verify changePassword was called with the right arguments
      expect(changePassword).toHaveBeenCalledWith(
        1,
        'wrongpassword',
        'newpassword123',
        false  // skipCurrentPasswordCheck = false for non-admin users
      )
      // The AuthErrorBuilder instance was constructed and .build() was invoked
      expect(AuthErrorBuilder).toHaveBeenCalledWith('パスワード変更に失敗しました')
    })

    it('should skip current password check for admin user when currentPassword is not provided', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ id: 2, username: 'admin' })
      const mockSessionData = {
        user: mockAdminUser,
        session: { csrf_token: 'correct-csrf-token' }
      }
      validateSession.mockResolvedValue(mockSessionData)
      changePassword.mockResolvedValue({
        success: true,
        message: 'パスワードを変更しました。'
      })

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'admin-session-token'
        },
        headers: {
          'x-csrf-token': 'correct-csrf-token'
        },
        body: {
          // currentPassword intentionally omitted for admin first-time setup
          newPassword: 'newadminpassword123',
          confirmPassword: 'newadminpassword123'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(changePassword).toHaveBeenCalledWith(
        2,
        '',  // empty string because currentPassword was undefined
        'newadminpassword123',
        true  // skipCurrentPasswordCheck = true for admin with no current password
      )
    })

    it('should require current password for admin user when currentPassword is provided', async () => {
      // Arrange
      const mockAdminUser = createMockUser({ id: 2, username: 'admin' })
      const mockSessionData = {
        user: mockAdminUser,
        session: { csrf_token: 'correct-csrf-token' }
      }
      validateSession.mockResolvedValue(mockSessionData)
      changePassword.mockResolvedValue({
        success: true,
        message: 'パスワードを変更しました。'
      })

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'admin-session-token'
        },
        headers: {
          'x-csrf-token': 'correct-csrf-token'
        },
        body: {
          currentPassword: 'currentadminpassword',
          newPassword: 'newadminpassword123',
          confirmPassword: 'newadminpassword123'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(changePassword).toHaveBeenCalledWith(
        2,
        'currentadminpassword',
        'newadminpassword123',
        false  // skipCurrentPasswordCheck = false when currentPassword is provided
      )
    })

    it('should return 200 on successful password change for regular user', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1, username: 'testuser' })
      const mockSessionData = {
        user: mockUser,
        session: { csrf_token: 'correct-csrf-token' }
      }
      validateSession.mockResolvedValue(mockSessionData)
      changePassword.mockResolvedValue({
        success: true,
        message: 'パスワードを変更しました。'
      })

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'valid-session-token'
        },
        headers: {
          'x-csrf-token': 'correct-csrf-token'
        },
        body: {
          currentPassword: 'currentpassword',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('パスワードを変更しました。')
      expect(changePassword).toHaveBeenCalledWith(
        1,
        'currentpassword',
        'newpassword123',
        false
      )
    })

    it('should return 500 on unexpected server error', async () => {
      // Arrange
      validateSession.mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'valid-session-token'
        },
        headers: {
          'x-csrf-token': 'correct-csrf-token'
        },
        body: {
          currentPassword: 'currentpassword',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('パスワード変更処理中にエラーが発生しました')
    })

    it('should return 500 when changePassword itself throws an error', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1, username: 'testuser' })
      const mockSessionData = {
        user: mockUser,
        session: { csrf_token: 'correct-csrf-token' }
      }
      validateSession.mockResolvedValue(mockSessionData)
      changePassword.mockRejectedValue(new Error('Bcrypt hashing failed'))

      const request = createMockRequest({
        method: 'POST',
        cookies: {
          session_token: 'valid-session-token'
        },
        headers: {
          'x-csrf-token': 'correct-csrf-token'
        },
        body: {
          currentPassword: 'currentpassword',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        }
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toBe('パスワード変更処理中にエラーが発生しました')
    })
  })
})
