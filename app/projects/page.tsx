'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchProjects, createProject, fetchQuotations, fetchProducts, fetchLeads } from '@/utils/api';
import { formatDateDDMMYYYY } from '@/utils/dateUtils';
import { useOptions } from '@/context/OptionsContext';
import {
  X, Loader2, Search, Target, Rocket, Package, PlayCircle, Plus, Briefcase, ChevronDown, ChevronUp, ArrowUpDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import DateInput from '@/components/DateInput';
import ClientAutocomplete from '@/components/ClientAutocomplete';
import HierarchicalProductSelector from '@/components/HierarchicalProductSelector';
import ClientFields from '@/components/ClientFields';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import { useQueryState, parseAsString, parseAsInteger, parseAsBoolean } from 'nuqs';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

const Projects = () => {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [linkType, setLinkType] = useState<'Quotation' | 'Lead'>('Quotation');
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [fetchingProjects, setFetchingProjects] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // --- NUQS STATE MANAGEMENT ---
  const [searchTerm, setSearchTerm] = useQueryState('q', parseAsString.withDefault(''));
  const [localSearch, setLocalSearch] = useState(searchTerm);

  const [phaseFilter, setPhaseFilter] = useQueryState('phase', parseAsString.withDefault('All'));
  const [pipelineFilter, setPipelineFilter] = useQueryState('pipeline', parseAsString.withDefault('All'));
  const [sortBy, setSortBy] = useQueryState('sort', parseAsString.withDefault('Newest'));
  const [personFilter, setPersonFilter] = useQueryState('person', parseAsString.withDefault('All'));
  const [priorityFilter, setPriorityFilter] = useQueryState('priority', parseAsString.withDefault('All'));
  const [overdueFilter, setOverdueFilter] = useQueryState('overdue', parseAsBoolean.withDefault(false));

  const [dateRange, setDateRange] = useQueryState('range', parseAsString.withDefault('All'));
  const [customStartDate, setCustomStartDate] = useQueryState('startDate', parseAsString.withDefault(''));
  const [customEndDate, setCustomEndDate] = useQueryState('endDate', parseAsString.withDefault(''));
  const [currentPage, setCurrentPage] = useQueryState('page', parseAsInteger.withDefault(1));

  const [assignedPersons, setAssignedPersons] = useState<string[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [statusCounts, setStatusCounts] = useState<any>({
    Active: 0, 'On Hold': 0, Closed: 0, phaseCounts: { UAT: 0, Deployment: 0, Delivery: 0, GoLive: 0 }
  });
  const ITEMS_PER_PAGE = 20;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addProjectData, setAddProjectData] = useState({
    Project_Name: '', Quotation_Reference: '', Lead_Reference: '', Client_Reference: '', Product_Reference: '',
    Priority: 'Normal', Pipeline_Status: 'Active', Assigned_Person: '', Report_Type: 'Overview',
    Costing: 0, Requirement: '', Project_Scope_Description: '', Start_Date: new Date().toISOString().split('T')[0], End_Date: ''
  });

  const [clientSearchName, setClientSearchName] = useState('');
  const [productSearchName, setProductSearchName] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    Company_Name: '', Company_No: '', Client_Name: '', Contact_Number: '', Email: '', Location: '', Description: ''
  });

  // --- SEARCH DEBOUNCE LOGIC ---
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (localSearch !== searchTerm) {
        setSearchTerm(localSearch || null);
        setCurrentPage(1);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [localSearch, searchTerm, setSearchTerm, setCurrentPage]);

  // Sync dateRange if navigated from dashboard
  useEffect(() => {
    if (customStartDate && dateRange !== 'custom') setDateRange('custom');
  }, [customStartDate, dateRange, setDateRange]);

  // --- ABORT CONTROLLER FETCH LOGIC ---
  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      setFetchingProjects(true);
      try {
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

        const projectsResponse = await fetchProjects({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: searchTerm,
          phase: phaseFilter,
          pipeline: pipelineFilter,
          person: personFilter,
          priority: priorityFilter,
          overdue: overdueFilter ? 'true' : undefined,
          sortBy: sortBy,
          startDate,
          endDate
        });

        if (controller.signal.aborted) return;

        setProjects(projectsResponse.projects);
        setTotalItems(projectsResponse.totalItems);
        setStatusCounts(projectsResponse.statusCounts);
        setAssignedPersons(projectsResponse.assignedPersons || []);
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setFetchingProjects(false);
          setLoading(false);
        }
      }
    };

    loadData();
    return () => controller.abort();
  }, [searchTerm, phaseFilter, pipelineFilter, personFilter, priorityFilter, overdueFilter, sortBy, dateRange, customStartDate, customEndDate, currentPage, refreshTrigger]);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const handleClientSelect = (client: any) => {
    if (isAddModalOpen) {
      setAddProjectData({ ...addProjectData, Client_Reference: client._id });
      setClientSearchName(client.Company_Name);
      toast.success(`Client "${client.Company_Name}" selected!`);
    }
  };

  const handleProductSelect = (product: any) => {
    if (isAddModalOpen) {
      setAddProjectData({ ...addProjectData, Product_Reference: product._id });
      setProductSearchName([product.Type, product.SubType, product.SubSubType].filter(Boolean).join(' > '));
      toast.success(`Service "${product.SubSubType || product.SubType || product.Type}" selected!`);
    }
  };

  const loadQuotations = async () => {
    try {
      const quotationsData = await fetchQuotations();
      setQuotations(quotationsData.quotations);
    } catch (err: any) { toast.error('Error fetching quotations: ' + err.message); }
  };

  const loadLeads = async () => {
    try {
      const leadsData = await fetchLeads();
      setLeads(leadsData.leads);
    } catch (err: any) { toast.error('Error fetching leads: ' + err.message); }
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const productsData = await fetchProducts({ active: true });
        setProducts(productsData.products);
      } catch (err: any) { console.error('Error loading products:', err); }
    };
    loadProducts();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isNewClient && !addProjectData.Client_Reference && !addProjectData.Quotation_Reference && !addProjectData.Lead_Reference) {
      toast.error('Please select a Client, Quotation or Lead.'); return;
    }
    if (isNewClient && !newClientData.Company_Name) {
      toast.error('Company Name is required for New Client.'); return;
    }

    setAdding(true);
    try {
      const dataToSubmit: any = {
        Project_Name: addProjectData.Project_Name || undefined,
        Quotation_Reference: addProjectData.Quotation_Reference || undefined,
        Lead_Reference: addProjectData.Lead_Reference || undefined,
        Client_Reference: addProjectData.Client_Reference || undefined,
        Product_Reference: addProjectData.Product_Reference || undefined,
        Priority: addProjectData.Priority,
        Pipeline_Status: addProjectData.Pipeline_Status,
        Start_Details: {
          Assigned_Person: addProjectData.Assigned_Person,
          Report_Type: addProjectData.Report_Type,
          Costing: addProjectData.Costing,
          Requirement: addProjectData.Requirement,
          Project_Scope_Description: addProjectData.Project_Scope_Description,
          Start_Date: addProjectData.Start_Date,
          End_Date: addProjectData.End_Date
        }
      };

      if (isNewClient) {
        dataToSubmit.newClientData = newClientData;
        delete dataToSubmit.Client_Reference;
      }

      await createProject(dataToSubmit);
      toast.success('Project created successfully!');
      setIsAddModalOpen(false);
      setIsNewClient(false);
      setNewClientData({ Company_Name: '', Company_No: '', Client_Name: '', Contact_Number: '', Email: '', Location: '', Description: '' });
      triggerRefresh();
    } catch (err: any) {
      toast.error('Error creating project: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const getProjectPhase = (prj: any) => {
    if (prj.Delivery?.Delivery_Status === 'Delivered') return 'Go-Live Config';
    if (prj.Deployment?.Deployment_Status === 'Success') return 'Delivery Phase';
    if (prj.UAT?.UAT_Status === 'Approved') return 'Deployment Phase';
    return 'UAT Phase';
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div>
      <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading projects...</p>
    </div>
  );

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const phaseCountsOutput = statusCounts.phaseCounts || { UAT: 0, Deployment: 0, Delivery: 0, GoLive: 0 };

  const toggleSort = (column: string) => {
    if (column === 'ID') setSortBy(sortBy === 'ID-ASC' ? 'ID-DESC' : 'ID-ASC');
    else if (column === 'Company') setSortBy(sortBy === 'Company-A-Z' ? 'Company-Z-A' : 'Company-A-Z');
    else if (column === 'Name') setSortBy(sortBy === 'Name-A-Z' ? 'Newest' : 'Name-A-Z');
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
    } else if (column === 'Name') {
      if (sortBy === 'Name-A-Z') return <span className="ml-1 text-blue-500">↑</span>;
    } else if (column === 'Date') {
      if (sortBy === 'Newest') return <span className="ml-1 text-blue-500">↓</span>;
      if (sortBy === 'Oldest') return <span className="ml-1 text-blue-500">↑</span>;
    }
    return <span className="ml-1 text-gray-400 opacity-50">⇅</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0.25rem 0', gap: '1.25rem', minHeight: '48px' }}>

        {/* Left: Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '0.45rem', borderRadius: '10px', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Briefcase size={20} strokeWidth={2.5} />
          </div>
          <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em', whiteSpace: 'nowrap' }}>Projects</h1>
        </div>

        {/* Middle-Left: Search */}
        <div className="search-wrapper" style={{ flex: 1, maxWidth: '400px', marginBottom: 0 }}>
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search projects..."
            className="premium-search-input"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            style={{ padding: '0.45rem 1rem 0.45rem 2.4rem', borderRadius: '8px', fontSize: '0.85rem', height: '36px', width: '100%' }}
          />
        </div>

        {/* Middle-Right: Stats Filters */}
        <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: '#f8fafc', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', alignItems: 'center', flexShrink: 0 }}>
          <div
            onClick={() => { setPhaseFilter('All'); setCurrentPage(1); }}
            style={{ padding: '0.35rem 0.6rem', cursor: 'pointer', borderRadius: '8px', backgroundColor: phaseFilter === 'All' ? 'white' : 'transparent', boxShadow: phaseFilter === 'All' ? '0 2px 4px rgba(0, 0, 0, 0.05)' : 'none', border: phaseFilter === 'All' ? '1px solid var(--border-color)' : '1px solid transparent', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', transition: 'all 0.15s ease' }}
          >
            All Phases
          </div>
          {[
            { label: 'UAT', key: 'UAT', count: phaseCountsOutput.UAT, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', icon: <Target size={14} /> },
            { label: 'Deployment', key: 'Deployment', count: phaseCountsOutput.Deployment, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', icon: <Rocket size={14} /> },
            { label: 'Delivery', key: 'Delivery', count: phaseCountsOutput.Delivery, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', icon: <Package size={14} /> },
            { label: 'Go-Live', key: 'GoLive', count: phaseCountsOutput.GoLive, color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.1)', icon: <PlayCircle size={14} /> }
          ].map((block) => (
            <div
              key={block.key}
              onClick={() => { setPhaseFilter(block.key); setCurrentPage(1); }}
              style={{ padding: '0.35rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', borderRadius: '8px', backgroundColor: phaseFilter === block.key ? 'white' : 'transparent', boxShadow: phaseFilter === block.key ? '0 2px 4px rgba(0, 0, 0, 0.05)' : 'none', border: phaseFilter === block.key ? `1px solid ${block.color}33` : '1px solid transparent', transition: 'all 0.15s ease', minWidth: '105px' }}
            >
              <div style={{ backgroundColor: block.bgColor, width: '24px', height: '24px', borderRadius: '6px', color: block.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {block.icon}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{block.count}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>{block.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {priorityFilter !== 'All' && (
            <button
              onClick={() => { setPriorityFilter('All'); setCurrentPage(1); }}
              className="btn btn-secondary"
              style={{ padding: '0 0.75rem', height: '36px', fontSize: '0.75rem', borderColor: '#ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '8px' }}
            >
              <X size={14} /> Clear Priority: {priorityFilter}
            </button>
          )}

          {/* Right: Primary Action */}
          {hasPermission(PERMISSIONS.PROJECTS_CREATE) && (
            <button
              onClick={() => { setIsAddModalOpen(true); loadQuotations(); loadLeads(); }}
              className="btn btn-primary"
              style={{ height: '36px', padding: '0 1rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 8px 0 rgba(59, 130, 246, 0.25)', transition: 'all 0.2s ease', flexShrink: 0 }}
            >
              <Plus size={16} /> Add Project
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort('ID')} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}>ID {getSortIcon('ID')}</th>
              <th onClick={() => toggleSort('Name')} style={{ cursor: 'pointer' }}>Project Name {getSortIcon('Name')}</th>
              <th onClick={() => toggleSort('Company')} style={{ cursor: 'pointer' }}>Company : Client {getSortIcon('Company')}</th>
              <th style={{ minWidth: '150px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <select
                    className="premium-table-filter"
                    value={personFilter}
                    onChange={(e) => { setPersonFilter(e.target.value); setCurrentPage(1); }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', fontWeight: 700, cursor: 'pointer', outline: 'none', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.025em', width: '100%', padding: 0 }}
                  >
                    <option value="All" style={{ color: '#333' }}>All Staff</option>
                    {Array.from(new Set(assignedPersons.map(p => {
                      const trimmed = p?.trim() || 'Unassigned';
                      return trimmed.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                    }))).sort().map(person => (
                      <option key={person} value={person} style={{ color: '#333' }}>{person}</option>
                    ))}
                  </select>
                </div>
              </th>
              <th>Priority</th>
              <th style={{ minWidth: '130px' }}>
                <select
                  className="premium-table-filter"
                  value={pipelineFilter}
                  onChange={(e) => { setPipelineFilter(e.target.value); setCurrentPage(1); }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', fontWeight: 700, cursor: 'pointer', outline: 'none', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.025em', width: '100%', padding: 0 }}
                >
                  <option value="All" style={{ color: '#333' }}>Pipeline</option>
                  <option value="Active" style={{ color: '#333' }}>Active</option>
                  <option value="Closed" style={{ color: '#333' }}>Closed</option>
                  <option value="On Hold" style={{ color: '#333' }}>On Hold</option>
                </select>
              </th>
              <th style={{ whiteSpace: 'nowrap' }}>Phase</th>
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
                      onChange={(e) => { setDateRange(e.target.value); setCurrentPage(1); }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', fontWeight: 700, cursor: 'pointer', outline: 'none', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.025em', width: '100%', padding: 0 }}
                    >
                      <option value="All" style={{ color: '#333' }}>Start Date</option>
                      <option value="7days" style={{ color: '#333' }}>Last 7 Days</option>
                      <option value="30days" style={{ color: '#333' }}>Last 30 Days</option>
                      <option value="thisMonth" style={{ color: '#333' }}>This Month</option>
                      <option value="thisYear" style={{ color: '#333' }}>This Year</option>
                      <option value="custom" style={{ color: '#333' }}>Custom Range</option>
                    </select>
                    {dateRange === 'custom' && (
                      <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                        <input type="date" className="premium-compact-input" value={customStartDate} onChange={(e) => { setCustomStartDate(e.target.value); setCurrentPage(1); }} style={{ fontSize: '0.65rem', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'white' }} />
                        <input type="date" className="premium-compact-input" value={customEndDate} onChange={(e) => { setCustomEndDate(e.target.value); setCurrentPage(1); }} style={{ fontSize: '0.65rem', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'white' }} />
                      </div>
                    )}
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody style={{ opacity: fetchingProjects ? 0.6 : 1, transition: 'opacity 0.2s ease-in-out' }}>
            {projects.map((prj: any) => {
              const currentPhase = getProjectPhase(prj);
              let badgeColor = 'badge-gray';
              if (currentPhase === 'Delivery Phase') badgeColor = 'badge-green';
              else if (currentPhase === 'Deployment Phase') badgeColor = 'badge-blue';
              else if (currentPhase === 'UAT Phase') badgeColor = 'badge-yellow';

              return (
                <tr key={prj._id} onClick={() => router.push('/projects/' + prj.Project_ID)} style={{ cursor: 'pointer' }}>
                  <td><span className="font-semibold text-primary">{prj.Project_ID}</span></td>
                  <td><div className="font-medium text-white">{prj.Project_Name}</div></td>
                  <td><div className="font-medium text-white">{prj.Client_Reference?.Company_Name || 'N/A'}&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;{prj.Client_Reference?.Client_Name}</div></td>
                  <td>
                    <span>
                      {prj.Start_Details?.Assigned_Person ? prj.Start_Details.Assigned_Person.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : 'Unassigned'}
                    </span>
                  </td>
                  <td><span className={`badge ${prj.Priority === 'High' ? 'badge-yellow' : 'badge-gray'}`}>{prj.Priority}</span></td>
                  <td><span className={`badge ${prj.Pipeline_Status === 'Active' ? 'badge-green' : prj.Pipeline_Status === 'Closed' ? 'badge-red' : 'badge-yellow'}`}>{prj.Pipeline_Status || 'Active'}</span></td>
                  <td><span className={`badge ${badgeColor}`}>{currentPhase}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDateDDMMYYYY(prj.Start_Details?.Start_Date)}</td>
                </tr>
              );
            })}
            {projects.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>{fetchingProjects ? 'Updating projects...' : 'No projects found matching your search.'}</td></tr>
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
        itemName="projects"
      />

      {/* Add Project Modal */}
      {isAddModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '1100px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2>Add New Project</h2>
              <button className="modal-close" onClick={() => setIsAddModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Project Name *</label>
                  <input type="text" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addProjectData.Project_Name} onChange={e => setAddProjectData({ ...addProjectData, Project_Name: e.target.value })} placeholder="e.g. Website Development" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', margin: 0 }}>{linkType === 'Quotation' ? 'Linked Quotation (Optional)' : 'Linked Lead (Optional)'}</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" onClick={() => { setLinkType('Quotation'); setAddProjectData({ ...addProjectData, Lead_Reference: '', Quotation_Reference: '' }); }} style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: linkType === 'Quotation' ? 'var(--primary-color)' : 'transparent', color: linkType === 'Quotation' ? 'white' : 'var(--text-secondary)', cursor: 'pointer' }}>Quotation</button>
                      <button type="button" onClick={() => { setLinkType('Lead'); setAddProjectData({ ...addProjectData, Lead_Reference: '', Quotation_Reference: '' }); }} style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: linkType === 'Lead' ? 'var(--primary-color)' : 'transparent', color: linkType === 'Lead' ? 'white' : 'var(--text-secondary)', cursor: 'pointer' }}>Lead</button>
                    </div>
                  </div>

                  {linkType === 'Quotation' ? (
                    <select
                      className="form-select"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      value={addProjectData.Quotation_Reference}
                      onChange={e => {
                        const qId = e.target.value;
                        const q = quotations.find(item => item._id === qId);
                        setAddProjectData({
                          ...addProjectData, Quotation_Reference: qId, Lead_Reference: q?.Lead_ID?._id || '', Client_Reference: q?.Client_Reference?._id || '',
                          Product_Reference: q?.Product_Reference?._id || '', Project_Name: addProjectData.Project_Name || q?.Client_Reference?.Company_Name || '',
                          Requirement: q?.Requirement || '', Project_Scope_Description: q?.Project_Scope_Description || '', Costing: addProjectData.Costing || q?.Commercial || 0
                        });
                        if (q?.Client_Reference) setClientSearchName(q.Client_Reference.Company_Name);
                        if (q?.Product_Reference) setProductSearchName([q.Product_Reference.Type, q.Product_Reference.SubType, q.Product_Reference.SubSubType].filter(Boolean).join(' > '));
                      }}
                    >
                      <option value="">-- No Quotation --</option>
                      {quotations.map(q => (
                        <option key={q._id} value={q._id}>{q.Quotation_ID} - {q.Product_Reference ? (q.Product_Reference.SubSubType || q.Product_Reference.SubType || q.Product_Reference.Type) : 'Unknown Product'}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      className="form-select"
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                      value={addProjectData.Lead_Reference}
                      onChange={e => {
                        const lId = e.target.value;
                        const l = leads.find(item => item._id === lId);
                        setAddProjectData({
                          ...addProjectData, Lead_Reference: lId, Quotation_Reference: '', Client_Reference: l?.Client_Reference?._id || '',
                          Product_Reference: l?.Product_Reference?._id || '', Project_Name: addProjectData.Project_Name || l?.Client_Reference?.Company_Name || '',
                          Requirement: l?.Notes || '', Project_Scope_Description: '', Costing: addProjectData.Costing || 0
                        });
                        if (l?.Client_Reference) setClientSearchName(l.Client_Reference.Company_Name);
                        if (l?.Product_Reference) setProductSearchName([l.Product_Reference.Type, l.Product_Reference.SubType, l.Product_Reference.SubSubType].filter(Boolean).join(' > '));
                      }}
                    >
                      <option value="">-- No Lead --</option>
                      {leads.map(l => (
                        <option key={l._id} value={l._id}>{l.Lead_ID} - {l.Client_Reference?.Company_Name || 'Unknown Client'} ({l.Product_Reference ? (l.Product_Reference.SubSubType || l.Product_Reference.SubType || l.Product_Reference.Type) : 'Unknown Product'})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Pipeline Status</label>
                  <select className="form-select" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addProjectData.Pipeline_Status} onChange={e => setAddProjectData({ ...addProjectData, Pipeline_Status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Product/Service *</label>
                  <HierarchicalProductSelector value={addProjectData.Product_Reference} onSelect={handleProductSelect} placeholder="Choose category..." />
                  {addProjectData.Product_Reference && <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem', fontWeight: 500 }}>✓ Product linked successfully.</p>}
                </div>

                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 3' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', margin: 0 }}>Client / Company Selection *</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, color: isNewClient ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                        <input type="checkbox" checked={isNewClient} onChange={(e) => setIsNewClient(e.target.checked)} style={{ width: '14px', height: '14px' }} /> New Client?
                      </label>
                    </div>
                  </div>
                  {!isNewClient ? (
                    <>
                      <ClientAutocomplete value={clientSearchName} onChange={setClientSearchName} onSelect={handleClientSelect} placeholder="Search client or company..." />
                      {addProjectData.Client_Reference && <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem', fontWeight: 500 }}>✓ Client linked successfully.</p>}
                    </>
                  ) : (
                    <ClientFields values={newClientData} onChange={(field, value) => setNewClientData({ ...newClientData, [field]: value })} />
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 3' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Core Requirements</label>
                      <textarea className="form-textarea" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', minHeight: '80px' }} value={addProjectData.Requirement} onChange={e => setAddProjectData({ ...addProjectData, Requirement: e.target.value })} placeholder="Project requirements..." />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Project Scope</label>
                      <textarea className="form-textarea" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', minHeight: '80px' }} value={addProjectData.Project_Scope_Description} onChange={e => setAddProjectData({ ...addProjectData, Project_Scope_Description: e.target.value })} placeholder="Detailed scope of work..." />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Priority *</label>
                  <select className="form-select" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addProjectData.Priority} onChange={e => setAddProjectData({ ...addProjectData, Priority: e.target.value })}>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Assigned Person</label>
                  <input type="text" className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addProjectData.Assigned_Person} onChange={e => setAddProjectData({ ...addProjectData, Assigned_Person: e.target.value })} placeholder="Name of individual" />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Report Type</label>
                  <select className="form-select" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addProjectData.Report_Type} onChange={e => setAddProjectData({ ...addProjectData, Report_Type: e.target.value })}>
                    <option value="Overview">Overview</option>
                    <option value="Detailed">Detailed</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Project Cost (Costing) *</label>
                  <input type="number" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addProjectData.Costing} onChange={e => setAddProjectData({ ...addProjectData, Costing: parseFloat(e.target.value) || 0 })} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Start Date *</label>
                  <DateInput required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addProjectData.Start_Date} onChange={val => setAddProjectData({ ...addProjectData, Start_Date: val })} />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Estimated End Date</label>
                  <DateInput className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={addProjectData.End_Date} onChange={val => setAddProjectData({ ...addProjectData, End_Date: val })} />
                </div>

              </div>

              <div className="modal-footer" style={{ marginTop: '1rem', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={adding}>
                  {adding ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default function ProjectsPage() {
  return (
    <NuqsAdapter>
      <React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div></div>}>
        <Projects />
      </React.Suspense>
    </NuqsAdapter>
  );
}