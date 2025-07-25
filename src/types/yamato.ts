export interface YamatoApiConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  timeout: number;
}

export interface YamatoShippingRequest {
  order_ids: number[];
  sender: {
    name: string;
    address: string;
    phone: string;
  };
  recipients: {
    order_id: number;
    name: string;
    address: string;
    phone?: string;
    delivery_date?: string;
  }[];
  delivery_type: 'normal' | 'cool' | 'frozen';
  payment_type: 'sender' | 'recipient' | 'collect';
  notes?: string;
}

export interface YamatoApiResponseItem {
  order_id: number;
  success: boolean;
  tracking_number?: string;
  label_url?: string;
  error_code?: string;
  error_message?: string;
}

export interface YamatoApiResponse {
  success: boolean;
  results: YamatoApiResponseItem[];
  batch_id?: string;
  total_cost?: number;
  error_message?: string;
}