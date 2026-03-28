'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, Building2, X, ArrowRight, Eye, Mail, Phone, MapPin, Calendar, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@/utils/dateUtils';
import AddClientModal from '@/components/AddClientModal';
import { fetchClients, deleteClient } from '@/utils/api';

export default function ClientsMaster() {
  const [clients, setClients] = useState<any[]>([]);
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Newest');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const ITEMS_PER_PAGE = 20;

  const [selectedDetailClient, setSelectedDetailClient] = useState<any | null>(null);
  const [selectedDeleteClient, setSelectedDeleteClient] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadClients = async () => {
    try {
      const response = await fetchClients({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearch,
          sortBy: sortBy
      });
      setClients(response.clients);
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
    loadClients();
  }, [currentPage, debouncedSearch, sortBy]);

  const handleOpenModal = (client?: any) => {
    setEditingClient(client || null);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeleteClient) return;

    setIsDeleting(true);
    try {
      await deleteClient(selectedDeleteClient._id);
      toast.success('Client deleted successfully');
      setSelectedDeleteClient(null);
      loadClients();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredClients = clients;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) return (
    <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div>
      <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading clients...</p>
    </div>
  );
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedClients = clients;

  const toggleSort = (column: string) => {
    if (column === 'ID') {
      setSortBy(sortBy === 'ID-ASC' ? 'ID-DESC' : 'ID-ASC');
    } else if (column === 'Company') {
      setSortBy(sortBy === 'Company-A-Z' ? 'Company-Z-A' : 'Company-A-Z');
    }
  };

  const getSortIcon = (column: string) => {
    if (column === 'ID') {
      if (sortBy === 'ID-ASC') return <span className="ml-1 text-blue-500">↑</span>;
      if (sortBy === 'ID-DESC') return <span className="ml-1 text-blue-500">↓</span>;
    } else if (column === 'Company') {
      if (sortBy === 'Company-A-Z') return <span className="ml-1 text-blue-500">↑</span>;
      if (sortBy === 'Company-Z-A') return <span className="ml-1 text-blue-500">↓</span>;
    }
    return <span className="ml-1 text-gray-400 opacity-50">⇅</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 className="text-blue-500" />
            Client Master
          </h1>
          <div className="search-wrapper" style={{ minWidth: '400px', marginBottom: 0 }}>
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by ID, Company, Contact..."
              className="premium-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.6rem 1rem 0.6rem 2.8rem', borderRadius: '10px', fontSize: '0.95rem' }}
            />
          </div>
        </div>
        {hasPermission(PERMISSIONS.CLIENTS_CREATE) && (
          <button
            onClick={() => handleOpenModal()}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Add Client
          </button>
        )}
      </div>


      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort('ID')} style={{ cursor: 'pointer' }}>ID {getSortIcon('ID')}</th>
              <th onClick={() => toggleSort('Company')} style={{ cursor: 'pointer' }}>Company Name {getSortIcon('Company')}</th>
              <th>Client Name</th>
              <th>Contact Info</th>
              <th>Description</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedClients.map(client => (
              <tr
                key={client._id}
                className="hover:bg-slate-50 cursor-pointer"
                style={{ transition: 'background-color 0.2s' }}
                onClick={() => setSelectedDetailClient(client)}
              >
                <td onClick={(e) => e.stopPropagation()}><span className="font-semibold text-primary">{client.Client_ID}</span></td>
                <td style={{ maxWidth: '300px' }}>
                  <div className="font-medium text-primary">{client.Company_Name}</div>
                  {client.Location && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{client.Location}</div>}
                </td>
                <td>{client.Client_Name || '-'}</td>
                <td>
                  <div style={{ fontSize: '0.875rem' }}>{client.Contact_Number || '-'}</div>
                  {client.Email && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{client.Email}</div>}
                </td>
                <td style={{ maxWidth: '400px' }}>
                  <div style={{ fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.Description || '-'}</div>
                </td>
                <td>
                  <span className={`badge ${client.IsActive ? 'badge-green' : 'badge-red'}`}>
                    {client.IsActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {/*<td onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setSelectedDetailClient(client)} style={{ padding: '0.25rem', color: '#10b981', background: 'transparent', border: 'none', cursor: 'pointer' }} title="View details"><Eye size={16} /></button>
                    <button type="button" onClick={() => {
                      setEditingClient(client);
                      setFormData({
                        Company_Name: client.Company_Name || '',
                        Company_No: client.Company_No || '',
                        Client_Name: client.Client_Name || '',
                        Contact_Number: client.Contact_Number || '',
                        Email: client.Email || '',
                        Location: client.Location || '',
                        Description: client.Description || '',
                        IsActive: client.IsActive !== undefined ? client.IsActive : true
                      });
                      setIsModalOpen(true);
                    }} style={{ padding: '0.25rem', color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Edit"><Edit2 size={16} /></button>
                    <button type="button" onClick={() => setSelectedDeleteClient(client)} style={{ padding: '0.25rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Delete"><Trash2 size={16} /></button>
                  </div>
                </td>*/}
              </tr>
            ))}
            {filteredClients.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  No clients found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredClients.length}
        onPageChange={setCurrentPage}
        itemsPerPage={ITEMS_PER_PAGE}
        itemName="clients"
      />

      <AddClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => loadClients()}
        editingClient={editingClient}
      />

      {selectedDetailClient && (
        <div className="modal-overlay" onClick={() => setSelectedDetailClient(null)}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{selectedDetailClient.Company_Name}</h2>
                <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0 }}>Client ID: {selectedDetailClient.Client_ID}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedDetailClient(null)}><X size={24} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>Company Information</h3>
                <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Building2 size={16} className="text-secondary" /> <strong>GST/PAN:</strong> {selectedDetailClient.Company_No || '-'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MapPin size={16} className="text-secondary" /> <strong>Location:</strong> {selectedDetailClient.Location || '-'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Calendar size={16} className="text-secondary" /> <strong>Created On:</strong> {formatDateDDMMYYYY(selectedDetailClient.createdAt)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Clock size={16} className="text-secondary" /> <strong>Last Updated:</strong> {formatDateTimeDDMMYYYY(selectedDetailClient.updatedAt)}</div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>Contact Details</h3>
                <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div><strong>Contact Person:</strong> {selectedDetailClient.Client_Name || '-'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={16} className="text-secondary" /> <strong>Email:</strong> {selectedDetailClient.Email ? <a href={`mailto:${selectedDetailClient.Email}`} className="text-blue-600 hover:underline">{selectedDetailClient.Email}</a> : '-'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={16} className="text-secondary" /> <strong>Phone:</strong> {selectedDetailClient.Contact_Number || '-'}</div>
                  <div>
                    <strong>Status:</strong>{' '}
                    <span className={`badge ${selectedDetailClient.IsActive ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.7rem' }}>
                      {selectedDetailClient.IsActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '0.75rem' }}>Description / Notes</h3>
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.875rem', minHeight: '80px', whiteSpace: 'pre-wrap', border: '1px solid #e2e8f0', color: '#334155' }}>
                {selectedDetailClient.Description || <span className="text-secondary italic">No description provided.</span>}
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              {hasPermission(PERMISSIONS.CLIENTS_DELETE) && (
                <button
                  className="btn btn-secondary"
                  style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'transparent' }}
                  onClick={() => {
                    setSelectedDeleteClient(selectedDetailClient);
                    setSelectedDetailClient(null);
                  }}
                >
                  Delete Client
                </button>
              )}
              {hasPermission(PERMISSIONS.CLIENTS_EDIT) && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    handleOpenModal(selectedDetailClient);
                    setSelectedDetailClient(null);
                  }}
                >
                  Edit Client
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedDeleteClient && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '95%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2 className="text-red-500 flex items-center gap-2" style={{ fontSize: '1.2rem' }}>Delete Client</h2>
              <button className="modal-close" onClick={() => setSelectedDeleteClient(null)}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Are you sure you want to delete <strong>{selectedDeleteClient.Company_Name}</strong>?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                This action is permanent and cannot be undone. All data associated with this client will be removed.
              </p>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedDeleteClient(null)}>Cancel</button>
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
