import type { NextRequest } from 'next/server';

declare module 'next/server' {
  interface NextRequest {
    ip?: string;
    method: string;
  }
}
