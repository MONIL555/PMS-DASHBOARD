'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, Package, X, Calendar, Clock, Info, Monitor, Wrench, Cpu, ChevronRight, Layers, ChevronDown } from 'lucide-react';
import { useMemo } from 'react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@/utils/dateUtils';

import { PRODUCT_HIERARCHY } from '@/lib/constants/productCategories';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '@/utils/api';

export default function ProductsMaster() {
  const [products, setProducts] = useState<any[]>([]);
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [selectedDelete, setSelectedDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [expandedTypes, setExpandedTypes] = useState<string[]>([]);

  const groupedProducts = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    products.forEach(p => {
      if (!groups[p.Type]) groups[p.Type] = [];
      groups[p.Type].push(p);
    });
    return groups;
  }, [products]);

  const [formData, setFormData] = useState({
    Type: '',
    SubType: '',
    SubSubType: '',
    Description: '',
    IsActive: true
  });

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetchProducts({
        limit: 0,
        search: debouncedSearch
      });
      setProducts(response.products);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadProducts();
  }, [debouncedSearch]);

  useEffect(() => {
    if (debouncedSearch) {
      setExpandedTypes(Object.keys(groupedProducts));
    }
  }, [debouncedSearch, groupedProducts]);

  const toggleType = (type: string) => {
    setExpandedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleOpenModal = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        Type: product.Type || '',
        SubType: product.SubType || '',
        SubSubType: product.SubSubType || '',
        Description: product.Description || '',
        IsActive: product.IsActive !== undefined ? product.IsActive : true
      });
    } else {
      setEditingProduct(null);
      setFormData({
        Type: '',
        SubType: '',
        SubSubType: '',
        Description: '',
        IsActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.Type) {
      return toast.error("Please select a classification type.");
    }

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct._id, formData);
        toast.success('Product updated!');
      } else {
        await createProduct(formData);
        toast.success('Product added!');
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDelete) return;

    setIsDeleting(true);
    try {
      await deleteProduct(selectedDelete._id);
      toast.success('Product deleted successfully');
      setSelectedDelete(null);
      loadProducts();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'Software Solution': return <Monitor size={16} className="text-blue-500" />;
      case 'Services': return <Wrench size={16} className="text-emerald-500" />;
      case 'Hardware': return <Cpu size={16} className="text-orange-500" />;
      default: return <Package size={16} className="text-slate-400" />;
    }
  };

  const getCategoryColor = (type: string) => {
    switch (type) {
      case 'Software Solution': return 'bg-blue-50 border-blue-100 text-blue-700';
      case 'Services': return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      case 'Hardware': return 'bg-orange-50 border-orange-100 text-orange-700';
      default: return 'bg-slate-50 border-slate-100 text-slate-700';
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div>
      <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading master entry details...</p>
    </div>
  );

  return (
    <div className="page-container">
      <style>{`
        .type-card {
          margin-bottom: 1.5rem;
          border-radius: 1rem;
          background: white;
          border: 1px solid var(--border-color);
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }
        .type-header {
          padding: 0.75rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #f8fafc;
          cursor: pointer;
          transition: background 0.2s;
        }
        .type-header:hover {
          background: #f8fafc;
        }
        .chevron-icon {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #94a3b8;
        }
        .chevron-icon.rotated {
          transform: rotate(180deg);
        }
        .type-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .type-icon-box {
          padding: 0.6rem;
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #f1f5f9;
        }
        .type-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #1e293b;
          text-transform: uppercase;
          letter-spacing: -0.025em;
          margin: 0;
        }
        .type-meta {
          font-size: 0.65rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 1px;
        }
        .subtype-container {
          padding: 0.5rem 1.25rem 1.5rem 1.25rem;
        }
        .subtype-group {
          margin-top: 1rem;
        }
        .subtype-label {
          font-size: 0.75rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .subtype-line {
          height: 2px;
          width: 1.5rem;
          background: #3b82f6;
          border-radius: 99px;
        }
        .product-grid {
          display: grid;
          gap: 0.4rem;
        }
        .product-row {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.65rem 1rem 0.65rem 3rem;
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 0.75rem;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        .product-row:hover {
          background: #f8fafc;
          border-color: #3b82f6;
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);
        }
        .form-input {
          padding: 0.45rem 0.75rem;
          font-size: 0.85rem;
          height: auto;
          border-radius: 0.5rem;
        }
        .form-label {
          font-size: 0.75rem;
          margin-bottom: 0.25rem;
        }
        .form-group {
          margin-bottom: 0.65rem;
        }
        .tree-connector {
          position: absolute;
          left: 1.25rem;
          top: 0;
          bottom: 50%;
          width: 1rem;
          border-left: 2px solid #e2e8f0;
          border-bottom: 2px solid #e2e8f0;
          border-bottom-left-radius: 0.5rem;
          pointer-events: none;
        }
        .row-id {
          min-width: 65px;
        }
        .id-label {
          font-size: 0.6rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
        }
        .id-value {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.75rem;
          font-weight: 700;
          color: #3b82f6;
          display: block;
        }
        .row-content {
          flex: 1;
        }
        .row-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1e293b;
          display: block;
        }
        .row-desc {
          font-size: 0.75rem;
          color: #64748b;
          font-style: italic;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 320px;
        }
        .row-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .action-btns {
          display: flex;
          gap: 0.4rem;
          opacity: 0;
          transform: translateX(8px);
          transition: all 0.2s ease;
        }
        .product-row:hover .action-btns {
          opacity: 1;
          transform: translateX(0);
        }
        .modal-step-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.2rem 0.5rem;
          background: #f1f5f9;
          border-radius: 0.4rem;
          font-size: 0.6rem;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.35rem;
        }
        .blueprint-box {
          padding: 0.75rem;
          background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%);
          border-radius: 0.75rem;
          border: 1px solid #dbeafe;
          margin-bottom: 1rem;
        }
        .blueprint-label {
          font-size: 0.6rem;
          font-weight: 800;
          color: #3b82f6;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .path-pill {
          padding: 0.25rem 0.6rem;
          background: white;
          border-radius: 0.5rem;
          font-size: 0.7rem;
          font-weight: 700;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          border: 1px solid #f1f5f9;
        }
        .path-pill.active {
          background: #3b82f6;
          color: white;
          border-color: #2563eb;
        }
        .production-toggle {
          padding: 1rem;
          background: #0f172a;
          border-radius: 1rem;
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
      `}</style>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Package className="text-blue-500" />
            Product Classification Master
          </h1>
          <p className="page-description" style={{ margin: '0.25rem 0 0 0' }}>Manage hierarchical product categories and their active status.</p>
        </div>
        {hasPermission(PERMISSIONS.PRODUCTS_CREATE) && (
          <button
            onClick={() => handleOpenModal()}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Add Product/Service
          </button>
        )}
      </div>

      <div className="page-controls">
        <div className="search-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search by ID, Name or Description..."
            className="premium-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-12 mt-10 pb-16">
        {Object.entries(groupedProducts).length > 0 ? (
          Object.entries(groupedProducts).map(([type, items]: [string, any[]]) => {
            const subTypeGroups: { [key: string]: any[] } = {};
            items.forEach(p => {
              const groupKey = p.SubType || 'Direct Category';
              if (!subTypeGroups[groupKey]) subTypeGroups[groupKey] = [];
              subTypeGroups[groupKey].push(p);
            });

            return (
              <div key={type} className="type-card">
                <div className="type-header" onClick={() => toggleType(type)}>
                  <div className="type-info">
                    <div className="type-icon-box">
                      {getCategoryIcon(type)}
                    </div>
                    <div>
                      <h2 className="type-title">{type}</h2>
                      <div className="type-meta">{items.length} TOTAL ENTRIES</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="badge badge-gray" style={{ background: '#f8fafc', fontSize: '0.6rem', border: '1px solid #e2e8f0' }}>
                      {expandedTypes.includes(type) ? 'HIDE' : 'SHOW'}
                    </div>
                    <ChevronDown 
                      className={`chevron-icon ${expandedTypes.includes(type) ? 'rotated' : ''}`} 
                      size={18} 
                    />
                  </div>
                </div>

                {expandedTypes.includes(type) && (
                  <div className="subtype-container">
                    {Object.entries(subTypeGroups).map(([subType, subItems]) => (
                      <div key={subType} className="subtype-group">
                        <div className="subtype-label">
                          <div className="subtype-line"></div>
                          {subType === 'Direct Category' ? 'Direct Entries' : subType}
                        </div>

                        <div className="product-grid">
                          {subItems.map((product) => (
                            <div
                              key={product._id}
                              className="product-row"
                              onClick={() => setSelectedDetail(product)}
                            >
                              <div className="tree-connector"></div>

                              <div className="row-id">
                                <span className="id-label">REF ID</span>
                                <span className="id-value">{product.Product_ID}</span>
                              </div>

                              <div className="row-content">
                                <span className="row-title">{product.SubSubType || product.SubType || product.Type}</span>
                                <div className="row-desc" title={product.Description}>
                                  {product.Description || "No additional technical documentation provided."}
                                </div>
                              </div>

                              <div className="row-actions">
                                <span className={`badge ${product.IsActive ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.65rem' }}>
                                  {product.IsActive ? 'Active' : 'Inactive'}
                                </span>

                                {/*<div className="action-btns">
                                  {hasPermission(PERMISSIONS.PRODUCTS_EDIT) && (
                                    <button
                                      className="btn btn-secondary"
                                      style={{ padding: '0.4rem', minWidth: 'auto' }}
                                      onClick={(e) => { e.stopPropagation(); handleOpenModal(product); }}
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                  )}
                                  {hasPermission(PERMISSIONS.PRODUCTS_DELETE) && (
                                    <button
                                      className="btn btn-secondary"
                                      style={{ padding: '0.4rem', minWidth: 'auto', color: 'var(--danger-color)' }}
                                      onClick={(e) => { e.stopPropagation(); setSelectedDelete(product); }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>*/}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="premium-card" style={{ padding: '5rem', textAlign: 'center' }}>
            <Search size={48} style={{ color: '#e2e8f0', marginBottom: '1.5rem' }} />
            <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No master records found matching your search parameters.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                  {editingProduct ? 'Update Product Classification' : 'New Master Entry Configuration'}
                </h2>
                <p className="text-secondary" style={{ fontSize: '0.8rem' }}>Set the three-tier hierarchy for this product master.</p>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} id="elite-product-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Classification Type</label>
                  <input
                    required
                    list="datalist-type"
                    className="form-input"
                    value={formData.Type}
                    onChange={(e) => setFormData({ ...formData, Type: e.target.value })}
                    placeholder="e.g. Services"
                  />
                  <datalist id="datalist-type">
                    {Object.keys(PRODUCT_HIERARCHY).map(type => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label">Functional Domain</label>
                  <input
                    list="datalist-subtype"
                    className="form-input"
                    value={formData.SubType}
                    onChange={(e) => setFormData({ ...formData, SubType: e.target.value })}
                    placeholder="e.g. Development"
                  />
                  <datalist id="datalist-subtype">
                    {formData.Type && PRODUCT_HIERARCHY[formData.Type] && Object.keys(PRODUCT_HIERARCHY[formData.Type]).map(sub => (
                      <option key={sub} value={sub} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label">Implementation / Solution</label>
                  <input
                    list="datalist-subsubtype"
                    className="form-input"
                    style={{ fontWeight: 700, color: 'var(--primary-color)' }}
                    value={formData.SubSubType}
                    onChange={(e) => setFormData({ ...formData, SubSubType: e.target.value })}
                    placeholder="e.g. Web Dev"
                  />
                  <datalist id="datalist-subsubtype">
                    {formData.Type && formData.SubType && PRODUCT_HIERARCHY[formData.Type]?.[formData.SubType] && 
                      (PRODUCT_HIERARCHY[formData.Type][formData.SubType] || []).map(subSub => (
                        <option key={subSub} value={subSub} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Classification Documentation</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '100%' }}
                  value={formData.Description}
                  onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                  placeholder="Optional technical notes or architectural details..."
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', padding: '0.25rem 0' }}>
                <input
                  type="checkbox"
                  id="status-active"
                  checked={formData.IsActive}
                  onChange={(e) => setFormData({ ...formData, IsActive: e.target.checked })}
                  style={{ width: '1.15rem', height: '1.15rem', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
                />
                <label htmlFor="status-active" style={{ fontSize: '0.825rem', fontWeight: 600, color: '#1e293b', cursor: 'pointer' }}>
                  Set as Production Active
                </label>
              </div>

              <div className="modal-footer" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.5rem', fontWeight: 700 }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : editingProduct ? 'Save Changes' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDetail && (
        <div className="modal-overlay" onClick={() => setSelectedDetail(null)}>
          <div className="modal-content" style={{ maxWidth: '650px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{selectedDetail.SubSubType}</h2>
                <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0 }}>{selectedDetail.Type} &rarr; {selectedDetail.SubType}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedDetail(null)}><X size={24} /></button>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>General Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} className="text-secondary" /> <strong>Created On:</strong> {formatDateDDMMYYYY(selectedDetail.createdAt)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} className="text-secondary" /> <strong>Last Updated:</strong> {formatDateTimeDDMMYYYY(selectedDetail.updatedAt)}</div>
                  <div>
                    <strong>Status:</strong>{' '}
                    <span className={`badge ${selectedDetail.IsActive ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.7rem' }}>
                      {selectedDetail.IsActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Info size={16} /> Description</h3>
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.875rem', minHeight: '100px', whiteSpace: 'pre-wrap', border: '1px solid #e2e8f0', color: '#334155' }}>
                  {selectedDetail.Description || <span className="text-secondary italic">No description provided.</span>}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              {hasPermission(PERMISSIONS.PRODUCTS_DELETE) && (
                <button
                  className="btn btn-secondary"
                  style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'transparent' }}
                  onClick={() => {
                    setSelectedDelete(selectedDetail);
                    setSelectedDetail(null);
                  }}
                >
                  Delete Product
                </button>
              )}
              {hasPermission(PERMISSIONS.PRODUCTS_EDIT) && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    handleOpenModal(selectedDetail);
                    setSelectedDetail(null);
                  }}
                >
                  Edit Product
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '95%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2 className="text-red-500 flex items-center gap-2" style={{ fontSize: '1.2rem' }}>Delete Product/Service</h2>
              <button className="modal-close" onClick={() => setSelectedDelete(null)}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Are you sure you want to delete the classification <strong>{selectedDelete.SubSubType}</strong> under <strong>{selectedDelete.SubType}</strong>?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                This will remove the product master entry. Existing leads and projects referencing this product will retain their linkage, but it won't be available for new selections.
              </p>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedDelete(null)}>Cancel</button>
              <button
                type="button"
                className="btn"
                style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '0.5rem', fontWeight: 600 }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <><Loader2 size={16} className="animate-spin" /> Deleting...</> : 'Delete Permanent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
