import { NextRequest, NextResponse } from 'next/server';

const API_BASE =
  'https://987eskfgd8.execute-api.ap-south-1.amazonaws.com/Prod/ar';

// Extracted from the S3 path in your presigned URL:
// TENANT#a1b2c3d4-e5f6-7890-abcd-ef1234567890/restaurants/...
const TENANT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rid = searchParams.get('rid');
  const iid = searchParams.get('iid');

  if (!rid || !iid) {
    return NextResponse.json(
      { error: 'Missing rid or iid query parameters' },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(`${API_BASE}/${rid}/${iid}`, {
      cache: 'no-store',
      headers: {
        'Accept':       'application/json',
        'x-tenant-id':  TENANT_ID,
      },
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream API error ${upstream.status}`, detail: text },
        { status: upstream.status },
      );
    }

    return NextResponse.json(JSON.parse(text), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Proxy fetch failed', detail: err?.message ?? String(err) },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}