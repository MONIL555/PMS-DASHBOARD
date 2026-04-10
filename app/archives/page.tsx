'use client';

import { useEffect, useState } from 'react';
import { fetchCancelledItems } from '@/utils/api';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@/utils/dateUtils';
import { Archive, Search, Users, FileText, Briefcase, Ticket, X } from 'lucide-react';
import Pagination from '@/components/Pagination';

const CancelledItems = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');

  const [selectedItem, setSelectedItem] = useState<any>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusCounts, setStatusCounts] = useState({
      Lead: 0,
      Quotation: 0,
      Project: 0,
      Ticket: 0
  });
  const ITEMS_PER_PAGE = 20;
  const [loadingInitial, setLoadingInitial] = useState(true);

  const loadData = async () => {
    try {
      const response = await fetchCancelledItems({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearch,
          type: typeFilter,
          sortBy: sortBy
      });
      setItems(response.archives);
      setTotalItems(response.totalItems);
      setStatusCounts(response.statusCounts);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, typeFilter, sortBy]);

  useEffect(() => {
      loadData();
  }, [currentPage, debouncedSearch, typeFilter, sortBy]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const filteredItems = items;
  const paginatedItems = items;

  const toggleSort = (column: string) => {
    if (column === 'ID') {
      setSortBy(sortBy === 'ID-ASC' ? 'ID-DESC' : 'ID-ASC');
    } else if (column === 'Company') {
      setSortBy(sortBy === 'Company-A-Z' ? 'Company-Z-A' : 'Company-A-Z');
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
    } else if (column === 'Date') {
      if (sortBy === 'Newest') return <span className="ml-1 text-blue-500">↓</span>;
      if (sortBy === 'Oldest') return <span className="ml-1 text-blue-500">↑</span>;
    }
    return <span className="ml-1 text-gray-400 opacity-50">⇅</span>;
  };

  if (loading) return <div className="p-8 text-center text-secondary">Loading archives...</div>;
  if (error) return <div className="text-secondary bg-red-900/20 p-4 rounded-lg text-red-500 m-8">Error: {error}</div>;

  return (
    <div className="page-container">
      <div className="page-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem', 
        padding: '0.25rem 0',
        gap: '1.25rem',
        minHeight: '48px'
      }}>
        {/* Left: Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          <div style={{ 
            backgroundColor: 'rgba(59, 130, 246, 0.1)', 
            padding: '0.45rem', 
            borderRadius: '10px',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Archive size={20} strokeWidth={2.5} />
          </div>
          <h1 className="page-title" style={{ 
            fontSize: '1.5rem', 
            fontWeight: 800, 
            color: 'var(--text-primary)', 
            margin: 0, 
            letterSpacing: '-0.025em',
            whiteSpace: 'nowrap'
          }}>Archives</h1>
        </div>

        {/* Middle-Left: Search */}
        <div className="search-wrapper" style={{ flex: 1, maxWidth: '400px', marginBottom: 0 }}>
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search cancelled items..."
            className="premium-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '0.45rem 1rem 0.45rem 2.4rem', borderRadius: '8px', fontSize: '0.85rem', height: '36px', width: '100%' }}
          />
        </div>

        {/* Middle-Right: Stats Filters */}
        <div style={{ 
          display: 'flex', 
          gap: '0.4rem', 
          backgroundColor: '#f8fafc', 
          padding: '0.25rem', 
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          alignItems: 'center',
          flexShrink: 0
        }}>
          {[
            { label: 'Leads', type: 'Lead', count: statusCounts.Lead, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', icon: <Users size={14} /> },
            { label: 'Quotations', type: 'Quotation', count: statusCounts.Quotation, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', icon: <FileText size={14} /> },
            { label: 'Projects', type: 'Project', count: statusCounts.Project, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', icon: <Briefcase size={14} /> },
            { label: 'Tickets', type: 'Ticket', count: statusCounts.Ticket, color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.1)', icon: <Ticket size={14} /> }
          ].map((block: any) => (
            <div
              key={block.type}
              onClick={() => setTypeFilter(typeFilter === block.type ? 'All' : block.type)}
              style={{
                padding: '0.35rem 0.6rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                borderRadius: '8px',
                backgroundColor: typeFilter === block.type ? 'white' : 'transparent',
                boxShadow: typeFilter === block.type ? '0 2px 4px rgba(0, 0, 0, 0.05)' : 'none',
                border: typeFilter === block.type ? `1px solid ${block.color}33` : '1px solid transparent',
                transition: 'all 0.15s ease',
                minWidth: '105px'
              }}
            >
              <div style={{
                backgroundColor: block.bgColor,
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                color: block.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {block.icon}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{block.count}</span>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.01em' }}>{block.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>


      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th onClick={() => toggleSort('ID')} style={{ cursor: 'pointer' }}>Original ID {getSortIcon('ID')}</th>
              <th onClick={() => toggleSort('Company')} style={{ cursor: 'pointer' }}>Company Name {getSortIcon('Company')}</th>
              <th>Cancel Reason</th>
              <th onClick={() => toggleSort('Date')} style={{ cursor: 'pointer' }}>Cancelled On {getSortIcon('Date')}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedItems.map((item: any) => {
              let identifierName = 'Unknown';
              let identifierName2 = 'Unknown';
              const data = item.Document_Data;
              if (data) {
                if (item.Original_Collection === 'Lead') identifierName = data.Product_Reference ? `${data.Product_Reference.Type} / ${data.Product_Reference.SubSubType}` : 'Title/ Service not Defined';
                if (item.Original_Collection === 'Quotation') identifierName = data.Product_Reference ? `${data.Product_Reference.Type} / ${data.Product_Reference.SubSubType}` : data.Client_Reference?.Company_Name || 'Title/ Service not Defined';
                if (item.Original_Collection === 'Project') identifierName = data.Project_Type?.Type_Name || 'Title/ Service not Defined';
                if (item.Original_Collection === 'Project') identifierName2 = data.Product_Reference ? `${data.Product_Reference.Type} / ${data.Product_Reference.SubSubType}` : 'Title/ Service not Defined';
                if (item.Original_Collection === 'Ticket') identifierName = data.Title || data.Client_Reference?.Company_Name || 'Title/ Service not Defined';
              }

              return (
                <tr key={item._id} onClick={() => setSelectedItem(item)} style={{ cursor: 'pointer' }}>
                  <td>
                    <span className={`badge ${item.Original_Collection === 'Lead' ? 'badge-blue' :
                      item.Original_Collection === 'Quotation' ? 'badge-yellow' :
                        item.Original_Collection === 'Project' ? 'badge-green' : 'badge-gray'}`}>
                      {item.Original_Collection}
                    </span>
                  </td>
                  <td><span className="font-semibold text-primary">{item.Original_ID}</span></td>
                  <td className="font-medium">{item.Company_Name}</td>
                  <td className="text-secondary">{item.Cancel_Reason}</td>
                  <td>{formatDateTimeDDMMYYYY(item.createdAt || item.Cancelled_At)}</td>
                </tr>
              );
            })}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>No archived items found.</td>
              </tr>
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
        itemName="archived items"
      />

      {/* Detailed View Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{selectedItem.Original_Collection} Details</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>ID: {selectedItem.Original_ID}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedItem(null)}><X size={24} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
              {/* Common Fields */}
              <div style={{ gridColumn: 'span 3', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <h4 style={{ color: '#ef4444', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Cancellation Info</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Reason</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Cancel_Reason}</p>
                  </div>
                  <div></div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Cancelled At</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{formatDateTimeDDMMYYYY(selectedItem.createdAt || selectedItem.Cancelled_At)}</p>
                  </div>
                </div>
              </div>

              {/* Dynamic Fields based on Type */}
              {selectedItem.Original_Collection === 'Lead' && (
                <>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Company Name</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Client_Reference?.Company_Name || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Client Name</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Client_Reference?.Client_Name || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Contact Number</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Client_Reference?.Contact_Number || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Email</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Client_Reference?.Email || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Product/Service</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Product_Reference ? `${selectedItem.Document_Data.Product_Reference.Type} > ${selectedItem.Document_Data.Product_Reference.SubType} > ${selectedItem.Document_Data.Product_Reference.SubSubType}` : 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Source</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Source_Reference?.Source_Name || 'N/A'}</p>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Notes</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Notes || 'No notes available'}</p>
                  </div>
                </>
              )}

              {selectedItem.Original_Collection === 'Quotation' && (
                <>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Product/Service</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Product_Reference ? `${selectedItem.Document_Data.Product_Reference.Type} > ${selectedItem.Document_Data.Product_Reference.SubType} > ${selectedItem.Document_Data.Product_Reference.SubSubType}` : 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Project Type</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Project_Type?.Type_Name || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Commercial Amount</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>₹{selectedItem.Document_Data?.Commercial || '0'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Client Info</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Client_Reference?.Company_Name || selectedItem.Document_Data?.Client_Reference?.Client_Name || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Timeline</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Timeline || 'N/A'}</p>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Requirement</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Requirement || 'No requirements stated'}</p>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Project Scope</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Project_Scope_Description || 'No scope described'}</p>
                  </div>
                </>
              )}

              {selectedItem.Original_Collection === 'Project' && (
                <>
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Project Name</p>
                    <p style={{ fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>{selectedItem.Document_Data?.Project_Name || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Project Type</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Project_Type?.Type_Name || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Assigned Person</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Start_Details?.Assigned_Person || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Priority</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Priority || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Project Cost</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>₹{selectedItem.Document_Data?.Start_Details?.Costing || '0'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Pipeline Status</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Pipeline_Status || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Phase</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Start_Details?.Phase || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Exit Type</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Termination?.Exit_Type || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Start Date</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{formatDateDDMMYYYY(selectedItem.Document_Data?.Start_Details?.Start_Date)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Estimated End</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{formatDateDDMMYYYY(selectedItem.Document_Data?.Start_Details?.End_Date)}</p>
                  </div>
                </>
              )}

              {selectedItem.Original_Collection === 'Ticket' && (
                <>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Title</p>
                    <p style={{ fontWeight: 600, margin: 0 }}>{selectedItem.Document_Data?.Title || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Raised By</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Raised_By || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Raised At</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{formatDateDDMMYYYY(selectedItem.Document_Data?.Raised_Date_Time)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Assign To</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Assigned_To || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Priority</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Priority || 'N/A'}</p>
                  </div>
                  {selectedItem.Document_Data?.Cancel_Reason && (
                    <div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Cancel Reason</p>
                      <p style={{ fontWeight: 500, margin: 0, color: '#10b981' }}>{selectedItem.Document_Data?.Cancel_Reason}</p>
                    </div>
                  )}
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Description</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Description || 'No description provided'}</p>
                  </div>
                </>
              )}
            </div>

            {/*<div className="modal-footer" style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setSelectedItem(null)}>Close</button>
                  </div>*/}
          </div>
        </div>
      )}
    </div>
  );
};

export default CancelledItems;
