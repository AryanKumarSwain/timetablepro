'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TimetableDetail } from '@/lib/api-services';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAY_INDICES = [1, 2, 3, 4, 5, 6] as const;

type SlotCell = TimetableDetail['slots'][number];

interface TimetableGridProps {
  periods: TimetableDetail['periods'];
  slots: SlotCell[];
  subjectColorMap: Map<string, string>;
  renderCell: (dayOfWeek: number, periodId: string, slot?: SlotCell) => React.ReactNode;
  onCellClick: (dayOfWeek: number, periodId: string, slot?: SlotCell) => void;
}

export function TimetableGrid({
  periods,
  slots,
  subjectColorMap,
  renderCell,
  onCellClick,
}: TimetableGridProps) {
  const findSlot = (day: number, periodId: string) =>
    slots.find((s) => s.dayOfWeek === day && s.periodId === periodId);

  const gridCols = 'grid-cols-[minmax(10rem,12rem)_repeat(6,minmax(7rem,1fr))]';

  return (
    <div className='overflow-x-auto rounded-2xl border border-border/60'>
      <div className={cn('grid min-w-[900px]', gridCols)}>
        <div className='p-3 border-b bg-muted/30 text-xs font-semibold uppercase text-muted-foreground'>
          Period
        </div>
        {DAYS.map((d) => (
          <div
            key={d}
            className='p-3 border-b border-l text-center text-xs font-semibold uppercase'
          >
            {d}
          </div>
        ))}
        {periods.map((period) => (
          <div key={period.id} className='contents'>
            <div className='p-3 border-t border-r bg-muted/20 text-sm'>
              <p className='font-medium'>Period {period.periodNumber}</p>
              <p className='text-xs text-muted-foreground'>
                {period.startTime}–{period.endTime}
              </p>
            </div>
            {DAY_INDICES.map((day) => {
              const slot = findSlot(day, period.id);
              return (
                <div
                  key={`${period.id}-${day}`}
                  className='p-1.5 border-t border-l min-h-[4.5rem] group cursor-pointer hover:bg-muted/30'
                  onClick={() => onCellClick(day, period.id, slot)}
                >
                  {slot ? (
                    renderCell(day, period.id, slot)
                  ) : (
                    <div className='h-full flex items-center justify-center opacity-0 group-hover:opacity-40 text-2xl text-muted-foreground'>
                      +
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

interface SlotEditorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot: SlotCell | null;
  dayOfWeek: number;
  periodLabel: string;
  subjects: TimetableDetail['subjects'];
  teachers: TimetableDetail['teachers'];
  draft: { subjectId: string; teacherId: string };
  onDraftChange: (patch: Partial<{ subjectId: string; teacherId: string }>) => void;
  onSave: () => void;
  onRemove: () => void;
  saving: boolean;
}

export function SlotEditorSheet({
  open,
  onOpenChange,
  slot,
  dayOfWeek,
  periodLabel,
  subjects,
  teachers,
  draft,
  onDraftChange,
  onSave,
  onRemove,
  saving,
}: SlotEditorSheetProps) {
  const dayLabel = DAYS[dayOfWeek - 1] ?? '';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {slot ? 'Edit slot' : 'Assign slot'} — {dayLabel} · {periodLabel}
          </SheetTitle>
        </SheetHeader>
        <div className='space-y-4 mt-6'>
          <div>
            <label className='text-sm font-medium mb-2 block'>Subject</label>
            <Select
              value={draft.subjectId}
              onValueChange={(v) => onDraftChange({ subjectId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select subject' />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className='text-sm font-medium mb-2 block'>Teacher</label>
            <Select
              value={draft.teacherId}
              onValueChange={(v) => onDraftChange({ teacherId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select teacher' />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className='w-full' disabled={saving} onClick={onSave}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {slot && (
            <Button variant='destructive' className='w-full' onClick={onRemove}>
              Remove assignment
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SubjectChip({
  name,
  color,
  sublabel,
}: {
  name: string;
  color: string;
  sublabel?: string;
}) {
  return (
    <div className='h-full p-1.5'>
      <span
        className='inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md text-white truncate max-w-full'
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
      {sublabel && (
        <p className='text-[10px] text-muted-foreground mt-1 truncate'>{sublabel}</p>
      )}
    </div>
  );
}

export function WorkloadPanel({
  classWorkload,
  teacherWorkload,
}: {
  classWorkload: {
    name: string;
    assigned: number;
    total: number;
    remaining: number;
    utilization: number;
  }[];
  teacherWorkload: {
    name: string;
    assigned: number;
    total: number;
    remaining: number;
    utilization: number;
  }[];
}) {
  return (
    <div className='space-y-6 mt-8'>
      <div>
        <h3 className='text-lg font-semibold mb-3'>Class Workload</h3>
        <div className='space-y-3'>
          {classWorkload.map((c, index) => (
  <div key={`class-${index}`}>
              <div className='flex justify-between text-sm mb-1'>
                <span>{c.name}</span>
                <span className='text-muted-foreground'>
                  {c.remaining} / {c.total} available ({c.utilization}% utilization)
                </span>
              </div>
              <div className='h-2 rounded-full bg-muted overflow-hidden'>
                <div
                  className='h-full bg-emerald-500 rounded-full transition-all'
                  style={{ width: `${Math.min(100, c.utilization)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className='text-lg font-semibold mb-3'>Teacher Workload</h3>
        <div className='space-y-3'>
          {teacherWorkload.map((t, index) => (
  <div key={`teacher-${index}`}>
              <div className='flex justify-between text-sm mb-1'>
                <span>{t.name}</span>
                <span className='text-muted-foreground'>
                  {t.remaining} / {t.total} available ({t.utilization}% utilization)
                </span>
              </div>
              <div className='h-2 rounded-full bg-muted overflow-hidden'>
                <div
                  className='h-full bg-emerald-500 rounded-full transition-all'
                  style={{ width: `${Math.min(100, t.utilization)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className='rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-sm'>
        <p className='font-semibold mb-2'>Understanding Workload Distribution</p>
        <ul className='list-disc pl-5 space-y-1 text-muted-foreground'>
          <li>Utilization shows how much of the weekly schedule grid is filled.</li>
          <li>Available slots are unassigned period-class combinations.</li>
          <li>Teacher totals use each teacher&apos;s max periods per week setting.</li>
          <li>Aim for balanced utilization across classes and faculty.</li>
        </ul>
      </div>
    </div>
  );
}
