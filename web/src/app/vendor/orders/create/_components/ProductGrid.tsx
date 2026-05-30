'use client';

import { useState } from 'react';
import QuantityPopup from './QuantityPopup';

interface Product {
  id: string;
  booth_id: string;
  name: string;
  price: number;
  sale_price?: number;
  unit: string;
  is_available: boolean;
  category_id?: string;
}

interface ProductGridProps {
  products: Product[];
  selectedBoothId: string;
  searchQuery: string;
  loading: boolean;
  categories?: { id: string; name: string }[];
  selectedCategoryId?: string | null;
  onSearchChange: (query: string) => void;
  onCategoryChange?: (categoryId: string | null) => void;
  onAddToCart: (product: Product, quantity?: number) => void;
}

export default function ProductGrid({
  products,
  selectedBoothId,
  searchQuery,
  loading,
  categories = [],
  selectedCategoryId = null,
  onSearchChange,
  onCategoryChange,
  onAddToCart,
}: ProductGridProps) {
  const [qtyPopupProduct, setQtyPopupProduct] = useState<Product | null>(null);

  const filteredProducts = selectedCategoryId
    ? products.filter((p) => p.category_id === selectedCategoryId)
    : products;

  const handleAddOne = (product: Product) => {
    onAddToCart(product, 1);
  };

  const handleQtySelect = (qty: number) => {
    if (qtyPopupProduct) {
      onAddToCart(qtyPopupProduct, qty);
      setQtyPopupProduct(null);
    }
  };

  const displayPrice = (product: Product) => {
    if (product.sale_price && product.sale_price < product.price) {
      return (
        <span>
          <span className="text-text-muted line-through text-[10px] mr-1">
            ฿{product.price}
          </span>
          <span className="text-coral-light">฿{product.sale_price}</span>
        </span>
      );
    }
    return <span>฿{product.price}</span>;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหาสินค้า..."
            className="input-base !pl-9 !py-2 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-warm-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="px-3 pb-2 overflow-x-auto scrollbar-none">
          <div className="flex gap-1.5 min-w-max">
            <button
              onClick={() => onCategoryChange?.(null)}
              className={`rounded-full px-3 py-1 text-xs border transition-colors whitespace-nowrap ${
                selectedCategoryId === null
                  ? 'bg-amber/20 border-amber/40 text-amber-light'
                  : 'bg-white/5 border-white/10 text-text-muted hover:text-warm-white'
              }`}
            >
              ทั้งหมด
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange?.(cat.id)}
                className={`rounded-full px-3 py-1 text-xs border transition-colors whitespace-nowrap ${
                  selectedCategoryId === cat.id
                    ? 'bg-amber/20 border-amber/40 text-amber-light'
                    : 'bg-white/5 border-white/10 text-text-muted hover:text-warm-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="glass rounded-xl p-3 h-24 animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-3xl mb-2">📦</span>
            <p className="text-text-muted text-sm mb-1">
              {searchQuery ? 'ไม่พบสินค้าที่ค้นหา' : (selectedCategoryId ? 'ไม่มีสินค้าในหมวดนี้' : 'ยังไม่มีสินค้าในร้าน')}
            </p>
            <p className="text-text-muted text-xs">
              {!searchQuery && !selectedCategoryId && 'ไปที่หน้าจัดการบูธเพื่อเพิ่มสินค้า'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleAddOne(product)}
                className="glass rounded-xl p-3 text-left hover:border-amber/30 transition-all active:scale-[0.97] group relative"
              >
                {/* Quick-qty button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setQtyPopupProduct(product);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-text-muted hover:text-warm-white text-xs transition-colors opacity-0 group-hover:opacity-100"
                >
                  ...
                </button>

                <p className="font-heading font-medium text-warm-white text-sm leading-tight mb-1 pr-4 line-clamp-2">
                  {product.name}
                </p>
                <p className="text-xs font-semibold text-amber-light">
                  {displayPrice(product)}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  ต่อ{product.unit}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quantity popup */}
      <QuantityPopup
        isOpen={!!qtyPopupProduct}
        productName={qtyPopupProduct?.name || ''}
        onSelect={handleQtySelect}
        onClose={() => setQtyPopupProduct(null)}
      />
    </div>
  );
}
