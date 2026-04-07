'use client';

import React, { useEffect, useState } from 'react';
import { fetchLeads, convertLeadToQuotation, cancelItem, createLead, updateLeadDetails, fetchProducts, fetchLeadSources, fetchUsers } from '@/utils/api';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@/utils/dateUtils';
import { useOptions } from '@/context/OptionsContext';
import { X, ArrowRight, Loader2, Search, Zap, CheckCircle, XCircle, Users, ArrowUpDown, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import DateInput from '@/components/DateInput';
import ClientAutocomplete from '@/components/ClientAutocomplete';
import HierarchicalProductSelector from '@/components/HierarchicalProductSelector';
import ClientFields from '@/components/ClientFields';
import { useSearchParams } from 'next/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { formatPhoneNumber } from '@/utils/countries';

const Leads = () => {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ New: 0, 'In Progress': 0, Converted: 0, Cancelled: 0 });
  const [products, setProducts] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const { optionsMap } = useOptions();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [fetchingLeads, setFetchingLeads] = useState(false);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [assignedUserFilter, setAssignedUserFilter] = useState('All');

  // Initialize from search params
  const initialStartDate = searchParams.get('startDate') || '';
  const initialEndDate = searchParams.get('endDate') || '';
  const [dateRange, setDateRange] = useState(initialStartDate ? 'custom' : 'All');
  const [customStartDate, setCustomStartDate] = useState(initialStartDate);
  const [customEndDate, setCustomEndDate] = useState(initialEndDate);
  const [sortBy, setSortBy] = useState('Newest');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // ... other state ...
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [selectedDetailLead, setSelectedDetailLead] = useState<any | null>(null);
  const [converting, setConverting] = useState(false);

  const [selectedCancelLead, setSelectedCancelLead] = useState<any | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editLeadId, setEditLeadId] = useState<string | null>(null);
  const [addingLead, setAddingLead] = useState(false);

  const [clientSearchName, setClientSearchName] = useState('');
  const [productSearchName, setProductSearchName] = useState('');

  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    Company_Name: '',
    Company_No: '',
    Client_Name: '',
    Contact_Number: '',
    Email: '',
    Location: '',
    Description: ''
  });

  const [addLeadData, setAddLeadData] = useState({
    Client_Reference: '',
    Product_Reference: '',
    Source_Reference: '',
    Assigned_User: '',
    Lead_Status: 'New',
    Inquiry_Date: new Date().toISOString().split('T')[0],
    Notes: ''
  });

  const [convertData, setConvertData] = useState({
    Client_Reference: '',
    Product_Reference: '',
    Requirement: '',
    Project_Scope_Description: '',
    Commercial: '',
    Timeline: '',
    Payment_Terms: '',
    Other_Terms: '',
    Letterhead: 'No',
    Sent_Via: 'Email',
    Followup_Notification: true
  });

  const openConvertModal = (lead: any) => {
    setSelectedLead(lead);
    setConvertData({
      Client_Reference: lead.Client_Reference?._id || '',
      Product_Reference: lead.Product_Reference?._id || '',
      Requirement: lead.Notes || '',
      Project_Scope_Description: '',
      Commercial: '',
      Timeline: '',
      Payment_Terms: '',
      Other_Terms: '',
      Letterhead: 'No',
      Sent_Via: 'Email',
      Followup_Notification: true
    });
  };

  const loadInitialData = async () => {
    try {
      const [productsData, sourcesData, usersData] = await Promise.all([
        fetchProducts({ active: true }),
        fetchLeadSources({ active: true }),
        fetchUsers({ active: true })
      ]);
      setProducts(productsData.products);
      setSources(sourcesData.sources);
      setUsers(usersData.users);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchLeadsData = async () => {
    setFetchingLeads(true);
    try {
      let startDate: string | undefined;
      let endDate: string | undefined;
      const now = new Date();
      if (dateRange === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString().split('T')[0];
      } else if (dateRange === '30days') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString().split('T')[0];
      } else if (dateRange === 'thisMonth') {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = d.toISOString().split('T')[0];
      } else if (dateRange === 'thisYear') {
        const d = new Date(now.getFullYear(), 0, 1);
        startDate = d.toISOString().split('T')[0];
      } else if (dateRange === 'custom') {
        startDate = customStartDate;
        endDate = customEndDate;
      }

      const result = await fetchLeads({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm,
        status: statusFilter,
        assignedUser: assignedUserFilter !== 'All' ? assignedUserFilter : undefined,
        sortBy: sortBy,
        startDate,
        endDate
      });
      setLeads(result.leads);
      setTotalItems(result.totalItems);
      setStatusCounts(result.statusCounts);
    } catch (err: any) {
      toast.error('Error fetching leads: ' + err.message);
    } finally {
      setFetchingLeads(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    fetchLeadsData();
  }, [currentPage, statusFilter, sortBy, dateRange, customStartDate, customEndDate, assignedUserFilter]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) setCurrentPage(1);
      else fetchLeadsData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filter changes (already handled by dependencies, but explicit is better)
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, sortBy, dateRange, customStartDate, customEndDate, assignedUserFilter]);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    if (!convertData.Product_Reference) {
      toast.error('Product/Service is required.');
      return;
    }
    if (!convertData.Requirement || convertData.Requirement.length < 10) {
      toast.error('Requirement description must be at least 10 characters.');
      return;
    }
    if (parseFloat(convertData.Commercial) <= 0) {
      toast.error('Commercial value must be greater than 0.');
      return;
    }

    setConverting(true);
    try {
      await convertLeadToQuotation(selectedLead._id, convertData);
      setSelectedLead(null);
      toast.success('Lead converted to Quotation successfully!');
      fetchLeadsData();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setConverting(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCancelLead) return;

    setCanceling(true);
    try {
      await cancelItem('lead', selectedCancelLead._id, cancelReason);
      setSelectedCancelLead(null);
      toast.success('Lead cancelled and archived.');
      fetchLeadsData();
    } catch (err: any) {
      toast.error('Error canceling lead: ' + err.message);
    } finally {
      setCanceling(false);
    }
  };

  const handleAddModalClose = () => {
    setIsAddModalOpen(false);
    setEditLeadId(null);
    setClientSearchName('');
    setProductSearchName('');
    setAddLeadData({
      Client_Reference: '',
      Product_Reference: '',
      Source_Reference: '',
      Assigned_User: '',
      Lead_Status: 'New',
      Inquiry_Date: new Date().toISOString().split('T')[0],
      Notes: ''
    });
    setIsNewClient(false);
    setNewClientData({
      Company_Name: '',
      Company_No: '',
      Client_Name: '',
      Contact_Number: '',
      Email: '',
      Location: '',
      Description: ''
    });
  };



  const handleClientSelect = (client: any) => {
    setAddLeadData({
      ...addLeadData,
      Client_Reference: client._id
    });
    setClientSearchName(client.Client_Name);
    toast.success(`Client "${client.Client_Name}" selected!`);
  };

  const handleProductSelect = (product: any) => {
    setAddLeadData({
      ...addLeadData,
      Product_Reference: product._id,
      Assigned_User: product.Assigned_User?._id || product.Assigned_User || addLeadData.Assigned_User
    });
    setProductSearchName([product.Type, product.SubType, product.SubSubType].filter(Boolean).join(' > '));
    toast.success(`Service "${product.SubSubType || product.SubType || product.Type}" selected!`);
  };

  const handleConvertProductSelect = (product: any) => {
    setConvertData({
      ...convertData,
      Product_Reference: product._id
    });
    setProductSearchName([product.Type, product.SubType, product.SubSubType].filter(Boolean).join(' > '));
    toast.success(`Service "${product.SubSubType || product.SubType || product.Type}" selected!`);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isNewClient && !addLeadData.Client_Reference) {
      toast.error('Please select a valid Client.');
      return;
    }
    if (isNewClient && !newClientData.Company_Name) {
      toast.error('Company Name is required for New Client.');
      return;
    }
    if (!addLeadData.Product_Reference) {
      toast.error('Please select a Product/Service.');
      return;
    }
    if (!addLeadData.Source_Reference) {
      toast.error('Please select a Lead Source.');
      return;
    }

    setAddingLead(true);

    let statusChangedToCancel = false;
    let statusChangedToConvert = false;
    let originalLead = null;
    let dataToSubmit: any = { ...addLeadData };

    if (isNewClient) {
      dataToSubmit.newClientData = newClientData;
      delete dataToSubmit.Client_Reference;
    }

    if (editLeadId) {
      originalLead = leads.find((l: any) => l._id === editLeadId);
      const originalStatus = originalLead?.Lead_Status || 'New';
      const newStatus = addLeadData.Lead_Status;
      const isCanceling = newStatus.toLowerCase().includes('cancel') || newStatus.toLowerCase().includes('reject');
      const isConverting = newStatus === 'Converted';

      statusChangedToCancel = isCanceling && originalStatus !== newStatus;
      statusChangedToConvert = isConverting && originalStatus !== newStatus;

      if (statusChangedToCancel) {
        dataToSubmit.Lead_Status = originalStatus;
      }
    }

    try {
      if (editLeadId) {
        await updateLeadDetails(editLeadId, dataToSubmit);
        toast.success('Lead updated successfully!');
      } else {
        await createLead(dataToSubmit);
        toast.success('Lead added successfully!');
      }
      handleAddModalClose();
      fetchLeadsData();

      if (statusChangedToCancel && originalLead) {
        setSelectedCancelLead(originalLead);
        setCancelReason('');
      }

      if (statusChangedToConvert && originalLead) {
        openConvertModal(originalLead);
      }
    } catch (err: any) {
      toast.error('Error saving lead: ' + err.message);
    } finally {
      setAddingLead(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div>
      <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading leads...</p>
    </div>
  );
  if (error) return <div className="text-secondary bg-red-900/20 p-4 rounded-lg text-red-500">Error: {error}</div>;

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedLeads = leads;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users className="text-blue-500" />
            Leads
          </h1>
          <div className="search-wrapper" style={{ minWidth: '400px', marginBottom: 0 }}>
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by ID, Company, Product..."
              className="premium-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.6rem 1rem 0.6rem 2.8rem', borderRadius: '10px', fontSize: '0.95rem' }}
            />
          </div>
        </div>
        {hasPermission(PERMISSIONS.LEADS_CREATE) && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Add Lead
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'New Leads', key: 'New', count: statusCounts.New, color: '#64748b', bgColor: 'rgba(100, 116, 139, 0.1)', icon: <Users size={22} /> },
          { label: 'In Progress', key: 'In Progress', count: statusCounts['In Progress'], color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', icon: <Zap size={22} /> },
          { label: 'Converted', key: 'Converted', count: statusCounts.Converted, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', icon: <CheckCircle size={22} /> },
          { label: 'Cancelled', key: 'Cancelled', count: statusCounts.Cancelled, color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', icon: <XCircle size={22} /> }
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
                ? `inset 0 0 0 2px ${block.color}, 0 10px 15px -3px ${block.bgColor}44`
                : `inset 0 0 0 1px var(--border-color)`,
              transition: 'all 0.3s ease',
            }}
            onClick={() => setStatusFilter(statusFilter === block.key ? 'All' : block.key)}
          >
            <div style={{
              backgroundColor: block.bgColor,
              padding: '0.85rem',
              borderRadius: '14px',
              color: block.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 6px -1px rgba(0,0,0,0.05)`
            }}>
              {block.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, lineHeight: 1, color: 'var(--text-primary)' }}>{block.count}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.25rem', letterSpacing: '0.025em' }}>{block.label}</p>
            </div>
          </div>
        ))}
      </div>


      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th
                onClick={() => setSortBy(sortBy === 'ID-ASC' ? 'ID-DESC' : 'ID-ASC')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ID {sortBy === 'ID-ASC' ? <ChevronUp size={14} /> : sortBy === 'ID-DESC' ? <ChevronDown size={14} /> : <ArrowUpDown size={14} />}
                </div>
              </th>
              <th
                onClick={() => setSortBy(sortBy === 'Company-A-Z' ? 'Company-Z-A' : 'Company-A-Z')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Company {sortBy === 'Company-A-Z' ? <ChevronUp size={14} /> : sortBy === 'Company-Z-A' ? <ChevronDown size={14} /> : <ArrowUpDown size={14} />}
                </div>
              </th>
              <th>Product / Service</th>
              <th>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Assigned To</span>
                  <select
                    className="premium-table-filter"
                    value={assignedUserFilter}
                    onChange={(e) => setAssignedUserFilter(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary-color)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none',
                      fontSize: '0.75rem',
                      padding: 0,
                      marginTop: '0.2rem'
                    }}
                  >
                    <option value="All">All Users</option>
                    {users.map(u => (
                      <option key={u._id} value={u._id}>{u.Name}</option>
                    ))}
                  </select>
                </div>
              </th>
              <th>Status</th>
              <th
                onClick={() => dateRange === 'All' && setSortBy(sortBy === 'Newest' ? 'Oldest' : 'Newest')}
                style={{ cursor: dateRange === 'All' ? 'pointer' : 'default', userSelect: 'none', minWidth: '180px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {dateRange === 'All' && (sortBy === 'Newest' ? <ChevronDown size={14} className="mr-1" /> : sortBy === 'Oldest' ? <ChevronUp size={14} className="mr-1" /> : <ArrowUpDown size={14} className="mr-1" />)}
                  <div onClick={(e) => e.stopPropagation()} style={{ flex: 1 }}>
                    <select
                      className="premium-table-filter"
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
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
                      <option value="All" style={{ color: '#333' }}>Inquiry Date</option>
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
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          style={{ fontSize: '0.65rem', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'white' }}
                        />
                        <input
                          type="date"
                          className="premium-compact-input"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          style={{ fontSize: '0.65rem', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'white' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedLeads.map((lead: any) => (
              <tr
                key={lead._id}
                onClick={() => setSelectedDetailLead(lead)}
                style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
              >
                <td><span className="font-semibold text-primary">{lead.Lead_ID}</span></td>
                <td>
                  <div className="font-medium text-primary">{lead.Client_Reference?.Company_Name || '-'}</div>
                </td>
                <td>
                  <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'row' }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                      {[lead.Product_Reference?.Type, lead.Product_Reference?.SubType].filter(Boolean).join(' / ')}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>&nbsp;/&nbsp;</span>
                    <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                      {lead.Product_Reference?.SubSubType || lead.Product_Reference?.SubType || lead.Product_Reference?.Type || '-'}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="font-medium text-primary">
                    {lead.Assigned_User ? lead.Assigned_User.Name : <span className="text-secondary italic" style={{ fontSize: '0.8rem' }}>Unassigned</span>}
                  </div>
                </td>
                <td>
                  <span className={`badge ${lead.Lead_Status === 'Converted' ? 'badge-green' : lead.Lead_Status === 'In Progress' ? 'badge-blue' : lead.Lead_Status === 'New' ? 'badge-gray' : 'badge-red'}`}>
                    {lead.Lead_Status}
                  </span>
                </td>
                <td>{formatDateDDMMYYYY(lead.Inquiry_Date)}</td>
              </tr>
            ))}
            {paginatedLeads.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  {fetchingLeads ? 'Updating leads...' : 'No leads found matching your search.'}
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
        itemName="leads"
      />

      {/* Details Modal */}
      {selectedDetailLead && (
        <div className="modal-overlay" onClick={() => setSelectedDetailLead(null)}>
          <div className="modal-content" style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{selectedDetailLead.Client_Reference?.Company_Name || 'Unknown Company'}</h2>
                <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0 }}>Lead ID: {selectedDetailLead.Lead_ID}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedDetailLead(null)}><X size={24} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>Client Information</h3>
                <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div><strong className="text-secondary">Contact Person:</strong> {selectedDetailLead.Client_Reference?.Client_Name || '-'}</div>
                  <div><strong className="text-secondary">Email:</strong> {selectedDetailLead.Client_Reference?.Email ? <a href={`mailto:${selectedDetailLead.Client_Reference.Email}`} className="text-primary hover:underline">{selectedDetailLead.Client_Reference.Email}</a> : '-'}</div>
                  <div><strong className="text-secondary">Phone:</strong> {formatPhoneNumber(selectedDetailLead.Client_Reference?.Contact_Number)}</div>
                  <div><strong className="text-secondary">GST/PAN No:</strong> {selectedDetailLead.Client_Reference?.Company_No || '-'}</div>
                  <div><strong className="text-secondary">Location:</strong> {selectedDetailLead.Client_Reference?.Location || '-'}</div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>Lead Details</h3>
                <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div>
                    <strong className="text-secondary">Service Required:</strong>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', marginLeft: '0.5rem', verticalAlign: 'top' }}>
                      <span style={{ fontSize: '0.65rem', color: '#43474dff', textTransform: 'uppercase', fontWeight: 500 }}>
                        {[selectedDetailLead.Product_Reference?.Type, selectedDetailLead.Product_Reference?.SubType, selectedDetailLead.Product_Reference?.SubSubType].filter(Boolean).join(' / ')}
                      </span>
                    </div>
                  </div>
                  <div><strong className="text-secondary">Source:</strong> {selectedDetailLead.Source_Reference?.Source_Name || '-'}</div>
                  <div><strong className="text-secondary">Assigned To:</strong> {selectedDetailLead.Assigned_User ? selectedDetailLead.Assigned_User.Name : <span className="text-secondary italic">Unassigned</span>}</div>
                  <div><strong className="text-secondary">Inquiry Date:</strong> {formatDateDDMMYYYY(selectedDetailLead.Inquiry_Date)}</div>
                  <div>
                    <strong className="text-secondary">Current Status:</strong>{' '}
                    <span className={`badge ${selectedDetailLead.Lead_Status === 'Converted' ? 'badge-green' : selectedDetailLead.Lead_Status === 'In Progress' ? 'badge-blue' : selectedDetailLead.Lead_Status === 'Cancelled' ? 'badge-red' : 'badge-gray'}`}>
                      {selectedDetailLead.Lead_Status}
                    </span>
                  </div>
                  <div><strong className="text-secondary">Last Status Update:</strong> {formatDateTimeDDMMYYYY(selectedDetailLead.Lead_Status_Date_Time)}</div>
                  {selectedDetailLead.Lead_Status === 'Cancelled' && selectedDetailLead.Cancel_Reason && (
                    <div><strong className="text-red-500">Cancel Reason:</strong> {selectedDetailLead.Cancel_Reason}</div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '0.75rem' }}>Notes & Requirements</h3>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '0.5rem', fontSize: '0.875rem', minHeight: '60px', whiteSpace: 'pre-wrap' }}>
                {selectedDetailLead.Notes || <span className="text-secondary italic">No notes provided.</span>}
              </div>
            </div>

            {selectedDetailLead.Lead_Status !== 'Converted' && selectedDetailLead.Lead_Status !== 'Cancelled' && (
              <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {hasPermission(PERMISSIONS.LEADS_DELETE) && (
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.5rem 1rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'transparent' }}
                      onClick={() => {
                        setSelectedCancelLead(selectedDetailLead);
                        setCancelReason('');
                        setSelectedDetailLead(null);
                      }}
                    >
                      Reject Lead
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {hasPermission(PERMISSIONS.LEADS_EDIT) && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditLeadId(selectedDetailLead._id);
                        setClientSearchName(selectedDetailLead.Client_Reference?.Company_Name || '');
                        setProductSearchName(selectedDetailLead.Product_Reference ? [selectedDetailLead.Product_Reference.Type, selectedDetailLead.Product_Reference.SubType, selectedDetailLead.Product_Reference.SubSubType].filter(Boolean).join(' > ') : '');
                        setAddLeadData({
                          Client_Reference: selectedDetailLead.Client_Reference?._id || '',
                          Product_Reference: selectedDetailLead.Product_Reference?._id || '',
                          Source_Reference: selectedDetailLead.Source_Reference?._id || '',
                          Assigned_User: selectedDetailLead.Assigned_User?._id || '',
                          Lead_Status: selectedDetailLead.Lead_Status || 'New',
                          Inquiry_Date: selectedDetailLead.Inquiry_Date ? new Date(selectedDetailLead.Inquiry_Date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                          Notes: selectedDetailLead.Notes || ''
                        });
                        setSelectedDetailLead(null);
                        setIsAddModalOpen(true);
                      }}
                    >
                      Edit Details
                    </button>
                  )}
                  {selectedDetailLead.Lead_Status !== 'Converted' && selectedDetailLead.Lead_Status !== 'Cancelled' && hasPermission(PERMISSIONS.LEADS_CONVERT) && hasPermission(PERMISSIONS.QUOTATIONS_CREATE) && (
                    <button
                      className="btn btn-success"
                      style={{ padding: '0.5rem 1rem' }}
                      onClick={() => {
                        openConvertModal(selectedDetailLead);
                        setProductSearchName(selectedDetailLead.Product_Reference ? [selectedDetailLead.Product_Reference.Type, selectedDetailLead.Product_Reference.SubType, selectedDetailLead.Product_Reference.SubSubType].filter(Boolean).join(' > ') : '');
                        setSelectedDetailLead(null);
                      }}
                    >
                      Convert to Quotation <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Convert Modal */}
      {selectedLead && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2>Convert to Quotation</h2>
              <button className="modal-close" onClick={() => setSelectedLead(null)}><X size={20} /></button>
            </div>

            <form onSubmit={handleConvert}>
              <div style={{ marginBottom: '1rem', padding: '0.5rem 1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--primary-color)' }}>Converting Lead: <strong>{selectedLead.Lead_ID} ({selectedLead.Client_Reference?.Company_Name})</strong></p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Product/Service Name *</label>
                  <HierarchicalProductSelector
                    value={convertData.Product_Reference}
                    onSelect={handleConvertProductSelect}
                    placeholder="Choose category..."
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Commercial Amount *</label>
                  <input type="number" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={convertData.Commercial} onChange={e => setConvertData({ ...convertData, Commercial: e.target.value })} placeholder="e.g. 5000" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Client</label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    className="form-input bg-slate-100"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', color: '#64748b' }}
                    value={selectedLead.Client_Reference?.Company_Name || 'Unknown Client'}
                    title="Client Reference is permanently linked from the Lead."
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 3' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Requirements</label>
                      <textarea className="form-textarea" style={{ minHeight: '60px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={convertData.Requirement} onChange={e => setConvertData({ ...convertData, Requirement: e.target.value })} placeholder="Client requirements..." />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Project Scope Description</label>
                      <textarea className="form-textarea" style={{ minHeight: '60px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={convertData.Project_Scope_Description} onChange={e => setConvertData({ ...convertData, Project_Scope_Description: e.target.value })} placeholder="Detailed scope of work..." />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Timeline</label>
                  <input type="text" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={convertData.Timeline} onChange={e => setConvertData({ ...convertData, Timeline: e.target.value })} placeholder="e.g. 4 Weeks" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Payment Terms</label>
                  <input type="text" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={convertData.Payment_Terms} onChange={e => setConvertData({ ...convertData, Payment_Terms: e.target.value })} placeholder="e.g. 50% Advance" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Other Terms</label>
                  <input type="text" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={convertData.Other_Terms} onChange={e => setConvertData({ ...convertData, Other_Terms: e.target.value })} placeholder="Any additional terms..." />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Letterhead Required?</label>
                  <select className="form-select" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={convertData.Letterhead} onChange={e => setConvertData({ ...convertData, Letterhead: e.target.value })}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Sent Via</label>
                  <select className="form-select" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={convertData.Sent_Via} onChange={e => setConvertData({ ...convertData, Sent_Via: e.target.value })}>
                    <option value="Email">Email</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedLead(null)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={converting}>
                  {converting ? <><Loader2 size={16} className="animate-spin" /> Converting...</> : 'Save & Convert Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Lead Modal */}
      {selectedCancelLead && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '95%', padding: '1.5rem' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2 className="text-red-500 flex items-center gap-2" style={{ fontSize: '1.2rem' }}>Cancel Lead</h2>
              <button className="modal-close" onClick={() => setSelectedCancelLead(null)}><X size={20} /></button>
            </div>

            <form onSubmit={handleCancelSubmit}>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <p style={{ fontSize: '0.85rem', color: '#ef4444', marginBottom: '0.25rem' }}>Canceling Lead: <strong>{selectedCancelLead.Lead_ID} ({selectedCancelLead.Client_Reference?.Company_Name})</strong></p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>This action will permanently move the lead to Archives.</p>
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
                  placeholder="Explain why this lead is being canceled (e.g., Not interested, Unresponsive)..."
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedCancelLead(null)}>Go Back</button>
                <button type="submit" className="btn btn-secondary" style={{ backgroundColor: '#ef4444', color: 'white', borderColor: '#ef4444' }} disabled={canceling}>
                  {canceling ? <><Loader2 size={16} className="animate-spin" /> Canceling...</> : 'Cancel Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add/Edit Lead Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2>{editLeadId ? 'Edit Lead' : 'Add New Lead'}</h2>
              <button className="modal-close" onClick={handleAddModalClose}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', margin: 0 }}>Client *</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      {!editLeadId && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, color: isNewClient ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                          <input
                            type="checkbox"
                            checked={isNewClient}
                            onChange={(e) => setIsNewClient(e.target.checked)}
                            style={{ width: '14px', height: '14px' }}
                          />
                          New Client?
                        </label>
                      )}
                    </div>
                  </div>
                  {!isNewClient ? (
                    <>
                      <ClientAutocomplete
                        value={clientSearchName}
                        onChange={(val) => setClientSearchName(val)}
                        onSelect={handleClientSelect}
                        placeholder="Search client by name or ID..."
                      />
                      {addLeadData.Client_Reference && !clientSearchName.includes("Selected") && (
                        <div className="text-xs text-green-600 mt-1">✓ Client Linked</div>
                      )}
                    </>
                  ) : (
                    <ClientFields
                      values={newClientData}
                      onChange={(field, value) => setNewClientData({ ...newClientData, [field]: value })}
                    />
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Product / Service *</label>
                  <HierarchicalProductSelector
                    value={addLeadData.Product_Reference}
                    onSelect={handleProductSelect}
                    placeholder="Choose category..."
                  />
                  {addLeadData.Product_Reference && !productSearchName.includes("Selected") && (
                    <div className="text-xs text-green-600 mt-1">✓ Service Linked</div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Lead Source *</label>
                  <select
                    required
                    className="form-select"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={addLeadData.Source_Reference}
                    onChange={e => setAddLeadData({ ...addLeadData, Source_Reference: e.target.value })}
                  >
                    <option value="" disabled>Select a lead source...</option>
                    {sources.map((s) => (
                      <option key={s._id} value={s._id}>{s.Source_Name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Inquiry Date *</label>
                  <DateInput
                    required
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={addLeadData.Inquiry_Date}
                    onChange={val => setAddLeadData({ ...addLeadData, Inquiry_Date: val })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Assigned To</label>
                  <select
                    className="form-select"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={addLeadData.Assigned_User}
                    onChange={e => setAddLeadData({ ...addLeadData, Assigned_User: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>{u.Name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Status</label>
                  <select
                    className="form-select"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={addLeadData.Lead_Status}
                    onChange={e => {
                      const newStatus = e.target.value;
                      const isCanceling = newStatus === 'Cancelled' || newStatus === 'Rejected';
                      const isConverting = newStatus === 'Converted';

                      if (isConverting && editLeadId) {
                        const originalLead = leads.find((l: any) => l._id === editLeadId);
                        if (originalLead) {
                          openConvertModal(originalLead);
                          handleAddModalClose();
                          return;
                        }
                      }

                      if (isCanceling && editLeadId) {
                        const originalLead = leads.find((l: any) => l._id === editLeadId);
                        if (originalLead) {
                          setSelectedCancelLead(originalLead);
                          setCancelReason('');
                          handleAddModalClose();
                          return;
                        }
                      }

                      setAddLeadData({ ...addLeadData, Lead_Status: newStatus });
                    }}
                  >
                    {optionsMap?.leadStatuses?.filter((status: string) => {
                      if (!hasPermission(PERMISSIONS.LEADS_DELETE)) {
                        const s = status.toLowerCase();
                        return !s.includes('cancel') && !s.includes('reject');
                      }
                      return true;
                    }).map((status: string) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div style={{ ...{ marginBottom: 0 }, gridColumn: 'span 1' }} />

                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Notes</label>
                  <textarea className="form-textarea" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} rows={3} value={addLeadData.Notes} onChange={e => setAddLeadData({ ...addLeadData, Notes: e.target.value })} placeholder="Any initial notes or requirements..." />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleAddModalClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addingLead}>
                  {addingLead ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : editLeadId ? 'Update Lead' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default function LeadsPage() {
  return (
    <React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div></div>}>
      <Leads />
    </React.Suspense>
  );
}
