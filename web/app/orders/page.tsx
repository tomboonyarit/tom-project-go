"use client";

import { useState, useEffect, useCallback } from "react";
import { orderApi, tagApi, type Order, type OrderStatus, type OrderItem, type PaymentMethod, type CustomerTag } from "@/lib/api";
import { formatBaht, formatThaiTime, todayISO } from "@/lib/utils";

const statusTabs: Array<{ label: string; value: OrderStatus | "" }> = [
  { label: "ทั้งหมด", value: "" },
  { label: "ใหม่", value: "new" },
  { label: "กำลังจัด", value: "preparing" },
  { label: "ชำระแล้ว", value: "paid" },
  { label: "เสร็จแล้ว", value: "completed" },
  { label: "ยกเลิก", value: "cancelled" },
];

const statusConfig: Record<OrderStatus, { label: string; bgClass: string; textClass: string }> = {
  new: { label: "ใหม่", bgClass: "bg-amber-50", textClass: "text-amber-700" },
  preparing: { label: "กำลังจัด", bgClass: "bg-blue-50", textClass: "text-blue-700" },
  paid: { label: "ชำระแล้ว", bgClass: "bg-emerald-50", textClass: "text-emerald-700" },
  completed: { label: "เสร็จแล้ว", bgClass: "bg-gray-100", textClass: "text-gray-500" },
  cancelled: { label: "ยกเลิก", bgClass: "bg-red-50", textClass: "text-red-600" },
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [date, setDate] = useState(todayISO());
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<OrderItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [predefinedTags, setPredefinedTags] = useState<CustomerTag[]>([]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await orderApi.list(date, statusFilter || undefined);
      setOrders(data.orders);
      setTotalOrders(data.total_orders);
      setTotalRevenue(data.total_revenue);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [date, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { tagApi.list().then((d) => setPredefinedTags(d.tags)).catch(() => {}); }, []);

  const handleExpand = async (orderId: string) => {
    if (expandedId === orderId) { setExpandedId(null); setExpandedItems([]); return; }
    setExpandedId(orderId);
    setItemsLoading(true);
    try {
      const order = await orderApi.get(orderId);
      setExpandedItems(order.items || []);
    } catch { setExpandedItems([]); }
    finally { setItemsLoading(false); }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus, paymentMethod?: PaymentMethod) => {
    try {
      if (paymentMethod) await orderApi.updatePayment(orderId, paymentMethod);
      await orderApi.updateStatus(orderId, newStatus);
      fetchOrders();
      setExpandedId(null);
      setExpandedItems([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    }
  };

  const handleToggleOrderTag = async (orderId: string, tagName: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const currentTags = order.tags ? order.tags.split(",").filter(Boolean).map((t) => t.trim()) : [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter((t) => t !== tagName)
      : [...currentTags, tagName];
    try {
      await orderApi.updateTags(orderId, newTags);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, tags: newTags.join(",") } : o));
    } catch (err: unknown) {
      alert("ไม่สามารถอัปเดตแท็กได้");
    }
  };

  const activeOrders = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length;

  return (
    <div className="flex flex-col min-h-screen bg-orange-50">
      {/* Header + Summary + Date in one compact bar */}
      <div className="bg-white px-3 pt-2.5 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold text-gray-800">ออร์เดอร์</h1>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 min-h-[32px] transition-all duration-200 w-auto"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl px-3 py-2 border border-orange-100">
            <p className="text-[10px] text-gray-500">{totalOrders} ออร์เดอร์</p>
            <p className="text-sm font-bold text-gray-800">{formatBaht(totalRevenue)}</p>
          </div>
          <div className="flex-1 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl px-3 py-2 border border-orange-100">
            <p className="text-[10px] text-gray-500">{activeOrders} กำลังทำ</p>
            <p className="text-sm font-bold text-gray-800">
              {orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").reduce((s, o) => s + o.total, 0) > 0
                ? formatBaht(orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").reduce((s, o) => s + o.total, 0))
                : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Status tabs — compact */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-3 py-2 bg-white border-b border-gray-100">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => { setStatusFilter(tab.value as OrderStatus | ""); setExpandedId(null); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap min-h-[30px] transition-all duration-200 ${
              statusFilter === tab.value
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 active:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="skeleton skeleton-heading w-20" />
                  <div className="skeleton skeleton-text-sm w-14" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="skeleton skeleton-text w-12" />
                  <div className="skeleton skeleton-text w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 mb-2 text-gray-300">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <path d="M9 14 11 16 15 12" />
            </svg>
            <p className="text-sm font-medium">ไม่มีออร์เดอร์</p>
            <p className="text-xs mt-0.5">ลองเปลี่ยนวันที่หรือสถานะ</p>
          </div>
        ) : (
          <div className="space-y-2 stagger-fade-in">
            {orders.map((order) => {
              const config = statusConfig[order.status];
              const isExpanded = expandedId === order.id;
              return (
                <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-200">
                  <button
                    type="button"
                    onClick={() => handleExpand(order.id)}
                    className="w-full text-left p-3 active:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-gray-800 text-sm">#{order.order_no}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${config.bgClass} ${config.textClass} flex-shrink-0`}>
                          {config.label}
                        </span>
                        {order.payment_method && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                            order.payment_method === "promptpay"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-emerald-50 text-emerald-600"
                          }`}>
                            {order.payment_method === "promptpay" ? "QR" : "สด"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-gray-400">{formatThaiTime(order.created_at)}</span>
                        <span className="text-xs text-gray-500">{order.item_count || 0} รายการ</span>
                        <span className="font-bold text-gray-800 text-sm tabular-nums">{formatBaht(order.total)}</span>
                      </div>
                    </div>
                    {order.tags && order.tags.trim() && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {order.tags.split(",").filter(Boolean).map((tag, i) => (
                          <span key={i} className="px-2 py-0 rounded-full bg-purple-50 text-purple-600 text-[10px] font-medium">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>

                  {/* Expanded view */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-3 py-2.5 bg-gray-50/50 animate-fade-in-down">
                      {itemsLoading ? (
                        <div className="space-y-1.5 mb-2">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="skeleton skeleton-card h-8" />
                          ))}
                        </div>
                      ) : expandedItems.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">ไม่มีรายการสินค้า</p>
                      ) : (
                        <div className="space-y-1.5 mb-2">
                          {expandedItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between text-xs">
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-800 font-medium truncate">{item.product_name}</p>
                              </div>
                              <div className="flex items-center gap-2 tabular-nums flex-shrink-0">
                                <span className="text-gray-400">x{item.qty}</span>
                                <span className="text-gray-500">{formatBaht(item.price)}</span>
                                <span className="font-semibold text-gray-800 w-14 text-right">{formatBaht(item.subtotal)}</span>
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-between pt-1.5 border-t border-gray-200 text-xs">
                            <span className="text-gray-500">รวม {expandedItems.reduce((s, i) => s + i.qty, 0)} ชิ้น</span>
                            <span className="font-bold text-gray-800">{formatBaht(order.total)}</span>
                          </div>
                        </div>
                      )}

                      {/* Tag editing */}
                      {predefinedTags.length > 0 && (
                        <div className="mb-2">
                          <div className="flex flex-wrap gap-1">
                            {predefinedTags.map((tag) => {
                              const orderTags = order.tags ? order.tags.split(",").filter(Boolean).map((t) => t.trim()) : [];
                              const isSelected = orderTags.includes(tag.name);
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() => handleToggleOrderTag(order.id, tag.name)}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-150 min-h-[24px] ${
                                    isSelected
                                      ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm"
                                      : "bg-gray-100 text-gray-500 active:bg-gray-200"
                                  }`}
                                >
                                  {tag.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-1.5">
                        {order.status === "new" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(order.id, "preparing")}
                            className="flex-1 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-xs min-h-[36px] active:scale-[0.98] transition-all duration-150 shadow-sm shadow-blue-500/20"
                          >
                            เริ่มจัดของ
                          </button>
                        )}
                        {order.status === "preparing" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order.id, "paid", "cash")}
                              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-xs min-h-[36px] active:scale-[0.98] transition-all duration-150 shadow-sm shadow-emerald-500/20"
                            >
                              รับเงินสด
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(order.id, "paid", "promptpay")}
                              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-xs min-h-[36px] active:scale-[0.98] transition-all duration-150 shadow-sm shadow-blue-500/20"
                            >
                              รับโอน
                            </button>
                          </>
                        )}
                        {order.status === "paid" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(order.id, "completed")}
                            className="flex-1 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs min-h-[36px] active:scale-[0.98] transition-all duration-150 shadow-sm shadow-emerald-500/20"
                          >
                            ส่งของแล้ว
                          </button>
                        )}
                        {(order.status === "new" || order.status === "preparing") && (
                          <button
                            type="button"
                            onClick={() => { if (confirm("ยกเลิกออเดอร์นี้?")) handleStatusChange(order.id, "cancelled"); }}
                            className="py-2 px-3 rounded-lg bg-red-50 text-red-600 font-medium text-xs min-h-[36px] active:bg-red-100 transition-colors active:scale-[0.98]"
                          >
                            ยกเลิก
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
