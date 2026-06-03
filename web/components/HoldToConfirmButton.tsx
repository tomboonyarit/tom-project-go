"use client";

import { useState, useRef, useCallback } from "react";

interface HoldToConfirmButtonProps {
  onConfirm: () => void;
  label: string;
  className?: string;
  disabled?: boolean;
}

export default function HoldToConfirmButton({
  onConfirm,
  label,
  className = "",
  disabled = false,
}: HoldToConfirmButtonProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmedRef = useRef(false);

  const startHolding = useCallback(() => {
    if (disabled) return;
    confirmedRef.current = false;
    setHolding(true);
    setProgress(0);
    const startTime = Date.now();
    const duration = 1500;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);

      if (elapsed >= duration && !confirmedRef.current) {
        confirmedRef.current = true;
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setHolding(false);
        setProgress(0);
        onConfirm();
      }
    }, 30);
  }, [disabled, onConfirm]);

  const stopHolding = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setHolding(false);
    setProgress(0);
  }, []);

  return (
    <button
      type="button"
      onMouseDown={startHolding}
      onMouseUp={stopHolding}
      onMouseLeave={stopHolding}
      onTouchStart={startHolding}
      onTouchEnd={stopHolding}
      onTouchCancel={stopHolding}
      disabled={disabled}
      className={`relative overflow-hidden select-none touch-none min-h-[52px] px-8 rounded-xl font-bold text-white text-lg transition-all duration-150 ${
        holding ? "scale-[0.98] shadow-inner" : "active:scale-[0.97]"
      } ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${className}`}
    >
      {/* Progress bar overlay */}
      {holding && (
        <span
          className="absolute inset-y-0 left-0 bg-white/25 backdrop-blur-sm transition-none rounded-xl"
          style={{ width: `${progress}%` }}
        />
      )}
      {/* Pulsing ring while holding */}
      {holding && (
        <span className="absolute inset-0 rounded-xl ring-2 ring-white/40 animate-pulse" />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {holding ? (
          <>
            <span className="w-2 h-2 rounded-full bg-white animate-bounce-gentle" style={{ animationDelay: "0s" }} />
            <span className="w-2 h-2 rounded-full bg-white animate-bounce-gentle" style={{ animationDelay: "0.15s" }} />
            <span className="w-2 h-2 rounded-full bg-white animate-bounce-gentle" style={{ animationDelay: "0.3s" }} />
            <span className="sr-only">{label}</span>
          </>
        ) : (
          label
        )}
      </span>
    </button>
  );
}
