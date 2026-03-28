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
      const filtered = products.filter(p => {
        const type = p.Type?.toLowerCase() || '';
        const subType = p.SubType?.toLowerCase() || '';
        const subSub = p.SubSubType?.toLowerCase() || '';
        const search = value.toLowerCase();
        return type.includes(search) || subType.includes(search) || subSub.includes(search);
      });

      // Check if the current value matches a full hierarchical path exactly
      const hasExactMatch = filtered.some(p => 
        `${p.Type} > ${p.SubType} > ${p.SubSubType}` === value
      );

      setFilteredProducts(filtered.slice(0, 15));
      setIsOpen(filtered.length > 0 && !hasExactMatch);
    } else {
      setIsOpen(false);
    }
  }, [value, products]);

  // Handle focus to show some suggestions if value is empty
  const handleFocus = () => {
    if (!value) {
      setFilteredProducts(products.slice(0, 15));
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

  const getDisplayPath = (p: any) => `${p.Type} > ${p.SubType} > ${p.SubSubType}`;

  return (
    <div ref={wrapperRef} className={`relative ${className}`} style={{ position: 'relative' }}>
      <div className="relative">
        <input
          type="text"
          className="form-input"
          style={{
            padding: '0.45rem 0.75rem',
            fontSize: '0.85rem',
            width: '100%',
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            borderRadius: '0.5rem'
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          autoComplete="off"
          required
        />
      </div>

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
          style={{
            position: 'absolute',
            zIndex: 1000,
            width: '100%',
            marginTop: '0.25rem',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            maxHeight: '320px',
            overflowY: 'auto'
          }}
        >
          {filteredProducts.map((product) => (
            <div
              key={product._id}
              className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b last:border-0 border-slate-100 transition-colors"
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem'
              }}
              onClick={() => {
                onSelect(product);
                setIsOpen(false);
              }}
            >
              <div style={{
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                padding: '0.5rem',
                borderRadius: '8px',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Package size={16} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{product.Type}</span>
                  {product.SubType && (
                    <>
                      <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>/</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{product.SubType}</span>
                    </>
                  )}
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                  {product.SubSubType || product.SubType || product.Type}
                </span>
                {product.Description && (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {product.Description}
                  </span>
                )}
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
              No master records found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductAutocomplete;
