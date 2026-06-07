"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import BottomNavBar from "@/components/BottomNavBar";
import MaekaLogo from "@/components/MaekaLogo";
import { useAuth } from "@/lib/auth";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublic = pathname === "/login" || pathname === "/register";
  const isPos = pathname === "/pos";
  const { vendor } = useAuth();

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen">
        <BottomNavBar />

        {/* Top header — visible on mobile; hidden on desktop */}
        {!isPublic && (
          <header className="md:hidden fixed top-0 left-0 right-0 z-30 glass border-b border-gray-200/60 safe-area-top">
            <div className="flex items-center justify-between h-12 px-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <MaekaLogo size={26} />
                {vendor?.booth_name && (
                  <span className="text-sm font-bold text-gray-700 truncate">
                    {vendor.booth_name}
                  </span>
                )}
              </div>
            </div>
          </header>
        )}

        <main
          className={`flex-1 ${isPos ? "" : "page-enter"} ${
            isPublic
              ? ""
              : "pt-12 md:pt-0 pb-16 md:pb-0 md:ml-64"
          }           ${isPos ? "h-screen overflow-hidden" : "h-screen overflow-hidden"}`}
        >
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
