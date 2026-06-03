const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// ── Helpers ──────────────────────────────────────────────

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...authHeaders(),
  };
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      errMsg = errBody.error || errBody.message || errMsg;
    } catch {
      // use default
    }
    throw new Error(errMsg);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function get<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("POST", path, body);
}

function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("PUT", path, body);
}

function del<T>(path: string): Promise<T> {
  return request<T>("DELETE", path);
}

// ── Auth ──────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  vendor: Vendor;
}

export interface Vendor {
  id: string;
  phone: string;
  name: string;
  booth_name?: string;
  promptpay_id?: string;
}

export const authApi = {
  register(
    phone: string,
    pin: string,
    name: string,
    boothName?: string,
  ): Promise<LoginResponse> {
    return post<LoginResponse>("/auth/register", {
      phone,
      pin,
      name,
      booth_name: boothName,
    });
  },
  login(phone: string, pin: string): Promise<LoginResponse> {
    return post<LoginResponse>("/auth/login", { phone, pin });
  },
};

// ── Products ──────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  price: number; // in satang
  unit: string;
  category_id?: string;
  category_name?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateProductInput {
  name: string;
  price: number; // in satang
  unit?: string;
  category_id?: string;
  image_url?: string;
}

export interface UpdateProductInput {
  name?: string;
  price?: number;
  unit?: string;
  category_id?: string;
  image_url?: string;
  is_active?: boolean;
}

export const productApi = {
  list(search?: string, categoryId?: string): Promise<Product[]> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryId) params.set("category_id", categoryId);
    const qs = params.toString();
    return get<Product[]>(`/products${qs ? `?${qs}` : ""}`);
  },
  create(data: CreateProductInput): Promise<Product> {
    return post<Product>("/products", data);
  },
  update(id: string, data: UpdateProductInput): Promise<Product> {
    return put<Product>(`/products/${id}`, data);
  },
  delete(id: string): Promise<{ success: boolean }> {
    return del<{ success: boolean }>(`/products/${id}`);
  },
  quickCreate(name: string, price: number): Promise<Product> {
    return post<Product>("/products/quick", { name, price });
  },
};

// ── Categories ────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  product_count?: number;
}

export const categoryApi = {
  list(): Promise<Category[]> {
    return get<Category[]>("/categories");
  },
  create(name: string, sortOrder?: number): Promise<Category> {
    return post<Category>("/categories", {
      name,
      sort_order: sortOrder ?? 0,
    });
  },
  update(id: string, data: Partial<Pick<Category, "name" | "sort_order">>): Promise<Category> {
    return put<Category>(`/categories/${id}`, data);
  },
  delete(id: string): Promise<{ success: boolean }> {
    return del<{ success: boolean }>(`/categories/${id}`);
  },
};

// ── Orders ────────────────────────────────────────────────

export type OrderStatus =
  | "new"
  | "preparing"
  | "paid"
  | "completed"
  | "cancelled";

export type PaymentMethod = "cash" | "promptpay";

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  qty: number;
  price: number; // satang per unit
  subtotal: number; // satang
}

export interface Order {
  id: string;
  order_no: string;
  vendor_id: string;
  item_count?: number;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: OrderStatus;
  payment_method?: PaymentMethod;
  payment_status?: string;
  customer_note?: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderListResponse {
  orders: Order[];
  total_orders: number;
  total_revenue: number;
}

export interface CreateOrderInput {
  items: Array<{ product_id: string; qty: number; price: number; notes?: string }>;
  discount?: number;
  customer_note?: string;
  tags?: string[];
  payment_method?: PaymentMethod;
}

export const orderApi = {
  create(input: CreateOrderInput): Promise<Order> {
    return post<Order>("/orders", input);
  },
  list(date?: string, status?: string): Promise<OrderListResponse> {
    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (status) params.set("status", status);
    const qs = params.toString();
    return get<OrderListResponse>(`/orders${qs ? `?${qs}` : ""}`);
  },
  get(id: string): Promise<Order> {
    return get<Order>(`/orders/${id}`);
  },
  updateStatus(id: string, status: OrderStatus): Promise<Order> {
    return put<Order>(`/orders/${id}/status`, { status });
  },
  updatePayment(id: string, method: PaymentMethod): Promise<Order> {
    return put<Order>(`/orders/${id}/payment`, { payment_method: method });
  },
  updateTags(id: string, tags: string[]): Promise<{ tags: string }> {
    return put<{ tags: string }>(`/orders/${id}/tags`, { tags });
  },
};

// ── Reports ───────────────────────────────────────────────

export interface DailyReport {
  date: string;
  total_orders: number;
  total_revenue: number;
  total_discount: number;
  by_payment: Array<{
    payment_method: string;
    count: number;
    total: number;
  }>;
  top_products: Array<{
    product_name: string;
    total_qty: number;
    total_amount: number;
  }>;
}

export interface MonthlyReport {
  month: string;
  total_orders: number;
  total_revenue: number;
  total_discount: number;
  by_payment: Array<{
    payment_method: string;
    count: number;
    total: number;
  }>;
  daily: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
}

export const reportApi = {
  daily(date: string): Promise<DailyReport> {
    return get<DailyReport>(`/reports/daily?date=${date}`);
  },
  monthly(month: string): Promise<MonthlyReport> {
    return get<MonthlyReport>(`/reports/monthly?month=${month}`);
  },
};

// ── Profile ───────────────────────────────────────────────

export interface ProfileUpdateInput {
  name?: string;
  booth_name?: string;
  promptpay_id?: string;
  old_pin?: string;
  new_pin?: string;
}

export const profileApi = {
  get(): Promise<Vendor> {
    return get<Vendor>("/profile");
  },
  update(data: ProfileUpdateInput): Promise<Vendor> {
    return put<Vendor>("/profile", data);
  },
};

export interface CustomerTag {
  id: string;
  name: string;
  sort_order: number;
}

// ── QR ────────────────────────────────────────────────────

export const qrApi = {
  async getPromptPayQR(amount: number): Promise<string> {
    const headers = authHeaders();
    const res = await fetch(`${API_URL}/qr/promptpay?amount=${amount}`, {
      headers,
    });
    if (!res.ok) throw new Error("สร้าง QR Code ไม่สำเร็จ");
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};

// ── Tags ──────────────────────────────────────────────────

export const tagApi = {
  list(): Promise<{ tags: CustomerTag[] }> {
    return get<{ tags: CustomerTag[] }>("/tags");
  },
  create(name: string): Promise<CustomerTag> {
    return post<CustomerTag>("/tags", { name });
  },
  delete(id: string): Promise<{ success: boolean }> {
    return del<{ success: boolean }>(`/tags/${id}`);
  },
};
