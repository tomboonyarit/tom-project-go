'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import HoldToConfirmButton from './HoldToConfirmButton';

interface CartItem {
  id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit?: string;
  subtotal: number;
}

interface CartDrawerProps {
  items: CartItem[];
  discount: number;
  customerName: string;
  total: number;
  submitting: boolean;
  hasLastOrder: boolean;
  customerDescription?: string;
  observationGender?: string;
  observationShirt?: string;
  observationPants?: string;
  onUpdateItem: (id: string, updates: Partial<CartItem>) => void;
  onRemoveItem: (id: string) => void;
  onDiscountChange: (value: number) => void;
  onCustomerNameChange: (value: string) => void;
  onCustomerDescriptionChange?: (value: string) => void;
  onObservationGenderChange?: (value: string) => void;
  onObservationShirtChange?: (value: string) => void;
  onObservationPantsChange?: (value: string) => void;
  onSubmit: () => void;
  onLoadLastOrder: () => void;
}

export default function CartDrawer({
  items,
  discount,
  customerName,
  total,
  submitting,
  hasLastOrder,
  customerDescription = '',
  observationGender = '',
  observationShirt = '',
  observationPants = '',
  onUpdateItem,
  onRemoveItem,
  onDiscountChange,
  onCustomerNameChange,
  onCustomerDescriptionChange,
  onObservationGenderChange,
  onObservationShirtChange,
  onObservationPantsChange,
  onSubmit,
  onLoadLastOrder,
}: CartDrawerProps) {
  const [drawerHeight, setDrawerHeight] = useState(180);
  const [isResizing, setIsResizing] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const drawerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const MIN_HEIGHT = 120;
  const MAX_HEIGHT_PCT = 0.65;
  const COLLAPSED_HEIGHT = 160;
  const EXPANDED_HEIGHT = () => window.innerHeight * 0.5;

  const isExpanded = drawerHeight > COLLAPSED_HEIGHT + 40;

  // Auto-collapse when items are added/removed
  const prevCountRef = useRef(items.length);
  useEffect(() => {
    if (items.length > prevCountRef.current && items.length > 0) {
      // New item added — briefly expand
      setDrawerHeight((prev) => Math.max(prev, COLLAPSED_HEIGHT + 20));
    }
    prevCountRef.current = items.length;
  }, [items.length]);

  // Focus edit input when it appears
  useEffect(() => {
    if (editingItemId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingItemId]);

  // Resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsResizing(true);
      const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const startHeight = drawerHeight;
      const maxHeight = window.innerHeight * MAX_HEIGHT_PCT;

      const handleMove = (ev: MouseEvent | TouchEvent) => {
        const currentY = 'touches' in ev ? ev.touches[0].clientY : ev.clientY;
        const delta = startY - currentY;
        const newHeight = Math.min(
          maxHeight,
          Math.max(MIN_HEIGHT, startHeight + delta)
        );
        setDrawerHeight(newHeight);
      };

      const handleUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      document.addEventListener('touchmove', handleMove, { passive: true });
      document.addEventListener('touchend', handleUp);
    },
    [drawerHeight]
  );

  const toggleExpand = useCallback(() => {
    setDrawerHeight((prev) =>
      prev > COLLAPSED_HEIGHT + 40
        ? COLLAPSED_HEIGHT
        : Math.min(window.innerHeight * MAX_HEIGHT_PCT, EXPANDED_HEIGHT())
    );
  }, []);

  const handleEditPrice = (item: CartItem) => {
    setEditingItemId(item.id);
    setEditPrice(String(item.unit_price));
  };

  const confirmEditPrice = (itemId: string) => {
    const newPrice = parseFloat(editPrice);
    if (newPrice > 0) {
      onUpdateItem(itemId, { unit_price: newPrice });
    }
    setEditingItemId(null);
  };

  const incrementQty = (item: CartItem) => {
    if (item.quantity < 999) {
      onUpdateItem(item.id, { quantity: item.quantity + 1 });
    }
  };

  const decrementQty = (item: CartItem) => {
    if (item.quantity <= 1) {
      onRemoveItem(item.id);
    } else {
      onUpdateItem(item.id, { quantity: item.quantity - 1 });
    }
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onDiscountChange(isNaN(val) ? 0 : Math.max(0, val));
  };

  return (
    <div
      ref={drawerRef}
      className="relative bg-surface border-t border-white/10 rounded-t-2xl shadow-2xl flex flex-col"
      style={{
        height: isResizing ? drawerHeight : drawerHeight,
        transition: isResizing ? 'none' : 'height 0.25s ease',
      }}
    >
      {/* Drag handle area */}
      <div
        className="shrink-0 px-4 pt-1.5 pb-1 cursor-ns-resize touch-none"
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
      >
        <div className="flex items-center justify-between">
          {/* Handle bar */}
          <button
            onClick={toggleExpand}
            className="flex-1 flex justify-center py-1"
          >
            <div className="w-12 h-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors" />
          </button>

          {/* Cart summary badge */}
          <div className="shrink-0 ml-3">
            <span className="text-xs text-text-muted">
              {items.length} รายการ
            </span>
            <span className="text-xs text-text-muted mx-1">·</span>
            <span className="text-xs font-semibold text-amber-light">
              ฿{total}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-4 min-h-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <p className="text-text-muted text-sm">ยังไม่มีสินค้าในตะกร้า</p>
            <p className="text-text-muted text-xs">กดเลือกสินค้าด้านบน</p>

            {hasLastOrder && (
              <button
                onClick={onLoadLastOrder}
                className="btn-ghost text-xs !px-4 !py-1.5 mt-3 border border-white/10 rounded-lg"
              >
                📋 คัดลอก order ล่าสุด
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2 pb-2">
            {/* Copy last order button */}
            {hasLastOrder && (
              <button
                onClick={onLoadLastOrder}
                className="w-full btn-ghost text-xs !py-1.5 border border-white/10 rounded-lg flex items-center justify-center gap-1.5"
              >
                📋 คัดลอก order ล่าสุด
              </button>
            )}

            {/* Cart items */}
            {items.map((item) => (
              <div
                key={item.id}
                className="glass rounded-xl p-3 flex items-start gap-2 group"
              >
                {/* Delete button */}
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-coral/20 text-text-muted hover:text-coral-light transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-warm-white truncate">
                    {item.product_name}
                  </p>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      onClick={() => decrementQty(item)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-elevated/50 hover:bg-elevated text-warm-white text-sm transition-colors active:scale-90"
                    >
                      −
                    </button>
                    <span className="font-heading font-semibold text-warm-white text-sm w-6 text-center tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => incrementQty(item)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-elevated/50 hover:bg-elevated text-warm-white text-sm transition-colors active:scale-90"
                    >
                      +
                    </button>

                    <span className="text-text-muted text-xs mx-1">×</span>

                    {/* Price (tap to edit) */}
                    {editingItemId === item.id ? (
                      <input
                        ref={editInputRef}
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        onBlur={() => confirmEditPrice(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmEditPrice(item.id);
                          if (e.key === 'Escape') setEditingItemId(null);
                        }}
                        className="w-16 input-base !py-0.5 !px-2 text-sm text-right"
                        min={0}
                        step="0.5"
                      />
                    ) : (
                      <button
                        onClick={() => handleEditPrice(item)}
                        className="text-sm font-semibold text-amber-light hover:underline tabular-nums"
                      >
                        ฿{item.unit_price}
                      </button>
                    )}

                    <span className="ml-auto text-sm font-semibold text-warm-white tabular-nums">
                      ฿{item.subtotal}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expand/collapse hint */}
        {items.length > 0 && !isExpanded && (
          <p className="text-[10px] text-text-muted text-center py-1">
            ← ดึงขึ้นเพื่อดูตะกร้าทั้งหมด
          </p>
        )}
      </div>

      {/* Bottom section (always visible when items exist) */}
      <div className="shrink-0 px-4 pb-3 pt-1 space-y-2">
        {items.length > 0 && (
          <>
            {/* Discount + Customer row */}
            <div className="flex gap-2 items-start">
              <div className="flex-1 min-w-0">
                <label className="block text-[10px] text-text-muted mb-0.5">
                  ส่วนลด (฿)
                </label>
                <input
                  type="number"
                  min={0}
                  value={discount || ''}
                  onChange={handleDiscountChange}
                  placeholder="0"
                  className="input-base !py-1.5 text-sm text-right"
                />
              </div>
              <div className="flex-[2] min-w-0">
                <label className="block text-[10px] text-text-muted mb-0.5">
                  ชื่อลูกค้า (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => onCustomerNameChange(e.target.value)}
                  placeholder="เช่น คุณสมชาย"
                  className="input-base !py-1.5 text-sm"
                />
              </div>
            </div>

            {/* Observation section */}
            <details className="mt-1">
              <summary className="text-xs text-text-muted cursor-pointer hover:text-warm-white select-none">
                จุดสังเกตุลูกค้า ▼
              </summary>
              <div className="mt-2 space-y-2">
                <select
                  value={observationGender}
                  onChange={(e) => onObservationGenderChange?.(e.target.value)}
                  className="input-base !py-1.5 text-sm w-full"
                >
                  <option value="">เพศ</option>
                  <option value="ชาย">ชาย</option>
                  <option value="หญิง">หญิง</option>
                  <option value="ไม่ระบุ">ไม่ระบุ</option>
                </select>
                <input
                  type="text"
                  value={observationShirt}
                  onChange={(e) => onObservationShirtChange?.(e.target.value)}
                  className="input-base !py-1.5 text-sm w-full"
                  placeholder="เสื้อสี..."
                />
                <input
                  type="text"
                  value={observationPants}
                  onChange={(e) => onObservationPantsChange?.(e.target.value)}
                  className="input-base !py-1.5 text-sm w-full"
                  placeholder="กางเกงสี..."
                />
                <input
                  type="text"
                  value={customerDescription}
                  onChange={(e) => onCustomerDescriptionChange?.(e.target.value)}
                  className="input-base !py-1.5 text-sm w-full"
                  placeholder="อื่นๆ..."
                />
              </div>
            </details>

            {/* Total */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">
                {discount > 0 && (
                  <span className="line-through mr-2">
                    ฿{total + discount}
                  </span>
                )}
                ยอดรวม
              </span>
              <span className="font-heading text-lg font-bold text-amber-light tabular-nums">
                ฿{total}
              </span>
            </div>
          </>
        )}

        {/* Hold-to-Confirm */}
        <HoldToConfirmButton
          onConfirm={onSubmit}
          disabled={items.length === 0}
          loading={submitting}
          label={items.length === 0 ? 'เพิ่มสินค้าก่อน' : 'กดค้างเพื่อยืนยัน'}
        />
      </div>
    </div>
  );
}
