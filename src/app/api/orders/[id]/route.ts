import { NextRequest, NextResponse } from 'next/server';

const ORDERS_BASE = 'https://rz0z72aem4.execute-api.us-east-1.amazonaws.com/Prod';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID_KDS ?? 't123';
    const url = `${ORDERS_BASE}/orders/${params.id}?tenantId=${TENANT_ID}`;
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
    const text = await res.text();
    if (!res.ok) return NextResponse.json({ error: text }, { status: res.status });
    return NextResponse.json(JSON.parse(text));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

// ── PATCH /api/orders/[id] ──────────────────────────────────────────────────
// Forwards flag-based payload to AWS:
// { orderId, kitchenAccepted, foodReady, delivered, cancelled }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    console.log('[PATCH proxy] orderId:', params.id, 'payload:', body);

    // AWS endpoint: PATCH /Prod/orders  (no id in path — orderId is in body)
    const res = await fetch(`${ORDERS_BASE}/orders`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log('[PATCH proxy] AWS response:', res.status, text);

    if (!res.ok) return NextResponse.json({ error: text }, { status: res.status });
    return NextResponse.json(text ? JSON.parse(text) : { success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}