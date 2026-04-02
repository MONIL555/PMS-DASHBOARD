'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { getAllCountries, CountryInfo } from '@/utils/countries';
import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';
import PhoneInput from './PhoneInput';

interface ClientFieldsProps {
  values: {
    Company_Name: string;
    Company_No: string;
    Client_Name: string;
    Contact_Number: string;
    Email: string;
    Location: string;
    Description: string;
    IsActive?: boolean;
  };
  onChange: (field: string, value: any) => void;
  showStatus?: boolean;
}

const ClientFields: React.FC<ClientFieldsProps> = ({ values, onChange, showStatus = false }) => {
  const [isValid, setIsValid] = useState(true);

  // Initial validation sync
  useEffect(() => {
    if (values.Contact_Number) {
      try {
        setIsValid(isValidPhoneNumber(values.Contact_Number));
      } catch {
        setIsValid(false);
      }
    }
  }, [values.Contact_Number]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '0.75rem',
      marginTop: '0.5rem',
      padding: '1rem',
      backgroundColor: 'rgba(0,0,0,0.02)',
      borderRadius: '0.75rem',
      border: '1px dashed var(--border-color)'
    }}>
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
        <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Contact Phone Number</label>
        <PhoneInput
          value={values.Contact_Number}
          onChange={(fullNum) => {
            onChange('Contact_Number', fullNum);
            try {
              setIsValid(fullNum ? isValidPhoneNumber(fullNum) : true);
            } catch {
              setIsValid(false);
            }
          }}
          error={values.Contact_Number && !isValid ? 'Please enter a valid phone number' : undefined}
          placeholder="+91 98765 43210"
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
          placeholder="Additional client details..."
        />
      </div>

      {showStatus && (
        <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', marginBottom: 0, paddingTop: '0.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
            <input
              type="checkbox"
              checked={values.IsActive}
              onChange={(e) => onChange('IsActive', e.target.checked)}
              style={{ width: '16px', height: '16px', margin: 0 }}
            />
            Active Status
          </label>
        </div>
      )}
    </div>
  );
};

export default ClientFields;
