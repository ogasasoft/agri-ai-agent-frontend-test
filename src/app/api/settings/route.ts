import { NextRequest, NextResponse } from 'next/server';

const mockSettings = {
  theme: 'light',
  fontSize: 'medium',
  fontFamily: 'Helvetica Neue, Arial, sans-serif',
  notifications: {
    email: 'admin@example.com',
    lineWebhook: '',
    enableShippingNotifications: false
  },
  ecPlatforms: [
    {
      id: '1',
      platform: 'shopify',
      apiKey: 'sk_test_***',
      apiSecret: '',
      endpointUrl: '',
      syncSchedule: '0 */6 * * *',
      isActive: true
    }
  ]
};

export async function GET() {
  return NextResponse.json(mockSettings);
}

export async function POST(request: NextRequest) {
  const settings = await request.json();
  
  console.log('Settings would be saved:', settings);
  
  return NextResponse.json({ 
    success: true,
    message: 'Settings saved successfully (mock)',
    savedSettings: settings
  });
}