'use client';

import { useEffect, useState } from 'react';
import { fetchTickets, cancelItem, updateTicketDetails, createTicket, fetchProjects } from '@/utils/api';
import { formatDateDDMMYYYY } from '@/utils/dateUtils';
import { useOptions } from '@/context/OptionsContext';
import { Loader2, X, Search, Ticket, Clock, CheckCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

/**
 * Tickets Page
 * Manages support tickets linked to projects.
 */
const Tickets = () => {
  const getLocalISOString = () => {
    const now = new Date();
    const tzoffset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzoffset).toISOString().slice(0, 16);
  };

  const [tickets, setTickets] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const { optionsMap } = useOptions();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusCounts, setStatusCounts] = useState({
      In_Progress: 0,
      Open: 0,
      Closed: 0
  });
  const ITEMS_PER_PAGE = 20;

  const [selectedCancelTicket, setSelectedCancelTicket] = useState<any | null>(null);
  const [selectedDetailTicket, setSelectedDetailTicket] = useState<any | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTicketId, setEditTicketId] = useState<string | null>(null);
  const [editingTicket, setEditingTicket] = useState(false);
  const [editTicketData, setEditTicketData] = useState({
    Title: '',
    Description: '',
    Priority: 'Medium',
    Status: 'In_Progress',
    Action_Taken_DT: '',
    Raised_By: '',
    Assigned_To: '',
    Company_Name: '',
    Raised_Date_Time: ''
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addTicketData, setAddTicketData] = useState({
    Project_ID: '',
    Title: '',
    Description: '',
    Priority: 'Medium',
    Status: 'Open',
    Raised_By: '',
    Assigned_To: '',
    Company_Name: '',
    Raised_Date_Time: getLocalISOString()
  });

  const loadData = async () => {
    try {
      const response = await fetchTickets({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearch,
          status: statusFilter,
          sortBy: sortBy
      });
      setTickets(response.tickets);
      setTotalItems(response.totalItems);
      setStatusCounts(response.statusCounts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProjectsData = async () => {
    try {
      const projectsData = await fetchProjects({ limit: 100 });
      setProjectsList(projectsData.projects.filter((p: any) => p.Pipeline_Status !== 'Closed'));
    } catch (err: any) {
      toast.error('Error fetching projects: ' + err.message);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, sortBy]);

  useEffect(() => {
      loadData();
  }, [currentPage, debouncedSearch, statusFilter, sortBy]);

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCancelTicket) return;

    setCanceling(true);
    try {
      await cancelItem('ticket', selectedCancelTicket._id, cancelReason);
      setSelectedCancelTicket(null);
      toast.success('Ticket cancelled and archived.');
      loadData();
    } catch (err: any) {
      toast.error('Error canceling ticket: ' + err.message);
    } finally {
      setCanceling(false);
    }
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setEditTicketId(null);
    setEditTicketData({
      Title: '',
      Description: '',
      Priority: 'Medium',
      Status: 'In_Progress',
      Action_Taken_DT: '',
      Raised_By: '',
      Assigned_To: '',
      Company_Name: '',
      Raised_Date_Time: ''
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTicketId) return;

    if (!editTicketData.Title || editTicketData.Title.length < 3) {
      toast.error('Ticket title must be at least 3 characters.');
      return;
    }
    if (!editTicketData.Description || editTicketData.Description.length < 10) {
      toast.error('Description must be at least 10 characters.');
      return;
    }

    setEditingTicket(true);

    let statusChangedToCancel = false;
    let originalTicket = null;
    let dataToSubmit = { ...editTicketData };

    originalTicket = tickets.find((t: any) => t._id === editTicketId);
    const originalStatus = originalTicket?.Status || 'In_Progress';
    const newStatus = editTicketData.Status;
    const isCanceling = newStatus === 'Closed';

    statusChangedToCancel = isCanceling && originalStatus !== 'Closed';
    if (statusChangedToCancel) {
      dataToSubmit.Status = originalStatus;
    }

    try {
      await updateTicketDetails(editTicketId, dataToSubmit);
      toast.success('Ticket updated successfully!');
      handleEditModalClose();
      loadData();

      if (statusChangedToCancel && originalTicket) {
        setSelectedCancelTicket(originalTicket);
        setCancelReason('');
      }
    } catch (err: any) {
      toast.error('Error updating ticket: ' + err.message);
    } finally {
      setEditingTicket(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!addTicketData.Project_ID) {
      toast.error('Please select a Project.');
      return;
    }
    if (!addTicketData.Title || addTicketData.Title.length < 3) {
      toast.error('Ticket title must be at least 3 characters.');
      return;
    }

    setAdding(true);
    try {
      await createTicket(addTicketData);
      toast.success('Ticket created successfully!');
      setIsAddModalOpen(false);
      setAddTicketData({
        Project_ID: '',
        Title: '',
        Description: '',
        Priority: 'Medium',
        Status: 'Open',
        Raised_By: '',
        Assigned_To: '',
        Company_Name: '',
        Raised_Date_Time: getLocalISOString()
      });
      loadData();
    } catch (err: any) {
      toast.error('Error creating ticket: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin" /> Loading tickets...</div>;
  if (error) return <div className="text-secondary bg-red-900/20 p-4 rounded-lg text-red-500">Error: {error}</div>;

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const filteredTickets = tickets;
  const paginatedTickets = tickets;

  const toggleSort = (column: string) => {
    if (column === 'ID') {
      setSortBy(sortBy === 'ID-ASC' ? 'ID-DESC' : 'ID-ASC');
    } else if (column === 'Company') {
      setSortBy(sortBy === 'Company-A-Z' ? 'Company-Z-A' : 'Company-A-Z');
    } else if (column === 'Date') {
      setSortBy(sortBy === 'Newest' ? 'Oldest' : 'Newest');
    }
  };

  const getSortIcon = (column: string) => {
    if (column === 'ID') {
      if (sortBy === 'ID-ASC') return <span className="ml-1 text-blue-500">↑</span>;
      if (sortBy === 'ID-DESC') return <span className="ml-1 text-blue-500">↓</span>;
    } else if (column === 'Company') {
      if (sortBy === 'Company-A-Z') return <span className="ml-1 text-blue-500">↑</span>;
      if (sortBy === 'Company-Z-A') return <span className="ml-1 text-blue-500">↓</span>;
    } else if (column === 'Date') {
      if (sortBy === 'Newest') return <span className="ml-1 text-blue-500">↓</span>;
      if (sortBy === 'Oldest') return <span className="ml-1 text-blue-500">↑</span>;
    }
    return <span className="ml-1 text-gray-400 opacity-50">⇅</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Ticket className="text-blue-500" />
            Support Tickets
          </h1>
          <div className="search-wrapper" style={{ minWidth: '400px', marginBottom: 0 }}>
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by #, Title, Company..."
              className="premium-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.6rem 1rem 0.6rem 2.8rem', borderRadius: '10px', fontSize: '0.95rem' }}
            />
          </div>
        </div>
        {hasPermission(PERMISSIONS.TICKETS_CREATE) && (
          <button
            onClick={() => {
              setIsAddModalOpen(true);
              loadProjectsData();
            }}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Add Ticket
          </button>
        )}
      </div>

      {/* Summary Blocks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'In Progress', key: 'In_Progress', count: statusCounts.In_Progress, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', icon: <Ticket size={20} /> },
          { label: 'Open', key: 'Open', count: statusCounts.Open, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', icon: <Clock size={20} /> },
          { label: 'Closed', key: 'Closed', count: statusCounts.Closed, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', icon: <CheckCircle size={20} /> }
        ].map((block) => (
          <div
            key={block.key}
            className="premium-card"
            style={{
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              cursor: 'pointer',
              borderRadius: '12px',
              backgroundColor: statusFilter === block.key ? block.bgColor : '#ffffff',
              boxShadow: statusFilter === block.key
                ? `inset 0 0 0 2px ${block.color}, 0 8px 12px -3px ${block.bgColor}44`
                : `inset 0 0 0 1px var(--border-color)`,
              transition: 'all 0.3s ease',
            }}
            onClick={() => setStatusFilter(statusFilter === block.key ? 'All' : block.key)}
          >
            <div style={{ backgroundColor: block.bgColor, padding: '0.75rem', borderRadius: '12px', color: block.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {block.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, lineHeight: 1, color: 'var(--text-primary)' }}>{block.count}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.15rem' }}>{block.label}</p>
            </div>
          </div>
        ))}
      </div>


      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort('ID')} style={{ cursor: 'pointer' }}>Ticket # {getSortIcon('ID')}</th>
              <th>Ticket Title</th>
              <th onClick={() => toggleSort('Company')} style={{ cursor: 'pointer' }}>Company {getSortIcon('Company')}</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Raised By</th>
              <th onClick={() => toggleSort('Date')} style={{ cursor: 'pointer' }}>Date {getSortIcon('Date')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTickets.map((tkt: any) => (
              <tr key={tkt._id} onClick={() => setSelectedDetailTicket(tkt)} style={{ cursor: 'pointer' }}>
                <td><span className="font-semibold text-primary">{tkt.Ticket_Number}</span></td>
                <td className="font-medium">{tkt.Title}</td>
                <td>{tkt.Client_Reference?.Company_Name || '-'}</td>
                <td>
                  <span className={`badge ${tkt.Priority === 'High' ? 'badge-blue' : tkt.Priority === 'Medium' ? 'badge-yellow' : 'badge-gray'}`}>
                    {tkt.Priority}
                  </span>
                </td>
                <td>
                  <span className={`badge ${tkt.Status === 'Closed' ? 'badge-red' : tkt.Status === 'In_Progress' ? 'badge-blue' : 'badge-green'}`}>
                    {tkt.Status.replace('_', ' ')}
                  </span>
                </td>
                <td>{tkt.Raised_By}</td>
                <td>{formatDateDDMMYYYY(tkt.Raised_Date_Time)}</td>
              </tr>
            ))}
            {filteredTickets.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No tickets found matching your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={ITEMS_PER_PAGE}
        onPageChange={setCurrentPage}
        itemName="tickets"
      />

      {/* Details Modal */}
      {selectedDetailTicket && (
        <div className="modal-overlay" onClick={() => setSelectedDetailTicket(null)}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{selectedDetailTicket.Title}</h2>
                <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0 }}>Ticket #: {selectedDetailTicket.Ticket_Number}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedDetailTicket(null)}><X size={24} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>Ticket Info</h3>
                <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div>
                    <strong className="text-secondary">Project Linked:</strong>{' '}
                    {selectedDetailTicket.Project_ID?.Project_ID || 'N/A'}
                  </div>
                  <div><strong className="text-secondary">Company:</strong> {selectedDetailTicket.Client_Reference?.Company_Name || '-'}</div>
                  <div>
                    <strong className="text-secondary">Priority:</strong>{' '}
                    <span className={`badge ${selectedDetailTicket.Priority === 'High' ? 'badge-blue' : selectedDetailTicket.Priority === 'Medium' ? 'badge-yellow' : 'badge-gray'}`}>
                      {selectedDetailTicket.Priority}
                    </span>
                  </div>
                  {/* Assigned To */}
                  <div><strong className="text-secondary">Assigned To:</strong> {selectedDetailTicket.Assigned_To || '-'}</div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>Status & Timeline</h3>
                <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div>
                    <strong className="text-secondary">Status:</strong>{' '}
                    <span className={`badge ${selectedDetailTicket.Status === 'Closed' ? 'badge-gray' : selectedDetailTicket.Status === 'In_Progress' ? 'badge-blue' : 'badge-green'}`}>
                      {selectedDetailTicket.Status.replace('_', ' ')}
                    </span>
                  </div>
                  <div><strong className="text-secondary">Raised By:</strong> {selectedDetailTicket.Raised_By}</div>
                  <div><strong className="text-secondary">Date Raised:</strong> {formatDateDDMMYYYY(selectedDetailTicket.Raised_Date_Time)}</div>
                  <div><strong className="text-secondary">Date of Action:</strong> {formatDateDDMMYYYY(selectedDetailTicket.Action_Taken_DT)}</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '0.75rem' }}>Description</h3>
              <div style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '0.5rem', border: '1px solid rgba(0,0,0,0.05)', whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                {selectedDetailTicket.Description || 'No description provided.'}
              </div>
            </div>

            {selectedDetailTicket.Status === 'Closed' && selectedDetailTicket.Resolution_Details && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '0.75rem' }}>Resolution</h3>
                <div style={{ padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.2)', whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                  {selectedDetailTicket.Resolution_Details}
                </div>
              </div>
            )}

            {selectedDetailTicket.Status !== 'Closed' && (
              <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {hasPermission(PERMISSIONS.TICKETS_DELETE) && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 1rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'transparent' }}
                      onClick={() => {
                        setSelectedCancelTicket(selectedDetailTicket);
                        setCancelReason('');
                        setSelectedDetailTicket(null);
                      }}
                    >
                      Cancel Ticket <X size={16} style={{ marginLeft: '0.5rem' }} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {hasPermission(PERMISSIONS.TICKETS_EDIT) && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditTicketId(selectedDetailTicket._id);
                        setEditTicketData({
                          Title: selectedDetailTicket.Title || '',
                          Description: selectedDetailTicket.Description || '',
                          Priority: selectedDetailTicket.Priority || 'Medium',
                          Status: selectedDetailTicket.Status || 'In_Progress',
                          Action_Taken_DT: selectedDetailTicket.Action_Taken_DT || '',
                          Raised_By: selectedDetailTicket.Raised_By || '',
                          Assigned_To: selectedDetailTicket.Assigned_To || '',
                          Company_Name: selectedDetailTicket.Client_Reference?.Company_Name || selectedDetailTicket.Company_Name || '',
                          Raised_Date_Time: selectedDetailTicket.Raised_Date_Time || ''
                        });
                        setSelectedDetailTicket(null);
                        setIsEditModalOpen(true);
                      }}
                    >
                      Edit Ticket
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel Ticket Modal */}
      {selectedCancelTicket && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '95%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2 className="text-red-500 flex items-center gap-2" style={{ fontSize: '1.2rem' }}>Cancel Ticket</h2>
              <button className="modal-close" onClick={() => setSelectedCancelTicket(null)}><X size={20} /></button>
            </div>

            <form onSubmit={handleCancelSubmit}>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <p style={{ fontSize: '0.85rem', color: '#ef4444', marginBottom: '0.25rem' }}>Canceling Ticket: <strong>{selectedCancelTicket.Ticket_Number} ({selectedCancelTicket.Title})</strong></p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>This action will permanently move the ticket to Archives.</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Reason for Cancellation *</label>
                <textarea
                  required
                  rows={3}
                  className="form-textarea"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Explain why this ticket is being canceled..."
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedCancelTicket(null)}>Go Back</button>
                <button type="submit" className="btn btn-secondary" style={{ backgroundColor: '#ef4444', color: 'white', borderColor: '#ef4444' }} disabled={canceling}>
                  {canceling ? <><Loader2 size={16} className="animate-spin" /> Canceling...</> : 'Cancel Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2>Edit Ticket</h2>
              <button className="modal-close" onClick={handleEditModalClose}><X size={20} /></button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Title *</label>
                  <input type="text" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={editTicketData.Title} onChange={e => setEditTicketData({ ...editTicketData, Title: e.target.value })} placeholder="e.g. Login issue" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Description</label>
                  <textarea className="form-textarea" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', minHeight: '80px' }} value={editTicketData.Description} onChange={e => setEditTicketData({ ...editTicketData, Description: e.target.value })} placeholder="Describe the issue..." />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Priority</label>
                    <select className="form-select" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={editTicketData.Priority} onChange={e => setEditTicketData({ ...editTicketData, Priority: e.target.value })}>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Status</label>
                    <select
                      className="form-select"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      value={editTicketData.Status}
                      onChange={e => {
                        const newStatus = e.target.value;
                        if (newStatus === 'Closed' && editTicketId) {
                          const originalTicket = tickets.find((t: any) => t._id === editTicketId);
                          if (originalTicket) {
                            setSelectedCancelTicket(originalTicket);
                            setCancelReason('');
                            handleEditModalClose();
                            return;
                          }
                        }
                        setEditTicketData({ ...editTicketData, Status: newStatus });
                      }}
                    >
                      {optionsMap?.ticket?.status?.filter((status: string) => {
                        if (!hasPermission(PERMISSIONS.TICKETS_DELETE)) {
                          return status !== 'Closed';
                        }
                        return true;
                      }).map((status: string) => (
                        <option key={status} value={status}>{status.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Raised By</label>
                    <input
                      type="text"
                      readOnly
                      className="form-input"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', backgroundColor: 'rgba(0,0,0,0.05)', cursor: 'not-allowed' }}
                      value={editTicketData.Raised_By}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Assigned To</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      value={editTicketData.Assigned_To}
                      onChange={e => setEditTicketData({ ...editTicketData, Assigned_To: e.target.value })}
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Company Name</label>
                    <input
                      type="text"
                      readOnly
                      className="form-input"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', backgroundColor: 'rgba(0,0,0,0.05)', cursor: 'not-allowed' }}
                      value={editTicketData.Company_Name}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Raised Date</label>
                    <input
                      type="text"
                      readOnly
                      className="form-input"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', backgroundColor: 'rgba(0,0,0,0.05)', cursor: 'not-allowed' }}
                      value={formatDateDDMMYYYY(editTicketData.Raised_Date_Time)}
                    />
                  </div>
                </div>

                {editTicketData.Action_Taken_DT && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Action Taken Date</label>
                    <input
                      type="text"
                      readOnly
                      className="form-input"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', backgroundColor: 'rgba(0,0,0,0.05)', cursor: 'not-allowed' }}
                      value={formatDateDDMMYYYY(editTicketData.Action_Taken_DT)}
                    />
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleEditModalClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editingTicket}>
                  {editingTicket ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Ticket Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2>Raise New Ticket</h2>
              <button className="modal-close" onClick={() => setIsAddModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Select Project *</label>
                    <select
                      required
                      className="form-select"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      value={addTicketData.Project_ID}
                      onChange={e => {
                        const pId = e.target.value;
                        const selectedPrj = projectsList.find(p => p._id === pId);
                        setAddTicketData({
                          ...addTicketData,
                          Project_ID: pId,
                          Company_Name: selectedPrj?.Client_Reference?.Company_Name || selectedPrj?.Lead_Reference?.Client_Reference?.Company_Name || ''
                        });
                      }}
                    >
                      <option value="">-- Select a Project --</option>
                      {projectsList.map(prj => (
                        <option key={prj._id} value={prj._id}>{prj.Project_ID} - {prj.Project_Name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Ticket Title *</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      value={addTicketData.Title}
                      onChange={e => setAddTicketData({ ...addTicketData, Title: e.target.value })}
                      placeholder="Brief summary of the issue"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Description</label>
                  <textarea
                    className="form-textarea"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', minHeight: '100px' }}
                    value={addTicketData.Description}
                    onChange={e => setAddTicketData({ ...addTicketData, Description: e.target.value })}
                    placeholder="Detailed explanation of the problem..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Raised By</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      value={addTicketData.Raised_By}
                      onChange={e => setAddTicketData({ ...addTicketData, Raised_By: e.target.value })}
                      placeholder="e.g. Client Name"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Assigned To</label>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      value={addTicketData.Assigned_To}
                      onChange={e => setAddTicketData({ ...addTicketData, Assigned_To: e.target.value })}
                      placeholder="e.g. Developer Name"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Company Name</label>
                    <input
                      type="text"
                      readOnly
                      className="form-input"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', backgroundColor: 'rgba(0,0,0,0.05)', cursor: 'not-allowed' }}
                      value={addTicketData.Company_Name}
                      placeholder="Auto-filled from Project"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Raised Date</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      value={addTicketData.Raised_Date_Time}
                      onChange={e => setAddTicketData({ ...addTicketData, Raised_Date_Time: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Priority</label>
                    <select
                      className="form-select"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      value={addTicketData.Priority}
                      onChange={e => setAddTicketData({ ...addTicketData, Priority: e.target.value })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Initial Status</label>
                    <select
                      className="form-select"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      value={addTicketData.Status}
                      onChange={e => setAddTicketData({ ...addTicketData, Status: e.target.value })}
                    >
                      <option value="Open">Open</option>
                      <option value="In_Progress">In Progress</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={adding}>
                  {adding ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Raise Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
