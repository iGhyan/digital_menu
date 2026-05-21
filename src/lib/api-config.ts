/**
 * Central API configuration
 */

export const RESTAURANT_ID =
  process.env.NEXT_PUBLIC_RESTAURANT_ID ?? '53591ab9-ac4e-4841-958b-d38853a90f0b';

// Admin menu management uses this restaurant (returns presigned S3 upload URLs)
export const ADMIN_RESTAURANT_ID =
  process.env.NEXT_PUBLIC_ADMIN_RESTAURANT_ID ?? '2687382e-3b00-4f57-9014-f484df89e3fe';

export const TENANT_ID =
  process.env.NEXT_PUBLIC_TENANT_ID ?? 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  'https://g1ou0w5x4m.execute-api.ap-south-1.amazonaws.com/dev';

if (typeof window !== 'undefined') {
  if (!RESTAURANT_ID) console.warn('[API] NEXT_PUBLIC_RESTAURANT_ID is not set');
  if (!TENANT_ID)     console.warn('[API] NEXT_PUBLIC_TENANT_ID is not set');
}

export const MENU_API = {
  items: (rid = RESTAURANT_ID) =>
    `${API_BASE}/menus/restaurants/${rid}/items`,
  item: (itemId: string, rid = RESTAURANT_ID) =>
    `${API_BASE}/menus/restaurants/${rid}/items/${itemId}`,
};

export const AR_API = {
  model: (itemId: string, rid = RESTAURANT_ID) =>
    `${API_BASE}/ar/${rid}/${itemId}`,
};

export const QR_API = {
  generate: '/api/qr/generate',
};

export const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Tenant-Id':  TENANT_ID,
};

export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { ...DEFAULT_HEADERS, ...options?.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const ORDERS_API_BASE = 'https://rz0z72aem4.execute-api.us-east-1.amazonaws.com/Prod';

export const TENANT_ID_KDS     = process.env.NEXT_PUBLIC_TENANT_ID_KDS     ?? 't123';
export const RESTAURANT_ID_KDS = process.env.NEXT_PUBLIC_RESTAURANT_ID_KDS ?? 'r456';

export const ORDERS_API = {
  list:   () => `${ORDERS_API_BASE}/orders?tenantId=${TENANT_ID_KDS}&restaurantId=${RESTAURANT_ID_KDS}`,
  get:    (orderId: string) => `${ORDERS_API_BASE}/orders/${orderId}?tenantId=${TENANT_ID_KDS}`,
  create: () => `${ORDERS_API_BASE}/orders`,
  patch:  (orderId: string) => `${ORDERS_API_BASE}/orders/${orderId}`,
};