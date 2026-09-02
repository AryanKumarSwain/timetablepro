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
    description: 'Upload a CSV with faculty details.',
    headers: ['name', 'email', 'phone', 'joinDate'],
    requiredFields: ['name', 'email', 'phone'], // joinDate is optional
    sampleRows: [
      ['Jane Smith', 'jane.smith@school.edu', '+1-555-0101', '2024-08-01'],
      ['John Doe', 'john.doe@school.edu', '+1-555-0102', ''],
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
    description: 'Upload a CSV with class segments.',
    headers: ['name', 'section', 'roomNumber'],
    requiredFields: ['name', 'section'], // roomNumber is optional
    sampleRows: [
      ['Class 10-A', 'A', '101'],
      ['Class 10-B', 'B', '102'],
      ['Class 9-A', 'A', ''],
    ],
  },
  rooms: {
    entity: 'rooms',
    title: 'Import Rooms',
    description: 'Upload a CSV with room details (Room No, Floor, Block).',
    headers: ['roomNumber', 'floor', 'block'],
    requiredFields: ['roomNumber'], // floor and block are optional
    sampleRows: [
      ['101', '1st Floor', 'Block A'],
      ['102', '1st Floor', 'Block A'],
      ['Lab 1', 'Ground Floor', 'Science Wing'],
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