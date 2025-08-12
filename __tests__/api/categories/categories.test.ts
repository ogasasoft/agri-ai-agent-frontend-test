import { GET, POST, PUT, DELETE } from '@/app/api/categories/route'
import { createMockRequest, MockDbClient, createMockUser, createMockSession, createMockCategory, resetTestDatabase, createMockAuthHeaders } from '../../setup/test-utils'

// Mock dependencies
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => MockDbClient.getInstance())
}))

jest.mock('@/lib/auth', () => ({
  validateSession: jest.fn(),
}))

describe('/api/categories', () => {
  let mockClient: MockDbClient
  const { validateSession } = require('@/lib/auth')

  beforeEach(async () => {
    await resetTestDatabase()
    mockClient = MockDbClient.getInstance()
    validateSession.mockClear()
  })

  describe('GET /api/categories', () => {
    it('should return categories for authenticated user', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1 })
      const mockCategories = [
        createMockCategory({ id: 1, name: '野菜', user_id: 1 }),
        createMockCategory({ id: 2, name: '果物', user_id: 1 }),
      ]

      validateSession.mockResolvedValue({ user: mockUser })
      mockClient.setMockData('categories', mockCategories)

      const request = createMockRequest({
        method: 'GET',
        headers: createMockAuthHeaders()
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.categories).toHaveLength(2)
      expect(data.categories[0].name).toBe('野菜')
      expect(data.categories[1].name).toBe('果物')
    })

    it('should return 401 without authentication', async () => {
      // Arrange
      const request = createMockRequest({
        method: 'GET'
        // No auth headers
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.message).toBe('認証が必要です')
    })

    it('should only return categories for current user', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1 })
      const allCategories = [
        createMockCategory({ id: 1, name: '野菜', user_id: 1 }),
        createMockCategory({ id: 2, name: '肉類', user_id: 2 }), // Different user
      ]

      validateSession.mockResolvedValue({ user: mockUser })
      // Mock would filter by user_id
      mockClient.setMockData('categories', allCategories.filter(c => c.user_id === 1))

      const request = createMockRequest({
        method: 'GET',
        headers: createMockAuthHeaders()
      })

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.categories).toHaveLength(1)
      expect(data.categories[0].user_id).toBe(1)
    })
  })

  describe('POST /api/categories', () => {
    it('should create new category with valid data', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser })

      const categoryData = {
        name: '新しいカテゴリ',
        description: 'テスト用カテゴリ',
        color: 'blue',
        icon: 'Package'
      }

      const request = createMockRequest({
        method: 'POST',
        body: categoryData,
        headers: createMockAuthHeaders('session-token', 'csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('カテゴリを作成しました。')
      expect(data.category).toEqual(
        expect.objectContaining({
          name: '新しいカテゴリ',
          description: 'テスト用カテゴリ',
          color: 'blue',
          icon: 'Package'
        })
      )
    })

    it('should validate required name field', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser })

      const categoryData = {
        // Missing name
        description: 'テスト用カテゴリ',
        color: 'blue'
      }

      const request = createMockRequest({
        method: 'POST',
        body: categoryData,
        headers: createMockAuthHeaders('session-token', 'csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('カテゴリ名は必須です。')
    })

    it('should prevent duplicate category names for same user', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser })
      
      // Mock existing category
      mockClient.setMockData('categories', [
        createMockCategory({ name: '野菜', user_id: 1 })
      ])

      const duplicateCategoryData = {
        name: '野菜', // Same name as existing category
        description: '重複テスト',
        color: 'green'
      }

      const request = createMockRequest({
        method: 'POST',
        body: duplicateCategoryData,
        headers: createMockAuthHeaders('session-token', 'csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.message).toBe('このカテゴリ名は既に存在します。')
    })

    it('should set default values for optional fields', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser })

      const categoryData = {
        name: 'シンプルカテゴリ'
        // No optional fields
      }

      const request = createMockRequest({
        method: 'POST',
        body: categoryData,
        headers: createMockAuthHeaders('session-token', 'csrf-token')
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.category.description).toBe('')
      expect(data.category.color).toBe('gray')
      expect(data.category.icon).toBe('Package')
    })
  })

  describe('PUT /api/categories', () => {
    it('should update existing category', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser })
      
      // Mock existing category
      mockClient.setMockData('categories', [
        createMockCategory({ id: 1, name: '野菜', user_id: 1 })
      ])

      const updateData = {
        id: 1,
        name: '新鮮野菜',
        description: '更新された説明',
        color: 'green',
        icon: 'Carrot'
      }

      const request = createMockRequest({
        method: 'PUT',
        body: updateData,
        headers: createMockAuthHeaders('session-token', 'csrf-token')
      })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('カテゴリを更新しました。')
      expect(data.category.name).toBe('新鮮野菜')
    })

    it('should return 404 for non-existent category', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser })
      
      // No categories in mock data
      mockClient.setMockData('categories', [])

      const updateData = {
        id: 999, // Non-existent ID
        name: '存在しないカテゴリ'
      }

      const request = createMockRequest({
        method: 'PUT',
        body: updateData,
        headers: createMockAuthHeaders('session-token', 'csrf-token')
      })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.message).toBe('カテゴリが見つかりません。')
    })
  })

  describe('DELETE /api/categories', () => {
    it('should delete category without associated orders', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser })
      
      // Mock category without orders
      mockClient.setMockData('categories', [
        createMockCategory({ id: 1, name: '削除予定', user_id: 1 })
      ])
      mockClient.setMockData('orders', []) // No orders

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/categories?id=1',
        headers: createMockAuthHeaders('session-token', 'csrf-token')
      })

      // Act
      const response = await DELETE(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('カテゴリを削除しました。')
    })

    it('should prevent deletion of category with associated orders', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser })
      
      // Mock category with orders
      mockClient.setMockData('categories', [
        createMockCategory({ id: 1, name: '使用中カテゴリ', user_id: 1 })
      ])
      // Mock has orders associated with this category
      mockClient.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 1, name: '使用中カテゴリ' }] }) // Category exists
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // Has 5 orders

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/categories?id=1',
        headers: createMockAuthHeaders('session-token', 'csrf-token')
      })

      // Act
      const response = await DELETE(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.message).toBe('このカテゴリには注文データが関連付けられているため削除できません。')
    })

    it('should require category ID parameter', async () => {
      // Arrange
      const mockUser = createMockUser({ id: 1 })
      const mockSession = createMockSession({ user_id: 1, csrf_token: 'csrf-token' })

      validateSession.mockResolvedValue({ user: mockUser })

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/categories', // No ID parameter
        headers: createMockAuthHeaders('session-token', 'csrf-token')
      })

      // Act
      const response = await DELETE(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.message).toBe('カテゴリIDが必要です。')
    })
  })
})