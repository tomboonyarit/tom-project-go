'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface HoldToConfirmButtonProps {
  onConfirm: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  holdDuration?: number;
}

export default function HoldToConfirmButton({
  onConfirm,
  disabled = false,
  loading = false,
  label = 'กดค้างเพื่อยืนยัน',
  holdDuration = 500,
}: HoldToConfirmButtonProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isDisabled = disabled || loading;

  const clearTimer = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    setHolding(false);
    setProgress(0);
  }, []);

  const startHold = useCallback(() => {
    if (isDisabled) return;
    setHolding(true);
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const pct = Math.min(elapsed / holdDuration, 1);
      setProgress(pct);

      if (pct >= 1) {
        clearTimer();
        onConfirm();
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isDisabled, holdDuration, onConfirm, clearTimer]);

  const endHold = useCallback(() => {
    if (!holding) return;
    clearTimer();
  }, [holding, clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const strokeDasharray = 125.6; // 2 * PI * 20
  const strokeDashoffset = strokeDasharray * (1 - progress);

  return (
    <button
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={endHold}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      onTouchCancel={endHold}
      disabled={isDisabled}
      className={`
        relative w-full text-base !py-4 overflow-hidden select-none touch-none
        ${holding && !isDisabled ? 'scale-[0.98]' : ''}
        ${loading ? 'btn-amber' : 'btn-primary'}
        transition-all duration-150 ease-out
      `}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4" fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          กำลังสร้าง...
        </span>
      ) : holding ? (
        <span className="flex items-center justify-center gap-2">
          {/* Circular progress */}
          <svg className="w-6 h-6" viewBox="0 0 48 48">
            <circle
              cx="24" cy="24" r="20"
              fill="none"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="4"
            />
            <circle
              cx="24" cy="24" r="20"
              fill="none"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 24 24)"
              className="transition-[stroke-dashoffset] duration-50"
            />
          </svg>
          <span className="tabular-nums">{Math.round(progress * 100)}%</span>
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {label}
        </span>
      )}
    </button>
  );
}
