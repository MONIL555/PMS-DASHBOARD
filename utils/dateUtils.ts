/**
 * Date Utility Functions
 * Used across the frontend for consistent date formatting.
 */

/** Formats a date to DD/MM/YYYY (e.g., "16/03/2026") */
export const formatDateDDMMYYYY = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '-';
  
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/** Formats a date to DD/MM/YYYY HH:MM AM/PM (e.g., "16/03/2026 03:55 PM") */
export const formatDateTimeDDMMYYYY = (dateInput: string | Date | undefined | null): string => {
  if (!dateInput) return '-';

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

  return `${day}/${month}/${year} ${strTime}`;
};

/** Converts DD/MM/YYYY string to YYYY-MM-DD (for HTML date inputs) */
export const parseToYYYYMMDD = (ddmmyyyy: string): string => {
  if (!ddmmyyyy || !ddmmyyyy.includes('/')) return '';
  const [day, month, year] = ddmmyyyy.split('/');
  if (!day || !month || !year) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/** Converts YYYY-MM-DD (or ISO string) to DD/MM/YYYY for display */
export const formatToDDMMYYYY = (yyyymmdd: string): string => {
  if (!yyyymmdd) return '';
  const datePart = yyyymmdd.split('T')[0];
  if (!datePart.includes('-')) return '';
  const [year, month, day] = datePart.split('-');
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
};
