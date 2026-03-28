'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, Link as LinkIcon, X, Calendar, Clock, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@/utils/dateUtils';

import { fetchLeadSources, createLeadSource, updateLeadSource, deleteLeadSource } from '@/utils/api';

export default function LeadSourcesMaster() {
  const [sources, setSources] = useState<any[]>([]);
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [selectedDelete, setSelectedDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const ITEMS_PER_PAGE = 9;

  const [formData, setFormData] = useState({
    Source_Name: '',
    Description: '',
    IsActive: true
  });

  const loadSources = async () => {
    try {
      const response = await fetchLeadSources({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearch
      });
      setSources(response.sources);
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
    loadSources();
  }, [currentPage, debouncedSearch]);

  const handleOpenModal = (source?: any) => {
    if (source) {
      setEditingSource(source);
      setFormData({
        Source_Name: source.Source_Name || '',
        Description: source.Description || '',
        IsActive: source.IsActive !== undefined ? source.IsActive : true
      });
    } else {
      setEditingSource(null);
      setFormData({
        Source_Name: '',
        Description: '',
        IsActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.Source_Name.trim().length < 2) {
      return toast.error("Source Name must be at least 2 characters.");
    }

    setIsSubmitting(true);
    try {
      if (editingSource) {
        await updateLeadSource(editingSource._id, formData);
        toast.success('Lead Source updated!');
      } else {
        await createLeadSource(formData);
        toast.success('Lead Source added!');
      }
      setIsModalOpen(false);
      loadSources();
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
      await deleteLeadSource(selectedDelete._id);
      toast.success('Lead Source deleted successfully');
      setSelectedDelete(null);
      loadSources();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div>
      <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading lead sources...</p>
    </div>
  );

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedSources = sources;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LinkIcon className="text-blue-500" />
            Lead Source Master
          </h1>
          <div className="search-wrapper" style={{ minWidth: '400px', marginBottom: 0 }}>
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by ID, Name or Description..."
              className="premium-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.6rem 1rem 0.6rem 2.8rem', borderRadius: '10px', fontSize: '0.95rem' }}
            />
          </div>
        </div>
        {hasPermission(PERMISSIONS.LEAD_SOURCES_CREATE) && (
          <button
            onClick={() => handleOpenModal()}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Add Lead Source
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Source Name</th>
              <th>Description</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedSources.map(source => (
              <tr
                key={source._id}
                className="hover:bg-slate-50 cursor-pointer"
                style={{ transition: 'background-color 0.2s' }}
                onClick={() => setSelectedDetail(source)}
              >
                <td><span className="font-semibold text-primary">{source.Source_ID}</span></td>
                <td><div className="font-medium text-primary">{source.Source_Name}</div></td>
                <td style={{ maxWidth: '400px' }}>
                  <div style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{source.Description || '-'}</div>
                </td>
                <td>
                  <span className={`badge ${source.IsActive ? 'badge-green' : 'badge-red'}`}>
                    {source.IsActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No lead sources found matching your search.
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
        itemName="lead sources"
      />

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '95%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2>{editingSource ? 'Edit Lead Source' : 'Add New Lead Source'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Source Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  value={formData.Source_Name}
                  onChange={(e) => setFormData({ ...formData, Source_Name: e.target.value })}
                  placeholder="e.g. LinkedIn Networking"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Description</label>
                <textarea
                  className="form-input"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', minHeight: '80px', resize: 'vertical' }}
                  value={formData.Description}
                  onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                  placeholder="Details about this acquisition channel..."
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
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : editingSource ? 'Update Source' : 'Save Source'}
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
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{selectedDetail.Source_Name}</h2>
                <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0 }}>Source ID: {selectedDetail.Source_ID}</p>
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
              {hasPermission(PERMISSIONS.LEAD_SOURCES_DELETE) && (
                <button
                  className="btn btn-secondary"
                  style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'transparent' }}
                  onClick={() => {
                    setSelectedDelete(selectedDetail);
                    setSelectedDetail(null);
                  }}
                >
                  Delete Source
                </button>
              )}
              {hasPermission(PERMISSIONS.LEAD_SOURCES_EDIT) && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    handleOpenModal(selectedDetail);
                    setSelectedDetail(null);
                  }}
                >
                  Edit Source
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
              <h2 className="text-red-500 flex items-center gap-2" style={{ fontSize: '1.2rem' }}>Delete Lead Source</h2>
              <button className="modal-close" onClick={() => setSelectedDelete(null)}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Are you sure you want to delete <strong>{selectedDelete.Source_Name}</strong>?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                This will remove the lead source master entry. Existing leads referencing this source will retain their linkage, but it won't be available for new selections.
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
