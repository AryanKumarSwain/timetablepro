import { useState, useRef, useEffect, useMemo } from 'react';
import { cn, isTeacherActive } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Coffee, Search, ChevronDown, Check, SlidersHorizontal, ChevronLeft, ChevronRight, GraduationCap, Users, CheckCircle2, ArrowRight, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TimetableDetail } from '@/lib/api-services';
import { usePlanTheme } from '@/lib/plan-theme';

interface SearchableSelectOption {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  allowNone?: boolean;
  noneLabel?: string;
  helperText?: string;
}

export function SearchableSelect({
  label,
  placeholder,
  value,
  onChange,
  options,
  allowNone = false,
  noneLabel = 'No Room / Default',
  helperText,
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
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
          {label}
        </label>
        {helperText && (
          <span className="text-[11px] text-muted-foreground font-medium">
            {helperText}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-11 px-3.5 rounded-xl border border-input bg-background/50 hover:bg-accent/40 flex items-center justify-between text-sm transition-colors text-foreground font-medium shadow-xs"
      >
        <span
          className={cn(
            'truncate flex items-center gap-2',
            (!value || value === 'none') && !selectedOption && 'text-muted-foreground'
          )}
        >
          {displayLabel}
          {selectedOption?.badge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase bg-primary/10 text-primary border border-primary/20">
              {selectedOption.badge}
            </span>
          )}
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
                const isDisabled = !!opt.disabled;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (isDisabled) return;
                      onChange(opt.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors',
                      isDisabled
                        ? 'opacity-40 cursor-not-allowed bg-muted/20 text-muted-foreground'
                        : isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                        : 'hover:bg-muted/60 text-foreground'
                    )}
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span
                            className={cn(
                              'text-[9px] px-1.5 py-0.2 rounded font-semibold shrink-0 uppercase',
                              isDisabled
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                : isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            )}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
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
      <div className="w-full border border-border/60 bg-muted/10 rounded-2xl p-3 sm:p-5 flex flex-col xl:flex-row gap-3 sm:gap-4 xl:items-center justify-between shadow-sm">
        <div className="flex flex-col gap-1.5 min-w-0 shrink-0 w-full xl:w-auto">
          <span className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Working Days</span>
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 py-0.5">
            {/* FIXED: Loop over the static complete index array, not the state itself */}
            {DAY_INDICES.map((dayIndex) => {
              const isActive = safeWorkingDays.includes(dayIndex);
              return (
                <button
                  key={dayIndex}
                  type="button"
                  onClick={() => toggleDay(dayIndex)}
                  className={cn(
                    "px-2.5 py-1 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-xl border transition-all duration-200 select-none cursor-pointer shrink-0",
                    isActive 
                      ? `bg-${theme.primary} border-${theme.primary} text-white shadow-sm shadow-${theme.primary}/10 font-bold` 
                      : "bg-background border-border text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  <span>{dayLabels[dayIndex]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:items-center sm:gap-6 shrink-0 w-full sm:w-auto">
          <div className="flex flex-col gap-1 min-w-0 sm:min-w-[140px]">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Base Start Time</span>
            <div className="relative">
              <Input
                type="time"
                value={baseStartTime}
                onChange={(e) => onBaseStartTimeChange(e.target.value)}
                className="h-8 sm:h-10 w-full text-xs sm:text-sm font-medium bg-background border-border/80 rounded-xl px-2 sm:px-2.5"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 min-w-0 sm:min-w-[140px]">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">Period Duration (Mins)</span>
            <Input
              type="number"
              min={5}
              max={180}
              value={periodDuration}
              onChange={(e) => onPeriodDurationChange(Number(e.target.value))}
              className="h-8 sm:h-10 w-full text-xs sm:text-sm font-medium bg-background border-border/80 rounded-xl px-2 sm:px-2.5"
            />
          </div>
        </div>
      </div>

      {/* MATRIX GRID TIMELINE */}
      <div className="w-full overflow-x-auto rounded-2xl border border-border/60 bg-background shadow-sm">
        <div
          className="grid min-w-[600px] sm:min-w-[1000px]"
          style={{ gridTemplateColumns: `minmax(180px, 240px) repeat(${safeWorkingDays.length}, minmax(120px, 1fr))` }}
        >
          {/* STICKY PERIOD ENGINE HEADER */}
          <div className="p-2 sm:p-4 border-b bg-background sticky left-0 z-20 font-semibold flex flex-col gap-1.5 justify-center border-r border-border/60 shadow-xs">
            <span className="text-[9px] sm:text-[11px] tracking-wider font-bold text-muted-foreground uppercase truncate">Timetable Engine</span>
            <div className="flex flex-col sm:flex-row gap-1 sm:gap-1.5 w-full min-w-0">
              <Button size="sm" variant="outline" className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1 px-1 sm:px-2 border-indigo-500/20 text-indigo-600 hover:bg-indigo-500/5 bg-background font-semibold rounded-lg sm:rounded-xl flex-1 justify-center whitespace-nowrap shrink-0" onClick={() => onAddRow(false)}>
                <Plus className="h-3 w-3 shrink-0" /> + Period
              </Button>
              <Button size="sm" variant="outline" className="h-7 sm:h-8 text-[10px] sm:text-xs gap-1 px-1 sm:px-2 border-amber-500/20 text-amber-600 hover:bg-amber-500/5 bg-background font-semibold rounded-lg sm:rounded-xl flex-1 justify-center whitespace-nowrap shrink-0" onClick={() => onAddRow(true)}>
                <Coffee className="h-3 w-3 shrink-0" /> + Break
              </Button>
            </div>
          </div>

          {safeWorkingDays.map((day) => (
            <div key={day} className="p-2.5 sm:p-4 border-b border-l text-center font-bold bg-muted/10 text-foreground text-xs flex items-center justify-center tracking-wider">
              {dayLabels[day]}
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
              {/* STICKY PERIOD ROW CELL */}
              <div className={cn(
                "p-2.5 sm:p-4 border-t border-r border-border/60 flex flex-col justify-center gap-1 transition-colors relative group sticky left-0 z-10 bg-background shadow-xs",
                period.isBreak ? "bg-amber-500/[0.04]" : "bg-card"
              )}>
                <div className="flex items-center justify-between gap-1">
                  {period.isBreak ? (
                    <Input 
                      type="text"
                      value={period.breakLabel || 'BREAK'}
                      onChange={(e) => onUpdateRowLabel(period.id, e.target.value)}
                      className="h-6 sm:h-7 text-[10px] sm:text-xs font-bold bg-transparent border-none p-0 focus-visible:ring-0 w-[90px] sm:w-[150px] uppercase text-amber-800 tracking-wider"
                    />
                  ) : (
                    <span className="text-[10px] sm:text-xs font-bold text-foreground tracking-wide">Period {period.periodNumber}</span>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => onRemoveRow(period.id)} className="h-6 w-6 sm:h-7 sm:w-7 text-destructive hover:bg-destructive/10 opacity-0 group-hover/row:opacity-100 rounded-lg transition-all duration-150 shrink-0">
                    <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </div>

                <div className="flex items-center gap-0.5 text-[10px] sm:text-xs text-muted-foreground">
                  <Input 
                    type="time" 
                    defaultValue={period.startTime} 
                    key={`start-${period.id}-${period.startTime}`}
                    onBlur={(e) => {
                      if (e.target.value && e.target.value !== period.startTime) {
                        onUpdateRowTime(period.id, e.target.value, period.endTime);
                      }
                    }}
                    className="h-5 sm:h-7 w-[56px] sm:w-[84px] text-center px-0.5 text-[9px] sm:text-[11px] font-medium bg-background border-border/70 rounded-md shadow-xs"
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
                    className="h-5 sm:h-7 w-[56px] sm:w-[84px] text-center px-0.5 text-[9px] sm:text-[11px] font-medium bg-background border-border/70 rounded-md shadow-xs"
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
  periodId?: string;
  periodLabel: string;
  currentClassId?: string;
  currentClassName?: string;
  subjects: TimetableDetail['subjects'];
  teachers: TimetableDetail['teachers'];
  rooms?: TimetableDetail['rooms'];
  allSlots?: TimetableDetail['slots'];
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
  periodId,
  periodLabel,
  currentClassId,
  currentClassName,
  subjects,
  teachers,
  rooms = [],
  allSlots = [],
  draft,
  onDraftChange,
  onSave,
  onRemove,
  saving,
}: SlotEditorSheetProps) {
  const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
  const dayLabel = FULL_DAYS[dayOfWeek] ?? '';

  // 1. Filter subjects strictly assigned to the current class
  const classSubjects = useMemo(() => {
    if (!currentClassId) return subjects || [];

    // Filter subjects where currentClassId (or currentClassName) is assigned in s.classIds
    const assigned = (subjects || []).filter((s) => {
      const cIds = Array.isArray(s.classIds) ? s.classIds : [];
      return (
        cIds.includes(currentClassId) ||
        (currentClassName ? cIds.includes(currentClassName) : false)
      );
    });

    if (assigned.length > 0) {
      return assigned;
    }

    // Only fallback if NO subject in the school has any class assignments configured (legacy setup)
    const anySubjectConfigured = (subjects || []).some(
      (s) => Array.isArray(s.classIds) && s.classIds.length > 0
    );
    if (!anySubjectConfigured) {
      return subjects || [];
    }

    return [];
  }, [subjects, currentClassId, currentClassName]);

  // 2. Track busy teachers during this exact day and period
  const busyTeacherMap = useMemo(() => {
    const map = new Map<string, string>(); // teacherId -> className
    (allSlots || []).forEach((s) => {
      if (
        s.dayOfWeek === dayOfWeek &&
        (s.periodId === periodId || (slot?.periodNumber && s.periodNumber === slot.periodNumber)) &&
        s.classId !== currentClassId &&
        s.id !== slot?.id
      ) {
        map.set(s.teacherId, s.className || 'Another class');
      }
    });
    return map;
  }, [allSlots, dayOfWeek, periodId, slot, currentClassId]);

  // 3. Track busy rooms during this exact day and period
  const busyRoomMap = useMemo(() => {
    const map = new Map<string, string>(); // roomId -> className
    (allSlots || []).forEach((s) => {
      if (
        s.roomId &&
        s.dayOfWeek === dayOfWeek &&
        (s.periodId === periodId || (slot?.periodNumber && s.periodNumber === slot.periodNumber)) &&
        s.classId !== currentClassId &&
        s.id !== slot?.id
      ) {
        map.set(s.roomId, s.className || 'Another class');
      }
    });
    return map;
  }, [allSlots, dayOfWeek, periodId, slot, currentClassId]);

  // 4. Active teachers
  const activeTeachers = useMemo(() => {
    return (teachers || []).filter((t) => isTeacherActive(t.active));
  }, [teachers]);

  // Check if another slot for this class & subject already has an assigned teacher
  const existingSubjectTeacher = useMemo(() => {
    if (!currentClassId || !draft?.subjectId) return null;

    const existingSlot = (allSlots || []).find(
      (s) =>
        s.classId === currentClassId &&
        s.subjectId === draft.subjectId &&
        s.teacherId &&
        s.id !== slot?.id
    );

    if (!existingSlot) return null;

    const teacher = (teachers || []).find((t) => t.id === existingSlot.teacherId);
    return teacher
      ? { id: teacher.id, name: teacher.name, email: teacher.email }
      : { id: existingSlot.teacherId, name: existingSlot.teacherName || 'Assigned Faculty', email: '' };
  }, [allSlots, currentClassId, draft?.subjectId, slot?.id, teachers]);

  // 5. Intelligent Teacher Options - STRICTLY QUALIFIED TEACHERS ONLY
  const teacherOptions = useMemo(() => {
    const selectedSubId = draft?.subjectId;
    if (!selectedSubId) {
      return [];
    }

    // If another slot in this class already has an assigned teacher for this subject, ONLY allow that teacher!
    if (existingSubjectTeacher) {
      const lockedTeacher = activeTeachers.find((t) => t.id === existingSubjectTeacher.id);
      if (lockedTeacher) {
        const isBusy = busyTeacherMap.has(lockedTeacher.id);
        const busyClass = busyTeacherMap.get(lockedTeacher.id);
        return [
          {
            id: lockedTeacher.id,
            label: lockedTeacher.name,
            sublabel: `${lockedTeacher.email} • Assigned Class Subject Faculty`,
            badge: isBusy ? `BUSY (${busyClass})` : 'DESIGNATED FACULTY',
            disabled: isBusy,
            rank: 1,
          },
        ];
      }
    }

    const anyTeacherHasClasses = activeTeachers.some(
      (t) => Array.isArray(t.classes) && t.classes.length > 0
    );

    // Filter strictly to teachers qualified for this subject and class
    const qualifiedTeachers = activeTeachers.filter((t) => {
      const tClasses = Array.isArray(t.classes) ? t.classes : [];
      if (tClasses.length === 0) {
        if (anyTeacherHasClasses) return false;
      } else {
        const teachesClass =
          (currentClassId ? tClasses.includes(currentClassId) : false) ||
          (currentClassName ? tClasses.includes(currentClassName) : false);
        if (!teachesClass) return false;
      }

      const tSubjects = Array.isArray(t.subjects) ? t.subjects : [];
      if (tSubjects.length === 0 && !(t as any).subjectSpecialtyId) {
        return false;
      }

      const teachesSubject =
        tSubjects.includes(selectedSubId) ||
        (selectedSubId && (subjects || []).some((s) => s.id === selectedSubId && tSubjects.includes(s.name))) ||
        (t as any).subjectSpecialtyId === selectedSubId;

      return teachesSubject;
    });

    const list = qualifiedTeachers.map((t) => {
      const isBusy = busyTeacherMap.has(t.id);
      const busyClass = busyTeacherMap.get(t.id);

      return {
        id: t.id,
        label: t.name,
        sublabel: t.email,
        badge: isBusy ? `BUSY (${busyClass})` : 'QUALIFIED',
        disabled: isBusy,
        rank: isBusy ? 2 : 1,
      };
    });

    list.sort((a, b) => a.rank - b.rank);
    return list;
  }, [activeTeachers, busyTeacherMap, currentClassId, currentClassName, draft?.subjectId, subjects, existingSubjectTeacher]);

  // Auto-reset draft subject/teacher if existing draft is not in allowed class subjects
  useEffect(() => {
    if (draft?.subjectId && classSubjects.length > 0) {
      const isAllowed = classSubjects.some((s) => s.id === draft.subjectId);
      if (!isAllowed) {
        onDraftChange({ subjectId: '', teacherId: '' });
      }
    }
  }, [draft?.subjectId, classSubjects, onDraftChange]);

  // Auto-reset draft teacher if current teacher is not in qualified teacher options
  useEffect(() => {
    if (draft?.teacherId && draft?.subjectId && teacherOptions.length > 0) {
      const isAllowed = teacherOptions.some((t) => t.id === draft.teacherId);
      if (!isAllowed) {
        onDraftChange({ teacherId: '' });
      }
    }
  }, [draft?.teacherId, draft?.subjectId, teacherOptions, onDraftChange]);

  // 6. Intelligent Room Options
  const roomOptions = useMemo(() => {
    return (rooms || []).map((r) => {
      const isBusy = busyRoomMap.has(r.id);
      const busyClass = busyRoomMap.get(r.id);
      return {
        id: r.id,
        label: `Room ${r.roomNumber}`,
        sublabel: `${r.floor ? r.floor : ''}${r.block ? ` [${r.block}]` : ''}`.trim(),
        badge: isBusy ? `OCCUPIED (${busyClass})` : undefined,
        disabled: isBusy,
      };
    });
  }, [rooms, busyRoomMap]);

  // 7. Auto-assignment on Subject Change
  const handleSubjectChange = (newSubjectId: string) => {
    // Check if this class already has an assigned teacher for this subject in another slot
    const designatedSlot = (allSlots || []).find(
      (s) =>
        s.classId === currentClassId &&
        s.subjectId === newSubjectId &&
        s.teacherId &&
        s.id !== slot?.id
    );

    if (designatedSlot && designatedSlot.teacherId) {
      onDraftChange({
        subjectId: newSubjectId,
        teacherId: designatedSlot.teacherId,
      });
      return;
    }

    const anyTeacherHasClasses = activeTeachers.some(
      (t) => Array.isArray(t.classes) && t.classes.length > 0
    );

    const matchingTeachers = activeTeachers.filter((t) => {
      if (busyTeacherMap.has(t.id)) return false;
      const tClasses = Array.isArray(t.classes) ? t.classes : [];
      if (tClasses.length === 0) {
        if (anyTeacherHasClasses) return false;
      } else {
        const teachesClass =
          (currentClassId ? tClasses.includes(currentClassId) : false) ||
          (currentClassName ? tClasses.includes(currentClassName) : false);
        if (!teachesClass) return false;
      }

      const tSubjects = Array.isArray(t.subjects) ? t.subjects : [];
      if (tSubjects.length === 0 && !(t as any).subjectSpecialtyId) {
        return false;
      }

      const teachesSubject =
        tSubjects.includes(newSubjectId) ||
        (newSubjectId && (subjects || []).some((s) => s.id === newSubjectId && tSubjects.includes(s.name))) ||
        (t as any).subjectSpecialtyId === newSubjectId;

      return teachesSubject;
    });

    if (matchingTeachers.length === 1) {
      // Auto-assign the sole qualified teacher
      onDraftChange({ subjectId: newSubjectId, teacherId: matchingTeachers[0].id });
    } else {
      // Check if existing teacher is qualified for the new subject
      const currentTeacher = activeTeachers.find((t) => t.id === draft?.teacherId);
      const currentTSubjects = Array.isArray(currentTeacher?.subjects) ? currentTeacher!.subjects : [];
      const curValid =
        currentTeacher &&
        (currentTSubjects.includes(newSubjectId) ||
          (newSubjectId && (subjects || []).some((s) => s.id === newSubjectId && currentTSubjects.includes(s.name))) ||
          (currentTeacher as any).subjectSpecialtyId === newSubjectId);
      onDraftChange({
        subjectId: newSubjectId,
        teacherId: curValid ? draft?.teacherId : '',
      });
    }
  };

  // 8. Auto-assignment on Teacher Change
  const handleTeacherChange = (newTeacherId: string) => {
    const teacher = activeTeachers.find((t) => t.id === newTeacherId);
    if (teacher && !draft?.subjectId) {
      const tSubjects = Array.isArray(teacher.subjects) ? teacher.subjects : [];
      const matchingSubjects = classSubjects.filter((s) =>
        tSubjects.includes(s.id) ||
        tSubjects.includes(s.name) ||
        (teacher as any).subjectSpecialtyId === s.id
      );
      if (matchingSubjects.length === 1) {
        onDraftChange({ teacherId: newTeacherId, subjectId: matchingSubjects[0].id });
        return;
      }
    }
    onDraftChange({ teacherId: newTeacherId });
  };

  const selectedSubject = (subjects || []).find((s) => s.id === draft?.subjectId);
  const isSelectedTeacherBusy = draft?.teacherId ? busyTeacherMap.has(draft.teacherId) : false;
  const busyTeacherClass = draft?.teacherId ? busyTeacherMap.get(draft.teacherId) : null;
  const isSelectedRoomBusy = draft?.roomId ? busyRoomMap.has(draft.roomId) : false;
  const busyRoomClass = draft?.roomId ? busyRoomMap.get(draft.roomId) : null;

  const hasQualifiedTeachers = useMemo(() => {
    if (!draft?.subjectId) return true;
    const anyTeacherHasClasses = activeTeachers.some(
      (t) => Array.isArray(t.classes) && t.classes.length > 0
    );

    return activeTeachers.some((t) => {
      const tClasses = Array.isArray(t.classes) ? t.classes : [];
      if (tClasses.length === 0) {
        if (anyTeacherHasClasses) return false;
      } else {
        const teachesClass =
          (currentClassId ? tClasses.includes(currentClassId) : false) ||
          (currentClassName ? tClasses.includes(currentClassName) : false);
        if (!teachesClass) return false;
      }

      const tSubjects = Array.isArray(t.subjects) ? t.subjects : [];
      if (tSubjects.length === 0 && !(t as any).subjectSpecialtyId) {
        return false;
      }

      const teachesSubject =
        tSubjects.includes(draft.subjectId) ||
        (draft.subjectId && (subjects || []).some((s) => s.id === draft.subjectId && tSubjects.includes(s.name))) ||
        (t as any).subjectSpecialtyId === draft.subjectId;

      return teachesSubject;
    });
  }, [activeTeachers, draft?.subjectId, currentClassId, currentClassName, subjects]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md p-6">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl font-bold text-foreground">
            {slot ? 'Modify Slot' : 'Assign Grid Slot'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 flex-wrap pt-0.5">
            {currentClassName && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                {currentClassName}
              </span>
            )}
            <span>{dayLabel} Layout Framework — <span className="text-indigo-600 font-semibold">{periodLabel}</span></span>
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 mt-2'>
          {/* SUBJECT SELECT */}
          <SearchableSelect
            label="Subject"
            placeholder={classSubjects.length === 0 ? "No subjects assigned to this class" : "Choose subject configuration"}
            value={draft?.subjectId ?? ''}
            onChange={handleSubjectChange}
            helperText={currentClassName ? `Filtered for ${currentClassName}` : undefined}
            options={classSubjects.map((s) => ({
              id: s.id,
              label: s.name,
              sublabel: s.code,
            }))}
          />

          {classSubjects.length === 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
              <span className="font-bold text-amber-600">Notice:</span>
              <span>
                No subjects are assigned to <strong>{currentClassName || 'this class'}</strong>. Please assign subjects to this class under the Subjects tab.
              </span>
            </div>
          )}

          {/* NOTICE: SINGLE TEACHER PER SUBJECT FOR THIS CLASS */}
          {existingSubjectTeacher && (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-2">
              <Lock className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span>
                <strong>{existingSubjectTeacher.name}</strong> is the designated teacher for {selectedSubject?.name || 'this subject'} in {currentClassName || 'this class'}. Another teacher cannot be assigned.
              </span>
            </div>
          )}

          {/* FACULTY SELECT */}
          <SearchableSelect
            label="Faculty / Teacher"
            placeholder={!draft?.subjectId ? "Choose subject first" : "Assign qualified teacher"}
            value={draft?.teacherId ?? ''}
            onChange={handleTeacherChange}
            helperText={existingSubjectTeacher ? `Locked to ${existingSubjectTeacher.name}` : draft?.subjectId ? "Only qualified teachers shown" : undefined}
            options={teacherOptions}
          />

          {/* NOTICE: NO QUALIFIED TEACHERS FOUND */}
          {draft?.subjectId && teacherOptions.length === 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
              <span className="font-bold text-amber-600">Note:</span>
              <span>
                No teacher is qualified for <strong>{selectedSubject?.name}</strong> in {currentClassName || 'this class'}. Only teachers qualified for this subject and class can be assigned. Please link a teacher under the Teachers tab.
              </span>
            </div>
          )}

          {/* ERROR: SELECTED TEACHER IS BUSY */}
          {isSelectedTeacherBusy && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
              <span className="font-bold text-rose-600">Conflict:</span>
              <span>
                This teacher is already assigned to <strong>{busyTeacherClass}</strong> at this time. Please select another teacher.
              </span>
            </div>
          )}

          {/* ROOM SELECT */}
          <SearchableSelect
            label="Room (Optional)"
            placeholder="Select room"
            value={draft?.roomId ? draft.roomId : 'none'}
            onChange={(v) => onDraftChange({ roomId: v === 'none' ? '' : v })}
            allowNone
            noneLabel="No Room / Default"
            options={roomOptions}
          />

          {/* ERROR: SELECTED ROOM IS BUSY */}
          {isSelectedRoomBusy && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
              <span className="font-bold text-rose-600">Room Conflict:</span>
              <span>
                This room is already occupied by <strong>{busyRoomClass}</strong> at this time. Please select another room.
              </span>
            </div>
          )}

          <div className="pt-3 space-y-2.5">
            <Button
              className='w-full h-11 rounded-xl font-semibold shadow-sm'
              disabled={
                saving ||
                !draft?.subjectId ||
                !draft?.teacherId ||
                isSelectedTeacherBusy ||
                isSelectedRoomBusy ||
                teacherOptions.length === 0 ||
                classSubjects.length === 0
              }
              onClick={onSave}
            >
              {saving ? 'Processing Canvas…' : 'Save Assignment'}
            </Button>
            {slot && (
              <Button
                variant='destructive'
                className='w-full h-11 rounded-xl font-semibold'
                onClick={onRemove}
              >
                Drop Grid Mapping
              </Button>
            )}
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

export function WorkloadPanel({
  teacherWorkload = [],
  classWorkload = [],
  totalWeeklySlots,
  activePeriodsCount,
  workingDaysCount,
  onSelectClass,
  onSelectTeacher,
}: {
  teacherWorkload?: any[];
  classWorkload?: any[];
  totalWeeklySlots?: number;
  activePeriodsCount?: number;
  workingDaysCount?: number;
  onSelectClass?: (classId: string) => void;
  onSelectTeacher?: (teacherId: string) => void;
}) {
  const { theme } = usePlanTheme();
  const [activeTab, setActiveTab] = useState<'class' | 'faculty'>('class');
  const [search, setSearch] = useState('');
  const [sortFilter, setSortFilter] = useState<'all' | 'most' | 'least'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter and sort for classes
  const filteredClassWorkload = useMemo(() => {
    let list = [...(classWorkload || [])];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.section?.toLowerCase().includes(q)
      );
    }
    if (sortFilter === 'most') {
      list.sort((a, b) => (b.utilization || 0) - (a.utilization || 0));
    } else if (sortFilter === 'least') {
      list.sort((a, b) => (a.utilization || 0) - (b.utilization || 0));
    } else {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return list;
  }, [classWorkload, search, sortFilter]);

  // Filter and sort for faculty
  const filteredTeacherWorkload = useMemo(() => {
    let list = [...(teacherWorkload || [])];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.name?.toLowerCase().includes(q));
    }
    if (sortFilter === 'most') {
      list.sort((a, b) => (b.utilization || 0) - (a.utilization || 0));
    } else if (sortFilter === 'least') {
      list.sort((a, b) => (a.utilization || 0) - (b.utilization || 0));
    } else {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return list;
  }, [teacherWorkload, search, sortFilter]);

  const currentList = activeTab === 'class' ? filteredClassWorkload : filteredTeacherWorkload;
  const totalPages = Math.ceil(currentList.length / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);

  const paginatedList = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return currentList.slice(start, start + pageSize);
  }, [currentList, safePage]);

  // Reset page when switching tabs, search, or sort filter
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, sortFilter]);

  // Quick stats summary
  const classStats = useMemo(() => {
    const total = classWorkload.length;
    const completed = classWorkload.filter((c) => (c.assigned || 0) >= (c.total || 1)).length;
    const partial = classWorkload.filter(
      (c) => (c.assigned || 0) > 0 && (c.assigned || 0) < (c.total || 1)
    ).length;
    const unassigned = total - completed - partial;
    return { total, completed, partial, unassigned };
  }, [classWorkload]);

  const teacherStats = useMemo(() => {
    const total = teacherWorkload.length;
    const active = teacherWorkload.filter((t) => (t.assigned || 0) > 0).length;
    const overloaded = teacherWorkload.filter((t) => (t.assigned || 0) > (t.total || 1)).length;
    const avgLoad =
      total > 0
        ? Math.round(
            teacherWorkload.reduce((sum, t) => sum + (t.utilization || 0), 0) / total
          )
        : 0;
    return { total, active, overloaded, avgLoad };
  }, [teacherWorkload]);

  return (
    <div className="space-y-4">
      {/* Tab Switcher & Dynamic Slots Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('class')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === 'class'
                ? "bg-background text-foreground shadow-sm border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />
            Class Completion
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-extrabold",
              activeTab === 'class' ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" : "bg-muted text-muted-foreground"
            )}>
              {classStats.completed}/{classStats.total} Done
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('faculty')}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeTab === 'faculty'
                ? "bg-background text-foreground shadow-sm border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5 text-indigo-500" />
            Faculty Workload
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full font-extrabold",
              activeTab === 'faculty' ? "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" : "bg-muted text-muted-foreground"
            )}>
              {teacherStats.total} Faculty
            </span>
          </button>
        </div>

        {/* Timetable Slot Capacity indicator */}
        {(totalWeeklySlots || (classWorkload[0]?.total)) && (
          <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40">
            <span className="font-bold text-foreground">
              {totalWeeklySlots || classWorkload[0]?.total} Total Slots / Week
            </span>
            {activePeriodsCount && workingDaysCount ? (
              <span className="text-[10px] text-muted-foreground">
                ({activePeriodsCount} periods × {workingDaysCount} days)
              </span>
            ) : null}
          </div>
        )}
      </div>

      {/* Quick Summary Pill Bar */}
      {activeTab === 'class' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Classes</span>
            <span className="text-base font-extrabold text-foreground">{classStats.total}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Fully Scheduled</span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{classStats.completed}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">In Progress</span>
            <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">{classStats.partial}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Not Started</span>
            <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">{classStats.unassigned}</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Faculty</span>
            <span className="text-base font-extrabold text-foreground">{teacherStats.total}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 flex flex-col">
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Assigned Faculty</span>
            <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">{teacherStats.active}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col">
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Overloaded</span>
            <span className="text-base font-extrabold text-rose-600 dark:text-rose-400">{teacherStats.overloaded}</span>
          </div>
          <div className="p-2.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Avg Faculty Load</span>
            <span className="text-base font-extrabold text-foreground">{teacherStats.avgLoad}%</span>
          </div>
        </div>
      )}

      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={activeTab === 'class' ? "Search class or section..." : "Search faculty name..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9 rounded-xl bg-background border-border"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            className="text-xs bg-background border border-border rounded-xl h-9 px-3 focus:outline-none focus:ring-1 focus:ring-ring font-medium w-full sm:w-auto cursor-pointer shadow-xs"
            value={sortFilter}
            onChange={(e) => setSortFilter(e.target.value as 'all' | 'most' | 'least')}
          >
            <option value="all">Default Sort (A–Z)</option>
            {activeTab === 'class' ? (
              <>
                <option value="most">Highest Progress (Most Filled)</option>
                <option value="least">Lowest Progress (Pending Slots)</option>
              </>
            ) : (
              <>
                <option value="most">Most Workload (Highest)</option>
                <option value="least">Least Workload (Lowest)</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Cards List */}
      {paginatedList.length > 0 ? (
        <div className="space-y-3">
          {activeTab === 'class' ? (
            // CLASS WORKLOAD CARDS
            (paginatedList as any[]).map((cls, index) => {
              const isComplete = cls.isComplete || cls.assigned >= cls.total;
              const isNotStarted = cls.assigned === 0;

              return (
                <div
                  key={cls.classId || `class-${index}`}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all",
                    isComplete
                      ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                      : "border-border/60 bg-card hover:bg-muted/10"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-foreground font-bold text-sm">
                        {cls.name} {cls.section ? `(${cls.section})` : ''}
                      </span>
                      {isComplete ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" />
                          Complete (100%)
                        </span>
                      ) : isNotStarted ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          0% Scheduled
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                          {cls.remaining} slots remaining
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-bold text-foreground">
                        {cls.assigned} / {cls.total} Slots Filled
                      </span>
                      <span
                        className={cn(
                          "font-semibold",
                          isComplete
                            ? "text-emerald-600 dark:text-emerald-400 font-bold"
                            : "text-muted-foreground"
                        )}
                      >
                        ({cls.utilization}% Progress)
                      </span>
                      {onSelectClass && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectClass(cls.classId)}
                          className="h-7 px-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg ml-1 cursor-pointer"
                        >
                          View <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isComplete
                          ? "bg-emerald-500"
                          : cls.utilization >= 70
                          ? "bg-indigo-500"
                          : cls.utilization >= 30
                          ? "bg-blue-500"
                          : "bg-amber-500"
                      )}
                      style={{ width: `${Math.min(100, cls.utilization)}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            // FACULTY WORKLOAD CARDS
            (paginatedList as any[]).map((t, index) => {
              const isOverloaded = t.assigned > t.total;
              const isFull = t.assigned === t.total;

              return (
                <div
                  key={t.teacherId || `teacher-${index}`}
                  className={cn(
                    "p-3.5 rounded-xl border transition-all",
                    isOverloaded
                      ? "border-rose-500/30 bg-rose-500/[0.04]"
                      : "border-border/60 bg-card hover:bg-muted/10"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-foreground font-bold text-sm">{t.name}</span>
                      {isOverloaded && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                          Overloaded (+{t.assigned - t.total})
                        </span>
                      )}
                      {isFull && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Target Met (100%)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-bold text-foreground">
                        {t.assigned} / {t.total} Periods
                      </span>
                      <span
                        className={cn(
                          "font-semibold",
                          isOverloaded
                            ? "text-rose-600 dark:text-rose-400 font-bold"
                            : "text-muted-foreground"
                        )}
                      >
                        ({t.utilization}% Load)
                      </span>
                      {onSelectTeacher && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectTeacher(t.teacherId)}
                          className="h-7 px-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg ml-1 cursor-pointer"
                        >
                          View <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isOverloaded
                          ? "bg-rose-500"
                          : t.utilization >= 80
                          ? "bg-emerald-500"
                          : t.utilization >= 50
                          ? "bg-indigo-500"
                          : "bg-amber-500"
                      )}
                      style={{ width: `${Math.min(100, t.utilization)}%` }}
                    />
                  </div>

                  {/* Class Breakdown Chips */}
                  {t.classBreakdown && t.classBreakdown.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-border/40">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">
                        Classes Assigned:
                      </span>
                      {t.classBreakdown.map((cb: any, i: number) => (
                        <span
                          key={i}
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-muted/60 text-foreground border border-border/50"
                        >
                          {cb.className}: <strong className="text-indigo-600 dark:text-indigo-400">{cb.count}</strong> slots
                        </span>
                      ))}
                      {t.proxySlots > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Proxy/Sub: {t.proxySlots}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-xs text-muted-foreground">
          No {activeTab === 'class' ? 'classes' : 'faculty members'} found matching "{search}"
        </div>
      )}

      {/* Pagination Controls */}
      {currentList.length > pageSize && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/40">
          <span className="text-xs text-muted-foreground font-medium">
            Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, currentList.length)} of {currentList.length} {activeTab === 'class' ? 'classes' : 'faculty'}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold rounded-lg px-2.5 cursor-pointer"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
            </Button>

            <span className="text-xs font-bold text-foreground px-2">
              Page {safePage} of {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold rounded-lg px-2.5 cursor-pointer"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}