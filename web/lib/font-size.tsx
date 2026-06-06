"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const FONT_SIZES = [
  { value: 85, label: "เล็ก", emoji: "A-" },
  { value: 100, label: "ปกติ", emoji: "A" },
  { value: 115, label: "ใหญ่", emoji: "A+" },
  { value: 130, label: "ใหญ่พิเศษ", emoji: "A++" },
] as const;

type FontSizeValue = (typeof FONT_SIZES)[number]["value"];

interface FontSizeContextValue {
  fontSize: FontSizeValue;
  setFontSize: (v: FontSizeValue) => void;
}

const FontSizeContext = createContext<FontSizeContextValue>({
  fontSize: 100,
  setFontSize: () => {},
});

export function useFontSize() {
  return useContext(FontSizeContext);
}

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizeValue>(100);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("font-size");
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (FONT_SIZES.some((f) => f.value === parsed)) {
        setFontSizeState(parsed as FontSizeValue);
      }
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.style.fontSize = `${fontSize}%`;
    localStorage.setItem("font-size", String(fontSize));
  }, [fontSize, mounted]);

  const setFontSize = (v: FontSizeValue) => {
    setFontSizeState(v);
  };

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}
