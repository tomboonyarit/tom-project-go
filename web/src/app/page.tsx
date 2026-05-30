'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { marketApi, categoryApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

// ===== Types =====
interface Market {
  id: string;
  name: string;
  description?: string;
  location: string;
  market_date: string;
  status: string;
  banner_url?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      marketApi.list({ page_size: '4', status: 'published' } as Record<string, string>),
      categoryApi.list(),
    ])
      .then(([marketRes, cats]) => {
        setMarkets((marketRes.data || []) as Market[]);
        setCategories((cats || []) as Category[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* ===== Hero Section ===== */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber/5 via-transparent to-bg-deep pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="text-center max-w-3xl mx-auto">
            {/* String lights decoration */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="inline-block w-2 h-2 rounded-full bg-amber animate-twinkle" style={{ animationDelay: '0s' }} />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-coral animate-twinkle" style={{ animationDelay: '0.5s' }} />
              <span className="inline-block w-2 h-2 rounded-full bg-amber animate-twinkle" style={{ animationDelay: '1s' }} />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-coral animate-twinkle" style={{ animationDelay: '1.5s' }} />
              <span className="inline-block w-2 h-2 rounded-full bg-amber animate-twinkle" style={{ animationDelay: '0.3s' }} />
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6">
              <span className="text-warm-white">ตลาดนัด</span>
              <br />
              <span className="bg-gradient-to-r from-amber-light via-amber to-coral bg-clip-text text-transparent">
                สั่งเลย ไม่ต้องเดิน
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-text-muted max-w-xl mx-auto mb-10 leading-relaxed">
              สั่งสินค้าจากร้านค้าในตลาดนัด ได้ของไว ไม่ต้องต่อคิว
              จองล่วงหน้า แค่ปลายนิ้ว
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/markets" className="btn-primary text-base !px-8 !py-3.5">
                <span>ดูตลาดนัด</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              {!isAuthenticated && (
                <Link href="/auth/register" className="btn-outline text-base !px-8 !py-3.5">
                  เริ่มต้นสั่งซื้อ
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Categories ===== */}
      {categories.length > 0 && (
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="section-header mb-10 text-center">หมวดหมู่สินค้า</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories.map((cat, i) => (
              <Link
                key={cat.id}
                href={`/markets?category=${cat.slug}`}
                className="glass rounded-2xl p-5 text-center card-glow animate-fade-slide-up opacity-0"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber/20 to-coral/20 flex items-center justify-center mx-auto mb-3 text-xl">
                  {getCategoryEmoji(cat.slug)}
                </div>
                <span className="text-sm font-medium text-warm-white">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== Markets Section ===== */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-10">
          <h2 className="section-header">ตลาดนัดใกล้คุณ</h2>
          <Link href="/markets" className="hidden sm:inline-flex items-center gap-1 text-sm text-amber-light hover:text-amber transition-colors">
            ดูทั้งหมด
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass rounded-2xl h-72 animate-pulse" />
            ))}
          </div>
        ) : markets.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <p className="text-text-muted text-lg">ยังไม่มีตลาดนัดในขณะนี้</p>
            <Link href="/auth/register" className="inline-flex items-center gap-1 text-amber-light hover:text-amber mt-3 text-sm transition-colors">
              ลงทะเบียนเพื่อรับการแจ้งเตือน
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {markets.map((market, i) => (
              <MarketCard key={market.id} market={market} index={i} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link href="/markets" className="btn-outline text-sm !px-6 !py-2.5">
            ดูตลาดนัดทั้งหมด
          </Link>
        </div>
      </section>

      {/* ===== How It Works ===== */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="section-header mb-12 text-center">วิธีใช้งาน</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-8 text-center animate-fade-slide-up opacity-0"
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber/20 to-coral/20 flex items-center justify-center mx-auto mb-5 text-3xl">
                {step.icon}
              </div>
              <h3 className="font-heading text-lg font-semibold text-warm-white mb-2">{step.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      {!isAuthenticated && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="glass rounded-3xl p-10 sm:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-amber/5 via-coral/5 to-amber/5 pointer-events-none" />
            <div className="relative">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-warm-white mb-4">
                พร้อมที่จะสั่งซื้อหรือยัง?
              </h2>
              <p className="text-text-muted mb-8 max-w-md mx-auto">
                สมัครสมาชิกฟรี เริ่มสั่งสินค้าจากร้านค้าในตลาดนัดได้ทันที
              </p>
              <Link href="/auth/register" className="btn-primary text-base !px-10 !py-3.5">
                สมัครสมาชิกฟรี
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Spacer for footer */}
      <div className="h-8" />
    </div>
  );
}

// ===== Market Card Component =====
function MarketCard({ market, index }: { market: Market; index: number }) {
  const date = new Date(market.market_date);
  const thaiDate = date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Link
      href={`/markets/${market.id}`}
      className="glass rounded-2xl overflow-hidden card-glow animate-fade-slide-up opacity-0 group"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Banner */}
      <div className="h-36 bg-gradient-to-br from-amber/15 via-coral/10 to-purple-900/20 relative overflow-hidden">
        {market.banner_url ? (
          <img src={market.banner_url} alt={market.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl opacity-40">🏮</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />
        <span className="absolute bottom-3 left-3 badge-amber text-xs">
          {market.status === 'published' ? 'กำลังเปิด' : market.status}
        </span>
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="font-heading text-base font-semibold text-warm-white group-hover:text-amber-light transition-colors mb-1.5 line-clamp-1">
          {market.name}
        </h3>
        <p className="text-xs text-text-muted mb-3 line-clamp-1">{market.location}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">{thaiDate}</span>
          <span className="text-xs text-amber-light opacity-0 group-hover:opacity-100 transition-opacity">
            ดูรายละเอียด →
          </span>
        </div>
      </div>
    </Link>
  );
}

// ===== Emoji helper =====
function getCategoryEmoji(slug: string): string {
  const map: Record<string, string> = {
    food: '🍜',
    beverages: '🧋',
    clothing: '👕',
    household: '🧹',
    plants: '🌿',
    pets: '🐕',
    handmade: '🎨',
    others: '📦',
  };
  return map[slug] || '📦';
}

// ===== Steps data =====
const steps = [
  {
    icon: '🔍',
    title: 'เลือกตลาดนัด',
    desc: 'ค้นหาตลาดนัดที่คุณชื่นชอบ หรือเลือกจากหมวดหมู่สินค้าที่ต้องการ',
  },
  {
    icon: '🛒',
    title: 'สั่งสินค้า',
    desc: 'เลือกร้านค้าและสินค้าที่ต้องการ เพิ่มลงตะกร้า พร้อมระบุรายละเอียด',
  },
  {
    icon: '📦',
    title: 'รับสินค้า',
    desc: 'มารับสินค้าที่ตลาดนัดตามวันที่นัดหมาย ไม่ต้องรอคิวนาน',
  },
];
