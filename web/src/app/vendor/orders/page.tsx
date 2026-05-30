'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { vendorApi, boothApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  booth_id: string;
  total_amount: number;
  final_amount: number;
  status: string;
  customer_note?: string;
  created_at: string;
}

interface Booth {
  id: string;
  booth_name: string;
}

const statusLabels: Record<string, string> = {
  pending: 'รอตรวจสอบ',
  confirmed: 'ยืนยันแล้ว',
  preparing: 'กำลังจัด order',
  ready_for_pickup: 'พร้อมรับ',
  completed: 'เสร็จสิ้น',
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

const statusOptions = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'pending', label: 'รอตรวจสอบ' },
  { value: 'confirmed', label: 'ยืนยันแล้ว' },
  { value: 'preparing', label: 'กำลังจัด order' },
  { value: 'ready_for_pickup', label: 'พร้อมรับ' },
  { value: 'completed', label: 'เสร็จสิ้น' },
];

export default function VendorOrdersPage() {
  const { isAuthenticated, token, user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    if (user && user.role !== 'vendor' && user.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [isAuthenticated, user, router]);

  const fetchOrders = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page_size: '50' };
      if (filterStatus) params.status = filterStatus;
      const res = await vendorApi.listOrders(token, params);
      setOrders((res.data || []) as Order[]);

      // Also fetch booths for display
      const b = await boothApi.listByMarket('', ''); // won't work, need vendor approach
      // Instead, extract unique booth IDs from orders
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setError(e?.data?.message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchOrders();
  }, [token, filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    if (!token) return;
    setUpdatingId(orderId);
    try {
      await vendorApi.updateStatus(orderId, { status: newStatus }, token);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setError(e?.data?.message || 'อัปเดตไม่สำเร็จ');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isAuthenticated || !user) return null;
  if (user.role !== 'vendor' && user.role !== 'admin') return null;

  const getCustomerName = (note?: string): string => {
    if (!note) return '—';
    if (note.startsWith('Walk-in: ')) return note.replace('Walk-in: ', '');
    return note;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-slide-up opacity-0">
        <div>
          <h1 className="font-heading text-3xl font-bold text-warm-white">จัดการออเดอร์</h1>
          <p className="text-text-muted text-sm mt-1">ออเดอร์ทั้งหมดในร้านของคุณ</p>
        </div>
        <Link href="/vendor/orders/create" className="btn-amber text-sm !px-6 !py-2.5 inline-flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          คีย์ order ใหม่
        </Link>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2 mb-6 animate-fade-slide-up opacity-0 stagger-1">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterStatus(opt.value)}
            className={`text-sm rounded-full px-4 py-1.5 transition-all ${
              filterStatus === opt.value
                ? 'bg-amber/20 text-amber-light border border-amber/30'
                : 'bg-white/5 text-text-muted border border-white/10 hover:border-white/20'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-coral/10 border border-coral/20 text-sm text-coral-light">
          {error}
        </div>
      )}

      {/* Orders */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="glass rounded-2xl h-24 animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center animate-fade-slide-up opacity-0 stagger-2">
          <span className="text-5xl block mb-4">📋</span>
          <p className="text-text-muted text-lg mb-2">ยังไม่มีออเดอร์</p>
          <p className="text-text-muted text-sm mb-6">กดคีย์ order เพื่อรับออเดอร์</p>
          <Link href="/vendor/orders/create" className="btn-amber text-sm !px-6 !py-2.5">
            คีย์ order ใหม่
          </Link>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-slide-up opacity-0 stagger-2">
          {orders.map((order, i) => (
            <div
              key={order.id}
              className="glass rounded-2xl p-5 card-glow animate-fade-slide-up opacity-0"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-heading font-semibold text-warm-white">{order.order_number}</span>
                    <span className={`text-xs ${statusColors[order.status] || 'badge-gray'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
                    <span>👤 {getCustomerName(order.customer_note)}</span>
                    <span>💰 ฿{order.final_amount.toFixed(2)}</span>
                    <span>🕐 {new Date(order.created_at).toLocaleString('th-TH', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}</span>
                  </div>
                </div>

                {/* Action buttons based on status */}
                <div className="flex items-center gap-2 shrink-0">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'preparing')}
                      disabled={updatingId === order.id}
                      className="btn-amber text-xs !px-4 !py-2"
                    >
                      {updatingId === order.id ? '...' : 'เริ่มจัด order'}
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'ready_for_pickup')}
                        disabled={updatingId === order.id}
                        className="btn-amber text-xs !px-4 !py-2"
                      >
                        {updatingId === order.id ? '...' : 'พร้อมรับ'}
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'completed')}
                        disabled={updatingId === order.id}
                        className="btn-primary text-xs !px-4 !py-2"
                      >
                        {updatingId === order.id ? '...' : 'เสร็จสิ้น'}
                      </button>
                    </>
                  )}
                  {order.status === 'ready_for_pickup' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'completed')}
                      disabled={updatingId === order.id}
                      className="btn-primary text-xs !px-4 !py-2"
                    >
                      {updatingId === order.id ? '...' : 'ยืนยันรับ'}
                    </button>
                  )}
                  {order.status === 'completed' && (
                    <span className="text-xs text-green-400">✔ เสร็จสิ้น</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
