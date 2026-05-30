'use client';

import { useState } from 'react';
import { adminApi, SalesReport } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function AdminReportsPage() {
  const { token } = useAuth();
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [marketId, setMarketId] = useState('');
  const [vendorId, setVendorId] = useState('');

  const handleSearch = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (marketId) params.market_id = marketId;
      if (vendorId) params.vendor_id = vendorId;
      const res = await adminApi.getSalesReport(token, params);
      setReport(res);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setError(e?.data?.message || 'โหลดรายงานไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-slide-up opacity-0">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-warm-white">รายงาน</h1>
        <p className="text-text-muted text-sm mt-1 mb-6">ดูข้อมูลยอดขายและสถิติ</p>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">วันที่เริ่มต้น</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-base !py-2 !text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">วันที่สิ้นสุด</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-base !py-2 !text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">ตลาด</label>
            <input
              type="text"
              value={marketId}
              onChange={(e) => setMarketId(e.target.value)}
              placeholder="Market ID (optional)"
              className="input-base !py-2 !text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">ผู้ขาย</label>
            <input
              type="text"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              placeholder="Vendor ID (optional)"
              className="input-base !py-2 !text-sm"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="btn-amber text-sm !px-6 !py-2.5"
          >
            {loading ? 'กำลังโหลด...' : 'ค้นหา'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-coral/10 border border-coral/20 text-sm text-coral-light">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-2xl p-6 animate-pulse h-24" />
            ))}
          </div>
          <div className="glass rounded-2xl p-6 animate-pulse h-64" />
        </div>
      )}

      {/* Report Content */}
      {report && !loading && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-5 border border-white/5 card-glow">
              <p className="text-sm text-text-muted mb-1">ออเดอร์ทั้งหมด</p>
              <p className="text-3xl font-bold font-heading text-warm-white">
                {report.total_orders.toLocaleString()}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {report.period_start} — {report.period_end}
              </p>
            </div>
            <div className="glass rounded-2xl p-5 border border-white/5 card-glow">
              <p className="text-sm text-text-muted mb-1">รายได้รวม</p>
              <p className="text-3xl font-bold font-heading text-amber-light">
                ฿{report.total_revenue.toLocaleString()}
              </p>
            </div>
            <div className="glass rounded-2xl p-5 border border-white/5 card-glow">
              <p className="text-sm text-text-muted mb-1">มูลค่าเฉลี่ยต่อออเดอร์</p>
              <p className="text-3xl font-bold font-heading text-warm-white">
                ฿{report.avg_order_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Daily Breakdown */}
          {report.daily_breakdown && report.daily_breakdown.length > 0 && (
            <div className="glass rounded-2xl p-5 border border-white/5">
              <h2 className="font-heading text-lg font-bold text-warm-white mb-4">ยอดขายรายวัน</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-4 py-3 text-text-muted font-medium">วันที่</th>
                      <th className="text-right px-4 py-3 text-text-muted font-medium">ออเดอร์</th>
                      <th className="text-right px-4 py-3 text-text-muted font-medium">รายได้</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.daily_breakdown.map((day) => (
                      <tr key={day.date} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-warm-white">
                          {new Date(day.date).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right text-text-body">{day.order_count}</td>
                        <td className="px-4 py-3 text-right font-medium text-warm-white">
                          ฿{day.total_revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By Market */}
          {report.by_market && report.by_market.length > 0 && (
            <div className="glass rounded-2xl p-5 border border-white/5">
              <h2 className="font-heading text-lg font-bold text-warm-white mb-4">แยกตามตลาด</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-4 py-3 text-text-muted font-medium">ตลาด</th>
                      <th className="text-right px-4 py-3 text-text-muted font-medium">ออเดอร์</th>
                      <th className="text-right px-4 py-3 text-text-muted font-medium">รายได้</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.by_market.map((m) => (
                      <tr key={m.market_id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-warm-white">{m.market_name}</td>
                        <td className="px-4 py-3 text-right text-text-body">{m.order_count}</td>
                        <td className="px-4 py-3 text-right font-medium text-warm-white">
                          ฿{m.total_revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By Vendor */}
          {report.by_vendor && report.by_vendor.length > 0 && (
            <div className="glass rounded-2xl p-5 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg font-bold text-warm-white">แยกตามผู้ขาย</h2>
                <span className="text-xs text-text-muted">{report.by_vendor.length} ราย</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-4 py-3 text-text-muted font-medium">ผู้ขาย</th>
                      <th className="text-left px-4 py-3 text-text-muted font-medium hidden sm:table-cell">บูธ</th>
                      <th className="text-right px-4 py-3 text-text-muted font-medium">ออเดอร์</th>
                      <th className="text-right px-4 py-3 text-text-muted font-medium">รายได้</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.by_vendor.map((v) => (
                      <tr key={v.vendor_id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-warm-white">{v.vendor_name}</td>
                        <td className="px-4 py-3 text-text-body hidden sm:table-cell">{v.booth_name}</td>
                        <td className="px-4 py-3 text-right text-text-body">{v.order_count}</td>
                        <td className="px-4 py-3 text-right font-medium text-warm-white">
                          ฿{v.total_revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No Data */}
          {!report.daily_breakdown?.length && !report.by_market?.length && !report.by_vendor?.length && (
            <div className="glass rounded-2xl p-12 text-center">
              <span className="text-5xl block mb-4">📊</span>
              <p className="text-text-muted text-lg">ไม่มีข้อมูลในช่วงวันที่ที่เลือก</p>
              <p className="text-text-muted text-sm mt-1">ลองเปลี่ยนช่วงวันที่</p>
            </div>
          )}
        </div>
      )}

      {/* Initial State */}
      {!report && !loading && !error && (
        <div className="glass rounded-2xl p-12 text-center">
          <span className="text-5xl block mb-4">📈</span>
          <p className="text-text-muted text-lg">เลือกรอบวันที่และกดค้นหา</p>
          <p className="text-text-muted text-sm mt-1">เพื่อดูรายงานยอดขาย</p>
        </div>
      )}
    </div>
  );
}
