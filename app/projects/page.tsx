'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchProjects, updateProjectPhase, createProject, fetchQuotations, fetchProjectTypes, fetchProducts, fetchLeads } from '@/utils/api';
import { formatDateDDMMYYYY } from '@/utils/dateUtils';
import { useOptions } from '@/context/OptionsContext';
import {
  X, Loader2, Search, Clock, Target, Rocket,
  Package, PlayCircle, ArrowRightCircle, Ban, Plus, Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import DateInput from '@/components/DateInput';
import ClientAutocomplete from '@/components/ClientAutocomplete';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import AddClientModal from '@/components/AddClientModal';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

const Projects = () => {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [linkType, setLinkType] = useState<'Quotation' | 'Lead'>('Quotation');
  const { optionsMap } = useOptions();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [projectTypes, setProjectTypes] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('All');
  const [pipelineFilter, setPipelineFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  const [personFilter, setPersonFilter] = useState('All');
  const [assignedPersons, setAssignedPersons] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusCounts, setStatusCounts] = useState<any>({
    Active: 0,
    'On Hold': 0,
    Closed: 0,
    phaseCounts: { UAT: 0, Deployment: 0, Delivery: 0, GoLive: 0 }
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const ITEMS_PER_PAGE = 20;

  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [selectedDetailProject, setSelectedDetailProject] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updateData, setUpdateData] = useState({
    phase: 'UAT',
    uatStatus: 'Pending',
    feedback: '',
    uatDate: new Date().toISOString().split('T')[0],
    deploymentStatus: 'Pending',
    remarks: '',
    deploymentDate: new Date().toISOString().split('T')[0],
    deliveryStatus: 'Pending',
    deliveryDate: new Date().toISOString().split('T')[0],
    paymentSchedule: 'Monthly',
    renewalRate: 0,
    userWiseRate: 0,
    goLiveDate: new Date().toISOString().split('T')[0]
  });

  const [selectedTermProject, setSelectedTermProject] = useState<any | null>(null);
  const [terminating, setTerminating] = useState(false);
  const [terminateData, setTerminateData] = useState({
    Exit_Type: 'Cancelled',
    Stage: '',
    Reason: ''
  });

  const [selectedHoldProject, setSelectedHoldProject] = useState<any | null>(null);
  const [holding, setHolding] = useState(false);
  const [holdData, setHoldData] = useState({
    Hold_Reason: '',
    Hold_Start_Date: new Date().toISOString().split('T')[0],
    Hold_End_Date: ''
  });

  const [selectedEditProject, setSelectedEditProject] = useState<any | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    Project_Name: '',
    Priority: 'Normal',
    Pipeline_Status: 'Active',
    Assigned_Person: '',
    Report_Type: 'Overview',
    Costing: 0,
    Project_Type: '',
    Start_Date: '',
    End_Date: ''
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addProjectData, setAddProjectData] = useState({
    Project_Name: '',
    Project_Type: '',
    Quotation_Reference: '',
    Lead_Reference: '',
    Client_Reference: '',
    Product_Reference: '',
    Priority: 'Normal',
    Pipeline_Status: 'Active',
    Assigned_Person: '',
    Report_Type: 'Overview',
    Costing: 0,
    Requirement: '',
    Project_Scope_Description: '',
    Start_Date: new Date().toISOString().split('T')[0],
    End_Date: ''
  });

  const [clientSearchName, setClientSearchName] = useState('');
  const [productSearchName, setProductSearchName] = useState('');
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [projectsResponse, productsData] = await Promise.all([
        fetchProjects({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearch,
          phase: phaseFilter,
          pipeline: pipelineFilter,
          person: personFilter,
          sortBy: sortBy
        }),
        fetchProducts({ active: true, limit: 100 })
      ]);
      setProjects(projectsResponse.projects);
      setTotalItems(projectsResponse.totalItems);
      setStatusCounts(projectsResponse.statusCounts);
      setAssignedPersons(projectsResponse.assignedPersons || []);
      setProducts(productsData.products);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClientCreated = (newClient: any) => {
    if (isAddModalOpen) {
      setAddProjectData({
        ...addProjectData,
        Client_Reference: newClient._id
      });
      setClientSearchName(`${newClient.Company_Name} (Newly Added)`);
    }
    toast.success(`Client "${newClient.Company_Name}" created and selected!`);
  };

  const handleClientSelect = (client: any) => {
    if (isAddModalOpen) {
      setAddProjectData({
        ...addProjectData,
        Client_Reference: client._id
      });
      setClientSearchName(client.Company_Name);
      toast.success(`Client "${client.Company_Name}" selected!`);
    }
  };

  const handleProductSelect = (product: any) => {
    if (isAddModalOpen) {
      setAddProjectData({
        ...addProjectData,
        Product_Reference: product._id
      });
      setProductSearchName([product.Type, product.SubType, product.SubSubType].filter(Boolean).join(' > '));
      toast.success(`Service "${product.SubSubType || product.SubType || product.Type}" selected!`);
    }
  };

  const loadQuotations = async () => {
    try {
      const quotationsData = await fetchQuotations({ limit: 1000 });
      setQuotations(quotationsData.quotations);
    } catch (err: any) {
      toast.error('Error fetching quotations: ' + err.message);
    }
  };

  const loadLeads = async () => {
    try {
      const leadsData = await fetchLeads({ limit: 1000 });
      setLeads(leadsData.leads);
    } catch (err: any) {
      toast.error('Error fetching leads: ' + err.message);
    }
  };

  useEffect(() => {
    loadData();
    const loadTypes = async () => {
      try {
        const response = await fetchProjectTypes({ active: true, limit: 100 });
        setProjectTypes(response.projectTypes);
      } catch (err: any) {
        console.error('Error fetching project types:', err);
      }
    };
    loadTypes();
    loadQuotations();
    loadLeads();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, phaseFilter, sortBy, personFilter, pipelineFilter]);

  useEffect(() => {
    loadData();
  }, [currentPage, debouncedSearch, phaseFilter, sortBy, personFilter, pipelineFilter]);

  const handlePhaseAdvance = async (prj: any, currentPhase: string) => {
    setUpdating(true);
    let payload: any = {};
    const today = new Date().toISOString();

    if (currentPhase === 'UAT') {
      payload = { "UAT.UAT_Status": "Approved", "UAT.UAT_Date": today, "Deployment.Deployment_Status": "Pending" };
    } else if (currentPhase === 'Deployment') {
      payload = { "Deployment.Deployment_Status": "Success", "Deployment.Deployment_Date": today, "Delivery.Delivery_Status": "Pending" };
    } else if (currentPhase === 'Delivery') {
      payload = { "Delivery.Delivery_Status": "Delivered", "Delivery.Delivery_Date": today };
    }

    try {
      await updateProjectPhase(prj._id, payload);
      toast.success(`Project advanced past ${currentPhase} phase!`);
      loadData();
    } catch (err: any) {
      toast.error('Error advancing phase: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    setUpdating(true);
    try {
      let payload: any = {};
      if (updateData.phase === 'UAT') {
        payload = { UAT: { UAT_Status: updateData.uatStatus, UAT_Date: updateData.uatDate, Feedback: updateData.feedback } };
      } else if (updateData.phase === 'Deployment') {
        payload = { Deployment: { Deployment_Status: updateData.deploymentStatus, Deployment_Date: updateData.deploymentDate, Remarks: updateData.remarks } };
      } else if (updateData.phase === 'Delivery') {
        payload = { Delivery: { Delivery_Status: updateData.deliveryStatus, Delivery_Date: updateData.deliveryDate } };
      } else if (updateData.phase === 'Go_Live') {
        payload = { Go_Live: { Payment_Schedule: updateData.paymentSchedule, GoLive_Date: updateData.goLiveDate, Renewal_Rate: updateData.renewalRate, User_Wise_Rate: updateData.userWiseRate } };
      }

      await updateProjectPhase(selectedProject._id, payload);
      setSelectedProject(null);
      toast.success('Project phase updated successfully!');
      loadData();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditProject) return;

    setEditing(true);
    try {
      const payload = {
        Project_Name: editData.Project_Name,
        Priority: editData.Priority,
        Pipeline_Status: editData.Pipeline_Status,
        Start_Details: {
          ...selectedEditProject.Start_Details,
          Assigned_Person: editData.Assigned_Person,
          Report_Type: editData.Report_Type,
          Costing: editData.Costing,
          Start_Date: editData.Start_Date || undefined,
          End_Date: editData.End_Date || undefined
        }
      };

      await updateProjectPhase(selectedEditProject._id, payload);
      setSelectedEditProject(null);
      toast.success('Project details updated successfully!');
      loadData();
    } catch (err: any) {
      toast.error('Error updating project details: ' + err.message);
    } finally {
      setEditing(false);
    }
  };

  const handleHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHoldProject) return;

    setHolding(true);
    try {
      const payload = {
        Pipeline_Status: 'On Hold',
        Hold_History: [
          ...(selectedHoldProject.Hold_History || []),
          {
            Hold_Reason: holdData.Hold_Reason,
            Hold_Start_Date: holdData.Hold_Start_Date,
            Hold_End_Date: holdData.Hold_End_Date || undefined
          }
        ]
      };

      await updateProjectPhase(selectedHoldProject._id, payload);
      setSelectedHoldProject(null);
      toast.success('Project placed on hold successfully.');
      loadData();
    } catch (err: any) {
      toast.error('Error placing project on hold: ' + err.message);
    } finally {
      setHolding(false);
    }
  };

  const handleTerminate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTermProject) return;

    setTerminating(true);
    try {
      const payload = {
        Pipeline_Status: 'Closed',
        Termination: {
          Exit_Type: terminateData.Exit_Type,
          Stage: terminateData.Stage,
          Reason: terminateData.Reason,
          Date_Time: new Date().toISOString()
        }
      };

      await updateProjectPhase(selectedTermProject._id, payload);
      setSelectedTermProject(null);
      toast.success('Project terminated successfully.');
      loadData();
    } catch (err: any) {
      toast.error('Error terminating project: ' + err.message);
    } finally {
      setTerminating(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const payload = {
        Project_Name: addProjectData.Project_Name || undefined,
        Project_Type: addProjectData.Project_Type || undefined,
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

      await createProject(payload);
      toast.success('Project created successfully!');
      setIsAddModalOpen(false);
      loadData();
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

  const getPipelinePhase = (prj: any) => {
    return prj.Pipeline_Status || 'Active';
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div>
      <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading projects...</p>
    </div>
  );

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedProjects = projects;
  const filteredProjects = projects; // For safety with some existing refs

  // Use phaseCounts from state (populated by API)
  const phaseCountsOutput = statusCounts.phaseCounts || {
    UAT: 0,
    Deployment: 0,
    Delivery: 0,
    GoLive: 0
  };

  const toggleSort = (column: string) => {
    if (column === 'ID') {
      setSortBy(sortBy === 'ID-ASC' ? 'ID-DESC' : 'ID-ASC');
    } else if (column === 'Company') {
      setSortBy(sortBy === 'Company-A-Z' ? 'Company-Z-A' : 'Company-A-Z');
    } else if (column === 'Name') {
      setSortBy(sortBy === 'Name-A-Z' ? 'Newest' : 'Name-A-Z');
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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Briefcase className="text-blue-500" />
            Projects
          </h1>
          <div className="search-wrapper" style={{ minWidth: '400px', marginBottom: 0 }}>
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by ID, Name or Company..."
              className="premium-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.6rem 1rem 0.6rem 2.8rem', borderRadius: '10px', fontSize: '0.95rem' }}
            />
          </div>
        </div>
        {hasPermission(PERMISSIONS.PROJECTS_CREATE) && (
          <button
            onClick={() => {
              setIsAddModalOpen(true);
              loadQuotations();
            }}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Add Project
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'UAT Phase', key: 'UAT Phase', count: phaseCountsOutput.UAT, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', icon: <Target size={20} /> },
          { label: 'Deployment', key: 'Deployment Phase', count: phaseCountsOutput.Deployment, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', icon: <Rocket size={20} /> },
          { label: 'Delivery', key: 'Delivery Phase', count: phaseCountsOutput.Delivery, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', icon: <Package size={20} /> },
          { label: 'Go-Live Config', key: 'Go-Live Config', count: phaseCountsOutput.GoLive, color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.1)', icon: <PlayCircle size={20} /> }
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
              backgroundColor: phaseFilter === block.key ? block.bgColor : '#ffffff',
              boxShadow: phaseFilter === block.key
                ? `inset 0 0 0 2px ${block.color}, 0 8px 12px -3px ${block.bgColor}44`
                : `inset 0 0 0 1px var(--border-color)`,
              transition: 'all 0.3s ease',
            }}
            onClick={() => setPhaseFilter(phaseFilter === block.key ? 'All' : block.key)}
          >
            <div style={{
              backgroundColor: block.bgColor,
              padding: '0.75rem',
              borderRadius: '12px',
              color: block.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 6px -1px rgba(0,0,0,0.05)`
            }}>
              {block.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, lineHeight: 1, color: 'var(--text-primary)' }}>{block.count}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.15rem', letterSpacing: '0.025em' }}>{block.label}</p>
            </div>
          </div>
        ))}
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
                    onChange={(e) => setPersonFilter(e.target.value)}
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
                  onChange={(e) => setPipelineFilter(e.target.value)}
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
                  <option value="All" style={{ color: '#333' }}>Pipeline</option>
                  <option value="Active" style={{ color: '#333' }}>Active</option>
                  <option value="Closed" style={{ color: '#333' }}>Closed</option>
                  <option value="On Hold" style={{ color: '#333' }}>On Hold</option>
                </select>
              </th>
              <th style={{ whiteSpace: 'nowrap' }}>Phase</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProjects.map((prj: any) => {
              const currentPhase = getProjectPhase(prj);
              let badgeColor = 'badge-gray';
              if (currentPhase === 'Delivery Phase') badgeColor = 'badge-green';
              else if (currentPhase === 'Deployment Phase') badgeColor = 'badge-blue';
              else if (currentPhase === 'UAT Phase') badgeColor = 'badge-yellow';

              return (
                <tr
                  key={prj._id}
                  onClick={() => router.push('/projects/' + prj.Project_ID)}
                  style={{ cursor: 'pointer' }}
                >
                  <td><span className="font-semibold text-primary">{prj.Project_ID}</span></td>
                  <td><div className="font-medium text-white">{prj.Project_Name}</div></td>
                  <td><div className="font-medium text-white">{prj.Client_Reference?.Company_Name || 'N/A'}&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;{prj.Client_Reference?.Client_Name}</div>
                  </td>
                  <td>
                    <span>
                      {prj.Start_Details?.Assigned_Person
                        ? prj.Start_Details.Assigned_Person.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
                        : 'Unassigned'}
                    </span>
                  </td>
                  <td><span className={`badge ${prj.Priority === 'High' ? 'badge-yellow' : 'badge-gray'}`}>{prj.Priority}</span></td>
                  <td><span className={`badge ${prj.Pipeline_Status === 'Active' ? 'badge-green' : prj.Pipeline_Status === 'Closed' ? 'badge-red' : 'badge-yellow'}`}>{prj.Pipeline_Status || 'Active'}</span></td>
                  <td><span className={`badge ${badgeColor}`}>{currentPhase}</span></td>
                </tr>
              );
            })}
            {filteredProjects.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No projects found matching your search.</td></tr>
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

      {/* Phase Update Modal */}
      {selectedProject && (
        <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Update Project Phase</h2>
                <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0 }}>Project: <strong>{selectedProject.Project_ID}</strong> ({selectedProject.Project_Name})</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedProject(null)}><X size={24} /></button>
            </div>

            <form onSubmit={handleUpdate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '2rem' }}>

                {/* Left Column: Phase Selection */}
                <div>
                  <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>Phase Selection</h3>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Select Phase to Update *</label>
                    <select
                      className="form-select"
                      style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      value={updateData.phase}
                      onChange={e => setUpdateData({ ...updateData, phase: e.target.value })}
                    >
                      <option value="UAT">UAT Phase</option>
                      <option value="Deployment">Deployment Phase</option>
                      <option value="Delivery">Delivery Phase</option>
                      <option value="Go_Live">Go-Live Phase</option>
                    </select>
                  </div>
                </div>

                {/* Right Column: Phase Configuration */}
                <div>
                  <h3 style={{ fontSize: '1rem', color: 'var(--primary-color)', marginBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>Phase Configuration</h3>

                  {updateData.phase === 'UAT' && (
                    <div className="slide-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>UAT Status</label>
                        <select
                          className="form-select"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          value={updateData.uatStatus}
                          onChange={e => setUpdateData({ ...updateData, uatStatus: e.target.value })}
                        >
                          {optionsMap?.project?.uatStatus?.map((status: string) => (
                            <option key={status} value={status}>{status}</option>
                          )) || (
                              <>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                              </>
                            )}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>UAT Date</label>
                        <DateInput
                          className="form-input"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          value={updateData.uatDate}
                          onChange={val => setUpdateData({ ...updateData, uatDate: val })}
                        />
                      </div>
                      <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Feedback</label>
                        <textarea
                          className="form-textarea"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          rows={3}
                          value={updateData.feedback}
                          onChange={e => setUpdateData({ ...updateData, feedback: e.target.value })}
                          placeholder="Client feedback during UAT..."
                        />
                      </div>
                    </div>
                  )}

                  {updateData.phase === 'Deployment' && (
                    <div className="slide-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Deployment Status</label>
                        <select
                          className="form-select"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          value={updateData.deploymentStatus}
                          onChange={e => setUpdateData({ ...updateData, deploymentStatus: e.target.value })}
                        >
                          {optionsMap?.project?.deploymentStatus?.map((status: string) => (
                            <option key={status} value={status}>{status}</option>
                          )) || (
                              <>
                                <option value="Pending">Pending</option>
                                <option value="Success">Success</option>
                                <option value="Failed">Failed</option>
                              </>
                            )}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Deployment Date</label>
                        <DateInput
                          className="form-input"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          value={updateData.deploymentDate}
                          onChange={val => setUpdateData({ ...updateData, deploymentDate: val })}
                        />
                      </div>
                      <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Remarks</label>
                        <textarea
                          className="form-textarea"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          rows={3}
                          value={updateData.remarks}
                          onChange={e => setUpdateData({ ...updateData, remarks: e.target.value })}
                          placeholder="Deployment notes or issues..."
                        />
                      </div>
                    </div>
                  )}

                  {updateData.phase === 'Delivery' && (
                    <div className="slide-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Delivery Status</label>
                        <select
                          className="form-select"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          value={updateData.deliveryStatus}
                          onChange={e => setUpdateData({ ...updateData, deliveryStatus: e.target.value })}
                        >
                          {optionsMap?.project?.deliveryStatus?.map((status: string) => (
                            <option key={status} value={status}>{status}</option>
                          )) || (
                              <>
                                <option value="Pending">Pending</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Partial">Partial</option>
                              </>
                            )}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Delivery Date</label>
                        <DateInput
                          className="form-input"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          value={updateData.deliveryDate}
                          onChange={val => setUpdateData({ ...updateData, deliveryDate: val })}
                        />
                      </div>
                    </div>
                  )}

                  {updateData.phase === 'Go_Live' && (
                    <div className="slide-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Payment Schedule</label>
                        <select
                          className="form-select"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          value={updateData.paymentSchedule}
                          onChange={e => setUpdateData({ ...updateData, paymentSchedule: e.target.value })}
                        >
                          {optionsMap?.project?.paymentSchedule?.map((status: string) => (
                            <option key={status} value={status}>{status}</option>
                          )) || (
                              <>
                                <option value="Monthly">Monthly</option>
                                <option value="Quarterly">Quarterly</option>
                                <option value="Yearly">Yearly</option>
                              </>
                            )}
                        </select>
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Renewal Rate (₹)</label>
                        <input
                          type="number"
                          className="form-input"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          value={updateData.renewalRate}
                          onChange={e => setUpdateData({ ...updateData, renewalRate: parseFloat(e.target.value) })}
                          placeholder="e.g. 10000"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>User Wise Rate (₹)</label>
                        <input
                          type="number"
                          className="form-input"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          value={updateData.userWiseRate}
                          onChange={e => setUpdateData({ ...updateData, userWiseRate: parseFloat(e.target.value) })}
                          placeholder="e.g. 500"
                        />
                      </div>
                      <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Go-Live Date</label>
                        <DateInput
                          className="form-input"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                          value={updateData.goLiveDate}
                          onChange={val => setUpdateData({ ...updateData, goLiveDate: val })}
                        />
                      </div>
                    </div>
                  )}

                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedProject(null)}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={updating || ['On Hold', 'Closed'].includes(selectedProject.Pipeline_Status)}
                  title={['On Hold', 'Closed'].includes(selectedProject.Pipeline_Status) ? `Cannot save phase updates while project is ${selectedProject.Pipeline_Status}` : ""}
                >
                  {updating ? <><Loader2 size={16} className="animate-spin" /> Updating...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Details Modal */}
      {selectedEditProject && (
        <div className="modal-overlay" onClick={() => setSelectedEditProject(null)}>
          <div className="modal-content" style={{ maxWidth: '750px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem' }}>Edit Project Details</h2>
              <button className="modal-close" onClick={() => setSelectedEditProject(null)}><X size={24} /></button>
            </div>

            <form onSubmit={handleEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Project Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={editData.Project_Name}
                    onChange={e => setEditData({ ...editData, Project_Name: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Project Type *</label>
                  <select
                    className="form-select"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    required
                    value={editData.Project_Type}
                    onChange={e => setEditData({ ...editData, Project_Type: e.target.value })}
                  >
                    <option value="">-- Select Type --</option>
                    {projectTypes.map(t => (
                      <option key={t._id} value={t._id}>{t.Type_Name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Priority</label>
                  <select
                    className="form-select"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={editData.Priority}
                    onChange={e => setEditData({ ...editData, Priority: e.target.value })}
                  >
                    {optionsMap?.project?.priority?.map((p: string) => (
                      <option key={p} value={p}>{p}</option>
                    )) || (
                        <>
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                        </>
                      )}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Pipeline Status</label>
                  <select
                    className="form-select"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={editData.Pipeline_Status}
                    onChange={e => {
                      const newStatus = e.target.value;
                      if (newStatus === 'On Hold') {
                        setSelectedHoldProject(selectedEditProject);
                        setEditData({ ...editData, Pipeline_Status: 'Active' }); // Revert select value since modal handles hold
                        setSelectedEditProject(null); // Close Edit modal
                      } else if (newStatus === 'Closed') {
                        setSelectedTermProject(selectedEditProject);
                        const currentPhase = getProjectPhase(selectedEditProject);
                        setTerminateData({
                          Exit_Type: 'Cancelled',
                          Stage: currentPhase,
                          Reason: ''
                        });
                        setEditData({ ...editData, Pipeline_Status: 'Active' });
                        setSelectedEditProject(null);
                      } else {
                        setEditData({ ...editData, Pipeline_Status: newStatus });
                      }
                    }}
                  >
                    {optionsMap?.project?.pipelineStatus?.filter((p: string) => {
                      if (!hasPermission(PERMISSIONS.PROJECTS_DELETE)) {
                        return p !== 'Closed';
                      }
                      return true;
                    }).map((p: string) => (
                      <option key={p} value={p}>{p}</option>
                    )) || (
                        <>
                          <option value="Active">Active</option>
                          <option value="On Hold">On Hold</option>
                          {hasPermission(PERMISSIONS.PROJECTS_DELETE) && <option value="Closed">Closed</option>}
                        </>
                      )}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Assigned Person</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={editData.Assigned_Person}
                    onChange={e => setEditData({ ...editData, Assigned_Person: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Report Type</label>
                  <select
                    className="form-select"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={editData.Report_Type}
                    onChange={e => setEditData({ ...editData, Report_Type: e.target.value })}
                  >
                    {optionsMap?.project?.reportType?.map((r: string) => (
                      <option key={r} value={r}>{r}</option>
                    )) || (
                        <>
                          <option value="Overview">Overview</option>
                          <option value="Detailed">Detailed</option>
                        </>
                      )}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Costing (₹)</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={editData.Costing}
                    onChange={e => setEditData({ ...editData, Costing: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Start Date</label>
                  <DateInput
                    required
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={editData.Start_Date}
                    onChange={val => setEditData({ ...editData, Start_Date: val })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>End Date</label>
                  <DateInput
                    required
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={editData.End_Date}
                    onChange={val => setEditData({ ...editData, End_Date: val })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedEditProject(null)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={editing}>
                  {editing ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terminate Modal */}
      {selectedTermProject && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '95%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2 className="text-red-500 flex items-center gap-2" style={{ fontSize: '1.2rem' }}>Terminate Project</h2>
              <button className="modal-close" onClick={() => setSelectedTermProject(null)}><X size={20} /></button>
            </div>

            <form onSubmit={handleTerminate}>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <p style={{ fontSize: '0.85rem', color: '#ef4444', marginBottom: '0.25rem' }}>Terminating Project: <strong>{selectedTermProject.Project_ID}</strong></p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>This action moves the project to Closed status.</p>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Exit Type *</label>
                <select
                  className="form-select"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  required
                  value={terminateData.Exit_Type}
                  onChange={e => setTerminateData({ ...terminateData, Exit_Type: e.target.value })}
                >
                  <option value="Terminate">Terminate</option>
                  {getProjectPhase(selectedTermProject) === 'Go-Live Config' && (
                    <option value="Discontinue">Discontinue</option>
                  )}
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Current Stage *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  value={terminateData.Stage}
                  onChange={e => setTerminateData({ ...terminateData, Stage: e.target.value })}
                  placeholder="e.g. During Document Verification, Post-UAT"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Reason for Termination *</label>
                <textarea
                  required
                  rows={3}
                  className="form-textarea"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  value={terminateData.Reason}
                  onChange={e => setTerminateData({ ...terminateData, Reason: e.target.value })}
                  placeholder="Explain why this project is being terminated..."
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedTermProject(null)}>Cancel</button>
                <button type="submit" className="btn btn-secondary" style={{ backgroundColor: '#ef4444', color: 'white', borderColor: '#ef4444' }} disabled={terminating}>
                  {terminating ? <><Loader2 size={16} className="animate-spin" /> Terminating...</> : 'Terminate Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hold Modal */}
      {selectedHoldProject && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', width: '95%', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2 className="text-yellow-500 flex items-center gap-2" style={{ fontSize: '1.2rem' }}>Put Project On Hold</h2>
              <button className="modal-close" onClick={() => setSelectedHoldProject(null)}><X size={20} /></button>
            </div>

            <form onSubmit={handleHold}>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                <p style={{ fontSize: '0.85rem', color: '#eab308', marginBottom: '0.25rem' }}>Holding Project: <strong>{selectedHoldProject.Project_ID}</strong></p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>This action moves the project to On Hold status.</p>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Hold Start Date *</label>
                <DateInput
                  required
                  className="form-input"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  value={holdData.Hold_Start_Date}
                  onChange={val => setHoldData({ ...holdData, Hold_Start_Date: val })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Hold End Date (Optional)</label>
                <DateInput
                  className="form-input"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  value={holdData.Hold_End_Date}
                  onChange={val => setHoldData({ ...holdData, Hold_End_Date: val })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Reason for Hold *</label>
                <textarea
                  required
                  rows={3}
                  className="form-textarea"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                  value={holdData.Hold_Reason}
                  onChange={e => setHoldData({ ...holdData, Hold_Reason: e.target.value })}
                  placeholder="Explain why this project is being put on hold..."
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedHoldProject(null)}>Cancel</button>
                <button type="submit" className="btn btn-secondary" style={{ backgroundColor: '#eab308', color: 'white', borderColor: '#eab308' }} disabled={holding}>
                  {holding ? <><Loader2 size={16} className="animate-spin" /> Putting on Hold...</> : 'Confirm Hold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
                  <input
                    type="text"
                    required
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={addProjectData.Project_Name}
                    onChange={e => setAddProjectData({ ...addProjectData, Project_Name: e.target.value })}
                    placeholder="e.g. Website Development"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Project Type *</label>
                  <select
                    className="form-select"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    required
                    value={addProjectData.Project_Type}
                    onChange={e => setAddProjectData({ ...addProjectData, Project_Type: e.target.value })}
                  >
                    <option value="">-- Select Type --</option>
                    {projectTypes.map(t => (
                      <option key={t._id} value={t._id}>{t.Type_Name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', margin: 0 }}>
                      {linkType === 'Quotation' ? 'Linked Quotation (Optional)' : 'Linked Lead (Optional)'}
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkType('Quotation');
                          setAddProjectData({ ...addProjectData, Lead_Reference: '', Quotation_Reference: '' });
                        }}
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: linkType === 'Quotation' ? 'var(--primary-color)' : 'transparent',
                          color: linkType === 'Quotation' ? 'white' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >Quotation</button>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkType('Lead');
                          setAddProjectData({ ...addProjectData, Lead_Reference: '', Quotation_Reference: '' });
                        }}
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: linkType === 'Lead' ? 'var(--primary-color)' : 'transparent',
                          color: linkType === 'Lead' ? 'white' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >Lead</button>
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
                          ...addProjectData,
                          Quotation_Reference: qId,
                          Lead_Reference: q?.Lead_ID?._id || '',
                          Client_Reference: q?.Client_Reference?._id || '',
                          Product_Reference: q?.Product_Reference?._id || '',
                          Project_Name: addProjectData.Project_Name || q?.Client_Reference?.Company_Name || '',
                          Requirement: q?.Requirement || '',
                          Project_Scope_Description: q?.Project_Scope_Description || '',
                          Costing: addProjectData.Costing || q?.Commercial || 0
                        });
                        if (q?.Client_Reference) {
                          setClientSearchName(q.Client_Reference.Company_Name);
                        }
                        if (q?.Product_Reference) {
                          setProductSearchName([q.Product_Reference.Type, q.Product_Reference.SubType, q.Product_Reference.SubSubType].filter(Boolean).join(' > '));
                        }
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
                          ...addProjectData,
                          Lead_Reference: lId,
                          Quotation_Reference: '',
                          Client_Reference: l?.Client_Reference?._id || '',
                          Product_Reference: l?.Product_Reference?._id || '',
                          Project_Name: addProjectData.Project_Name || l?.Client_Reference?.Company_Name || '',
                          Requirement: l?.Notes || '',
                          Project_Scope_Description: '',
                          Costing: addProjectData.Costing || 0
                        });
                        if (l?.Client_Reference) {
                          setClientSearchName(l.Client_Reference.Company_Name);
                        }
                        if (l?.Product_Reference) {
                          setProductSearchName([l.Product_Reference.Type, l.Product_Reference.SubType, l.Product_Reference.SubSubType].filter(Boolean).join(' > '));
                        }
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
                  <select
                    className="form-select"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={addProjectData.Pipeline_Status}
                    onChange={e => setAddProjectData({ ...addProjectData, Pipeline_Status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Product/Service *</label>
                  <ProductAutocomplete
                    value={productSearchName}
                    onChange={(val) => setProductSearchName(val)}
                    onSelect={handleProductSelect}
                    placeholder="Search product..."
                  />
                  {addProjectData.Product_Reference && (
                    <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem', fontWeight: 500 }}>
                      ✓ Product linked successfully.
                    </p>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 3' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', margin: 0 }}>Client / Company Selection *</label>
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      style={{ fontSize: '0.75rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onClick={() => setIsAddClientModalOpen(true)}
                    >
                      + Add New
                    </button>
                  </div>
                  <ClientAutocomplete
                    value={clientSearchName}
                    onChange={setClientSearchName}
                    onSelect={handleClientSelect}
                    placeholder="Search client or company..."
                  />
                  {addProjectData.Client_Reference && (
                    <p style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem', fontWeight: 500 }}>
                      ✓ Client linked successfully.
                    </p>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 3' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Core Requirements</label>
                      <textarea
                        className="form-textarea"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', minHeight: '80px' }}
                        value={addProjectData.Requirement}
                        onChange={e => setAddProjectData({ ...addProjectData, Requirement: e.target.value })}
                        placeholder="Project requirements..."
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Project Scope</label>
                      <textarea
                        className="form-textarea"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', minHeight: '80px' }}
                        value={addProjectData.Project_Scope_Description}
                        onChange={e => setAddProjectData({ ...addProjectData, Project_Scope_Description: e.target.value })}
                        placeholder="Detailed scope of work..."
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Priority *</label>
                  <select
                    className="form-select"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={addProjectData.Priority}
                    onChange={e => setAddProjectData({ ...addProjectData, Priority: e.target.value })}
                  >
                    {optionsMap?.project?.priority?.map((p: string) => (
                      <option key={p} value={p}>{p}</option>
                    )) || (
                        <>
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                          <option value="Low">Low</option>
                        </>
                      )}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Assigned Person</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={addProjectData.Assigned_Person}
                    onChange={e => setAddProjectData({ ...addProjectData, Assigned_Person: e.target.value })}
                    placeholder="Name of individual"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Report Type</label>
                  <select
                    className="form-select"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={addProjectData.Report_Type}
                    onChange={e => setAddProjectData({ ...addProjectData, Report_Type: e.target.value })}
                  >
                    <option value="Overview">Overview</option>
                    <option value="Detailed">Detailed</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Project Cost (Costing) *</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={addProjectData.Costing}
                    onChange={e => setAddProjectData({ ...addProjectData, Costing: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Start Date *</label>
                  <DateInput
                    required
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={addProjectData.Start_Date}
                    onChange={val => setAddProjectData({ ...addProjectData, Start_Date: val })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Estimated End Date</label>
                  <DateInput
                    className="form-input"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={addProjectData.End_Date}
                    onChange={val => setAddProjectData({ ...addProjectData, End_Date: val })}
                  />
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

      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onSuccess={handleClientCreated}
        isStacked={true}
      />
    </div>
  );
};

export default Projects;
