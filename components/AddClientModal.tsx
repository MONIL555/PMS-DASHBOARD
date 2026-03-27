'use client';

import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient, updateClient } from '@/utils/api';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (client: any) => void;
  editingClient?: any | null;
  isStacked?: boolean;
}

const AddClientModal: React.FC<AddClientModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingClient = null,
  isStacked = false
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    Company_Name: editingClient?.Company_Name || '',
    Company_No: editingClient?.Company_No || '',
    Client_Name: editingClient?.Client_Name || '',
    Contact_Number: editingClient?.Contact_Number || '',
    Email: editingClient?.Email || '',
    Location: editingClient?.Location || '',
    Description: editingClient?.Description || '',
    IsActive: editingClient?.IsActive !== undefined ? editingClient?.IsActive : true
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.Company_Name.trim().length < 3) {
      return toast.error("Company Name must be at least 3 characters.");
    }

    setIsSubmitting(true);
    try {
      let clientData;
      if (editingClient) {
        clientData = await updateClient(editingClient._id, formData);
        toast.success('Client updated!');
      } else {
        clientData = await createClient(formData);
        toast.success('Client added!');
      }

      onSuccess(clientData);
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay ${isStacked ? 'modal-stacked' : ''}`} style={{ zIndex: isStacked ? 1100 : 50 }}>
      <div className="modal-content" style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
        <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
          <h2>{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Company Name *</label>
              <input type="text" required className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={formData.Company_Name} onChange={(e) => setFormData({ ...formData, Company_Name: e.target.value })} placeholder="e.g. Acme Corp" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Company Tax No. (GST/PAN)</label>
              <input type="text" className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={formData.Company_No} onChange={(e) => setFormData({ ...formData, Company_No: e.target.value })} placeholder="e.g. GSTIN1234..." />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Client / Contact Person Name</label>
              <input type="text" className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={formData.Client_Name} onChange={(e) => setFormData({ ...formData, Client_Name: e.target.value })} placeholder="e.g. Jane Doe" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Contact Number</label>
              <input type="text" className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={formData.Contact_Number} onChange={(e) => setFormData({ ...formData, Contact_Number: e.target.value })} placeholder="e.g. +1 555-0123" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Email Address</label>
              <input type="email" className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={formData.Email} onChange={(e) => setFormData({ ...formData, Email: e.target.value })} placeholder="e.g. contact@acme.com" />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Location / City</label>
              <input type="text" className="form-input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={formData.Location} onChange={(e) => setFormData({ ...formData, Location: e.target.value })} placeholder="e.g. New York, USA" />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', marginBottom: 0, paddingTop: '1.2rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                <input type="checkbox" checked={formData.IsActive} onChange={(e) => setFormData({ ...formData, IsActive: e.target.checked })} style={{ width: '16px', height: '16px', margin: 0 }} />
                Active Status
              </label>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Description / Notes</label>
            <textarea
              className="form-input"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', minHeight: '80px', resize: 'vertical' }}
              value={formData.Description}
              onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
              placeholder="Additional details about the client..."
            />
          </div>

          <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : editingClient ? 'Update Client' : 'Save Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddClientModal;
