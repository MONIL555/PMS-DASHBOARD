import { getCountries, getCountryCallingCode, CountryCode, parsePhoneNumber } from 'libphonenumber-js';

const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });

export interface CountryInfo {
  code: CountryCode;
  name: string;
  callingCode: string;
}

export const getAllCountries = (): CountryInfo[] => {
  return getCountries().map((country: CountryCode) => ({
    code: country,
    name: displayNames.of(country) || country,
    callingCode: `+${getCountryCallingCode(country)}`
  })).sort((a, b) => a.name.localeCompare(b.name));
};

export const getCountryByCode = (code: CountryCode): CountryInfo | undefined => {
  try {
    return {
      code,
      name: displayNames.of(code) || code,
      callingCode: `+${getCountryCallingCode(code)}`
    };
  } catch {
    return undefined;
  }
};

export const getFlagUrl = (code: string) => {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
};

/**
 * Returns a formatted phone number with a gap between the country code and the number.
 * e.g. +919876543210 -> +91 9876543210
 */
export const formatPhoneNumber = (phoneNumber?: string) => {
  if (!phoneNumber) return '-';
  
  // If it already has a space, return as is
  if (phoneNumber.includes(' ')) return phoneNumber;
  
  // Try to parse with libphonenumber-js for a perfect gap
  try {
    const parsed = parsePhoneNumber(phoneNumber);
    if (parsed) {
      return `${parsed.countryCallingCode ? `+${parsed.countryCallingCode} ` : ''}${parsed.nationalNumber}`;
    }
  } catch {
    // If parsing fails but starts with +, try a simple regex split
    if (phoneNumber.startsWith('+')) {
      const match = phoneNumber.match(/^(\+\d{1,3})(\d+)$/);
      if (match) return `${match[1]} ${match[2]}`;
    }
  }
  
  return phoneNumber;
};
