'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { orderApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  final_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}

const statusLabels: Record<string, string> = {
  pending: 'รอตรวจสอบ',
  confirmed: 'ยืนยันแล้ว',
  preparing: 'กำลังจัดเตรียม',
  ready_for_pickup: 'พร้อมรับ',
  completed: 'รับแล้ว',
  cancelled: 'ยกเลิก',
};

const statusColors: Record<string, string> = {
  pending: 'badge-amber',
  confirmed: 'badge-amber',
  preparing: 'badge-amber',
  ready_for_pickup: 'badge-green',
  completed: 'badge-green',
  cancelled: 'badge-gray',
};

export default function OrdersPage() {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!token) return;

    orderApi.list(token, { page_size: '50' })
      .then((res) => setOrders((res.data || []) as Order[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, token, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-heading text-3xl font-bold text-warm-white mb-8 animate-fade-slide-up opacity-0">
        ออเดอร์ของฉัน
      </h1>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="glass rounded-2xl h-24 animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center animate-fade-slide-up opacity-0 stagger-1">
          <span className="text-5xl block mb-4">📋</span>
          <p className="text-text-muted text-lg mb-2">ยังไม่มีออเดอร์</p>
          <p className="text-text-muted text-sm mb-6">ไปเลือกสินค้าและสั่งซื้อได้เลย</p>
          <Link href="/markets" className="btn-amber text-sm !px-6 !py-2.5">ดูตลาดนัด</Link>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-slide-up opacity-0 stagger-1">
          {orders.map((order, i) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="glass rounded-2xl p-5 card-glow block animate-fade-slide-up opacity-0 group"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-heading font-semibold text-warm-white group-hover:text-amber-light transition-colors">
                    {order.order_number}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('th-TH', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs ${statusColors[order.status] || 'badge-gray'}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                  <p className="text-sm font-semibold text-amber-light mt-1">
                    ฿{order.final_amount.toFixed(2)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
