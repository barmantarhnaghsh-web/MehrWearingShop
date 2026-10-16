/** DTO types mirroring the MehrWearingShop API OpenAPI contract. */

export type Role = 'CUSTOMER' | 'ADMIN';
export type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentGateway = 'MOCK' | 'ZARINPAL' | 'COD';

export interface User {
  id: string;
  email: string;
  phone: string | null;
  role: Role;
  firstName: string;
  lastName: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface Category {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
  parentId: string | null;
  icon: string | null;
  imageUrl: string | null;
  productCount?: number;
  children?: Category[];
}

export interface Brand {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
  logoUrl: string | null;
  productCount?: number;
}

export interface Variant {
  id: string;
  sku: string;
  nameFa: string | null;
  nameEn: string | null;
  price: number | null;
  stock: number;
  attributes: Record<string, string | number> | null;
}

export interface Product {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
  descriptionFa: string | null;
  descriptionEn: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  images: string[];
  attributes: Record<string, string | number> | null;
  basePrice: number;
  minPrice: number;
  stock: number;
  ratingAvg: number;
  ratingCount: number;
  soldCount: number;
  isFeatured: boolean;
  isNew: boolean;
  category: Category | null;
  brand: Brand | null;
  variants: Variant[];
  createdAt: string;
}

export interface CartItem {
  id: string;
  quantity: number;
  variantId: string;
  sku: string;
  unitPrice: number;
  lineTotal: number;
  stock: number;
  variant: { id: string; nameFa: string | null; nameEn: string | null; attributes: Record<string, string | number> | null };
  product: { id: string; slug: string; nameFa: string; nameEn: string; image: string | null; category: string | null };
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  couponCode: string | null;
  couponReason?: string;
}

export interface Cart {
  id: string;
  guestId: string | null;
  couponCode: string | null;
  items: CartItem[];
  totals: CartTotals;
}

export interface Address {
  id?: string;
  fullName: string;
  phone: string;
  province: string;
  city: string;
  postalCode: string;
  addressLine: string;
  isDefault?: boolean;
}

export interface OrderItem {
  id: string;
  titleFa: string;
  titleEn: string;
  sku: string;
  variantNameFa: string | null;
  variantNameEn: string | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  couponCode: string | null;
  address: Address;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  payment: { gateway: PaymentGateway; status: string; amount: number; refId: string | null; paidAt: string | null } | null;
  items: OrderItem[];
  customer?: string;
  email?: string;
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  author: string;
  createdAt: string;
}

export interface Coupon {
  code: string;
  descriptionFa: string | null;
  descriptionEn: string | null;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AdminStats {
  users: number;
  products: number;
  orders: number;
  ordersToday: number;
  revenue: number;
  pendingOrders: number;
  lowStockVariants: number;
  recentOrders: Order[];
  topProducts: Product[];
}
