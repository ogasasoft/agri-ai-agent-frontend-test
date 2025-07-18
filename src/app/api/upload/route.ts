import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Mock response for CSV upload
  return NextResponse.json({ 
    success: true,
    message: 'CSV upload processed successfully (mock)'
  });
}