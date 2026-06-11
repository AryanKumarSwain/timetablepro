'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
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
import { ArrowLeft, Filter, Lock } from 'lucide-react';
import { cn, isTeacherActive } from '@/lib/utils';
import {
  TimetableGrid,
  SlotEditorSheet,
  SubjectChip,
  WorkloadPanel,
} from '@/components/timetable-builder/timetable-grid';

// --- Types ---
type ViewMode = 'section' | 'faculty' | 'room';
type ExtendedPeriod = TimetableDetail['periods'][number] & { isBreak?: boolean; breakLabel?: string };
type ExtendedTimetableDetail = Omit<TimetableDetail, 'periods'> & {
  periods: ExtendedPeriod[];
  baseStartTime?: string;
  periodDuration?: number;
  workingDays?: number[];
  targetClassName?: string;
};

// --- Main Page Component ---
function TimetableEditContent() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isPublic =
    searchParams.get('view') === 'public' ||
    pathname?.startsWith('/public/share/timetables');

  // Skip auth for public share views
  useRequireAuth('admin', Boolean(isPublic));

  const timetableId = String(params.id);

  const [detail, setDetail] = useState<ExtendedTimetableDetail | null>(null);
  const [workload, setWorkload] = useState<WorkloadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('section');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [sheetOpen, setSheetOpen] = useState(false);

  // ... [Keep your existing state hooks: workingDays, baseStartTime, periodDuration, editCell, draft, saving] ...
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [baseStartTime, setBaseStartTime] = useState<string>("08:00");
  const [periodDuration, setPeriodDuration] = useState<number>(45);
  const [editCell, setEditCell] = useState<any>(null);
  const [draft, setDraft] = useState<{ subjectId: string; teacherId: string }>({ subjectId: '', teacherId: '' });
  const [saving, setSaving] = useState(false);

  // ... [Keep your existing helper functions: addMinutesToTime, recalculateTimetableTimes] ...
  const addMinutesToTime = (timeStr: string, minsToAdd: number): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setMinutes(date.getMinutes() + minsToAdd);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const recalculateTimetableTimes = useCallback((currentPeriods: ExtendedPeriod[], start: string, duration: number): ExtendedPeriod[] => {
    let currentStart = start;
    return currentPeriods.map((p, i) => {
        if (p.isBreak) return p;
        const end = addMinutesToTime(currentStart, duration);
        const updated = { ...p, periodNumber: i + 1, startTime: currentStart, endTime: end };
        currentStart = end;
        return updated;
    });
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [d, w] = await Promise.all([getTimetableDetail(timetableId), getTimetableWorkload(timetableId)]);
      setDetail(d as ExtendedTimetableDetail);
      setWorkload(w);
      setSelectedId((prev) => prev || d.classes[0]?.id || '');
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [timetableId]);

  useEffect(() => { void load(); }, [load]);

  // --- Handlers (Disabled if Public) ---
  const openEditor = (dayOfWeek: number, periodId: string, slot?: any) => {
    if (isPublic) return; // Block interaction
    // Initialize edit cell
    const cell = { dayOfWeek, periodId, classId: selectedId, slot };
    setEditCell(cell);
    // Initialize draft from existing slot or defaults to avoid undefined reads in SlotEditorSheet
    setDraft({
      subjectId: slot?.subjectId ?? '',
      teacherId: slot?.teacherId ?? '',
    });
    setSheetOpen(true);
  };

  const onDraftChange = (patch: Partial<{ subjectId: string; teacherId: string }>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = async () => {
    if (!editCell) return;
    setSaving(true);
    try {
      await upsertTimetableSlot(timetableId, {
        dayOfWeek: editCell.dayOfWeek,
        periodId: editCell.periodId,
        classId: editCell.classId,
        subjectId: draft.subjectId,
        teacherId: draft.teacherId,
      });
      await load();
      setSheetOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!editCell?.slot?.id) return;
    setSaving(true);
    try {
      await deleteTimetableSlot(timetableId, editCell.slot.id);
      await load();
      setSheetOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !detail) return <div className='max-w-[1600px] mx-auto'><PageSkeleton /></div>;

  return (
    <div className='max-w-[1600px] mx-auto space-y-6 px-4 py-2'>
      {/* Read-Only Banner */}
      {isPublic && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 p-4 rounded-xl flex items-center gap-3 font-semibold">
          <Lock className="h-5 w-5" />
          You are viewing this timetable in Read-Only Public Mode.
        </div>
      )}

      <GlassCard className="p-5">
         {/* ... Your Header JSX ... */}
      </GlassCard>

      <div className='grid grid-cols-1 xl:grid-cols-[290px_1fr] gap-6 items-start'>
        {/* Sidebar */}
        <GlassCard className="p-4 h-[600px] overflow-hidden flex flex-col">
            {/* ... Your Search and Filter UI ... */}
        </GlassCard>

        {/* Timetable Grid */}
        <div className="min-w-0 w-full">
          <GlassCard className="p-5 overflow-x-auto">
            <TimetableGrid
              periods={detail.periods}
              slots={detail.slots.filter(s => s.classId === selectedId)}
              onCellClick={isPublic ? undefined : openEditor} // Disable if public
              // ... pass other props
            />
          </GlassCard>
        </div>
      </div>
      
      {/* Only render sheet if NOT public */}
      {!isPublic && (
        <SlotEditorSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          slot={editCell?.slot ?? null}
          dayOfWeek={editCell?.dayOfWeek ?? 1}
          periodLabel={detail?.periods?.find((p) => p.id === editCell?.periodId)?.label ?? ''}
          subjects={detail?.subjects ?? []}
          teachers={detail?.teachers ?? []}
          draft={draft}
          onDraftChange={onDraftChange}
          onSave={handleSave}
          onRemove={handleRemove}
          saving={saving}
        />
      )}
    </div>
  );
}

// Wrap in Suspense to handle searchParams safely
export default function Page() {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <TimetableEditContent />
        </Suspense>
    );
}