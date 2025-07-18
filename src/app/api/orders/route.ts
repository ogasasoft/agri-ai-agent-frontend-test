import { NextRequest, NextResponse } from 'next/server';

// Mock data for testing
const mockOrders = [
  {
    id: 1,
    order_number: 'ORD-2024-001',
    customer_name_masked: '田***郎',
    total_amount: 3500,
    order_date: '2024-01-15',
    delivery_date: '2024-01-18',
    status: 'pending',
    has_memo: true,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    order_number: 'ORD-2024-002',
    customer_name_masked: '佐***子',
    total_amount: 2800,
    order_date: '2024-01-16',
    delivery_date: null,
    status: 'processing',
    has_memo: false,
    created_at: '2024-01-16T14:30:00Z',
    updated_at: '2024-01-16T14:30:00Z'
  },
  {
    id: 3,
    order_number: 'ORD-2024-003',
    customer_name_masked: '山***一',
    total_amount: 4200,
    order_date: '2024-01-17',
    delivery_date: '2024-01-20',
    status: 'shipped',
    has_memo: true,
    created_at: '2024-01-17T09:15:00Z',
    updated_at: '2024-01-17T16:45:00Z'
  },
  {
    id: 4,
    order_number: 'ORD-2024-004',
    customer_name_masked: '鈴***美',
    total_amount: 1500,
    order_date: '2024-01-18',
    delivery_date: null,
    status: 'pending',
    has_memo: false,
    created_at: '2024-01-18T11:20:00Z',
    updated_at: '2024-01-18T11:20:00Z'
  },
  {
    id: 5,
    order_number: 'ORD-2024-005',
    customer_name_masked: '高***雄',
    total_amount: 5600,
    order_date: '2024-01-19',
    delivery_date: '2024-01-22',
    status: 'delivered',
    has_memo: false,
    created_at: '2024-01-19T15:45:00Z',
    updated_at: '2024-01-21T10:30:00Z'
  }
];

function maskPersonalInfo(text: string): string {
  if (!text || text.length <= 2) return text;
  const first = text.charAt(0);
  const last = text.charAt(text.length - 1);
  const middle = '*'.repeat(text.length - 2);
  return `${first}${middle}${last}`;
}

export async function GET() {
  return NextResponse.json(mockOrders);
}

export async function POST(request: NextRequest) {
  const data = await request.json();
  
  // Mask personal information
  const maskedName = maskPersonalInfo(data.customer_name);
  const maskedPhone = maskPersonalInfo(data.customer_phone);
  const maskedAddress = maskPersonalInfo(data.customer_address);
  
  const mockNewOrder = {
    id: Date.now(),
    order_number: data.order_number,
    customer_name_masked: maskedName,
    customer_phone_masked: maskedPhone,
    customer_address_masked: maskedAddress,
    total_amount: data.total_amount,
    order_date: data.order_date,
    delivery_date: data.delivery_date,
    status: data.status || 'pending',
    has_memo: !!data.memo,
    memo: data.memo || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  return NextResponse.json({ 
    id: mockNewOrder.id,
    success: true,
    order: mockNewOrder
  });
}