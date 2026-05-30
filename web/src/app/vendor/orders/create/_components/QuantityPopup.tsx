'use client';

import { useState, useRef, useEffect } from 'react';

interface QuantityPopupProps {
  isOpen: boolean;
  productName: string;
  onSelect: (quantity: number) => void;
  onClose: () => void;
}

const quickNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function QuantityPopup({
  isOpen,
  productName,
  onSelect,
  onClose,
}: QuantityPopupProps) {
  const [customQty, setCustomQty] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomQty('');
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (qty: number) => {
    onSelect(qty);
    setCustomQty('');
    onClose();
  };

  const handleCustomSubmit = () => {
    const qty = parseInt(customQty, 10);
    if (qty > 0 && qty <= 999) {
      handleSelect(qty);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative glass rounded-t-2xl sm:rounded-2xl p-6 w-full sm:w-72 animate-fade-slide-up">
        <h3 className="font-heading text-base font-semibold text-warm-white mb-1 text-center">
          เลือกจำนวน
        </h3>
        {productName && (
          <p className="text-sm text-text-muted text-center mb-4 truncate">
            {productName}
          </p>
        )}

        {/* Quick number grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {quickNumbers.map((n) => (
            <button
              key={n}
              onClick={() => handleSelect(n)}
              className="h-12 text-lg font-heading font-semibold text-warm-white bg-elevated/50 rounded-xl hover:bg-elevated hover:border-amber/30 border border-white/5 transition-all active:scale-95"
            >
              {n}
            </button>
          ))}
        </div>

        {/* Custom quantity */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="number"
            min={1}
            max={999}
            value={customQty}
            onChange={(e) => setCustomQty(e.target.value)}
            onKeyDown={handleKeyDown}
            className="input-base !py-2.5 text-center text-base"
            placeholder="จำนวนอื่นๆ"
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customQty || parseInt(customQty) <= 0}
            className="btn-amber !px-5 !py-2.5 text-sm shrink-0"
          >
            ตกลง
          </button>
        </div>

        {/* Cancel */}
        <button
          onClick={onClose}
          className="btn-ghost w-full mt-3 text-sm !py-2"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
