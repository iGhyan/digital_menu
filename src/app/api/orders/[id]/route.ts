import { NextRequest, NextResponse } from 'next/server';

const ORDERS_BASE   = 'https://rz0z72aem4.execute-api.us-east-1.amazonaws.com/Prod';
const TENANT_ID     = process.env.NEXT_PUBLIC_TENANT_ID_KDS     ?? 't123';
const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID_KDS ?? 'r456';

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  try {
    const url = `${ORDERS_BASE}/orders/${id}?tenantId=${TENANT_ID}`;
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
    const text = await res.text();
    if (!res.ok) return NextResponse.json({ error: text }, { status: res.status });
    return NextResponse.json(JSON.parse(text));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Context) {
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const payload = { tenantId: TENANT_ID, restaurantId: RESTAURANT_ID, ...body, orderId: id };
    const res = await fetch(`${ORDERS_BASE}/orders`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) return NextResponse.json({ error: text }, { status: res.status });
    return NextResponse.json(text ? JSON.parse(text) : { success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 });
  }
}