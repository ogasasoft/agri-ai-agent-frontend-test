export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  total_amount: number;
  order_date: string;
  delivery_date?: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  has_memo: boolean;
  memo?: string;
  ec_source?: string;
  category_id?: number;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  shipped_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface OrderFilters {
  dateFrom: string;
  dateTo: string;
  status: 'all' | 'pending' | 'processing' | 'shipped' | 'delivered';
  hasDeliveryDate: 'all' | 'yes' | 'no';
  hasMemo: 'all' | 'yes' | 'no';
}

export interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  totalAmount: number;
}