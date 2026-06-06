"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useFontSize, FONT_SIZES } from "@/lib/font-size";
import { profileApi, tagApi, categoryApi, type CustomerTag, type Category } from "@/lib/api";

export default function SettingsPage() {
  const { vendor, logout, refreshVendor } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { fontSize, setFontSize } = useFontSize();
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  useEffect(() => {
    if (vendor) {
      setName(vendor.name || "");
      setBoothName(vendor.booth_name || "");
      setPromptpayId(vendor.promptpay_id || "");
    }
  }, [vendor]);

  useEffect(() => {
    tagApi.list().then((data) => setTags(data.tags)).catch(() => setMessage("❌ โหลดแท็กไม่สำเร็จ"));
  }, []);

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => setMessage("❌ โหลดหมวดหมู่ไม่สำเร็จ"));
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

  const handleMoveTag = async (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= tags.length) return;
    const reordered = [...tags];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setTags(reordered);
    try {
      await Promise.all([
        tagApi.update(reordered[index].id, reordered[index].name, index),
        tagApi.update(reordered[target].id, reordered[target].name, target),
      ]);
    } catch {
      tagApi.list().then((data) => setTags(data.tags)).catch(() => {});
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCat(true);
    try {
      const cat = await categoryApi.create(newCatName.trim());
      setCategories((prev) => [...prev, cat]);
      setNewCatName("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setMessage(`❌ ${msg}`);
    } finally { setAddingCat(false); }
  };

  const handleRenameCategory = async (id: string) => {
    if (!editingCatName.trim()) return;
    try {
      const updated = await categoryApi.update(id, { name: editingCatName.trim() });
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingCatId(null);
      setEditingCatName("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setMessage(`❌ ${msg}`);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`ลบหมวดหมู่ "${name}"?\nสินค้าในหมวดนี้จะถูกย้ายออก`)) return;
    try {
      await categoryApi.delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setMessage(`❌ ${msg}`);
    }
  };

  const handleMoveCategory = async (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setCategories(reordered);
    try {
      await Promise.all([
        categoryApi.update(reordered[index].id, { sort_order: index }),
        categoryApi.update(reordered[target].id, { sort_order: target }),
      ]);
    } catch {
      categoryApi.list().then(setCategories).catch(() => {});
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
    <div className="flex flex-col h-full overflow-hidden bg-orange-50">
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

        {/* Font Size */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 text-base mb-3 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-cyan-500" />
            ขนาดตัวอักษร
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            ปรับขนาดตัวอักษรให้เหมาะกับการมองเห็น
          </p>
          <div className="grid grid-cols-4 gap-2">
            {FONT_SIZES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFontSize(f.value)}
                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-xl border text-sm font-medium min-h-[56px] active:scale-95 transition-all duration-150 ${
                  fontSize === f.value
                    ? "bg-cyan-50 border-cyan-400 text-cyan-700 shadow-sm shadow-cyan-500/10"
                    : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <span className={f.value === 85 ? "text-xs" : f.value === 100 ? "text-base" : f.value === 115 ? "text-lg" : "text-xl"}>
                  {f.emoji}
                </span>
                <span className="text-[10px]">{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category Management */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-700 text-base mb-4 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-orange-500" />
            จัดการหมวดหมู่สินค้า
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            หมวดหมู่ใช้จัดกลุ่มสินค้า เช่น อาหาร, เครื่องดื่ม, ขนม
          </p>

          {categories.length > 0 ? (
            <div className="flex flex-col gap-2 mb-4">
              {categories.map((cat, i) => (
                <div key={cat.id}>
                  {editingCatId === cat.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-orange-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white min-h-[36px]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameCategory(cat.id);
                          if (e.key === "Escape") { setEditingCatId(null); setEditingCatName(""); }
                        }}
                        onBlur={() => { if (editingCatName.trim()) handleRenameCategory(cat.id); else { setEditingCatId(null); setEditingCatName(""); } }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRenameCategory(cat.id)}
                        className="px-3 py-2 rounded-lg bg-orange-500 text-white text-xs font-medium active:scale-95 transition-all"
                      >
                        บันทึก
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-300 w-4 text-right font-mono">{i + 1}</span>
                      <span className="flex-1 inline-flex items-center px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 text-sm font-medium border border-orange-100">
                        {cat.name}
                        {cat.product_count != null && (
                          <span className="ml-2 text-[10px] text-orange-400">({cat.product_count})</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }}
                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-orange-100 hover:text-orange-600 transition-colors"
                        title="เปลี่ยนชื่อ"
                      >
                        &#9998;
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(i, "up")}
                        disabled={i === 0}
                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-orange-100 hover:text-orange-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                        title="เลื่อนขึ้น"
                      >
                        &#9650;
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCategory(i, "down")}
                        disabled={i === categories.length - 1}
                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-orange-100 hover:text-orange-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                        title="เลื่อนลง"
                      >
                        &#9660;
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                        title="ลบ"
                      >
                        &#10005;
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-3 mb-3">ยังไม่มีหมวดหมู่ — เพิ่มด้านล่าง</p>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="เพิ่มหมวดหมู่ใหม่ เช่น อาหาร, เครื่องดื่ม..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white min-h-[44px] transition-all duration-200"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
            />
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={addingCat || !newCatName.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm min-h-[44px] disabled:opacity-50 active:scale-95 transition-all duration-150 shadow-sm shadow-orange-500/20"
            >
              {addingCat ? "..." : "เพิ่ม"}
            </button>
          </div>
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
            <div className="flex flex-col gap-2 mb-4">
              {tags.map((tag, i) => (
                <div key={tag.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-300 w-4 text-right font-mono">{i + 1}</span>
                  <span className="flex-1 inline-flex items-center px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 text-sm font-medium border border-purple-100">
                    {tag.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleMoveTag(i, "up")}
                    disabled={i === 0}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-purple-100 hover:text-purple-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                    title="เลื่อนขึ้น"
                  >
                    &#9650;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveTag(i, "down")}
                    disabled={i === tags.length - 1}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-purple-100 hover:text-purple-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                    title="เลื่อนลง"
                  >
                    &#9660;
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTag(tag.id)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                    title="ลบ"
                  >
                    &#10005;
                  </button>
                </div>
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
          MaekaOS v1.0
        </div>
      </div>
    </div>
  );
}
