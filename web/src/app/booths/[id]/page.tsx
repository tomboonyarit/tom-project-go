'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { boothApi, productApi, cartApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

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

interface Product {
  id: string;
  booth_id: string;
  name: string;
  price: number;
  sale_price?: number;
  image_urls: string[];
  stock_quantity?: number;
  unit: string;
  is_available: boolean;
  description?: string;
}

export default function BoothDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();
  const [booth, setBooth] = useState<Booth | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [cartMsg, setCartMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      boothApi.getById(id),
      productApi.listByBooth(id, { page_size: '100', available: 'true' }),
    ])
      .then(([b, p]) => {
        setBooth(b as Booth);
        setProducts((p.data || []) as Product[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async (productId: string) => {
    if (!isAuthenticated || !token) {
      router.push('/auth/login');
      return;
    }
    setAddingToCart(productId);
    setCartMsg('');
    try {
      await cartApi.addItem({ product_id: productId, quantity: 1 }, token);
      setCartMsg('เพิ่มสินค้าในตะกร้าแล้ว ✅');
    } catch {
      setCartMsg('เกิดข้อผิดพลาด');
    } finally {
      setAddingToCart(null);
      setTimeout(() => setCartMsg(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="glass rounded-3xl h-48 animate-pulse mb-8" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <div key={i} className="glass rounded-2xl h-52 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!booth) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-text-muted text-lg">ไม่พบร้านค้านี้</p>
        <Link href="/markets" className="btn-amber text-sm !px-6 !py-2.5 mt-4 inline-block">กลับไปหน้ารายการตลาด</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Booth Header */}
      <div className="glass rounded-3xl p-6 sm:p-8 mb-8 animate-fade-slide-up opacity-0">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber/20 to-coral/20 flex items-center justify-center shrink-0 text-4xl">
            {booth.logo_url ? (
              <img src={booth.logo_url} alt="" className="w-full h-full object-cover rounded-2xl" />
            ) : '🏪'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-warm-white mb-1">{booth.booth_name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
              {booth.booth_number && <span>แผง {booth.booth_number}</span>}
              {booth.zone && <span>โซน {booth.zone}</span>}
              {booth.status === 'approved' && <span className="badge-green text-[10px]">พร้อมรับออเดอร์</span>}
            </div>
            {booth.description && (
              <p className="text-sm text-warm-white-dim mt-3 leading-relaxed">{booth.description}</p>
            )}
            <Link
              href={`/markets/${booth.market_id}`}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-amber-light transition-colors mt-3"
            >
              ← กลับไปหน้ารายการร้านค้า
            </Link>
          </div>
        </div>
      </div>

      {/* Cart notification */}
      {cartMsg && (
        <div className="mb-6 p-4 rounded-xl bg-amber/10 border border-amber/20 text-sm text-amber-light text-center animate-fade-slide-up">
          {cartMsg}
        </div>
      )}

      {/* Products */}
      <h2 className="font-heading text-2xl font-bold text-warm-white mb-6 animate-fade-slide-up opacity-0 stagger-1">
        สินค้า ({products.length} รายการ)
      </h2>

      {products.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center animate-fade-slide-up opacity-0 stagger-2">
          <p className="text-text-muted">ยังไม่มีสินค้าในร้านนี้</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product, i) => (
            <div
              key={product.id}
              className="glass rounded-2xl overflow-hidden card-glow animate-fade-slide-up opacity-0"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              {/* Product Image */}
              <div className="h-40 bg-gradient-to-br from-surface to-elevated relative flex items-center justify-center">
                {product.image_urls && product.image_urls.length > 0 && product.image_urls[0] ? (
                  <img src={product.image_urls[0]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl opacity-30">📦</span>
                )}
                {product.sale_price && (
                  <span className="absolute top-3 left-3 badge-coral">ลดราคา</span>
                )}
                {!product.is_available && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="badge-gray">หมดชั่วคราว</span>
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-heading font-semibold text-warm-white mb-1 line-clamp-1">{product.name}</h3>
                {product.description && (
                  <p className="text-xs text-text-muted mb-3 line-clamp-2">{product.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    {product.sale_price ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-coral-light">฿{product.sale_price.toFixed(2)}</span>
                        <span className="text-xs text-text-muted line-through">฿{product.price.toFixed(2)}</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-amber-light">฿{product.price.toFixed(2)}</span>
                    )}
                    <span className="text-xs text-text-muted">/{product.unit}</span>
                  </div>
                  <button
                    onClick={() => handleAddToCart(product.id)}
                    disabled={addingToCart === product.id || !product.is_available}
                    className="btn-amber !p-2.5 !rounded-xl text-sm"
                    title="เพิ่มในตะกร้า"
                  >
                    {addingToCart === product.id ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
