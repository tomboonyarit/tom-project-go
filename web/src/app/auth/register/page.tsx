'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name, role);
      router.push('/');
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string }; message?: string };
      setError(apiErr?.data?.message || apiErr?.message || 'สมัครสมาชิกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="glass rounded-3xl p-8 sm:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-4xl block mb-3">✨</span>
            <h1 className="font-heading text-2xl font-bold text-warm-white mb-1">สมัครสมาชิก</h1>
            <p className="text-sm text-text-muted">เริ่มต้นสั่งสินค้าตลาดนัด</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-coral/10 border border-coral/20 text-sm text-coral-light">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-warm-white-dim mb-1.5">ชื่อ-นามสกุล</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-base"
                placeholder="สมชาย ใจดี"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-warm-white-dim mb-1.5">อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-warm-white-dim mb-1.5">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base"
                placeholder="•••••••• (อย่างน้อย 6 ตัว)"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm text-warm-white-dim mb-1.5">สมัครเป็น</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    role === 'customer'
                      ? 'bg-amber/20 text-amber-light border border-amber/30'
                      : 'bg-white/5 text-text-muted border border-white/10 hover:border-white/20'
                  }`}
                >
                  🛒 ลูกค้า
                </button>
                <button
                  type="button"
                  onClick={() => setRole('vendor')}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    role === 'vendor'
                      ? 'bg-amber/20 text-amber-light border border-amber/30'
                      : 'bg-white/5 text-text-muted border border-white/10 hover:border-white/20'
                  }`}
                >
                  🏪 พ่อค้า/แม่ค้า
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-amber w-full text-base !py-3 mt-2"
            >
              {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            มีบัญชีอยู่แล้ว?{' '}
            <Link href="/auth/login" className="text-amber-light hover:text-amber transition-colors font-medium">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
