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
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Archive className="text-blue-500" />
            Cancelled Items (Archives)
          </h1>
          <div className="search-wrapper" style={{ minWidth: '400px', marginBottom: 0 }}>
            <Search className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Search by ID, Reason, or Company..."
              className="premium-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.6rem 1rem 0.6rem 2.8rem', borderRadius: '10px', fontSize: '0.95rem' }}
            />
          </div>
        </div>
      </div>

      {/* Summary Blocks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {[
          { label: 'Leads', type: 'Lead', count: statusCounts.Lead, color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.1)', icon: <Users size={20} /> },
          { label: 'Quotations', type: 'Quotation', count: statusCounts.Quotation, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.1)', icon: <FileText size={20} /> },
          { label: 'Projects', type: 'Project', count: statusCounts.Project, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.1)', icon: <Briefcase size={20} /> },
          { label: 'Tickets', type: 'Ticket', count: statusCounts.Ticket, color: '#6366f1', bgColor: 'rgba(99, 102, 241, 0.1)', icon: <Ticket size={20} /> }
        ].map((block: any) => (
          <div
            key={block.type}
            className="premium-card"
            style={{
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              cursor: 'pointer',
              borderRadius: '12px',
              backgroundColor: typeFilter === block.type ? block.bgColor : '#ffffff',
              boxShadow: typeFilter === block.type
                ? `inset 0 0 0 2px ${block.color}, 0 8px 12px -3px ${block.bgColor}44`
                : `inset 0 0 0 1px var(--border-color)`,
              transition: 'all 0.3s ease',
            }}
            onClick={() => setTypeFilter(typeFilter === block.type ? 'All' : block.type)}
          >
            <div style={{ backgroundColor: block.bgColor, padding: '0.75rem', borderRadius: '12px', color: block.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {block.icon}
            </div>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, lineHeight: 1, color: 'var(--text-primary)' }}>{block.count}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', marginTop: '0.15rem' }}>{block.label}</p>
            </div>
          </div>
        ))}
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
