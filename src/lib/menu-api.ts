/**
 * Menu API service
 */

import { MENU_API, AR_API, apiFetch, RESTAURANT_ID, ADMIN_RESTAURANT_ID } from './api-config';

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

export async function fetchMenuItems(restaurantId?: string): Promise<ApiMenuItem[]> {
  try {
    const rid = (restaurantId && restaurantId.trim()) ? restaurantId.trim() : RESTAURANT_ID;
    const data = await apiFetch<ApiMenuResponse | ApiMenuItem[]>(MENU_API.items(rid));
    let items: any[] = [];
    if (Array.isArray(data)) items = data;
    else if (data && 'items' in data) items = (data as ApiMenuResponse).items;
    return items.map(normaliseItem);
  } catch (err) {
    throw err;
  }
}

export async function fetchMenuItem(itemId: string, restaurantId?: string): Promise<ApiMenuItem> {
  const rid = (restaurantId && restaurantId.trim()) ? restaurantId.trim() : RESTAURANT_ID;

  // Step 1: menu-lambda se item fetch karo
  const item = await apiFetch<any>(MENU_API.item(itemId, rid));

  // Step 2: ar-assets-lambda se presigned arModelUrl fetch karo
  try {
    const arData = await apiFetch<any>(AR_API.model(itemId, rid));
    // arData.presignedUrl — download URL for existing AR model
    return normaliseItem({ ...item, arModelUrl: arData.presignedUrl });
  } catch {
    // AR model exist nahi karta — theek hai, sirf item return karo
    return normaliseItem(item);
  }
}

export async function createMenuItem(payload: Partial<ApiMenuItem>): Promise<ApiMenuItem> {
  const { price, status, ...rest } = payload as any;
  const apiPayload = {
    ...rest,
    priceMinorUnits: Math.round((price ?? 0) * 100),
    ...(status != null && { isActive: status === 'active' }),
  };
  return apiFetch<ApiMenuItem>(MENU_API.items(ADMIN_RESTAURANT_ID), {
    method: 'POST',
    body:   JSON.stringify(apiPayload),
  });
}

export async function updateMenuItem(
  itemId:   string,
  payload:  Partial<ApiMenuItem>,
  version?: number,
): Promise<ApiMenuItem> {
  const { price, status, ...rest } = payload as any;
  const apiPayload = {
    ...rest,
    priceMinorUnits: Math.round((price ?? 0) * 100),
    ...(status != null && { isActive: status === 'active' }),
    ...(version != null && { version }),
  };
  return apiFetch<ApiMenuItem>(MENU_API.item(itemId, ADMIN_RESTAURANT_ID), {
    method: 'PUT',
    body:   JSON.stringify(apiPayload),
  });
}

export async function deleteMenuItem(itemId: string): Promise<void> {
  await apiFetch<void>(MENU_API.item(itemId, ADMIN_RESTAURANT_ID), { method: 'DELETE' });
}

export function normaliseItem(raw: any): ApiMenuItem {
  const id = raw.id ?? raw.itemId ?? raw.item_id ?? raw._id ?? crypto.randomUUID();

  const price = raw.priceMinorUnits != null
    ? Number(raw.priceMinorUnits) / 100
    : Number(raw.price ?? raw.unitPrice ?? 0);

  const status: 'active' | 'inactive' | 'draft' =
    raw.status ?? (raw.isActive === true ? 'active' : raw.isActive === false ? 'inactive' : 'active');

  const rawAllergens = raw.allergens ?? [];
  const allergens = Array.isArray(rawAllergens) && typeof rawAllergens[0] === 'string'
    ? rawAllergens.map((a: string) => ({
        name:   a.charAt(0) + a.slice(1).toLowerCase(),
        emoji:  a === 'GLUTEN' ? '🌾' : a === 'DAIRY' ? '🥛' : a === 'NUTS' ? '🥜' : a === 'EGG' ? '🥚' : a === 'FISH' ? '🐟' : '⚠️',
        status: 'present' as const,
      }))
    : rawAllergens;

  const hasArModel = !!(raw.arModelUrl || raw.arModelKey);

  const KNOWN_CATS: Record<string, string> = {
    'e933848e-0d18-4e3a-b0a8-d70275c2fa54': 'Main Course',
  };
  const rawCategory = raw.category ?? raw.categoryId ?? 'other';
  const categoryDisplay = raw.categoryName
    ?? KNOWN_CATS[raw.categoryId ?? '']
    ?? (rawCategory && !rawCategory.includes('-') ? rawCategory : `Cat-${rawCategory.slice(0, 6)}`);

  return {
    ...raw,
    id, price, status, allergens, hasArModel,
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
    category:    categoryDisplay,
    categoryId:  raw.categoryId  ?? raw.category  ?? '',
    imageUrl:    raw.imageUrl    ?? null,
    arModelUrl:  raw.arModelUrl  ?? null,
    arModelKey:  raw.arModelKey  ?? null,
    imageKey:    raw.imageKey    ?? null,
    version:     raw.version     ?? 1,
  };
}

export interface ApiCategory { id: string; name: string; slug?: string; }

export async function fetchCategories(): Promise<ApiCategory[]> {
  return [];
}

export function extractCategoriesFromItems(items: ApiMenuItem[]): ApiCategory[] {
  const seen = new Map<string, string>();
  for (const item of items) {
    const id   = (item as any).categoryId ?? item.category;
    const name = item.category ?? id;
    if (id && !seen.has(id)) seen.set(id, name);
  }
  return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
}