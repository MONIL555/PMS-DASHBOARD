'use client';

import React from 'react';

interface ClientFieldsProps {
  values: {
    Company_Name: string;
    Company_No: string;
    Client_Name: string;
    Contact_Number: string;
    Email: string;
    Location: string;
    Description: string;
  };
  onChange: (field: string, value: string) => void;
}

const ClientFields: React.FC<ClientFieldsProps> = ({ values, onChange }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginTop: '0.5rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '0.75rem', border: '1px dashed var(--border-color)' }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Company Name *</label>
        <input 
          type="text" 
          required 
          className="form-input" 
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} 
          value={values.Company_Name} 
          onChange={(e) => onChange('Company_Name', e.target.value)} 
          placeholder="e.g. Acme Corp" 
        />
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Company Tax No. (GST/PAN)</label>
        <input 
          type="text" 
          className="form-input" 
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} 
          value={values.Company_No} 
          onChange={(e) => onChange('Company_No', e.target.value)} 
          placeholder="e.g. GSTIN1234..." 
        />
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Contact Person Name</label>
        <input 
          type="text" 
          className="form-input" 
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} 
          value={values.Client_Name} 
          onChange={(e) => onChange('Client_Name', e.target.value)} 
          placeholder="e.g. Jane Doe" 
        />
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Contact Number</label>
        <input 
          type="text" 
          className="form-input" 
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} 
          value={values.Contact_Number} 
          onChange={(e) => onChange('Contact_Number', e.target.value)} 
          placeholder="e.g. +91 98765 43210" 
        />
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Email Address</label>
        <input 
          type="email" 
          className="form-input" 
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} 
          value={values.Email} 
          onChange={(e) => onChange('Email', e.target.value)} 
          placeholder="e.g. contact@acme.com" 
        />
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Location / City</label>
        <input 
          type="text" 
          className="form-input" 
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} 
          value={values.Location} 
          onChange={(e) => onChange('Location', e.target.value)} 
          placeholder="e.g. Mumbai, India" 
        />
      </div>

      <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Client Notes</label>
        <textarea 
          className="form-textarea" 
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', minHeight: '60px' }} 
          value={values.Description} 
          onChange={(e) => onChange('Description', e.target.value)} 
          placeholder="Additional client-specific details..." 
        />
      </div>
    </div>
  );
};

export default ClientFields;
