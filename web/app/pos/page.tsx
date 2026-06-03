"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { productApi, categoryApi, orderApi, tagApi, type Product, type Category, type PaymentMethod, type CustomerTag } from "@/lib/api";
import { formatBaht } from "@/lib/utils";

// ── Cart Item ────────────────────────────────────────────

interface CartItem {
  product_id: string;
  product_name: string;
  price: number;
  quantity: number;
}

// ── POS Page ─────────────────────────────────────────────

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartExpanded, setCartExpanded] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showQuickProduct, setShowQuickProduct] = useState(false);
  const [loading, setLoading] = useState(true);
  const tabsRef = useRef<HTMLDivElement>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([
        productApi.list(search || undefined, activeCategory || undefined),
        categoryApi.list(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, activeCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    tagApi.list().then((data) => setPredefinedTags(data.tags)).catch(() => {});
  }, []);

  const handleToggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const addToCart = useCallback((product: Product, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.product_id === product.id);
      if (existing) {
        return prev.map((ci) =>
          ci.product_id === product.id
            ? { ...ci, quantity: ci.quantity + quantity }
            : ci,
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          quantity,
        },
      ];
    });
  }, []);

  const updateCartItemQuantity = useCallback(
    (productId: string, quantity: number) => {
      setCart((prev) =>
        quantity <= 0
          ? prev.filter((ci) => ci.product_id !== productId)
          : prev.map((ci) =>
              ci.product_id === productId ? { ...ci, quantity } : ci,
            ),
      );
    },
    [],
  );

  const removeCartItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((ci) => ci.product_id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const total = subtotal;

  const [checkoutStep, setCheckoutStep] = useState<"select" | "confirm">(
    "select",
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerNote, setCustomerNote] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [predefinedTags, setPredefinedTags] = useState<CustomerTag[]>([]);

  const handleSaveOrder = async () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);
    try {
      await orderApi.create({
        items: cart.map((ci) => ({
          product_id: ci.product_id,
          qty: ci.quantity,
          price: ci.price,
        })),
        customer_note: customerNote || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });
      setSuccessMsg("บันทึกออเดอร์สำเร็จ — รับออเดอร์ต่อไปได้เลย");
      clearCart();
      setCustomerNote("");
      setSelectedTags([]);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);
    try {
      await orderApi.create({
        items: cart.map((ci) => ({
          product_id: ci.product_id,
          qty: ci.quantity,
          price: ci.price,
        })),
        customer_note: customerNote || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        payment_method: paymentMethod,
      });
      setSuccessMsg("บันทึกออเดอร์สำเร็จ!");
      clearCart();
      setShowCheckout(false);
      setCheckoutStep("select");
      setCustomerNote("");
      setSelectedTags([]);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleQuickProductAdd = async (name: string, price: number) => {
    try {
      const product = await productApi.quickCreate(name, price);
      setCart((prev) => [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          quantity: 1,
        },
      ]);
      setShowQuickProduct(false);
      setSuccessMsg(`เพิ่ม "${name}" เรียบร้อย`);
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.is_active !== false && p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full overflow-hidden bg-orange-50">
      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-800/90 backdrop-blur-sm text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium animate-fade-in-down flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-green-400 flex-shrink-0">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* ===== TOP HALF: Product Grid ===== */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Search bar */}
        <div className="p-3 pb-0 flex gap-2 items-center">
          <div className="flex-1 relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาสินค้า..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white min-h-[44px] transition-all duration-200 shadow-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowQuickProduct(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold text-sm min-h-[44px] whitespace-nowrap active:scale-95 transition-all duration-150 shadow-md shadow-orange-500/20"
          >
            + ด่วน
          </button>
        </div>

        {/* Category tabs */}
        <div
          ref={tabsRef}
          className="flex gap-2 overflow-x-auto no-scrollbar px-3 py-2.5"
        >
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[36px] transition-all duration-200 ${
              activeCategory === null
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                : "bg-white text-gray-600 border border-gray-200 hover:border-orange-200 hover:text-orange-600"
            }`}
          >
            ทั้งหมด
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap min-h-[36px] transition-all duration-200 ${
                activeCategory === cat.id
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-orange-200 hover:text-orange-600"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Tags selector */}
        {predefinedTags.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-3 pb-2">
            {predefinedTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleToggleTag(tag.name)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap min-h-[32px] transition-all duration-150 ${
                  selectedTags.includes(tag.name)
                    ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm shadow-purple-500/20"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-purple-200 hover:text-purple-600"
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto px-3 pb-2">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 min-h-[100px]">
                  <div className="skeleton skeleton-card w-full mb-2" />
                  <div className="skeleton skeleton-text w-3/4 mb-1.5" />
                  <div className="skeleton skeleton-text-sm w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 mb-3 text-gray-300">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <p className="text-sm font-medium">ไม่มีสินค้า</p>
              <p className="text-xs mt-1">ลองค้นหาด้วยชื่ออื่น</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 stagger-fade-in">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product, 1)}
                  className="bg-white rounded-2xl p-3 border border-gray-100 active:scale-[0.97] transition-all duration-150 text-left min-h-[80px] flex flex-col justify-between hover:shadow-md hover:border-orange-200 hover:-translate-y-0.5 group"
                >
                  {product.image_url && (
                    <div className="w-full h-20 bg-gray-100 rounded-xl mb-2.5 overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-800 leading-tight line-clamp-2 group-hover:text-orange-700 transition-colors">
                      {product.name}
                    </p>
                    <p className="text-base font-bold text-orange-600 mt-1">
                      {formatBaht(product.price)}
                    </p>
                    {product.unit && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{product.unit}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Cart pull-tab / handle ===== */}
      <button
        type="button"
        onClick={() => setCartExpanded(!cartExpanded)}
        className="flex items-center justify-center gap-3 py-2 bg-white border-t border-gray-200 select-none min-h-[40px] active:bg-gray-50 transition-colors"
      >
        <span className="w-10 h-1 rounded-full bg-gray-300" />
        <span className="text-xs text-gray-500 font-medium">
          {cartExpanded ? "▼ ซ่อนตะกร้า" : `▲ ตะกร้า${cart.length > 0 ? ` (${cart.length})` : ""}`}
        </span>
        <span className="w-10 h-1 rounded-full bg-gray-300" />
      </button>

      {/* ===== BOTTOM HALF: Cart Drawer ===== */}
      <div
        className={`bg-white border-t border-gray-200 flex flex-col transition-all duration-300 overflow-hidden ${
          cartExpanded ? "max-h-[45vh]" : "h-auto"
        }`}
      >
        {/* Collapsed: just total + checkout button */}
        {!cartExpanded && cart.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 gap-2">
            <span className="text-sm font-semibold text-gray-700">
              {cart.length} รายการ • {formatBaht(total)}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={checkoutLoading}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm min-h-[40px] active:bg-gray-200 disabled:opacity-40 transition-all duration-150 active:scale-95"
              >
                {checkoutLoading ? "..." : "บันทึก"}
              </button>
              <button
                type="button"
                onClick={() => setShowCheckout(true)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm min-h-[40px] active:scale-95 transition-all duration-150 shadow-sm shadow-orange-500/20"
              >
                ชำระเงิน
              </button>
            </div>
          </div>
        )}
        {!cartExpanded && cart.length === 0 && (
          <div className="px-4 py-2.5 text-center">
            <span className="text-sm text-gray-400">แตะสินค้าเพื่อเพิ่มลงตะกร้า</span>
          </div>
        )}
        {/* Expanded: full cart */}
        {cartExpanded && (
          <>
            {/* Cart header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800 text-base">
                ตะกร้า ({cart.length})
              </h2>
              <div className="flex gap-2">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-red-500 font-medium px-3 py-1.5 min-h-[32px] active:bg-red-50 rounded-lg transition-colors"
                  >
                    ล้างทั้งหมด
                  </button>
                )}
              </div>
            </div>
            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 mb-2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <p className="text-sm">ยังไม่มีสินค้าในตะกร้า</p>
              <p className="text-xs mt-1">เลือกสินค้าด้านบน</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.product_id}
                  className="flex items-center gap-2 py-2.5 border-b border-gray-50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatBaht(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => updateCartItemQuantity(item.product_id, item.quantity - 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg min-w-[32px] active:bg-gray-200 transition-all duration-150 select-none"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-gray-800 tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartItemQuantity(item.product_id, item.quantity + 1)}
                      className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg min-w-[32px] active:bg-orange-200 transition-all duration-150 select-none"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 tabular-nums w-16 text-right">
                    {formatBaht(item.price * item.quantity)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeCartItem(item.product_id)}
                    className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center text-red-400 min-w-[28px] active:bg-red-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart footer */}
        <div className="border-t border-gray-100 px-4 py-3 pb-5 md:pb-3 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">รวม</span>
            <span className="font-semibold text-gray-700 tabular-nums">
              {formatBaht(subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-base border-t border-gray-100 pt-2">
            <span className="font-bold text-gray-800">ยอดสุทธิ</span>
            <span className="font-bold text-orange-600 text-lg tabular-nums">
              {formatBaht(total)}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={cart.length === 0 || checkoutLoading}
              className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm min-h-[48px] active:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98]"
            >
              {checkoutLoading ? "..." : "บันทึก"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (cart.length > 0) {
                  setShowCheckout(true);
                  setCheckoutStep("select");
                }
              }}
              disabled={cart.length === 0}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-base min-h-[48px] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-md shadow-orange-500/20"
            >
              ชำระเงิน • {formatBaht(total)}
            </button>
          </div>
        </div>
          </>
        )}
      </div>

      {/* ── Quick Product Modal ── */}
      {showQuickProduct && (
        <QuickProductForm
          onSubmit={handleQuickProductAdd}
          onClose={() => setShowQuickProduct(false)}
        />
      )}

      {/* ── Checkout Modal ── */}
      {showCheckout && (
        <CheckoutModal
          cart={cart}
          subtotal={subtotal}
          total={total}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          customerNote={customerNote}
          setCustomerNote={setCustomerNote}
          selectedTags={selectedTags}
          setSelectedTags={setSelectedTags}
          predefinedTags={predefinedTags}
          setPredefinedTags={setPredefinedTags}
          step={checkoutStep}
          setStep={setCheckoutStep}
          loading={checkoutLoading}
          onConfirm={handleCheckout}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </div>
  );
}

// ── Quick Product Form ──────────────────────────────────

function QuickProductForm({
  onSubmit,
  onClose,
}: {
  onSubmit: (name: string, price: number) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setLoading(true);
    try {
      await onSubmit(name.trim(), Math.round(parseFloat(price) * 100));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl animate-scale-in">
        <h3 className="text-lg font-semibold text-gray-800 mb-5">
          เพิ่มสินค้าด่วน
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              ชื่อสินค้า
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อสินค้า"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50 min-h-[48px] transition-all duration-200"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              ราคา (บาท)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="50"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50 min-h-[48px] transition-all duration-200"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium min-h-[44px] active:bg-gray-200 transition-all duration-150 active:scale-95"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !price}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold min-h-[44px] disabled:opacity-50 transition-all duration-150 active:scale-95 shadow-sm shadow-orange-500/20"
            >
              {loading ? "กำลังเพิ่ม..." : "เพิ่ม & เพิ่มเข้าตะกร้า"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Checkout Modal ───────────────────────────────────────

function CheckoutModal({
  cart,
  subtotal,
  total,
  paymentMethod,
  setPaymentMethod,
  customerNote,
  setCustomerNote,
  selectedTags,
  setSelectedTags,
  predefinedTags,
  setPredefinedTags,
  step,
  setStep,
  loading,
  onConfirm,
  onClose,
}: {
  cart: CartItem[];
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (m: PaymentMethod) => void;
  customerNote: string;
  setCustomerNote: (n: string) => void;
  selectedTags: string[];
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  predefinedTags: CustomerTag[];
  setPredefinedTags: React.Dispatch<React.SetStateAction<CustomerTag[]>>;
  step: "select" | "confirm";
  setStep: (s: "select" | "confirm") => void;
  loading: boolean;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [newTagName, setNewTagName] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  useEffect(() => {
    tagApi.list().then((data) => setPredefinedTags(data.tags)).catch(() => {});
  }, [setPredefinedTags]);

  const handleToggleTag = (tagName: string) => {
    setSelectedTags(
      selectedTags.includes(tagName)
        ? selectedTags.filter((t) => t !== tagName)
        : [...selectedTags, tagName]
    );
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    setAddingTag(true);
    try {
      const tag = await tagApi.create(newTagName.trim());
      setPredefinedTags((prev) => [...prev, tag]);
      setSelectedTags((prev) => [...prev, tag.name]);
      setNewTagName("");
    } catch { /* ignore */ }
    finally { setAddingTag(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-slide-in-up">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-gray-100 bg-white">
        <button
          type="button"
          onClick={step === "confirm" ? () => setStep("select") : onClose}
          className="p-2 -ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl active:bg-gray-100 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6 text-gray-600">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <h2 className="flex-1 text-center font-bold text-gray-800 text-lg">
          {step === "select" ? "เลือกชำระเงิน" : "ยืนยันคำสั่งซื้อ"}
        </h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Order summary */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 mb-5 border border-orange-100">
          <h3 className="font-semibold text-gray-700 text-sm mb-3">
            สรุปรายการ
          </h3>
          {cart.map((item) => (
            <div
              key={item.product_id}
              className="flex justify-between py-1.5 text-sm"
            >
              <span className="text-gray-600">
                {item.product_name} × {item.quantity}
              </span>
              <span className="font-medium text-gray-800 tabular-nums">
                {formatBaht(item.price * item.quantity)}
              </span>
            </div>
          ))}
          <div className="flex justify-between pt-2.5 mt-1 border-t border-orange-200">
            <span className="font-bold text-gray-800">ยอดรวม</span>
            <span className="font-bold text-orange-600 text-lg tabular-nums">
              {formatBaht(total)}
            </span>
          </div>
        </div>

        {step === "select" ? (
          <>
            {/* Customer note */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                โน้ตลูกค้า (ไม่บังคับ)
              </label>
              <input
                type="text"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="ชื่อลูกค้า หรือโน้ต"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white min-h-[48px] transition-all duration-200"
              />
            </div>

            {/* Customer tags */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                แท็กลูกค้า
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {predefinedTags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleTag(tag.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 min-h-[32px] ${
                      selectedTags.includes(tag.name)
                        ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-sm shadow-purple-500/20"
                        : "bg-gray-100 text-gray-600 active:bg-gray-200 hover:bg-purple-50 hover:text-purple-600"
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="เพิ่มแท็กใหม่"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-gray-50 min-h-[40px] transition-all duration-200"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={addingTag || !newTagName.trim()}
                  className="px-4 py-2.5 rounded-xl bg-purple-100 text-purple-600 font-bold text-sm min-h-[40px] disabled:opacity-50 active:bg-purple-200 transition-all duration-150"
                >
                  {addingTag ? "..." : "เพิ่ม"}
                </button>
              </div>
              {selectedTags.length > 0 && (
                <p className="text-xs text-gray-400 mt-1.5">
                  เลือก: {selectedTags.join(", ")}
                </p>
              )}
            </div>

            {/* Payment — cash only */}
            <button
              type="button"
              onClick={() => {
                setPaymentMethod("cash");
                setStep("confirm");
              }}
              className="w-full flex flex-col items-center justify-center gap-2.5 p-6 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white min-h-[110px] active:scale-95 transition-all duration-150 shadow-lg shadow-green-500/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-10 h-10">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <circle cx="12" cy="12" r="2" />
              </svg>
              <span className="font-bold text-lg">เงินสด</span>
            </button>
          </>
        ) : (
          /* Confirm step — cash only */
          <div className="text-center">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 mb-4 border border-green-100">
              <p className="text-sm text-gray-500 mb-1">ยอดที่ต้องชำระ</p>
              <p className="text-4xl font-bold text-green-600 tabular-nums">
                {formatBaht(total)}
              </p>
            </div>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg min-h-[52px] disabled:opacity-50 transition-all duration-150 active:scale-[0.98] shadow-lg shadow-green-500/25"
            >
              {loading ? "กำลังบันทึก..." : "ยืนยันรับเงิน"}
            </button>

            <button
              type="button"
              onClick={() => setStep("select")}
              className="w-full mt-3 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium min-h-[44px] active:bg-gray-200 transition-all duration-150 active:scale-[0.98]"
            >
              ย้อนกลับ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
