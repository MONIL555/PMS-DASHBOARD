'use client';

import React, { useEffect, useState } from 'react';
import { cancelItem, updateTicketDetails, createTicket, fetchProjects } from '@/utils/api';
import { formatDateDDMMYYYY } from '@/utils/dateUtils';
import { useOptions } from '@/context/OptionsContext';
import { Loader2, X, Search, Ticket, Clock, CheckCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { useQueryState, parseAsString, parseAsInteger } from 'nuqs';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { useTicketsQuery } from '@/hooks/useTicketsQuery';

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

  const [projectsList, setProjectsList] = useState<any[]>([]);
  const { optionsMap } = useOptions();
  const { hasPermission } = usePermissions();

  // --- NUQS STATE MANAGEMENT ---
  const [searchTerm, setSearchTerm] = useQueryState('q', parseAsString.withDefault(''));
  const [localSearch, setLocalSearch] = useState(searchTerm || ''); // Local debounce state

  const [statusFilter, setStatusFilter] = useQueryState('status', parseAsString.withDefault('All'));
  const [priorityFilter, setPriorityFilter] = useQueryState('priority', parseAsString.withDefault('All'));
  const [sortBy, setSortBy] = useQueryState('sort', parseAsString.withDefault('Newest'));

  const [dateRange, setDateRange] = useQueryState('range', parseAsString.withDefault('All'));
  const [customStartDate, setCustomStartDate] = useQueryState('startDate', parseAsString.withDefault(''));
  const [customEndDate, setCustomEndDate] = useQueryState('endDate', parseAsString.withDefault(''));

  const [currentPage, setCurrentPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const ITEMS_PER_PAGE = 20;

  // --- TANSTACK QUERY ---
  const { tickets, totalItems, statusCounts, isLoading: loading, isFetching: fetchingTickets, error: queryError, refetch } = useTicketsQuery({
    page: currentPage,
    search: searchTerm,
    status: statusFilter,
    priority: priorityFilter,
    sortBy,
    dateRange,
    customStartDate,
    customEndDate,
  });

  // Modals state
  const [selectedCancelTicket, setSelectedCancelTicket] = useState<any | null>(null);
  const [selectedDetailTicket, setSelectedDetailTicket] = useState<any | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTicketId, setEditTicketId] = useState<string | null>(null);
  const [editingTicket, setEditingTicket] = useState(false);
  const [editTicketData, setEditTicketData] = useState({
    Title: '', Description: '', Priority: 'Medium', Status: 'In_Progress',
    Action_Taken_DT: '', Raised_By: '', Assigned_To: '', Company_Name: '', Raised_Date_Time: ''
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addTicketData, setAddTicketData] = useState({
    Project_ID: '', Title: '', Description: '', Priority: 'Medium', Status: 'Open',
    Raised_By: '', Assigned_To: '', Company_Name: '', Raised_Date_Time: getLocalISOString()
  });

  // --- SEARCH DEBOUNCE LOGIC ---
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== searchTerm) {
        setSearchTerm(localSearch || null);
        setCurrentPage(1);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [localSearch, searchTerm, setSearchTerm, setCurrentPage]);

  // Sync dateRange if navigating with custom dates
  useEffect(() => {
    if (customStartDate && dateRange !== 'custom') {
      setDateRange('custom');
    }
  }, [customStartDate, dateRange, setDateRange]);

  // AbortController logic replaced by TanStack Query (useTicketsQuery hook)

  const loadProjectsData = async () => {
    try {
      const projectsData = await fetchProjects();
      setProjectsList(projectsData.projects.filter((p: any) => p.Pipeline_Status !== 'Closed'));
    } catch (err: any) {
      toast.error('Error fetching projects: ' + err.message);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCancelTicket) return;

    setCanceling(true);
    try {
      await cancelItem('ticket', selectedCancelTicket._id, cancelReason);
      setSelectedCancelTicket(null);
      toast.success('Ticket cancelled and archived.');
      refetch();
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
      Title: '', Description: '', Priority: 'Medium', Status: 'In_Progress',
      Action_Taken_DT: '', Raised_By: '', Assigned_To: '', Company_Name: '', Raised_Date_Time: ''
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
    let dataToSubmit = { ...editTicketData };

    const originalTicket = tickets.find((t: any) => t._id === editTicketId);
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
      refetch();

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
        Project_ID: '', Title: '', Description: '', Priority: 'Medium', Status: 'Open',
        Raised_By: '', Assigned_To: '', Company_Name: '', Raised_Date_Time: getLocalISOString()
      });
      refetch();
    } catch (err: any) {
      toast.error('Error creating ticket: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin" /> Loading tickets...</div>;
  if (queryError) return <div className="text-secondary bg-red-900/20 p-4 rounded-lg text-red-500">Error: {(queryError as Error).message}</div>;

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const toggleSort = (column: string) => {
    if (column === 'ID') setSortBy(sortBy === 'ID-ASC' ? 'ID-DESC' : 'ID-ASC');
    else if (column === 'Company') setSortBy(sortBy === 'Company-A-Z' ? 'Company-Z-A' : 'Company-A-Z');
    else if (column === 'Date') setSortBy(sortBy === 'Newest' ? 'Oldest' : 'Newest');
    setCurrentPage(1);
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
      <div className="page-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        padding: '0.25rem 0',
        gap: '1.25rem',
        minHeight: '48px'
      }}>
        {/* Left: Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <div style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            padding: '0.45rem',
            borderRadius: '10px',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Ticket size={20} strokeWidth={2.5} />
          </div>
          <h1 className="page-title" style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.025em',
            whiteSpace: 'nowrap'
          }}>Tickets</h1>
        </div>

        {/* Middle-Left: Search */}
        <div className="search-wrapper" style={{ flex: 1, maxWidth: '400px', marginBottom: 0 }}>
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search tickets..."
            className="premium-search-input"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            style={{ padding: '0.45rem 1rem 0.45rem 2.4rem', borderRadius: '8px', fontSize: '0.85rem', height: '36px', width: '100%' }}
          />
        </div>

        {/* Middle-Right: Stats Filters */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          backgroundColor: '#f8fafc',
          padding: '0.25rem',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          alignItems: 'center',
          flexShrink: 0
        }}>
          {[
            { label: 'In Progress', key: 'In_Progress', count: statusCounts.In_Progress, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', icon: <Ticket size={14} /> },
            { label: 'Open', key: 'Open', count: statusCounts.Open, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', icon: <Clock size={14} /> },
            { label: 'Closed', key: 'Closed', count: statusCounts.Closed, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', icon: <CheckCircle size={14} /> }
          ].map((block) => (
            <div
              key={block.key}
              onClick={() => {
                setStatusFilter(statusFilter === block.key ? 'All' : block.key);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.35rem 0.6rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                borderRadius: '8px',
                backgroundColor: statusFilter === block.key ? 'white' : 'transparent',
                boxShadow: statusFilter === block.key ? '0 2px 4px rgba(0, 0, 0, 0.05)' : 'none',
                border: statusFilter === block.key ? `1px solid ${block.color}33` : '1px solid transparent',
                transition: 'all 0.15s ease',
                minWidth: '120px'
              }}
            >
              <div style={{
                backgroundColor: block.bgColor,
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                color: block.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {block.icon}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{block.count}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>{block.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Primary Action */}
        {hasPermission(PERMISSIONS.TICKETS_CREATE) && (
          <button
            onClick={() => {
              setIsAddModalOpen(true);
              loadProjectsData();
            }}
            className="btn btn-primary"
            style={{
              height: '36px',
              padding: '0 1rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px 0 rgba(59, 130, 246, 0.25)',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            <Plus size={16} />
            Add Ticket
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort('ID')} style={{ cursor: 'pointer' }}>Ticket # {getSortIcon('ID')}</th>
              <th>Ticket Title</th>
              <th onClick={() => toggleSort('Company')} style={{ cursor: 'pointer' }}>Company {getSortIcon('Company')}</th>
              <th>
                <select
                  className="premium-table-filter"
                  value={priorityFilter}
                  onChange={(e) => {
                    setPriorityFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary-color)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.025em',
                    width: '100%',
                    padding: 0
                  }}
                >
                  <option value="All" style={{ color: '#333' }}>Priority</option>
                  {optionsMap?.ticket?.priority?.map((p: string) => (
                    <option key={p} value={p} style={{ color: '#333' }}>{p}</option>
                  ))}
                </select>
              </th>
              <th>Status</th>
              <th>Raised By</th>
              <th
                onClick={() => dateRange === 'All' && toggleSort('Date')}
                style={{ cursor: dateRange === 'All' ? 'pointer' : 'default', userSelect: 'none', minWidth: '180px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {dateRange === 'All' && getSortIcon('Date')}
                  <div onClick={(e) => e.stopPropagation()} style={{ flex: 1 }}>
                    <select
                      className="premium-table-filter"
                      value={dateRange}
                      onChange={(e) => {
                        setDateRange(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary-color)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        outline: 'none',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.025em',
                        width: '100%',
                        padding: 0
                      }}
                    >
                      <option value="All" style={{ color: '#333' }}>Date Raised</option>
                      <option value="7days" style={{ color: '#333' }}>Last 7 Days</option>
                      <option value="30days" style={{ color: '#333' }}>Last 30 Days</option>
                      <option value="thisMonth" style={{ color: '#333' }}>This Month</option>
                      <option value="thisYear" style={{ color: '#333' }}>This Year</option>
                      <option value="custom" style={{ color: '#333' }}>Custom Range</option>
                    </select>
                    {dateRange === 'custom' && (
                      <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                        <input
                          type="date"
                          className="premium-compact-input"
                          value={customStartDate}
                          onChange={(e) => {
                            setCustomStartDate(e.target.value);
                            setCurrentPage(1);
                          }}
                          style={{ fontSize: '0.65rem', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'white' }}
                        />
                        <input
                          type="date"
                          className="premium-compact-input"
                          value={customEndDate}
                          onChange={(e) => {
                            setCustomEndDate(e.target.value);
                            setCurrentPage(1);
                          }}
                          style={{ fontSize: '0.65rem', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'white' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody style={{ opacity: fetchingTickets ? 0.6 : 1, transition: 'opacity 0.2s ease-in-out' }}>
            {tickets.map((tkt: any) => (
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
            {tickets.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  {fetchingTickets ? 'Updating tickets...' : 'No tickets found matching your search.'}
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
                      )) || (
                          <>
                            <option value="Open">Open</option>
                            <option value="In_Progress">In Progress</option>
                            {hasPermission(PERMISSIONS.TICKETS_DELETE) && <option value="Closed">Closed</option>}
                          </>
                        )}
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

export default function TicketsPage() {
  return (
    <NuqsAdapter>
      <React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div></div>}>
        <Tickets />
      </React.Suspense>
    </NuqsAdapter>
  );
}