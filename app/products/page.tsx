'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, Package, X, Calendar, Clock, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@/utils/dateUtils';

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

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const ITEMS_PER_PAGE = 9;

  const [formData, setFormData] = useState({
    Product_Name: '',
    Description: '',
    IsActive: true
  });

  const loadProducts = async () => {
    try {
      const response = await fetchProducts({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearch
      });
      setProducts(response.products);
      setTotalItems(response.totalItems);
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
      setCurrentPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadProducts();
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleOpenModal = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        Product_Name: product.Product_Name || '',
        Description: product.Description || '',
        IsActive: product.IsActive !== undefined ? product.IsActive : true
      });
    } else {
      setEditingProduct(null);
      setFormData({
        Product_Name: '',
        Description: '',
        IsActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.Product_Name.trim().length < 2) {
      return toast.error("Product Name must be at least 2 characters.");
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

  if (loading) return (
    <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div>
      <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading products & services...</p>
    </div>
  );

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedProducts = products;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Package className="text-blue-500" />
            Products & Services Master
          </h1>
          <p className="page-description" style={{ margin: '0.25rem 0 0 0' }}>Manage the list of products and services offered to clients.</p>
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

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Product/Service Name</th>
              <th>Description</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map(product => (
              <tr
                key={product._id}
                className="hover:bg-slate-50 cursor-pointer"
                style={{ transition: 'background-color 0.2s' }}
                onClick={() => setSelectedDetail(product)}
              >
                <td><span className="font-semibold text-primary">{product.Product_ID}</span></td>
                <td><div className="font-medium text-primary">{product.Product_Name}</div></td>
                <td>{product.Description || '-'}</td>
                <td>
                  <span className={`badge ${product.IsActive ? 'badge-green' : 'badge-red'}`}>
                    {product.IsActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No products found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        itemsPerPage={ITEMS_PER_PAGE}
        itemName="products"
      />

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '95%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2>{editingProduct ? 'Edit Product/Service' : 'Add New Product/Service'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  value={formData.Product_Name}
                  onChange={(e) => setFormData({ ...formData, Product_Name: e.target.value })}
                  placeholder="e.g. Enterprise ERP"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Description</label>
                <textarea
                  className="form-input"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', minHeight: '80px', resize: 'vertical' }}
                  value={formData.Description}
                  onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                  placeholder="Details about this product or service..."
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.IsActive}
                    onChange={(e) => setFormData({ ...formData, IsActive: e.target.checked })}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Active Status
                </label>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary" style={{ alignItems: 'left' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : editingProduct ? 'Update Product' : 'Save Product'}
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
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{selectedDetail.Product_Name}</h2>
                <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0 }}>Product ID: {selectedDetail.Product_ID}</p>
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
                Are you sure you want to delete <strong>{selectedDelete.Product_Name}</strong>?
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
