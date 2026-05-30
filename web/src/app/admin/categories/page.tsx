'use client';

import { useState, useEffect } from 'react';
import { adminApi, Category, categoryApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function AdminCategoriesPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create/Edit form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await categoryApi.list();
      setCategories(res as Category[]);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setError(e?.data?.message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', slug: '', description: '' });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setFormData({ name: cat.name, slug: cat.slug, description: cat.description || '' });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!token) return;
    if (!formData.name.trim()) { setFormError('กรุณากรอกชื่อหมวดหมู่'); return; }
    if (!formData.slug.trim()) { setFormError('กรุณากรอก slug'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await adminApi.updateCategory(editing.id, formData, token);
      } else {
        await adminApi.createCategory(formData, token);
      }
      setShowForm(false);
      fetchCategories();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setFormError(e?.data?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteId) return;
    setDeleting(true);
    try {
      await adminApi.deleteCategory(deleteId, token);
      setDeleteId(null);
      fetchCategories();
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setError(e?.data?.message || 'ลบไม่สำเร็จ');
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-slide-up opacity-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-warm-white">จัดการหมวดหมู่</h1>
          <p className="text-text-muted text-sm mt-1">ทั้งหมด {categories.length} หมวดหมู่</p>
        </div>
        <button onClick={openCreate} className="btn-amber text-sm !px-5 !py-2.5 inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          เพิ่มหมวดหมู่
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-coral/10 border border-coral/20 text-sm text-coral-light">
          {error}
        </div>
      )}

      {/* Categories List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <span className="text-5xl block mb-4">🏷️</span>
          <p className="text-text-muted text-lg mb-2">ยังไม่มีหมวดหมู่</p>
          <p className="text-text-muted text-sm mb-6">เพิ่มหมวดหมู่สินค้าเพื่อใช้ในระบบ</p>
          <button onClick={openCreate} className="btn-amber text-sm !px-6 !py-2.5">
            เพิ่มหมวดหมู่แรก
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat, i) => (
            <div
              key={cat.id}
              className="glass rounded-2xl p-5 card-glow animate-fade-slide-up opacity-0"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-heading font-semibold text-warm-white">{cat.name}</h3>
                    <span className={`text-xs ${cat.is_active ? 'badge-green' : 'badge-gray'}`}>
                      {cat.is_active ? 'active' : 'inactive'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                    <span>slug: <code className="text-amber-light/70">{cat.slug}</code></span>
                    {cat.description && <span>{cat.description}</span>}
                    {cat.sort_order !== undefined && <span>ลำดับ: {cat.sort_order}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button onClick={() => openEdit(cat)} className="btn-ghost text-xs !px-3 !py-1.5">
                    แก้ไข
                  </button>
                  <button
                    onClick={() => setDeleteId(cat.id)}
                    className="btn-ghost text-xs !px-3 !py-1.5 text-coral-light hover:text-coral"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowForm(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-lg border border-white/10 animate-fade-slide-up">
            <h3 className="font-heading text-xl font-bold text-warm-white mb-5">
              {editing ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่ใหม่'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-coral/10 border border-coral/20 text-sm text-coral-light">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-1.5">ชื่อหมวดหมู่ *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({
                      ...formData,
                      name,
                      slug: editing ? formData.slug : generateSlug(name),
                    });
                  }}
                  className="input-base"
                  placeholder="ชื่อหมวดหมู่"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1.5">Slug *</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="input-base"
                  placeholder="category-slug"
                />
                <p className="text-xs text-text-muted mt-1">ใช้ใน URL เช่น /categories/{formData.slug || 'your-slug'}</p>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1.5">คำอธิบาย</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-base"
                  rows={3}
                  placeholder="รายละเอียดหมวดหมู่..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="btn-outline text-sm !px-5 !py-2.5">
                ยกเลิก
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-amber text-sm !px-5 !py-2.5">
                {saving ? 'กำลังบันทึก...' : editing ? 'บันทึก' : 'สร้าง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteId(null)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-sm border border-white/10 animate-fade-slide-up">
            <span className="text-4xl block mb-3 text-center">🗑️</span>
            <h3 className="font-heading text-lg font-bold text-warm-white text-center mb-2">ยืนยันการลบ</h3>
            <p className="text-sm text-text-muted text-center mb-6">คุณแน่ใจหรือไม่ที่จะลบหมวดหมู่นี้?</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="btn-outline text-sm !px-5 !py-2.5 flex-1"
                disabled={deleting}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-primary text-sm !px-5 !py-2.5 flex-1"
              >
                {deleting ? 'กำลังลบ...' : 'ลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
