/**
 * Menu API service
 * Typed wrappers around the AWS API Gateway menu endpoints.
 */

import { MENU_API, apiFetch, RESTAURANT_ID as CONFIG_RID } from './api-config';

// Runtime restaurant ID — reads env directly as fallback
function getRestaurantId(): string {
  return CONFIG_RID
    || process.env.NEXT_PUBLIC_RESTAURANT_ID
    || '';
}

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
export async function fetchMenuItems(restaurantId?: string): Promise<ApiMenuItem[]> {
  try {
    const rid = restaurantId || getRestaurantId();
    if (!rid) {
      throw new Error('Restaurant ID is missing. Set NEXT_PUBLIC_RESTAURANT_ID in env or pass rid param.');
    }
    const data = await apiFetch<ApiMenuResponse | ApiMenuItem[]>(MENU_API.items(rid));
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
export async function fetchMenuItem(itemId: string, restaurantId?: string): Promise<ApiMenuItem> {
  const rid = restaurantId || getRestaurantId();
  return apiFetch<ApiMenuItem>(MENU_API.item(itemId, rid));
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
  // id: API returns itemId
  const id = raw.id ?? raw.itemId ?? raw.item_id ?? raw._id ?? crypto.randomUUID();

  // price: API returns priceMinorUnits (in cents) → convert to major units
  const priceRaw = raw.price ?? raw.priceMinorUnits ?? raw.unitPrice ?? 0;
  const price = raw.priceMinorUnits != null
    ? Number(raw.priceMinorUnits) / 100
    : Number(priceRaw);

  // status: API returns isActive boolean
  const status: 'active' | 'inactive' | 'draft' =
    raw.status ?? (raw.isActive === true ? 'active' : raw.isActive === false ? 'inactive' : 'active');

  // allergens: API returns string array like ["GLUTEN","DAIRY"]
  const rawAllergens = raw.allergens ?? [];
  const allergens = Array.isArray(rawAllergens) && typeof rawAllergens[0] === 'string'
    ? rawAllergens.map((a: string) => ({
        name:   a.charAt(0) + a.slice(1).toLowerCase(),
        emoji:  a === 'GLUTEN' ? '🌾' : a === 'DAIRY' ? '🥛' : a === 'NUTS' ? '🥜' : a === 'EGG' ? '🥚' : a === 'FISH' ? '🐟' : '⚠️',
        status: 'present' as const,
      }))
    : rawAllergens;

  // arModelUrl: if present, item has a 3D model
  const hasArModel = !!(raw.arModelUrl || raw.arModelKey);

  return {
    ...raw,
    id,
    price,
    status,
    allergens,
    hasArModel,
    emoji:       raw.emoji       ?? '🍽️',
    tags:        raw.tags        ?? [],
    rating:      raw.rating      ?? 4.5,
    reviewCount: raw.reviewCount ?? 0,
    prepTime:    raw.prepTime    ?? raw.prep_time ?? '20 min',
    calories:    raw.calories    ?? 0,
    protein:     raw.protein     ?? 0,
    fat:         raw.fat         ?? 0,
    carbs:       raw.carbs       ?? 0,
    subtitle:    raw.subtitle    ?? raw.subTitle ?? '',
    name:        raw.name        ?? raw.itemName ?? 'Unnamed Item',
    description: raw.description ?? raw.desc     ?? '',
    category:    raw.category    ?? raw.categoryId ?? 'other',
    categoryId:  raw.categoryId  ?? raw.category  ?? '',
    imageUrl:    raw.imageUrl    ?? null,
    arModelUrl:  raw.arModelUrl  ?? null,
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
    if (Array.isArray(data) && data.length > 0) return data;
    if ('categories' in data && (data as any).categories?.length > 0) return (data as any).categories;
    return [];
  } catch (err) {
    console.error('[Menu API] fetchCategories error:', err);
    // Categories endpoint may not exist — caller will handle empty array
    return [];
  }
}

/**
 * Extract unique categoryId values from existing menu items.
 * Used as fallback when /categories endpoint is unavailable.
 */
export function extractCategoriesFromItems(items: ApiMenuItem[]): ApiCategory[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const id   = (item as any).categoryId ?? item.category;
    const name = item.category ?? id;
    if (id && !seen.has(id)) seen.set(id, name);
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}