import type { CsvImportEntity, CsvImportRowError, ParsedCsvRow } from './types';
import { getCsvImportConfig } from './config';

export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if (char === '\n' || (char === '\r' && next === '\n')) {
      row.push(cell.trim());
      cell = '';
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      if (char === '\r') i++;
      continue;
    }

    if (char === '\r') {
      row.push(cell.trim());
      cell = '';
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, '');
}

export function csvRowsToRecords(
  entity: CsvImportEntity,
  text: string
): { rows: ParsedCsvRow[]; errors: CsvImportRowError[] } {
  const config = getCsvImportConfig(entity);
  const matrix = parseCsvText(text.trim());

  if (matrix.length === 0) {
    return {
      rows: [],
      errors: [{ row: 0, message: 'File is empty.' }],
    };
  }

  const headerRow = matrix[0].map(normalizeHeader);
  const expected = config.headers.map(normalizeHeader);
  const missingHeaders = expected.filter((h) => !headerRow.includes(h));

  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          message: `Missing required columns: ${missingHeaders.join(', ')}`,
        },
      ],
    };
  }

  const rows: ParsedCsvRow[] = [];
  const errors: CsvImportRowError[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i];
    const record: ParsedCsvRow = {};

    config.headers.forEach((header) => {
      const index = headerRow.indexOf(normalizeHeader(header));
      record[header] = index >= 0 ? (line[index] ?? '').trim() : '';
    });

    const isBlank = config.headers.every((header) => !record[header]);
    if (isBlank) continue;

    rows.push(record);
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push({ row: 0, message: 'No data rows found after the header.' });
  }

  return { rows, errors };
}

export function validateCsvRows(
  entity: CsvImportEntity,
  rows: ParsedCsvRow[]
): CsvImportRowError[] {
  const config = getCsvImportConfig(entity);
  const errors: CsvImportRowError[] = [];
  const seenEmails = new Set<string>();
  const seenCodes = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    for (const field of config.requiredFields) {
      if (!row[field]?.trim()) {
        errors.push({
          row: rowNumber,
          field,
          message: `${field} is required.`,
        });
      }
    }

    if (entity === 'teachers') {
      const email = row.email?.trim().toLowerCase();
      if (email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push({
            row: rowNumber,
            field: 'email',
            message: 'Invalid email format.',
          });
        } else if (seenEmails.has(email)) {
          errors.push({
            row: rowNumber,
            field: 'email',
            message: 'Duplicate email in file.',
          });
        } else {
          seenEmails.add(email);
        }
      }

      const max = row.maxPeriodsPerWeek?.trim();
      if (max && Number.isNaN(Number(max))) {
        errors.push({
          row: rowNumber,
          field: 'maxPeriodsPerWeek',
          message: 'Must be a number.',
        });
      }
    }

    if (entity === 'subjects') {
      const code = row.code?.trim().toUpperCase();
      if (code) {
        if (seenCodes.has(code)) {
          errors.push({
            row: rowNumber,
            field: 'code',
            message: 'Duplicate subject code in file.',
          });
        } else {
          seenCodes.add(code);
        }
      }
    }

    if (entity === 'classes') {
      const grade = row.grade?.trim();
      if (grade && Number.isNaN(Number(grade))) {
        errors.push({
          row: rowNumber,
          field: 'grade',
          message: 'Grade must be a number.',
        });
      }
    }
  });

  return errors;
}
