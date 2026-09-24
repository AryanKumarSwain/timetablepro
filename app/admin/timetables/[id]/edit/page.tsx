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
  getSchoolDetails,
  type TimetableDetail,
  type WorkloadData,
} from '@/lib/api-services';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Filter, AlertTriangle, Layers, CheckCircle, Sparkles, Lock, GraduationCap, BookOpen, Users, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn, isTeacherActive } from '@/lib/utils';
import {
  TimetableGrid,
  SlotEditorSheet,
  SubjectChip,
  WorkloadPanel,
} from '@/components/timetable-builder/timetable-grid';
import { AiGenerateModal } from '@/components/timetable-builder/ai-generate-modal';

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
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [schoolPlan, setSchoolPlan] = useState<any>(null);

  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [baseStartTime, setBaseStartTime] = useState<string>("08:00");
  const [periodDuration, setPeriodDuration] = useState<number>(45);

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

  const load = useCallback(async (showSkeleton = false) => {
    try {
      if (showSkeleton) setLoading(true);
      const [detailResult, workloadResult] = await Promise.allSettled([
        getTimetableDetail(timetableId),
        getTimetableWorkload(timetableId),
      ]);

      if (detailResult.status !== 'fulfilled') {
        throw detailResult.reason;
      }

      const data = detailResult.value as ExtendedTimetableDetail;
      const initialPeriods = data.periods && data.periods.length > 0 ? data.periods : [];

      if (data.baseStartTime) setBaseStartTime(data.baseStartTime);
      if (data.periodDuration) setPeriodDuration(data.periodDuration);
      if (data.workingDays) setWorkingDays(data.workingDays);

      setDetail({
        ...data,
        periods: recalculateTimetableTimes(initialPeriods, data.baseStartTime || "08:00", data.periodDuration || 45)
      });

      if (workloadResult.status === 'fulfilled') {
        setWorkload(workloadResult.value);
      }
      setSelectedId((prev) => prev || data.classes[0]?.id || '');

      // Load school plan to check AI timetable feature gate
      try {
        const schoolData = await getSchoolDetails();
        setSchoolPlan(schoolData?.plan || null);
      } catch (err) {
        console.error('Failed to load plan details:', err);
      }
    } catch (e) {
      console.error('Failed to load timetable:', e);
      toast.error('Failed to load timetable details. Please refresh or check connection.');
    } finally {
      if (showSkeleton) setLoading(false);
    }
  }, [timetableId, recalculateTimetableTimes]);

  useEffect(() => {
    void load(true);
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

  const [facultyFilter, setFacultyFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');

  useEffect(() => {
    setFacultyFilter('all');
    setClassFilter('all');
  }, [selectedId, view]);

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

  // Teachers associated with the currently selected class
  const teachersInSelectedClass = useMemo(() => {
    if (!detail || view !== 'section') return [];
    const teacherIdsInSlots = new Set(
      detail.slots.filter((s) => s.classId === selectedId).map((s) => s.teacherId)
    );
    return detail.teachers.filter((t) => {
      const tClasses = Array.isArray(t.classes) ? t.classes : [];
      return tClasses.includes(selectedId) || teacherIdsInSlots.has(t.id);
    });
  }, [detail, view, selectedId]);

  // Classes associated with the currently selected teacher
  const classesForSelectedTeacher = useMemo(() => {
    if (!detail || view !== 'faculty') return [];
    const teacher = detail.teachers.find((t) => t.id === selectedId);
    const assignedClassIds = new Set<string>(
      Array.isArray(teacher?.classes) ? teacher.classes : []
    );
    detail.slots
      .filter((s) => s.teacherId === selectedId)
      .forEach((s) => assignedClassIds.add(s.classId));

    return detail.classes.filter((c) => assignedClassIds.has(c.id));
  }, [detail, view, selectedId]);

  const filteredSlots = useMemo(() => {
    if (!detail) return [];
    if (view === 'room') {
      return detail.slots.filter((s) => s.roomId === selectedId || s.classId === selectedId);
    }
    if (view === 'faculty') {
      let slots = detail.slots.filter((s) => s.teacherId === selectedId);
      if (classFilter !== 'all') {
        slots = slots.filter((s) => s.classId === classFilter);
      }
      return slots;
    }
    // view === 'section' (Class View)
    let slots = detail.slots.filter((s) => s.classId === selectedId);
    if (facultyFilter !== 'all') {
      slots = slots.filter((s) => s.teacherId === facultyFilter);
    }
    return slots;
  }, [detail, view, selectedId, classFilter, facultyFilter]);

  const classCurrentlyEditing = useMemo(() => {
    if (!detail) return null;
    if (view === 'faculty') {
      const activeTeacher = detail.teachers.find((t) => t.id === selectedId);
      return activeTeacher ? activeTeacher.name : 'Faculty Schedule';
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

  const activeCellClassName = useMemo(() => {
    if (!detail) return undefined;
    const targetClassId = editCell?.classId || (view === 'section' ? selectedId : undefined);
    if (targetClassId) {
      const found = detail.classes.find((c) => c.id === targetClassId);
      if (found) return found.name;
    }
    return classCurrentlyEditing || undefined;
  }, [detail, editCell, view, selectedId, classCurrentlyEditing]);

  const openEditor = (dayOfWeek: number, periodId: string, slot?: TimetableDetail['slots'][number]) => {
    let classId = selectedId;
    if (view === 'faculty') {
      if (slot) {
        classId = slot.classId;
      } else if (classFilter !== 'all') {
        classId = classFilter;
      } else {
        const teacher = detail?.teachers.find((t) => t.id === selectedId);
        const teacherClasses = Array.isArray(teacher?.classes) ? teacher.classes : [];
        classId = teacherClasses[0] || (detail?.classes[0]?.id || selectedId);
      }
    } else if (view === 'room') {
      classId = slot ? slot.classId : (detail?.classes[0]?.id || selectedId);
    }
    const defaultRoomId = view === 'room' && !slot ? selectedId : (slot?.roomId ?? '');

    setEditCell({ dayOfWeek, periodId, classId, slot });
    setDraft({
      subjectId: slot?.subjectId ?? '',
      teacherId: view === 'faculty' && !slot ? selectedId : (slot?.teacherId ?? ''),
      roomId: defaultRoomId,
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!editCell || !draft.subjectId || !draft.teacherId) {
      toast.error('Please select both a subject and a faculty member');
      return;
    }
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
      await load(false);
      toast.success('Slot assignment saved successfully');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to save slot assignment');
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
      await load(false);
      toast.success('Slot assignment removed');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to remove slot assignment');
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
    await load(false);
  };

  const handleRemoveRow = async (id: string) => {
    if (!detail) return;
    const remaining = detail.periods.filter((p) => p.id !== id);
    const updatedPeriods = recalculateTimetableTimes(remaining, baseStartTime, periodDuration);
    setDetail({ ...detail, periods: updatedPeriods });
    await persistGridSettings(updatedPeriods);
    await load(false);
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
    const missing: Array<{ key: string; label: string; href: string; icon: any; step: number }> = [];
    if (detail.classes.length === 0) {
      missing.push({ key: 'Classes', label: 'Add Classes', href: '/admin/classes', icon: GraduationCap, step: 1 });
    }
    if (detail.subjects.length === 0) {
      missing.push({ key: 'Subjects', label: 'Add Subjects', href: '/admin/subjects', icon: BookOpen, step: 2 });
    }
    if (detail.teachers.length === 0) {
      missing.push({ key: 'Teachers', label: 'Add Teachers', href: '/admin/teachers', icon: Users, step: 3 });
    }
    return missing.length > 0 ? missing : null;
  }, [detail]);

  if (loading || !detail) {
    return <div className='max-w-[1600px] mx-auto'><PageSkeleton /></div>;
  }

  return (
    <div className='max-w-[1600px] mx-auto space-y-4 px-2 sm:px-4 py-2 relative'>
      {missingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <GlassCard className="p-6 sm:p-8 max-w-md w-full text-center space-y-5 rounded-3xl border border-border/80 shadow-2xl bg-card/95">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-sm">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold tracking-tight text-foreground">Required Data Missing</h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Before generating or editing a timetable, you must configure the following academic setup:
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-1 w-full text-left">
              {missingData.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.key} href={item.href} className="block w-full group">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-150">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Step {item.step}</p>
                          <p className="text-sm font-bold text-foreground">{item.label}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border/60">
              <Link href="/admin/timetables" className="block w-full">
                <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground h-9 rounded-xl">
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back to Timetables
                </Button>
              </Link>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Main Header Area */}
      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 sm:h-9 sm:w-9 shrink-0" asChild>
                <Link href="/admin/timetables"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h1 className="text-base sm:text-2xl font-bold tracking-tight truncate">{detail.name}</h1>
                  {classCurrentlyEditing && (
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white shadow-xs shrink-0",
                      isCurrentSelectionFullyFilled ? "bg-emerald-600 shadow-emerald-500/20" : "bg-indigo-600 shadow-indigo-500/20"
                    )}>
                      {classCurrentlyEditing}
                      {isCurrentSelectionFullyFilled && <CheckCircle className="h-3 w-3 ml-0.5 inline" />}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(() => {
                const planName = String(schoolPlan?.name || '').toLowerCase();
                const isPremiumOrElite = planName.includes('elite') || planName.includes('premium');
                const isAiLocked = Boolean(schoolPlan && schoolPlan.aiTimetableEnabled === false && !isPremiumOrElite);

                return (
                  <Button
                    onClick={() => {
                      if (isAiLocked) {
                        toast.error(`"Generate with AI" is not included in your ${schoolPlan?.name || 'current'} plan. Please upgrade to unlock this feature.`);
                        return;
                      }
                      setAiModalOpen(true);
                    }}
                    className="rounded-xl h-9 text-xs font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 text-white gap-1.5 shadow-md shadow-purple-500/20 px-3.5 transition-all active:scale-95 cursor-pointer"
                  >
                    {isAiLocked ? (
                      <Lock className="h-3.5 w-3.5 text-white/80" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                    )}
                    Generate with AI
                  </Button>
                );
              })()}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 border-border/60">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span>Academic Classes</span>
            </div>
            <div className="w-full sm:w-auto flex items-center gap-2">
              <Input
                placeholder="Search class or section..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='rounded-xl text-xs bg-muted/40 focus-visible:ring-indigo-500/30 h-9 flex-1 sm:w-56'
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Dynamic Class Selection List */}
      <div className="flex flex-col gap-4">
        <GlassCard className="p-3 w-full overflow-hidden">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            <span>Select Active Class</span>
          </div>
          <div className="w-full overflow-x-auto pb-2 scrollbar-thin snap-x touch-pan-x">
            <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 min-w-max">
              {sidebarItems.map((item) => {
                const isActive = selectedId === item.id;
                const isFilled = fullyFilledEntities.has(item.id);
                return (
                  <button
                    key={item.id}
                    type='button'
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl border transition-all shrink-0 uppercase tracking-wider text-center snap-center min-w-[85px] sm:min-w-[95px] min-h-[34px] sm:min-h-[40px] flex items-center justify-center gap-1 whitespace-nowrap",
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
          </div>

          {/* FACULTY FILTER WHEN IN CLASS VIEW */}
          {view === 'section' && teachersInSelectedClass.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />
                  Filter by Faculty:
                </span>
                <button
                  type="button"
                  onClick={() => setFacultyFilter('all')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all",
                    facultyFilter === 'all'
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                  )}
                >
                  All Faculty ({teachersInSelectedClass.length})
                </button>
                {teachersInSelectedClass.map((t) => {
                  const isActive = facultyFilter === t.id;
                  const slotCount = detail.slots.filter(
                    (s) => s.classId === selectedId && s.teacherId === t.id
                  ).length;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFacultyFilter(isActive ? 'all' : t.id)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5",
                        isActive
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-semibold"
                          : "bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
                      )}
                    >
                      <span>{t.name}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                        isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {slotCount}
                      </span>
                    </button>
                  );
                })}
              </div>
              {facultyFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFacultyFilter('all')}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Clear filter
                </button>
              )}
            </div>
          )}

          {/* CLASS FILTER WHEN IN FACULTY VIEW */}
          {view === 'faculty' && classesForSelectedTeacher.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-indigo-500" />
                  Filter by Class:
                </span>
                <button
                  type="button"
                  onClick={() => setClassFilter('all')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all",
                    classFilter === 'all'
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-muted/40 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                  )}
                >
                  All Classes ({classesForSelectedTeacher.length})
                </button>
                {classesForSelectedTeacher.map((c) => {
                  const isActive = classFilter === c.id;
                  const slotCount = detail.slots.filter(
                    (s) => s.teacherId === selectedId && s.classId === c.id
                  ).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClassFilter(isActive ? 'all' : c.id)}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                          : "bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground"
                      )}
                    >
                      <span>{c.name}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                        isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {slotCount}
                      </span>
                    </button>
                  );
                })}
              </div>
              {classFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setClassFilter('all')}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Clear filter
                </button>
              )}
            </div>
          )}
        </GlassCard>

        {/* Dynamic Fluid Scale Timetable Engine Container */}
        <div className="w-full min-w-0">
          <GlassCard className="p-2 sm:p-4 overflow-hidden relative border-muted/70 shadow-sm">
            <div className="w-full overflow-x-auto overflow-y-hidden touch-pan-x scrollbar-thin scrollbar-thumb-indigo-500/20">
              <div className="w-full min-w-full [&_table]:w-full [&_td]:p-4 [&_th]:p-3 [&_tr]:min-h-[85px] [&_.subject-chip]:min-h-[55px] [&_.subject-chip]:py-2.5 [&_.subject-chip]:text-xs">
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
            </GlassCard>
          </div>
        </div>

      {workload && (
        <GlassCard className="p-4 sm:p-6">
          <WorkloadPanel
            teacherWorkload={workload.teacherWorkload}
            classWorkload={workload.classWorkload}
            totalWeeklySlots={workload.totalWeeklySlots}
            activePeriodsCount={workload.activePeriodsCount}
            workingDaysCount={workload.workingDaysCount}
            onSelectClass={(classId) => {
              setView('section');
              setSelectedId(classId);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectTeacher={(teacherId) => {
              setView('faculty');
              setSelectedId(teacherId);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </GlassCard>
      )}

      <SlotEditorSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        slot={editCell?.slot ?? null}
        dayOfWeek={editCell?.dayOfWeek ?? 1}
        periodId={editCell?.periodId}
        periodLabel={periodLabel}
        currentClassId={editCell?.classId || selectedId}
        currentClassName={activeCellClassName}
        subjects={detail.subjects}
        teachers={detail.teachers}
        rooms={detail.rooms}
        allSlots={detail.slots}
        draft={draft}
        onDraftChange={(p) => setDraft((d) => ({ ...d, ...p }))}
        onSave={() => void handleSave()}
        onRemove={() => void handleRemove()}
        saving={saving}
      />

      <AiGenerateModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        timetableId={timetableId}
        teachers={detail.teachers}
        subjects={detail.subjects}
        classes={detail.classes}
        currentClassId={view === 'section' ? selectedId : (classFilter !== 'all' ? classFilter : detail?.classes[0]?.id)}
        onSuccess={async () => {
          await load(false);
        }}
      />
    </div>
  );
}