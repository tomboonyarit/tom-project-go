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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLevel, setCartLevel] = useState(0); // 0=hidden, 1=fullscreen
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tagInput, setTagInput] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [timeNow, setTimeNow] = useState<Date | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [predefinedTags, setPredefinedTags] = useState<CustomerTag[]>([]);

  const fetchProducts = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([
        productApi.list(undefined, activeCategory || undefined),
        categoryApi.list(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    tagApi.list().then((data) => setPredefinedTags(data.tags)).catch(() => {});
  }, []);

  useEffect(() => {
    const tick = () => setTimeNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (tagInputRef.current && !tagInputRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleToggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
    );
  };

  const matchedTags = tagInput.trim()
    ? predefinedTags.filter((t) =>
        t.name.toLowerCase().includes(tagInput.trim().toLowerCase()) &&
        !selectedTags.includes(t.name)
      )
    : [];

  const handleSelectTagFromAutocomplete = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags((prev) => [...prev, tagName]);
    }
    setTagInput("");
    setShowTagDropdown(false);
  };

  const handleAddNewTagFromAutocomplete = async () => {
    const name = tagInput.trim();
    if (!name) return;
    try {
      const tag = await tagApi.create(name);
      setPredefinedTags((prev) => [...prev, tag]);
      setSelectedTags((prev) => [...prev, tag.name]);
    } catch { /* ignore */ }
    setTagInput("");
    setShowTagDropdown(false);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (matchedTags.length > 0) {
        handleSelectTagFromAutocomplete(matchedTags[0].name);
      } else if (tagInput.trim()) {
        handleAddNewTagFromAutocomplete();
      }
    }
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
    setSuccessMsg(`เพิ่ม "${product.name}" เข้าตะกร้าแล้ว`);
    setTimeout(() => setSuccessMsg(""), 1500);
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

  const filteredProducts = products.filter((p) => p.is_active !== false);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-orange-50">
      {/* Success toast */}
      {successMsg && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none">
          <div className="bg-gray-800/90 backdrop-blur-sm text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-medium animate-scale-in flex items-center gap-2 pointer-events-auto">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 text-green-400 flex-shrink-0">
            <path d="M20 6 9 17l-5-5" />
          </svg>
           {successMsg}
          </div>
        </div>
      )}

      {/* ===== TOP HALF: Product Grid ===== */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Date / Time */}
        <div className="px-3 pt-2 pb-0.5">
          <div className="flex items-center gap-1.5 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 text-gray-400 flex-shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-xs font-semibold text-gray-700 tabular-nums leading-none">
              {timeNow
                ? new Intl.DateTimeFormat("th-TH", {
                    timeZone: "Asia/Bangkok",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(timeNow)
                : "..."}
            </span>
            <span className="text-[9px] text-gray-400 font-medium leading-none">ICT</span>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1 px-3 pt-1 pb-1">
          <span className="text-[10px] text-gray-300 font-medium mr-1 whitespace-nowrap">หมวด</span>
          <div className="h-4 w-px bg-gray-200 mr-1" />
          <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap min-h-[32px] transition-all duration-200 ${
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
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap min-h-[32px] transition-all duration-200 ${
                  activeCategory === cat.id
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                    : "bg-white text-gray-600 border border-gray-200 hover:border-orange-200 hover:text-orange-600"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tag autocomplete + selected tags */}
        <div className="flex items-center gap-1 px-3 pb-2 pt-1">
          <span className="text-[10px] text-gray-300 font-medium mr-1 whitespace-nowrap">แท็ก</span>
          <div className="h-4 w-px bg-gray-200 mr-1" />
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {selectedTags.map((tagName) => (
              <button
                key={tagName}
                type="button"
                onClick={() => handleToggleTag(tagName)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 whitespace-nowrap active:scale-95 transition-all"
              >
                {tagName}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            ))}
            <div className="relative flex-1 min-w-[100px]" ref={tagInputRef}>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => { setTagInput(e.target.value); setShowTagDropdown(true); }}
                onFocus={() => setShowTagDropdown(true)}
                onKeyDown={handleTagInputKeyDown}
                placeholder="เพิ่มแท็ก..."
                className="w-full px-2.5 py-1 rounded-full text-xs border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-transparent bg-white min-h-[28px]"
              />
              {showTagDropdown && tagInput.trim() && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-200 z-30 max-h-[160px] overflow-y-auto animate-fade-in-up">
                  {matchedTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleSelectTagFromAutocomplete(tag.name); }}
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      {tag.name}
                    </button>
                  ))}
                  {matchedTags.length === 0 && (
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleAddNewTagFromAutocomplete(); }}
                      className="w-full text-left px-3 py-2 text-xs text-purple-600 font-medium hover:bg-purple-50 transition-colors rounded-xl flex items-center gap-1.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      เพิ่ม &quot;{tagInput.trim()}&quot;
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

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
        onClick={() => setCartLevel((prev) => (prev === 0 ? 1 : 0))}
        className="relative z-30 flex items-center justify-center gap-2 py-2.5 bg-white border-t border-gray-200 select-none min-h-[44px] active:bg-gray-50 transition-colors flex-shrink-0"
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            {cartLevel === 1 ? <path d="m6 9 6 6 6-6" /> : <path d="m18 15-6-6-6 6" />}
          </svg>
          {cartLevel === 0 && "แตะเพื่อแสดงตะกร้า"}
          {cartLevel === 1 && `ตะกร้าเต็มจอ${cart.length > 0 ? ` (${cart.length})` : ""} — แตะเพื่อซ่อน`}
        </span>
      </button>

      {/* ===== Cart Drawer (fullscreen) ===== */}
      {cartLevel === 1 && (
        <div className="fixed inset-0 z-20 bg-white flex flex-col animate-slide-in-up">
          <button
            type="button"
            onClick={() => setCartLevel(0)}
            className="flex items-center justify-center gap-2 py-2.5 bg-white border-b border-gray-200 select-none min-h-[44px] active:bg-gray-50 transition-colors flex-shrink-0"
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
                <path d="m18 15-6-6-6 6" />
              </svg>
              เต็มจอ{cart.length > 0 ? ` (${cart.length})` : ""} — แตะเพื่อย่อ
            </span>
          </button>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800 text-base">
              ตะกร้า ({cart.length})
            </h2>
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
          <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
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
                      <p className="text-sm font-medium text-gray-800 truncate">{item.product_name}</p>
                      <p className="text-xs text-gray-400">{formatBaht(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateCartItemQuantity(item.product_id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg min-w-[32px] active:bg-gray-200 transition-all duration-150 select-none"
                      >−</button>
                      <span className="w-8 text-center text-sm font-semibold text-gray-800 tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartItemQuantity(item.product_id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg min-w-[32px] active:bg-orange-200 transition-all duration-150 select-none"
                      >+</button>
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
          <div className="border-t border-gray-100 px-4 py-3 pb-5 md:pb-3 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">รวม</span>
              <span className="font-semibold text-gray-700 tabular-nums">{formatBaht(subtotal)}</span>
            </div>
            <div className="flex justify-between text-base border-t border-gray-100 pt-2">
              <span className="font-bold text-gray-800">ยอดสุทธิ</span>
              <span className="font-bold text-orange-600 text-lg tabular-nums">{formatBaht(total)}</span>
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
                onClick={() => { if (cart.length > 0) { setShowCheckout(true); setCheckoutStep("select"); } }}
                disabled={cart.length === 0}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-base min-h-[48px] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-md shadow-orange-500/20"
              >
                ชำระเงิน • {formatBaht(total)}
              </button>
            </div>
          </div>
        </div>
      )}
      {cartLevel === 0 && cart.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 gap-2 bg-white border-t border-gray-200 flex-shrink-0">
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
  const [modalTagInput, setModalTagInput] = useState("");
  const [modalShowDropdown, setModalShowDropdown] = useState(false);
  const modalTagRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    tagApi.list().then((data) => setPredefinedTags(data.tags)).catch(() => {});
  }, [setPredefinedTags]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modalTagRef.current && !modalTagRef.current.contains(e.target as Node)) {
        setModalShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const modalMatchedTags = modalTagInput.trim()
    ? predefinedTags.filter((t) =>
        t.name.toLowerCase().includes(modalTagInput.trim().toLowerCase()) &&
        !selectedTags.includes(t.name)
      )
    : [];

  const handleModalSelectTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags((prev) => [...prev, tagName]);
    }
    setModalTagInput("");
    setModalShowDropdown(false);
  };

  const handleModalAddNewTag = async () => {
    const name = modalTagInput.trim();
    if (!name) return;
    try {
      const tag = await tagApi.create(name);
      setPredefinedTags((prev) => [...prev, tag]);
      setSelectedTags((prev) => [...prev, tag.name]);
    } catch { /* ignore */ }
    setModalTagInput("");
    setModalShowDropdown(false);
  };

  const handleModalTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (modalMatchedTags.length > 0) {
        handleModalSelectTag(modalMatchedTags[0].name);
      } else if (modalTagInput.trim()) {
        handleModalAddNewTag();
      }
    }
  };

  const handleToggleTag = (tagName: string) => {
    setSelectedTags(
      selectedTags.includes(tagName)
        ? selectedTags.filter((t) => t !== tagName)
        : [...selectedTags, tagName]
    );
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
                {selectedTags.map((tagName) => (
                  <button
                    key={tagName}
                    type="button"
                    onClick={() => handleToggleTag(tagName)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 whitespace-nowrap active:scale-95 transition-all"
                  >
                    {tagName}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                ))}
              </div>
              <div className="relative" ref={modalTagRef}>
                <input
                  type="text"
                  value={modalTagInput}
                  onChange={(e) => { setModalTagInput(e.target.value); setModalShowDropdown(true); }}
                  onFocus={() => setModalShowDropdown(true)}
                  onKeyDown={handleModalTagKeyDown}
                  placeholder="พิมพ์เพื่อค้นหาหรือเพิ่มแท็กใหม่..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-gray-50 min-h-[40px] transition-all duration-200"
                />
                {modalShowDropdown && modalTagInput.trim() && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-200 z-30 max-h-[160px] overflow-y-auto animate-fade-in-up">
                    {modalMatchedTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleModalSelectTag(tag.name); }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        {tag.name}
                      </button>
                    ))}
                    {modalMatchedTags.length === 0 && (
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleModalAddNewTag(); }}
                        className="w-full text-left px-3 py-2 text-xs text-purple-600 font-medium hover:bg-purple-50 transition-colors rounded-xl flex items-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        เพิ่ม &quot;{modalTagInput.trim()}&quot;
                      </button>
                    )}
                  </div>
                )}
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
