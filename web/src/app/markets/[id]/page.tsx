'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { marketApi, boothApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Market {
  id: string;
  name: string;
  description?: string;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  market_date: string;
  start_time?: string;
  end_time?: string;
  status: string;
  banner_url?: string;
  created_by: string;
}

interface Booth {
  id: string;
  market_id: string;
  vendor_id: string;
  booth_name: string;
  booth_number?: string;
  zone?: string;
  description?: string;
  logo_url?: string;
  status: string;
}

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, token } = useAuth();
  const [market, setMarket] = useState<Market | null>(null);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeZone, setActiveZone] = useState<string>('ทั้งหมด');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      marketApi.getById(id),
      boothApi.listByMarket(id),
    ])
      .then(([mkt, bths]) => {
        setMarket(mkt as Market);
        setBooths((bths || []) as Booth[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="glass rounded-3xl h-64 animate-pulse mb-8" />
        <div className="grid sm:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => <div key={i} className="glass rounded-2xl h-40 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-text-muted text-lg mb-4">ไม่พบตลาดนัดนี้</p>
        <Link href="/markets" className="btn-amber text-sm !px-6 !py-2.5">กลับไปหน้ารายการตลาด</Link>
      </div>
    );
  }

  const date = new Date(market.market_date);
  const thaiDate = date.toLocaleDateString('th-TH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const zones = [...new Set(booths.map((b) => b.zone).filter(Boolean))] as string[];
  const filtered = activeZone === 'ทั้งหมด'
    ? booths
    : booths.filter((b) => b.zone === activeZone);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Market Hero */}
      <div className="glass rounded-3xl overflow-hidden mb-10 animate-fade-slide-up opacity-0">
        <div className="h-56 sm:h-72 bg-gradient-to-br from-amber/20 via-coral/10 to-purple-900/30 relative">
          {market.banner_url ? (
            <img src={market.banner_url} alt={market.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl opacity-30">🏮</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />
        </div>
        <div className="p-6 sm:p-8">
          <span className={`inline-block mb-3 text-xs ${
            market.status === 'published' ? 'badge-amber' :
            market.status === 'active' ? 'badge-green' : 'badge-gray'
          }`}>
            {market.status === 'published' ? 'เปิดลงทะเบียน' :
             market.status === 'active' ? 'กำลังจัด' : market.status}
          </span>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-warm-white mb-2">{market.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted mb-4">
            <span className="flex items-center gap-1">📍 {market.location}</span>
            <span className="flex items-center gap-1">📅 {thaiDate}</span>
            {market.start_time && <span>⏰ {market.start_time} - {market.end_time || 'จนจบ'}</span>}
          </div>
          {market.description && (
            <p className="text-sm text-warm-white-dim leading-relaxed">{market.description}</p>
          )}
        </div>
      </div>

      {/* Booths Section */}
      <h2 className="font-heading text-2xl font-bold text-warm-white mb-6 animate-fade-slide-up opacity-0 stagger-1">
        ร้านค้าในตลาด ({booths.length} ร้าน)
      </h2>

      {/* Zone Filter */}
      {zones.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6 animate-fade-slide-up opacity-0 stagger-2">
          {['ทั้งหมด', ...zones].map((zone) => (
            <button
              key={zone}
              onClick={() => setActiveZone(zone)}
              className={`text-xs rounded-full px-4 py-1.5 transition-all ${
                activeZone === zone
                  ? 'bg-amber/20 text-amber-light border border-amber/30'
                  : 'bg-white/5 text-text-muted border border-white/10 hover:border-white/20'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center animate-fade-slide-up opacity-0 stagger-3">
          <p className="text-text-muted">ยังไม่มีร้านค้าในโซนนี้</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map((booth, i) => (
            <Link
              key={booth.id}
              href={`/booths/${booth.id}`}
              className="glass rounded-2xl p-5 card-glow animate-fade-slide-up opacity-0 group"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber/20 to-coral/20 flex items-center justify-center shrink-0 text-2xl">
                  {booth.logo_url ? (
                    <img src={booth.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    '🏪'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-heading font-semibold text-warm-white group-hover:text-amber-light transition-colors truncate">
                      {booth.booth_name}
                    </h3>
                    {booth.status === 'approved' && <span className="badge-green text-[10px]">พร้อมรับออเดอร์</span>}
                  </div>
                  {booth.booth_number && (
                    <p className="text-xs text-text-muted">แผง {booth.booth_number}{booth.zone ? ` • ${booth.zone}` : ''}</p>
                  )}
                  {booth.description && (
                    <p className="text-xs text-text-muted mt-1 line-clamp-2">{booth.description}</p>
                  )}
                </div>
                <svg className="w-5 h-5 text-text-muted group-hover:text-amber-light transition-colors shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!isAuthenticated && (
        <div className="mt-8 glass rounded-2xl p-6 text-center animate-fade-slide-up opacity-0 stagger-4">
          <p className="text-text-muted mb-3">เข้าสู่ระบบเพื่อสั่งสินค้าจากร้านค้า</p>
          <Link href="/auth/login" className="btn-amber text-sm !px-6 !py-2.5">เข้าสู่ระบบ</Link>
        </div>
      )}
    </div>
  );
}
