'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminApi, Market, PaginatedResponse } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const statusOptions = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'draft', label: 'ร่าง' },
  { value: 'published', label: 'เผยแพร่' },
  { value: 'active', label: 'เปิดดำเนินการ' },
  { value: 'closed', label: 'ปิดแล้ว' },
];

const statusBadge: Record<string, string> = {
  draft: 'badge-gray',
  published: 'badge-amber',
  active: 'badge-green',
  closed: 'badge-coral',
};

export default function AdminMarketsPage() {
  const { token } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Create/Edit modal state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Market | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [formData, setFormData] = useState({ name: '', location: '', status: 'draft', description: '', market_date: today });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMarkets = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), page_size: '20' };
      if (filterStatus) params.status = filterStatus;
      if (search) params.q = search;
      const res = await adminApi.listMarkets(token, params);
      setMarkets(res.data || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setError(e?.data?.message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchMarkets();
  }, [token, filterStatus, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', location: '', status: 'draft', description: '', market_date: today });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (m: Market) => {
    setEditing(m);
    setFormData({ name: m.name, location: m.location || '', status: m.status, description: m.description || '', market_date: (m.market_date as string || today).slice(0, 10) });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!token) return;
    if (!formData.name.trim()) { setFormError('กรุณากรอกชื่อตลาด'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await adminApi.updateMarket(editing.id, formData, token);
      } else {
        await adminApi.createMarket(formData, token);
      }
      setShowForm(false);
      fetchMarkets();
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
      await adminApi.deleteMarket(deleteId, token);
      setDeleteId(null);
      fetchMarkets();
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
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-warm-white">จัดการตลาด</h1>
          <p className="text-text-muted text-sm mt-1">ทั้งหมด {total} ตลาด</p>
        </div>
        <button onClick={openCreate} className="btn-amber text-sm !px-5 !py-2.5 inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          เพิ่มตลาด
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setFilterStatus(opt.value); setPage(1); }}
              className={`text-sm rounded-full px-4 py-1.5 transition-all ${
                filterStatus === opt.value
                  ? 'bg-amber/20 text-amber-light border border-amber/30'
                  : 'bg-white/5 text-text-muted border border-white/10 hover:border-white/20'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="ค้นหาตลาด..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') fetchMarkets(); }}
          className="input-base !w-48 !py-1.5 !text-sm"
        />
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-coral/10 border border-coral/20 text-sm text-coral-light">
          {error}
        </div>
      )}

      {/* Markets Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass rounded-2xl h-16 animate-pulse" />
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <span className="text-5xl block mb-4">🏪</span>
          <p className="text-text-muted text-lg mb-2">ยังไม่มีตลาด</p>
          <p className="text-text-muted text-sm mb-6">กดเพิ่มตลาดเพื่อเริ่มต้น</p>
          <button onClick={openCreate} className="btn-amber text-sm !px-6 !py-2.5">
            เพิ่มตลาดแรก
          </button>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-5 py-4 text-text-muted font-medium">ชื่อตลาด</th>
                    <th className="text-left px-5 py-4 text-text-muted font-medium hidden sm:table-cell">สถานที่</th>
                    <th className="text-left px-5 py-4 text-text-muted font-medium hidden md:table-cell">วันที่</th>
                    <th className="text-left px-5 py-4 text-text-muted font-medium">สถานะ</th>
                    <th className="text-right px-5 py-4 text-text-muted font-medium">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {markets.map((m) => (
                    <tr key={m.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-warm-white font-medium">{m.name}</p>
                        <p className="text-xs text-text-muted mt-0.5">บูธ {m.booth_count || 0} แห่ง</p>
                      </td>
                      <td className="px-5 py-4 text-text-body hidden sm:table-cell">{m.location || '—'}</td>
                      <td className="px-5 py-4 text-text-body hidden md:table-cell">
                        {m.market_date ? new Date(m.market_date).toLocaleDateString('th-TH') : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={statusBadge[m.status] || 'badge-gray'}>
                          {statusOptions.find((o) => o.value === m.status)?.label || m.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(m)} className="btn-ghost text-xs !px-3 !py-1.5">
                            แก้ไข
                          </button>
                          <button
                            onClick={() => setDeleteId(m.id)}
                            className="btn-ghost text-xs !px-3 !py-1.5 text-coral-light hover:text-coral"
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: Math.ceil(total / 20) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    p === page
                      ? 'bg-amber/20 text-amber-light border border-amber/30'
                      : 'bg-white/5 text-text-muted border border-white/10 hover:border-white/20'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowForm(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-lg border border-white/10 animate-fade-slide-up">
            <h3 className="font-heading text-xl font-bold text-warm-white mb-5">
              {editing ? 'แก้ไขตลาด' : 'เพิ่มตลาดใหม่'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-coral/10 border border-coral/20 text-sm text-coral-light">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-1.5">ชื่อตลาด *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-base"
                  placeholder="ชื่อตลาด"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1.5">วันที่จัดตลาด *</label>
                <input
                  type="date"
                  value={formData.market_date}
                  onChange={(e) => setFormData({ ...formData, market_date: e.target.value })}
                  className="input-base"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1.5">สถานที่</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input-base"
                  placeholder="สถานที่จัดตลาด"
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1.5">คำอธิบาย</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-base"
                  rows={3}
                  placeholder="รายละเอียดเพิ่มเติม..."
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1.5">สถานะ</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-base"
                >
                  {statusOptions.filter((o) => o.value).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
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
            <p className="text-sm text-text-muted text-center mb-6">คุณแน่ใจหรือไม่ที่จะลบตลาดนี้? การกระทำนี้ไม่สามารถย้อนกลับได้</p>
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
