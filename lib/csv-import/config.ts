import type { CsvImportEntity } from './types';

export type CsvImportConfig = {
  entity: CsvImportEntity;
  title: string;
  description: string;
  headers: string[];
  sampleRows: string[][];
  requiredFields: string[];
};

export const CSV_IMPORT_CONFIGS: Record<CsvImportEntity, CsvImportConfig> = {
  teachers: {
    entity: 'teachers',
    title: 'Import Teachers',
    description:
      'Upload a CSV with faculty details. Subject code must match an existing subject (import subjects first).',
    headers: [
      'name',
      'email',
      'phone',
      'joinDate',
      'maxPeriodsPerWeek',
      'subjectCode',
      'active',
      'qualifications',
    ],
    requiredFields: ['name', 'email', 'phone'],
    sampleRows: [
      [
        'Jane Smith',
        'jane.smith@school.edu',
        '+1-555-0101',
        '2024-08-01',
        '24',
        'MAT101',
        'true',
        'B.Ed;M.Sc Mathematics',
      ],
      [
        'John Doe',
        'john.doe@school.edu',
        '+1-555-0102',
        '2024-08-01',
        '22',
        'PHY101',
        'true',
        'Ph.D Physics',
      ],
    ],
  },
  subjects: {
    entity: 'subjects',
    title: 'Import Subjects',
    description: 'Upload a CSV with course name and unique subject codes.',
    headers: ['name', 'code'],
    requiredFields: ['name', 'code'],
    sampleRows: [
      ['Mathematics', 'MAT101'],
      ['Physics', 'PHY101'],
      ['English', 'ENG101'],
    ],
  },
  classes: {
    entity: 'classes',
    title: 'Import Classes',
    description:
      'Upload a CSV with class sections. Grade is the numeric level (e.g. 10).',
    headers: ['name', 'grade', 'section', 'roomNumber'],
    requiredFields: ['name', 'grade', 'section'],
    sampleRows: [
      ['Class 10-A', '10', 'A', '101'],
      ['Class 10-B', '10', 'B', '102'],
      ['Class 9-A', '9', 'A', '201'],
    ],
  },
};

export function getCsvImportConfig(entity: CsvImportEntity): CsvImportConfig {
  return CSV_IMPORT_CONFIGS[entity];
}

export function buildTemplateCsv(entity: CsvImportEntity): string {
  const config = getCsvImportConfig(entity);
  const lines = [
    config.headers.join(','),
    ...config.sampleRows.map((row) =>
      row.map((cell) => escapeCsvCell(cell)).join(',')
    ),
  ];
  return lines.join('\r\n');
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadTemplateCsv(entity: CsvImportEntity): void {
  const csv = buildTemplateCsv(entity);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${entity}-import-template.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
