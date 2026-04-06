'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchProjectById, updateProjectPhase, fetchProjectTypes } from '@/utils/api';
import { formatDateDDMMYYYY } from '@/utils/dateUtils';
import { useOptions } from '@/context/OptionsContext';
import {
  X, Loader2, Clock, ArrowRightCircle, Ban, ArrowLeft,
  Plus, Edit3, Trash2, Bell, Search, ChevronDown, MoreVertical,
  Calendar, FileText, CreditCard, TrendingUp, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import DateInput from '@/components/DateInput';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';

const ProjectDetails = () => {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { optionsMap } = useOptions();
  const { hasPermission } = usePermissions();

  const [project, setProject] = useState<any | null>(null);
  const [projectTypes, setProjectTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
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
    Project_Type: '',
    Priority: 'Normal',
    Pipeline_Status: 'Active',
    Assigned_Person: '',
    Report_Type: 'Overview',
    Costing: 0,
    Start_Date: '',
    End_Date: ''
  });

  // Action Modals visibility state
  const [showPhaseUpgradeModal, setShowPhaseUpgradeModal] = useState(false);

  // External Services state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showDeleteServiceConfirm, setShowDeleteServiceConfirm] = useState(false);
  const [serviceToDeleteIndex, setServiceToDeleteIndex] = useState<number | null>(null);
  const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);
  const [savingService, setSavingService] = useState(false);
  const [isDeletingService, setIsDeletingService] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    Service_Name: '',
    Inquiry_Date: new Date().toISOString().split('T')[0],
    Delivery_Date: '',
    Amount: 0,
    Billing_Status: 'Working',
    Status_Date: new Date().toISOString().split('T')[0],
    Cycle_Anchor_Date: new Date().toISOString().split('T')[0],
    Payment_Timeline: '',
    Payment_Terms: 'Monthly',
    Reminder: {
      Enabled: true,
      Notify_Before: '3 days before'
    }
  });

  // Tab State
  const [activeTab, setActiveTab] = useState<'details' | 'hold' | 'termination'>('details');

  const loadProject = async () => {
    try {
      if (!id) return;
      setLoading(true);
      const [data, typesResponse] = await Promise.all([
        fetchProjectById(id),
        fetchProjectTypes({ active: true, limit: 100 })
      ]);
      setProject(data);
      setProjectTypes(typesResponse.projectTypes);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  const getNextBilling = (svc: any) => {
    // Only use Cycle Anchor Date to calculate upcoming payments.
    // Falls back to null if no Cycle Anchor exists (i.e., status has never been 'Generated').
    const base = svc.Cycle_Anchor_Date;
    if (!base) return null;

    const now = new Date();
    const baseDate = new Date(base);
    let monthsInterval = 1;
    if (svc.Payment_Terms === 'Quarterly') monthsInterval = 3;
    if (svc.Payment_Terms === 'Annually') monthsInterval = 12;

    let nextBilling = new Date(baseDate);
    // Ensure we find the NEXT upcoming date from 'now'
    while (nextBilling <= now) {
      nextBilling.setMonth(nextBilling.getMonth() + monthsInterval);
    }
    return nextBilling;
  };

  // Proactive Reminder Check on Load
  useEffect(() => {
    if (project?.External_Services?.length) {
      const now = new Date();
      project.External_Services.forEach((svc: any) => {
        if (!svc.Reminder?.Enabled) return;

        const nextBilling = getNextBilling(svc);
        if (!nextBilling) return;

        const notifyDays = svc.Reminder.Notify_Before?.match(/\d+/) ? parseInt(svc.Reminder.Notify_Before.match(/\d+/)[0]) : 3;
        const reminderDate = new Date(nextBilling);
        reminderDate.setDate(reminderDate.getDate() - notifyDays);

        if (now >= reminderDate && now <= nextBilling) {
          const daysLeft = Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          toast(`Reminder: [${project.Project_ID}] ${svc.Service_Name} billing due in ${daysLeft} day(s)!`, {
            icon: '🔔',
            duration: 6000,
            style: { border: '1px solid #f59e0b', color: '#d97706', fontWeight: '600' }
          });
        }
      });
    }
  }, [project]);

  const getProjectPhase = (prj: any) => {
    if (prj.Delivery?.Delivery_Status === 'Delivered') return 'Go-Live Config';
    if (prj.Deployment?.Deployment_Status === 'Success') return 'Delivery Phase';
    if (prj.UAT?.UAT_Status === 'Approved') return 'Deployment Phase';
    if (prj.UAT?.UAT_Status === 'Pending' || prj.UAT?.UAT_Status === 'Rejected') return 'UAT Phase';
    return 'Pending UAT';
  };

  const currentPhase = project ? getProjectPhase(project) : '';

  const handlePhaseAdvance = async (prj: any, phase: string) => {
    setUpdating(true);
    let payload: any = {};
    const today = new Date().toISOString();

    if (phase === 'UAT') {
      payload = { "UAT.UAT_Status": "Approved", "UAT.UAT_Date": today, "Deployment.Deployment_Status": "Pending" };
    } else if (phase === 'Deployment') {
      payload = { "Deployment.Deployment_Status": "Success", "Deployment.Deployment_Date": today, "Delivery.Delivery_Status": "Pending" };
    } else if (phase === 'Delivery') {
      payload = { "Delivery.Delivery_Status": "Delivered", "Delivery.Delivery_Date": today };
    }

    try {
      await updateProjectPhase(prj._id, payload);
      toast.success(`Project advanced past ${phase} phase!`);
      loadProject();
    } catch (err: any) {
      toast.error('Error advancing phase: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    if (updateData.phase === 'UAT') {
      if (!updateData.uatStatus) { toast.error('UAT Status is required.'); return; }
      if (!updateData.uatDate) { toast.error('UAT Date is required.'); return; }
    } else if (updateData.phase === 'Deployment') {
      if (!updateData.deploymentStatus) { toast.error('Deployment Status is required.'); return; }
      if (!updateData.deploymentDate) { toast.error('Deployment Date is required.'); return; }
    } else if (updateData.phase === 'Delivery') {
      if (!updateData.deliveryStatus) { toast.error('Delivery Status is required.'); return; }
      if (!updateData.deliveryDate) { toast.error('Delivery Date is required.'); return; }
    } else if (updateData.phase === 'Go_Live') {
      if (!updateData.goLiveDate) { toast.error('Go-Live Date is required.'); return; }
    }

    setUpdating(true);
    try {
      let payload: any = {};
      const today = new Date().toISOString();
      if (updateData.phase === 'UAT') {
        payload = { "UAT.UAT_Status": updateData.uatStatus, "UAT.UAT_Date": updateData.uatDate || today, "UAT.Feedback": updateData.feedback };
        if (updateData.uatStatus === 'Approved') payload["Deployment.Deployment_Status"] = 'Pending';
      } else if (updateData.phase === 'Deployment') {
        payload = { "Deployment.Deployment_Status": updateData.deploymentStatus, "Deployment.Deployment_Date": updateData.deploymentDate || today, "Deployment.Remarks": updateData.remarks };
        if (updateData.deploymentStatus === 'Success') payload["Delivery.Delivery_Status"] = 'Pending';
      } else if (updateData.phase === 'Delivery') {
        payload = { "Delivery.Delivery_Status": updateData.deliveryStatus, "Delivery.Delivery_Date": updateData.deliveryDate || today };
      } else if (updateData.phase === 'Go_Live') {
        payload = { "Go_Live.Payment_Schedule": updateData.paymentSchedule, "Go_Live.GoLive_Date": updateData.goLiveDate || today, "Go_Live.Renewal_Rate": updateData.renewalRate, "Go_Live.User_Wise_Rate": updateData.userWiseRate };
      }

      await updateProjectPhase(project._id, payload);
      setShowPhaseUpgradeModal(false);
      toast.success('Project phase updated successfully!');
      loadProject();
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditProject) return;

    if (!editData.Project_Name || editData.Project_Name.length < 3) {
      toast.error('Project Name must be at least 3 characters.'); return;
    }
    if (editData.Costing < 0) { toast.error('Costing cannot be negative.'); return; }
    if (editData.Start_Date && editData.End_Date && new Date(editData.End_Date) < new Date(editData.Start_Date)) {
      toast.error('End Date cannot be before Start Date.'); return;
    }

    setEditing(true);
    try {
      const payload = {
        Project_Name: editData.Project_Name,
        Project_Type: editData.Project_Type,
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
      loadProject();
    } catch (err: any) {
      toast.error('Error updating project details: ' + err.message);
    } finally {
      setEditing(false);
    }
  };

  const handleHold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHoldProject) return;

    if (!holdData.Hold_Reason || holdData.Hold_Reason.length < 10) {
      toast.error('Hold reason must be at least 10 characters.'); return;
    }
    if (!holdData.Hold_Start_Date) { toast.error('Hold Start Date is required.'); return; }

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
      loadProject();
    } catch (err: any) {
      toast.error('Error placing project on hold: ' + err.message);
    } finally {
      setHolding(false);
    }
  };

  const handleTerminate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTermProject) return;

    if (!terminateData.Exit_Type) { toast.error('Exit Type is required.'); return; }
    if (!terminateData.Stage) { toast.error('Current Stage is required.'); return; }
    if (!terminateData.Reason || terminateData.Reason.length < 10) {
      toast.error('Termination reason must be at least 10 characters.'); return;
    }

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
      toast.success('Project terminated and archived successfully.');
      loadProject();
    } catch (err: any) {
      toast.error('Error terminating project: ' + err.message);
    } finally {
      setTerminating(false);
    }
  };

  const resetServiceForm = () => {
    setServiceFormData({
      Service_Name: '',
      Inquiry_Date: new Date().toISOString().split('T')[0],
      Delivery_Date: '',
      Amount: 0,
      Billing_Status: 'Working',
      Status_Date: new Date().toISOString().split('T')[0],
      Cycle_Anchor_Date: '',
      Payment_Timeline: '',
      Payment_Terms: 'Monthly',
      Reminder: { Enabled: true, Notify_Before: '3 days before' }
    });
    setEditingServiceIndex(null);
  };

  const handleOpenAddService = () => {
    resetServiceForm();
    setShowServiceModal(true);
  };

  const handleOpenEditService = (index: number) => {
    const svc = project.External_Services[index];
    setServiceFormData({
      Service_Name: svc.Service_Name || '',
      Inquiry_Date: svc.Inquiry_Date ? new Date(svc.Inquiry_Date).toISOString().split('T')[0] : '',
      Delivery_Date: svc.Delivery_Date ? new Date(svc.Delivery_Date).toISOString().split('T')[0] : '',
      Amount: svc.Amount || 0,
      Billing_Status: svc.Billing_Status || 'Working',
      Status_Date: svc.Status_Date ? new Date(svc.Status_Date).toISOString().split('T')[0] : '',
      Cycle_Anchor_Date: svc.Cycle_Anchor_Date ? new Date(svc.Cycle_Anchor_Date).toISOString().split('T')[0] : '',
      Payment_Timeline: svc.Payment_Timeline || '',
      Payment_Terms: svc.Payment_Terms || 'Monthly',
      Reminder: {
        Enabled: svc.Reminder?.Enabled || false,
        Notify_Before: svc.Reminder?.Notify_Before || '3 days before'
      }
    });
    setEditingServiceIndex(index);
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    if (!serviceFormData.Service_Name.trim()) { toast.error('Service name is required.'); return; }
    if (serviceFormData.Amount < 0) { toast.error('Amount cannot be negative.'); return; }

    setSavingService(true);
    try {
      const services = [...(project.External_Services || [])];
      const entry = {
        ...serviceFormData,
        Inquiry_Date: serviceFormData.Inquiry_Date || undefined,
        Delivery_Date: serviceFormData.Delivery_Date || undefined,
        Status_Date: serviceFormData.Status_Date || undefined,
        Cycle_Anchor_Date: serviceFormData.Cycle_Anchor_Date || undefined
      };

      if (editingServiceIndex !== null) {
        services[editingServiceIndex] = { ...services[editingServiceIndex], ...entry };
      } else {
        services.push(entry as any);
      }

      await updateProjectPhase(project._id, { External_Services: services });
      setShowServiceModal(false);
      resetServiceForm();
      toast.success(editingServiceIndex !== null ? 'Service updated successfully!' : 'Service added successfully!');
      loadProject();
    } catch (err: any) {
      toast.error('Error saving service: ' + err.message);
    } finally {
      setSavingService(false);
    }
  };

  const handleDeleteService = (index: number) => {
    setServiceToDeleteIndex(index);
    setShowDeleteServiceConfirm(true);
  };

  const confirmDeleteService = async () => {
    if (!project || serviceToDeleteIndex === null) return;

    setIsDeletingService(true);
    try {
      const services = [...(project.External_Services || [])];
      services.splice(serviceToDeleteIndex, 1);
      await updateProjectPhase(project._id, { External_Services: services });
      toast.success('Service removed successfully!');
      setShowDeleteServiceConfirm(false);
      setServiceToDeleteIndex(null);
      loadProject();
    } catch (err: any) {
      toast.error('Error removing service: ' + err.message);
    } finally {
      setIsDeletingService(false);
    }
  };

  const getBillingStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      'Working': { bg: 'rgba(99,102,241,0.08)', text: '#6366f1', border: 'rgba(99,102,241,0.2)' },
      'Generated': { bg: 'rgba(59,130,246,0.08)', text: '#3b82f6', border: 'rgba(59,130,246,0.2)' },
      'Given to Client': { bg: 'rgba(245,158,11,0.08)', text: '#d97706', border: 'rgba(245,158,11,0.2)' },
      'Receiving': { bg: 'rgba(16,185,129,0.08)', text: '#059669', border: 'rgba(16,185,129,0.2)' },
      'Under Process': { bg: 'rgba(139,92,246,0.08)', text: '#7c3aed', border: 'rgba(139,92,246,0.2)' },
      'Received': { bg: 'rgba(16,185,129,0.12)', text: '#047857', border: 'rgba(16,185,129,0.3)' }
    };
    return colors[status] || colors['Working'];
  };

  const renderPhaseStep = (label: string, isActive: boolean, isCompleted: boolean, date?: string) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={{
        width: '1.5rem', height: '1.5rem', borderRadius: '50%',
        backgroundColor: isActive ? 'var(--primary-color)' : isCompleted ? '#10b981' : 'rgba(0,0,0,0.05)',
        color: isActive || isCompleted ? '#fff' : 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
        fontWeight: 'bold', fontSize: '0.75rem',
        boxShadow: isActive ? '0 0 0 4px rgba(99, 102, 241, 0.2)' : 'none',
        transition: 'all 0.3s ease'
      }}>
        {isCompleted ? '✓' : ''}
      </div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '0.5rem', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>{date || 'Pending'}</div>
    </div>
  );

  if (loading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin" /> Loading project details...</div>;
  if (error) return <div className="text-secondary bg-red-900/20 p-4 rounded-lg text-red-500">Error: {error}</div>;
  if (!project) return <div className="p-8 text-secondary">Project not found.</div>;

  let detailBadge = 'badge-gray';
  let uatStatusDisplay = project.UAT?.UAT_Status || 'Pending';
  let deploymentStatusDisplay = project.Deployment?.Deployment_Status || 'Pending';
  let deliveryStatusDisplay = project.Delivery?.Delivery_Status || 'Pending';

  if (currentPhase === 'Go-Live Config') {
    detailBadge = 'badge-blue';
    uatStatusDisplay = uatStatusDisplay === 'Pending' ? 'Approved' : uatStatusDisplay;
    deploymentStatusDisplay = deploymentStatusDisplay === 'Pending' ? 'Success' : deploymentStatusDisplay;
    deliveryStatusDisplay = deliveryStatusDisplay === 'Pending' ? 'Delivered' : deliveryStatusDisplay;
  }
  else if (currentPhase === 'Delivery Phase') {
    detailBadge = 'badge-green';
    uatStatusDisplay = uatStatusDisplay === 'Pending' ? 'Approved' : uatStatusDisplay;
    deploymentStatusDisplay = deploymentStatusDisplay === 'Pending' ? 'Success' : deploymentStatusDisplay;
  }
  else if (currentPhase === 'Deployment Phase') {
    detailBadge = 'badge-blue';
    uatStatusDisplay = uatStatusDisplay === 'Pending' ? 'Approved' : uatStatusDisplay;
  }
  else if (currentPhase === 'UAT Phase') {
    detailBadge = 'badge-yellow';
  }

  return (
    <div>
      {/* Hero Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.02) 0%, rgba(99,102,241,0.08) 100%)',
        borderRadius: '1.25rem', padding: '1.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden',
        border: '1px solid rgba(99,102,241,0.08)'
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', borderRadius: '50%' }}></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1, marginBottom: '1.5rem' }}>
          <div>
            <button
              onClick={() => router.push('/projects')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'white', border: '1px solid rgba(0,0,0,0.05)',
                padding: '0.35rem 0.75rem', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)',
                marginBottom: '1rem', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.02)', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.02)'; }}
            >
              <ArrowLeft size={14} /> Back to Projects
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {project.Project_Name}
              </h1>
              <span className={`badge ${project.Pipeline_Status === 'Active' ? 'badge-green' : project.Pipeline_Status === 'Closed' ? 'badge-red' : 'badge-yellow'}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderRadius: '2rem' }}>
                {project.Pipeline_Status}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>
              ID: {project.Project_ID} &nbsp;•&nbsp; {project.Client_Reference?.Company_Name || project.Lead_Reference?.Client_Reference?.Company_Name || 'Standalone Project'} &nbsp;•&nbsp; {project.Project_Type?.Type_Name || project.Project_Type || 'Type Not Configured'} &nbsp;•&nbsp; {[project.Product_Reference?.Type, project.Product_Reference?.SubType, project.Product_Reference?.SubSubType].filter(Boolean).join(' > ') || project.Quotation_Reference?.Product_Name_Service || [project.Quotation_Reference?.Product_Reference?.Type, project.Quotation_Reference?.Product_Reference?.SubType, project.Quotation_Reference?.Product_Reference?.SubSubType].filter(Boolean).join(' > ') || 'Service'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Current Phase</div>
            <span className={`badge ${detailBadge}`} style={{ fontSize: '1rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontWeight: 700 }}>{currentPhase}</span>
          </div>
        </div>
        {/* Displaying predefine line to say the project is on hold */}
        {/*{project.Pipeline_Status === 'On Hold' && (
          <div style={{ background: 'white', padding: '1rem', borderRadius: '0.75rem', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.03)', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
              <h3 style={{ color: 'var(--warning-color)', textAlign: 'center' }}>Project is On Hold...</h3>
            </div>
          </div>
        )}*/}
        {/* Visual Phase Tracker */}
        {project.Pipeline_Status !== 'Closed' && (
          <div style={{ background: 'white', padding: '1rem', borderRadius: '0.75rem', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
              {/* Background Line */}
              <div style={{ position: 'absolute', top: '0.75rem', left: '10%', right: '10%', height: '2px', backgroundColor: 'rgba(0,0,0,0.05)', zIndex: 1 }}></div>
              {/* Active Line Progress */}
              <div style={{
                position: 'absolute', top: '0.75rem', left: '10%', height: '2px', backgroundColor: '#10b981', zIndex: 1, transition: 'width 0.5s ease',
                width: currentPhase === 'UAT Phase' ? '0%' : currentPhase === 'Deployment Phase' ? '33%' : currentPhase === 'Delivery Phase' ? '66%' : '80%'
              }}></div>

              {renderPhaseStep('UAT Phase', currentPhase === 'UAT Phase', ['Deployment Phase', 'Delivery Phase', 'Go-Live Config'].includes(currentPhase), formatDateDDMMYYYY(project.UAT?.UAT_Date))}
              {renderPhaseStep('Deployment', currentPhase === 'Deployment Phase', ['Delivery Phase', 'Go-Live Config'].includes(currentPhase), formatDateDDMMYYYY(project.Deployment?.Deployment_Date))}
              {renderPhaseStep('Delivery', currentPhase === 'Delivery Phase', currentPhase === 'Go-Live Config', formatDateDDMMYYYY(project.Delivery?.Delivery_Date))}
              {renderPhaseStep('Go-Live', currentPhase === 'Go-Live Config', false, formatDateDDMMYYYY(project.Go_Live?.GoLive_Date))}
            </div>
          </div>
        )}

        {/* Displaying predefine line to say the project is closed */}
        {project.Pipeline_Status === 'Closed' && (
          <div style={{ background: 'white', padding: '1rem', borderRadius: '0.75rem', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
              <h3 style={{ color: 'var(--danger-color)', textAlign: 'center' }}>Project is Closed...</h3>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      {(project.Hold_History?.length > 0 || (project.Pipeline_Status === 'Closed' && project.Termination?.Reason)) && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              background: activeTab === 'details' ? 'rgba(99,102,241,0.1)' : 'transparent',
              color: activeTab === 'details' ? 'var(--primary-color)' : 'var(--text-secondary)',
              border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.9rem',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            Project Details
          </button>

          {project.Hold_History?.length > 0 && (
            <button
              onClick={() => setActiveTab('hold')}
              style={{
                background: activeTab === 'hold' ? 'rgba(245,158,11,0.1)' : 'transparent',
                color: activeTab === 'hold' ? '#d97706' : 'var(--text-secondary)',
                border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.9rem',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Hold History
            </button>
          )}

          {project.Pipeline_Status === 'Closed' && project.Termination?.Reason && (
            <button
              onClick={() => setActiveTab('termination')}
              style={{
                background: activeTab === 'termination' ? 'rgba(239,68,68,0.1)' : 'transparent',
                color: activeTab === 'termination' ? '#dc2626' : 'var(--text-secondary)',
                border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.9rem',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Project Termination
            </button>
          )}
        </div>
      )}

      {/* Content Rendering based on Active Tab */}
      {activeTab === 'details' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>

          {/* Left Column (Main Content) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ background: 'white', borderRadius: '1rem', padding: '1.75rem', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '4px', height: '16px', backgroundColor: 'var(--primary-color)', borderRadius: '2px' }}></div> Core Requirement
                </h3>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {project.Quotation_Reference?.Requirement || project.Start_Details?.Requirement || <span className="italic opacity-50">No core requirement documented.</span>}
                </div>
              </div>
              <div style={{ background: 'white', borderRadius: '1rem', padding: '1.75rem', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '4px', height: '16px', backgroundColor: '#3b82f6', borderRadius: '2px' }}></div> Project Scope
                </h3>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {project.Quotation_Reference?.Project_Scope_Description || project.Start_Details?.Project_Scope_Description || <span className="italic opacity-50">No detailed scope attached.</span>}
                </div>
              </div>
            </div>

            {/* Phase Detailed Logs */}
            <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>Detailed Phase Logs</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '1.5rem', borderRight: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>UAT PHASE</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Status: <span className={uatStatusDisplay === 'Approved' ? 'text-green-600' : uatStatusDisplay === 'Rejected' ? 'text-red-500' : ''}>{uatStatusDisplay}</span></div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Log Date: {formatDateDDMMYYYY(project.UAT?.UAT_Date)}</div>
                  {project.UAT?.Feedback && <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'rgba(245,158,11,0.05)', borderRadius: '0.5rem', fontSize: '0.85rem', color: '#b45309', borderLeft: '3px solid #f59e0b' }}>"{project.UAT.Feedback}"</div>}
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>DEPLOYMENT</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Status: <span className={deploymentStatusDisplay === 'Success' ? 'text-green-600' : deploymentStatusDisplay === 'Failed' ? 'text-red-500' : ''}>{deploymentStatusDisplay}</span></div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Log Date: {formatDateDDMMYYYY(project.Deployment?.Deployment_Date)}</div>
                  {project.Deployment?.Remarks && <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'rgba(59,130,246,0.05)', borderRadius: '0.5rem', fontSize: '0.85rem', color: '#1d4ed8', borderLeft: '3px solid #3b82f6' }}>"{project.Deployment.Remarks}"</div>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ padding: '1.5rem', borderRight: '1px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>DELIVERY</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Status: <span className={deliveryStatusDisplay === 'Delivered' ? 'text-green-600' : ''}>{deliveryStatusDisplay}</span></div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Log Date: {formatDateDDMMYYYY(project.Delivery?.Delivery_Date)}</div>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>GO-LIVE & SUBSCRIPTION</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Payment: {project.Go_Live?.Payment_Schedule || '-'}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Renewal: <span className="font-semibold">₹{project.Go_Live?.Renewal_Rate || 0}</span></div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Live Date: {formatDateDDMMYYYY(project.Go_Live?.GoLive_Date)}</div>
                </div>
              </div>
            </div>

            {/* External Services Section */}
            <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
              <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>External Services</h3>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)',
                    backgroundColor: 'rgba(0,0,0,0.04)', padding: '0.2rem 0.6rem', borderRadius: '1rem'
                  }}>
                    {project.External_Services?.length || 0} ITEMS
                  </span>
                </div>
                {hasPermission(PERMISSIONS.PROJECTS_EDIT) && (
                  <button
                    onClick={handleOpenAddService}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      background: 'var(--primary-color)', color: 'white', border: 'none',
                      padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.8rem',
                      fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                      boxShadow: '0 2px 6px rgba(99,102,241,0.3)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(99,102,241,0.4)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(99,102,241,0.3)'; }}
                  >
                    <Plus size={14} /> Add Service
                  </button>
                )}
              </div>

              {(!project.External_Services || project.External_Services.length === 0) ? (
                <div style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.01)', borderRadius: '1rem', border: '1px dashed rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.2 }}>📦</div>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontWeight: 600 }}>No external services listed</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', maxWidth: '280px', marginInline: 'auto' }}>Add your first service to begin tracking inquiry dates and billing status.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                  {project.External_Services.map((svc: any, idx: number) => {
                    const statusColor = getBillingStatusColor(svc.Billing_Status);
                    return (
                      <div key={svc._id || idx} style={{
                        background: 'white',
                        padding: '0.85rem 1.15rem',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 1px 0px rgba(0,0,0,0.1)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      >
                        {/* Service Top Row: Header and Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                              <div style={{
                                width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(99,102,241,0.08)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1'
                              }}>
                                <TrendingUp size={14} />
                              </div>
                              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                {svc.Service_Name}
                              </h4>
                            </div>
                            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.03)', padding: '0.15rem 0.5rem', borderRadius: '2rem' }}>
                                <Calendar size={11} /> Inquiry: <strong style={{ color: 'var(--text-primary)' }}>{formatDateDDMMYYYY(svc.Inquiry_Date)}</strong>
                              </div>
                              {svc.Delivery_Date && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.03)', padding: '0.15rem 0.5rem', borderRadius: '2rem' }}>
                                  <Clock size={11} /> Delivery: <strong style={{ color: 'var(--text-primary)' }}>{formatDateDDMMYYYY(svc.Delivery_Date)}</strong>
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {svc.Reminder?.Enabled && (
                                  <div style={{
                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#b45309', backgroundColor: '#fef3cc',
                                    padding: '0.25rem', borderRadius: '50%',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    animation: 'pulse 2s infinite ease-in-out'
                                  }} title="Active Billing Reminder">
                                    <Bell size={11} fill="#b45309" />
                                  </div>
                                )}
                                <div style={{ fontSize: '1.2rem', fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>₹</span>
                                  {(svc.Amount || 0).toLocaleString()}
                                </div>
                              </div>

                              {hasPermission(PERMISSIONS.PROJECTS_EDIT) && (
                                <div style={{ display: 'flex', gap: '0.3rem', padding: '0.15rem', background: 'rgba(0,0,0,0.02)', borderRadius: '0.65rem' }}>
                                  <button
                                    onClick={() => handleOpenEditService(idx)}
                                    title="Edit Service"
                                    style={{
                                      background: 'white', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '0.4rem',
                                      padding: '0.35rem', cursor: 'pointer', color: 'var(--text-secondary)',
                                      display: 'flex', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                    }}
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteService(idx)}
                                    title="Delete Service"
                                    style={{
                                      background: 'white', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '0.4rem',
                                      padding: '0.35rem', cursor: 'pointer', color: 'var(--text-secondary)',
                                      display: 'flex', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>

                            <span style={{
                              fontSize: '0.65rem', fontWeight: 800, padding: '0.25rem 0.65rem',
                              borderRadius: '2rem', border: `1px solid ${statusColor.border}`,
                              backgroundColor: statusColor.bg, color: statusColor.text, textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}>
                              {svc.Billing_Status}
                            </span>
                          </div>
                        </div>

                        {/* Service Bottom Row: Detailed Context Pills (Condensed) */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.65rem' }}>
                          <div style={{
                            background: 'rgba(0,0,0,0.02)', padding: '0.6rem 0.85rem', borderRadius: '0.65rem',
                            border: '1px solid rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '0.65rem'
                          }}>
                            <div style={{ color: 'var(--text-secondary)', display: 'flex' }}><Calendar size={15} strokeWidth={2.5} /></div>
                            <div>
                              <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Update</div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-primary)' }}>{formatDateDDMMYYYY(svc.Status_Date)}</div>
                            </div>
                          </div>
                          <div style={{
                            background: 'rgba(0,0,0,0.02)', padding: '0.6rem 0.85rem', borderRadius: '0.65rem',
                            border: '1px solid rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '0.65rem'
                          }}>
                            <div style={{ color: 'var(--text-secondary)', display: 'flex' }}><FileText size={15} strokeWidth={2.5} /></div>
                            <div>
                              <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeline</div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-primary)' }}>{svc.Payment_Timeline || '-'}</div>
                            </div>
                          </div>
                          <div style={{
                            background: 'rgba(0,0,0,0.02)', padding: '0.6rem 0.85rem', borderRadius: '0.65rem',
                            border: '1px solid rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '0.65rem'
                          }}>
                            <div style={{ color: 'var(--text-secondary)', display: 'flex' }}><CreditCard size={15} strokeWidth={2.5} /></div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Terms</div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{svc.Payment_Terms}</span>
                                {svc.Cycle_Anchor_Date && (
                                  <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: 700, marginLeft: '0.4rem' }}>
                                    (Next: {formatDateDDMMYYYY(getNextBilling(svc))})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Sidebar Information) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Key Information Card */}
            <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.02)', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>Key Information</h3>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 500 }}>Company Name</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{project.Client_Reference?.Company_Name || project.Lead_Reference?.Client_Reference?.Company_Name || project.Start_Details?.Company_Name || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 500 }}>Client Name</div>
                    <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>{project.Client_Reference?.Client_Name || project.Lead_Reference?.Client_Reference?.Client_Name || project.Start_Details?.Client_Name || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 500 }}>Contact Number</div>
                    <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>{project.Client_Reference?.Contact_Number || project.Lead_Reference?.Client_Reference?.Contact_Number || project.Start_Details?.Contact_Number || 'N/A'}</div>
                  </div>
                  {/* Quotation Reference or Lead Reference */}
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 500 }}>{project.Quotation_Reference ? 'Quotation Reference' : 'Lead Reference'}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--primary-color)' }}>{project.Quotation_Reference?.Quotation_ID || project.Lead_Reference?.Lead_ID || 'N/A'}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 500 }}>Commercial Value</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{project.Start_Details?.Costing?.toLocaleString() || '-'}</div>
                    </div>
                    <span className={`badge ${project.Priority === 'High' ? 'badge-yellow' : 'badge-gray'}`} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>{project.Priority} Priority</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Logistics Card */}
            <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
              <div style={{ backgroundColor: 'rgba(0,0,0,0.02)', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>Assignment & Timeline</h3>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {project.Start_Details?.Assigned_Person ? project.Start_Details.Assigned_Person.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.1rem', fontWeight: 500 }}>Assigned Person</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{project.Start_Details?.Assigned_Person || 'Unassigned'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 500 }}>Start Date</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{formatDateDDMMYYYY(project.Start_Details?.Start_Date)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', fontWeight: 500 }}>Est. End Date</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{formatDateDDMMYYYY(project.Start_Details?.End_Date)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Secondary Tab Content */}
      {activeTab === 'hold' && project.Hold_History?.length > 0 && (
        <div style={{ background: 'white', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', padding: '1.75rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
            <Clock size={18} color="#f59e0b" /> Hold History Log
          </h3>
          <div style={{ borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.9rem', width: '100%' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                  <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Reason</th>
                  <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>Start Date</th>
                  <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase' }}>End Date</th>
                </tr>
              </thead>
              <tbody>
                {project.Hold_History.map((hold: any, index: number) => (
                  <tr key={index} style={{ borderBottom: index < project.Hold_History.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>{hold.Hold_Reason}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>{formatDateDDMMYYYY(hold.Hold_Start_Date)}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {hold.Hold_End_Date ? <span style={{ color: 'var(--text-secondary)' }}>{formatDateDDMMYYYY(hold.Hold_End_Date)}</span> : (
                        <span style={{ color: '#d97706', fontWeight: 600, backgroundColor: 'rgba(245,158,11,0.1)', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.8rem' }}>Active Hold</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'termination' && project.Pipeline_Status === 'Closed' && project.Termination?.Reason && (
        <div style={{ background: 'rgba(239,68,68,0.03)', borderRadius: '1rem', border: '1px solid rgba(239,68,68,0.2)', overflow: 'hidden', maxWidth: '600px' }}>
          <div style={{ backgroundColor: 'rgba(239,68,68,0.05)', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700, color: '#dc2626' }}>Project Termination</h3>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(220,38,38,0.8)', marginBottom: '0.25rem', fontWeight: 600 }}>Exit Type</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#991b1b' }}>{project.Termination.Exit_Type}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(220,38,38,0.8)', marginBottom: '0.25rem', fontWeight: 600 }}>Termination Reason</div>
                <div style={{ fontSize: '0.95rem', color: '#7f1d1d', lineHeight: 1.5 }}>"{project.Termination.Reason}"</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(220,38,38,0.8)', fontWeight: 600 }}>Date completed</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#991b1b' }}>{formatDateDDMMYYYY(project.Termination.Date_Time)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Glassmorphism Action Bar */}
      {project.Pipeline_Status !== 'Closed' && (
        <div style={{
          width: '100%',
          marginTop: '2rem',
          padding: '1.25rem 2rem',
          background: 'rgba(255, 255, 255, 0.85)',
          borderRadius: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, border: '1px solid rgba(255,255,255,0.5)'
        }}>
          <div>
            {['Active', 'On Hold'].includes(project.Pipeline_Status) && hasPermission(PERMISSIONS.PROJECTS_DELETE) && (
              <button
                className="btn btn-secondary"
                style={{ padding: '0.75rem 1.5rem', color: '#ef4444', borderColor: 'transparent', backgroundColor: 'rgba(239,68,68,0.05)', fontWeight: 600, borderRadius: '1rem' }}
                onClick={() => {
                  setSelectedTermProject(project);
                  setTerminateData({ Exit_Type: 'Cancelled', Stage: currentPhase, Reason: '' });
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.05)'}
              >
                Terminate Project <Ban size={16} style={{ marginLeft: '0.5rem' }} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {project.Pipeline_Status !== 'Closed' && hasPermission(PERMISSIONS.PROJECTS_EDIT) && (
              <button type="button" className="btn btn-secondary" style={{ padding: '0.75rem 1.75rem', fontWeight: 600, borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.1)' }} onClick={() => {
                setSelectedEditProject(project);
                setEditData({
                  Project_Name: project.Project_Name || '',
                  Project_Type: project.Project_Type?._id || project.Project_Type || '',
                  Priority: project.Priority || 'Normal',
                  Pipeline_Status: project.Pipeline_Status || 'Active',
                  Assigned_Person: project.Start_Details?.Assigned_Person || '',
                  Report_Type: project.Start_Details?.Report_Type || 'Overview',
                  Costing: project.Start_Details?.Costing || 0,
                  Start_Date: project.Start_Details?.Start_Date ? new Date(project.Start_Details.Start_Date).toISOString().split('T')[0] : '',
                  End_Date: project.Start_Details?.End_Date ? new Date(project.Start_Details.End_Date).toISOString().split('T')[0] : ''
                });
              }}>
                Edit Details
              </button>
            )}

            {project.Pipeline_Status === 'Active' && hasPermission(PERMISSIONS.PROJECTS_EDIT) && (
              <>
                {currentPhase === 'UAT Phase' && (
                  <button
                    className="btn btn-success"
                    style={{ padding: '0.75rem 2rem', fontWeight: 600, borderRadius: '1rem', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}
                    onClick={() => {
                      setShowPhaseUpgradeModal(true);
                      setUpdateData((prev: any) => ({ ...prev, phase: 'UAT', uatStatus: 'Pending', uatDate: new Date().toISOString().split('T')[0] }));
                    }}
                    disabled={updating}
                  >
                    Update UAT Phase <ArrowRightCircle size={18} style={{ marginLeft: '0.5rem' }} />
                  </button>
                )}
                {currentPhase === 'Deployment Phase' && (
                  <button
                    className="btn btn-primary"
                    style={{ padding: '0.75rem 2rem', fontWeight: 600, borderRadius: '1rem', boxShadow: '0 4px 10px rgba(59,130,246,0.3)' }}
                    onClick={() => {
                      setShowPhaseUpgradeModal(true);
                      setUpdateData((prev: any) => ({ ...prev, phase: 'Deployment', deploymentStatus: 'Pending', deploymentDate: new Date().toISOString().split('T')[0] }));
                    }}
                    disabled={updating}
                  >
                    Update Deployment <ArrowRightCircle size={18} style={{ marginLeft: '0.5rem' }} />
                  </button>
                )}
                {currentPhase === 'Delivery Phase' && (
                  <button
                    className="btn btn-success"
                    style={{ padding: '0.75rem 2rem', fontWeight: 600, borderRadius: '1rem', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' }}
                    onClick={() => handlePhaseAdvance(project, 'Delivery')}
                    disabled={updating}
                  >
                    Deliver & Move to Go-Live <ArrowRightCircle size={18} style={{ marginLeft: '0.5rem' }} />
                  </button>
                )}
                {currentPhase === 'Go-Live Config' && project.Go_Live?.GoLive_Date === undefined && (
                  <button
                    className="btn btn-primary"
                    style={{ padding: '0.75rem 2rem', backgroundColor: '#6366f1', borderColor: '#6366f1', fontWeight: 600, borderRadius: '1rem', boxShadow: '0 4px 10px rgba(99,102,241,0.3)' }}
                    onClick={() => {
                      setShowPhaseUpgradeModal(true);
                      setUpdateData({
                        phase: 'Go_Live', uatStatus: 'Pending', feedback: '', uatDate: new Date().toISOString().split('T')[0],
                        deploymentStatus: 'Pending', remarks: '', deploymentDate: new Date().toISOString().split('T')[0],
                        deliveryStatus: 'Pending', deliveryDate: new Date().toISOString().split('T')[0],
                        paymentSchedule: 'Monthly', renewalRate: 0, userWiseRate: 0, goLiveDate: new Date().toISOString().split('T')[0]
                      });
                    }}
                  >
                    Configure Go-Live <ArrowRightCircle size={18} style={{ marginLeft: '0.5rem' }} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* --- MODALS (Copied from Projects.tsx) --- */}
      {/* 1. Go-Live Configuration Modal (Using existing phase update structure but focused) */}
      {showPhaseUpgradeModal && (
        <div className="modal-overlay" onClick={() => setShowPhaseUpgradeModal(false)}>
          <div className="modal-content" style={{ maxWidth: '800px', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                  {updateData.phase === 'UAT' ? 'Update UAT Phase' :
                    updateData.phase === 'Deployment' ? 'Update Deployment' : 'Configure Go-Live Data'}
                </h2>
                <p className="text-secondary" style={{ fontSize: '0.875rem', margin: 0 }}>Project: <strong>{project.Project_ID}</strong></p>
              </div>
              <button className="modal-close" onClick={() => setShowPhaseUpgradeModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="slide-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                {updateData.phase === 'UAT' && (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>UAT Status</label>
                      <select
                        className="form-select"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                        value={updateData.uatStatus}
                        onChange={e => setUpdateData({ ...updateData, uatStatus: e.target.value })}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
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
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>UAT Feedback</label>
                      <textarea
                        className="form-textarea"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                        value={updateData.feedback}
                        onChange={e => setUpdateData({ ...updateData, feedback: e.target.value })}
                        placeholder="Enter feedback notes here..."
                      />
                    </div>
                  </>
                )}

                {updateData.phase === 'Deployment' && (
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Deployment Status</label>
                      <select
                        className="form-select"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                        value={updateData.deploymentStatus}
                        onChange={e => setUpdateData({ ...updateData, deploymentStatus: e.target.value })}
                      >
                        <option value="Success">Success</option>
                        <option value="Failed">Failed</option>
                        <option value="Pending">Pending</option>
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
                      <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Deployment Remarks</label>
                      <textarea
                        className="form-textarea"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                        value={updateData.remarks}
                        onChange={e => setUpdateData({ ...updateData, remarks: e.target.value })}
                        placeholder="Enter deployment remarks here..."
                      />
                    </div>
                  </>
                )}

                {updateData.phase === 'Go_Live' && (
                  <>
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
                  </>
                )}
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPhaseUpgradeModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={updating}>
                  {updating ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit Details Modal */}
      {selectedEditProject && (
        <div className="modal-overlay" onClick={() => setSelectedEditProject(null)}>
          <div className="modal-content" style={{ maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
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
                    required
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={editData.Project_Type}
                    onChange={e => setEditData({ ...editData, Project_Type: e.target.value })}
                  >
                    <option value="">Select Type</option>
                    {projectTypes.map(type => (
                      <option key={type._id} value={type._id}>{type.Type_Name}</option>
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
                        setSelectedHoldProject(project);
                        setEditData({ ...editData, Pipeline_Status: 'Active' });
                        setSelectedEditProject(null);
                      } else if (newStatus === 'Closed') {
                        setSelectedTermProject(project);
                        setTerminateData({ Exit_Type: 'Cancelled', Stage: currentPhase, Reason: '' });
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

      {/* 3. Terminate Modal */}
      {selectedTermProject && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2 className="text-red-500 flex items-center gap-2" style={{ fontSize: '1.2rem' }}>Terminate Project</h2>
              <button className="modal-close" onClick={() => setSelectedTermProject(null)}><X size={20} /></button>
            </div>

            <form onSubmit={handleTerminate}>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <p style={{ fontSize: '0.85rem', color: '#ef4444', marginBottom: '0.25rem' }}>Terminating Project: <strong>{project.Project_ID}</strong></p>
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
                  {currentPhase === 'Go-Live Config' && <option value="Discontinue">Discontinue</option>}
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

      {/* 4. Hold Modal */}
      {selectedHoldProject && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2 className="text-yellow-500 flex items-center gap-2" style={{ fontSize: '1.2rem' }}>Put Project On Hold</h2>
              <button className="modal-close" onClick={() => setSelectedHoldProject(null)}><X size={20} /></button>
            </div>

            <form onSubmit={handleHold}>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: '0.5rem', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                <p style={{ fontSize: '0.85rem', color: '#eab308', marginBottom: '0.25rem' }}>Holding Project: <strong>{project.Project_ID}</strong></p>
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

      {/* 5. Add / Edit External Service Modal */}
      {showServiceModal && (
        <div className="modal-overlay" onClick={() => { setShowServiceModal(false); resetServiceForm(); }}>
          <div className="modal-content" style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', marginBottom: '0.15rem' }}>
                  {editingServiceIndex !== null ? 'Edit External Service' : 'Add External Service'}
                </h2>
                <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>Project: <strong>{project.Project_ID}</strong></p>
              </div>
              <button className="modal-close" onClick={() => { setShowServiceModal(false); resetServiceForm(); }}><X size={24} /></button>
            </div>

            <form onSubmit={handleSaveService}>
              {/* Service Name */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>PRODUCT / SERVICE *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    className="form-input"
                    style={{ padding: '0.55rem 0.75rem 0.55rem 2.25rem', fontSize: '0.85rem' }}
                    value={serviceFormData.Service_Name}
                    onChange={e => setServiceFormData({ ...serviceFormData, Service_Name: e.target.value })}
                    placeholder="Search or enter service name..."
                  />
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', opacity: 0.5 }} />
                </div>
              </div>

              {/* Date Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>INQUIRY DATE *</label>
                  <DateInput
                    required
                    className="form-input"
                    style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                    value={serviceFormData.Inquiry_Date}
                    onChange={val => setServiceFormData({ ...serviceFormData, Inquiry_Date: val })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>DELIVERY DATE</label>
                  <DateInput
                    className="form-input"
                    style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                    value={serviceFormData.Delivery_Date}
                    onChange={val => setServiceFormData({ ...serviceFormData, Delivery_Date: val })}
                  />
                </div>
              </div>

              {/* Amount + Status Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>AMOUNT (₹) *</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                    value={serviceFormData.Amount}
                    onChange={e => setServiceFormData({ ...serviceFormData, Amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    onWheel={e => e.currentTarget.blur()}
                    min="0"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>STATUS</label>
                  <select
                    className="form-select"
                    style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                    value={serviceFormData.Billing_Status}
                    onChange={e => {
                      const newStatus = e.target.value;
                      const today = new Date().toISOString().split('T')[0];
                      const updates: any = { Billing_Status: newStatus };

                      // Track the last update date specifically for UI and auditing
                      if (newStatus !== serviceFormData.Billing_Status) {
                        updates.Status_Date = today;
                      }

                      // Start or reset the payment cycle ONLY when set to 'Generated'
                      if (newStatus === 'Generated' && newStatus !== serviceFormData.Billing_Status) {
                        updates.Cycle_Anchor_Date = today;
                      }

                      setServiceFormData({ ...serviceFormData, ...updates });
                    }}
                  >
                    <option value="Working">Working</option>
                    <option value="Generated">Generated</option>
                    <option value="Given to Client">Given To Client</option>
                    <option value="Receiving">Receiving</option>
                    <option value="Under Process">Under Process</option>
                    <option value="Received">Received</option>
                  </select>
                </div>
              </div>

              {/* Status Date + Payment Terms */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>LAST UPDATED DATE</label>
                  <DateInput
                    className="form-input"
                    style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                    value={serviceFormData.Status_Date}
                    onChange={val => setServiceFormData({ ...serviceFormData, Status_Date: val })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>PAYMENT TERMS</label>
                  <select
                    className="form-select"
                    style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem' }}
                    value={serviceFormData.Payment_Terms}
                    onChange={e => setServiceFormData({ ...serviceFormData, Payment_Terms: e.target.value })}
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annually">Annually</option>
                  </select>
                </div>
              </div>

              {/* Payment Timeline */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--text-secondary)' }}>PAYMENT TIMELINE / NOTES</label>
                <textarea
                  className="form-textarea"
                  style={{ padding: '0.55rem 0.75rem', fontSize: '0.85rem', minHeight: '60px' }}
                  value={serviceFormData.Payment_Timeline}
                  onChange={e => setServiceFormData({ ...serviceFormData, Payment_Timeline: e.target.value })}
                  placeholder="Any initial notes or requirements..."
                />
              </div>

              {/* Reminder Settings */}
              <div style={{
                background: 'rgba(99,102,241,0.03)', borderRadius: '0.75rem', padding: '1rem 1.25rem',
                border: '1px solid rgba(99,102,241,0.08)', marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: serviceFormData.Reminder.Enabled ? '0.75rem' : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      backgroundColor: 'rgba(99,102,241,0.1)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: '#6366f1'
                    }}>
                      <Bell size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Payment Reminder Settings</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Configure notifications relative to the billing cycle.</div>
                    </div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={serviceFormData.Reminder.Enabled}
                      onChange={e => setServiceFormData({
                        ...serviceFormData,
                        Reminder: { ...serviceFormData.Reminder, Enabled: e.target.checked }
                      })}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: serviceFormData.Reminder.Enabled ? '#6366f1' : '#cbd5e1',
                      transition: '0.3s', borderRadius: '24px'
                    }}>
                      <span style={{
                        position: 'absolute', height: '18px', width: '18px', left: serviceFormData.Reminder.Enabled ? '22px' : '3px',
                        bottom: '3px', backgroundColor: 'white', transition: '0.3s', borderRadius: '50%',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                      }}></span>
                    </span>
                  </label>
                </div>

                {serviceFormData.Reminder.Enabled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(99,102,241,0.08)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Notify me:</span>
                    <select
                      className="form-select"
                      style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', width: 'auto', minWidth: '150px' }}
                      value={serviceFormData.Reminder.Notify_Before}
                      onChange={e => setServiceFormData({
                        ...serviceFormData,
                        Reminder: { ...serviceFormData.Reminder, Notify_Before: e.target.value }
                      })}
                    >
                      <option value="24 hours before">24 hours before</option>
                      <option value="3 days before">3 days before</option>
                      <option value="7 days before">7 days before</option>
                    </select>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>* Based on {serviceFormData.Payment_Terms.toLowerCase()} payment cycle</span>
                    {/* Simulation Utility for Testing (Commented out after verification) */}
                    {/* <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dotted rgba(99,102,241,0.2)' }}>
                      <button
                        type="button"
                        onClick={() => {
                          const testDate = new Date();
                          testDate.setDate(testDate.getDate() - 28);
                          // Set both dates to simulate an old "Generated" cycle
                          setServiceFormData({ 
                            ...serviceFormData, 
                            Cycle_Anchor_Date: testDate.toISOString().split('T')[0],
                            Status_Date: testDate.toISOString().split('T')[0] 
                          });
                          toast.success('Simulation: Cycle set to 28 days ago (Billing due in ~2 days)');
                        }}
                        style={{ border: 'none', background: 'none', color: '#6366f1', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', padding: 0, textTransform: 'uppercase' }}
                      >
                        [ Simulation: Set cycle to 28 days ago to test reminder toast ]
                      </button>
                    </div> */}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowServiceModal(false); resetServiceForm(); }}>Cancel</button>
                <button type="submit" className="btn btn-success" style={{ padding: '0.6rem 1.5rem', fontWeight: 600, borderRadius: '0.5rem' }} disabled={savingService}>
                  {savingService ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Delete Service Confirmation Modal */}
      {showDeleteServiceConfirm && serviceToDeleteIndex !== null && (
        <div className="modal-overlay" onClick={() => { setShowDeleteServiceConfirm(false); setServiceToDeleteIndex(null); }}>
          <div className="modal-content" style={{ maxWidth: '450px', padding: '2rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)',
              color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem auto'
            }}>
              <Trash2 size={30} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Remove Service?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '2rem' }}>
              Are you sure you want to remove <strong>{project.External_Services[serviceToDeleteIndex]?.Service_Name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.75rem' }}
                onClick={() => { setShowDeleteServiceConfirm(false); setServiceToDeleteIndex(null); }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600 }}
                onClick={confirmDeleteService}
                disabled={isDeletingService}
              >
                {isDeletingService ? <><Loader2 size={16} className="animate-spin" /> Removing...</> : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProjectDetails;
