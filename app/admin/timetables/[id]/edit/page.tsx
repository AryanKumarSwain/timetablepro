'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getTimetableDetail,
  upsertTimetableSlot,
  deleteTimetableSlot,
  getTimetableWorkload,
  type TimetableDetail,
  type WorkloadData,
} from '@/lib/api-services';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Filter, AlertTriangle, Plus, Minus, Layers, CheckCircle } from 'lucide-react';
import { cn, isTeacherActive } from '@/lib/utils';
import {
  TimetableGrid,
  SlotEditorSheet,
  SubjectChip,
  WorkloadPanel,
} from '@/components/timetable-builder/timetable-grid';

type ViewMode = 'section' | 'faculty' | 'room';

type ExtendedPeriod = TimetableDetail['periods'][number] & { isBreak?: boolean; breakLabel?: string };

type ExtendedTimetableDetail = Omit<TimetableDetail, 'periods'> & {
  periods: ExtendedPeriod[];
  baseStartTime?: string;
  periodDuration?: number;
  workingDays?: number[];
  targetClassName?: string;
};

export default function TimetableEditPage() {
  useRequireAuth('admin');
  const params = useParams();
  const router = useRouter();
  const timetableId = String(params.id);

  const [detail, setDetail] = useState<ExtendedTimetableDetail | null>(null);
  const [workload, setWorkload] = useState<WorkloadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('section');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [baseStartTime, setBaseStartTime] = useState<string>("08:00");
  const [periodDuration, setPeriodDuration] = useState<number>(45);
  const [zoom, setZoom] = useState<number>(100);

  const [editCell, setEditCell] = useState<{
    dayOfWeek: number;
    periodId: string;
    classId: string;
    slot?: TimetableDetail['slots'][number];
  } | null>(null);
  const [draft, setDraft] = useState({ subjectId: '', teacherId: '', roomId: '' });
  const [saving, setSaving] = useState(false);

  const addMinutesToTime = (timeStr: string, minsToAdd: number): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return "00:00";
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setMinutes(date.getMinutes() + minsToAdd);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const recalculateTimetableTimes = useCallback((
    currentPeriods: ExtendedPeriod[],
    start: string,
    duration: number
  ): ExtendedPeriod[] => {
    let currentStart = start;
    let computedPeriodIndex = 1;

    return currentPeriods.map((p) => {
      if (p.isBreak) {
        const breakMins = (() => {
          const [sH, sM] = p.startTime.split(':').map(Number);
          const [eH, eM] = p.endTime.split(':').map(Number);
          const diff = (eH * 60 + eM) - (sH * 60 + sM);
          return isNaN(diff) || diff <= 0 ? 45 : diff;
        })();

        const breakEnd = addMinutesToTime(currentStart, breakMins);
        const updatedBreak = {
          ...p,
          startTime: currentStart,
          endTime: breakEnd,
        };
        currentStart = breakEnd;
        return updatedBreak;
      }

      const end = addMinutesToTime(currentStart, duration);
      const updatedPeriod = {
        ...p,
        periodNumber: computedPeriodIndex,
        label: `Period ${computedPeriodIndex}`,
        startTime: currentStart,
        endTime: end,
      };

      computedPeriodIndex += 1;
      currentStart = end;
      return updatedPeriod;
    });
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [d, w] = await Promise.all([
        getTimetableDetail(timetableId),
        getTimetableWorkload(timetableId),
      ]);

      const data = d as ExtendedTimetableDetail;
      const initialPeriods = data.periods && data.periods.length > 0 ? data.periods : [];

      if (data.baseStartTime) setBaseStartTime(data.baseStartTime);
      if (data.periodDuration) setPeriodDuration(data.periodDuration);
      if (data.workingDays) setWorkingDays(data.workingDays);

      setDetail({
        ...data,
        periods: recalculateTimetableTimes(initialPeriods, data.baseStartTime || "08:00", data.periodDuration || 45)
      });
      setWorkload(w);
      setSelectedId((prev) => prev || data.classes[0]?.id || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [timetableId, recalculateTimetableTimes]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detail || detail.periods.length === 0) return;

    const updatedPeriods = recalculateTimetableTimes(detail.periods, baseStartTime, periodDuration);
    const isGlobalSettingsChange = detail.periods.some((p, i) => {
      const target = updatedPeriods[i];
      return target && (p.startTime !== target.startTime || p.endTime !== target.endTime);
    });

    if (isGlobalSettingsChange && detail.periods.length === updatedPeriods.length) {
      const hasUnsavedRows = detail.periods.some(p => p.id.startsWith('row-'));
      if (!hasUnsavedRows) {
        setDetail(prev => prev ? { ...prev, periods: updatedPeriods } : null);
      }
    }
  }, [baseStartTime, periodDuration, recalculateTimetableTimes]);

  const subjectColorMap = useMemo(() => {
    const m = new Map<string, string>();
    detail?.subjects.forEach((s) => m.set(s.id, s.color));
    return m;
  }, [detail?.subjects]);

  // Helper calculation function to check if all available standard slots are filled for a target entity
  const fullyFilledEntities = useMemo(() => {
    const filledMap = new Set<string>();
    if (!detail || detail.periods.length === 0) return filledMap;

    const activePeriods = detail.periods.filter(p => !p.isBreak);
    const totalExpectedSlotsCount = activePeriods.length * workingDays.length;
    if (totalExpectedSlotsCount === 0) return filledMap;

    if (view === 'section') {
      detail.classes.forEach(c => {
        const slotsForClass = detail.slots.filter(s => s.classId === c.id);
        const filledValidSlots = slotsForClass.filter(s => activePeriods.some(p => p.id === s.periodId));
        if (filledValidSlots.length >= totalExpectedSlotsCount) {
          filledMap.add(c.id);
        }
      });
    } else if (view === 'room') {
      const roomsList = (detail.rooms && detail.rooms.length > 0)
        ? detail.rooms.map(r => ({ id: r.id, name: r.roomNumber }))
        : detail.classes.map(c => ({ id: c.id, name: c.roomNumber || c.name }));
      roomsList.forEach(r => {
        const slotsForRoom = detail.slots.filter(s => s.roomId === r.id || s.classId === r.id);
        const filledValidSlots = slotsForRoom.filter(s => activePeriods.some(p => p.id === s.periodId));
        if (filledValidSlots.length >= totalExpectedSlotsCount) {
          filledMap.add(r.id);
        }
      });
    } else if (view === 'faculty') {
      detail.teachers.forEach(t => {
        const slotsForTeacher = detail.slots.filter(s => s.teacherId === t.id);
        const filledValidSlots = slotsForTeacher.filter(s => activePeriods.some(p => p.id === s.periodId));
        if (filledValidSlots.length >= totalExpectedSlotsCount) {
          filledMap.add(t.id);
        }
      });
    }
    return filledMap;
  }, [detail, workingDays, view]);

  const sidebarItems = useMemo(() => {
    if (!detail) return [];
    const q = search.trim().toLowerCase();
    if (view === 'section') {
      return q ? detail.classes.filter((c) => c.name.toLowerCase().includes(q)) : detail.classes;
    }
    if (view === 'faculty') {
      return q ? detail.teachers.filter((t) => t.name.toLowerCase().includes(q)) : detail.teachers;
    }
    if (view === 'room') {
      const roomsList = (detail.rooms && detail.rooms.length > 0)
        ? detail.rooms.map((r) => ({ id: r.id, name: r.name || `Room ${r.roomNumber}` }))
        : detail.classes.map((c) => ({ id: c.id, name: c.roomNumber ? `Room ${c.roomNumber}` : c.name }));
      return q ? roomsList.filter((r) => r.name.toLowerCase().includes(q)) : roomsList;
    }
    return [];
  }, [detail, view, search]);

  useEffect(() => {
    if (sidebarItems.length > 0) {
      if (!sidebarItems.some((item) => item.id === selectedId)) {
        setSelectedId(sidebarItems[0].id);
      }
    }
  }, [view, sidebarItems, selectedId]);

  const filteredSlots = useMemo(() => {
    if (!detail) return [];
    if (view === 'room') {
      return detail.slots.filter((s) => s.roomId === selectedId || s.classId === selectedId);
    }
    if (view === 'faculty') {
      return detail.slots.filter((s) => s.teacherId === selectedId);
    }
    return detail.slots.filter((s) => s.classId === selectedId);
  }, [detail, view, selectedId]);

  const classCurrentlyEditing = useMemo(() => {
    if (!detail) return null;
    if (view === 'faculty') {
      const activeSlot = detail.slots.find((s) => s.teacherId === selectedId);
      if (activeSlot) return activeSlot.className;
    }
    if (view === 'room') {
      const roomObj = detail.rooms?.find((r) => r.id === selectedId);
      if (roomObj) return `Room ${roomObj.roomNumber}`;
      const currentClass = detail.classes.find((c) => c.id === selectedId);
      return currentClass ? `Room ${currentClass.roomNumber || currentClass.name}` : null;
    }
    const currentClass = detail.classes.find((c) => c.id === selectedId);
    return currentClass ? currentClass.name : (detail.targetClassName || null);
  }, [detail, view, selectedId]);

  const isCurrentSelectionFullyFilled = useMemo(() => {
    return fullyFilledEntities.has(selectedId);
  }, [fullyFilledEntities, selectedId]);

  const availableTeachersForCell = useMemo(() => {
    if (!detail || !editCell) return [];
    const busyTeacherIds = new Set(
      detail.slots
        .filter((slot) =>
          slot.dayOfWeek === editCell.dayOfWeek &&
          slot.periodId === editCell.periodId &&
          slot.classId !== editCell.classId
        )
        .map((slot) => slot.teacherId)
    );
    return detail.teachers.filter((teacher) => !busyTeacherIds.has(teacher.id) && isTeacherActive(teacher.active));
  }, [detail, editCell]);

  const availableRoomsForCell = useMemo(() => {
    if (!detail || !editCell) return detail?.rooms || [];
    const busyRoomIds = new Set(
      detail.slots
        .filter((slot) =>
          slot.dayOfWeek === editCell.dayOfWeek &&
          slot.periodId === editCell.periodId &&
          slot.classId !== editCell.classId &&
          slot.roomId
        )
        .map((slot) => slot.roomId!)
    );
    return (detail.rooms || []).filter((room) => !busyRoomIds.has(room.id));
  }, [detail, editCell]);

  const openEditor = (dayOfWeek: number, periodId: string, slot?: TimetableDetail['slots'][number]) => {
    let classId = selectedId;
    if (view === 'faculty' && slot) {
      classId = slot.classId;
    } else if (view === 'room') {
      classId = slot ? slot.classId : (detail?.classes[0]?.id || selectedId);
    }
    const defaultRoomId = view === 'room' && !slot ? selectedId : (slot?.roomId ?? '');

    setEditCell({ dayOfWeek, periodId, classId, slot });
    setDraft({
      subjectId: slot?.subjectId ?? '',
      teacherId: slot?.teacherId ?? '',
      roomId: defaultRoomId,
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!editCell || !draft.subjectId || !draft.teacherId) return;
    setSaving(true);
    try {
      await upsertTimetableSlot(timetableId, {
        dayOfWeek: editCell.dayOfWeek,
        periodId: editCell.periodId,
        classId: editCell.classId,
        subjectId: draft.subjectId,
        teacherId: draft.teacherId,
        roomId: draft.roomId || undefined,
      });
      setSheetOpen(false);
      await load();
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!editCell?.slot) return;
    setSaving(true);
    try {
      await deleteTimetableSlot(timetableId, editCell.slot.id);
      setSheetOpen(false);
      await load();
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const persistGridSettings = async (
    updatedPeriods: ExtendedPeriod[],
    updatedWorkingDays = workingDays,
    updatedStartTime = baseStartTime,
    updatedDuration = periodDuration
  ) => {
    if (!detail) return;
    try {
      await fetch(`/api/admin/timetables/${timetableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: detail.name,
          status: detail.status,
          baseStartTime: updatedStartTime,
          periodDuration: updatedDuration,
          workingDays: updatedWorkingDays,
          periods: updatedPeriods.map(p => ({
            id: p.id,
            periodNumber: p.periodNumber,
            startTime: p.startTime,
            endTime: p.endTime,
            isBreak: !!p.isBreak,
            label: p.isBreak ? (p.breakLabel || p.label || 'BREAK') : `Period ${p.periodNumber}`
          }))
        }),
      });
    } catch (e) {
      console.error("Failed persisting configuration updates:", e);
    }
  };

  const handleAddRow = async (isBreak: boolean) => {
    if (!detail) return;
    const tempId = `row-${crypto.randomUUID()}`;
    const newRow: ExtendedPeriod = {
      id: tempId,
      periodNumber: isBreak ? 0 : detail.periods.filter(p => !p.isBreak).length + 1,
      label: isBreak ? 'LUNCH BREAK' : '',
      startTime: "00:00",
      endTime: "00:00",
      isBreak,
      breakLabel: isBreak ? 'LUNCH BREAK' : undefined,
    };

    const combined = [...detail.periods, newRow];
    const updatedPeriods = recalculateTimetableTimes(combined, baseStartTime, periodDuration);

    setDetail({ ...detail, periods: updatedPeriods });
    await persistGridSettings(updatedPeriods);
    await load();
  };

  const handleRemoveRow = async (id: string) => {
    if (!detail) return;
    const remaining = detail.periods.filter((p) => p.id !== id);
    const updatedPeriods = recalculateTimetableTimes(remaining, baseStartTime, periodDuration);
    setDetail({ ...detail, periods: updatedPeriods });
    await persistGridSettings(updatedPeriods);
    await load();
  };

  const handleUpdateRowLabel = async (id: string, label: string) => {
    if (!detail) return;
    const updatedPeriods = detail.periods.map((p) => (p.id === id ? { ...p, breakLabel: label, label } : p));
    setDetail({ ...detail, periods: updatedPeriods });
    await persistGridSettings(updatedPeriods);
  };

  const handleUpdateRowTime = async (id: string, startTime: string, endTime: string) => {
    if (!detail) return;
    const updatedPeriods = detail.periods.map((p) => p.id === id ? { ...p, startTime, endTime } : p);
    setDetail({ ...detail, periods: updatedPeriods });
    await persistGridSettings(updatedPeriods);
  };

  const periodLabel = editCell ? detail?.periods.find((p) => p.id === editCell.periodId)?.label ?? '' : '';
  const missingData = useMemo(() => {
    if (!detail) return null;
    const missing = [];
    if (detail.subjects.length === 0) missing.push('Subjects');
    if (detail.teachers.length === 0) missing.push('Teachers');
    if (detail.classes.length === 0) missing.push('Classes');
    return missing.length > 0 ? missing : null;
  }, [detail]);

  if (loading || !detail) {
    return <div className='max-w-[1600px] mx-auto'><PageSkeleton /></div>;
  }

  return (
    <div className='max-w-[1600px] mx-auto space-y-4 px-2 sm:px-4 py-2 relative'>
      {missingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <GlassCard className="p-8 max-w-md text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-amber-500" />
            <h2 className="text-xl font-bold text-foreground">Required Data Missing</h2>
            <p className="text-sm text-muted-foreground">
              The following data is required to create a timetable:
            </p>
            <div className="pt-2 space-y-2">
              {missingData.includes('Subjects') && (
                <Link href="/admin/subjects"><Button className="w-full rounded-xl">Add Subjects</Button></Link>
              )}
              {missingData.includes('Teachers') && (
                <Link href="/admin/teachers"><Button className="w-full rounded-xl">Add Teachers</Button></Link>
              )}
              {missingData.includes('Classes') && (
                <Link href="/admin/classes"><Button className="w-full rounded-xl">Add Classes</Button></Link>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Main Header Area */}
      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 shrink-0" asChild>
                <Link href="/admin/timetables"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-2xl font-bold tracking-tight truncate">{detail.name}</h1>
                  {classCurrentlyEditing && (
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs transition-colors shrink-0",
                      isCurrentSelectionFullyFilled ? "bg-emerald-600 shadow-emerald-500/20" : "bg-indigo-600 shadow-indigo-500/20"
                    )}>
                      {classCurrentlyEditing}
                      {isCurrentSelectionFullyFilled && <CheckCircle className="h-3 w-3 ml-0.5 inline" />}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-xl shrink-0 self-end sm:self-auto">
              <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setZoom(Math.max(60, zoom - 10))} disabled={zoom <= 60}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-[11px] font-bold w-10 text-center select-none">{zoom}%</span>
              <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setZoom(Math.min(140, zoom + 10))} disabled={zoom >= 140}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 border-border/60">
            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)} className="w-full sm:w-auto">
              <TabsList className="rounded-xl p-1 bg-muted/80 w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
                <TabsTrigger value="section" className="rounded-lg text-xs font-semibold">Class</TabsTrigger>
                <TabsTrigger value="faculty" className="rounded-lg text-xs font-semibold">Faculty</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="w-full sm:w-auto flex items-center gap-2">
              <Input
                placeholder={`Search ${view === 'section' ? 'class' : 'faculty'}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='rounded-xl text-xs bg-muted/40 focus-visible:ring-indigo-500/30 h-9 flex-1 sm:w-48'
              />
              <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs font-semibold hidden sm:inline-flex"><Filter className="h-3.5 w-3.5 mr-1.5" />Filter</Button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Dynamic Class Selection List */}
      <div className="flex flex-col gap-4">
        <GlassCard className="p-3 w-full">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            <span>Select Active {view === 'section' ? 'Class' : 'Faculty'}</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none snap-x touch-pan-x">
            {sidebarItems.map((item) => {
              const isActive = selectedId === item.id;
              const isFilled = fullyFilledEntities.has(item.id);
              return (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "px-4 py-2 text-xs font-bold rounded-xl border transition-all shrink-0 uppercase tracking-wider text-center snap-center min-w-[95px] min-h-[40px] flex items-center justify-center gap-1",
                    isActive
                      ? isFilled
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20 font-extrabold scale-102"
                        : "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 font-extrabold scale-102"
                      : isFilled
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20"
                      : "bg-muted/40 border-muted text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.name}
                  {isFilled && <CheckCircle className="h-3 w-3 shrink-0" />}
                </button>
              );
            })}
            {sidebarItems.length === 0 && (
              <span className="text-xs text-muted-foreground p-1">No items found</span>
            )}
          </div>
        </GlassCard>

        {/* Dynamic Fluid Scale Timetable Engine Container */}
        <div className="w-full min-w-0">
          <GlassCard className="p-2 sm:p-4 overflow-hidden relative border-muted/70 shadow-sm">
            <div className="w-full overflow-x-auto overflow-y-hidden touch-pan-x scrollbar-thin scrollbar-thumb-indigo-500/20">
              <div 
                className="transition-all duration-75 origin-top-left"
                style={{ 
                  width: `${zoom}%`,
                  minWidth: '100%', 
                }}
              >
                <div className="w-full [&_table]:w-full [&_td]:p-4 [&_th]:p-3 [&_tr]:min-h-[85px] [&_.subject-chip]:min-h-[55px] [&_.subject-chip]:py-2.5 [&_.subject-chip]:text-xs">
                  <TimetableGrid
                    periods={detail.periods}
                    slots={filteredSlots}
                    subjectColorMap={subjectColorMap}
                    workingDays={workingDays}
                    baseStartTime={baseStartTime}
                    periodDuration={periodDuration}
                    onWorkingDaysChange={async (days) => {
                      setWorkingDays(days);
                      await persistGridSettings(detail.periods, days, baseStartTime, periodDuration);
                    }}
                    onBaseStartTimeChange={async (time) => {
                      setBaseStartTime(time);
                      const recalculated = recalculateTimetableTimes(detail.periods, time, periodDuration);
                      setDetail({ ...detail, periods: recalculated });
                      await persistGridSettings(recalculated, workingDays, time, periodDuration);
                    }}
                    onPeriodDurationChange={async (dur) => {
                      setPeriodDuration(dur);
                      const recalculated = recalculateTimetableTimes(detail.periods, baseStartTime, dur);
                      setDetail({ ...detail, periods: recalculated });
                      await persistGridSettings(recalculated, workingDays, baseStartTime, dur);
                    }}
                    onAddRow={handleAddRow}
                    onRemoveRow={handleRemoveRow}
                    onUpdateRowLabel={handleUpdateRowLabel}
                    onUpdateRowTime={handleUpdateRowTime}
                    onCellClick={openEditor}
                    renderCell={(_day, _period, slot) => {
                      if (!slot) return null;
                      const color = subjectColorMap.get(slot.subjectId) ?? '#6366f1';
                      const roomText = slot.roomNumber ? ` (Rm ${slot.roomNumber})` : '';

                      let name = slot.subjectName;
                      let sublabel = `${slot.teacherName}${roomText}`;

                      if (view === 'faculty') {
                        name = slot.className;
                        sublabel = `${slot.subjectName}${roomText}`;
                      } else if (view === 'room') {
                        name = slot.subjectName;
                        sublabel = `${slot.className} — ${slot.teacherName}`;
                      }

                      return (
                        <SubjectChip
                          name={name}
                          color={color}
                          sublabel={sublabel}
                        />
                      );
                    }}
                  />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {workload && (
        <GlassCard className="p-4 sm:p-6">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-widest mb-3">Faculty Workload Matrix</h2>
          <WorkloadPanel teacherWorkload={workload.teacherWorkload} />
        </GlassCard>
      )}

      <SlotEditorSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        slot={editCell?.slot ?? null}
        dayOfWeek={editCell?.dayOfWeek ?? 1}
        periodLabel={periodLabel}
        subjects={detail.subjects}
        teachers={availableTeachersForCell}
        rooms={availableRoomsForCell}
        draft={draft}
        onDraftChange={(p) => setDraft((d) => ({ ...d, ...p }))}
        onSave={() => void handleSave()}
        onRemove={() => void handleRemove()}
        saving={saving}
      />
    </div>
  );
}