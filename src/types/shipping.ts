export interface ShippingLabel {
  id: string;
  order_code: string;
  customer_name: string;
  customer_address: string;
  delivery_date?: string;
  tracking_number?: string;
  created_at: string;
}

export interface YamatoApiResponse {
  success: boolean;
  tracking_number?: string;
  label_url?: string;
  error_message?: string;
}

export interface ShippingRequest {
  order_ids: number[];
  delivery_type: 'normal' | 'cool' | 'frozen';
  notes?: string;
}

export interface CustomerRegistration {
  order_code: string;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  delivery_date?: string;
  total_amount: number;
  memo?: string;
}