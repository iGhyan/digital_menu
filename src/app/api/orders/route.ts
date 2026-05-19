import { NextRequest, NextResponse } from 'next/server';

const ORDERS_BASE   = 'https://rz0z72aem4.execute-api.us-east-1.amazonaws.com/Prod';
const TENANT_ID     = process.env.NEXT_PUBLIC_TENANT_ID_KDS     ?? 't123';
const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID_KDS ?? 'r456';

export async function GET() {
  try {
    const url = `${ORDERS_BASE}/orders?tenantId=${TENANT_ID}&restaurantId=${RESTAURANT_ID}`;
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
    const text = await res.text();
    if (!res.ok) return NextResponse.json({ error: text }, { status: res.status });
    return NextResponse.json(JSON.parse(text));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Fetch failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${ORDERS_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) return NextResponse.json({ error: text }, { status: res.status });
    return NextResponse.json(JSON.parse(text));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Fetch failed' }, { status: 500 });
  }
}