"use client";

import { useState, useEffect, useCallback } from "react";
import {
  productApi,
  categoryApi,
  type Product,
  type Category,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/api";
import { formatBaht } from "@/lib/utils";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        productApi.list(search || undefined, categoryFilter || undefined),
        categoryApi.list(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleToggleActive = async (product: Product) => {
    try {
      await productApi.update(product.id, {
        is_active: !product.is_active,
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, is_active: !p.is_active } : p,
        ),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("แน่ใจว่าต้องการลบสินค้านี้?")) return;
    try {
      await productApi.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    }
  };

  const handleSave = async (data: CreateProductInput | UpdateProductInput) => {
    try {
      if (editingProduct) {
        const updated = await productApi.update(editingProduct.id, data);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? updated : p)),
        );
      } else {
        const created = await productApi.create(data as CreateProductInput);
        setProducts((prev) => [...prev, created]);
      }
      setShowModal(false);
      setEditingProduct(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-orange-50">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-2 border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">สินค้า</h1>
        <button
          type="button"
          onClick={() => {
            setEditingProduct(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-bold text-sm min-h-[44px] active:scale-95 transition-all duration-150 shadow-md shadow-orange-500/20"
        >
          + เพิ่มสินค้า
        </button>
      </div>

      {/* Search + Category filter */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 space-y-2.5">
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาสินค้า..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50 min-h-[44px] transition-all duration-200"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setCategoryFilter("")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap min-h-[32px] transition-all duration-200 ${
              categoryFilter === ""
                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            ทั้งหมด
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap min-h-[32px] transition-all duration-200 ${
                categoryFilter === cat.id
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="skeleton skeleton-avatar flex-shrink-0" />
                <div className="flex-1">
                  <div className="skeleton skeleton-text w-3/4 mb-1.5" />
                  <div className="skeleton skeleton-text-sm w-1/3 mb-1.5" />
                  <div className="skeleton skeleton-text w-1/4" />
                </div>
                <div className="skeleton w-10 h-6 rounded-full" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 mb-3 text-gray-300">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <p className="text-sm font-medium">ไม่มีสินค้า</p>
            <p className="text-xs mt-1">เพิ่มสินค้าใหม่ด้วยปุ่มด้านบน</p>
          </div>
        ) : (
          <div className="space-y-3 stagger-fade-in">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 transition-all duration-200 hover:shadow-md"
              >
                <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-gray-300">
                        <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
                        <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {product.category_name || "ไม่มีหมวดหมู่"}
                  </p>
                  <p className="text-sm font-bold text-orange-600 mt-0.5 tabular-nums">
                    {formatBaht(product.price)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(product)}
                    className={`w-11 h-6 rounded-full transition-colors duration-300 relative ${
                      product.is_active !== false
                        ? "bg-gradient-to-r from-orange-500 to-orange-600"
                        : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ease-out ${
                        product.is_active !== false ? "translate-x-5" : "translate-x-0"
                      } ${product.is_active !== false ? "shadow-orange-500/30" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProduct(product);
                      setShowModal(true);
                    }}
                    className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 min-w-[36px] active:bg-gray-200 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id)}
                    className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-400 min-w-[36px] active:bg-red-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showModal && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          setCategories={setCategories}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}

// ── Product Form Modal ───────────────────────────────────

function ProductFormModal({
  product,
  categories,
  setCategories,
  onSave,
  onClose,
}: {
  product: Product | null;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  onSave: (data: CreateProductInput | UpdateProductInput) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(product?.name || "");
  const [price, setPrice] = useState(
    product ? (product.price / 100).toString() : "",
  );
  const [categoryId, setCategoryId] = useState(product?.category_id || "");
  const [unit, setUnit] = useState(product?.unit || "");
  const [imageUrl, setImageUrl] = useState(product?.image_url || "");
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        price: Math.round(parseFloat(price) * 100),
        unit: unit.trim() || undefined,
        category_id: categoryId || undefined,
        image_url: imageUrl.trim() || undefined,
      };
      await onSave(data);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setAddingCategory(true);
    try {
      const cat = await categoryApi.create(newCategory.trim());
      setCategories((prev) => [...prev, cat]);
      setCategoryId(cat.id);
      setNewCategory("");
      setShowNewCategory(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      alert(msg);
    } finally {
      setAddingCategory(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl animate-scale-in max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-800 mb-5">
          {product ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              ชื่อสินค้า
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อสินค้า"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50 min-h-[48px] transition-all duration-200"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              ราคา (บาท)
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="50"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50 min-h-[48px] transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              หมวดหมู่
            </label>
            <div className="flex gap-2">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50 min-h-[48px] appearance-none"
              >
                <option value="">ไม่มีหมวดหมู่</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCategory(!showNewCategory)}
                className="px-4 py-3 rounded-xl bg-orange-100 text-orange-600 font-bold text-sm min-h-[48px] active:bg-orange-200 transition-colors whitespace-nowrap"
              >
                + เพิ่ม
              </button>
            </div>
            {showNewCategory && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="ชื่อหมวดหมู่ใหม่"
                  className="flex-1 px-4 py-3 rounded-xl border border-orange-300 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white min-h-[44px] transition-all duration-200"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={addingCategory || !newCategory.trim()}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm min-h-[44px] disabled:opacity-50 active:scale-95 transition-all duration-150"
                >
                  {addingCategory ? "..." : "เพิ่ม"}
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              หน่วย (ไม่บังคับ)
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="ขีด, ชิ้น, ถุง"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50 min-h-[48px] transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">
              ลิงก์รูปภาพ (ไม่บังคับ)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-gray-50 min-h-[48px] transition-all duration-200"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium min-h-[44px] active:bg-gray-200 transition-all duration-150 active:scale-95"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim() || !price}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold min-h-[44px] disabled:opacity-50 transition-all duration-150 active:scale-95 shadow-sm shadow-orange-500/20"
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
