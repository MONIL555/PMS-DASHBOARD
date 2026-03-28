'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, Users as User, X, Calendar, Clock, Info, Shield, Mail, Phone, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@/utils/dateUtils';
import { fetchUsers, fetchRoles, createUser, updateUser, deleteUser } from '@/utils/api';

export default function UsersMaster() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const ITEMS_PER_PAGE = 9;

  const [selectedDetailUser, setSelectedDetailUser] = useState<any | null>(null);
  const [selectedDeleteUser, setSelectedDeleteUser] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    Name: '',
    Email: '',
    Phone: '',
    Password: '',
    Role_ID: '',
    IsActive: true
  });

  const loadData = async () => {
    try {
      const [usersResponse, rolesData] = await Promise.all([
        fetchUsers({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearch
        }),
        fetchRoles({ active: true, limit: 20 })
      ]);

      setUsers(usersResponse.users);
      setTotalItems(usersResponse.totalItems);
      // fetchRoles now returns { roles, totalItems }
      setRoles(rolesData.roles.filter((r: any) => r.IsActive));
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
    loadData();
  }, [currentPage, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleOpenModal = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        Name: user.Name || '',
        Email: user.Email || '',
        Phone: user.Phone || '',
        Password: '',
        Role_ID: user.Role_ID?._id || user.Role_ID || '',
        IsActive: user.IsActive !== undefined ? user.IsActive : true
      });
    } else {
      setEditingUser(null);
      setFormData({
        Name: '',
        Email: '',
        Phone: '',
        Password: '',
        Role_ID: '',
        IsActive: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.Name.trim().length < 2) {
      return toast.error("Name must be at least 2 characters.");
    }
    if (!formData.Role_ID) {
      return toast.error("Please assign a role to this user.");
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        await updateUser(editingUser._id, formData);
        toast.success('User updated!');
      } else {
        await createUser(formData);
        toast.success('User added!');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeleteUser) return;

    setIsDeleting(true);
    try {
      await deleteUser(selectedDeleteUser._id);
      toast.success('User deleted successfully');
      setSelectedDeleteUser(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedUsers = users;
  const filteredUsers = users;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users className="text-blue-500" />
            User Master
          </h1>
          <div className="search-wrapper" style={{ minWidth: '400px', marginBottom: 0 }}>
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by ID, Name, Email, or Role..."
              className="premium-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.6rem 1rem 0.6rem 2.8rem', borderRadius: '10px', fontSize: '0.95rem' }}
            />
          </div>
        </div>
        {hasPermission(PERMISSIONS.USERS_CREATE) && (
          <button
            onClick={() => handleOpenModal()}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Add User
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map(user => (
              <tr
                key={user._id}
                className="hover:bg-slate-50 cursor-pointer"
                style={{ transition: 'background-color 0.2s' }}
                onClick={() => setSelectedDetailUser(user)}
              >
                <td><span className="font-semibold text-primary">{user.User_ID}</span></td>
                <td><div className="font-medium text-primary">{user.Name}</div></td>
                <td><div className="text-secondary" style={{ fontSize: '0.875rem' }}>{user.Email}</div></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Shield size={14} className="text-blue-500" />
                    <span style={{ fontSize: '0.875rem' }}>{user.Role_ID?.Role_Name || '-'}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${user.IsActive ? 'badge-green' : 'badge-red'}`}>
                    {user.IsActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No users found matching your search.
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
        itemName="users"
      />

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '95%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Full Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  value={formData.Name}
                  onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
                  placeholder="e.g. Jane Doe"
                />
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Email Address *</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={formData.Email}
                    onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Password {editingUser ? '(Leave blank to keep current)' : '*'}</label>
                  <input
                    type="password"
                    required={!editingUser}
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={formData.Password}
                    onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={formData.Phone}
                    onChange={(e) => setFormData({ ...formData, Phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Assigned Role *</label>
                  <select
                    required
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={formData.Role_ID}
                    onChange={(e) => setFormData({ ...formData, Role_ID: e.target.value })}
                  >
                    <option value="">-- Select a Role --</option>
                    {roles.map(role => (
                      <option key={role._id} value={role._id}>{role.Role_Name}</option>
                    ))}
                  </select>
                </div>
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
                <button type="button" className="btn btn-secondary" style={{ alignItems: 'flex-start' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : editingUser ? 'Update User' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDetailUser && (
        <div className="modal-overlay" onClick={() => setSelectedDetailUser(null)}>
          <div className="modal-content" style={{ maxWidth: '650px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '50px', height: '50px', backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 600 }}>
                  {selectedDetailUser.Name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.15rem' }}>{selectedDetailUser.Name}</h2>
                  <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Shield size={14} /> Role: <strong className="text-primary">{selectedDetailUser.Role_ID?.Role_Name || 'None'}</strong>
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedDetailUser(null)}><X size={24} /></button>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>Contact Information</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Mail size={16} className="text-secondary" /> <a href={`mailto:${selectedDetailUser.Email}`} className="text-blue-500 hover:underline">{selectedDetailUser.Email}</a></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Phone size={16} className="text-secondary" /> {selectedDetailUser.Phone || <span className="text-secondary italic">No phone number</span>}</div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>Account Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Info size={16} className="text-secondary" /> <strong>User ID:</strong> {selectedDetailUser.User_ID}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong>Status:</strong>{' '}
                    <span className={`badge ${selectedDetailUser.IsActive ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.7rem' }}>
                      {selectedDetailUser.IsActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} className="text-secondary" /> <strong>Created:</strong> {formatDateDDMMYYYY(selectedDetailUser.createdAt)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} className="text-secondary" /> <strong>Updated:</strong> {formatDateDDMMYYYY(selectedDetailUser.updatedAt)}</div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              {hasPermission(PERMISSIONS.USERS_DELETE) && (
                <button
                  className="btn btn-secondary"
                  style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'transparent' }}
                  onClick={() => {
                    setSelectedDeleteUser(selectedDetailUser);
                    setSelectedDetailUser(null);
                  }}
                >
                  Delete User
                </button>
              )}
              {hasPermission(PERMISSIONS.USERS_EDIT) && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    handleOpenModal(selectedDetailUser);
                    setSelectedDetailUser(null);
                  }}
                >
                  Edit Details
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedDeleteUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '95%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2 className="text-red-500 flex items-center gap-2" style={{ fontSize: '1.2rem' }}>Delete User</h2>
              <button className="modal-close" onClick={() => setSelectedDeleteUser(null)}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Are you sure you want to delete <strong>{selectedDeleteUser.Name}</strong> ({selectedDeleteUser.Email})?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                This action cannot be undone. Any records associated strictly with this user may lose reference data.
              </p>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedDeleteUser(null)}>Cancel</button>
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
