'use client';

import { useCallback, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { downloadTemplateCsv, getCsvImportConfig } from '@/lib/csv-import/config';
import { csvRowsToRecords, validateCsvRows } from '@/lib/csv-import/parse';
import type { CsvImportEntity, CsvImportResult } from '@/lib/csv-import/types';
import { bulkImportCsv } from '@/lib/api-services';

type BulkCsvImportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: CsvImportEntity;
  onSuccess?: () => void;
};

type ImportPhase = 'idle' | 'ready' | 'importing' | 'done';

export function BulkCsvImportModal({
  open,
  onOpenChange,
  entity,
  onSuccess,
}: BulkCsvImportModalProps) {
  const config = getCsvImportConfig(entity);
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState(0);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [parseErrors, setParseErrors] = useState<
    { row: number; field?: string; message: string }[]
  >([]);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setPhase('idle');
    setFileName(null);
    setRowCount(0);
    setParsedRows([]);
    setParseErrors([]);
    setImportResult(null);
    setIsDragging(false);
    setLoadError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) resetState();
    onOpenChange(next);
  };

  const processFile = async (file: File) => {
    setLoadError(null);
    setImportResult(null);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setLoadError('Please upload a .csv file.');
      setPhase('idle');
      return;
    }

    const text = await file.text();
    const { rows, errors: headerErrors } = csvRowsToRecords(entity, text);
    const validationErrors = validateCsvRows(entity, rows);
    const allErrors = [...headerErrors, ...validationErrors];

    setFileName(file.name);
    setParsedRows(rows);
    setRowCount(rows.length);
    setParseErrors(allErrors);
    setPhase(rows.length > 0 && allErrors.length === 0 ? 'ready' : 'idle');
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) return;
    void processFile(file);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0 || parseErrors.length > 0) return;

    setPhase('importing');
    try {
      const result = await bulkImportCsv(entity, parsedRows);
      setImportResult(result);
      setPhase('done');
      if (result.imported > 0) onSuccess?.();
    } catch (error) {
      setImportResult({
        imported: 0,
        failed: parsedRows.length,
        errors: [
          {
            row: 0,
            message:
              error instanceof Error ? error.message : 'Import request failed.',
          },
        ],
      });
      setPhase('done');
    }
  };

  const allErrors = [
    ...parseErrors,
    ...(importResult?.errors ?? []),
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-xl max-h-[90vh] overflow-y-auto bg-background text-foreground'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <FileSpreadsheet className='h-5 w-5 text-indigo-500' />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='rounded-lg'
              onClick={() => downloadTemplateCsv(entity)}
            >
              <Download className='h-4 w-4 mr-1.5' />
              Download template
            </Button>
            <span className='text-xs text-muted-foreground self-center'>
              Columns: {config.headers.join(', ')}
            </span>
          </div>

          <div
            role='button'
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFileSelect(file);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer',
              isDragging
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-border/60 bg-muted/20 hover:border-indigo-500/40 hover:bg-muted/30'
            )}
          >
            <input
              ref={inputRef}
              type='file'
              accept='.csv,text/csv'
              className='sr-only'
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/15'>
              <Upload className='h-6 w-6 text-indigo-500' />
            </div>
            <div className='text-center'>
              <p className='text-sm font-medium text-foreground'>
                Drag & drop your CSV here
              </p>
              <p className='text-xs text-muted-foreground mt-1'>
                or click to browse · max recommended 500 rows
              </p>
            </div>
            {fileName && (
              <p className='text-xs font-mono text-indigo-600 dark:text-indigo-400'>
                {fileName}
                {rowCount > 0 && ` · ${rowCount} row(s) parsed`}
              </p>
            )}
          </div>

          {loadError && (
            <div className='flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300'>
              <AlertCircle className='h-4 w-4 shrink-0 mt-0.5' />
              <span>{loadError}</span>
            </div>
          )}

          {phase === 'done' && importResult && (
            <div
              className={cn(
                'flex items-start gap-2 rounded-lg border p-3 text-sm',
                importResult.imported > 0
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
              )}
            >
              <CheckCircle2 className='h-4 w-4 shrink-0 mt-0.5' />
              <span>
                Imported <strong>{importResult.imported}</strong> record(s).
                {importResult.failed > 0 && (
                  <>
                    {' '}
                    <strong>{importResult.failed}</strong> failed.
                  </>
                )}
              </span>
            </div>
          )}

          {allErrors.length > 0 && (
            <div className='rounded-xl border border-rose-500/30 overflow-hidden'>
              <div className='flex items-center justify-between gap-2 bg-rose-500/10 px-3 py-2 border-b border-rose-500/20'>
                <p className='text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300'>
                  {phase === 'done' ? 'Import errors' : 'Validation errors'} (
                  {allErrors.length})
                </p>
              </div>
              <div className='max-h-48 overflow-y-auto'>
                <table className='w-full text-xs'>
                  <thead className='bg-muted/40 sticky top-0'>
                    <tr>
                      <th className='text-left p-2 font-medium w-14'>Row</th>
                      <th className='text-left p-2 font-medium w-20'>Field</th>
                      <th className='text-left p-2 font-medium'>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allErrors.map((err, index) => (
                      <tr
                        key={`import-err-${err.row}-${err.field ?? 'general'}-${index}`}
                        className='border-t border-border/40'
                      >
                        <td className='p-2 tabular-nums text-muted-foreground'>
                          {err.row > 0 ? err.row : '—'}
                        </td>
                        <td className='p-2 text-muted-foreground'>
                          {err.field ?? '—'}
                        </td>
                        <td className='p-2 text-foreground'>{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className='flex justify-end gap-2 pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => handleOpenChange(false)}
            >
              <X className='h-4 w-4 mr-1' />
              Close
            </Button>
            <Button
              type='button'
              disabled={
                phase === 'importing' ||
                parsedRows.length === 0 ||
                parseErrors.length > 0
              }
              onClick={() => void handleImport()}
              className='bg-gradient-to-r from-indigo-600 to-violet-600'
            >
              {phase === 'importing'
                ? 'Importing…'
                : `Import ${rowCount > 0 ? rowCount : ''} row(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
