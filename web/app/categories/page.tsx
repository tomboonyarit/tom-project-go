"use client";

import { useState, useEffect, useCallback } from "react";
import { categoryApi, type Category } from "@/lib/api";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [error, setError] = useState("");

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await categoryApi.list();
      setCategories(data);
    } catch {
      setError("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const created = await categoryApi.create(newName.trim());
      setCategories((prev) => [...prev, created]);
      setNewName("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const updated = await categoryApi.update(id, { name: editName.trim() });
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? updated : c)),
      );
      setEditingId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("แน่ใจว่าต้องการลบหมวดหมู่นี้?")) return;
    try {
      await categoryApi.delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-orange-50">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-2 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-800">หมวดหมู่</h1>
      </div>

      {/* Add form */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ชื่อหมวดหมู่ใหม่"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50 min-h-[44px] transition-all duration-200"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold text-sm min-h-[44px] disabled:opacity-50 active:scale-95 transition-all duration-150 shadow-sm shadow-orange-500/20"
          >
            เพิ่ม
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pt-1">
          <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-100">{error}</div>
        </div>
      )}

      {/* Category list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="skeleton skeleton-avatar" />
                <div className="flex-1">
                  <div className="skeleton skeleton-text w-2/3 mb-1.5" />
                  <div className="skeleton skeleton-text-sm w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 mb-3 text-gray-300">
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
            </svg>
            <p className="text-sm font-medium">ไม่มีหมวดหมู่</p>
            <p className="text-xs mt-1">เพิ่มหมวดหมู่แรกของคุณ</p>
          </div>
        ) : (
          <div className="space-y-2 stagger-fade-in">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 transition-all duration-200 hover:shadow-md"
              >
                {editingId === cat.id ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-orange-400 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400 min-h-[40px] transition-all duration-200"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(cat.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRename(cat.id)}
                      className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-xs font-bold min-h-[36px] active:scale-95 transition-all duration-150"
                    >
                      บันทึก
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium min-h-[36px] active:bg-gray-200 transition-colors"
                    >
                      ยกเลิก
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-orange-600">
                        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                      </svg>
                    </div>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        setEditingId(cat.id);
                        setEditName(cat.name);
                      }}
                    >
                      <p className="text-sm font-medium text-gray-800">
                        {cat.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {cat.product_count ?? 0} สินค้า
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-400 min-w-[36px] active:bg-red-100 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
