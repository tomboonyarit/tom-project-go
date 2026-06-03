"use client";

import { useState, useEffect } from "react";

interface QuantityPopupProps {
  productName: string;
  initialQuantity?: number;
  onSubmit: (quantity: number) => void;
  onClose: () => void;
}

export default function QuantityPopup({
  productName,
  initialQuantity = 1,
  onSubmit,
  onClose,
}: QuantityPopupProps) {
  const [quantity, setQuantity] = useState(initialQuantity);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const increment = () => setQuantity((q) => Math.min(q + 1, 999));
  const decrement = () => setQuantity((q) => Math.max(q - 1, 1));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl animate-scale-in">
        <h3 className="text-lg font-semibold text-gray-800 text-center mb-1">
          {productName}
        </h3>
        <p className="text-xs text-gray-400 text-center mb-6">เลือกจำนวน</p>

        <div className="flex items-center justify-center gap-8 mb-6">
          <button
            type="button"
            onClick={decrement}
            disabled={quantity <= 1}
            className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-600 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] transition-all duration-150 active:scale-90"
          >
            -
          </button>
          <span className="text-4xl font-bold text-gray-800 tabular-nums w-16 text-center select-none">
            {quantity}
          </span>
          <button
            type="button"
            onClick={increment}
            className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-2xl font-bold text-orange-600 active:bg-orange-200 min-h-[44px] min-w-[44px] transition-all duration-150 active:scale-90"
          >
            +
          </button>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium text-base min-h-[44px] active:bg-gray-200 transition-all duration-150 active:scale-95"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onSubmit(quantity)}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-base min-h-[44px] active:scale-95 transition-all duration-150 shadow-sm shadow-orange-500/20"
          >
            เพิ่ม {quantity} ชิ้น
          </button>
        </div>
      </div>
    </div>
  );
}
