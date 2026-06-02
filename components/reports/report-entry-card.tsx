'use client';

import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

interface ReportEntryCardProps {
  periodLabel: string;
  timeRange: string;
  className: string;
  subjectName: string;
  description: string;
  isCompleted: boolean;
  readOnly?: boolean;
  onDescriptionChange: (value: string) => void;
  onCompletedChange: (value: boolean) => void;
}

export function ReportEntryCard({
  periodLabel,
  timeRange,
  className,
  subjectName,
  description,
  isCompleted,
  readOnly,
  onDescriptionChange,
  onCompletedChange,
}: ReportEntryCardProps) {
  return (
    <GlassCard className='p-5'>
      <div className='flex flex-wrap items-center gap-2 mb-3'>
        <span className='text-sm font-semibold'>
          {periodLabel} · {timeRange}
        </span>
        <Badge variant='outline'>{className}</Badge>
        <Badge variant='secondary'>{subjectName}</Badge>
      </div>
      <Textarea
        placeholder='What did you cover today?'
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        readOnly={readOnly}
        className='min-h-[100px] mb-3'
      />
      <div className='flex items-center gap-2'>
        <Checkbox
          id={`completed-${periodLabel}-${className}`}
          checked={isCompleted}
          disabled={readOnly}
          onCheckedChange={(v) => onCompletedChange(v === true)}
        />
        <Label htmlFor={`completed-${periodLabel}-${className}`}>
          Lesson completed
        </Label>
      </div>
    </GlassCard>
  );
}
