import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { FontSizeProvider } from "@/lib/font-size";
import ClientLayout from "./client-layout";

export const metadata: Metadata = {
  title: "MaekaOS",
  description: "ระบบ POS สำหรับผู้ค้า — MaekaOS",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-orange-50 dark:bg-[oklch(0.14_0.006_70)]">
        <FontSizeProvider>
          <ThemeProvider>
            <AuthProvider>
              <ClientLayout>{children}</ClientLayout>
            </AuthProvider>
          </ThemeProvider>
        </FontSizeProvider>
      </body>
    </html>
  );
}
