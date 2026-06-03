"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNavBar from "@/components/BottomNavBar";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname === "/login" || pathname === "/register";
  const isPos = pathname === "/pos";

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <BottomNavBar />
        <main
          className={`flex-1 page-enter ${
            isPublic
              ? ""
              : "pb-16 md:pb-0 md:ml-64"
          } ${isPos ? "h-screen overflow-hidden" : "min-h-screen"}`}
        >
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
