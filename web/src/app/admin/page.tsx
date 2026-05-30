'use client';

import { useState, useEffect } from 'react';
import { adminApi, DashboardStats } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const statusLabels: Record<string, string> = {
  pending: 'รอตรวจสอบ',
  confirmed: 'ยืนยันแล้ว',
  preparing: 'กำลังจัด',
  ready_for_pickup: 'พร้อมรับ',
  completed: 'เสร็จสิ้น',
  cancelled: 'ยกเลิก',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber/10 text-amber-light',
  confirmed: 'bg-blue-500/10 text-blue-400',
  preparing: 'bg-purple-500/10 text-purple-400',
  ready_for_pickup: 'bg-green-500/10 text-green-400',
  completed: 'bg-emerald-500/10 text-emerald-300',
  cancelled: 'bg-coral/10 text-coral-light',
};

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    adminApi
      .getDashboard(token)
      .then(setStats)
      .catch((err) => setError(err?.data?.message || 'โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-bold text-warm-white mb-8">ภาพรวมระบบ</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass rounded-2xl p-5 animate-pulse h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6 animate-pulse h-64" />
          <div className="glass rounded-2xl p-6 animate-pulse h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-bold text-warm-white mb-8">ภาพรวมระบบ</h1>
        <div className="glass rounded-2xl p-8 text-center">
          <span className="text-4xl block mb-3">⚠️</span>
          <p className="text-coral-light text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: 'ตลาดทั้งหมด',
      value: stats.total_markets,
      sub: `กำลังเปิด ${stats.active_markets} แห่ง`,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
        </svg>
      ),
      color: 'from-amber/20 to-amber/5 border-amber/20',
      iconColor: 'text-amber-light',
    },
    {
      label: 'ผู้ขาย',
      value: stats.total_vendors,
      sub: '',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
      color: 'from-coral/20 to-coral/5 border-coral/20',
      iconColor: 'text-coral-light',
    },
    {
      label: 'ออเดอร์วันนี้',
      value: stats.orders_today,
      sub: '',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
      color: 'from-sky-500/20 to-sky-500/5 border-sky-500/20',
      iconColor: 'text-sky-400',
    },
    {
      label: 'รายได้วันนี้',
      value: `฿${stats.revenue_today.toLocaleString()}`,
      sub: `เดือนนี้ ฿${stats.revenue_month.toLocaleString()}`,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-green-500/20 to-green-500/5 border-green-500/20',
      iconColor: 'text-green-400',
    },
  ];

  return (
    <div className="animate-fade-slide-up opacity-0">
      <h1 className="font-heading text-2xl lg:text-3xl font-bold text-warm-white mb-1">ภาพรวมระบบ</h1>
      <p className="text-text-muted text-sm mb-8">ข้อมูลการดำเนินงานทั้งหมด</p>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div
            key={i}
            className={`glass rounded-2xl p-5 border bg-gradient-to-br ${card.color} card-glow animate-fade-slide-up opacity-0 stagger-${i + 1}`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className={`${card.iconColor}`}>{card.icon}</span>
            </div>
            <p className="text-2xl lg:text-3xl font-bold font-heading text-warm-white mb-0.5">
              {card.value}
            </p>
            <p className="text-sm text-text-muted">{card.label}</p>
            {card.sub && (
              <p className="text-xs text-text-muted/60 mt-1">{card.sub}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <div className="glass rounded-2xl p-6 card-glow animate-fade-slide-up opacity-0 stagger-3">
          <h2 className="font-heading text-lg font-bold text-warm-white mb-4">ออเดอร์แยกตามสถานะ</h2>
          <div className="space-y-3">
            {stats.orders_by_status?.length > 0 ? (
              stats.orders_by_status.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${statusColors[item.status]?.split(' ')[0] || 'bg-gray-500'}`} />
                    <span className="text-sm text-text-body">{statusLabels[item.status] || item.status}</span>
                  </div>
                  <span className="text-sm font-semibold text-warm-white">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-muted">ไม่มีข้อมูล</p>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="glass rounded-2xl p-6 card-glow animate-fade-slide-up opacity-0 stagger-4">
          <h2 className="font-heading text-lg font-bold text-warm-white mb-4">ออเดอร์ล่าสุด</h2>
          {stats.recent_orders?.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-warm-white">{order.order_number}</p>
                    <p className="text-xs text-text-muted">
                      {order.booth_name || order.market_name || ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-warm-white">
                      ฿{order.final_amount?.toLocaleString()}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-gray-500/10 text-gray-400'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">ไม่มีออเดอร์ล่าสุด</p>
          )}
        </div>
      </div>
    </div>
  );
}
