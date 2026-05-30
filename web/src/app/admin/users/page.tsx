'use client';

import { useState, useEffect } from 'react';
import { adminApi, UserProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const roleOptions = [
  { value: '', label: 'ทุกบทบาท' },
  { value: 'customer', label: 'ลูกค้า' },
  { value: 'vendor', label: 'ผู้ขาย' },
  { value: 'admin', label: 'ผู้ดูแล' },
];

const roleBadge: Record<string, string> = {
  customer: 'badge-gray',
  vendor: 'badge-amber',
  admin: 'badge-coral',
};

const roleLabels: Record<string, string> = {
  customer: 'ลูกค้า',
  vendor: 'ผู้ขาย',
  admin: 'ผู้ดูแล',
};

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), page_size: '20' };
      if (filterRole) params.role = filterRole;
      if (search) params.q = search;
      const res = await adminApi.listUsers(token, params);
      setUsers(res.data || []);
      setTotal(res.total || 0);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setError(e?.data?.message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
  }, [token, filterRole, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!token) return;
    setUpdatingId(userId);
    try {
      await adminApi.updateUser(userId, { role: newRole } as Partial<UserProfile>, token);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setError(e?.data?.message || 'อัปเดตไม่สำเร็จ');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    if (!token) return;
    setUpdatingId(userId);
    try {
      await adminApi.updateUser(userId, { is_active: !currentActive } as Partial<UserProfile>, token);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentActive } : u))
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
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-warm-white">จัดการผู้ใช้</h1>
          <p className="text-text-muted text-sm mt-1">ทั้งหมด {total} ผู้ใช้</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {roleOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setFilterRole(opt.value); setPage(1); }}
              className={`text-sm rounded-full px-4 py-1.5 transition-all ${
                filterRole === opt.value
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
          placeholder="ค้นหาผู้ใช้..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') fetchUsers(); }}
          className="input-base !w-48 !py-1.5 !text-sm"
        />
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-coral/10 border border-coral/20 text-sm text-coral-light">
          {error}
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="glass rounded-2xl h-16 animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <span className="text-5xl block mb-4">👥</span>
          <p className="text-text-muted text-lg">ไม่มีผู้ใช้</p>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-5 py-4 text-text-muted font-medium">ชื่อ</th>
                    <th className="text-left px-5 py-4 text-text-muted font-medium hidden sm:table-cell">อีเมล</th>
                    <th className="text-left px-5 py-4 text-text-muted font-medium hidden md:table-cell">เบอร์โทร</th>
                    <th className="text-left px-5 py-4 text-text-muted font-medium">บทบาท</th>
                    <th className="text-left px-5 py-4 text-text-muted font-medium hidden lg:table-cell">สถานะ</th>
                    <th className="text-right px-5 py-4 text-text-muted font-medium">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber to-coral flex items-center justify-center text-xs font-bold text-white shrink-0">
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="text-warm-white font-medium">{u.name}</p>
                            <p className="text-xs text-text-muted">
                              สมัคร {new Date(u.created_at).toLocaleDateString('th-TH')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-text-body hidden sm:table-cell">{u.email}</td>
                      <td className="px-5 py-4 text-text-body hidden md:table-cell">{u.phone || '—'}</td>
                      <td className="px-5 py-4">
                        {updatingId === u.id ? (
                          <span className="text-xs text-text-muted">กำลังอัปเดต...</span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="bg-transparent text-xs font-medium border border-white/10 rounded-lg px-2 py-1 text-warm-white cursor-pointer focus:border-amber/40 focus:outline-none"
                          >
                            {roleOptions.filter((o) => o.value).map((opt) => (
                              <option key={opt.value} value={opt.value} className="bg-surface text-warm-white">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <span className={u.is_active ? 'badge-green' : 'badge-gray'}>
                          {u.is_active ? ' active' : ' inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                          disabled={updatingId === u.id}
                          className={`text-xs !px-3 !py-1.5 btn-ghost ${
                            u.is_active ? 'text-coral-light hover:text-coral' : 'text-green-400 hover:text-green-300'
                          }`}
                        >
                          {updatingId === u.id ? '...' : u.is_active ? 'ระงับ' : 'เปิดใช้งาน'}
                        </button>
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
