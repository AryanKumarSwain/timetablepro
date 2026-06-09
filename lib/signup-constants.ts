export const COUNTRY_CODES = [
  { code: '+1', label: 'US +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+91', label: 'IN +91' },
  { code: '+61', label: 'AU +61' },
  { code: '+971', label: 'AE +971' },
  { code: '+65', label: 'SG +65' },
  { code: '+49', label: 'DE +49' },
  { code: '+33', label: 'FR +33' },
  { code: '+81', label: 'JP +81' },
  { code: '+86', label: 'CN +86' },
] as const;

export const INSTITUTE_TYPES = [
  'School',
  'College',
  'University',
  'Coaching Institute',
  'Other',
] as const;

export const STUDENT_RANGES = ['<50', '50–200', '200–500', '500–1000', '1000+'] as const;

export const FACULTY_RANGES = ['<10', '10–30', '30–50', '50–100', '100+'] as const;

export const COUNTRIES = [
  'United States',
  'United Kingdom',
  'India',
  'Australia',
  'United Arab Emirates',
  'Singapore',
  'Canada',
  'Germany',
  'France',
  'Japan',
  'China',
  'Brazil',
  'South Africa',
  'New Zealand',
  'Other',
] as const;
