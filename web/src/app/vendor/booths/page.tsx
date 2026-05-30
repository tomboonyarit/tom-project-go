'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { vendorApi, productApi, boothApi, marketApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Booth, Product } from '@/lib/api';

// ===== Types =====
interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface BoothEditForm {
  booth_name: string;
  booth_number: string;
  description: string;
  zone: string;
}

interface ProductEditForm {
  name: string;
  price: string;
  unit: string;
  category_id: string;
}

interface Category { id: string; name: string; slug: string; }

// ===== Helpers =====
const defaultBoothForm = (booth: Booth): BoothEditForm => ({
  booth_name: booth.booth_name || '',
  booth_number: booth.booth_number || '',
  description: booth.description || '',
  zone: booth.zone || '',
});

const defaultProductForm = (product: Product): ProductEditForm => ({
  name: product.name,
  price: String(product.price),
  unit: product.unit,
  category_id: product.category_id || '',
});

const emptyProductForm: ProductEditForm = { name: '', price: '', unit: 'ชิ้น', category_id: '' };

// ===== Page =====
export default function VendorBoothsPage() {
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

  // ---- State: booths ----
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loadingBooths, setLoadingBooths] = useState(true);
  const [error, setError] = useState('');

  // ---- State: expansion ----
  const [expandedBoothId, setExpandedBoothId] = useState<string | null>(null);

  // ---- State: products by booth ----
  const [productsByBooth, setProductsByBooth] = useState<Record<string, Product[]>>({});
  const [loadingProducts, setLoadingProducts] = useState<Record<string, boolean>>({});

  // ---- State: edit booth ----
  const [editingBoothId, setEditingBoothId] = useState<string | null>(null);
  const [boothEditForms, setBoothEditForms] = useState<Record<string, BoothEditForm>>({});
  const [savingBooth, setSavingBooth] = useState<Record<string, boolean>>({});

  // ---- State: add product ----
  const [addingProductBoothId, setAddingProductBoothId] = useState<string | null>(null);
  const [newProductForm, setNewProductForm] = useState<ProductEditForm>(emptyProductForm);
  const [creatingProduct, setCreatingProduct] = useState(false);

  // ---- State: edit product ----
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productEditForms, setProductEditForms] = useState<Record<string, ProductEditForm>>({});
  const [savingProduct, setSavingProduct] = useState<Record<string, boolean>>({});

  // ---- State: categories ----
  const [categories, setCategories] = useState<Category[]>([]);

  // ---- State: add booth ----
  const [showAddBooth, setShowAddBooth] = useState(false);
  const [markets, setMarkets] = useState<{ id: string; name: string }[]>([]);
  const [newBoothForm, setNewBoothForm] = useState({ market_id: '', booth_name: '', booth_number: '', zone: '', description: '' });
  const [creatingBooth, setCreatingBooth] = useState(false);

  // ---- State: delete ----
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // ---- Toast ----
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  let toastCounter = 0;

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    toastCounter += 1;
    const id = toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // ---- Load markets for add-booth form ----
  const fetchMarkets = useCallback(async () => {
    if (!token) return;
    try {
      const res = await marketApi.list({ status: 'active' });
      const list = (res as { data: unknown[] }).data || [];
      setMarkets(list as { id: string; name: string }[]);
    } catch {
      // Markets are optional for the add form
    }
  }, [token]);

  // ---- Handle add booth ----
  const handleAddBooth = async () => {
    if (!token) return;
    if (!newBoothForm.market_id) { addToast('กรุณาเลือกตลาด', 'error'); return; }
    if (!newBoothForm.booth_name.trim()) { addToast('กรุณากรอกชื่อบูธ', 'error'); return; }
    setCreatingBooth(true);
    try {
      await boothApi.create(newBoothForm.market_id, {
        booth_name: newBoothForm.booth_name.trim(),
        booth_number: newBoothForm.booth_number || undefined,
        zone: newBoothForm.zone || undefined,
        description: newBoothForm.description || undefined,
      }, token);
      setShowAddBooth(false);
      setNewBoothForm({ market_id: '', booth_name: '', booth_number: '', zone: '', description: '' });
      addToast('สร้างบูธสำเร็จ ✅', 'success');
      fetchBooths();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }; message?: string };
      addToast(e?.data?.message || e?.message || 'สร้างบูธไม่สำเร็จ', 'error');
    } finally {
      setCreatingBooth(false);
    }
  };

  // ---- Load booths ----
  const fetchBooths = useCallback(async () => {
    if (!token) return;
    setLoadingBooths(true);
    setError('');
    try {
      const data = await vendorApi.listBooths(token);
      setBooths(data as Booth[]);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }; message?: string };
      setError(e?.data?.message || e?.message || 'โหลดข้อมูลบูธไม่สำเร็จ');
      setBooths([]);
    } finally {
      setLoadingBooths(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchBooths();
  }, [token, fetchBooths]);

  // ---- Fetch categories ----
  useEffect(() => {
    if (!token) return;
    vendorApi.listVendorCategories(token).then((data) => {
      const cats = (data as Category[]) || [];
      setCategories(cats);
    }).catch(() => {});
  }, [token]);

  // ---- Load products for a booth ----
  const fetchProducts = useCallback(
    async (boothId: string) => {
      if (!token) return;
      setLoadingProducts((prev) => ({ ...prev, [boothId]: true }));
      try {
        // Try vendor-specific endpoint first, fall back to productApi
        let products: Product[];
        try {
          const res = await vendorApi.listVendorProducts(boothId, token);
          products = (res.data as Product[]) || [];
        } catch {
          const res = await productApi.listByBooth(boothId);
          products = (res.data as Product[]) || [];
        }
        setProductsByBooth((prev) => ({ ...prev, [boothId]: products }));
      } catch {
        addToast('โหลดสินค้าไม่สำเร็จ', 'error');
        setProductsByBooth((prev) => ({ ...prev, [boothId]: [] }));
      } finally {
        setLoadingProducts((prev) => ({ ...prev, [boothId]: false }));
      }
    },
    [token, addToast]
  );

  // ---- Toggle booth expand ----
  const toggleExpand = (boothId: string) => {
    if (expandedBoothId === boothId) {
      setExpandedBoothId(null);
      // Reset add/edit states for this booth
      if (addingProductBoothId === boothId) {
        setAddingProductBoothId(null);
        setNewProductForm(emptyProductForm);
      }
    } else {
      setExpandedBoothId(boothId);
      // Load products if not loaded yet
      if (!productsByBooth[boothId]) {
        fetchProducts(boothId);
      }
    }
  };

  // ---- Booth inline editing ----
  const startEditBooth = (booth: Booth) => {
    setEditingBoothId(booth.id);
    setBoothEditForms((prev) => ({
      ...prev,
      [booth.id]: defaultBoothForm(booth),
    }));
  };

  const cancelEditBooth = () => {
    setEditingBoothId(null);
  };

  const updateBoothField = (boothId: string, field: keyof BoothEditForm, value: string) => {
    setBoothEditForms((prev) => ({
      ...prev,
      [boothId]: { ...prev[boothId], [field]: value },
    }));
  };

  const saveBooth = async (boothId: string) => {
    if (!token) return;
    const form = boothEditForms[boothId];
    if (!form) return;

    setSavingBooth((prev) => ({ ...prev, [boothId]: true }));
    try {
      const updated = await boothApi.update(
        boothId,
        {
          booth_name: form.booth_name,
          booth_number: form.booth_number || undefined,
          description: form.description || undefined,
          zone: form.zone || undefined,
        },
        token
      );
      const updatedBooth = updated as Booth;
      setBooths((prev) =>
        prev.map((b) => (b.id === boothId ? { ...b, ...updatedBooth } : b))
      );
      setEditingBoothId(null);
      addToast('บันทึกข้อมูลบูธสำเร็จ', 'success');
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }; message?: string };
      addToast(e?.data?.message || e?.message || 'บันทึกไม่สำเร็จ', 'error');
    } finally {
      setSavingBooth((prev) => ({ ...prev, [boothId]: false }));
    }
  };

  // ---- Add product ----
  const handleAddProduct = async (boothId: string) => {
    if (!token) return;
    const { name, price, unit, category_id } = newProductForm;
    if (!name.trim()) {
      addToast('กรุณากรอกชื่อสินค้า', 'error');
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      addToast('กรุณากรอกราคาที่ถูกต้อง', 'error');
      return;
    }

    setCreatingProduct(true);
    try {
      const body: Record<string, unknown> = { name: name.trim(), price: priceNum, unit: unit || 'ชิ้น', is_available: true };
      if (category_id) body.category_id = category_id;
      const created = await productApi.create(boothId, body, token);
      const newProduct = created as Product;
      setProductsByBooth((prev) => ({
        ...prev,
        [boothId]: [...(prev[boothId] || []), newProduct],
      }));
      setNewProductForm(emptyProductForm);
      setAddingProductBoothId(null);
      addToast('เพิ่มสินค้าสำเร็จ', 'success');
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }; message?: string };
      addToast(e?.data?.message || e?.message || 'เพิ่มสินค้าไม่สำเร็จ', 'error');
    } finally {
      setCreatingProduct(false);
    }
  };

  // ---- Edit product ----
  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setProductEditForms((prev) => ({
      ...prev,
      [product.id]: defaultProductForm(product),
    }));
  };

  const cancelEditProduct = () => {
    setEditingProductId(null);
  };

  const updateProductField = (productId: string, field: keyof ProductEditForm, value: string) => {
    setProductEditForms((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  };

  const saveProduct = async (productId: string, boothId: string) => {
    if (!token) return;
    const form = productEditForms[productId];
    if (!form) return;
    if (!form.name.trim()) {
      addToast('กรุณากรอกชื่อสินค้า', 'error');
      return;
    }
    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum < 0) {
      addToast('กรุณากรอกราคาที่ถูกต้อง', 'error');
      return;
    }

    setSavingProduct((prev) => ({ ...prev, [productId]: true }));
    try {
      const body: Record<string, unknown> = { name: form.name.trim(), price: priceNum, unit: form.unit || 'ชิ้น' };
      if (form.category_id) body.category_id = form.category_id;
      const updated = await productApi.update(productId, body, token);
      const updatedProduct = updated as Product;
      setProductsByBooth((prev) => ({
        ...prev,
        [boothId]: (prev[boothId] || []).map((p) =>
          p.id === productId ? { ...p, ...updatedProduct } : p
        ),
      }));
      setEditingProductId(null);
      addToast('บันทึกสินค้าสำเร็จ', 'success');
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }; message?: string };
      addToast(e?.data?.message || e?.message || 'บันทึกสินค้าไม่สำเร็จ', 'error');
    } finally {
      setSavingProduct((prev) => ({ ...prev, [productId]: false }));
    }
  };

  // ---- Toggle product availability ----
  const toggleAvailability = async (product: Product) => {
    if (!token) return;
    try {
      const updated = await productApi.update(
        product.id,
        { is_available: !product.is_available },
        token
      );
      const updatedProduct = updated as Product;
      setProductsByBooth((prev) => ({
        ...prev,
        [product.booth_id]: (prev[product.booth_id] || []).map((p) =>
          p.id === product.id ? { ...p, ...updatedProduct } : p
        ),
      }));
    } catch {
      addToast('อัปเดตสถานะสินค้าไม่สำเร็จ', 'error');
    }
  };

  // ---- Delete product ----
  const deleteProduct = async (productId: string, boothId: string) => {
    if (!token) return;
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบสินค้านี้?')) return;

    setDeletingProductId(productId);
    try {
      await productApi.delete(productId, token);
      setProductsByBooth((prev) => ({
        ...prev,
        [boothId]: (prev[boothId] || []).filter((p) => p.id !== productId),
      }));
      addToast('ลบสินค้าสำเร็จ', 'success');
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }; message?: string };
      addToast(e?.data?.message || e?.message || 'ลบสินค้าไม่สำเร็จ', 'error');
    } finally {
      setDeletingProductId(null);
    }
  };

  // ---- Guard render ----
  if (!isAuthenticated || !user) return null;
  if (user.role !== 'vendor' && user.role !== 'admin') return null;

  // ===== Render =====
  return (
    <div className="min-h-screen bg-background">
      {/* Toast container */}
      <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-[100] space-y-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl p-4 shadow-lg border text-sm flex items-center justify-between gap-3 animate-fade-slide-up ${
              toast.type === 'success'
                ? 'bg-green-900/90 border-green-500/30 text-green-300'
                : 'bg-coral/20 border-coral/30 text-coral-light'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="shrink-0 text-white/50 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Page content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-slide-up opacity-0">
          <div>
            <h1 className="font-heading text-3xl font-bold text-warm-white">จัดการบูธ</h1>
            <p className="text-text-muted text-sm mt-1">จัดการข้อมูลบูธและสินค้าของคุณ</p>
          </div>
          <div className="flex gap-2 self-start">
            <button
              onClick={() => { setShowAddBooth(true); fetchMarkets(); }}
              className="btn-amber text-sm !px-4 !py-2.5 inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              เพิ่มบูธ
            </button>
            <button
              onClick={() => router.push('/vendor/orders')}
              className="btn-outline text-sm !px-4 !py-2.5 inline-flex items-center gap-2"
            >
              ← กลับ
            </button>
          </div>
        </div>

        {/* Add booth form */}
        {showAddBooth && (
          <div className="glass rounded-2xl p-5 mb-6 border border-amber/20 animate-fade-slide-up">
            <h2 className="font-heading text-base font-semibold text-warm-white mb-4">เพิ่มบูธใหม่</h2>
            <div className="space-y-3 max-w-lg">
              <div>
                <label className="block text-xs text-text-muted mb-1">ตลาด</label>
                <select
                  value={newBoothForm.market_id}
                  onChange={(e) => setNewBoothForm((prev) => ({ ...prev, market_id: e.target.value }))}
                  className="input-base text-sm"
                >
                  <option value="">-- เลือกตลาด --</option>
                  {markets.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">ชื่อบูธ *</label>
                <input
                  type="text"
                  value={newBoothForm.booth_name}
                  onChange={(e) => setNewBoothForm((prev) => ({ ...prev, booth_name: e.target.value }))}
                  className="input-base text-sm"
                  placeholder="ชื่อร้านค้าของคุณ"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">เลขที่บูธ</label>
                  <input
                    type="text"
                    value={newBoothForm.booth_number}
                    onChange={(e) => setNewBoothForm((prev) => ({ ...prev, booth_number: e.target.value }))}
                    className="input-base text-sm"
                    placeholder="เช่น A12"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">โซน</label>
                  <input
                    type="text"
                    value={newBoothForm.zone}
                    onChange={(e) => setNewBoothForm((prev) => ({ ...prev, zone: e.target.value }))}
                    className="input-base text-sm"
                    placeholder="โซนอาหาร"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">รายละเอียด</label>
                <textarea
                  value={newBoothForm.description}
                  onChange={(e) => setNewBoothForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="input-base text-sm"
                  placeholder="รายละเอียดร้าน"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleAddBooth} disabled={creatingBooth} className="btn-amber text-sm !px-5 !py-2">
                  {creatingBooth ? 'กำลังสร้าง...' : 'สร้างบูธ'}
                </button>
                <button onClick={() => { setShowAddBooth(false); setNewBoothForm({ market_id: '', booth_name: '', booth_number: '', zone: '', description: '' }); }} className="btn-outline text-sm !px-5 !py-2">
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-coral/10 border border-coral/20 text-sm text-coral-light animate-fade-slide-up opacity-0">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading */}
        {loadingBooths ? (
          <div className="space-y-4 animate-fade-slide-up opacity-0">
            {[1, 2].map((i) => (
              <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                <div className="h-6 w-48 bg-white/5 rounded-lg mb-3" />
                <div className="h-4 w-32 bg-white/5 rounded-lg" />
              </div>
            ))}
          </div>
        ) : booths.length === 0 ? (
          /* Empty state */
          <div className="glass rounded-2xl p-12 text-center animate-fade-slide-up opacity-0 stagger-1">
            <span className="text-5xl block mb-4">🏪</span>
            <p className="text-text-muted text-lg mb-2">ยังไม่มีบูธ</p>
            <p className="text-text-muted text-sm mb-6">
              คุณยังไม่มีบูธในระบบ ติดต่อผู้ดูแลตลาดเพื่อเพิ่มบูธ
            </p>
            <button
              onClick={() => router.push('/profile')}
              className="btn-outline text-sm !px-5 !py-2"
            >
              ไปที่โปรไฟล์
            </button>
          </div>
        ) : (
          /* Booth list */
          <div className="space-y-4 animate-fade-slide-up opacity-0 stagger-1">
            {booths.map((booth, index) => (
              <div
                key={booth.id}
                className="glass rounded-2xl overflow-hidden card-glow transition-all duration-300"
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                {/* Booth header */}
                <div className="p-5">
                  {editingBoothId === booth.id ? (
                    /* ---- Booth Edit Mode ---- */
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-text-muted mb-1 font-medium">ชื่อบูธ</label>
                        <input
                          type="text"
                          value={boothEditForms[booth.id]?.booth_name || ''}
                          onChange={(e) => updateBoothField(booth.id, 'booth_name', e.target.value)}
                          className="input-base text-sm"
                          placeholder="ชื่อบูธ"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-text-muted mb-1 font-medium">เลขที่บูธ</label>
                          <input
                            type="text"
                            value={boothEditForms[booth.id]?.booth_number || ''}
                            onChange={(e) => updateBoothField(booth.id, 'booth_number', e.target.value)}
                            className="input-base text-sm"
                            placeholder="เช่น A12"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-muted mb-1 font-medium">โซน</label>
                          <input
                            type="text"
                            value={boothEditForms[booth.id]?.zone || ''}
                            onChange={(e) => updateBoothField(booth.id, 'zone', e.target.value)}
                            className="input-base text-sm"
                            placeholder="โซนอาหาร"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-text-muted mb-1 font-medium">รายละเอียด</label>
                        <textarea
                          value={boothEditForms[booth.id]?.description || ''}
                          onChange={(e) => updateBoothField(booth.id, 'description', e.target.value)}
                          className="input-base text-sm"
                          placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับบูธ"
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => saveBooth(booth.id)}
                          disabled={savingBooth[booth.id]}
                          className="btn-amber text-xs !px-4 !py-2"
                        >
                          {savingBooth[booth.id] ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                        <button
                          onClick={cancelEditBooth}
                          className="btn-ghost text-xs !px-4 !py-2"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ---- Booth Display Mode ---- */
                    <div>
                      {/* Top row: clickable area to expand */}
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleExpand(booth.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-heading font-semibold text-warm-white text-lg truncate">
                              {booth.booth_name}
                            </h3>
                            <span
                              className={`text-xs whitespace-nowrap ${
                                booth.status === 'active' || booth.status === 'available'
                                  ? 'badge-green'
                                  : 'badge-gray'
                              }`}
                            >
                              {booth.status === 'active' || booth.status === 'available'
                                ? 'เปิด'
                                : booth.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                            {booth.booth_number && <span>📍 เลขที่ {booth.booth_number}</span>}
                            {booth.zone && <span>🏷️ {booth.zone}</span>}
                            {!booth.booth_number && !booth.zone && <span>ไม่มีรายละเอียด</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditBooth(booth);
                            }}
                            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-warm-white"
                            title="แก้ไขบูธ"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <svg
                            className={`w-5 h-5 text-text-muted transition-transform duration-300 ${
                              expandedBoothId === booth.id ? 'rotate-180' : ''
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ---- Expanded product section ---- */}
                {expandedBoothId === booth.id && (
                  <div className="border-t border-white/5 animate-fade-slide-up">
                    <div className="p-5">
                      {/* Products header */}
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-heading font-semibold text-warm-white text-sm">
                          สินค้า
                          <span className="text-text-muted font-normal ml-2">
                            ({productsByBooth[booth.id]?.length || 0} รายการ)
                          </span>
                        </h4>
                        {addingProductBoothId !== booth.id && (
                          <button
                            onClick={() => {
                              setAddingProductBoothId(booth.id);
                              setNewProductForm(emptyProductForm);
                            }}
                            className="btn-amber text-xs !px-3 !py-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            เพิ่มสินค้า
                          </button>
                        )}
                      </div>

                      {/* Add product form */}
                      {addingProductBoothId === booth.id && (
                        <div className="glass rounded-xl p-4 mb-4 border border-amber/20">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                            <div className="col-span-2 sm:col-span-1">
                              <label className="block text-xs text-text-muted mb-1 font-medium">ชื่อสินค้า</label>
                              <input
                                type="text"
                                value={newProductForm.name}
                                onChange={(e) => setNewProductForm((prev) => ({ ...prev, name: e.target.value }))}
                                className="input-base text-sm"
                                placeholder="ชื่อสินค้า"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddProduct(booth.id);
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-text-muted mb-1 font-medium">ราคา (บาท)</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={newProductForm.price}
                                onChange={(e) => setNewProductForm((prev) => ({ ...prev, price: e.target.value }))}
                                className="input-base text-sm"
                                placeholder="0"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddProduct(booth.id);
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-text-muted mb-1 font-medium">หน่วย</label>
                              <input
                                type="text"
                                value={newProductForm.unit}
                                onChange={(e) => setNewProductForm((prev) => ({ ...prev, unit: e.target.value }))}
                                className="input-base text-sm"
                                placeholder="ชิ้น"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddProduct(booth.id);
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-text-muted mb-1 font-medium">หมวดหมู่</label>
                              <select
                                value={newProductForm.category_id}
                                onChange={(e) => setNewProductForm((prev) => ({ ...prev, category_id: e.target.value }))}
                                className="input-base text-sm"
                              >
                                <option value="">ไม่มีหมวดหมู่</option>
                                {categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleAddProduct(booth.id)}
                              disabled={creatingProduct}
                              className="btn-amber text-xs !px-4 !py-2"
                            >
                              {creatingProduct ? 'กำลังเพิ่ม...' : 'เพิ่มสินค้า'}
                            </button>
                            <button
                              onClick={() => {
                                setAddingProductBoothId(null);
                                setNewProductForm(emptyProductForm);
                              }}
                              className="btn-ghost text-xs !px-4 !py-2"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Products list */}
                      {loadingProducts[booth.id] ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                          ))}
                        </div>
                      ) : !productsByBooth[booth.id] || productsByBooth[booth.id].length === 0 ? (
                        <div className="text-center py-8">
                          <span className="text-3xl block mb-2">📦</span>
                          <p className="text-text-muted text-sm">
                            {addingProductBoothId === booth.id
                              ? 'กรอกข้อมูลเพื่อเพิ่มสินค้า'
                              : 'ยังไม่มีสินค้าในบูธนี้'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {productsByBooth[booth.id].map((product) => (
                            <div
                              key={product.id}
                              className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                            >
                              {editingProductId === product.id ? (
                                /* ---- Product edit mode ---- */
                                <div className="flex-1 grid grid-cols-12 gap-2 items-end">
                                  <div className="col-span-12 sm:col-span-3">
                                    <label className="block text-[10px] text-text-muted mb-0.5">ชื่อ</label>
                                    <input
                                      type="text"
                                      value={productEditForms[product.id]?.name || ''}
                                      onChange={(e) => updateProductField(product.id, 'name', e.target.value)}
                                      className="input-base text-sm !py-2 !px-3"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveProduct(product.id, booth.id);
                                        if (e.key === 'Escape') cancelEditProduct();
                                      }}
                                    />
                                  </div>
                                  <div className="col-span-6 sm:col-span-2">
                                    <label className="block text-[10px] text-text-muted mb-0.5">ราคา</label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={productEditForms[product.id]?.price || ''}
                                      onChange={(e) => updateProductField(product.id, 'price', e.target.value)}
                                      className="input-base text-sm !py-2 !px-3"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveProduct(product.id, booth.id);
                                        if (e.key === 'Escape') cancelEditProduct();
                                      }}
                                    />
                                  </div>
                                  <div className="col-span-6 sm:col-span-2">
                                    <label className="block text-[10px] text-text-muted mb-0.5">หน่วย</label>
                                    <input
                                      type="text"
                                      value={productEditForms[product.id]?.unit || ''}
                                      onChange={(e) => updateProductField(product.id, 'unit', e.target.value)}
                                      className="input-base text-sm !py-2 !px-3"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveProduct(product.id, booth.id);
                                        if (e.key === 'Escape') cancelEditProduct();
                                      }}
                                    />
                                  </div>
                                  <div className="col-span-12 sm:col-span-3">
                                    <label className="block text-[10px] text-text-muted mb-0.5">หมวดหมู่</label>
                                    <select
                                      value={productEditForms[product.id]?.category_id || ''}
                                      onChange={(e) => updateProductField(product.id, 'category_id', e.target.value)}
                                      className="input-base text-sm !py-2 !px-3"
                                    >
                                      <option value="">ไม่มี</option>
                                      {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-span-12 sm:col-span-2 flex items-center gap-1">
                                    <button
                                      onClick={() => saveProduct(product.id, booth.id)}
                                      disabled={savingProduct[product.id]}
                                      className="btn-amber text-xs !px-3 !py-2 flex-1"
                                    >
                                      {savingProduct[product.id] ? '...' : 'บันทึก'}
                                    </button>
                                    <button
                                      onClick={cancelEditProduct}
                                      className="btn-ghost text-xs !px-3 !py-2"
                                    >
                                      ยกเลิก
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* ---- Product display mode ---- */
                                <>
                                  {/* Availability toggle */}
                                  <button
                                    onClick={() => toggleAvailability(product)}
                                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                      product.is_available
                                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                        : 'bg-white/5 text-text-muted hover:bg-white/10'
                                    }`}
                                    title={product.is_available ? 'ปิดการขาย' : 'เปิดการขาย'}
                                  >
                                    {product.is_available ? (
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    )}
                                  </button>

                                  {/* Product info */}
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className={`text-sm font-medium truncate ${
                                        product.is_available ? 'text-warm-white' : 'text-text-muted line-through'
                                      }`}
                                    >
                                      {product.name}
                                    </p>
                                    <p className="text-xs text-text-muted">
                                      ฿{product.price.toFixed(2)} / {product.unit}
                                    </p>
                                    {product.category_id && (
                                      <p className="text-[10px] text-amber-light/70 mt-0.5">
                                        {categories.find((c) => c.id === product.category_id)?.name || '—'}
                                      </p>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1 shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => startEditProduct(product)}
                                      className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-warm-white"
                                      title="แก้ไข"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => deleteProduct(product.id, booth.id)}
                                      disabled={deletingProductId === product.id}
                                      className="p-1.5 rounded-lg hover:bg-coral/20 transition-colors text-text-muted hover:text-coral-light"
                                      title="ลบ"
                                    >
                                      {deletingProductId === product.id ? (
                                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                      ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
