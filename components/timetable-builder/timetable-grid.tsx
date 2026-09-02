import { useState, useRef, useEffect } from 'react';
import { cn, isTeacherActive } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Coffee, Search, ChevronDown, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TimetableDetail } from '@/lib/api-services';
import { usePlanTheme } from '@/lib/plan-theme';

interface SearchableSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  allowNone?: boolean;
  noneLabel?: string;
}

export function SearchableSelect({
  label,
  placeholder,
  value,
  onChange,
  options,
  allowNone = false,
  noneLabel = 'No Room / Default',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedOption = options.find((opt) => opt.id === value);
  const displayLabel =
    !value || value === 'none'
      ? allowNone
        ? noneLabel
        : placeholder
      : selectedOption
      ? selectedOption.label
      : placeholder;

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-11 px-3.5 rounded-xl border border-input bg-background/50 hover:bg-accent/40 flex items-center justify-between text-sm transition-colors text-foreground font-medium shadow-xs"
      >
        <span
          className={cn(
            'truncate',
            (!value || value === 'none') && !selectedOption && 'text-muted-foreground'
          )}
        >
          {displayLabel}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="p-2 border-b border-border bg-muted/30 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full text-xs bg-transparent border-none outline-none focus:outline-none text-foreground placeholder:text-muted-foreground py-1"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {allowNone && (
              <button
                type="button"
                onClick={() => {
                  onChange('none');
                  setOpen(false);
                  setSearch('');
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors',
                  !value || value === 'none'
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'hover:bg-muted/50 text-muted-foreground'
                )}
              >
                <span>{noneLabel}</span>
                {(!value || value === 'none') && (
                  <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground font-medium">
                No matching results found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors',
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'hover:bg-muted/60 text-foreground'
                    )}
                  >
                    <div className="truncate pr-2">
                      <span className="block truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span
                          className={cn(
                            'block text-[10px] truncate',
                            isSelected ? 'text-indigo-100' : 'text-muted-foreground'
                          )}
                        >
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
  const { theme } = usePlanTheme();
  const findSlot = (day: number, periodId: string) =>
    slots.find((s) => s.dayOfWeek === day && s.periodId === periodId);

  const dayLabels: Record<number, string> = {
    0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday',
  };

  // Safe wrapper parsing for array checking
  const safeWorkingDays = Array.isArray(workingDays) ? workingDays : [1, 2, 3, 4, 5];

  const toggleDay = (dayIndex: number) => {
    if (safeWorkingDays.includes(dayIndex)) {
      if (safeWorkingDays.length > 1) {
        // Unselect day: remove item and keep array sorted numerically
        const filtered = safeWorkingDays.filter((d) => d !== dayIndex);
        onWorkingDaysChange([...filtered].sort((a, b) => a - b));
      }
    } else {
      // Select day: add item and sort array layout numerically
      onWorkingDaysChange([...safeWorkingDays, dayIndex].sort((a, b) => a - b));
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* GLOBAL CONTROLS TOOLBAR */}
      <div className="w-full border border-border/60 bg-muted/10 rounded-2xl p-5 flex flex-col xl:flex-row gap-6 xl:items-center justify-between overflow-x-auto shadow-sm">
        <div className="flex flex-col gap-2 min-w-0 shrink-0 w-full xl:w-auto">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Working Days</span>
          <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap overflow-x-auto py-0.5 no-scrollbar">
            {/* FIXED: Loop over the static complete index array, not the state itself */}
            {DAY_INDICES.map((dayIndex) => {
              const isActive = safeWorkingDays.includes(dayIndex);
              return (
                <button
                  key={dayIndex}
                  type="button"
                  onClick={() => toggleDay(dayIndex)}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold rounded-xl border transition-all duration-200 select-none cursor-pointer",
                    isActive 
                      ? `bg-${theme.primary} border-${theme.primary} text-white shadow-sm shadow-${theme.primary}/10 font-bold` 
                      : "bg-background border-border text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  {dayLabels[dayIndex]}
                </button>
              );
            })}
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
          style={{ gridTemplateColumns: `260px repeat(${safeWorkingDays.length}, minmax(140px, 1fr))` }}
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

          {safeWorkingDays.map((day) => (
            <div key={day} className="p-4 border-b border-l text-center font-bold bg-muted/10 text-foreground text-xs flex items-center justify-center tracking-widest uppercase">
              {dayLabels[day]?.slice(0, 3)}
            </div>
          ))}

          {periods.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground font-medium border-t flex flex-col items-center justify-center gap-1" style={{ gridColumn: `1 / span ${safeWorkingDays.length + 1}` }}>
              <span className="font-semibold text-foreground/80">Timeline Canvas is Empty</span>
              <p className="text-xs text-muted-foreground/70 max-w-md">Click "+ Period" to assign structured slots or "+ Break" to append timeline rest blocks.</p>
            </div>
          )}

          {periods
            .sort((a, b) => {
              // Sort by time to maintain correct position for both periods and breaks
              const aTime = a.startTime || '00:00';
              const bTime = b.startTime || '00:00';
              return aTime.localeCompare(bTime);
            })
            .map((period) => (
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

              {safeWorkingDays.map((day) => {
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
  rooms?: TimetableDetail['rooms'];
  draft: { subjectId: string; teacherId: string; roomId?: string };
  onDraftChange: (patch: Partial<{ subjectId: string; teacherId: string; roomId?: string }>) => void;
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
  rooms = [],
  draft,
  onDraftChange,
  onSave,
  onRemove,
  saving,
}: SlotEditorSheetProps) {
  const dayLabel = DAYS[dayOfWeek] ?? '';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md p-6">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl font-bold text-foreground">{slot ? 'Modify Slot' : 'Assign Grid Slot'}</DialogTitle>
          <p className="text-xs text-muted-foreground font-medium">{dayLabel} Layout Framework — <span className="text-indigo-600 font-semibold">{periodLabel}</span></p>
        </DialogHeader>
        <div className='space-y-5 mt-2'>
          <SearchableSelect
            label="Subject"
            placeholder="Choose subject configuration"
            value={draft?.subjectId ?? ''}
            onChange={(v) => onDraftChange({ subjectId: v })}
            options={(subjects ?? []).map((s) => ({
              id: s.id,
              label: s.name,
              sublabel: s.code,
            }))}
          />

          <SearchableSelect
            label="Faculty / Teacher"
            placeholder="Assign course tutor"
            value={draft?.teacherId ?? ''}
            onChange={(v) => onDraftChange({ teacherId: v })}
            options={((teachers ?? []).filter((t) => isTeacherActive(t.active))).map((t) => ({
              id: t.id,
              label: t.name,
              sublabel: t.email,
            }))}
          />

          <SearchableSelect
            label="Room (Optional)"
            placeholder="Select room"
            value={draft?.roomId ? draft.roomId : 'none'}
            onChange={(v) => onDraftChange({ roomId: v === 'none' ? '' : v })}
            allowNone
            noneLabel="No Room / Default"
            options={(rooms ?? []).map((r) => ({
              id: r.id,
              label: `Room ${r.roomNumber}`,
              sublabel: `${r.floor ? r.floor : ''}${r.block ? ` [${r.block}]` : ''}`.trim(),
            }))}
          />

          <div className="pt-4 space-y-2.5">
            <Button className='w-full h-11 rounded-xl font-semibold shadow-sm' disabled={saving} onClick={onSave}>{saving ? 'Processing Canvas…' : 'Save Assignment'}</Button>
            {slot && (<Button variant='destructive' className='w-full h-11 rounded-xl font-semibold' onClick={onRemove}>Drop Grid Mapping</Button>)}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  const { theme } = usePlanTheme();
  return (
    <div className='space-y-4'>
      {teacherWorkload.map((t, index) => (
        <div key={`teacher-${index}`} className="p-3 rounded-xl border border-border/50 bg-muted/5">
          <div className='flex justify-between text-xs font-semibold mb-1.5'>
            <span className="text-foreground">{t.name}</span>
            <span className='text-muted-foreground'>{t.remaining} / {t.total} Slots ({t.utilization}% Load)</span>
          </div>
          <div className='h-2 rounded-full bg-muted overflow-hidden'>
            <div className={`h-full bg-${theme.primary} rounded-full transition-all duration-300`} style={{ width: `${Math.min(100, t.utilization)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}