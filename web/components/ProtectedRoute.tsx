"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const publicRoutes = ["/login", "/register"];

export default function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = publicRoutes.includes(pathname);

  useEffect(() => {
    if (isLoading) return;
    if (!isPublic && !isAuthenticated) {
      router.replace("/login");
    }
    if (isPublic && isAuthenticated) {
      router.replace("/pos");
    }
  }, [isAuthenticated, isLoading, isPublic, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-orange-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // Don't render protected content if not authenticated
  if (!isPublic && !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
