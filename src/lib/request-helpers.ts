/**
 * Next.js 16 Request API ヘルパー関数
 *
 * Next.js 16ではRequest.ipプロパティが削除されました。
 * 代わりにheaders.get('x-forwarded-for')を使用してIPアドレスを取得します。
 */

import { NextRequest } from 'next/server';

/**
 * クライアント情報を取得する関数
 *
 * @param request - Next.js Requestオブジェクト
 * @returns IPアドレスとUser-Agent
 *
 * @example
 * const { ipAddress, userAgent } = getClientInfo(request);
 */
export function getClientInfo(request: NextRequest): { ipAddress: string; userAgent: string } {
  // Next.js 16: Request.ipは非推奨/削除済み
  // 代わりにx-forwarded-forヘッダーからIPを取得（プロキシ環境用）
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown';

  const userAgent = request.headers.get('user-agent') || 'unknown';

  return { ipAddress, userAgent };
}
