export interface ArApiResponse {
  itemId:       string;
  restaurantId: string;
  presignedUrl: string;
  expiresIn:    number;
  cfDomain:     string;
}

/**
 * Calls our local Next.js proxy /api/ar which forwards to AWS server-side.
 * This avoids CORS — the browser never touches the AWS URL directly.
 */
export async function fetchArModel(
  restaurantId: string,
  itemId: string,
): Promise<ArApiResponse> {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const url  = `${base}/api/ar?rid=${encodeURIComponent(restaurantId)}&iid=${encodeURIComponent(itemId)}`;
  const res  = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`AR proxy error ${res.status}: ${body}`);
  }
  return res.json() as Promise<ArApiResponse>;
}

export const DEMO_RESTAURANT_ID = '2687382e-3b00-4f57-9014-f484df89e3fe';
export const DEMO_ITEM_ID       = 'ba30dab0-8323-4ed6-8d60-716fb8b6b4b0';