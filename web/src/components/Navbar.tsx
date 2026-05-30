'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl">🏮</span>
            <span className="font-heading text-xl font-bold text-warm-white group-hover:text-amber-light transition-colors">
              Talad Nod
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/markets" className="text-sm text-warm-white-dim hover:text-amber-light transition-colors">
              ตลาดนัด
            </Link>
            {isAuthenticated && user?.role === 'admin' && (
              <Link href="/admin" className="text-sm text-coral-light/80 hover:text-coral-light transition-colors font-medium">
                ⚙️ Admin
              </Link>
            )}
            {isAuthenticated && user?.role === 'vendor' && (
              <>
                <Link href="/vendor/booths" className="text-sm text-amber-light/80 hover:text-amber-light transition-colors font-medium">
                  🏪 จัดการบูธ
                </Link>
                <Link href="/vendor/orders" className="text-sm text-amber-light/80 hover:text-amber-light transition-colors font-medium">
                  จัดการออเดอร์
                </Link>
                <Link href="/vendor/categories" className="text-sm text-amber-light/80 hover:text-amber-light transition-colors font-medium">
                  📁 หมวดหมู่
                </Link>
              </>
            )}
            {isAuthenticated && (
              <>
                <Link href="/orders" className="text-sm text-warm-white-dim hover:text-amber-light transition-colors">
                  ออเดอร์ของฉัน
                </Link>
                <Link href="/cart" className="relative text-sm text-warm-white-dim hover:text-amber-light transition-colors">
                  <span>ตะกร้า</span>
                </Link>
              </>
            )}
          </div>

          {/* Auth Buttons - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber to-coral flex items-center justify-center text-xs font-bold text-white">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-sm text-warm-white-dim">{user?.name}</span>
                </Link>
                <button onClick={logout} className="btn-ghost text-sm !px-3 !py-1.5">
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <>
                <Link href="/auth/login" className="btn-ghost text-sm !px-4 !py-2">
                  เข้าสู่ระบบ
                </Link>
                <Link href="/auth/register" className="btn-amber text-sm !px-4 !py-2">
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <svg className="w-6 h-6 text-warm-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-surface/95 backdrop-blur-lg">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/markets"
              className="block px-3 py-2 rounded-lg text-sm text-warm-white-dim hover:bg-white/5 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              ตลาดนัด
            </Link>
            {isAuthenticated && user?.role === 'admin' && (
              <Link
                href="/admin"
                className="block px-3 py-2 rounded-lg text-sm text-coral-light/80 hover:text-coral-light transition-colors font-medium"
                onClick={() => setMobileOpen(false)}
              >
                ⚙️ Admin
              </Link>
            )}
            {isAuthenticated && user?.role === 'vendor' && (
              <>
                <Link
                  href="/vendor/booths"
                  className="block px-3 py-2 rounded-lg text-sm text-amber-light/80 hover:text-amber-light transition-colors font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  🏪 จัดการบูธ
                </Link>
                <Link
                  href="/vendor/orders"
                  className="block px-3 py-2 rounded-lg text-sm text-amber-light/80 hover:text-amber-light transition-colors font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  จัดการออเดอร์
                </Link>
                <Link
                  href="/vendor/categories"
                  className="block px-3 py-2 rounded-lg text-sm text-amber-light/80 hover:text-amber-light transition-colors font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  📁 หมวดหมู่
                </Link>
              </>
            )}
            {isAuthenticated ? (
              <>
                <Link
                  href="/orders"
                  className="block px-3 py-2 rounded-lg text-sm text-warm-white-dim hover:bg-white/5 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  ออเดอร์ของฉัน
                </Link>
                <Link
                  href="/cart"
                  className="block px-3 py-2 rounded-lg text-sm text-warm-white-dim hover:bg-white/5 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  ตะกร้า
                </Link>
                <Link
                  href="/profile"
                  className="block px-3 py-2 rounded-lg text-sm text-warm-white-dim hover:bg-white/5 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  โปรไฟล์
                </Link>
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-coral hover:bg-white/5 transition-colors"
                >
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="block px-3 py-2 rounded-lg text-sm text-warm-white-dim hover:bg-white/5 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/auth/register"
                  className="block px-3 py-2 rounded-lg text-sm text-amber-light font-medium hover:bg-white/5 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
