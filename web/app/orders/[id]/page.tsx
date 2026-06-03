"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { orderApi, type Order, type OrderStatus } from "@/lib/api";
import { formatBaht, formatThaiDate, formatThaiTime } from "@/lib/utils";

const statusConfig: Record<
  OrderStatus,
  { label: string; bgClass: string; textClass: string }
> = {
  new: { label: "ใหม่", bgClass: "bg-yellow-100", textClass: "text-yellow-700" },
  preparing: {
    label: "กำลังจัด",
    bgClass: "bg-blue-100",
    textClass: "text-blue-700",
  },
  paid: {
    label: "ชำระแล้ว",
    bgClass: "bg-green-100",
    textClass: "text-green-700",
  },
  completed: {
    label: "เสร็จแล้ว",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600",
  },
  cancelled: {
    label: "ยกเลิก",
    bgClass: "bg-red-100",
    textClass: "text-red-700",
  },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await orderApi.get(params.id as string);
      setOrder(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const updateStatus = async (status: OrderStatus) => {
    setActionLoading(true);
    try {
      const updated = await orderApi.updateStatus(params.id as string, status);
      setOrder(updated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-gray-500 mb-4">ไม่พบออร์เดอร์</p>
        <Link
          href="/orders"
          className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium min-h-[44px]"
        >
          กลับไปหน้าออร์เดอร์
        </Link>
      </div>
    );
  }

  const config = statusConfig[order.status];

  // Determine available actions
  const canCancel =
    order.status !== "completed" && order.status !== "cancelled";
  const actions: Array<{
    label: string;
    status: OrderStatus;
    variant: "primary" | "secondary" | "danger";
  }> = [];

  if (order.status === "new") {
    actions.push({
      label: "เริ่มจัดของ",
      status: "preparing",
      variant: "primary",
    });
  }
  if (order.status === "preparing") {
    actions.push({
      label: "ชำระเงินแล้ว",
      status: "paid",
      variant: "primary",
    });
  }
  if (order.status === "paid") {
    actions.push({
      label: "ส่งของแล้ว",
      status: "completed",
      variant: "primary",
    });
  }

  const variantClasses = {
    primary: "bg-orange-500 text-white active:bg-orange-600",
    secondary: "bg-gray-100 text-gray-600 active:bg-gray-200",
    danger: "bg-red-500 text-white active:bg-red-600",
  };

  return (
    <div className="flex flex-col min-h-screen bg-orange-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center border-b border-gray-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-6 h-6 text-gray-600"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h1 className="flex-1 text-center font-bold text-gray-800">
          ออร์เดอร์ #{order.order_no}
        </h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Order header card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${config.bgClass} ${config.textClass}`}
            >
              {config.label}
            </span>
            <span className="text-xs text-gray-400">
              {formatThaiDate(order.created_at)} •{" "}
              {formatThaiTime(order.created_at)}
            </span>
          </div>

          {/* Customer note */}
          {order.customer_note && (
            <div className="bg-blue-50 rounded-xl p-3 mt-2">
              <p className="text-xs text-blue-500 font-medium mb-0.5">
                โน้ตลูกค้า
              </p>
              <p className="text-sm text-gray-700">{order.customer_note}</p>
            </div>
          )}

          {/* Tags */}
          {order.tags && order.tags.trim() && (
            <div className="bg-purple-50 rounded-xl p-3 mt-2">
              <p className="text-xs text-purple-500 font-medium mb-1">
                แท็กลูกค้า
              </p>
              <div className="flex flex-wrap gap-1.5">
                {order.tags.split(",").filter(Boolean).map((tag, i) => (
                  <span key={i} className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Items list */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 text-sm mb-3">
            รายการสินค้า
          </h2>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatBaht(item.price)} × {item.qty}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-800 tabular-nums">
                  {formatBaht(item.subtotal)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">รวม</span>
              <span className="font-medium text-gray-700 tabular-nums">
                {formatBaht(order.subtotal)}
              </span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">ส่วนลด</span>
                <span className="font-medium text-red-500 tabular-nums">
                  -{formatBaht(order.discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-base border-t border-gray-100 pt-2">
              <span className="font-bold text-gray-800">ยอดสุทธิ</span>
              <span className="font-bold text-orange-600 text-lg tabular-nums">
                {formatBaht(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 text-sm mb-2">
            ข้อมูลการชำระเงิน
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-gray-400">วิธี:</span>{" "}
              <span className="font-medium">
                {order.payment_method === "promptpay"
                  ? "พร้อมเพย์"
                  : order.payment_method === "cash"
                  ? "เงินสด"
                  : "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400">สถานะ:</span>{" "}
              <span className="font-medium">
                {order.payment_status === "paid"
                  ? "ชำระแล้ว"
                  : order.payment_status || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 space-y-2">
        {actions.map((action) => (
          <button
            key={action.status}
            type="button"
            onClick={() => updateStatus(action.status)}
            disabled={actionLoading}
            className={`w-full py-3 rounded-xl font-bold text-base min-h-[48px] disabled:opacity-50 transition-colors shadow-sm ${variantClasses[action.variant]}`}
          >
            {actionLoading ? "กำลังดำเนินการ..." : action.label}
          </button>
        ))}
        {canCancel && (
          <button
            type="button"
            onClick={() => updateStatus("cancelled")}
            disabled={actionLoading}
            className="w-full py-3 rounded-xl border border-red-200 text-red-500 font-medium text-sm min-h-[44px] disabled:opacity-50 active:bg-red-50 transition-colors"
          >
            ยกเลิกออร์เดอร์นี้
          </button>
        )}
      </div>
    </div>
  );
}
