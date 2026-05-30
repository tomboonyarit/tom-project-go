'use client';

import { useState, useEffect, useCallback } from 'react';
import { vendorApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

// ===== Types =====
interface VendorCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  vendor_id?: string;
}

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const emptyForm = { name: '', slug: '', description: '' };

// ===== Helpers =====
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ===== Page =====
export default function VendorCategoriesPage() {
  const { isAuthenticated, token, user } = useAuth();

  // ---- Data state ----
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ---- Form state ----
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  // ---- Delete state ----
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // ---- Load categories ----
  const fetchCategories = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const data = await vendorApi.listVendorCategories(token);
      setCategories(data as VendorCategory[]);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }; message?: string };
      setError(e?.data?.message || e?.message || 'โหลดหมวดหมู่ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchCategories();
  }, [token, fetchCategories]);

  // ---- Auto-slug when name changes (on create) ----
  const handleNameChange = (value: string) => {
    setFormData((prev) => ({ ...prev, name: value }));
    if (autoSlug && !editingId) {
      setFormData((prev) => ({ ...prev, name: value, slug: slugify(value) }));
    }
  };

  // ---- Open create form ----
  const openCreateForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setAutoSlug(true);
    setShowForm(true);
  };

  // ---- Open edit form ----
  const openEditForm = (cat: VendorCategory) => {
    setEditingId(cat.id);
    setFormData({ name: cat.name, slug: cat.slug, description: cat.description || '' });
    setAutoSlug(false);
    setShowForm(true);
  };

  // ---- Cancel form ----
  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
    setAutoSlug(true);
  };

  // ---- Save (create or update) ----
  const handleSave = async () => {
    if (!token) return;
    if (!formData.name.trim()) {
      addToast('กรุณากรอกชื่อหมวดหมู่', 'error');
      return;
    }
    if (!formData.slug.trim()) {
      addToast('กรุณากรอก slug', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await vendorApi.updateVendorCategory(
          editingId,
          {
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            description: formData.description.trim() || undefined,
          },
          token
        );
        addToast('อัปเดตหมวดหมู่สำเร็จ ✅', 'success');
      } else {
        await vendorApi.createVendorCategory(
          {
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            description: formData.description.trim() || undefined,
          },
          token
        );
        addToast('สร้างหมวดหมู่สำเร็จ ✅', 'success');
      }
      cancelForm();
      fetchCategories();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }; message?: string };
      addToast(e?.data?.message || e?.message || 'บันทึกไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ---- Delete ----
  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่นี้?')) return;

    setDeletingId(id);
    try {
      await vendorApi.deleteVendorCategory(id, token);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      addToast('ลบหมวดหมู่สำเร็จ', 'success');
    } catch (err: unknown) {
      const e = err as { data?: { message?: string }; message?: string };
      addToast(e?.data?.message || e?.message || 'ลบไม่สำเร็จ', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // ---- Guard ----
  if (!isAuthenticated || !user) return null;
  if (user.role !== 'vendor' && user.role !== 'admin') return null;

  const isOwnCategory = (cat: VendorCategory) => cat.vendor_id;

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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 pt-24 animate-fade-slide-up opacity-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <Link
              href="/vendor/orders"
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-warm-white mb-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              กลับ
            </Link>
            <h1 className="font-heading text-2xl font-bold text-warm-white">📁 หมวดหมู่สินค้า</h1>
            <p className="text-sm text-text-muted mt-1">
              จัดการหมวดหมู่สินค้าสำหรับบูธของคุณ
            </p>
          </div>
          {!showForm && (
            <button onClick={openCreateForm} className="btn-amber text-sm !px-4 !py-2.5 inline-flex items-center gap-2 self-start">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              เพิ่มหมวดหมู่
            </button>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-coral/10 border border-coral/20 text-sm text-coral-light animate-fade-slide-up">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Create / Edit form */}
        {showForm && (
          <div className="glass rounded-2xl p-5 mb-6 border border-amber/20 animate-fade-slide-up">
            <h2 className="font-heading text-base font-semibold text-warm-white mb-4">
              {editingId ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
            </h2>
            <div className="space-y-4 max-w-lg">
              {/* Name */}
              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">ชื่อหมวดหมู่ *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="input-base text-sm"
                  placeholder="เช่น อาหาร, เครื่องดื่ม"
                  autoFocus
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">
                  Slug *
                  <button
                    type="button"
                    onClick={() => setAutoSlug(!autoSlug)}
                    className={`ml-2 text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                      autoSlug
                        ? 'bg-amber/20 text-amber-light'
                        : 'bg-white/5 text-text-muted'
                    }`}
                  >
                    {autoSlug ? 'สร้างอัตโนมัติ' : 'กำหนดเอง'}
                  </button>
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setFormData((prev) => ({ ...prev, slug: e.target.value }));
                  }}
                  className="input-base text-sm font-mono"
                  placeholder="food, beverages"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs text-text-muted mb-1 font-medium">คำอธิบาย</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="input-base text-sm"
                  placeholder="คำอธิบายเพิ่มเติม (ไม่บังคับ)"
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleSave} disabled={saving} className="btn-amber text-sm !px-5 !py-2">
                  {saving ? 'กำลังบันทึก...' : editingId ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างหมวดหมู่'}
                </button>
                <button onClick={cancelForm} disabled={saving} className="btn-outline text-sm !px-5 !py-2">
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-2xl h-16 animate-pulse" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          /* Empty state */
          <div className="glass rounded-2xl p-12 text-center">
            <span className="text-5xl block mb-4">🏷️</span>
            <p className="text-text-muted text-lg mb-2">ยังไม่มีหมวดหมู่</p>
            <p className="text-text-muted text-sm mb-6">
              สร้างหมวดหมู่แรกของคุณเพื่อจัดระเบียบสินค้า
            </p>
            <button onClick={openCreateForm} className="btn-amber text-sm !px-5 !py-2">
              สร้างหมวดหมู่แรก
            </button>
          </div>
        ) : (
          /* Category list */
          <div className="space-y-2">
            {categories.map((cat) => {
              const isOwn = isOwnCategory(cat);

              return (
                <div
                  key={cat.id}
                  className={`glass rounded-xl px-5 py-4 flex items-center justify-between transition-all hover:border-white/10 ${
                    isOwn ? 'border-l-2 border-l-amber/40' : 'border-l-2 border-l-white/5'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-medium text-warm-white text-sm">
                        {cat.name}
                      </h3>
                      {isOwn && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber/15 text-amber-light">
                          ของคุณ
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted mt-0.5">
                      <span>
                        slug: <code className="text-amber-light/70 font-mono">{cat.slug}</code>
                      </span>
                      {cat.description && <span className="truncate max-w-[200px]">— {cat.description}</span>}
                    </div>
                  </div>

                  {/* Actions — only for vendor's own categories */}
                  {isOwn && (
                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      <button
                        onClick={() => openEditForm(cat)}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors text-text-muted hover:text-warm-white"
                        title="แก้ไข"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        disabled={deletingId === cat.id}
                        className="p-2 rounded-lg hover:bg-coral/20 transition-colors text-text-muted hover:text-coral-light"
                        title="ลบ"
                      >
                        {deletingId === cat.id ? (
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info card */}
        {!showForm && categories.length > 0 && (
          <div className="mt-6 glass rounded-xl px-5 py-4 border border-white/5">
            <div className="flex items-start gap-3">
              <span className="text-lg shrink-0 mt-0.5">💡</span>
              <div>
                <p className="text-sm text-text-muted">
                  หมวดหมู่ที่มีป้าย <span className="text-amber-light">"ของคุณ"</span> คือหมวดหมู่ที่คุณสร้างขึ้น — แก้ไขหรือลบได้
                </p>
                <p className="text-xs text-text-muted mt-1">
                  หมวดหมู่ที่ไม่มีป้ายเป็นหมวดหมู่เริ่มต้นจากระบบ
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
