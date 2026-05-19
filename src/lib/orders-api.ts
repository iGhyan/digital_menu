/**
 * Orders API — KDS integration
 * PATCH uses flags: kitchenAccepted / foodReady / delivered / cancelled
 * WebSocket: wss://6zvolh5t5b.execute-api.us-east-1.amazonaws.com/dev
 */

import type { KdsOrder, KdsStatus } from './types';

// ── Proxy URLs ─────────────────────────────────────────────────────────────────
const PROXY = {
  list:  () => '/api/orders',
  patch: (id: string) => `/api/orders/${id}`,
  post:  () => '/api/orders',
};

export const WS_URL = 'wss://6zvolh5t5b.execute-api.us-east-1.amazonaws.com/dev';

// ── API types ──────────────────────────────────────────────────────────────────
interface ApiLineItem {
  itemId:               string;
  name:                 string;
  quantity:             number;
  unitPriceMinorUnits:  number;
  totalPriceMinorUnits: number;
}

interface ApiOrder {
  orderId:                   string;
  status:                    string;
  tableId?:                  string;
  tenantId?:                 string;
  restaurantId?:             string;
  lineItems:                 ApiLineItem[];
  placedAt?:                 string;
  updatedAt?:                string;
  currencyCode?:             string;
  totalAmountMinorUnits?:    number;
  ttl?:                      number;
  PK?:                       string;
  SK?:                       string;
  stepFunctionsExecutionArn?: string;
  flags?: {
    kitchenAccepted: boolean;
    foodReady:       boolean;
    delivered:       boolean;
    cancelled:       boolean;
  };
}

interface ApiOrdersResponse {
  orders: ApiOrder[];
  count:  number;
}

// ── Flag payload per KDS status ────────────────────────────────────────────────
// Based on the API response examples:
// preparing → kitchenAccepted:true, foodReady:false, delivered:false, cancelled:false
// ready     → kitchenAccepted:true, foodReady:true,  delivered:false, cancelled:false
// delivered → kitchenAccepted:true, foodReady:true,  delivered:true,  cancelled:false
// cancelled → kitchenAccepted:false,foodReady:false, delivered:false, cancelled:true
export function toFlagPayload(orderId: string, status: KdsStatus) {
  const base = { orderId, kitchenAccepted: false, foodReady: false, delivered: false, cancelled: false };
  switch (status) {
    case 'preparing': return { ...base, kitchenAccepted: true };
    case 'ready':     return { ...base, kitchenAccepted: true, foodReady: true };
    case 'delivered': return { ...base, kitchenAccepted: true, foodReady: true, delivered: true };
    default:          return base;
  }
}

// ── Status mapping (GET response → KDS) ───────────────────────────────────────
export function toKdsStatus(apiStatus: string, flags?: ApiOrder['flags']): KdsStatus {
  // If flags present, derive from them (more accurate)
  if (flags) {
    if (flags.cancelled)       return 'delivered'; // show as done
    if (flags.delivered)       return 'delivered';
    if (flags.foodReady)       return 'ready';
    if (flags.kitchenAccepted) return 'preparing';
    return 'new';
  }
  const s = (apiStatus ?? '').toUpperCase();
  if (s === 'RECEIVED' || s === 'PENDING' || s === 'NEW') return 'new';
  if (s === 'PREPARING' || s === 'IN_PROGRESS')           return 'preparing';
  if (s === 'READY' || s === 'READY_TO_SERVE')            return 'ready';
  if (s === 'DELIVERED' || s === 'COMPLETED' || s === 'TIMED_OUT' || s === 'CANCELLED') return 'delivered';
  return 'new';
}

// ── Emoji guesser ──────────────────────────────────────────────────────────────
function guessEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('burger'))                              return '🍔';
  if (n.includes('pizza'))                               return '🍕';
  if (n.includes('pasta') || n.includes('carbonara'))   return '🍝';
  if (n.includes('rice'))                                return '🍚';
  if (n.includes('chicken'))                             return '🍗';
  if (n.includes('fish') || n.includes('sea bass'))     return '🐟';
  if (n.includes('steak') || n.includes('beef') || n.includes('wagyu')) return '🥩';
  if (n.includes('soup') || n.includes('ramen'))        return '🍜';
  if (n.includes('salad'))                               return '🥗';
  if (n.includes('cake') || n.includes('tiramisu') || n.includes('fondant')) return '🍰';
  if (n.includes('soda') || n.includes('juice') || n.includes('drink')) return '🥤';
  if (n.includes('coffee') || n.includes('tea'))        return '☕';
  if (n.includes('lobster'))                             return '🦞';
  if (n.includes('prawn') || n.includes('shrimp'))      return '🍤';
  if (n.includes('bread') || n.includes('naan'))        return '🍞';
  return '🍽️';
}

// ── Normalise API order → KDS ─────────────────────────────────────────────────
export function normaliseOrder(raw: ApiOrder): KdsOrder & { _apiId: string } {
  const tableNum = (raw.tableId ?? 'T?').replace(/[^0-9]/g, '').padStart(2, '0') || '??';
  const placedAt = raw.placedAt
    ? new Date(raw.placedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : '—';

  const items = (raw.lineItems ?? []).map(li => ({
    emoji: guessEmoji(li.name),
    name:  li.name,
    mods:  '',
    qty:   li.quantity,
    done:  false,
  }));

  const shortId = raw.orderId.slice(0, 6).toUpperCase();

  return {
    id:             `LM-${shortId}`,
    table:          tableNum,
    zone:           'Main Hall',
    status:         toKdsStatus(raw.status, raw.flags),
    elapsedSeconds: 0,
    maxSeconds:     1500,
    items,
    note:           '',
    placedAt,
    _apiId:         raw.orderId,
  } as any;
}

// ── GET all orders ─────────────────────────────────────────────────────────────
export async function fetchOrders(): Promise<(KdsOrder & { _apiId: string })[]> {
  const res = await fetch(PROXY.list(), { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Orders API ${res.status}: ${text}`);
  }
  const data: ApiOrdersResponse = await res.json();
  console.log('[Orders API] raw:', data);
  return (data.orders ?? []).map(normaliseOrder);
}

// ── PATCH order status using flags ────────────────────────────────────────────
export async function patchOrderStatus(apiOrderId: string, newStatus: KdsStatus): Promise<void> {
  const payload = toFlagPayload(apiOrderId, newStatus);
  console.log('[Orders API] PATCH payload:', payload);

  const res = await fetch(PROXY.patch(apiOrderId), {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PATCH ${res.status}: ${text}`);
  }
}