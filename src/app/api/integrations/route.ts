// API Routes for External API Integrations
// ColorMi Shop (カラーミーショップ) and Tabechoku (食べチョク) integration mock

import { NextRequest, NextResponse } from 'next/server';

// ColorMi Shop API (Mock Implementation)
export async function GET(request: NextRequest) {
  // Mock ColorMi Shop integration endpoint
  // This provides mock data structure for ColorMi Shop integration

  const colorMiData = {
    platforms: [
      {
        name: 'ColorMi Shop',
        enabled: true,
        lastSync: new Date().toISOString(),
        syncStatus: 'connected',
        totalOrders: 1250,
        pendingOrders: 34,
        syncInterval: '1h',
      },
    ],
    settings: {
      colorMi: {
        apiKey: process.env.COLORMI_API_KEY || 'mock-api-key',
        shopId: process.env.COLORMI_SHOP_ID || 'mock-shop-id',
        autoSync: true,
        syncInterval: 3600000, // 1 hour
      },
    },
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      integrationType: 'e-commerce',
    },
  };

  return NextResponse.json(colorMiData);
}

// POST endpoint for manual ColorMi Shop sync
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Mock sync process
    const syncResult = {
      success: true,
      platform: 'ColorMi Shop',
      ordersSynced: 45,
      totalOrders: 1250,
      syncTime: new Date().toISOString(),
      message: 'Successfully synced 45 orders from ColorMi Shop',
    };

    return NextResponse.json(syncResult, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Sync failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
