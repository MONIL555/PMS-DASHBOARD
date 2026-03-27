'use client';

import React, { useState, useEffect } from 'react';
import { formatToDDMMYYYY, parseToYYYYMMDD } from '../utils/dateUtils';

interface DateInputProps {
    value: string; // yyyy-mm-dd
    onChange: (value: string) => void; // yyyy-mm-dd
    required?: boolean;
    className?: string;
    style?: React.CSSProperties;
    placeholder?: string;
}

const DateInput: React.FC<DateInputProps> = ({ value, onChange, required, className, style, placeholder }) => {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        if (value) {
            setDisplayValue(formatToDDMMYYYY(value));
        } else {
            setDisplayValue('');
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let input = e.target.value;

        // Remove non-numeric characters
        input = input.replace(/\D/g, '');

        // Auto-format as DD/MM/YYYY
        if (input.length > 2 && input.length <= 4) {
            input = `${input.slice(0, 2)}/${input.slice(2)}`;
        } else if (input.length > 4) {
            input = `${input.slice(0, 2)}/${input.slice(2, 4)}/${input.slice(4, 8)}`;
        }

        setDisplayValue(input);

        // If complete, trigger onChange
        if (input.length === 10) {
            const parsed = parseToYYYYMMDD(input);
            if (parsed) {
                onChange(parsed);
            }
        } else if (input.length === 0) {
            onChange('');
        }
    };

    const handleBlur = () => {
        // Basic validation on blur
        if (displayValue && displayValue.length !== 10) {
            // Revert to original value if incomplete
            setDisplayValue(value ? formatToDDMMYYYY(value) : '');
        }
    };

    return (
        <input
            type="text"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            required={required}
            className={className}
            style={style}
            placeholder={placeholder || 'DD/MM/YYYY'}
            maxLength={10}
        />
    );
};

export default DateInput;
