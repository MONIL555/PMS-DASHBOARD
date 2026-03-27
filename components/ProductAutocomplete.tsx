'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Package, Loader2 } from 'lucide-react';
import { fetchProducts } from '@/utils/api';

interface ProductAutocompleteProps {
  value: string; // This holds the display name
  onSelect: (product: any) => void;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({
  value,
  onSelect,
  onChange,
  placeholder = "Search product or service...",
  className = ""
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts({ active: true, limit: 1000 });
        setProducts(data.products);
      } catch (err) {
        console.error("Failed to fetch products for autocomplete:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    if (value && value.length > 0) {
      const filtered = products.filter(p =>
        p.Product_Name?.toLowerCase().includes(value.toLowerCase())
      );

      // Check if the current value is an exact match for one of the filtered results
      const hasExactMatch = filtered.some(p => p.Product_Name === value);

      setFilteredProducts(filtered.slice(0, 10)); // Allow more than 5 results if needed, but 10 is safe
      setIsOpen(filtered.length > 0 && !hasExactMatch);
    } else {
      // If empty, show some suggestions? Or just close. Usually better to show all if focused and empty, or just close.
      // Based on ClientAutocomplete, it closes if length <= 1.
      setIsOpen(false);
    }
  }, [value, products]);

  // Handle focus to show all products if value is empty
  const handleFocus = () => {
    if (!value) {
      setFilteredProducts(products.slice(0, 10));
      setIsOpen(products.length > 0);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`} style={{ position: 'relative' }}>
      <div className="relative">
        <input
          type="text"
          className="form-input"
          style={{
            padding: '0.4rem 0.75rem',
            fontSize: '0.85rem',
            width: '100%',
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)'
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          autoComplete="off"
          required
        />
        {/*<div 
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </div>*/}
      </div>

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
          style={{
            position: 'absolute',
            zIndex: 1000,
            width: '100%',
            marginTop: '0.25rem',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            maxHeight: '250px',
            overflowY: 'auto'
          }}
        >
          {filteredProducts.map((product) => (
            <div
              key={product._id}
              className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b last:border-0 border-slate-100 transition-colors"
              style={{
                padding: '0.6rem 1rem',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
              onClick={() => {
                onSelect(product);
                setIsOpen(false);
              }}
            >
              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                padding: '0.4rem',
                borderRadius: '6px',
                color: '#3b82f6'
              }}>
                <Package size={14} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{product.Product_Name}</span>
                {product.Description && (
                  <span style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>
                    {product.Description}
                  </span>
                )}
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
              No products found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductAutocomplete;
