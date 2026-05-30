'use client';

import { useState, useEffect } from 'react';
import { adminApi, Booth } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface BoothWithMeta extends Booth {
  market_name?: string;
  vendor_name?: string;
  zone?: string;
  booth_number?: string;
}

const statusOptions = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'pending', label: 'รออนุมัติ' },
  { value: 'active', label: 'เปิด' },
  { value: 'approved', label: 'อนุมัติ' },
  { value: 'rejected', label: 'ปฏิเสธ' },
  { value: 'closed', label: 'ปิด' },
];

const statusBadge: Record<string, string> = {
  pending: 'badge-amber',
  approved: 'badge-green',
  active: 'badge-green',
  rejected: 'badge-coral',
  closed: 'badge-gray',
};

export default function AdminBoothsPage() {
  const { token } = useAuth();
  const [booths, setBooths] = useState<BoothWithMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchBooths = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), page_size: '20' };
      if (filterStatus) params.status = filterStatus;
      if (search) params.q = search;
      const res = await adminApi.listBooths(token, params);
      setBooths((res.data || []) as BoothWithMeta[]);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setError(e?.data?.message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchBooths();
  }, [token, filterStatus, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!token) return;
    setUpdatingId(id);
    try {
      await adminApi.updateBoothStatus(id, newStatus, token);
      setBooths((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
      );
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setError(e?.data?.message || 'อัปเดตไม่สำเร็จ');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="animate-fade-slide-up opacity-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-warm-white">จัดการบูธ</h1>
          <p className="text-text-muted text-sm mt-1">ทั้งหมด {total} บูธ</p>
        </div>
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
          placeholder="ค้นหาบูธ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') fetchBooths(); }}
          className="input-base !w-48 !py-1.5 !text-sm"
        />
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-coral/10 border border-coral/20 text-sm text-coral-light">
          {error}
        </div>
      )}

      {/* Booths Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass rounded-2xl h-16 animate-pulse" />
          ))}
        </div>
      ) : booths.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <span className="text-5xl block mb-4">🏪</span>
          <p className="text-text-muted text-lg mb-2">ยังไม่มีบูธ</p>
          <p className="text-text-muted text-sm">เมื่อมี vendor สร้างบูธจะแสดงที่นี่</p>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-5 py-4 text-text-muted font-medium">ชื่อบูธ</th>
                    <th className="text-left px-5 py-4 text-text-muted font-medium hidden sm:table-cell">ตลาด</th>
                    <th className="text-left px-5 py-4 text-text-muted font-medium hidden md:table-cell">ผู้ขาย</th>
                    <th className="text-left px-5 py-4 text-text-muted font-medium">สถานะ</th>
                    <th className="text-right px-5 py-4 text-text-muted font-medium">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {booths.map((b) => (
                    <tr key={b.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-warm-white font-medium">{b.booth_name}</p>
                        <p className="text-xs text-text-muted mt-0.5">{b.booth_number ? `บูธ ${b.booth_number}` : ''}</p>
                      </td>
                      <td className="px-5 py-4 text-text-body hidden sm:table-cell">{b.market_name || '—'}</td>
                      <td className="px-5 py-4 text-text-body hidden md:table-cell">{b.vendor_name || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={statusBadge[b.status] || 'badge-gray'}>
                          {statusOptions.find((o) => o.value === b.status)?.label || b.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {b.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleStatusChange(b.id, 'approved')}
                                disabled={updatingId === b.id}
                                className="btn-amber text-xs !px-3 !py-1.5"
                              >
                                {updatingId === b.id ? '...' : 'อนุมัติ'}
                              </button>
                              <button
                                onClick={() => handleStatusChange(b.id, 'rejected')}
                                disabled={updatingId === b.id}
                                className="btn-ghost text-xs !px-3 !py-1.5 text-coral-light hover:text-coral"
                              >
                                ปฏิเสธ
                              </button>
                            </>
                          )}
                          {b.status === 'active' && (
                            <button
                              onClick={() => handleStatusChange(b.id, 'closed')}
                              disabled={updatingId === b.id}
                              className="btn-ghost text-xs !px-3 !py-1.5 text-text-muted hover:text-coral-light"
                            >
                              {updatingId === b.id ? '...' : 'ปิด'}
                            </button>
                          )}
                          {b.status === 'approved' && (
                            <span className="text-xs text-green-400">✔ อนุมัติแล้ว</span>
                          )}
                          {b.status === 'rejected' && (
                            <span className="text-xs text-coral-light">✖ ปฏิเสธ</span>
                          )}
                          {b.status === 'closed' && (
                            <span className="text-xs text-text-muted">ปิดแล้ว</span>
                          )}
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
    </div>
  );
}
