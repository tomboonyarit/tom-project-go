"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { profileApi, tagApi, type CustomerTag } from "@/lib/api";

export default function SettingsPage() {
  const { vendor, logout, refreshVendor } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [name, setName] = useState("");
  const [boothName, setBoothName] = useState("");
  const [promptpayId, setPromptpayId] = useState("");
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [message, setMessage] = useState("");
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  useEffect(() => {
    if (vendor) {
      setName(vendor.name || "");
      setBoothName(vendor.booth_name || "");
      setPromptpayId(vendor.promptpay_id || "");
    }
  }, [vendor]);

  useEffect(() => {
    tagApi.list().then((data) => setTags(data.tags)).catch(() => {});
  }, []);

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    setAddingTag(true);
    try {
      const tag = await tagApi.create(newTagName.trim());
      setTags((prev) => [...prev, tag]);
      setNewTagName("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setMessage(`❌ ${msg}`);
    } finally { setAddingTag(false); }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm("ลบแท็กนี้?")) return;
    try {
      await tagApi.delete(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setMessage(`❌ ${msg}`);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage("");
    try {
      await profileApi.update({
        name: name.trim() || undefined,
        booth_name: boothName.trim() || undefined,
        promptpay_id: promptpayId.trim() || undefined,
      });
      await refreshVendor();
      setMessage("✅ บันทึกข้อมูลสำเร็จ");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setMessage(`❌ ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePin = async () => {
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setMessage("❌ รหัส PIN ใหม่ต้องเป็น 6 หลัก");
      return;
    }
    if (newPin !== confirmNewPin) {
      setMessage("❌ รหัส PIN ไม่ตรงกัน");
      return;
    }
    setChangingPin(true);
    setMessage("");
    try {
      await profileApi.update({
        old_pin: oldPin,
        new_pin: newPin,
      });
      setMessage("✅ เปลี่ยนรหัส PIN สำเร็จ");
      setOldPin("");
      setNewPin("");
      setConfirmNewPin("");
      setTimeout(() => setMessage(""), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setMessage(`❌ ${msg}`);
    } finally {
      setChangingPin(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="flex flex-col min-h-screen bg-orange-50">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-2 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">ตั้งค่า</h1>
      </div>

      {/* Message toast */}
      {message && (
        <div className="px-4 pt-3 animate-fade-in-down">
          <div
            className={`px-4 py-3 rounded-xl text-sm font-medium ${
              message.startsWith("✅")
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-red-50 text-red-600 border border-red-100"
            }`}
          >
            {message}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Profile card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 text-base mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-orange-500" />
            ข้อมูลผู้ใช้
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                เบอร์โทรศัพท์
              </label>
              <p className="text-sm font-medium text-gray-800 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                {vendor?.phone || "—"}
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                ชื่อ
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ชื่อของคุณ"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white min-h-[44px] transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                ชื่อร้าน / บูธ
              </label>
              <input
                type="text"
                value={boothName}
                onChange={(e) => setBoothName(e.target.value)}
                placeholder="ชื่อร้านค้า"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white min-h-[44px] transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                PromptPay ID
              </label>
              <input
                type="tel"
                inputMode="numeric"
                value={promptpayId}
                onChange={(e) =>
                  setPromptpayId(e.target.value.replace(/\D/g, ""))
                }
                placeholder="เบอร์โทรศัพท์สำหรับรับเงิน"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white min-h-[44px] transition-all duration-200"
              />
              <p className="text-[10px] text-gray-400 mt-1 ml-1">
                ใช้สำหรับสร้าง QR Code ให้ลูกค้าสแกนจ่ายเงิน
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm min-h-[44px] active:scale-[0.98] disabled:opacity-50 transition-all duration-150 shadow-sm shadow-orange-500/20"
          >
            {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </button>
        </div>

        {/* Theme Toggle */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 text-base mb-3 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gray-500" />
            ธีม
          </h2>
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 active:scale-[0.98] transition-all duration-150"
          >
            <span className="flex items-center gap-3">
              {theme === "light" ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-amber-500">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-indigo-400">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              <span className="text-sm font-medium text-gray-700">
                {theme === "light" ? "โหมดสว่าง" : "โหมดมืด"}
              </span>
            </span>
            <div className={`w-11 h-6 rounded-full transition-colors duration-300 relative ${
              theme === "dark"
                ? "bg-gradient-to-r from-indigo-500 to-purple-600"
                : "bg-gray-300"
            }`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ease-out ${
                theme === "dark" ? "translate-x-5" : "translate-x-0"
              }`} />
            </div>
          </button>
        </div>

        {/* Tag Management */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 text-base mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-purple-500" />
            จัดการแท็กลูกค้า
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            แท็กใช้ระบุลักษณะลูกค้าขาจร เช่น ผู้หญิง, เสื้อแดง, วัยรุ่น
          </p>

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((tag) => (
                <span key={tag.id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-sm font-medium border border-purple-100">
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleDeleteTag(tag.id)}
                    className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-purple-400 hover:bg-red-100 hover:text-red-500 min-w-[20px] transition-colors"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-3 mb-3">ยังไม่มีแท็ก — เพิ่มด้านล่าง</p>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="เพิ่มแท็กใหม่ เช่น ผู้หญิง, เสื้อแดง..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white min-h-[44px] transition-all duration-200"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(); }}
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={addingTag || !newTagName.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold text-sm min-h-[44px] disabled:opacity-50 active:scale-95 transition-all duration-150 shadow-sm shadow-purple-500/20"
            >
              {addingTag ? "..." : "เพิ่ม"}
            </button>
          </div>
        </div>

        {/* Change PIN */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 text-base mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gray-700" />
            เปลี่ยนรหัส PIN
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                PIN ปัจจุบัน
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))}
                placeholder="******"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white min-h-[44px] tracking-[0.3em] transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                PIN ใหม่
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="******"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white min-h-[44px] tracking-[0.3em] transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                ยืนยัน PIN ใหม่
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d*"
                maxLength={6}
                value={confirmNewPin}
                onChange={(e) =>
                  setConfirmNewPin(e.target.value.replace(/\D/g, ""))
                }
                placeholder="******"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white min-h-[44px] tracking-[0.3em] transition-all duration-200"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleChangePin}
            disabled={changingPin || !oldPin || !newPin || !confirmNewPin}
            className="w-full mt-4 py-3 rounded-xl bg-gray-800 text-white font-bold text-sm min-h-[44px] active:bg-gray-900 active:scale-[0.98] disabled:opacity-50 transition-all duration-150 shadow-sm"
          >
            {changingPin ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัส PIN"}
          </button>
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full py-3 rounded-xl bg-red-500 text-white font-bold text-sm min-h-[48px] active:bg-red-600 active:scale-[0.98] transition-all duration-150 shadow-sm shadow-red-500/20"
        >
          ออกจากระบบ
        </button>

        <div className="text-center text-xs text-gray-400 py-4">
          ตลาดนัด POS v1.0.0
        </div>
      </div>
    </div>
  );
}
