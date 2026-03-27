'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, Layers, X, Eye, Calendar, Clock, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@/utils/dateUtils';

import { fetchProjectTypes, createProjectType, updateProjectType, deleteProjectType } from '@/utils/api';

export default function ProjectTypesMaster() {
  const [projectTypes, setProjectTypes] = useState<any[]>([]);
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const ITEMS_PER_PAGE = 9;

  const [selectedDetailType, setSelectedDetailType] = useState<any | null>(null);
  const [selectedDeleteType, setSelectedDeleteType] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    Type_Name: '',
    Description: '',
    IsActive: true
  });

  const loadProjectTypes = async () => {
    try {
      const response = await fetchProjectTypes({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearch
      });
      setProjectTypes(response.projectTypes);
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
    loadProjectTypes();
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleOpenModal = (type?: any) => {
    if (type) {
      setEditingType(type);
      setFormData({
        Type_Name: type.Type_Name || '',
        Description: type.Description || '',
        IsActive: type.IsActive !== undefined ? type.IsActive : true
      });
    } else {
      setEditingType(null);
      setFormData({
        Type_Name: '',
        Description: '',
        IsActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.Type_Name.trim().length < 2) {
      return toast.error("Project Type Name must be at least 2 characters.");
    }

    setIsSubmitting(true);
    try {
      if (editingType) {
        await updateProjectType(editingType._id, formData);
        toast.success('Project Type updated!');
      } else {
        await createProjectType(formData);
        toast.success('Project Type added!');
      }
      setIsModalOpen(false);
      loadProjectTypes();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeleteType) return;

    setIsDeleting(true);
    try {
      await deleteProjectType(selectedDeleteType._id);
      toast.success('Project Type deleted successfully');
      setSelectedDeleteType(null);
      loadProjectTypes();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedTypes = projectTypes;
  const filteredTypes = projectTypes;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Layers className="text-blue-500" />
            Project Type Master
          </h1>
          <p className="page-description" style={{ margin: '0.25rem 0 0 0' }}>Manage categories and classifications for your projects.</p>
        </div>
        {hasPermission(PERMISSIONS.PROJECT_TYPES_CREATE) && (
          <button
            onClick={() => handleOpenModal()}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Add Project Type
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
              <th>Type Name</th>
              <th>Description</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTypes.map(type => (
              <tr
                key={type._id}
                className="hover:bg-slate-50 cursor-pointer"
                style={{ transition: 'background-color 0.2s' }}
                onClick={() => setSelectedDetailType(type)}
              >
                <td><span className="font-semibold text-primary">{type.Type_ID}</span></td>
                <td><div className="font-medium text-primary">{type.Type_Name}</div></td>
                <td style={{ maxWidth: '400px' }}>
                  <div style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{type.Description || '-'}</div>
                </td>
                <td>
                  <span className={`badge ${type.IsActive ? 'badge-green' : 'badge-red'}`}>
                    {type.IsActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {projectTypes.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No project types found matching your search.
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
        itemName="project types"
      />

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '95%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2>{editingType ? 'Edit Project Type' : 'Add New Project Type'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Project Type Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  value={formData.Type_Name}
                  onChange={(e) => setFormData({ ...formData, Type_Name: e.target.value })}
                  placeholder="e.g. Web Development"
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Description</label>
                <textarea
                  className="form-input"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', minHeight: '100px', resize: 'vertical' }}
                  value={formData.Description}
                  onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                  placeholder="What does this project type encompass?"
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
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
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : editingType ? 'Update Type' : 'Save Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDetailType && (
        <div className="modal-overlay" onClick={() => setSelectedDetailType(null)}>
          <div className="modal-content" style={{ maxWidth: '650px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{selectedDetailType.Type_Name}</h2>
                <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0 }}>Type ID: {selectedDetailType.Type_ID}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedDetailType(null)}><X size={24} /></button>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>General Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} className="text-secondary" /> <strong>Created On:</strong> {formatDateDDMMYYYY(selectedDetailType.createdAt)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} className="text-secondary" /> <strong>Last Updated:</strong> {formatDateTimeDDMMYYYY(selectedDetailType.updatedAt)}</div>
                  <div>
                    <strong>Status:</strong>{' '}
                    <span className={`badge ${selectedDetailType.IsActive ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.7rem' }}>
                      {selectedDetailType.IsActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Info size={16} /> Description</h3>
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.875rem', minHeight: '100px', whiteSpace: 'pre-wrap', border: '1px solid #e2e8f0', color: '#334155' }}>
                  {selectedDetailType.Description || <span className="text-secondary italic">No description provided.</span>}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              {hasPermission(PERMISSIONS.PROJECT_TYPES_DELETE) && (
                <button
                  className="btn btn-secondary"
                  style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'transparent' }}
                  onClick={() => {
                    setSelectedDeleteType(selectedDetailType);
                    setSelectedDetailType(null);
                  }}
                >
                  Delete Type
                </button>
              )}
              {hasPermission(PERMISSIONS.PROJECT_TYPES_EDIT) && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    handleOpenModal(selectedDetailType);
                    setSelectedDetailType(null);
                  }}
                >
                  Edit Type
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedDeleteType && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '95%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2 className="text-red-500 flex items-center gap-2" style={{ fontSize: '1.2rem' }}>Delete Project Type</h2>
              <button className="modal-close" onClick={() => setSelectedDeleteType(null)}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Are you sure you want to delete <strong>{selectedDeleteType.Type_Name}</strong>?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                This will remove the project type master entry. Projects already using this type will maintain their reference but you won't be able to select it for new projects.
              </p>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedDeleteType(null)}>Cancel</button>
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
