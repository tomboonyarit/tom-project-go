"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import MaekaLogo from "@/components/MaekaLogo";

const navItems = [
  {
    label: "ขายของ",
    href: "/pos",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
        <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
        <path d="M12 3v6" />
      </svg>
    ),
  },
  {
    label: "ออร์เดอร์",
    href: "/orders",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 14 11 16 15 12" />
      </svg>
    ),
  },
  {
    label: "สินค้า",
    href: "/products",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    label: "รายงาน",
    href: "/reports",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <path d="M3 3v18h18" />
        <path d="m7 16 4-8 4 4 4-6" />
      </svg>
    ),
  },
  {
    label: "ตั้งค่า",
    href: "/settings",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
];

export default function BottomNavBar() {
  const pathname = usePathname();
  const { vendor } = useAuth();

  if (pathname === "/login" || pathname === "/register") return null;

  const isActive = (href: string) => {
    if (href === "/pos") return pathname === "/pos";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:h-screen md:fixed md:left-0 md:top-0 md:bg-white md:border-r md:border-gray-100 md:shadow-sm md:z-40">
        <div className="px-5 pt-7 pb-4 border-b border-gray-100">
          <MaekaLogo size={30} />
          {vendor?.booth_name && (
            <div className="flex items-center gap-2 mt-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <p className="text-sm font-bold text-gray-700 truncate">{vendor.booth_name}</p>
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-0.5 flex-1 px-3">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] ${
                  active
                    ? "bg-orange-50 text-orange-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className={`transition-colors duration-200 ${
                  active ? "text-orange-600" : "text-gray-400 group-hover:text-gray-500"
                }`}>
                  {item.icon}
                </span>
                {item.label}
                {active && (
                  <span className="ml-auto w-1.5 h-5 rounded-full bg-orange-500" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 text-center tracking-wide">MaekaOS v1.0</p>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 safe-area-bottom">
        <div className="glass border-t border-gray-200/60">
          <div className="flex justify-around items-center h-16 px-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] px-2 py-1 rounded-xl transition-all duration-200 ${
                    active ? "text-orange-600" : "text-gray-400"
                  }`}
                >
                  {/* Active pill indicator */}
                  {active && (
                    <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-orange-500 animate-fade-in-down" />
                  )}
                  <span className="relative z-10 transition-transform duration-200 group-active:scale-90">
                    {item.icon}
                  </span>
                  <span
                    className={`relative z-10 text-[10px] leading-tight tracking-wide transition-all duration-200 ${
                      active ? "font-semibold scale-105" : "font-medium"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
