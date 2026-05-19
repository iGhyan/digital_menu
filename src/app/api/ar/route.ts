import { NextRequest, NextResponse } from 'next/server';

const API_BASE  = 'https://987eskfgd8.execute-api.ap-south-1.amazonaws.com/Prod/ar';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rid = searchParams.get('rid');
  const iid = searchParams.get('iid');

  if (!rid || !iid) {
    return NextResponse.json({ error: 'Missing rid or iid' }, { status: 400 });
  }

  try {
    const res = await fetch(`${API_BASE}/${rid}/${iid}`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json', 'x-tenant-id': TENANT_ID },
    });
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream API error ${res.status}`, detail: text },
        { status: res.status },
      );
    }
    return NextResponse.json(JSON.parse(text), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}