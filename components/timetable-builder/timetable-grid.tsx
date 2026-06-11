'use client';

import { cn, isTeacherActive } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Coffee } from 'lucide-react';
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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const DAY_INDICES = [0, 1, 2, 3, 4, 5, 6] as const;

type SlotCell = TimetableDetail['slots'][number];

interface TimetableGridProps {
  periods?: (TimetableDetail['periods'][number] & { isBreak?: boolean; breakLabel?: string })[];
  slots?: SlotCell[];
  subjectColorMap?: Map<string, string>;
  workingDays?: number[];
  baseStartTime?: string;
  periodDuration?: number;
  onWorkingDaysChange?: (days: number[]) => void;
  onBaseStartTimeChange?: (time: string) => void;
  onPeriodDurationChange?: (duration: number) => void;
  onAddRow?: (isBreak: boolean) => void;
  onRemoveRow?: (id: string) => void;
  onUpdateRowLabel?: (id: string, label: string) => void;
  onUpdateRowTime?: (id: string, startTime: string, endTime: string) => void;
  renderCell?: (dayOfWeek: number, periodId: string, slot?: SlotCell) => React.ReactNode;
  onCellClick?: (dayOfWeek: number, periodId: string, slot?: SlotCell) => void;
}

const defaultRenderCell = (dayOfWeek: number, periodId: string, slot?: SlotCell) => {
  if (!slot) {
    return null;
  }
  return (
    <div className='h-full w-full p-2 rounded-xl border border-dashed border-indigo-500/20 bg-indigo-500/[0.02] flex flex-col justify-center gap-1'>
      <span className='text-sm font-semibold text-foreground truncate'>{slot.subjectName || 'Untitled'}</span>
      <span className='text-xs text-muted-foreground truncate'>{slot.teacherName || 'Staff'}</span>
      <span className='text-[11px] text-muted-foreground/70 truncate'>{slot.className}</span>
    </div>
  );
};

export function TimetableGrid({
  periods = [],
  slots = [],
  subjectColorMap = new Map(),
  workingDays = [1, 2, 3, 4, 5],
  baseStartTime = '08:00',
  periodDuration = 45,
  onWorkingDaysChange = () => {},
  onBaseStartTimeChange = () => {},
  onPeriodDurationChange = () => {},
  onAddRow = () => {},
  onRemoveRow = () => {},
  onUpdateRowLabel = () => {},
  onUpdateRowTime = () => {},
  renderCell = defaultRenderCell,
  onCellClick = () => {},
}: TimetableGridProps) {
  const findSlot = (day: number, periodId: string) =>
    slots.find((s) => s.dayOfWeek === day && s.periodId === periodId);

  const dayLabels: Record<number, string> = {
    0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday',
  };

  const toggleDay = (dayIndex: number) => {
    const days = Array.isArray(workingDays) ? workingDays : [1, 2, 3, 4, 5];
    if (days.includes(dayIndex)) {
      if (days.length > 1) {
        onWorkingDaysChange(days.filter((d) => d !== dayIndex).sort());
      }
    } else {
      onWorkingDaysChange([...days, dayIndex].sort());
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* GLOBAL CONTROLS TOOLBAR */}
      <div className="w-full border border-border/60 bg-muted/10 rounded-2xl p-5 flex flex-col xl:flex-row gap-6 xl:items-center justify-between overflow-x-auto shadow-sm">
        <div className="flex flex-col gap-2 min-w-0 shrink-0">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Working Days</span>
          <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap overflow-x-auto py-0.5 no-scrollbar">
            {(() => {
              const days = Array.isArray(workingDays) ? workingDays : [1, 2, 3, 4, 5];
              return days.map((dayIndex) => {
                const isActive = Array.isArray(workingDays) ? workingDays.includes(dayIndex) : false;
                return (
                  <button
                    key={dayIndex}
                    type="button"
                    onClick={() => toggleDay(dayIndex)}
                    className={cn(
                      "px-4 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 select-none",
                      isActive ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/10" : "bg-background border-border text-muted-foreground hover:bg-muted/60"
                    )}
                  >
                    {dayLabels[dayIndex]}
                  </button>
                );
              });
            })()}
          </div>
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-center gap-6 shrink-0">
          <div className="flex flex-col gap-2 min-w-[150px]">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Base Start Time</span>
            <div className="relative">
              <Input
                type="time"
                value={baseStartTime}
                onChange={(e) => onBaseStartTimeChange(e.target.value)}
                className="h-10 w-full text-sm font-medium bg-background border-border/80 rounded-xl px-3"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 min-w-[150px]">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Period Duration (Mins)</span>
            <Input
              type="number"
              min={5}
              max={180}
              value={periodDuration}
              onChange={(e) => onPeriodDurationChange(Number(e.target.value))}
              className="h-10 w-full text-sm font-medium bg-background border-border/80 rounded-xl px-3"
            />
          </div>
        </div>
      </div>

      {/* MATRIX GRID TIMELINE */}
      <div className="w-full overflow-x-auto rounded-2xl border border-border/60 bg-background shadow-sm">
        <div
          className="grid min-w-[1000px]"
          style={{ gridTemplateColumns: `260px repeat(${workingDays.length}, minmax(140px, 1fr))` }}
        >
          <div className="p-4 border-b bg-muted/30 font-semibold flex flex-col gap-2.5 justify-center">
            <span className="text-[11px] tracking-wider font-bold text-muted-foreground uppercase">Timetable Engine</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 px-3 border-indigo-500/20 text-indigo-600 hover:bg-indigo-500/5 bg-background font-semibold rounded-xl" onClick={() => onAddRow(false)}>
                <Plus className="h-3.5 w-3.5" /> + Period
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 px-3 border-amber-500/20 text-amber-600 hover:bg-amber-500/5 bg-background font-semibold rounded-xl" onClick={() => onAddRow(true)}>
                <Coffee className="h-3.5 w-3.5" /> + Break
              </Button>
            </div>
          </div>

          {workingDays.map((day) => (
            <div key={day} className="p-4 border-b border-l text-center font-bold bg-muted/10 text-foreground text-xs flex items-center justify-center tracking-widest uppercase">
              {dayLabels[day]?.slice(0, 3)}
            </div>
          ))}

          {periods.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground font-medium border-t flex flex-col items-center justify-center gap-1" style={{ gridColumn: `1 / span ${workingDays.length + 1}` }}>
              <span className="font-semibold text-foreground/80">Timeline Canvas is Empty</span>
              <p className="text-xs text-muted-foreground/70 max-w-md">Click "+ Period" to assign structured slots or "+ Break" to append timeline rest blocks.</p>
            </div>
          )}

          {periods.map((period) => (
            <div key={period.id} className={cn("contents group/row", period.isBreak && "bg-amber-500/[0.01]")}>
              <div className={cn("p-4 border-t border-r flex flex-col justify-center gap-2 transition-colors relative group pl-5", period.isBreak ? "bg-amber-500/[0.03]" : "bg-muted/10")}>
                <div className="flex items-center justify-between gap-2">
                  {period.isBreak ? (
                    <Input 
                      type="text"
                      value={period.breakLabel || 'BREAK'}
                      onChange={(e) => onUpdateRowLabel(period.id, e.target.value)}
                      className="h-7 text-xs font-bold bg-transparent border-none p-0 focus-visible:ring-0 w-[150px] uppercase text-amber-800 tracking-wider"
                    />
                  ) : (
                    <span className="text-xs font-bold text-foreground tracking-wide">Period {period.periodNumber}</span>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => onRemoveRow(period.id)} className="h-7 w-7 text-destructive hover:bg-destructive/10 opacity-0 group-hover/row:opacity-100 rounded-lg transition-all duration-150 shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* FIXED: Uses unique key mappings, true inputs, and updates entirely on onBlur to completely prevent overlap jumps */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Input 
                    type="time" 
                    defaultValue={period.startTime} 
                    key={`start-${period.id}-${period.startTime}`}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== period.startTime) {
                        onUpdateRowTime(period.id, e.target.value, period.endTime);
                      }
                    }}
                    className="h-7 w-[84px] text-center px-1 text-[11px] font-medium bg-background border-border/70 rounded-md shadow-sm"
                  />
                  <span className="text-muted-foreground/60 font-light">-</span>
                  <Input 
                    type="time" 
                    defaultValue={period.endTime} 
                    key={`end-${period.id}-${period.endTime}`}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== period.endTime) {
                        onUpdateRowTime(period.id, period.startTime, e.target.value);
                      }
                    }}
                    className="h-7 w-[84px] text-center px-1 text-[11px] font-medium bg-background border-border/70 rounded-md shadow-sm"
                  />
                </div>
              </div>

              {(Array.isArray(workingDays) ? workingDays : [1, 2, 3, 4, 5]).map((day) => {
                const slot = findSlot(day, period.id);
                if (period.isBreak) {
                  return (
                    <div key={`${period.id}-${day}`} className="border-t border-l bg-amber-500/[0.015] border-amber-500/[0.06] min-h-[95px] flex flex-col items-center justify-center p-2 text-center">
                      <Coffee className="h-4 w-4 text-amber-500/40 mb-1" />
                      <span className="text-[10px] font-bold text-amber-700/80 tracking-widest uppercase">{period.breakLabel || 'LUNCH BREAK'}</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={`${period.id}-${day}`}
                    onClick={() => onCellClick?.(day, period.id, slot)}
                    className="border-t border-l min-h-[95px] cursor-pointer hover:bg-muted/40 group p-2.5 transition-colors bg-background flex flex-col justify-stretch"
                  >
                    {slot ? renderCell?.(day, period.id, slot) : <div className="h-full w-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-indigo-500 text-lg font-normal transition-opacity duration-150 rounded-xl border border-dashed border-indigo-500/20 bg-indigo-500/[0.02]">+</div>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
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
  const dayLabel = DAYS[dayOfWeek] ?? '';
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="rounded-l-3xl border-l">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="text-xl font-bold text-foreground">{slot ? 'Modify Slot' : 'Assign Grid Slot'}</SheetTitle>
          <p className="text-xs text-muted-foreground font-medium">{dayLabel} Layout Framework — <span className="text-indigo-600 font-semibold">{periodLabel}</span></p>
        </SheetHeader>
        <div className='space-y-5 mt-6'>
          <div className="space-y-2">
            <label className='text-xs font-bold text-muted-foreground uppercase tracking-wider block'>Subject</label>
            <Select value={draft?.subjectId ?? ''} onValueChange={(v) => onDraftChange({ subjectId: v ?? '' })}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder='Choose subject configuration' /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {(subjects ?? []).map((s) => (<SelectItem key={s.id} value={s.id} className="rounded-lg">{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className='text-xs font-bold text-muted-foreground uppercase tracking-wider block'>Faculty / Teacher</label>
            <Select value={draft?.teacherId ?? ''} onValueChange={(v) => onDraftChange({ teacherId: v ?? '' })}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder='Assign course tutor' /></SelectTrigger>
              <SelectContent className="rounded-xl">
                {((teachers ?? []).filter((t) => isTeacherActive(t.active))).map((t) => (
                  <SelectItem key={t.id} value={t.id} className="rounded-lg">{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 space-y-2.5">
            <Button className='w-full h-11 rounded-xl font-semibold shadow-sm' disabled={saving} onClick={onSave}>{saving ? 'Processing Canvas…' : 'Save Assignment'}</Button>
            {slot && (<Button variant='destructive' className='w-full h-11 rounded-xl font-semibold' onClick={onRemove}>Drop Grid Mapping</Button>)}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SubjectChip({ name, color, sublabel }: { name: string; color: string; sublabel?: string }) {
  return (
    <div className='h-full w-full p-2 rounded-xl border border-black/5 bg-background shadow-sm flex flex-col justify-between items-start overflow-hidden min-h-[70px]'>
      <span className='inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md text-white truncate max-w-full tracking-wide uppercase shadow-sm' style={{ backgroundColor: color }}>{name}</span>
      {sublabel && (<p className='text-[10px] text-muted-foreground truncate w-full font-bold tracking-tight mt-1'>{sublabel}</p>)}
    </div>
  );
}

export function WorkloadPanel({ teacherWorkload }: { teacherWorkload: any[] }) {
  return (
    <div className='space-y-4'>
      {teacherWorkload.map((t, index) => (
        <div key={`teacher-${index}`} className="p-3 rounded-xl border border-border/50 bg-muted/5">
          <div className='flex justify-between text-xs font-semibold mb-1.5'>
            <span className="text-foreground">{t.name}</span>
            <span className='text-muted-foreground'>{t.remaining} / {t.total} Slots ({t.utilization}% Load)</span>
          </div>
          <div className='h-2 rounded-full bg-muted overflow-hidden'>
            <div className='h-full bg-indigo-600 rounded-full transition-all duration-300' style={{ width: `${Math.min(100, t.utilization)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}