'use client';

import React, { useEffect, useState, useRef } from 'react';
import { fetchQuotations, convertQuotationToProject, cancelItem, updateQuotationDetails, addQuotationFollowUp, fetchLeads, createQuotation, fetchProducts } from '@/utils/api';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@/utils/dateUtils';
import { useOptions } from '@/context/OptionsContext';
import { X, ArrowRight, Loader2, MessageCircle, Search, FileText, CheckCircle, XCircle, CircleFadingPlus, MessageSquare, ArrowBigRightDashIcon, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import DateInput from '@/components/DateInput';
import ClientAutocomplete from '@/components/ClientAutocomplete';
import HierarchicalProductSelector from '@/components/HierarchicalProductSelector';
import ClientFields from '@/components/ClientFields';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { useQueryState, parseAsString, parseAsInteger } from 'nuqs';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

const Quotations = () => {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const { optionsMap } = useOptions();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [fetchingQuotations, setFetchingQuotations] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // --- NUQS STATE MANAGEMENT ---
  const [searchTerm, setSearchTerm] = useQueryState('q', parseAsString.withDefault(''));
  const [localSearch, setLocalSearch] = useState(searchTerm); // For smooth typing debounce

  const [statusFilter, setStatusFilter] = useQueryState('status', parseAsString.withDefault('All'));
  const [commRange, setCommRange] = useQueryState('comm', parseAsString.withDefault('All'));
  const [dateRange, setDateRange] = useQueryState('range', parseAsString.withDefault('All'));
  const [customStartDate, setCustomStartDate] = useQueryState('startDate', parseAsString.withDefault(''));
  const [customEndDate, setCustomEndDate] = useQueryState('endDate', parseAsString.withDefault(''));
  const [sortBy, setSortBy] = useQueryState('sort', parseAsString.withDefault('Newest'));
  const [currentPage, setCurrentPage] = useQueryState('page', parseAsInteger.withDefault(1));

  const [totalItems, setTotalItems] = useState(0);
  const [statusCounts, setStatusCounts] = useState({
    Sent: 0,
    'Follow-up': 0,
    Approved: 0,
    Rejected: 0,
    Converted: 0
  });
  const ITEMS_PER_PAGE = 20;

  // ... other state ...
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);
  const [selectedDetailQuotation, setSelectedDetailQuotation] = useState<any | null>(null);
  const [converting, setConverting] = useState(false);

  const [selectedCancelQuotation, setSelectedCancelQuotation] = useState<any | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [selectedFollowUpQuotation, setSelectedFollowUpQuotation] = useState<any | null>(null);
  const [followingUp, setFollowingUp] = useState(false);
  const [followUpData, setFollowUpData] = useState({
    Remarks: '',
    Outcome: 'Pending'
  });

  const [convertData, setConvertData] = useState({
    Client_Reference: '',
    Product_Reference: '',
    Project_Name: '',
    Priority: 'Normal',
    Assigned_Person: '',
    Report_Type: 'Overview',
    Costing: 0,
    Start_Date: '',
    End_Date: ''
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editQuotationId, setEditQuotationId] = useState<string | null>(null);
  const [editingQuotation, setEditingQuotation] = useState(false);
  const [editQuotationData, setEditQuotationData] = useState({
    Client_Reference: '',
    Product_Reference: '',
    Quotation_Status: 'Pending',
    Commercial: '',
    Client_Info: '',
    Requirement: '',
    Project_Scope_Description: '',
    Timeline: '',
    Payment_Terms: '',
    Other_Terms: '',
    Letterhead: 'No',
    Sent_Via: 'Email',
    Followup_Notification: false
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addingQuotation, setAddingQuotation] = useState(false);
  const [addQuotationData, setAddQuotationData] = useState({
    Lead_ID: '',
    Client_Reference: '',
    Product_Reference: '',
    Commercial: '',
    Client_Info: '',
    Requirement: '',
    Project_Scope_Description: '',
    Timeline: '',
    Payment_Terms: '',
    Other_Terms: '',
    Letterhead: 'No',
    Sent_Via: 'Email',
    Quotation_Status: 'Sent',
    Followup_Notification: true
  });

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

  // --- SEARCH DEBOUNCE LOGIC ---
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (localSearch !== searchTerm) {
        setSearchTerm(localSearch || null);
        setCurrentPage(1); // Reset page only when typing pauses
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [localSearch, searchTerm, setSearchTerm, setCurrentPage]);

  // Sync dateRange if we navigate with custom dates
  useEffect(() => {
    if (customStartDate && dateRange !== 'custom') {
      setDateRange('custom');
    }
  }, [customStartDate, dateRange, setDateRange]);

  // --- ABORT CONTROLLER FETCH LOGIC ---
  useEffect(() => {
    const controller = new AbortController();

    const fetchQuotationsData = async () => {
      setFetchingQuotations(true);
      try {
        let minComm: number | undefined;
        let maxComm: number | undefined;
        if (commRange === '0-25k') { minComm = 0; maxComm = 25000; }
        else if (commRange === '25k-50k') { minComm = 25000; maxComm = 50000; }
        else if (commRange === '50k-100k') { minComm = 50000; maxComm = 100000; }
        else if (commRange === '100k-500k') { minComm = 100000; maxComm = 500000; }
        else if (commRange === '500k+') { minComm = 500000; }

        let startDate: string | undefined;
        let endDate: string | undefined;
        const now = new Date();
        if (dateRange === '7days') {
          const d = new Date(); d.setDate(d.getDate() - 7); startDate = d.toISOString().split('T')[0];
        } else if (dateRange === '30days') {
          const d = new Date(); d.setDate(d.getDate() - 30); startDate = d.toISOString().split('T')[0];
        } else if (dateRange === 'thisMonth') {
          const d = new Date(now.getFullYear(), now.getMonth(), 1); startDate = d.toISOString().split('T')[0];
        } else if (dateRange === 'thisYear') {
          const d = new Date(now.getFullYear(), 0, 1); startDate = d.toISOString().split('T')[0];
        } else if (dateRange === 'custom') {
          startDate = customStartDate; endDate = customEndDate;
        }

        const result = await fetchQuotations({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: searchTerm,
          status: statusFilter,
          sortBy: sortBy,
          minComm,
          maxComm,
          startDate,
          endDate
        });

        if (controller.signal.aborted) return;

        setQuotations(result.quotations);
        setTotalItems(result.totalItems);
        setStatusCounts(result.statusCounts);
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setError(err.message);
        toast.error('Error fetching quotations: ' + err.message);
      } finally {
        if (!controller.signal.aborted) {
          setFetchingQuotations(false);
          setLoading(false);
        }
      }
    };

    fetchQuotationsData();

    return () => controller.abort();
  }, [currentPage, searchTerm, statusFilter, sortBy, commRange, dateRange, customStartDate, customEndDate, refreshTrigger]);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const handleClientSelect = (client: any) => {
    if (isAddModalOpen) {
      setAddQuotationData({ ...addQuotationData, Client_Reference: client._id });
      setClientSearchName(client.Client_Name);
    } else if (isEditModalOpen) {
      setEditQuotationData({ ...editQuotationData, Client_Reference: client._id });
      setClientSearchName(client.Client_Name);
    }
    toast.success(`Client "${client.Client_Name}" selected!`);
  };

  const handleProductSelect = (product: any) => {
    if (isAddModalOpen) {
      setAddQuotationData({ ...addQuotationData, Product_Reference: product._id });
      setProductSearchName([product.Type, product.SubType, product.SubSubType].filter(Boolean).join(' > '));
    } else if (isEditModalOpen) {
      setEditQuotationData({ ...editQuotationData, Product_Reference: product._id });
      setProductSearchName([product.Type, product.SubType, product.SubSubType].filter(Boolean).join(' > '));
    }
    toast.success(`Service "${product.SubSubType || product.SubType || product.Type}" selected!`);
  };

  const handleConvertProductSelect = (product: any) => {
    setConvertData({ ...convertData, Product_Reference: product._id });
    setProductSearchName([product.Type, product.SubType, product.SubSubType].filter(Boolean).join(' > '));
  };

  const loadLeadsData = async () => {
    try {
      const response = await fetchLeads();
      setLeads(response.leads.filter((l: any) => l.Lead_Status !== 'Cancelled'));
    } catch (err: any) {
      toast.error('Error fetching leads: ' + err.message);
    }
  };

  // Load static master data once on mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsData = await fetchProducts({ active: true });
        setProducts(productsData.products);
      } catch (err: any) {
        console.error('Error loading products:', err);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedQuotation) {
      setProductSearchName(selectedQuotation.Product_Reference ? [selectedQuotation.Product_Reference.Type, selectedQuotation.Product_Reference.SubType, selectedQuotation.Product_Reference.SubSubType].filter(Boolean).join(' > ') : '');
      setConvertData({
        Client_Reference: selectedQuotation.Client_Reference?._id || selectedQuotation.Lead_ID?.Client_Reference?._id || '',
        Product_Reference: selectedQuotation.Product_Reference?._id || '',
        Project_Name: selectedQuotation.Client_Reference?.Company_Name || selectedQuotation.Lead_ID?.Client_Reference?.Company_Name || '',
        Priority: 'Normal',
        Assigned_Person: '',
        Report_Type: 'Overview',
        Costing: selectedQuotation.Commercial || 0,
        Start_Date: new Date().toISOString().split('T')[0],
        End_Date: ''
      });
    }
  }, [selectedQuotation]);

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuotation) return;

    if (!convertData.Project_Name || convertData.Project_Name.length < 3) {
      toast.error('Project Name must be at least 3 characters.');
      return;
    }
    if (convertData.Costing < 0) {
      toast.error('Costing cannot be negative.');
      return;
    }
    if (convertData.Start_Date && convertData.End_Date && new Date(convertData.End_Date) < new Date(convertData.Start_Date)) {
      toast.error('End Date cannot be before Start Date.');
      return;
    }

    setConverting(true);
    try {
      await convertQuotationToProject(selectedQuotation._id, convertData);
      setSelectedQuotation(null);
      toast.success('Quotation converted to Project successfully!');
      triggerRefresh();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setConverting(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCancelQuotation) return;

    setCanceling(true);
    try {
      await cancelItem('quotation', selectedCancelQuotation._id, cancelReason);
      setSelectedCancelQuotation(null);
      toast.success('Quotation rejected and archived.');
      triggerRefresh();
    } catch (err: any) {
      toast.error('Error canceling quotation: ' + err.message);
    } finally {
      setCanceling(false);
    }
  };

  const handleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFollowUpQuotation) return;

    if (!followUpData.Remarks || followUpData.Remarks.length < 5) {
      toast.error('Follow-up remarks must be at least 5 characters.');
      return;
    }

    setFollowingUp(true);
    try {
      const isConverted = followUpData.Outcome === 'Converted';
      const isCancelled = followUpData.Outcome === 'Cancelled';
      const quoteToConvert = { ...selectedFollowUpQuotation, Quotation_Status: isConverted ? 'Approved' : isCancelled ? 'Rejected' : 'Follow-up' };

      await addQuotationFollowUp(selectedFollowUpQuotation._id, followUpData);

      setSelectedFollowUpQuotation(null);
      const savedRemarks = followUpData.Remarks;
      setFollowUpData({ Remarks: '', Outcome: 'Pending' });
      toast.success('Follow-up recorded successfully!');
      triggerRefresh();

      if (isConverted) {
        setSelectedQuotation(quoteToConvert);
      }
      if (isCancelled) {
        setSelectedCancelQuotation(selectedFollowUpQuotation);
        setCancelReason(savedRemarks);
      }
    } catch (err: any) {
      toast.error('Error adding follow-up: ' + err.message);
    } finally {
      setFollowingUp(false);
    }
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setEditQuotationId(null);
    setEditQuotationData({
      Client_Reference: '',
      Product_Reference: '',
      Quotation_Status: 'Pending',
      Commercial: '',
      Client_Info: '',
      Requirement: '',
      Project_Scope_Description: '',
      Timeline: '',
      Payment_Terms: '',
      Other_Terms: '',
      Letterhead: 'No',
      Sent_Via: 'Email',
      Followup_Notification: false
    });
    setClientSearchName('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQuotationId) return;

    if (!editQuotationData.Product_Reference) {
      toast.error('Please select a Product/Service.');
      return;
    }
    if (parseFloat(editQuotationData.Commercial) <= 0) {
      toast.error('Commercial value must be greater than 0.');
      return;
    }

    const originalQuotation = quotations.find((q: any) => q._id === editQuotationId);
    const originalStatus = originalQuotation?.Quotation_Status || 'Pending';
    const newStatus = editQuotationData.Quotation_Status;
    const isRejecting = newStatus.toLowerCase().includes('reject') || newStatus.toLowerCase().includes('cancel');
    const statusChangedToReject = isRejecting && originalStatus !== newStatus;
    const isApproving = newStatus === 'Approved';
    const statusChangedToApprove = isApproving && originalStatus !== newStatus;

    setEditingQuotation(true);
    try {
      let dataToUpdate = { ...editQuotationData };
      if (statusChangedToReject) {
        dataToUpdate.Quotation_Status = originalStatus;
      }

      const response = await updateQuotationDetails(editQuotationId, dataToUpdate);
      toast.success('Quotation updated successfully!');
      handleEditModalClose();
      triggerRefresh();

      if (statusChangedToReject && originalQuotation) {
        setSelectedCancelQuotation(originalQuotation);
        setCancelReason('');
      }

      if (statusChangedToApprove && response) {
        setSelectedQuotation(response);
      }
    } catch (err: any) {
      toast.error('Error updating quotation: ' + err.message);
    } finally {
      setEditingQuotation(false);
    }
  };

  const handleAddModalClose = () => {
    setIsAddModalOpen(false);
    setAddQuotationData({
      Lead_ID: '',
      Client_Reference: '',
      Product_Reference: '',
      Commercial: '',
      Client_Info: '',
      Requirement: '',
      Project_Scope_Description: '',
      Timeline: '',
      Payment_Terms: '',
      Other_Terms: '',
      Letterhead: 'No',
      Sent_Via: 'Email',
      Quotation_Status: 'Sent',
      Followup_Notification: true
    });
    setClientSearchName('');
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

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isNewClient && !addQuotationData.Client_Reference && !addQuotationData.Lead_ID) {
      toast.error('Please select a Client or Lead.');
      return;
    }

    if (isNewClient && !newClientData.Company_Name) {
      toast.error('Company Name is required for New Client.');
      return;
    }

    if (!addQuotationData.Product_Reference) {
      toast.error('Please select a Product/Service.');
      return;
    }
    if (parseFloat(addQuotationData.Commercial) <= 0) {
      toast.error('Commercial value must be greater than 0.');
      return;
    }

    setAddingQuotation(true);
    try {
      const dataToSubmit: any = { ...addQuotationData };
      if (isNewClient) {
        dataToSubmit.newClientData = newClientData;
        delete dataToSubmit.Client_Reference;
      }
      await createQuotation(dataToSubmit);
      toast.success('Quotation added successfully!');
      handleAddModalClose();
      triggerRefresh();
    } catch (err: any) {
      toast.error('Error adding quotation: ' + err.message);
    } finally {
      setAddingQuotation(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div>
      <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading quotations...</p>
    </div>
  );
  if (error) return <div className="text-secondary bg-red-900/20 p-4 rounded-lg text-red-500">Error: {error}</div>;

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedQuotations = quotations;

  const overdueQuotations = quotations.filter((q: any) => {
    if (q.Quotation_Status === 'Approved' || q.Quotation_Status === 'Rejected' || q.Quotation_Status === 'Cancelled' || q.Quotation_Status === 'Converted') return false;
    const hasFollowUps = q.Follow_Ups && q.Follow_Ups.length > 0;
    const lastActionDate = hasFollowUps
      ? new Date(q.Follow_Ups[q.Follow_Ups.length - 1].Followup_Date)
      : new Date(q.Quotation_Date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastActionDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (!hasFollowUps) return diffDays > 10;
    const lastOutcome = q.Follow_Ups[q.Follow_Ups.length - 1].Outcome;
    return lastOutcome === 'Pending' && diffDays > 5;
  });

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
            <FileText size={20} strokeWidth={2.5} />
          </div>
          <h1 className="page-title" style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.025em',
            whiteSpace: 'nowrap'
          }}>Quotations</h1>
        </div>

        {/* Middle-Left: Search */}
        <div className="search-wrapper" style={{ flex: 1, maxWidth: '400px', marginBottom: 0 }}>
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search quotations..."
            className="premium-search-input"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            style={{ padding: '0.45rem 1rem 0.45rem 2.4rem', borderRadius: '8px', fontSize: '0.85rem', height: '36px', width: '100%' }}
          />
        </div>

        {/* Middle-Right: Stats Filters */}
        <div style={{
          display: 'flex',
          gap: '0.3rem',
          backgroundColor: '#f8fafc',
          padding: '0.25rem',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          alignItems: 'center',
          flexShrink: 0
        }}>
          {[
            { label: 'Sent', key: 'Sent', count: statusCounts.Sent, color: '#64748b', bgColor: 'rgba(100, 116, 139, 0.1)', icon: <ArrowBigRightDashIcon size={14} /> },
            { label: 'Follow-up', key: 'Follow-up', count: statusCounts['Follow-up'], color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', icon: <MessageSquare size={14} /> },
            { label: 'Approved', key: 'Approved', count: statusCounts.Approved, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', icon: <CheckCircle size={14} /> },
            { label: 'Rejected', key: 'Rejected', count: statusCounts.Rejected, color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.1)', icon: <XCircle size={14} /> },
            { label: 'Converted', key: 'Converted', count: statusCounts.Converted, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', icon: <FileText size={14} /> }
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
                minWidth: '105px'
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
                <span style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>{block.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Primary Action */}
        {hasPermission(PERMISSIONS.QUOTATIONS_CREATE) && (
          <button
            onClick={() => {
              setIsAddModalOpen(true);
              loadLeadsData();
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
            Add Quotation
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort('ID')} style={{ cursor: 'pointer' }}>QTN ID {getSortIcon('ID')}</th>
              <th onClick={() => toggleSort('Company')} style={{ cursor: 'pointer' }}>Company Name {getSortIcon('Company')}</th>
              <th>Product / Service</th>
              <th style={{ minWidth: '150px' }}>
                <select
                  className="premium-table-filter"
                  value={commRange}
                  onChange={(e) => {
                    setCommRange(e.target.value);
                    setCurrentPage(1);
                  }}
                  onClick={(e) => e.stopPropagation()}
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
                  <option value="All" style={{ color: '#333' }}>Commercial</option>
                  <option value="0-25k" style={{ color: '#333' }}>0 - 25,000</option>
                  <option value="25k-50k" style={{ color: '#333' }}>25k - 50k</option>
                  <option value="50k-100k" style={{ color: '#333' }}>50k - 100k</option>
                  <option value="100k-500k" style={{ color: '#333' }}>100k - 500k</option>
                  <option value="500k+" style={{ color: '#333' }}>500k+</option>
                </select>
              </th>
              <th>Time Duration</th>
              <th>Status</th>
              <th onClick={() => dateRange === 'All' && toggleSort('Date')} style={{ cursor: dateRange === 'All' ? 'pointer' : 'default', minWidth: '160px' }}>
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
                      <option value="All" style={{ color: '#333' }}>Quotation Date</option>
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
          <tbody style={{ opacity: fetchingQuotations ? 0.6 : 1, transition: 'opacity 0.2s ease-in-out' }}>
            {paginatedQuotations.map((qtn: any) => (
              <tr
                key={qtn._id}
                onClick={() => setSelectedDetailQuotation(qtn)}
                style={{ cursor: 'pointer' }}
              >
                <td><span className="font-semibold text-primary">{qtn.Quotation_ID}</span></td>
                <td>{qtn.Client_Reference?.Company_Name || qtn.Lead_ID?.Client_Reference?.Company_Name || qtn.Client_Info || 'Unknown Lead'}</td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                      {[qtn.Product_Reference?.Type, qtn.Product_Reference?.SubType].filter(Boolean).join(' / ')}
                    </div>
                    <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                      {qtn.Product_Reference?.SubSubType || qtn.Product_Reference?.SubType || qtn.Product_Reference?.Type || '-'}
                    </div>
                  </div>
                </td>
                <td className="font-mono">Rs. {qtn.Commercial?.toLocaleString() || '0'}</td>
                <td>{qtn.Timeline || '-'}</td>
                <td>
                  <span className={`badge ${qtn.Quotation_Status === 'Approved' ? 'badge-green' : qtn.Quotation_Status === 'Converted' ? 'badge-blue' : qtn.Quotation_Status === 'Rejected' ? 'badge-red' : 'badge-yellow'}`}>
                    {qtn.Quotation_Status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {formatDateDDMMYYYY(qtn.Quotation_Date)}
                    {overdueQuotations.some((oq: any) => oq._id === qtn._id) && (
                      <span title="Overdue for follow-up" style={{ color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CircleFadingPlus size={14} />
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {paginatedQuotations.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  {fetchingQuotations ? 'Updating quotations...' : 'No quotations found matching your search.'}
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
        itemName="quotations"
      />

      {/* Details Modal */}
      {selectedDetailQuotation && (
        <div className="modal-overlay" onClick={() => setSelectedDetailQuotation(null)}>
          <div className="modal-content" style={{ maxWidth: '1100px', width: '95%', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{selectedDetailQuotation.Lead_ID?.Company_Name || 'Direct Quotation'}</h2>
                <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0 }}>Quotation ID: {selectedDetailQuotation.Quotation_ID}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedDetailQuotation(null)}><X size={24} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '0.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.25rem' }}>Proposal Details</h3>
                <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div><strong className="text-secondary">Service/Product:</strong> {selectedDetailQuotation.Product_Reference?.SubSubType || '-'}</div>
                  <div><strong className="text-secondary">Company Name:</strong> {selectedDetailQuotation.Client_Reference?.Company_Name || selectedDetailQuotation.Lead_ID?.Client_Reference?.Company_Name || selectedDetailQuotation.Client_Info || '-'}</div>
                  {(selectedDetailQuotation.Client_Reference?.Client_Name || selectedDetailQuotation.Lead_ID?.Client_Reference?.Client_Name) && (
                    <div><strong className="text-secondary">Client Name:</strong> {selectedDetailQuotation.Client_Reference?.Client_Name || selectedDetailQuotation.Lead_ID?.Client_Reference?.Client_Name}</div>
                  )}
                  {(selectedDetailQuotation.Client_Reference?.Contact_Number || selectedDetailQuotation.Lead_ID?.Client_Reference?.Contact_Number) && (
                    <div><strong className="text-secondary">Contact Number:</strong> {selectedDetailQuotation.Client_Reference?.Contact_Number || selectedDetailQuotation.Lead_ID?.Client_Reference?.Contact_Number}</div>
                  )}
                  <div><strong className="text-secondary">Timeline:</strong> {selectedDetailQuotation.Timeline || '-'}</div>
                  <div><strong className="text-secondary">Sent Via:</strong> {selectedDetailQuotation.Sent_Via || '-'}</div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '0.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.25rem' }}>Status & Commercials</h3>
                <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div><strong className="text-secondary">Commercial Amount:</strong> <span className="font-mono text-lg font-semibold text-green-600">Rs. {selectedDetailQuotation.Commercial?.toLocaleString() || '0'}</span></div>
                  <div><strong className="text-secondary">Payment Terms:</strong> {selectedDetailQuotation.Payment_Terms || '-'}</div>
                  <div><strong className="text-secondary">Quotation Date:</strong> {formatDateDDMMYYYY(selectedDetailQuotation.Quotation_Date)}</div>
                  <div>
                    <strong className="text-secondary">Current Status:</strong>{' '}
                    <span className={`badge ${selectedDetailQuotation.Quotation_Status === 'Approved' ? 'badge-green' : selectedDetailQuotation.Quotation_Status === 'Converted' ? 'badge-blue' : selectedDetailQuotation.Quotation_Status === 'Rejected' ? 'badge-red' : 'badge-yellow'}`}>
                      {selectedDetailQuotation.Quotation_Status}
                    </span>
                  </div>
                  <div><strong className="text-secondary">Letterhead:</strong> {selectedDetailQuotation.Letterhead || '-'}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Core Requirement</h3>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                  {selectedDetailQuotation.Requirement || <span className="text-secondary italic">No core requirement documented.</span>}
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Project Scope</h3>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                  {selectedDetailQuotation.Project_Scope_Description || <span className="text-secondary italic">No detailed scope attached.</span>}
                </div>
              </div>
            </div>

            {(selectedDetailQuotation.Other_Terms || selectedDetailQuotation.Cancel_Reason) && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Additional Notes</h3>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                  {selectedDetailQuotation.Other_Terms && (
                    <div style={{ marginBottom: selectedDetailQuotation.Cancel_Reason ? '0.5rem' : 0 }}>
                      <strong className="text-secondary">Other Terms:</strong> {selectedDetailQuotation.Other_Terms}
                    </div>
                  )}
                  {selectedDetailQuotation.Cancel_Reason && (
                    <div className="text-red-600">
                      <strong>Cancellation Reason:</strong> {selectedDetailQuotation.Cancel_Reason}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedDetailQuotation.Follow_Ups && selectedDetailQuotation.Follow_Ups.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MessageCircle size={16} /> Follow-up History ({selectedDetailQuotation.Follow_Ups.length})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', maxHeight: '150px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {selectedDetailQuotation.Follow_Ups.map((fu: any, idx: number) => (
                    <div key={idx} style={{ padding: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '0.5rem', borderLeft: '3px solid #3B82F6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1E40AF' }}>
                          {formatDateTimeDDMMYYYY(fu.Followup_Date)}
                        </span>
                        <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', backgroundColor: fu.Outcome === 'Converted' ? '#DCFCE7' : fu.Outcome === 'Cancelled' ? '#FEE2E2' : '#FEF3C7', color: fu.Outcome === 'Converted' ? '#166534' : fu.Outcome === 'Cancelled' ? '#991B1B' : '#92400E', borderRadius: '1rem', fontWeight: 500 }}>
                          {fu.Outcome}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                        {fu.Remarks}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {selectedDetailQuotation.Quotation_Status !== 'Rejected' && selectedDetailQuotation.Quotation_Status !== 'Approved' && selectedDetailQuotation.Quotation_Status !== 'Converted' && hasPermission(PERMISSIONS.QUOTATIONS_DELETE) && (
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'transparent' }}
                    onClick={() => {
                      setSelectedCancelQuotation(selectedDetailQuotation);
                      setCancelReason('');
                      setSelectedDetailQuotation(null);
                    }}
                  >
                    Reject Quotation
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {selectedDetailQuotation.Quotation_Status !== 'Rejected' && selectedDetailQuotation.Quotation_Status !== 'Approved' && selectedDetailQuotation.Quotation_Status !== 'Converted' && (
                  <>
                    {hasPermission(PERMISSIONS.QUOTATIONS_EDIT) && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', color: '#0369a1', borderColor: 'rgba(56, 189, 248, 0.4)', backgroundColor: '#f0f9ff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        onClick={() => {
                          setSelectedFollowUpQuotation(selectedDetailQuotation);
                          setFollowUpData({ Remarks: '', Outcome: 'Pending' });
                          setSelectedDetailQuotation(null);
                        }}
                      >
                        <MessageCircle size={16} /> Record Follow-up
                      </button>
                    )}

                    {hasPermission(PERMISSIONS.QUOTATIONS_EDIT) && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setEditQuotationId(selectedDetailQuotation._id);
                          setEditQuotationData({
                            Client_Reference: selectedDetailQuotation.Client_Reference?._id || selectedDetailQuotation.Lead_ID?.Client_Reference?._id || '',
                            Product_Reference: selectedDetailQuotation.Product_Reference?._id || '',
                            Quotation_Status: selectedDetailQuotation.Quotation_Status || 'Pending',
                            Commercial: selectedDetailQuotation.Commercial || '',
                            Client_Info: selectedDetailQuotation.Client_Info || '',
                            Requirement: selectedDetailQuotation.Requirement || '',
                            Project_Scope_Description: selectedDetailQuotation.Project_Scope_Description || '',
                            Timeline: selectedDetailQuotation.Timeline || '',
                            Payment_Terms: selectedDetailQuotation.Payment_Terms || '',
                            Other_Terms: selectedDetailQuotation.Other_Terms || '',
                            Letterhead: selectedDetailQuotation.Letterhead || 'No',
                            Sent_Via: selectedDetailQuotation.Sent_Via || 'Email',
                            Followup_Notification: selectedDetailQuotation.Followup_Notification || false
                          });
                          setClientSearchName(selectedDetailQuotation.Client_Reference?.Company_Name || selectedDetailQuotation.Lead_ID?.Client_Reference?.Company_Name || '');
                          setProductSearchName(selectedDetailQuotation.Product_Reference ? [selectedDetailQuotation.Product_Reference.Type, selectedDetailQuotation.Product_Reference.SubType, selectedDetailQuotation.Product_Reference.SubSubType].filter(Boolean).join(' > ') : '');
                          setSelectedDetailQuotation(null);
                          setIsEditModalOpen(true);
                        }}
                      >
                        Edit Details
                      </button>
                    )}
                  </>

                )}
                {selectedDetailQuotation.Quotation_Status === 'Approved' && hasPermission(PERMISSIONS.QUOTATIONS_CONVERT) && hasPermission(PERMISSIONS.PROJECTS_CREATE) && (
                  <button
                    className="btn btn-success"
                    style={{ padding: '0.5rem 1rem' }}
                    onClick={() => {
                      setSelectedQuotation(selectedDetailQuotation);
                      setSelectedDetailQuotation(null);
                    }}
                  >
                    Convert to Project <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Convert Modal */}
      {selectedQuotation && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2>Convert to Project</h2>
              <button className="modal-close" onClick={() => setSelectedQuotation(null)}><X size={20} /></button>
            </div>

            <form onSubmit={handleConvert}>
              <div style={{ marginBottom: '1rem', padding: '0.5rem 1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--primary-color)', margin: 0, marginBottom: '0.25rem' }}>Converting Quotation: <strong>{selectedQuotation.Quotation_ID}</strong></p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Service: {selectedQuotation.Product_Reference ? [selectedQuotation.Product_Reference.Type, selectedQuotation.Product_Reference.SubType, selectedQuotation.Product_Reference.SubSubType].filter(Boolean).join(' > ') : '-'}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Product/Service *</label>
                  <HierarchicalProductSelector
                    value={convertData.Product_Reference}
                    onSelect={handleConvertProductSelect}
                    placeholder="Choose category..."
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Priority</label>
                  <select className="form-select" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={convertData.Priority} onChange={e => setConvertData({ ...convertData, Priority: e.target.value })}>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Assigned Person</label>
                  <input type="text" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={convertData.Assigned_Person} onChange={e => setConvertData({ ...convertData, Assigned_Person: e.target.value })} placeholder="Name of assignee" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Report Type</label>
                  <select className="form-select" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={convertData.Report_Type} onChange={e => setConvertData({ ...convertData, Report_Type: e.target.value })}>
                    <option value="Overview">Overview</option>
                    <option value="Detailed">Detailed</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Costing</label>
                  <input type="number" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={convertData.Costing} onChange={e => setConvertData({ ...convertData, Costing: parseFloat(e.target.value) })} placeholder="Project cost" />
                </div>

                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Start Date</label>
                  <DateInput
                    required
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={convertData.Start_Date}
                    onChange={val => setConvertData({ ...convertData, Start_Date: val })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>End Date</label>
                  <DateInput
                    required
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={convertData.End_Date}
                    onChange={val => setConvertData({ ...convertData, End_Date: val })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedQuotation(null)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={converting}>
                  {converting ? <><Loader2 size={16} className="animate-spin" /> Converting...</> : 'Convert Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Quotation Modal */}
      {selectedCancelQuotation && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '95%', padding: '1.5rem' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2 className="text-red-500 flex items-center gap-2" style={{ fontSize: '1.2rem' }}>Cancel Quotation</h2>
              <button className="modal-close" onClick={() => setSelectedCancelQuotation(null)}><X size={20} /></button>
            </div>

            <form onSubmit={handleCancelSubmit}>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <p style={{ fontSize: '0.85rem', color: '#ef4444', marginBottom: '0.25rem' }}>Canceling Quotation: <strong>{selectedCancelQuotation.Quotation_ID}</strong></p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>This action will mark the quotation as Rejected and move it to Archives.</p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Reason for Rejection/Cancellation *</label>
                <textarea
                  required
                  rows={3}
                  className="form-textarea"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Explain why this quotation is being rejected/canceled..."
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedCancelQuotation(null)}>Go Back</button>
                <button type="submit" className="btn btn-secondary" style={{ backgroundColor: '#ef4444', color: 'white', borderColor: '#ef4444' }} disabled={canceling}>
                  {canceling ? <><Loader2 size={16} className="animate-spin" /> Canceling...</> : 'Cancel Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Follow-up Modal */}
      {selectedFollowUpQuotation && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px', width: '95%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2 className="text-blue-600 flex items-center gap-2" style={{ fontSize: '1.2rem' }}>Record Follow-up</h2>
              <button className="modal-close" onClick={() => setSelectedFollowUpQuotation(null)}><X size={20} /></button>
            </div>

            <form onSubmit={handleFollowUp}>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <p style={{ fontSize: '0.85rem', color: '#2563EB', marginBottom: '0.25rem' }}>Quotation <strong>{selectedFollowUpQuotation.Quotation_ID}</strong></p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Company: {selectedFollowUpQuotation.Lead_ID?.Company_Name || 'Unknown'}</p>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Remarks / Discussion Notes *</label>
                <textarea
                  required
                  rows={4}
                  className="form-textarea"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  value={followUpData.Remarks}
                  onChange={e => setFollowUpData({ ...followUpData, Remarks: e.target.value })}
                  placeholder="Summarize the conversation or next steps..."
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Follow-up Outcome</label>
                <select
                  className="form-select"
                  style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                  value={followUpData.Outcome}
                  onChange={e => setFollowUpData({ ...followUpData, Outcome: e.target.value })}
                >
                  <option value="Pending">Pending (Still Negotiating)</option>
                  <option value="Converted">Converted (Ready exactly for Approval)</option>
                  {hasPermission(PERMISSIONS.QUOTATIONS_DELETE) && (
                    <option value="Cancelled">Cancelled / Lost Deal</option>
                  )}
                </select>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  * This is a note on the follow-up.
                </p>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedFollowUpQuotation(null)}>Cancel</button>
                <button type="submit" className="btn btn-secondary" style={{ backgroundColor: '#2563EB', color: 'white', borderColor: '#2563EB' }} disabled={followingUp}>
                  {followingUp ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '1100px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2>Edit Quotation</h2>
              <button className="modal-close" onClick={handleEditModalClose}><X size={20} /></button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Product/Service Name *</label>
                  <HierarchicalProductSelector
                    value={editQuotationData.Product_Reference}
                    onSelect={handleProductSelect}
                    placeholder="Choose category..."
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Quotation Status *</label>
                  <select
                    className="form-select"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={editQuotationData.Quotation_Status}
                    onChange={e => {
                      setEditQuotationData({ ...editQuotationData, Quotation_Status: e.target.value });
                    }}
                  >
                    {optionsMap?.quotation?.status?.filter((status: string) => {
                      if (!hasPermission(PERMISSIONS.QUOTATIONS_DELETE)) {
                        const s = status.toLowerCase();
                        return !s.includes('reject') && !s.includes('cancel');
                      }
                      return true;
                    }).map((status: string) => (
                      <option key={status} value={status}>{status}</option>
                    )) || (
                        <>
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          {hasPermission(PERMISSIONS.QUOTATIONS_DELETE) && <option value="Rejected">Rejected</option>}
                          <option value="Follow-up">Follow-up</option>
                        </>
                      )}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Commercial Amount *</label>
                  <input type="number" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={editQuotationData.Commercial} onChange={e => setEditQuotationData({ ...editQuotationData, Commercial: e.target.value })} placeholder="e.g. 5000" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Client *</label>
                  <ClientAutocomplete
                    value={clientSearchName}
                    onChange={(val) => setClientSearchName(val)}
                    onSelect={handleClientSelect}
                    placeholder="Search client..."
                  />
                  {editQuotationData.Client_Reference && !clientSearchName.includes("Selected") && (
                    <div className="text-xs text-green-600 mt-1">✓ Client Linked</div>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 3' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Requirements</label>
                      <textarea className="form-textarea" style={{ minHeight: '60px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={editQuotationData.Requirement} onChange={e => setEditQuotationData({ ...editQuotationData, Requirement: e.target.value })} placeholder="Client requirements..." />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Project Scope Description</label>
                      <textarea className="form-textarea" style={{ minHeight: '60px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={editQuotationData.Project_Scope_Description} onChange={e => setEditQuotationData({ ...editQuotationData, Project_Scope_Description: e.target.value })} placeholder="Detailed scope of work..." />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Timeline</label>
                  <input type="text" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={editQuotationData.Timeline} onChange={e => setEditQuotationData({ ...editQuotationData, Timeline: e.target.value })} placeholder="e.g. 4 Weeks" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Payment Terms</label>
                  <input type="text" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={editQuotationData.Payment_Terms} onChange={e => setEditQuotationData({ ...editQuotationData, Payment_Terms: e.target.value })} placeholder="e.g. 50% Advance" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Other Terms</label>
                  <input type="text" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={editQuotationData.Other_Terms} onChange={e => setEditQuotationData({ ...editQuotationData, Other_Terms: e.target.value })} placeholder="Any additional terms..." />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Letterhead Required?</label>
                  <select className="form-select" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={editQuotationData.Letterhead} onChange={e => setEditQuotationData({ ...editQuotationData, Letterhead: e.target.value })}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Sent Via</label>
                  <select className="form-select" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={editQuotationData.Sent_Via} onChange={e => setEditQuotationData({ ...editQuotationData, Sent_Via: e.target.value })}>
                    <option value="Email">Email</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginBottom: 0, paddingTop: '1.2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" id="followupCheck" checked={editQuotationData.Followup_Notification} onChange={e => setEditQuotationData({ ...editQuotationData, Followup_Notification: e.target.checked })} style={{ width: '16px', height: '16px', margin: 0 }} />
                    Enable Follow-up Notifications
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleEditModalClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editingQuotation}>
                  {editingQuotation ? <><Loader2 size={16} className="animate-spin" /> Updating...</> : 'Update Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Quotation Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '1100px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2>Add New Quotation</h2>
              <button className="modal-close" onClick={handleAddModalClose}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Select Lead</label>
                  <select
                    className="form-select"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={addQuotationData.Lead_ID}
                    onChange={e => {
                      const leadId = e.target.value;
                      const lead = leads.find(l => l._id === leadId);
                      if (lead) {
                        setAddQuotationData({
                          ...addQuotationData,
                          Lead_ID: leadId,
                          Product_Reference: lead.Product_Reference?._id || '',
                          Client_Reference: lead.Client_Reference?._id || '',
                          Requirement: lead.Notes || ''
                        });
                        setClientSearchName(lead.Client_Reference?.Company_Name || '');
                        setProductSearchName(lead.Product_Reference?.Product_Name || '');
                      } else {
                        setAddQuotationData({ ...addQuotationData, Lead_ID: '' });
                      }
                    }}
                  >
                    <option value="">-- Select a Lead --</option>
                    {leads.map(lead => (
                      <option key={lead._id} value={lead._id}>{lead.Lead_ID} - {lead.Client_Reference?.Company_Name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Product/Service Name *</label>
                  <HierarchicalProductSelector
                    value={addQuotationData.Product_Reference}
                    onSelect={handleProductSelect}
                    placeholder="Choose category..."
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Commercial Amount *</label>
                  <input type="number" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addQuotationData.Commercial} onChange={e => setAddQuotationData({ ...addQuotationData, Commercial: e.target.value })} placeholder="e.g. 5000" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', margin: 0 }}>Client *</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, color: isNewClient ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                        <input
                          type="checkbox"
                          checked={isNewClient}
                          onChange={(e) => setIsNewClient(e.target.checked)}
                          style={{ width: '14px', height: '14px' }}
                        />
                        New Client?
                      </label>
                    </div>
                  </div>
                  {!isNewClient ? (
                    <>
                      <ClientAutocomplete
                        value={clientSearchName}
                        onChange={(val) => setClientSearchName(val)}
                        onSelect={handleClientSelect}
                        placeholder="Search client..."
                      />
                      {addQuotationData.Client_Reference && !clientSearchName.includes("Selected") && (
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

                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Requirements</label>
                      <textarea className="form-textarea" style={{ minHeight: '60px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addQuotationData.Requirement} onChange={e => setAddQuotationData({ ...addQuotationData, Requirement: e.target.value })} placeholder="Client requirements..." />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Project Scope Description</label>
                      <textarea className="form-textarea" style={{ minHeight: '60px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addQuotationData.Project_Scope_Description} onChange={e => setAddQuotationData({ ...addQuotationData, Project_Scope_Description: e.target.value })} placeholder="Detailed scope of work..." />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Timeline</label>
                  <input type="text" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addQuotationData.Timeline} onChange={e => setAddQuotationData({ ...addQuotationData, Timeline: e.target.value })} placeholder="e.g. 4 Weeks" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Payment Terms</label>
                  <input type="text" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addQuotationData.Payment_Terms} onChange={e => setAddQuotationData({ ...addQuotationData, Payment_Terms: e.target.value })} placeholder="e.g. 50% Advance" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Other Terms</label>
                  <input type="text" className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addQuotationData.Other_Terms} onChange={e => setAddQuotationData({ ...addQuotationData, Other_Terms: e.target.value })} placeholder="Any additional terms..." />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Letterhead Required?</label>
                  <select className="form-select" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addQuotationData.Letterhead} onChange={e => setAddQuotationData({ ...addQuotationData, Letterhead: e.target.value })}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Sent Via</label>
                  <select className="form-select" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addQuotationData.Sent_Via} onChange={e => setAddQuotationData({ ...addQuotationData, Sent_Via: e.target.value })}>
                    <option value="Email">Email</option>
                    <option value="WhatsApp">WhatsApp</option>
                  </select>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginBottom: 0, paddingTop: '1.2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" checked={addQuotationData.Followup_Notification} onChange={e => setAddQuotationData({ ...addQuotationData, Followup_Notification: e.target.checked })} style={{ width: '16px', height: '16px', margin: 0 }} />
                    Enable Follow-up Notifications
                  </label>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleAddModalClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={addingQuotation}>
                  {addingQuotation ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default function QuotationsPage() {
  return (
    <NuqsAdapter>
      <React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div></div>}>
        <Quotations />
      </React.Suspense>
    </NuqsAdapter>
  );
}