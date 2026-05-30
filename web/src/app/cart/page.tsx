'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cartApi, orderApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  notes?: string;
}

export default function CartPage() {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!token) return;

    cartApi.getCart(token)
      .then((res) => setItems((res.items || []) as CartItem[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, token, router]);

  const handleRemove = async (itemId: string) => {
    if (!token) return;
    try {
      await cartApi.removeItem(itemId, token);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch {}
  };

  const handleClear = async () => {
    if (!token) return;
    try {
      await cartApi.clearCart(token);
      setItems([]);
    } catch {}
  };

  const handleQuantityChange = async (itemId: string, delta: number) => {
    if (!token) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const newQty = Math.max(1, item.quantity + delta);
    try {
      await cartApi.updateItem(itemId, { quantity: newQty }, token);
      setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity: newQty } : i)));
    } catch {}
  };

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8 animate-fade-slide-up opacity-0">
        <h1 className="font-heading text-3xl font-bold text-warm-white">ตะกร้าสินค้า</h1>
        {items.length > 0 && (
          <button onClick={handleClear} className="btn-ghost text-sm !px-4 !py-2">
            ล้างตะกร้า
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="glass rounded-2xl h-24 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center animate-fade-slide-up opacity-0 stagger-1">
          <span className="text-5xl block mb-4">🛒</span>
          <p className="text-text-muted text-lg mb-2">ตะกร้าว่างเปล่า</p>
          <p className="text-text-muted text-sm mb-6">เลือกสินค้าที่คุณต้องการจากร้านค้า</p>
          <Link href="/markets" className="btn-amber text-sm !px-6 !py-2.5">ดูตลาดนัด</Link>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-slide-up opacity-0 stagger-1">
          {items.map((item) => (
            <div key={item.id} className="glass rounded-2xl p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber/20 to-coral/20 flex items-center justify-center text-2xl shrink-0">
                📦
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-medium text-warm-white truncate">สินค้า ID: {item.product_id.slice(0, 8)}...</p>
                {item.notes && <p className="text-xs text-text-muted truncate">หมายเหตุ: {item.notes}</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-elevated rounded-xl px-3 py-1.5">
                  <button
                    onClick={() => handleQuantityChange(item.id, -1)}
                    className="text-text-muted hover:text-warm-white transition-colors text-lg leading-none"
                  >
                    −
                  </button>
                  <span className="text-sm font-medium text-warm-white w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(item.id, 1)}
                    className="text-text-muted hover:text-warm-white transition-colors text-lg leading-none"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="text-text-muted hover:text-coral-light transition-colors p-1.5"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          <div className="glass rounded-2xl p-6 mt-6">
            <p className="text-text-muted text-sm mb-1">รวม {items.length} รายการ</p>
            <Link
              href="/orders/create"
              className="btn-primary w-full text-base !py-3 mt-4 inline-flex items-center justify-center"
            >
              ดำเนินการสั่งซื้อ
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
