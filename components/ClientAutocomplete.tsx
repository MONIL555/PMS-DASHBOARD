'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, User, X, Loader2 } from 'lucide-react';
import { fetchClients } from '@/utils/api';

interface ClientAutocompleteProps {
  value: string;
  onSelect: (client: any) => void;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const ClientAutocomplete: React.FC<ClientAutocompleteProps> = ({
  value,
  onSelect,
  onChange,
  placeholder = "Search existing company...",
  className = ""
}) => {
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await fetchClients({ active: true });
        setClients(data.clients);
      } catch (err) {
        console.error("Failed to fetch clients for autocomplete:", err);
      } finally {
        setLoading(false);
      }
    };
    loadClients();
  }, []);

  useEffect(() => {
    if (value.length > 1) {
      const filtered = clients.filter(c =>
        c.Company_Name?.toLowerCase().includes(value.toLowerCase()) ||
        c.Client_Name?.toLowerCase().includes(value.toLowerCase()) ||
        c.Client_ID?.toLowerCase().includes(value.toLowerCase())
      );

      // Check if the current value is an exact match for one of the filtered results
      // This usually happens right after selecting a suggestion
      const hasExactMatch = filtered.some(c =>
        c.Company_Name === value || c.Client_Name === value
      );

      setFilteredClients(filtered.slice(0, 5)); // Limit suggestions
      setIsOpen(filtered.length > 0 && !hasExactMatch);
    } else {
      setIsOpen(false);
    }
  }, [value, clients]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`} style={{ position: 'relative' }}>
      <div className="relative">
        <input
          type="text"
          className="form-input"
          style={{
            padding: '0.4rem 2.5rem 0.4rem 0.75rem',
            fontSize: '0.85rem',
            width: '100%'
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {/*<div 
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        </div>*/}
      </div>

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
          style={{
            position: 'absolute',
            zIndex: 1000,
            width: '100%',
            marginTop: '0.25rem',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            maxHeight: '250px',
            overflowY: 'auto'
          }}
        >
          {filteredClients.map((client) => (
            <div
              key={client._id}
              className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b last:border-0 border-slate-100 transition-colors"
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.1rem'
              }}
              onClick={() => {
                onSelect(client);
                setIsOpen(false);
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>{client.Company_Name}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{client.Client_ID}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#64748b' }}>
                <User size={12} /> {client.Client_Name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientAutocomplete;
