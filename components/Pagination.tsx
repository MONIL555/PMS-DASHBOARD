'use client';

import React from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    itemName?: string;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    itemName = 'items'
}) => {
    if (totalItems === 0) return null;

    const startIndex = (currentPage - 1) * itemsPerPage;

    return (
        <div className="pagination-container" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.5rem',
            padding: '0 1rem'
        }}>
            <div className="text-secondary" style={{ fontSize: '0.875rem' }}>
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} {itemName}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                >
                    Previous
                </button>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, margin: '0 0.5rem' }}>
                    Page {currentPage} of {totalPages || 1}
                </span>
                <button
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => onPageChange(currentPage + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Pagination;
