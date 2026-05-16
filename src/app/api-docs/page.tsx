'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

export default function ApiDocs() {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'Agri AI Agent Frontend API',
      version: '1.0.0',
      description: '農業EC統合管理システム - APIドキュメント',
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: '開発環境',
      },
      {
        url: 'https://your-production-domain.com/api',
        description: '本番環境',
      },
    ],
    paths: {
      '/auth/login': {
        post: {
          summary: 'ユーザーログイン',
          description: 'メールアドレスとパスワードでログインする',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                    rememberMe: { type: 'boolean' },
                  },
                  required: ['email', 'password'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'ログイン成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' },
                      user: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
            },
            '401': {
              description: '認証失敗',
            },
          },
        },
      },
      '/auth/me': {
        get: {
          summary: '現在のユーザー情報',
          description: '認証されたユーザーの情報を取得する',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'ユーザー情報取得成功',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' },
                },
              },
            },
            '401': {
              description: '未認証',
            },
          },
        },
      },
      '/auth/logout': {
        post: {
          summary: 'ログアウト',
          description: '現在のセッションを破棄する',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'ログアウト成功',
            },
          },
        },
      },
      '/chat': {
        post: {
          summary: 'AIチャット',
          description: 'OpenAI GPT による注文データ分析と相談',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    context: { type: 'string' },
                  },
                  required: ['message'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'AI応答取得成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      response: { type: 'string' },
                      suggestions: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/orders': {
        get: {
          summary: '注文一覧',
          description: '登録された注文の一覧を取得する',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'page',
              in: 'query',
              required: false,
              schema: { type: 'integer', default: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer', default: 20 },
            },
          ],
          responses: {
            '200': {
              description: '注文一覧取得成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      orders: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
                      total: { type: 'integer' },
                      page: { type: 'integer' },
                      totalPages: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/orders/{orderId}': {
        get: {
          summary: '注文詳細',
          description: '特定の注文の詳細を取得する',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'orderId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: '注文詳細取得成功',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Order' },
                },
              },
            },
          },
        },
      },
      '/admin/customers': {
        get: {
          summary: '顧客一覧',
          description: '全顧客データの統合管理',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'page',
              in: 'query',
              required: false,
              schema: { type: 'integer', default: 1 },
            },
          ],
          responses: {
            '200': {
              description: '顧客一覧取得成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      customers: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Customer' },
                      },
                      total: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/admin/dashboard/stats': {
        get: {
          summary: 'ダッシュボード統計',
          description: 'システム全体の統計データを取得する',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: '統計データ取得成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      users: { type: 'integer' },
                      orders: { type: 'integer' },
                      customers: { type: 'integer' },
                      systemStatus: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin', 'superadmin'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            orderCode: { type: 'string' },
            customerId: { type: 'string' },
            customerName: { type: 'string' },
            items: { type: 'array', items: { type: 'object' } },
            totalAmount: { type: 'number', format: 'float' },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            totalOrders: { type: 'integer' },
            totalSpent: { type: 'number', format: 'float' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">API ドキュメント</h1>
        <p className="mb-6 text-gray-600">
          農業EC統合管理システムのAPI詳細。認証が必要なエンドポイントには JWT
          トークンをヘッダーに含めてください。
        </p>
        {/* SwaggerUI spec={spec} */}
        <p className="text-gray-600">Swagger UI コンポーネントはインストール後に有効化予定</p>
      </div>
    </div>
  );
}
