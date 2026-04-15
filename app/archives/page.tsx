'use client';

import React, { useEffect, useState } from 'react';
import { fetchCancelledItems } from '@/utils/api';
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from '@/utils/dateUtils';
import { Archive, Search, Users, FileText, Briefcase, Ticket, X, ChevronUp, ChevronDown, ArrowUpDown, Loader2 } from 'lucide-react';
import Pagination from '@/components/Pagination';
import { useQueryState, parseAsString, parseAsInteger } from 'nuqs';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

const CancelledItems = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // --- NUQS STATE MANAGEMENT ---
  const [searchTerm, setSearchTerm] = useQueryState('q', parseAsString.withDefault(''));
  const [localSearch, setLocalSearch] = useState(searchTerm || ''); // Local debounce state

  const [typeFilter, setTypeFilter] = useQueryState('type', parseAsString.withDefault('All'));
  const [sortBy, setSortBy] = useQueryState('sort', parseAsString.withDefault('Newest'));

  const [dateRange, setDateRange] = useQueryState('range', parseAsString.withDefault('All'));
  const [customStartDate, setCustomStartDate] = useQueryState('startDate', parseAsString.withDefault(''));
  const [customEndDate, setCustomEndDate] = useQueryState('endDate', parseAsString.withDefault(''));

  const [currentPage, setCurrentPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [totalItems, setTotalItems] = useState(0);

  const [statusCounts, setStatusCounts] = useState({
    Lead: 0,
    Quotation: 0,
    Project: 0,
    Ticket: 0
  });
  const ITEMS_PER_PAGE = 20;

  // --- SEARCH DEBOUNCE LOGIC ---
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== searchTerm) {
        setSearchTerm(localSearch || null);
        setCurrentPage(1);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [localSearch, searchTerm, setSearchTerm, setCurrentPage]);

  // Sync dateRange if navigating with custom dates
  useEffect(() => {
    if (customStartDate && dateRange !== 'custom') {
      setDateRange('custom');
    }
  }, [customStartDate, dateRange, setDateRange]);

  // --- ABORT CONTROLLER FETCH LOGIC ---
  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      setFetching(true);
      try {
        let startDate: string | undefined;
        let endDate: string | undefined;
        const now = new Date();
        if (dateRange === '7days') {
          const d = new Date(); d.setDate(d.getDate() - 7); startDate = d.toISOString().split('T')[0];
        } else if (dateRange === '30days') {
          const d = new Date(); d.setDate(d.getDate() - 30); startDate = d.toISOString().split('T')[0];
        } else if (dateRange === 'thisMonth') {
          const d = new Date(now.getFullYear(), now.getMonth(), 1); startDate = d.toISOString().split('T')[0];
        } else if (dateRange === 'thisYear') {
          const d = new Date(now.getFullYear(), 0, 1); startDate = d.toISOString().split('T')[0];
        } else if (dateRange === 'custom') {
          startDate = customStartDate; endDate = customEndDate;
        }

        const response = await fetchCancelledItems({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: searchTerm,
          type: typeFilter,
          sortBy: sortBy,
          startDate,
          endDate
        });

        if (controller.signal.aborted) return;

        setItems(response.archives);
        setTotalItems(response.totalItems);
        setStatusCounts(response.statusCounts);
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setFetching(false);
          setLoading(false);
        }
      }
    };

    loadData();
    return () => controller.abort();
  }, [currentPage, searchTerm, typeFilter, sortBy, dateRange, customStartDate, customEndDate]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const toggleSort = (column: string) => {
    if (column === 'ID') {
      setSortBy(sortBy === 'ID-ASC' ? 'ID-DESC' : 'ID-ASC');
    } else if (column === 'Company') {
      setSortBy(sortBy === 'Company-A-Z' ? 'Company-Z-A' : 'Company-A-Z');
    } else if (column === 'Date') {
      setSortBy(sortBy === 'Newest' ? 'Oldest' : 'Newest');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (column: string) => {
    if (column === 'ID') {
      if (sortBy === 'ID-ASC') return <ChevronUp size={14} className="ml-1 text-blue-500" />;
      if (sortBy === 'ID-DESC') return <ChevronDown size={14} className="ml-1 text-blue-500" />;
    } else if (column === 'Company') {
      if (sortBy === 'Company-A-Z') return <ChevronUp size={14} className="ml-1 text-blue-500" />;
      if (sortBy === 'Company-Z-A') return <ChevronDown size={14} className="ml-1 text-blue-500" />;
    } else if (column === 'Date') {
      if (sortBy === 'Newest') return <ChevronDown size={14} className="ml-1 text-blue-500" />;
      if (sortBy === 'Oldest') return <ChevronUp size={14} className="ml-1 text-blue-500" />;
    }
    return <ArrowUpDown size={14} className="ml-1 text-gray-400 opacity-50" />;
  };

  if (loading) return (
    <div style={{ display: 'flex', height: '80vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div>
      <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Loading archives...</p>
    </div>
  );

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
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
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
              onClick={() => {
                setTypeFilter(typeFilter === block.type ? 'All' : block.type);
                setCurrentPage(1);
              }}
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
              <th onClick={() => toggleSort('ID')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>Original ID {getSortIcon('ID')}</div>
              </th>
              <th onClick={() => toggleSort('Company')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>Company Name {getSortIcon('Company')}</div>
              </th>
              <th>Cancel Reason</th>
              <th
                onClick={() => dateRange === 'All' && toggleSort('Date')}
                style={{ cursor: dateRange === 'All' ? 'pointer' : 'default', userSelect: 'none', minWidth: '180px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {dateRange === 'All' && getSortIcon('Date')}
                  <div onClick={(e) => e.stopPropagation()} style={{ flex: 1 }}>
                    <select
                      className="premium-table-filter"
                      value={dateRange}
                      onChange={(e) => {
                        setDateRange(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary-color)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        outline: 'none',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.025em',
                        width: '100%',
                        padding: 0
                      }}
                    >
                      <option value="All" style={{ color: '#333' }}>Cancelled On</option>
                      <option value="7days" style={{ color: '#333' }}>Last 7 Days</option>
                      <option value="30days" style={{ color: '#333' }}>Last 30 Days</option>
                      <option value="thisMonth" style={{ color: '#333' }}>This Month</option>
                      <option value="thisYear" style={{ color: '#333' }}>This Year</option>
                      <option value="custom" style={{ color: '#333' }}>Custom Range</option>
                    </select>
                    {dateRange === 'custom' && (
                      <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                        <input
                          type="date"
                          className="premium-compact-input"
                          value={customStartDate}
                          onChange={(e) => {
                            setCustomStartDate(e.target.value);
                            setCurrentPage(1);
                          }}
                          style={{ fontSize: '0.65rem', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'white' }}
                        />
                        <input
                          type="date"
                          className="premium-compact-input"
                          value={customEndDate}
                          onChange={(e) => {
                            setCustomEndDate(e.target.value);
                            setCurrentPage(1);
                          }}
                          style={{ fontSize: '0.65rem', padding: '2px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'white' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody style={{ opacity: fetching ? 0.6 : 1, transition: 'opacity 0.2s ease-in-out' }}>
            {items.map((item: any) => {
              const data = item.Document_Data;
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
            {items.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                  {fetching ? 'Updating archives...' : 'No archived items found.'}
                </td>
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
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>ID: {selectedItem.Original_ID}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedItem(null)}><X size={24} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1rem' }}>
              {/* Common Fields */}
              <div style={{ gridColumn: 'span 3', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <h4 style={{ color: '#ef4444', margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Cancellation Info</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Reason</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Cancel_Reason}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Cancelled At</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{formatDateTimeDDMMYYYY(selectedItem.createdAt || selectedItem.Cancelled_At)}</p>
                  </div>
                </div>
              </div>

              {/* Dynamic Fields based on Type */}
              {selectedItem.Original_Collection === 'Lead' && (
                <>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Company Name</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Client_Reference?.Company_Name || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Client Name</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Client_Reference?.Client_Name || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Contact Number</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Client_Reference?.Contact_Number || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Email</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Client_Reference?.Email || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Product/Service</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Product_Reference ? `${selectedItem.Document_Data.Product_Reference.Type} > ${selectedItem.Document_Data.Product_Reference.SubType} > ${selectedItem.Document_Data.Product_Reference.SubSubType}` : 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Source</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Source_Reference?.Source_Name || 'N/A'}</p>
                  </div>
                  <div style={{ gridColumn: 'span 3', background: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Notes</p>
                    <p style={{ fontWeight: 500, margin: 0, whiteSpace: 'pre-wrap' }}>{selectedItem.Document_Data?.Notes || 'No notes available'}</p>
                  </div>
                </>
              )}

              {selectedItem.Original_Collection === 'Quotation' && (
                <>
                  <div style={{ gridColumn: 'span 2' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Product/Service</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Product_Reference ? `${selectedItem.Document_Data.Product_Reference.Type} > ${selectedItem.Document_Data.Product_Reference.SubType} > ${selectedItem.Document_Data.Product_Reference.SubSubType}` : 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Commercial Amount</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>₹{selectedItem.Document_Data?.Commercial || '0'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Client Info</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Client_Reference?.Company_Name || selectedItem.Document_Data?.Client_Reference?.Client_Name || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Timeline</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Timeline || 'N/A'}</p>
                  </div>
                  <div style={{ gridColumn: 'span 3', background: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Requirement</p>
                    <p style={{ fontWeight: 500, margin: 0, whiteSpace: 'pre-wrap' }}>{selectedItem.Document_Data?.Requirement || 'No requirements stated'}</p>
                  </div>
                  <div style={{ gridColumn: 'span 3', background: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Project Scope</p>
                    <p style={{ fontWeight: 500, margin: 0, whiteSpace: 'pre-wrap' }}>{selectedItem.Document_Data?.Project_Scope_Description || 'No scope described'}</p>
                  </div>
                </>
              )}

              {selectedItem.Original_Collection === 'Project' && (
                <>
                  <div style={{ gridColumn: 'span 3' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Project Name</p>
                    <p style={{ fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>{selectedItem.Document_Data?.Project_Name || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Assigned Person</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Start_Details?.Assigned_Person || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Priority</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Priority || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Project Cost</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>₹{selectedItem.Document_Data?.Start_Details?.Costing || '0'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Exit Type</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Termination?.Exit_Type || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Start Date</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{formatDateDDMMYYYY(selectedItem.Document_Data?.Start_Details?.Start_Date)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Estimated End</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{formatDateDDMMYYYY(selectedItem.Document_Data?.Start_Details?.End_Date)}</p>
                  </div>
                </>
              )}

              {selectedItem.Original_Collection === 'Ticket' && (
                <>
                  <div style={{ gridColumn: 'span 3' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Title</p>
                    <p style={{ fontWeight: 600, margin: 0 }}>{selectedItem.Document_Data?.Title || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Raised By</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Raised_By || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Raised At</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{formatDateDDMMYYYY(selectedItem.Document_Data?.Raised_Date_Time)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Assign To</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Assigned_To || 'N/A'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Priority</p>
                    <p style={{ fontWeight: 500, margin: 0 }}>{selectedItem.Document_Data?.Priority || 'N/A'}</p>
                  </div>
                  {selectedItem.Document_Data?.Cancel_Reason && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.25rem 0' }}>Cancel Reason</p>
                      <p style={{ fontWeight: 500, margin: 0, color: '#10b981' }}>{selectedItem.Document_Data?.Cancel_Reason}</p>
                    </div>
                  )}
                  <div style={{ gridColumn: 'span 3', background: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>Description</p>
                    <p style={{ fontWeight: 500, margin: 0, whiteSpace: 'pre-wrap' }}>{selectedItem.Document_Data?.Description || 'No description provided'}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function CancelledItemsPage() {
  return (
    <NuqsAdapter>
      <React.Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%' }}></div></div>}>
        <CancelledItems />
      </React.Suspense>
    </NuqsAdapter>
  );
}