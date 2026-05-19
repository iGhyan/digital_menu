/**
 * Menu API service
 * Typed wrappers around the AWS API Gateway menu endpoints.
 */

import { MENU_API, apiFetch } from './api-config';

// ── API response types ─────────────────────────────────────────────────────────
export interface ApiMenuItem {
  id:          string;
  name:        string;
  description: string;
  price:       number;
  category:    string;
  categoryId?: string;
  status:      'active' | 'inactive' | 'draft';
  imageUrl?:   string;
  emoji?:      string;
  tags?:       string[];
  prepTime?:   string;
  calories?:   number;
  protein?:    number;
  fat?:        number;
  carbs?:      number;
  rating?:     number;
  reviewCount?: number;
  allergens?:  { name: string; emoji: string; status: 'present' | 'free' }[];
  subtitle?:   string;
  customisations?: {
    doneness?: string[];
    sides?:    string[];
    sauces?:   string[];
  };
  restaurantId?: string;
  createdAt?:    string;
  updatedAt?:    string;
}

export interface ApiMenuResponse {
  items:  ApiMenuItem[];
  total?: number;
  page?:  number;
}

// ── GET all items ──────────────────────────────────────────────────────────────
export async function fetchMenuItems(): Promise<ApiMenuItem[]> {
  try {
    const data = await apiFetch<ApiMenuResponse | ApiMenuItem[]>(MENU_API.items());
    // Handle both { items: [...] } and [...] response shapes
    let items: any[] = [];
    if (Array.isArray(data)) items = data;
    else if (data && 'items' in data) items = data.items;

    // Debug — shows exact API field names in browser console
    if (items.length > 0) {
      console.log('[API] Response shape — keys:', Object.keys(items[0]));
      console.log('[API] First item raw:', JSON.stringify(items[0], null, 2));
    }

    return items.map(normaliseItem);
  } catch (err) {
    console.error('[Menu API] fetchMenuItems error:', err);
    throw err;
  }
}

// ── GET item by ID ─────────────────────────────────────────────────────────────
export async function fetchMenuItem(itemId: string): Promise<ApiMenuItem> {
  return apiFetch<ApiMenuItem>(MENU_API.item(itemId));
}

// ── POST create item ───────────────────────────────────────────────────────────
export async function createMenuItem(
  payload: Partial<ApiMenuItem>,
): Promise<ApiMenuItem> {
  return apiFetch<ApiMenuItem>(MENU_API.items(), {
    method: 'POST',
    body:   JSON.stringify(payload),
  });
}

// ── PUT update item ────────────────────────────────────────────────────────────
export async function updateMenuItem(
  itemId:  string,
  payload: Partial<ApiMenuItem>,
): Promise<ApiMenuItem> {
  return apiFetch<ApiMenuItem>(MENU_API.item(itemId), {
    method: 'PUT',
    body:   JSON.stringify(payload),
  });
}

// ── DELETE item ────────────────────────────────────────────────────────────────
export async function deleteMenuItem(itemId: string): Promise<void> {
  await apiFetch<void>(MENU_API.item(itemId), { method: 'DELETE' });
}

// ── Normalise API item → local shape ──────────────────────────────────────────
// Maps API fields to whatever your UI expects
export function normaliseItem(raw: any): ApiMenuItem {
  // Handle different id field names the API might return
  const id =
    raw.id       ??
    raw.itemId   ??
    raw.item_id  ??
    raw._id      ??
    crypto.randomUUID();

  // Handle different price field names
  const price =
    raw.price     ??
    raw.unitPrice ??
    raw.amount    ??
    0;

  return {
    ...raw,
    id,
    price:       Number(price),
    emoji:       raw.emoji       ?? '🍽️',
    tags:        raw.tags        ?? [],
    rating:      raw.rating      ?? 4.5,
    reviewCount: raw.reviewCount ?? 0,
    prepTime:    raw.prepTime    ?? raw.prep_time ?? '20 min',
    calories:    raw.calories    ?? 0,
    protein:     raw.protein     ?? 0,
    fat:         raw.fat         ?? 0,
    carbs:       raw.carbs       ?? 0,
    allergens:   raw.allergens   ?? [],
    subtitle:    raw.subtitle    ?? raw.subTitle ?? '',
    status:      raw.status      ?? 'active',
    name:        raw.name        ?? raw.itemName ?? 'Unnamed Item',
    description: raw.description ?? raw.desc     ?? '',
    category:    raw.category    ?? raw.categoryId ?? 'other',
  };
}

// ── GET categories ─────────────────────────────────────────────────────────────
export interface ApiCategory {
  id:   string;  // UUID
  name: string;
  slug?: string;
}

export async function fetchCategories(): Promise<ApiCategory[]> {
  try {
    const { API_BASE, RESTAURANT_ID, apiFetch } = await import('./api-config');
    const url = `${API_BASE}/menus/restaurants/${RESTAURANT_ID}/categories`;
    const data = await apiFetch<ApiCategory[] | { categories: ApiCategory[] }>(url);
    if (Array.isArray(data)) return data;
    if ('categories' in data) return data.categories;
    return [];
  } catch (err) {
    console.error('[Menu API] fetchCategories error:', err);
    return [];
  }
}