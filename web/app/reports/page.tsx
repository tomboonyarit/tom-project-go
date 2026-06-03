"use client";

import { useState, useEffect, useCallback } from "react";
import { reportApi, type DailyReport, type MonthlyReport } from "@/lib/api";
import { formatBaht, todayISO, currentMonthISO } from "@/lib/utils";

type ViewMode = "daily" | "monthly";

export default function ReportsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [dailyDate, setDailyDate] = useState(todayISO());
  const [monthlyMonth, setMonthlyMonth] = useState(currentMonthISO());
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDaily = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reportApi.daily(dailyDate);
      setDailyReport(data);
    } catch {
      setDailyReport(null);
    } finally {
      setLoading(false);
    }
  }, [dailyDate]);

  const fetchMonthly = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reportApi.monthly(monthlyMonth);
      setMonthlyReport(data);
    } catch {
      setMonthlyReport(null);
    } finally {
      setLoading(false);
    }
  }, [monthlyMonth]);

  useEffect(() => {
    if (viewMode === "daily") fetchDaily();
    else fetchMonthly();
  }, [viewMode, fetchDaily, fetchMonthly]);

  const maxRevenue = monthlyReport
    ? Math.max(...monthlyReport.daily_breakdown.map((d) => d.revenue), 1)
    : 1;

  return (
    <div className="flex flex-col min-h-screen bg-orange-50">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-2 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">รายงาน</h1>
      </div>

      {/* Toggle daily/monthly */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <div className="flex bg-gray-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setViewMode("daily")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-h-[40px] ${
              viewMode === "daily"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            รายวัน
          </button>
          <button
            type="button"
            onClick={() => setViewMode("monthly")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-h-[40px] ${
              viewMode === "monthly"
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            รายเดือน
          </button>
        </div>

        {viewMode === "daily" ? (
          <input
            type="date"
            value={dailyDate}
            onChange={(e) => setDailyDate(e.target.value)}
            className="mt-3 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50 min-h-[40px] transition-all duration-200"
          />
        ) : (
          <input
            type="month"
            value={monthlyMonth}
            onChange={(e) => setMonthlyMonth(e.target.value)}
            className="mt-3 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50 min-h-[40px] transition-all duration-200"
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="skeleton skeleton-text-sm w-12 mb-2" />
                  <div className="skeleton skeleton-heading w-16" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="skeleton skeleton-heading w-32 mb-3" />
              <div className="skeleton skeleton-card h-32" />
            </div>
          </>
        ) : viewMode === "daily" && dailyReport ? (
          <DailyView report={dailyReport} />
        ) : viewMode === "monthly" && monthlyReport ? (
          <MonthlyView report={monthlyReport} maxRevenue={maxRevenue} />
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 mb-3 text-gray-300">
              <path d="M3 3v18h18" />
              <path d="m7 16 4-8 4 4 4-6" />
            </svg>
            <p className="text-sm font-medium">ไม่มีข้อมูล</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Daily View ───────────────────────────────────────────

function DailyView({ report }: { report: DailyReport }) {
  return (
    <div className="animate-fade-in-up">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">ออร์เดอร์</p>
          <p className="text-xl font-bold text-gray-800">{report.total_orders}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 shadow-sm border border-emerald-100">
          <p className="text-xs text-gray-400 mb-1">รายได้</p>
          <p className="text-xl font-bold text-emerald-600 tabular-nums">
            {formatBaht(report.total_revenue)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-4 shadow-sm border border-red-100">
          <p className="text-xs text-gray-400 mb-1">ส่วนลด</p>
          <p className="text-xl font-bold text-red-500 tabular-nums">
            {formatBaht(report.total_discount)}
          </p>
        </div>
      </div>

      {/* Payment breakdown */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <h2 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-orange-500" />
          แยกตามช่องทางชำระเงิน
        </h2>
        {report.by_payment.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-3">ไม่มีข้อมูล</p>
        ) : (
          <div className="space-y-3">
            {report.by_payment.map((p) => (
              <div key={p.payment_method} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-3 h-3 rounded-full ${
                    p.payment_method === 'cash' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`} />
                  <span className="text-sm text-gray-600">
                    {p.payment_method === 'cash' ? 'เงินสด' : 'พร้อมเพย์'}
                  </span>
                </div>
                <span className="font-semibold text-gray-800 tabular-nums">
                  {formatBaht(p.total)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top 5 products */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-orange-500" />
          สินค้าขายดี Top 5
        </h2>
        {report.top_products.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-5">ไม่มีข้อมูลสินค้าขายดี</p>
        ) : (
          <div className="space-y-2">
            {report.top_products.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-xs font-bold w-5 flex-shrink-0 ${
                    idx === 0 ? 'text-orange-500' :
                    idx === 1 ? 'text-orange-400' :
                    idx === 2 ? 'text-orange-300' :
                    'text-gray-400'
                  }`}>
                    #{idx + 1}
                  </span>
                  <span className="text-sm text-gray-800 truncate">
                    {item.product_name}
                  </span>
                </div>
                <div className="flex items-center gap-4 tabular-nums flex-shrink-0">
                  <span className="text-xs text-gray-400">x{item.total_qty}</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {formatBaht(item.total_amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Monthly View ─────────────────────────────────────────

function MonthlyView({
  report,
  maxRevenue,
}: {
  report: MonthlyReport;
  maxRevenue: number;
}) {
  return (
    <div className="animate-fade-in-up">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 mb-1">ออร์เดอร์</p>
          <p className="text-xl font-bold text-gray-800">{report.total_orders}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-4 shadow-sm border border-emerald-100">
          <p className="text-xs text-gray-400 mb-1">รายได้</p>
          <p className="text-xl font-bold text-emerald-600 tabular-nums">
            {formatBaht(report.total_revenue)}
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl p-4 shadow-sm border border-red-100">
          <p className="text-xs text-gray-400 mb-1">ส่วนลด</p>
          <p className="text-xl font-bold text-red-500 tabular-nums">
            {formatBaht(report.total_discount)}
          </p>
        </div>
      </div>

      {/* Daily bar chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <h2 className="font-semibold text-gray-700 text-sm mb-4 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-orange-500" />
          รายได้รายวัน
        </h2>
        {report.daily_breakdown.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-5">ไม่มีข้อมูล</p>
        ) : (
          <div className="flex items-end gap-1.5 h-40">
            {report.daily_breakdown.map((day) => {
              const heightPct = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              const isToday = day.date === todayISO();
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1"
                  title={`${day.date}: ${formatBaht(day.revenue)}`}
                >
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className={`w-full rounded-t-md min-w-[6px] transition-all duration-500 ${
                        isToday
                          ? "bg-gradient-to-t from-orange-500 to-orange-400 shadow-sm shadow-orange-500/20"
                          : "bg-orange-200"
                      }`}
                      style={{ height: `${Math.max(heightPct, 2)}%` }}
                    />
                  </div>
                  <span className={`text-[9px] whitespace-nowrap ${
                    isToday ? "text-orange-600 font-semibold" : "text-gray-400"
                  }`}>
                    {day.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment breakdown */}
      {report.by_payment && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-orange-500" />
            แยกตามช่องทางชำระเงิน
          </h2>
          {report.by_payment.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">ไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-3">
              {report.by_payment.map((p) => (
                <div key={p.payment_method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full ${
                      p.payment_method === 'cash' ? 'bg-emerald-500' : 'bg-blue-500'
                    }`} />
                    <span className="text-sm text-gray-600">
                      {p.payment_method === 'cash' ? 'เงินสด' : 'พร้อมเพย์'}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-800 tabular-nums">
                    {formatBaht(p.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
