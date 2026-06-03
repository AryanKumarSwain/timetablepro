'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
import { ArrowLeft, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TimetableGrid,
  SlotEditorSheet,
  SubjectChip,
  WorkloadPanel,
} from '@/components/timetable-builder/timetable-grid';

type ViewMode = 'section' | 'faculty' | 'room';

type ExtendedPeriod = TimetableDetail['periods'][number] & { isBreak?: boolean; breakLabel?: string };

export default function TimetableEditPage() {
  useRequireAuth('admin');
  const params = useParams();
  const timetableId = String(params.id);

  const [detail, setDetail] = useState<(Omit<TimetableDetail, 'periods'> & { periods: ExtendedPeriod[] }) | null>(null);
  const [workload, setWorkload] = useState<WorkloadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('section');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // CORE TIMELINE PARAMETER INITIALIZERS
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [baseStartTime, setBaseStartTime] = useState<string>("08:00");
  const [periodDuration, setPeriodDuration] = useState<number>(45);

  const [editCell, setEditCell] = useState<{
    dayOfWeek: number;
    periodId: string;
    classId: string;
    slot?: TimetableDetail['slots'][number];
  } | null>(null);
  const [draft, setDraft] = useState({ subjectId: '', teacherId: '' });
  const [saving, setSaving] = useState(false);

  const addMinutesToTime = (timeStr: string, minsToAdd: number): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return "00:00";
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setMinutes(date.getMinutes() + minsToAdd);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  // PARSER TO RE-CALCULATE TIMELINE RANGES FLUIDLY
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
      
      setDetail({ ...d, periods: [] });
      setWorkload(w);
      setSelectedId((prev) => prev || d.classes[0]?.id || '');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [timetableId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detail || detail.periods.length === 0) return;
    setDetail(prev => {
      if (!prev) return null;
      return {
        ...prev,
        periods: recalculateTimetableTimes(prev.periods, baseStartTime, periodDuration)
      };
    });
  }, [baseStartTime, periodDuration, recalculateTimetableTimes]);

  const subjectColorMap = useMemo(() => {
    const m = new Map<string, string>();
    detail?.subjects.forEach((s) => m.set(s.id, s.color));
    return m;
  }, [detail?.subjects]);

  const sidebarItems = useMemo(() => {
    if (!detail) return [];
    
    const q = search.trim().toLowerCase();
    if (!q) return []; 
    
    if (view === 'section') return detail.classes.filter((c) => c.name.toLowerCase().includes(q));
    if (view === 'faculty') return detail.teachers.filter((t) => t.name.toLowerCase().includes(q));
    return detail.classes.filter((c) => `${c.name} ${c.roomNumber}`.toLowerCase().includes(q));
  }, [detail, view, search]);

  const filteredSlots = useMemo(() => {
    if (!detail) return [];
    if (view === 'section') return detail.slots.filter((s) => s.classId === selectedId);
    if (view === 'faculty') return detail.slots.filter((s) => s.teacherId === selectedId);
    return detail.slots.filter((s) => s.classId === selectedId);
  }, [detail, view, selectedId]);

  const openEditor = (dayOfWeek: number, periodId: string, slot?: TimetableDetail['slots'][number]) => {
    const classId = view === 'faculty' && slot ? slot.classId : selectedId;
    setEditCell({ dayOfWeek, periodId, classId, slot });
    setDraft({
      subjectId: slot?.subjectId ?? '',
      teacherId: slot?.teacherId ?? '',
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
      });
      setSheetOpen(false);
      await load();
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
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAddRow = (isBreak: boolean) => {
    if (!detail) return;

    const newRow: ExtendedPeriod = {
      id: `row-${crypto.randomUUID()}`,
      periodNumber: isBreak ? 0 : detail.periods.filter(p => !p.isBreak).length + 1,
      label: isBreak ? 'LUNCH BREAK' : '',
      startTime: "00:00",
      endTime: "00:00",
      isBreak,
      breakLabel: isBreak ? 'LUNCH BREAK' : undefined,
    };

    const combined = [...detail.periods, newRow];
    setDetail({
      ...detail,
      periods: recalculateTimetableTimes(combined, baseStartTime, periodDuration),
    });
  };

  const handleRemoveRow = (id: string) => {
    if (!detail) return;
    const remaining = detail.periods.filter((p) => p.id !== id);
    setDetail({
      ...detail,
      periods: recalculateTimetableTimes(remaining, baseStartTime, periodDuration),
      slots: detail.slots.filter((s) => s.periodId !== id),
    });
  };

  const handleUpdateRowLabel = (id: string, label: string) => {
    if (!detail) return;
    setDetail({
      ...detail,
      periods: detail.periods.map((p) => (p.id === id ? { ...p, breakLabel: label } : p)),
    });
  };

  const handleUpdateRowTime = (id: string, startTime: string, endTime: string) => {
    if (!detail) return;
    setDetail({
      ...detail,
      periods: detail.periods.map((p) => (p.id === id ? { ...p, startTime, endTime } : p)),
    });
  };

  const periodLabel = editCell
    ? detail?.periods.find((p) => p.id === editCell.periodId)?.label ?? ''
    : '';

  if (loading || !detail) {
    return <div className='max-w-[1600px] mx-auto'><PageSkeleton /></div>;
  }

  return (
    <div className='max-w-[1600px] mx-auto space-y-6 px-4 py-2'>
      <GlassCard className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl" asChild>
              <Link href="/admin/timetables"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{detail.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase",
                  detail.status === "PUBLISHED" ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"
                )}>
                  {detail.status}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
              <TabsList className="rounded-xl p-1 bg-muted/80">
                <TabsTrigger value="section" className="rounded-lg text-xs font-semibold">Section</TabsTrigger>
                <TabsTrigger value="faculty" className="rounded-lg text-xs font-semibold">Faculty</TabsTrigger>
                <TabsTrigger value="room" className="rounded-lg text-xs font-semibold">Room</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" className="rounded-xl text-xs font-semibold"><Filter className="h-4 w-4 mr-2" />Filter</Button>
          </div>
        </div>
      </GlassCard>

      <div className='grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-6 items-start'>
        <GlassCard className="p-4 max-h-[calc(100vh-140px)] overflow-hidden flex flex-col sticky top-6">
          <Input
            placeholder={`Search ${view}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='mb-3 rounded-xl text-sm bg-muted/30 focus-visible:ring-indigo-500/30 w-full'
          />
          
          <div className='overflow-y-auto max-h-[126px] space-y-1 flex-1 pr-1 scrollbar-thin scrollbar-thumb-indigo-500/20 hover:scrollbar-thumb-indigo-500/40 scrollbar-track-transparent flex flex-col justify-start'>
            {search.trim() === '' && (
              <div className="text-center py-6 text-xs text-muted-foreground/80 font-medium my-auto w-full">
                Type above to look up schedules...
              </div>
            )}
            
            {sidebarItems.length === 0 && search.trim() !== '' && (
              <div className="text-center py-6 text-xs text-muted-foreground font-medium my-auto w-full">
                No matches found
              </div>
            )}

            {sidebarItems.map((item) => (
              <button
                key={item.id}
                type='button'
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "w-full text-left flex items-center px-4 h-9 min-h-[36px] rounded-xl text-xs font-bold tracking-wide uppercase transition-all border",
                  selectedId === item.id 
                    ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 font-extrabold" 
                    : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <span className="truncate w-full block text-left">{item.name}</span>
              </button>
            ))}
          </div>
        </GlassCard>

        <div className="min-w-0 w-full">
          <GlassCard className="p-5">
            <TimetableGrid
              periods={detail.periods}
              slots={filteredSlots}
              subjectColorMap={subjectColorMap}
              workingDays={workingDays}
              baseStartTime={baseStartTime}
              periodDuration={periodDuration}
              onWorkingDaysChange={setWorkingDays}
              onBaseStartTimeChange={setBaseStartTime}
              onPeriodDurationChange={setPeriodDuration}
              onAddRow={handleAddRow}
              onRemoveRow={handleRemoveRow}
              onUpdateRowLabel={handleUpdateRowLabel}
              onUpdateRowTime={handleUpdateRowTime}
              onCellClick={openEditor}
              renderCell={(_day, _period, slot) => {
                if (!slot) return null;
                const color = subjectColorMap.get(slot.subjectId) ?? '#6366f1';
                return (
                  <SubjectChip
                    name={view === 'faculty' ? slot.className : slot.subjectName}
                    color={color}
                    sublabel={view === 'faculty' ? slot.subjectName : slot.teacherName}
                  />
                );
              }}
            />
          </GlassCard>
        </div>
      </div>

      {workload && (
        <GlassCard className="p-6">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-widest mb-4">Faculty Optimization Workload</h2>
          <WorkloadPanel teacherWorkload={workload.teacherWorkload} />
        </GlassCard>
      )}

      {/* ADJUSTED DRAWER INTERFACE WITH PADDING RE-ALIGNMENTS */}
      <SlotEditorSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        slot={editCell?.slot ?? null}
        dayOfWeek={editCell?.dayOfWeek ?? 1}
        periodLabel={periodLabel}
        subjects={detail.subjects}
        teachers={detail.teachers}
        draft={draft}
        onDraftChange={(p) => setDraft((d) => ({ ...d, ...p }))}
        onSave={() => void handleSave()}
        onRemove={() => void handleRemove()}
        saving={saving}
      />
    </div>
  );
}