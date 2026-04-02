'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { getAllCountries, getFlagUrl } from '@/utils/countries';
import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

interface PhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  error?: string;
  placeholder?: string;
}

const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, error, placeholder = "Enter number" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('IN');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const countries = useMemo(() => getAllCountries(), []);

  const filteredCountries = useMemo(() =>
    countries.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.callingCode.includes(search)
    ), [search, countries]
  );

  const selectedCountryData = useMemo(() =>
    countries.find(c => c.code === selectedCountry),
    [selectedCountry, countries]
  );

  // Initial sync
  useEffect(() => {
    if (value) {
      try {
        const parsed = parsePhoneNumber(value);
        if (parsed) {
          setSelectedCountry(parsed.country as CountryCode);
          setPhoneNumber(parsed.nationalNumber as string);
        }
      } catch {
        setPhoneNumber(value);
      }
    }
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateFullValue = (countryCode: CountryCode, num: string) => {
    const countryData = countries.find(c => c.code === countryCode);
    if (!num) {
      onChange('');
      return;
    }
    const fullNum = countryData ? `${countryData.callingCode} ${num}` : num;
    onChange(fullNum);
  };

  const handleCountrySelect = (code: CountryCode) => {
    setSelectedCountry(code);
    updateFullValue(code, phoneNumber);
    setIsOpen(false);
    setSearch('');
  };

  const handlePhoneChange = (val: string) => {
    const onlyNums = val.replace(/[^\d]/g, '');
    setPhoneNumber(onlyNums);
    updateFullValue(selectedCountry, onlyNums);
  };

  return (
    <div className="phone-input-root" style={{ width: '100%', position: 'relative' }}>
      <div
        className={`premium-phone-wrapper ${error ? 'has-error' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#fff',
          border: error ? '1px solid #ef4444' : '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0',
          boxShadow: error ? '0 0 0 1px #ef4444' : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          cursor: 'text',
          overflow: 'hidden'
        }}
        onClick={(e) => {
          const input = (e.currentTarget as HTMLElement).querySelector('input');
          if (input) input.focus();
        }}
      >
        <div
          className="country-trigger"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.75rem',
            borderRight: '1px solid var(--border-color)',
            cursor: 'pointer',
            userSelect: 'none',
            backgroundColor: '#f8fafc'
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          <img
            src={getFlagUrl(selectedCountry)}
            alt={selectedCountry}
            style={{ width: '22px', height: 'auto', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
          />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
            {selectedCountryData?.callingCode}
          </span>
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: '#94a3b8' }} />
        </div>

        <input
          type="text"
          className="phone-national-input"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            padding: '0.4rem 0.75rem',
            fontSize: '0.85rem',
            fontWeight: 500,
            color: 'var(--text-primary)',
            letterSpacing: '0.01em',
            backgroundColor: 'transparent'
          }}
          value={phoneNumber}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder={placeholder}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 600, marginTop: '4px', textTransform: 'uppercase' }}>{error}</div>}

      {isOpen && (
        <div
          ref={dropdownRef}
          className="country-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            zIndex: 1050,
            width: '280px',
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #f1f5f9',
            overflow: 'hidden',
            animation: 'slideUp 0.2s ease-out'
          }}
        >
          <div style={{ padding: '0.75rem', borderBottom: '1px solid #f8fafc' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                autoFocus
                type="text"
                placeholder="Search for country"
                style={{
                  width: '100%',
                  padding: '0.45rem 0.5rem 0.45rem 2.2rem',
                  fontSize: '0.85rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  outline: 'none',
                  backgroundColor: '#fff',
                  color: 'var(--text-primary)'
                }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {filteredCountries.map((c) => (
              <div
                key={c.code}
                className="country-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  cursor: 'pointer',
                  backgroundColor: selectedCountry === c.code ? '#eff6ff' : 'transparent',
                  transition: 'background-color 0.1s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = selectedCountry === c.code ? '#eff6ff' : 'transparent')}
                onClick={() => handleCountrySelect(c.code)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <img src={getFlagUrl(c.code)} alt={c.code} style={{ width: '20px', borderRadius: '2px' }} />
                  <span style={{ fontSize: '0.85rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{c.name}</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>{c.callingCode}</span>
              </div>
            ))}
            {filteredCountries.length === 0 && (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                No country found
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .premium-phone-wrapper:focus-within {
          border-color: var(--primary-color) !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
        }
        .country-trigger:hover {
          background-color: #f1f5f9 !important;
        }
        .country-dropdown div::-webkit-scrollbar {
          width: 6px;
        }
        .country-dropdown div::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .country-dropdown div::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 10px;
          border: 2px solid #f8fafc;
        }
      `}</style>
    </div>
  );
};

export default PhoneInput;
