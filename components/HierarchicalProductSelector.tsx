'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Package, Loader2, ChevronRight, ArrowLeft } from 'lucide-react';
import { fetchProducts } from '@/utils/api';

interface Product {
  _id: string;
  Type: string;
  SubType: string;
  SubSubType: string;
  Description?: string;
}

interface HierarchicalProductSelectorProps {
  value: string; // Product _id
  onSelect: (product: any) => void;
  placeholder?: string;
  className?: string;
}

const HierarchicalProductSelector: React.FC<HierarchicalProductSelectorProps> = ({
  value,
  onSelect,
  placeholder = "Search product or service...",
  className = ""
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Selection state
  const [selectionLevel, setSelectionLevel] = useState(0); // 0: Type, 1: SubType, 2: SubSubType
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSubType, setSelectedSubType] = useState<string | null>(null);
  const [selectedSubSubType, setSelectedSubSubType] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts({ active: true, limit: 1000 });
        setProducts(data.products);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  // Sync with value from outside (for edit mode)
  useEffect(() => {
    if (value && products.length > 0) {
      const selected = products.find(p => p._id === value);
      if (selected) {
        setSelectedType(selected.Type);
        setSelectedSubType(selected.SubType || null);
        setSelectedSubSubType(selected.SubSubType || null);
      }
    }
  }, [value, products]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = useMemo(() => {
    if (loading) return [];

    let items: string[] = [];
    if (selectionLevel === 0) {
      items = Array.from(new Set(products.map(p => p.Type))).filter(Boolean).sort();
    } else if (selectionLevel === 1) {
      items = Array.from(new Set(products.filter(p => p.Type === selectedType && p.SubType).map(p => p.SubType))).filter(Boolean).sort();
    } else {
      items = Array.from(new Set(products.filter(p => p.Type === selectedType && p.SubType === selectedSubType && p.SubSubType).map(p => p.SubSubType))).filter(Boolean).sort();
    }

    if (searchTerm) {
      return items.filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return items;
  }, [products, selectionLevel, selectedType, selectedSubType, searchTerm, loading]);

  const handleSelectOption = (option: string) => {
    if (selectionLevel === 0) {
      setSelectedType(option);
      setSearchTerm('');
      const hasSubTypes = products.some(p => p.Type === option && p.SubType);
      if (hasSubTypes) {
        setSelectionLevel(1);
      } else {
        const p = products.find(p => p.Type === option);
        if (p) {
          onSelect(p);
          setIsOpen(false);
        }
      }
    } else if (selectionLevel === 1) {
      setSelectedSubType(option);
      setSearchTerm('');
      const hasSubSubTypes = products.some(p => p.Type === selectedType && p.SubType === option && p.SubSubType);
      if (hasSubSubTypes) {
        setSelectionLevel(2);
      } else {
        const p = products.find(p => p.Type === selectedType && p.SubType === option);
        if (p) {
          onSelect(p);
          setIsOpen(false);
        }
      }
    } else {
      const p = products.find(p => p.Type === selectedType && p.SubType === selectedSubType && p.SubSubType === option);
      if (p) {
        setSelectedSubSubType(option);
        onSelect(p);
        setIsOpen(false);
      }
    }
  };

  const getDisplayValue = () => {
    if (isOpen) return searchTerm;
    if (!selectedType) return "";
    return [selectedType, selectedSubType, selectedSubSubType].filter(Boolean).join(' > ');
  };

  const reset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectionLevel(0);
    setSelectedType(null);
    setSelectedSubType(null);
    setSelectedSubSubType(null);
    setSearchTerm('');
    onSelect({ _id: '', Type: '', SubType: '', SubSubType: '' });
  };

  const handleBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionLevel === 1) {
      setSelectedType(null);
      setSelectionLevel(0);
    } else if (selectionLevel === 2) {
      setSelectedSubType(null);
      setSelectionLevel(1);
    }
    setSearchTerm('');
  };

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
          value={getDisplayValue()}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedType ? "" : placeholder}
          autoComplete="off"
          required
        />
      </div>

      {isOpen && (
        <div
          className="absolute z-[1000] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
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
          {loading ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
              <Loader2 className="animate-spin inline-block mr-2" size={16} /> Loading catalog...
            </div>
          ) : (
            <>
              {/* Context Header */}
              {(selectedType || selectionLevel > 0) && (
                <div style={{
                  padding: '0.6rem 1rem',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                      {selectionLevel === 1 ? 'Select Sub-Category' : selectionLevel === 2 ? 'Select Final Service' : 'Select Category'}
                    </span>
                  </div>
                  {selectionLevel > 0 && (
                    <button
                      type="button"
                      onClick={handleBack}
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: '#f1f5f9',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        border: 'none'
                      }}
                    >
                      <ArrowLeft size={10} /> BACK
                    </button>
                  )}
                </div>
              )}

              {/* Breadcrumb row if deep */}
              {selectionLevel > 0 && (
                <div style={{ padding: '0.4rem 1rem', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>
                    {selectedType} {selectedSubType && ` > ${selectedSubType}`}
                  </span>
                </div>
              )}

              {options.length > 0 ? options.map((option) => (
                <div
                  key={option}
                  className="hover:bg-slate-50 cursor-pointer border-b last:border-0 border-slate-50 transition-colors"
                  style={{
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem'
                  }}
                  onClick={() => handleSelectOption(option)}
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
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                      {option}
                    </span>
                    {/*<span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                       {selectionLevel === 0 ? 'Category' : selectionLevel === 1 ? 'Sub-Category' : 'Service'}
                    </span>*/}
                  </div>
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              )) : (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
                  No matches for "{searchTerm}"
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default HierarchicalProductSelector;
