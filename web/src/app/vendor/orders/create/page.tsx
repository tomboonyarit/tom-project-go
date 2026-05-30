'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { vendorApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Booth, Product } from '@/lib/api';
import ProductGrid from './_components/ProductGrid';
import CartDrawer from './_components/CartDrawer';

// ===== Types =====
interface CartItem {
  id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit?: string;
  subtotal: number;
}

interface ToastMessage {
  message: string;
  type: 'success' | 'error';
}

// ===== Helpers =====
const generateCartId = (() => {
  let counter = 0;
  return () => {
    counter += 1;
    return `cart-${Date.now()}-${counter}`;
  };
})();

// ===== Page =====
export default function VendorCreateOrderPage() {
  const { isAuthenticated, token, user } = useAuth();
  const router = useRouter();

  // ---- Auth guard ----
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (user && user.role !== 'vendor' && user.role !== 'admin') {
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  // ---- Booth state ----
  const [booths, setBooths] = useState<Booth[]>([]);
  const [selectedBoothId, setSelectedBoothId] = useState('');
  const [loadingBooths, setLoadingBooths] = useState(true);

  // ---- Product state ----
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);

  // ---- Cart state ----
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ---- Category state ----
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // ---- Observation state ----
  const [observationGender, setObservationGender] = useState('');
  const [observationShirt, setObservationShirt] = useState('');
  const [observationPants, setObservationPants] = useState('');
  const [customerDescription, setCustomerDescription] = useState('');

  // ---- Last order template ----
  const [hasLastOrder, setHasLastOrder] = useState(false);

  // ---- Toast ----
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // ---- Toast auto-dismiss ----
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- Load booths & auto-select default ----
  useEffect(() => {
    if (!token) return;

    const fetchBooths = async () => {
      setLoadingBooths(true);
      try {
        const data = await vendorApi.listBooths(token);
        const boothList = (data as Booth[]) || [];
        setBooths(boothList);

        // Auto-select default booth
        const defaultId = (user as { default_booth_id?: string })?.default_booth_id;
        if (defaultId && boothList.some((b) => b.id === defaultId)) {
          setSelectedBoothId(defaultId);
        } else if (boothList.length === 1) {
          setSelectedBoothId(boothList[0].id);
        } else if (boothList.length > 1) {
          // Pick first available
          const first = boothList.find(
            (b) => b.status === 'active' || b.status === 'available'
          );
          setSelectedBoothId(first?.id || boothList[0].id);
        }
      } catch {
        showError('ไม่สามารถโหลดข้อมูลบูธ');
      } finally {
        setLoadingBooths(false);
      }
    };

    fetchBooths();
  }, [token, user]);

  // ---- Fetch categories ----
  useEffect(() => {
    if (!token) return;
    vendorApi
      .listVendorCategories(token)
      .then((data) => {
        const cats = (data as { id: string; name: string }[]) || [];
        setCategories(cats);
      })
      .catch(() => {});
  }, [token]);

  // ---- Load products when booth/search changes ----
  useEffect(() => {
    if (!token || !selectedBoothId) return;

    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const data = await vendorApi.searchProducts(
          selectedBoothId,
          searchQuery,
          token
        );
        setProducts(data as Product[]);
      } catch {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [selectedBoothId, searchQuery, token]);

  // ---- Load last order for template button ----
  useEffect(() => {
    if (!token) return;

    vendorApi
      .listOrders(token, { page_size: 1 })
      .then(async (res) => {
        const orders = (res as { data: unknown[] })?.data || [];
        if (orders.length > 0) {
          setHasLastOrder(true);
        }
      })
      .catch(() => {
        // Silent — last order is optional UX
      });
  }, [token]);

  // ---- Toast helpers ----
  const showError = useCallback((message: string) => {
    setToast({ message, type: 'error' });
  }, []);

  const showSuccess = useCallback((message: string) => {
    setToast({ message, type: 'success' });
  }, []);

  // ---- Cart actions ----
  const addToCart = useCallback((product: Product, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find(
        (item) => item.product_id && item.product_id === product.id
      );
      if (existing) {
        const newQty = existing.quantity + quantity;
        return prev.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                quantity: newQty,
                subtotal: newQty * item.unit_price,
              }
            : item
        );
      }

      const price = product.sale_price ?? product.price;
      const newItem: CartItem = {
        id: generateCartId(),
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: price,
        unit: product.unit,
        subtotal: quantity * price,
      };
      return [...prev, newItem];
    });
  }, []);

  const updateCartItem = useCallback(
    (id: string, updates: Partial<CartItem>) => {
      setCartItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const quantity = updates.quantity ?? item.quantity;
          const unitPrice = updates.unit_price ?? item.unit_price;
          return { ...item, ...updates, subtotal: quantity * unitPrice };
        })
      );
    },
    []
  );

  const removeCartItem = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // ---- Compute total ----
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.subtotal, 0),
    [cartItems]
  );
  const total = useMemo(
    () => Math.max(0, subtotal - discount),
    [subtotal, discount]
  );

  // ---- Submit ----
  const handleSubmit = useCallback(async () => {
    if (!token || !selectedBoothId) return;

    if (cartItems.length === 0) {
      showError('กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    // Build observation description
    const descriptionParts: string[] = [];
    if (observationGender) descriptionParts.push(`เพศ:${observationGender}`);
    if (observationShirt) descriptionParts.push(`เสื้อ:${observationShirt}`);
    if (observationPants) descriptionParts.push(`กางเกง:${observationPants}`);
    if (customerDescription.trim()) descriptionParts.push(`อื่นๆ:${customerDescription.trim()}`);

    setSubmitting(true);
    try {
      await vendorApi.createOrder(
        {
          booth_id: selectedBoothId,
          customer_name: customerName.trim() || undefined,
          customer_description: descriptionParts.length > 0 ? descriptionParts.join(', ') : undefined,
          items: cartItems.map((item) => ({
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            notes: item.unit && item.unit !== 'ชิ้น' ? item.unit : undefined,
          })),
          ...(discount > 0 ? { discount } : {}),
        },
        token
      );

      showSuccess('สร้างออเดอร์สำเร็จ ✅');

      // Reset form immediately — ready for next customer
      setCartItems([]);
      setDiscount(0);
      setCustomerName('');
      setObservationGender('');
      setObservationShirt('');
      setObservationPants('');
      setCustomerDescription('');
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }; message?: string };
      showError(e?.data?.message || e?.message || 'สร้างออเดอร์ไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  }, [token, selectedBoothId, cartItems, customerName, discount, observationGender, observationShirt, observationPants, customerDescription, showError, showSuccess]);

  // ---- Load last order as template ----
  const loadLastOrder = useCallback(async () => {
    if (!token) return;

    try {
      const res = await vendorApi.listOrders(token, { page_size: 1 });
      const orders = (res as { data: { id: string }[] })?.data || [];
      if (orders.length === 0) return;

      const orderData = await vendorApi.getOrderWithItems(orders[0].id, token);
      const items = ((orderData as { items: unknown[] })?.items || []).map(
        (item: unknown, idx: number) => {
          const i = item as {
            product_id?: string;
            product_name: string;
            quantity: number;
            unit_price: number;
          };
          return {
            id: `template-${Date.now()}-${idx}`,
            product_id: i.product_id,
            product_name: i.product_name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            subtotal: i.quantity * i.unit_price,
          } as CartItem;
        }
      );

      if (items.length > 0) {
        setCartItems(items);
        showSuccess('คัดลอก order ล่าสุดแล้ว ✨');
      }
    } catch {
      showError('ไม่สามารถโหลด order ล่าสุด');
    }
  }, [token, showSuccess, showError]);

  // ---- Guard render ----
  if (!isAuthenticated || !user) return null;
  if (user.role !== 'vendor' && user.role !== 'admin') return null;

  // ---- Booth selector (shown if multiple booths or no default) ----
  const needsBoothSelection =
    booths.length > 1 && !selectedBoothId;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-[100] animate-fade-slide-up">
          <div
            className={`rounded-xl p-4 shadow-lg border text-sm flex items-center justify-between gap-3 ${
              toast.type === 'success'
                ? 'bg-green-900/90 border-green-500/30 text-green-300'
                : 'bg-coral/20 border-coral/30 text-coral-light'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="shrink-0 text-white/50 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 bg-surface/80 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/vendor/orders')}
            className="text-text-muted hover:text-warm-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-heading text-base font-bold text-warm-white leading-tight">
              คีย์ order ใหม่
            </h1>
            <p className="text-[11px] text-text-muted">
              รับออเดอร์ลูกค้าหน้าร้าน
            </p>
          </div>
        </div>

        {/* Booth indicator / selector */}
        {booths.length > 0 && selectedBoothId && (
          <div className="text-right">
            <p className="text-xs font-medium text-amber-light">
              {booths.find((b) => b.id === selectedBoothId)?.booth_name || 'บูธ'}
            </p>
          </div>
        )}
      </header>

      {/* Booth selection screen (if needed) */}
      {needsBoothSelection ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="glass rounded-2xl p-6 w-full max-w-sm animate-fade-slide-up">
            <h2 className="font-heading text-lg font-semibold text-warm-white mb-2">
              เลือกบูธ
            </h2>
            <p className="text-sm text-text-muted mb-4">
              คุณมีหลายบูธ กรุณาเลือกบูธที่ต้องการรับออเดอร์
            </p>
            <div className="space-y-2">
              {booths.map((booth) => (
                <button
                  key={booth.id}
                  onClick={() => setSelectedBoothId(booth.id)}
                  className="w-full glass rounded-xl p-4 text-left hover:border-amber/30 transition-all active:scale-[0.98]"
                >
                  <p className="font-heading font-semibold text-warm-white">
                    {booth.booth_name}
                  </p>
                  {booth.booth_number && (
                    <p className="text-xs text-text-muted">
                      เลขที่บูธ: {booth.booth_number}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : selectedBoothId ? (
        /* ---- Split screen: Product Grid + Cart Drawer ---- */
        <>
          {/* Product grid area (top, flex-1) */}
          <div className="flex-1 overflow-hidden min-h-0">
            <ProductGrid
              products={products}
              selectedBoothId={selectedBoothId}
              searchQuery={searchQuery}
              loading={loadingProducts}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSearchChange={setSearchQuery}
              onCategoryChange={setSelectedCategoryId}
              onAddToCart={addToCart}
            />
          </div>

          {/* Cart drawer (bottom, resizable) */}
          <CartDrawer
            items={cartItems}
            discount={discount}
            customerName={customerName}
            total={total}
            submitting={submitting}
            hasLastOrder={hasLastOrder && cartItems.length === 0}
            customerDescription={customerDescription}
            observationGender={observationGender}
            observationShirt={observationShirt}
            observationPants={observationPants}
            onUpdateItem={updateCartItem}
            onRemoveItem={removeCartItem}
            onDiscountChange={setDiscount}
            onCustomerNameChange={setCustomerName}
            onCustomerDescriptionChange={setCustomerDescription}
            onObservationGenderChange={setObservationGender}
            onObservationShirtChange={setObservationShirt}
            onObservationPantsChange={setObservationPants}
            onSubmit={handleSubmit}
            onLoadLastOrder={loadLastOrder}
          />
        </>
      ) : loadingBooths ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-amber-light" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-text-muted text-sm">กำลังโหลดข้อมูล...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="glass rounded-2xl p-8 max-w-sm text-center animate-fade-slide-up">
            <span className="text-5xl block mb-4">🏪</span>
            <h2 className="font-heading text-lg font-semibold text-warm-white mb-2">
              ไม่พบบูธของคุณ
            </h2>
            <p className="text-text-muted text-sm mb-1">
              คุณยังไม่มีบูธในระบบ หรือบัญชีของคุณยังไม่ได้เป็นพ่อค้า/แม่ค้า
            </p>
            <p className="text-text-muted text-xs mb-6">
              ไปที่หน้าโปรไฟล์เพื่อดูรายละเอียด หรือติดต่อผู้ดูแลตลาด
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/profile')}
                className="btn-outline text-sm !px-5 !py-2"
              >
                ไปที่โปรไฟล์
              </button>
              <button
                onClick={() => router.push('/vendor/orders')}
                className="btn-ghost text-sm !px-5 !py-2"
              >
                ← กลับ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
