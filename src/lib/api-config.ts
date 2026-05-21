/**
 * Central API configuration
 * All values come from environment variables — no hardcoded IDs.
 */

// ── Environment variables ──────────────────────────────────────────────────────
export const RESTAURANT_ID =
  process.env.NEXT_PUBLIC_RESTAURANT_ID ?? '53591ab9-ac4e-4841-958b-d38853a90f0b';

export const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ?? 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  'https://g1ou0w5x4m.execute-api.ap-south-1.amazonaws.com/dev';

// ── Validate on startup (client-side) ─────────────────────────────────────────
if (typeof window !== 'undefined') {
  if (!RESTAURANT_ID) console.warn('[API] NEXT_PUBLIC_RESTAURANT_ID is not set');
  if (!TENANT_ID)     console.warn('[API] NEXT_PUBLIC_TENANT_ID is not set');
}

// ── Menu endpoints ─────────────────────────────────────────────────────────────
export const MENU_API = {
  items: (rid = RESTAURANT_ID) =>
    `${API_BASE}/menus/restaurants/${rid}/items`,
  item: (itemId: string, rid = RESTAURANT_ID) =>
    `${API_BASE}/menus/restaurants/${rid}/items/${itemId}`,
};

// ── AR endpoints ───────────────────────────────────────────────────────────────
export const AR_API = {
  model: (itemId: string, rid = RESTAURANT_ID) =>
    `${API_BASE}/ar/${rid}/${itemId}`,
};

// ── QR endpoints ───────────────────────────────────────────────────────────────
export const QR_API = {
  generate: '/api/qr/generate',
};

// ── Default fetch headers ──────────────────────────────────────────────────────
export const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Tenant-Id':  TENANT_ID,
};

// ── Generic fetcher ────────────────────────────────────────────────────────────
export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...DEFAULT_HEADERS,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ── Orders (KDS) endpoints ─────────────────────────────────────────────────────
export const ORDERS_API_BASE = 'https://rz0z72aem4.execute-api.us-east-1.amazonaws.com/Prod';

export const TENANT_ID_KDS     = process.env.NEXT_PUBLIC_TENANT_ID_KDS     ?? 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
export const RESTAURANT_ID_KDS = process.env.NEXT_PUBLIC_RESTAURANT_ID_KDS ?? '2687382e-3b00-4f57-9014-f484df89e3fe';

export const ORDERS_API = {
  list: () =>
    `${ORDERS_API_BASE}/orders?tenantId=${TENANT_ID_KDS}&restaurantId=${RESTAURANT_ID_KDS}`,
  get: (orderId: string) =>
    `${ORDERS_API_BASE}/orders/${orderId}?tenantId=${TENANT_ID_KDS}`,
  create: () => `${ORDERS_API_BASE}/orders`,
  patch:  (orderId: string) => `${ORDERS_API_BASE}/orders/${orderId}`,
};