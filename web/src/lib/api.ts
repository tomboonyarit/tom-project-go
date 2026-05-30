const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  params?: Record<string, string>;
}

export class ApiError extends Error {
  status: number;
  data: { error?: string; message?: string };

  constructor(status: number, data: { error?: string; message?: string }) {
    super(data.message || data.error || 'API Error');
    this.status = status;
    this.data = data;
  }
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token, params } = opts;

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let url = `${API_BASE}${path}`;
  if (params) {
    const search = new URLSearchParams(params);
    url += `?${search.toString()}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body && !(body instanceof FormData) ? JSON.stringify(body) : (body as BodyInit | undefined),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ===== Shared Types =====
export interface Booth {
  id: string;
  booth_name: string;
  market_id: string;
  booth_number?: string;
  status: string;
  description?: string;
  zone?: string;
}

export interface Product {
  id: string;
  booth_id: string;
  vendor_id?: string;
  name: string;
  price: number;
  sale_price?: number;
  unit: string;
  is_available: boolean;
  is_featured?: boolean;
  category_id?: string;
  created_at?: string;
  updated_at?: string;
}

// ===== Auth =====
export const authApi = {
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    api<{ user: unknown; token: string }>('/api/auth/register', { method: 'POST', body: data }),

  login: (data: { email: string; password: string }) =>
    api<{ user: unknown; token: string }>('/api/auth/login', { method: 'POST', body: data }),
};

// ===== Markets =====
export const marketApi = {
  list: (params?: { page?: number; page_size?: number; status?: string }) =>
    api<{ data: unknown[]; total: number; page: number; page_size: number }>('/api/markets', { params: params as Record<string, string> }),

  getById: (id: string) => api<unknown>(`/api/markets/${id}`),

  create: (data: unknown, token: string) =>
    api<unknown>('/api/markets', { method: 'POST', body: data, token }),

  update: (id: string, data: unknown, token: string) =>
    api<unknown>(`/api/markets/${id}`, { method: 'PUT', body: data, token }),

  delete: (id: string, token: string) =>
    api<{ message: string }>(`/api/markets/${id}`, { method: 'DELETE', token }),
};

// ===== Booths =====
export const boothApi = {
  listByMarket: (marketId: string, status?: string) =>
    api<unknown[]>(`/api/markets/${marketId}/booths`, { params: status ? { status } : undefined }),

  getById: (id: string) => api<unknown>(`/api/booths/${id}`),

  create: (marketId: string, data: unknown, token: string) =>
    api<unknown>(`/api/markets/${marketId}/booths`, { method: 'POST', body: data, token }),

  update: (id: string, data: unknown, token: string) =>
    api<unknown>(`/api/booths/${id}`, { method: 'PUT', body: data, token }),

  delete: (id: string, token: string) =>
    api<{ message: string }>(`/api/booths/${id}`, { method: 'DELETE', token }),
};

// ===== Categories =====
export const categoryApi = {
  list: () => api<unknown[]>('/api/categories'),
};

// ===== Products =====
export const productApi = {
  listByBooth: (boothId: string, params?: { page?: number; page_size?: number; available?: string }) =>
    api<{ data: unknown[]; total: number; page: number; page_size: number }>(`/api/booths/${boothId}/products`, { params: params as Record<string, string> }),

  getById: (id: string) => api<unknown>(`/api/products/${id}`),

  create: (boothId: string, data: unknown, token: string) =>
    api<unknown>(`/api/booths/${boothId}/products`, { method: 'POST', body: data, token }),

  update: (id: string, data: unknown, token: string) =>
    api<unknown>(`/api/products/${id}`, { method: 'PUT', body: data, token }),

  delete: (id: string, token: string) =>
    api<{ message: string }>(`/api/products/${id}`, { method: 'DELETE', token }),
};

// ===== Orders =====
export const orderApi = {
  create: (data: unknown, token: string) =>
    api<unknown>('/api/orders', { method: 'POST', body: data, token }),

  list: (token: string, params?: { page?: number; page_size?: number; booth_id?: string }) =>
    api<{ data: unknown[]; total: number; page: number; page_size: number }>('/api/orders', { params: params as Record<string, string>, token }),

  getById: (id: string, token: string) =>
    api<unknown>(`/api/orders/${id}`, { token }),

  updateStatus: (id: string, data: unknown, token: string) =>
    api<unknown>(`/api/orders/${id}/status`, { method: 'PUT', body: data, token }),

  updatePayment: (id: string, data: unknown, token: string) =>
    api<unknown>(`/api/orders/${id}/payment`, { method: 'PUT', body: data, token }),
};

// ===== Admin Types =====
export interface Market {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  location?: string;
  address?: string;
  image_url?: string;
  market_date?: string;
  start_time?: string;
  end_time?: string;
  status: string;
  created_by?: string;
  creator_name?: string;
  booth_count?: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  avatar_url?: string;
  address?: string;
  default_booth_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order?: number;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id?: string;
  booth_id?: string;
  booth_name?: string;
  market_id?: string;
  market_name?: string;
  vendor_id?: string;
  vendor_name?: string;
  total_amount: number;
  discount?: number;
  final_amount: number;
  status: string;
  payment_status?: string;
  payment_method?: string;
  customer_note?: string;
  created_at: string;
  updated_at?: string;
}

export interface DashboardStats {
  total_markets: number;
  active_markets: number;
  total_vendors: number;
  total_customers: number;
  orders_today: number;
  revenue_today: number;
  revenue_month: number;
  orders_by_status: { status: string; count: number }[];
  recent_orders: Order[];
}

export interface SalesReport {
  period_start: string;
  period_end: string;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  by_market?: { market_id: string; market_name: string; order_count: number; total_revenue: number }[];
  by_vendor?: { vendor_id: string; vendor_name: string; booth_name: string; order_count: number; total_revenue: number }[];
  daily_breakdown?: { date: string; order_count: number; total_revenue: number }[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

// ===== Admin API =====
export const adminApi = {
  // Dashboard
  getDashboard: (token: string) =>
    api<DashboardStats>('/api/admin/dashboard', { token }),

  // Markets
  listMarkets: (token: string, params?: Record<string, string>) =>
    api<PaginatedResponse<Market>>('/api/admin/markets', { params, token }),

  getMarket: (id: string, token: string) =>
    api<Market>(`/api/admin/markets/${id}`, { token }),

  createMarket: (data: Partial<Market>, token: string) =>
    api<Market>('/api/admin/markets', { method: 'POST', body: data, token }),

  updateMarket: (id: string, data: Partial<Market>, token: string) =>
    api<Market>(`/api/admin/markets/${id}`, { method: 'PUT', body: data, token }),

  deleteMarket: (id: string, token: string) =>
    api<{ message: string }>(`/api/admin/markets/${id}`, { method: 'DELETE', token }),

  // Booths
  listBooths: (token: string, params?: Record<string, string>) =>
    api<PaginatedResponse<Booth>>('/api/admin/booths', { params, token }),

  updateBoothStatus: (id: string, status: string, token: string) =>
    api<Booth>(`/api/admin/booths/${id}/status`, { method: 'PUT', body: { status }, token }),

  // Users
  listUsers: (token: string, params?: Record<string, string>) =>
    api<PaginatedResponse<UserProfile>>('/api/admin/users', { params, token }),

  updateUser: (id: string, data: Partial<UserProfile>, token: string) =>
    api<UserProfile>(`/api/admin/users/${id}`, { method: 'PUT', body: data, token }),

  // Categories
  createCategory: (data: { name: string; slug: string; description?: string }, token: string) =>
    api<Category>('/api/admin/categories', { method: 'POST', body: data, token }),

  updateCategory: (id: string, data: Partial<Category>, token: string) =>
    api<Category>(`/api/admin/categories/${id}`, { method: 'PUT', body: data, token }),

  deleteCategory: (id: string, token: string) =>
    api<{ message: string }>(`/api/admin/categories/${id}`, { method: 'DELETE', token }),

  // Reports
  getSalesReport: (token: string, params: { start_date?: string; end_date?: string; market_id?: string; vendor_id?: string }) =>
    api<SalesReport>('/api/admin/reports/sales', { params, token }),
};

// ===== Cart =====
export const cartApi = {
  getCart: (token: string) => api<{ cart: unknown; items: unknown[] }>('/api/cart', { token }),

  addItem: (data: { product_id: string; quantity: number; notes?: string }, token: string) =>
    api<unknown>('/api/cart/items', { method: 'POST', body: data, token }),

  updateItem: (itemId: string, data: { quantity: number; notes?: string }, token: string) =>
    api<unknown>(`/api/cart/items/${itemId}`, { method: 'PUT', body: data, token }),

  removeItem: (itemId: string, token: string) =>
    api<{ message: string }>(`/api/cart/items/${itemId}`, { method: 'DELETE', token }),

  clearCart: (token: string) =>
    api<{ message: string }>('/api/cart', { method: 'DELETE', token }),
};

// ===== Users =====
export const userApi = {
  getProfile: (token: string) => api<unknown>('/api/users/me', { token }),
  updateProfile: (data: unknown, token: string) =>
    api<unknown>('/api/users/me', { method: 'PUT', body: data, token }),
};

// ===== Vendor =====
export const vendorApi = {
  createOrder: (
    data: {
      booth_id: string;
      customer_name?: string;
      customer_description?: string;
      items: {
        product_id?: string;
        product_name: string;
        quantity: number;
        unit_price: number;
        notes?: string;
      }[];
      discount?: number;
    },
    token: string
  ) => api<unknown>('/api/vendor/orders', { method: 'POST', body: data, token }),

  listOrders: (token: string, params?: { page?: number; page_size?: number; status?: string }) =>
    api<{ data: unknown[]; total: number; page: number; page_size: number }>('/api/vendor/orders', { params: params as Record<string, string>, token }),

  getOrder: (id: string, token: string) =>
    api<{ order: unknown; items: unknown[] }>(`/api/vendor/orders/${id}`, { token }),

  updateStatus: (id: string, data: { status: string; vendor_note?: string }, token: string) =>
    api<unknown>(`/api/vendor/orders/${id}/status`, { method: 'PUT', body: data, token }),

  // New vendor endpoints
  listBooths: (token: string) =>
    api<Booth[]>('/api/vendor/booths', { token }),

  searchProducts: (boothId: string, query: string, token: string) =>
    api<Product[]>('/api/vendor/products', { params: { booth_id: boothId, q: query }, token }),

  getOrderWithItems: (id: string, token: string) =>
    api<{ order: unknown; items: unknown[] }>(`/api/vendor/orders/${id}`, { token }),

  listVendorProducts: (boothId: string, token: string) =>
    api<PaginatedResponse<Product>>('/api/vendor/products/list', { params: { booth_id: boothId }, token }),

  quickCreateProduct: (boothId: string, data: { name: string; price: number; unit?: string }, token: string) =>
    api<Product>(`/api/booths/${boothId}/products`, {
      method: 'POST',
      body: { name: data.name, price: data.price, unit: data.unit || 'ชิ้น', is_available: true },
      token,
    }),

  // Vendor Categories
  listVendorCategories: (token: string) =>
    api<{ id: string; name: string; slug: string; description?: string; vendor_id?: string }[]>('/api/vendor/categories', { token }),

  createVendorCategory: (data: { name: string; slug: string; description?: string }, token: string) =>
    api<{ id: string; name: string; slug: string; vendor_id?: string }>('/api/vendor/categories', { method: 'POST', body: data, token }),

  updateVendorCategory: (id: string, data: { name?: string; slug?: string; description?: string }, token: string) =>
    api<{ id: string; name: string; slug: string; vendor_id?: string }>(`/api/vendor/categories/${id}`, { method: 'PUT', body: data, token }),

  deleteVendorCategory: (id: string, token: string) =>
    api<{ message: string }>(`/api/vendor/categories/${id}`, { method: 'DELETE', token }),
};
