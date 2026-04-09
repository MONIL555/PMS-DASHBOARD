'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell, Search, Plus, Edit2, Trash2, Save, X,
  Mail, MessageSquare, Check, AlertCircle, Loader2,
  Settings2, ToggleLeft, ToggleRight, Info,
  Globe, UserCog, CheckCircle2, XCircle
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import toast from 'react-hot-toast';

interface NotificationConfig {
  _id: string;
  Trigger_ID: string;
  Event_Name: string;
  IsEnabled: boolean;
  Channels: ('Email' | 'WhatsApp')[];
}

interface SystemSettings {
  Admin_Email: string;
  Admin_WhatsApp: string;
}

const NotificationsMaster = () => {
  const { hasPermission, loading: permsLoading } = usePermissions();
  const [notifications, setNotifications] = useState<NotificationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDeleteConfig, setSelectedDeleteConfig] = useState<NotificationConfig | null>(null);
  const [editingConfig, setEditingConfig] = useState<Partial<NotificationConfig> | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({ Admin_Email: '', Admin_WhatsApp: '' });
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [notifsRes, settingsRes] = await Promise.all([
        fetch(`/api/notifications?search=${searchTerm}`),
        fetch('/api/notifications/settings')
      ]);
      const notifsData = await notifsRes.json();
      const settingsData = await settingsRes.json();

      if (notifsData.notifications) setNotifications(notifsData.notifications);
      if (settingsData) setSystemSettings(settingsData);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (hasPermission(PERMISSIONS.NOTIFICATIONS_VIEW)) {
      fetchData();
    }
  }, [fetchData, hasPermission]);

  const handleToggleStatus = async (config: NotificationConfig) => {
    if (!hasPermission(PERMISSIONS.NOTIFICATIONS_EDIT)) return;
    try {
      const res = await fetch(`/api/notifications/${config._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ IsEnabled: !config.IsEnabled })
      });
      if (res.ok) {
        toast.success(`Trigger ${config.IsEnabled ? 'deactivated' : 'activated'}`);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig || !editingConfig.Event_Name) return;
    setSaving(true);
    setError(null);
    try {
      const url = editingConfig._id ? `/api/notifications/${editingConfig._id}` : '/api/notifications';
      const method = editingConfig._id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingConfig)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      toast.success('Configuration saved successfully');
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/notifications/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemSettings)
      });
      if (res.ok) {
        toast.success('Global settings updated');
        setIsSettingsOpen(false);
      }
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedDeleteConfig) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/notifications/${selectedDeleteConfig._id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Trigger deleted');
        setSelectedDeleteConfig(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to delete', err);
      toast.error('Failed to delete trigger');
    } finally {
      setIsDeleting(false);
    }
  };

  if (permsLoading) return null;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bell className="text-blue-500" />
            Notifications Master
          </h1>
          <div className="search-wrapper" style={{ minWidth: '400px', marginBottom: 0 }}>
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by Trigger ID or Event Name..."
              className="premium-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.6rem 1rem 0.6rem 2.8rem', borderRadius: '10px', fontSize: '0.95rem' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Globe size={18} />
            Global Setup
          </button>
          {hasPermission(PERMISSIONS.NOTIFICATIONS_CREATE) && (
            <button
              onClick={() => {
                setEditingConfig({ Event_Name: '', IsEnabled: true, Channels: ['Email'] });
                setIsModalOpen(true);
              }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={18} />
              Add Trigger
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
          <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading triggers...</p>
        </div>
      ) : (
        <div className="table-container" style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
          <table className="w-full">
            <thead>
              <tr>
                <th style={{ width: '140px' }}>Trigger ID</th>
                <th>Event Trigger Name</th>
                <th style={{ width: '160px' }}>Channels</th>
                <th style={{ width: '140px' }}>Status</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((config) => (
                <tr key={config._id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => { setEditingConfig(config); setIsModalOpen(true); }}>
                  <td><span className="font-semibold text-primary">{config.Trigger_ID}</span></td>
                  <td>
                    <div className="font-medium text-primary">{config.Event_Name}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <div title="Email" style={{ padding: '0.4rem', borderRadius: '8px', backgroundColor: config.Channels.includes('Email') ? 'rgba(59, 130, 246, 0.1)' : '#f1f5f9', color: config.Channels.includes('Email') ? '#3b82f6' : '#94a3b8' }}>
                        <Mail size={16} />
                      </div>
                      <div title="WhatsApp" style={{ padding: '0.4rem', borderRadius: '8px', backgroundColor: config.Channels.includes('WhatsApp') ? 'rgba(16, 185, 129, 0.1)' : '#f1f5f9', color: config.Channels.includes('WhatsApp') ? '#10b981' : '#94a3b8' }}>
                        <MessageSquare size={16} />
                      </div>
                    </div>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleToggleStatus(config)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <span className={`badge ${config.IsEnabled ? 'badge-green' : 'badge-red'}`}>
                        {config.IsEnabled ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                      {/*<button onClick={() => { setEditingConfig(config); setIsModalOpen(true); }} className="btn-icon" style={{ backgroundColor: 'var(--bg-secondary)', border: 'none' }}><Edit2 size={14} /></button>*/}
                      <button
                        onClick={() => setSelectedDeleteConfig(config)}
                        className="btn-icon"
                        style={{ backgroundColor: 'rgba(239,68,68,0.05)', color: '#ef4444', border: 'none' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {notifications.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    {loading ? 'Refreshing triggers...' : 'No notification triggers found matching your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Configuration Modal */}
      {isModalOpen && editingConfig && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '700px', width: '95%', padding: 0, borderRadius: '20px', overflow: 'hidden' }}>
            <div className="modal-header" style={{ marginBottom: 0, paddingBottom: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '1rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Settings2 size={20} className="text-blue-500" />
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{editingConfig._id ? 'Edit Configuration' : 'Create New Trigger'}</h2>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveConfig} style={{ padding: '1.25rem 1.5rem' }}>
              {error && (
                <div style={{ padding: '0.75rem', backgroundColor: '#fff1f2', borderRadius: '10px', color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem', color: '#64748b' }}>EVENT TRIGGER NAME *</label>
                  <input type="text" className="form-input" required value={editingConfig.Event_Name} onChange={(e) => setEditingConfig({ ...editingConfig, Event_Name: e.target.value })} style={{ padding: '0.6rem 0.8rem', fontSize: '0.9rem' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.75rem', color: '#64748b' }}>ENABLED CHANNELS</label>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={editingConfig.Channels?.includes('Email')}
                        onChange={(e) => {
                          const channels = editingConfig.Channels || [];
                          setEditingConfig({ ...editingConfig, Channels: e.target.checked ? [...channels, 'Email'] : channels.filter(c => c !== 'Email') });
                        }}
                        className="w-4 h-4"
                      /> Email
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={editingConfig.Channels?.includes('WhatsApp')}
                        onChange={(e) => {
                          const channels = editingConfig.Channels || [];
                          setEditingConfig({ ...editingConfig, Channels: e.target.checked ? [...channels, 'WhatsApp'] : channels.filter(c => c !== 'WhatsApp') });
                        }}
                        className="w-4 h-4"
                      /> WhatsApp
                    </label>
                  </div>
                </div>
              </div>

              {/* Dynamic Targets - Manual input removed as per user request */}
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.1)', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <Info size={18} className="text-blue-500" />
                <p style={{ fontSize: '0.85rem', color: '#1e40af', margin: 0, fontWeight: 500 }}>
                  Recipient targets for this trigger are automatically determined from dynamic client data.
                </p>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary" style={{ padding: '0.5rem 1.25rem' }}>Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {editingConfig._id ? 'Update Trigger' : 'Create Trigger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px', width: '95%', padding: 0, borderRadius: '24px', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 2rem', background: '#3b82f6', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Globe size={24} />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Global System Setup</h2>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
            </div>

            <form onSubmit={handleSaveSettings} style={{ padding: '2rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #dbeafe', marginBottom: '2rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <Info size={20} className="text-blue-500 mt-0.5" />
                <p style={{ fontSize: '0.85rem', color: '#1e40af', lineHeight: 1.5 }}>Define common contact details to be used as fallbacks when individual triggers don't have specific recipients configured.</p>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b' }}>SYSTEM ADMIN EMAIL</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="email" className="form-input" style={{ paddingLeft: '2.8rem', height: '48px' }} value={systemSettings.Admin_Email} onChange={(e) => setSystemSettings({ ...systemSettings, Admin_Email: e.target.value })} placeholder="e.g., admin@company.com" />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b' }}>SYSTEM WHATSAPP NUMBER</label>
                <div style={{ position: 'relative' }}>
                  <MessageSquare size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input type="text" className="form-input" style={{ paddingLeft: '2.8rem', height: '48px' }} value={systemSettings.Admin_WhatsApp} onChange={(e) => setSystemSettings({ ...systemSettings, Admin_WhatsApp: e.target.value })} placeholder="e.g., +968 1234 5678" />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" onClick={() => setIsSettingsOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '0.6rem 2rem' }}>
                  {saving ? <Loader2 size={18} className="animate-spin" /> : 'Update Global Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {selectedDeleteConfig && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '95%', padding: '1.5rem', borderRadius: '20px' }}>
            <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
              <h2 className="text-red-500 flex items-center gap-2" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                <Trash2 size={24} /> Delete Trigger
              </h2>
              <button className="modal-close" onClick={() => setSelectedDeleteConfig(null)}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                Are you sure you want to delete <strong>{selectedDeleteConfig.Event_Name}</strong>?
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                This action is permanent and will stop all notifications associated with this trigger.
              </p>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedDeleteConfig(null)}>Cancel</button>
              <button
                type="button"
                className="btn"
                style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '0.6rem 1.5rem', borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : null}
                Delete Permanent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsMaster;
