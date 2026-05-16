// ─── Menu ────────────────────────────────────────────────────────────────────

export type AllergenStatus = 'present' | 'free';

export interface Allergen {
  name: string;
  emoji: string;
  status: AllergenStatus;
}

export interface MenuItem {
  id: string;
  name: string;
  subtitle?: string;
  category: string;
  price: number;          // in PKR
  description: string;
  emoji: string;
  rating: number;
  reviewCount: number;
  prepTime: string;       // e.g. "25–30 min"
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  allergens: Allergen[];
  tags: ('veg' | 'spicy' | 'new' | 'popular' | 'chef')[];
  status: 'active' | 'inactive' | 'draft';
  customisations?: {
    doneness?: string[];
    sides?: string[];
    sauces?: string[];
  };
  imageUrl?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  emoji: string;
  itemCount: number;
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  emoji: string;
  price: number;
  quantity: number;
  options: {
    doneness?: string;
    side?: string;
    sauce?: string;
  };
  notes?: string;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'READY' | 'DELIVERED';

export interface Order {
  id: string;
  tableNumber: string;
  outlet: string;
  status: OrderStatus;
  items: CartItem[];
  subtotal: number;
  serviceCharge: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  promoCode?: string;
  placedAt: string;
  estimatedReadyAt?: string;
}

// ─── KDS ─────────────────────────────────────────────────────────────────────

export type KdsStatus = 'new' | 'preparing' | 'ready' | 'delivered';

export interface KdsOrderItem {
  emoji: string;
  name: string;
  mods: string;
  qty: number;
  done: boolean;
}

export interface KdsOrder {
  id: string;
  table: string;
  zone: string;
  status: KdsStatus;
  elapsedSeconds: number;
  maxSeconds: number;
  items: KdsOrderItem[];
  note: string;
  placedAt: string;
}

// ─── Admin / Users ────────────────────────────────────────────────────────────

export type UserRole = 'super' | 'manager' | 'kitchen';

export interface AdminUser {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: UserRole;
  mfaEnabled: boolean;
  isOnline: boolean;
  lastLogin: string;
}

// ─── QR Codes ────────────────────────────────────────────────────────────────

export interface QrTable {
  tableNumber: string;
  zone: string;
  outlet: string;
  linked: boolean;
  url: string;
}
