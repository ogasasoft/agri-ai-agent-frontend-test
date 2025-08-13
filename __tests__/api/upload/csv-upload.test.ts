import { POST } from '@/app/api/upload-with-category/route'
import { createMockRequest, MockDbClient, createMockUser, createMockSession, resetTestDatabase, createMockAuthHeaders, createMockCsvFile, createFormDataRequest } from '../../setup/test-utils'

// Mock dependencies
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
}))

jest.mock('papaparse', () => ({
  parse: jest.fn(),
}))

describe('/api/upload-with-category', () => {
  let mockClient: MockDbClient
  const { validateSession } = require('@/lib/auth')
  const Papa = require('papaparse')

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    validateSession.mockClear()
    Papa.parse.mockClear()
  })

  describe('POST /api/upload-with-category', () => {
    // Simplified mock for FormData testing environment
    const createMockFormDataRequest = (sessionToken = 'session-token', csrfToken = 'csrf-token') => {
      return createMockRequest({
        method: 'POST',
        headers: {
          'x-session-token': sessionToken,
          'x-csrf-token': csrfToken,
          'content-type': 'multipart/form-data'
        }
      })
    }

    it('should successfully upload valid CSV file', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token',
        session_token: 'session-token'
      })

      validateSession.mockResolvedValue({ user: mockUser })

      const csvContent = `注文番号,顧客名,電話番号,住所,金額,注文日,希望配達日,備考
ORD-001,田中太郎,090-1234-5678,東京都渋谷区1-1-1,3000,2024-01-01,2024-01-03,テスト注文1
ORD-002,山田花子,090-9876-5432,大阪府大阪市2-2-2,5000,2024-01-02,2024-01-04,テスト注文2`

      Papa.parse.mockReturnValue({
        data: [
          {
            '注文番号': 'ORD-001',
            '顧客名': '田中太郎',
            '電話番号': '090-1234-5678',
            '住所': '東京都渋谷区1-1-1',
            '金額': '3000',
            '注文日': '2024-01-01',
            '希望配達日': '2024-01-03',
            '備考': 'テスト注文1'
          },
          {
            '注文番号': 'ORD-002',
            '顧客名': '山田花子',
            '電話番号': '090-9876-5432',
            '住所': '大阪府大阪市2-2-2',
            '金額': '5000',
            '注文日': '2024-01-02',
            '希望配達日': '2024-01-04',
            '備考': 'テスト注文2'
          }
        ],
        errors: []
      })

      const file = createMockCsvFile(csvContent)
      const request = createFormDataRequest(file, 'vegetables')

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.registered_count).toBe(2)
      expect(data.skipped_count).toBe(0)
      expect(data.message).toContain('2件のデータを登録')
    })

    it('should require authentication', async () => {
      // Arrange
      const csvContent = `注文番号,顧客名\nORD-001,田中太郎`
      const file = createMockCsvFile(csvContent)

      const request = createMockRequest({
        method: 'POST',
        body: new FormData()
        // No authentication headers
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('認証が必要です。')
    })

    it('should validate CSRF token', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'valid-csrf-token' 
      })

      validateSession.mockResolvedValue({ user: mockUser })

      const csvContent = `注文番号,顧客名\nORD-001,田中太郎`
      const file = createMockCsvFile(csvContent)
      
      const request = createFormDataRequest(file, 'vegetables', 'session-token', 'invalid-csrf-token')

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.message).toBe('CSRF検証に失敗しました。')
    })

    it('should require CSV file', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token' 
      })

      validateSession.mockResolvedValue({ user: mockUser })

      const formData = new FormData()
      formData.append('category', 'vegetables')
      formData.append('csrf_token', 'csrf-token')
      // No file

      const request = createMockRequest({
        method: 'POST',
        headers: createMockAuthHeaders(),
        body: formData
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('ファイルが選択されていません。')
    })

    it('should validate file size limit', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token' 
      })

      validateSession.mockResolvedValue({ user: mockUser })

      // Create large file content (>10MB)
      const largeContent = 'a'.repeat(11 * 1024 * 1024)
      const file = createMockCsvFile(largeContent)

      const request = createFormDataRequest(file, 'vegetables')

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toContain('ファイルサイズが大きすぎます')
    })

    it('should handle CSV parsing errors', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token' 
      })

      validateSession.mockResolvedValue({ user: mockUser })

      Papa.parse.mockReturnValue({
        data: [],
        errors: [{ message: 'CSV parsing failed', row: 1 }]
      })

      const file = createMockCsvFile('invalid,csv,content')
      const request = createFormDataRequest(file, 'vegetables')

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toContain('CSV解析エラー')
    })

    it('should skip duplicate order codes', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token' 
      })

      validateSession.mockResolvedValue({ user: mockUser })

      // Mock existing order
      mockClient.setMockData('orders', [
        { order_code: 'ORD-001', user_id: 1 }
      ])

      Papa.parse.mockReturnValue({
        data: [
          {
            '注文番号': 'ORD-001', // Duplicate
            '顧客名': '田中太郎',
            '金額': '3000'
          },
          {
            '注文番号': 'ORD-002', // New
            '顧客名': '山田花子',
            '金額': '5000'
          }
        ],
        errors: []
      })

      const file = createMockCsvFile('csv content')
      const request = createFormDataRequest(file, 'vegetables')

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.registered_count).toBe(1)
      expect(data.skipped_count).toBe(1)
      expect(data.skipped_order_codes).toContain('ORD-001')
    })

    it('should validate required fields in CSV data', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token' 
      })

      validateSession.mockResolvedValue({ user: mockUser })

      Papa.parse.mockReturnValue({
        data: [
          {
            '注文番号': 'ORD-001',
            // Missing required customer name
            '金額': '3000'
          }
        ],
        errors: []
      })

      const file = createMockCsvFile('csv content')
      const request = createFormDataRequest(file, 'vegetables')

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toContain('必須フィールド')
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token' 
      })

      validateSession.mockResolvedValue({ user: mockUser })

      Papa.parse.mockReturnValue({
        data: [
          {
            '注文番号': 'ORD-001',
            '顧客名': '田中太郎',
            '金額': '3000'
          }
        ],
        errors: []
      })

      // Mock database error
      mockClient.query = jest.fn().mockRejectedValue(new Error('Database connection failed'))

      const file = createMockCsvFile('csv content')
      const request = createFormDataRequest(file, 'vegetables')

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.message).toContain('サーバーエラー')
    })

    it('should validate category parameter', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ 
        user_id: 1, 
        csrf_token: 'csrf-token' 
      })

      validateSession.mockResolvedValue({ user: mockUser })

      const file = createMockCsvFile('csv content')
      
      const formData = new FormData()
      formData.append('file', file)
      // Missing category parameter
      formData.append('csrf_token', 'csrf-token')

      const request = createMockRequest({
        method: 'POST',
        headers: createMockAuthHeaders(),
        body: formData
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toContain('カテゴリ')
    })
  })
})