'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { createClient, updateClient } from '@/utils/api';
import ClientFields from './ClientFields';

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
    Company_Name: '',
    Company_No: '',
    Client_Name: '',
    Contact_Number: '',
    Email: '',
    Location: '',
    Description: '',
    IsActive: true
  });

  useEffect(() => {
    if (editingClient) {
      setFormData({
        Company_Name: editingClient.Company_Name || '',
        Company_No: editingClient.Company_No || '',
        Client_Name: editingClient.Client_Name || '',
        Contact_Number: editingClient.Contact_Number || '',
        Email: editingClient.Email || '',
        Location: editingClient.Location || '',
        Description: editingClient.Description || '',
        IsActive: editingClient.IsActive !== undefined ? editingClient.IsActive : true
      });
    } else {
      setFormData({
        Company_Name: '',
        Company_No: '',
        Client_Name: '',
        Contact_Number: '',
        Email: '',
        Location: '',
        Description: '',
        IsActive: true
      });
    }
  }, [editingClient, isOpen]);

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
    <div className={`modal-overlay ${isStacked ? 'modal-stacked' : ''}`} style={{ zIndex: isStacked ? 1100 : 500 }}>
      <div className="modal-content" style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
        <div className="modal-header" style={{ marginBottom: '1rem', paddingBottom: '0.5rem' }}>
          <h2>{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <ClientFields
            values={formData}
            onChange={(field, value) => setFormData({ ...formData, [field]: value })}
            showStatus={true}
          />

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
