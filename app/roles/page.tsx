'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, Shield, X, Calendar, Clock, Info, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@/utils/dateUtils';
import { PERMISSION_GROUPS } from '@/lib/permissions';
import { fetchRoles, createRole, updateRole, deleteRole } from '@/utils/api';

export default function RolesMaster() {
  const [roles, setRoles] = useState<any[]>([]);
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const ITEMS_PER_PAGE = 9;

  const [selectedDetailRole, setSelectedDetailRole] = useState<any | null>(null);
  const [selectedDeleteRole, setSelectedDeleteRole] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    Role_Name: '',
    Description: '',
    Permissions: [] as string[],
    IsActive: true
  });

  const loadRoles = async () => {
    try {
      const response = await fetchRoles({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearch
      });
      setRoles(response.roles);
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
    loadRoles();
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleOpenModal = (role?: any) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        Role_Name: role.Role_Name || '',
        Description: role.Description || '',
        Permissions: role.Permissions || [],
        IsActive: role.IsActive !== undefined ? role.IsActive : true
      });
    } else {
      setEditingRole(null);
      setFormData({
        Role_Name: '',
        Description: '',
        Permissions: [],
        IsActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.Role_Name.trim().length < 2) {
      return toast.error("Role Name must be at least 2 characters.");
    }

    setIsSubmitting(true);
    try {
      if (editingRole) {
        await updateRole(editingRole._id, formData);
        toast.success('Role updated!');
      } else {
        await createRole(formData);
        toast.success('Role added!');
      }
      setIsModalOpen(false);
      loadRoles();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeleteRole) return;

    setIsDeleting(true);
    try {
      await deleteRole(selectedDeleteRole._id);
      toast.success('Role deleted successfully');
      setSelectedDeleteRole(null);
      loadRoles();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedRoles = roles;
  const filteredRoles = roles;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield className="text-blue-500" />
            Role Master
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
        {hasPermission(PERMISSIONS.ROLES_CREATE) && (
          <button
            onClick={() => handleOpenModal()}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Add Role
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Role Name</th>
              <th>Assigned Permissions</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRoles.map(role => (
              <tr
                key={role._id}
                className="hover:bg-slate-50 cursor-pointer"
                style={{ transition: 'background-color 0.2s' }}
                onClick={() => setSelectedDetailRole(role)}
              >
                <td><span className="font-semibold text-primary">{role.Role_ID}</span></td>
                <td><div className="font-medium text-primary">{role.Role_Name}</div></td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '300px' }}>
                    {role.Permissions && role.Permissions.length > 0 ? (
                      <>
                        <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{role.Permissions.length} rules active</span>
                      </>
                    ) : (
                      <span className="text-secondary" style={{ fontSize: '0.8rem' }}>No permissions</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge ${role.IsActive ? 'badge-green' : 'badge-red'}`}>
                    {role.IsActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No roles found matching your search.
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
        itemName="roles"
      />

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.25rem' }}>{editingRole ? 'Edit Role Permissions' : 'Create New Role'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>Role Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
                  value={formData.Role_Name}
                  onChange={(e) => setFormData({ ...formData, Role_Name: e.target.value })}
                  placeholder="e.g. Executive"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>Description</label>
                <textarea
                  className="form-input"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical' }}
                  value={formData.Description}
                  onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                  placeholder="Short description of this role's purpose"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.9rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
                    <CheckSquare size={16} /> Access Matrix
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', height: 'auto' }}
                    onClick={() => {
                      const allIds = Object.values(PERMISSION_GROUPS).flat().map(p => p.id);
                      if (formData.Permissions.length === allIds.length) {
                        setFormData({ ...formData, Permissions: [] });
                      } else {
                        setFormData({ ...formData, Permissions: allIds });
                      }
                    }}
                  >
                    Select/Deselect All
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1rem' }}>
                  {Object.entries(PERMISSION_GROUPS).map(([groupName, perms]) => (
                    <div key={groupName} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', margin: '0 0 0.75rem 0', paddingBottom: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>{groupName}</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {perms.map(p => (
                          <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: '#475569' }}>
                            <input
                              type="checkbox"
                              checked={formData.Permissions.includes(p.id)}
                              onChange={(e) => {
                                const newPerms = e.target.checked
                                  ? [...formData.Permissions, p.id]
                                  : formData.Permissions.filter(id => id !== p.id);
                                setFormData({ ...formData, Permissions: newPerms });
                              }}
                              style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                            />
                            {p.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
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

              <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : editingRole ? 'Update Role' : 'Save Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDetailRole && (
        <div className="modal-overlay" onClick={() => setSelectedDetailRole(null)}>
          <div className="modal-content" style={{ maxWidth: '650px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{selectedDetailRole.Role_Name}</h2>
                <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0 }}>Role ID: {selectedDetailRole.Role_ID}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedDetailRole(null)}><X size={24} /></button>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>General Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} className="text-secondary" /> <strong>Created On:</strong> {formatDateDDMMYYYY(selectedDetailRole.createdAt)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} className="text-secondary" /> <strong>Last Updated:</strong> {formatDateTimeDDMMYYYY(selectedDetailRole.updatedAt)}</div>
                  <div>
                    <strong>Status:</strong>{' '}
                    <span className={`badge ${selectedDetailRole.IsActive ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.7rem' }}>
                      {selectedDetailRole.IsActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Info size={16} /> Description</h3>
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.875rem', minHeight: '60px', whiteSpace: 'pre-wrap', border: '1px solid #e2e8f0', color: '#334155' }}>
                  {selectedDetailRole.Description || <span className="text-secondary italic">No description provided.</span>}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckSquare size={16} /> Active Permissions</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedDetailRole.Permissions && selectedDetailRole.Permissions.length > 0 ? (
                    selectedDetailRole.Permissions.map((code: string, idx: number) => {
                      let label = code;
                      for (const group of Object.values(PERMISSION_GROUPS)) {
                        const match = group.find(p => p.id === code);
                        if (match) { label = match.label; break; }
                      }
                      return (
                        <span key={idx} className="badge badge-blue" style={{ fontSize: '0.75rem' }}>{label}</span>
                      );
                    })
                  ) : (
                    <span className="text-secondary italic" style={{ fontSize: '0.875rem' }}>No defined permissions for this role.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              {hasPermission(PERMISSIONS.ROLES_DELETE) && (
                <button
                  className="btn btn-secondary"
                  style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'transparent' }}
                  onClick={() => {
                    setSelectedDeleteRole(selectedDetailRole);
                    setSelectedDetailRole(null);
                  }}
                >
                  Delete Role
                </button>
              )}
              {hasPermission(PERMISSIONS.ROLES_EDIT) && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    handleOpenModal(selectedDetailRole);
                    setSelectedDetailRole(null);
                  }}
                >
                  Edit Permissions
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedDeleteRole && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '95%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2 className="text-red-500 flex items-center gap-2" style={{ fontSize: '1.2rem' }}>Delete Role</h2>
              <button className="modal-close" onClick={() => setSelectedDeleteRole(null)}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Are you sure you want to delete <strong>{selectedDeleteRole.Role_Name}</strong>?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                This will remove the role master entry. Users assigned to this role might lose their permissions entirely.
              </p>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedDeleteRole(null)}>Cancel</button>
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
