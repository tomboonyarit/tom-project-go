'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { marketApi } from '@/lib/api';

interface Market {
  id: string;
  name: string;
  description?: string;
  location: string;
  address?: string;
  market_date: string;
  status: string;
  banner_url?: string;
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    marketApi.list({ page_size: '50' } as Record<string, string>)
      .then((res) => setMarkets((res.data || []) as Market[]))
      .catch(() => setError('ไม่สามารถโหลดข้อมูลตลาดนัดได้'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-10 animate-fade-slide-up opacity-0">
        <h1 className="font-heading text-4xl font-bold text-warm-white mb-3">ตลาดนัดทั้งหมด</h1>
        <p className="text-text-muted">เลือกตลาดนัดที่คุณต้องการสั่งสินค้า</p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-coral-light mb-3">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-amber text-sm !px-6 !py-2.5">
            ลองอีกครั้ง
          </button>
        </div>
      ) : markets.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-text-muted text-lg mb-2">ยังไม่มีตลาดนัดในขณะนี้</p>
          <p className="text-text-muted text-sm">โปรดติดตามข่าวสารเพิ่มเติม</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map((market, i) => {
            const date = new Date(market.market_date);
            const thaiDate = date.toLocaleDateString('th-TH', {
              day: 'numeric', month: 'long', year: 'numeric',
            });

            return (
              <Link
                key={market.id}
                href={`/markets/${market.id}`}
                className="glass rounded-2xl overflow-hidden card-glow animate-fade-slide-up opacity-0 group"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="h-40 bg-gradient-to-br from-amber/15 via-coral/10 to-purple-900/20 relative overflow-hidden">
                  {market.banner_url ? (
                    <img src={market.banner_url} alt={market.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-6xl opacity-30">🏮</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />
                  <span className={`absolute bottom-3 left-3 text-xs ${
                    market.status === 'published' ? 'badge-amber' :
                    market.status === 'active' ? 'badge-green' : 'badge-gray'
                  }`}>
                    {market.status === 'published' ? 'เปิดลงทะเบียน' :
                     market.status === 'active' ? 'กำลังจัด' : market.status}
                  </span>
                </div>
                <div className="p-5">
                  <h2 className="font-heading text-lg font-semibold text-warm-white group-hover:text-amber-light transition-colors mb-1 line-clamp-1">
                    {market.name}
                  </h2>
                  <p className="text-xs text-text-muted mb-1">{market.location}</p>
                  <p className="text-xs text-text-muted">{thaiDate}</p>
                  {market.description && (
                    <p className="text-xs text-text-muted mt-2 line-clamp-2">{market.description}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
