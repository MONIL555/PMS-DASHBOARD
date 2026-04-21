'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bell, Search, Plus, Trash2, Save, X,
  Mail, MessageSquare, AlertCircle, Loader2,
  Settings2, Info, Users
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
  Internal_Recipients: { name: string; whatsapp?: string; email?: string }[];
}

const NotificationsMaster = () => {
  const { hasPermission, loading: permsLoading } = usePermissions();
  const [notifications, setNotifications] = useState<NotificationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDeleteConfig, setSelectedDeleteConfig] = useState<NotificationConfig | null>(null);
  const [editingConfig, setEditingConfig] = useState<Partial<NotificationConfig> | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tag input state
  const [waInput, setWaInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?search=${searchTerm}`);
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (hasPermission(PERMISSIONS.NOTIFICATIONS_VIEW)) fetchData();
  }, [fetchData, hasPermission]);

  const openModal = (config?: NotificationConfig) => {
    if (config) {
      setEditingConfig({ ...config });
    } else {
      setEditingConfig({ Event_Name: '', IsEnabled: true, Channels: ['Email'], Internal_Recipients: [] });
    }
    setWaInput('');
    setEmailInput('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (config: NotificationConfig, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleAddRecipientRow = () => {
    const existing = editingConfig?.Internal_Recipients || [];
    setEditingConfig(prev => ({ ...prev!, Internal_Recipients: [...existing, { name: '', whatsapp: '', email: '' }] }));
  };

  const handleUpdateRecipientRow = (index: number, field: 'name' | 'whatsapp' | 'email', val: string) => {
    const list = [...(editingConfig?.Internal_Recipients || [])];
    list[index][field] = val;
    setEditingConfig(prev => ({ ...prev!, Internal_Recipients: list }));
  };

  const handleRemoveRecipientRow = (index: number) => {
    const list = (editingConfig?.Internal_Recipients || []).filter((_, i) => i !== index);
    setEditingConfig(prev => ({ ...prev!, Internal_Recipients: list }));
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
      toast.error('Failed to delete trigger');
    } finally {
      setIsDeleting(false);
    }
  };

  if (permsLoading) return null;

  const tagStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem',
    fontWeight: 600, cursor: 'default'
  };

  return (
    <div className="page-container">
      {/* Header */}
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
        {/* <div style={{ display: 'flex', gap: '0.75rem' }}>
          {hasPermission(PERMISSIONS.NOTIFICATIONS_CREATE) && (
            <button
              onClick={() => openModal()}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={18} />
              Add Trigger
            </button>
          )}
        </div> */}
      </div>

      {/* Table */}
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
                <th style={{ width: '120px' }}>Trigger ID</th>
                <th>Event Name</th>
                <th style={{ width: '140px' }}>Channels</th>
                <th style={{ width: '180px' }}>Recipients</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((config) => (
                <tr
                  key={config._id}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => openModal(config)}
                >
                  <td><span className="font-semibold text-primary">{config.Trigger_ID}</span></td>
                  <td><div className="font-medium text-primary">{config.Event_Name}</div></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <div title="Email" style={{ padding: '0.4rem', borderRadius: '8px', backgroundColor: config.Channels.includes('Email') ? 'rgba(59,130,246,0.1)' : '#f1f5f9', color: config.Channels.includes('Email') ? '#3b82f6' : '#94a3b8' }}>
                        <Mail size={16} />
                      </div>
                      <div title="WhatsApp" style={{ padding: '0.4rem', borderRadius: '8px', backgroundColor: config.Channels.includes('WhatsApp') ? 'rgba(16,185,129,0.1)' : '#f1f5f9', color: config.Channels.includes('WhatsApp') ? '#10b981' : '#94a3b8' }}>
                        <MessageSquare size={16} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                      {(config.Internal_Recipients || []).length > 0
                        ? `${config.Internal_Recipients.length} recipient${config.Internal_Recipients.length > 1 ? 's' : ''}`
                        : <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>None set</span>}
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => handleToggleStatus(config, e)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                      <span className={`badge ${config.IsEnabled ? 'badge-green' : 'badge-red'}`}>
                        {config.IsEnabled ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedDeleteConfig(config); }}
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
                  <td colSpan={7} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    No notification triggers found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Configuration Modal ── */}
      {isModalOpen && editingConfig && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '760px', width: '95%', padding: 0, borderRadius: '20px', overflow: 'hidden' }}>

            {/* Modal Header */}
            <div className="modal-header" style={{ marginBottom: 0, paddingBottom: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '1rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Settings2 size={20} className="text-blue-500" />
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {editingConfig._id ? 'Edit Notification Trigger' : 'Create New Trigger'}
                </h2>
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveConfig} style={{ padding: '1.25rem 1.5rem' }}>
              {error && (
                <div style={{ padding: '0.75rem', backgroundColor: '#fff1f2', borderRadius: '10px', color: '#ef4444', marginBottom: '1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={18} />{error}
                </div>
              )}

              {/* Row 1: Name + Channels */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.4rem', color: '#64748b' }}>EVENT TRIGGER NAME *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    readOnly={!!editingConfig._id}
                    value={editingConfig.Event_Name}
                    onChange={(e) => setEditingConfig({ ...editingConfig, Event_Name: e.target.value })}
                    style={{
                      padding: '0.6rem 0.8rem', fontSize: '0.9rem',
                      backgroundColor: editingConfig._id ? '#f8fafc' : 'white',
                      cursor: editingConfig._id ? 'not-allowed' : 'text',
                      color: editingConfig._id ? '#64748b' : 'inherit',
                      border: editingConfig._id ? '1px solid #e2e8f0' : '1px solid var(--border-primary)'
                    }}
                  />
                  {editingConfig._id && (
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.4rem', fontWeight: 500 }}>
                      <AlertCircle size={10} style={{ display: 'inline', marginRight: '2px' }} />
                      System names are locked to maintain backend linkage.
                    </p>
                  )}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.75rem', color: '#64748b' }}>ENABLED CHANNELS</label>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {(['Email', 'WhatsApp'] as const).map(ch => (
                      <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                        <input
                          type="checkbox"
                          checked={editingConfig.Channels?.includes(ch)}
                          onChange={(e) => {
                            const channels = editingConfig.Channels || [];
                            setEditingConfig({ ...editingConfig, Channels: e.target.checked ? [...channels, ch] : channels.filter(c => c !== ch) });
                          }}
                          className="w-4 h-4"
                        />
                        {ch}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Internal Recipients */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

                {/* Consolidated Recipients */}
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.85rem', color: '#1e293b', margin: 0 }}>
                      <Users size={16} className="text-blue-500" />
                      INTERNAL RECIPIENTS LIST
                    </label>
                    <button type="button" onClick={handleAddRecipientRow} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Plus size={14} /> Add Recipient
                    </button>
                  </div>
                  <div style={{ border: '1px solid var(--border-primary)', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead style={{ backgroundColor: '#f8fafc' }}>
                        <tr>
                          <th style={{ width: '50px', padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid var(--border-primary)', color: '#64748b', fontWeight: 700 }}>#</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-primary)', color: '#64748b', fontWeight: 700 }}>Identify Name (Person)</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-primary)', color: '#64748b', fontWeight: 700 }}>WhatsApp Number</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border-primary)', color: '#64748b', fontWeight: 700 }}>Email Address</th>
                          <th style={{ width: '60px', padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid var(--border-primary)', color: '#64748b', fontWeight: 700 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(editingConfig.Internal_Recipients || []).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 600, color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>{idx + 1}</td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                              <input
                                type="text"
                                value={row.name}
                                onChange={e => handleUpdateRecipientRow(idx, 'name', e.target.value)}
                                placeholder="Name..."
                                style={{ width: '100%', border: '1px solid transparent', padding: '0.5rem', borderRadius: '6px', outline: 'none', backgroundColor: 'transparent' }}
                                onFocus={e => (e.target.style.backgroundColor = '#fff')}
                                onBlur={e => (e.target.style.backgroundColor = 'transparent')}
                              />
                            </td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                              <input
                                type="text"
                                value={row.whatsapp || ''}
                                onChange={e => handleUpdateRecipientRow(idx, 'whatsapp', e.target.value)}
                                placeholder="+91..."
                                style={{ width: '100%', border: '1px solid transparent', padding: '0.5rem', borderRadius: '6px', outline: 'none', backgroundColor: 'transparent' }}
                                onFocus={e => (e.target.style.backgroundColor = '#fff')}
                                onBlur={e => (e.target.style.backgroundColor = 'transparent')}
                              />
                            </td>
                            <td style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                              <input
                                type="text"
                                value={row.email || ''}
                                onChange={e => handleUpdateRecipientRow(idx, 'email', e.target.value)}
                                placeholder="email@..."
                                style={{ width: '100%', border: '1px solid transparent', padding: '0.5rem', borderRadius: '6px', outline: 'none', backgroundColor: 'transparent' }}
                                onFocus={e => (e.target.style.backgroundColor = '#fff')}
                                onBlur={e => (e.target.style.backgroundColor = 'transparent')}
                              />
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                              <button type="button" onClick={() => handleRemoveRecipientRow(idx)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px' }} className="hover:bg-red-50">
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(editingConfig.Internal_Recipients || []).length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              <Users size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                              No recipients added. Click "Add Recipient" to start.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Info note */}
              <div style={{ padding: '0.65rem 1rem', backgroundColor: 'rgba(59,130,246,0.05)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.1)', marginBottom: '1.25rem', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <Info size={16} className="text-blue-500" />
                <p style={{ fontSize: '0.82rem', color: '#1e40af', margin: 0 }}>
                  These internal recipients receive notifications whenever this trigger fires. Client-side notifications are managed separately.
                </p>
              </div>

              {/* Footer */}
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
            <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(239,68,68,0.05)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.1)' }}>
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
