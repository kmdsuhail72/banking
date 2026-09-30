import { NextResponse } from 'next/server';
import { checkServices } from '@/lib/service-health';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(await checkServices(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
