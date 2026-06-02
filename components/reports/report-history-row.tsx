'use client';

import type { DailyReportData } from '@/lib/api-services';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface ReportHistoryRowProps {
  report: DailyReportData;
  expanded: boolean;
  onToggle: () => void;
}

export function ReportHistoryRow({
  report,
  expanded,
  onToggle,
}: ReportHistoryRowProps) {
  return (
    <GlassCard className='overflow-hidden'>
      <button
        type='button'
        onClick={onToggle}
        className='w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors'
      >
        <span className='font-medium flex-1'>{report.reportDate}</span>
        <Badge
          variant='outline'
          className={cn(
            report.status === 'SUBMITTED'
              ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
              : 'border-amber-500/30 text-amber-600 bg-amber-500/10'
          )}
        >
          {report.status}
        </Badge>
        <span className='text-sm text-muted-foreground'>
          {report.entryCount ?? report.entries.length} entries
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )}
        />
      </button>
      {expanded && (
        <div className='border-t border-border/50 px-4 pb-4 space-y-3'>
          {report.entries.map((e) => (
            <div
              key={e.id}
              className='text-sm py-2 border-b border-border/30 last:border-0'
            >
              <p className='font-medium'>
                {e.className} · {e.subjectName}
              </p>
              <p className='text-muted-foreground mt-1'>
                {e.description || '(No description)'}
              </p>
              {e.isCompleted && (
                <span className='inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600'>
                  Completed
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
