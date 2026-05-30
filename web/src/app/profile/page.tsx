'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { vendorApi } from '@/lib/api';
import type { Booth } from '@/lib/api';

export default function ProfilePage() {
  const { user, isAuthenticated, token, logout, updateProfile: authUpdateProfile } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [defaultBoothId, setDefaultBoothId] = useState(user?.default_booth_id || '');
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loadingBooths, setLoadingBooths] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // Load booths for vendors
  useEffect(() => {
    if (!token || !user || user.role !== 'vendor') return;
    setLoadingBooths(true);
    vendorApi
      .listBooths(token)
      .then((data) => {
        const boothList = data as Booth[];
        setBooths(boothList);
        // Pre-select default from user profile
        if (user?.default_booth_id) {
          setDefaultBoothId(user.default_booth_id);
        }
      })
      .catch(() => {
        // Silent — booths are optional in profile
      })
      .finally(() => setLoadingBooths(false));
  }, [token, user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setMsg('');
    try {
      const payload: Record<string, unknown> = { name, phone, address };
      // Only send default_booth_id for vendors
      if (user?.role === 'vendor' && defaultBoothId) {
        payload.default_booth_id = defaultBoothId;
      }
      await authUpdateProfile(payload);
      setMsg('บันทึกเรียบร้อย ✅');
    } catch {
      setMsg('เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  if (!isAuthenticated || !user) return null;

  const isVendor = user.role === 'vendor';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-heading text-3xl font-bold text-warm-white mb-8 animate-fade-slide-up opacity-0">
        โปรไฟล์
      </h1>

      <div className="glass rounded-3xl p-6 sm:p-8 animate-fade-slide-up opacity-0 stagger-1">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber to-coral flex items-center justify-center text-2xl font-bold text-white font-heading">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <p className="font-heading font-semibold text-warm-white text-lg">{user?.name}</p>
            <p className="text-sm text-text-muted">{user?.email}</p>
            <span className="badge-amber text-[10px] mt-1 inline-block">
              {user?.role === 'customer' ? 'ลูกค้า' : user?.role === 'vendor' ? 'พ่อค้า/แม่ค้า' : 'ผู้ดูแล'}
            </span>
          </div>
        </div>

        {msg && (
          <div className="mb-6 p-4 rounded-xl bg-amber/10 border border-amber/20 text-sm text-amber-light text-center">
            {msg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm text-warm-white-dim mb-1.5">ชื่อ-นามสกุล</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-base" />
          </div>
          <div>
            <label className="block text-sm text-warm-white-dim mb-1.5">เบอร์โทรศัพท์</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-base" placeholder="08x-xxx-xxxx" />
          </div>
          <div>
            <label className="block text-sm text-warm-white-dim mb-1.5">ที่อยู่</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="input-base min-h-[80px]" rows={3} />
          </div>

          {/* Default Booth — Vendor only */}
          {isVendor && (
            <div>
              <label className="block text-sm text-warm-white-dim mb-1.5">
                บูธเริ่มต้น (Default Booth)
              </label>
              {loadingBooths ? (
                <div className="input-base flex items-center gap-2 text-text-muted">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  กำลังโหลดบูธ...
                </div>
              ) : booths.length === 0 ? (
                <p className="text-sm text-text-muted">
                  ยังไม่มีบูธในระบบ
                </p>
              ) : (
                <select
                  value={defaultBoothId}
                  onChange={(e) => setDefaultBoothId(e.target.value)}
                  className="input-base appearance-none cursor-pointer"
                >
                  <option value="">-- ไม่ได้ตั้งค่าเริ่มต้น --</option>
                  {booths.map((booth) => (
                    <option key={booth.id} value={booth.id}>
                      {booth.booth_name}
                      {booth.booth_number ? ` (เลขที่ ${booth.booth_number})` : ''}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-text-muted mt-1">
                บูธที่เลือกจะถูกใช้เป็นค่าเริ่มต้นในการคีย์ order
              </p>
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-amber w-full text-base !py-3">
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5">
          <button
            onClick={() => { logout(); router.push('/'); }}
            className="btn-ghost text-sm text-coral-light hover:text-coral !px-4 !py-2"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}
