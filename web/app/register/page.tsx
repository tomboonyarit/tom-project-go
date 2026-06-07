"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import MaekaLogo from "@/components/MaekaLogo";

export default function RegisterPage() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [name, setName] = useState("");
  const [boothName, setBoothName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      setError("กรุณากรอกเบอร์โทรศัพท์ 10 หลัก");
      return;
    }
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError("กรุณากรอกรหัส PIN 6 หลัก");
      return;
    }
    if (pin !== confirmPin) {
      setError("รหัส PIN ไม่ตรงกัน");
      return;
    }
    if (!name.trim()) {
      setError("กรุณากรอกชื่อ");
      return;
    }

    setLoading(true);
    try {
      await register(phone, pin, name.trim(), boothName.trim() || undefined);
      router.replace("/pos");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600" />
      <div className="absolute inset-0 bg-gradient-to-t from-orange-900/20 to-transparent" />
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/8 blur-3xl" />

      <div className="w-full max-w-sm relative z-10 animate-fade-in-up">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-900/10 p-8 border border-white/20">
          <div className="text-center mb-8 animate-fade-in-down">
            <div className="flex justify-center mb-4">
              <MaekaLogo size={48} showText={false} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">สมัครสมาชิก</h1>
            <p className="text-sm text-gray-400 mt-1">MaekaOS</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                เบอร์โทรศัพท์
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="\d*"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="0812345678"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50/80 min-h-[48px] transition-all duration-200 placeholder:text-gray-300"
                autoComplete="tel"
              />
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                รหัส PIN (6 หลัก)
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="******"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50/80 min-h-[48px] tracking-[0.3em] transition-all duration-200 placeholder:text-gray-300"
                autoComplete="new-password"
              />
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                ยืนยันรหัส PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                placeholder="******"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50/80 min-h-[48px] tracking-[0.3em] transition-all duration-200 placeholder:text-gray-300"
                autoComplete="new-password"
              />
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                ชื่อผู้ขาย
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ชื่อของคุณ"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50/80 min-h-[48px] transition-all duration-200 placeholder:text-gray-300"
                autoComplete="name"
              />
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">
                ชื่อร้าน / บูธ (ไม่บังคับ)
              </label>
              <input
                type="text"
                value={boothName}
                onChange={(e) => setBoothName(e.target.value)}
                placeholder="ชื่อร้านค้า"
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50/80 min-h-[48px] transition-all duration-200 placeholder:text-gray-300"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 animate-fade-in-down">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg min-h-[48px] disabled:opacity-50 transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 active:scale-[0.98] active:from-orange-600 active:to-orange-700"
              style={{ animationDelay: "0.3s" }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  กำลังสมัคร...
                </span>
              ) : (
                "สมัครสมาชิก"
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-400 animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
            มีบัญชีแล้ว?{" "}
            <Link href="/login" className="text-orange-500 font-semibold hover:text-orange-600 transition-colors">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
