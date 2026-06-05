export type CsvImportEntity = 'teachers' | 'subjects' | 'classes';

export type CsvImportRowError = {
  row: number;
  field?: string;
  message: string;
};

export type CsvImportResult = {
  imported: number;
  failed: number;
  errors: CsvImportRowError[];
};

export type ParsedCsvRow = Record<string, string>;