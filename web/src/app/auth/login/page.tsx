'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string }; message?: string };
      setError(apiErr?.data?.message || apiErr?.message || 'เข้าสู่ระบบไม่สำเร็จ');
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
            <span className="text-4xl block mb-3">🏮</span>
            <h1 className="font-heading text-2xl font-bold text-warm-white mb-1">เข้าสู่ระบบ</h1>
            <p className="text-sm text-text-muted">ยินดีต้อนรับกลับสู่ Talad Nod</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-coral/10 border border-coral/20 text-sm text-coral-light">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-base !py-3"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            ยังไม่มีบัญชี?{' '}
            <Link href="/auth/register" className="text-amber-light hover:text-amber transition-colors font-medium">
              สมัครสมาชิก
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
