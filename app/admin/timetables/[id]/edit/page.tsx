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

export default function TimetableEditPage() {
  useRequireAuth('admin');
  const params = useParams();
  const timetableId = String(params.id);

  const [detail, setDetail] = useState<TimetableDetail | null>(null);
  const [workload, setWorkload] = useState<WorkloadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('section');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editCell, setEditCell] = useState<{
    dayOfWeek: number;
    periodId: string;
    classId: string;
    slot?: TimetableDetail['slots'][number];
  } | null>(null);
  const [draft, setDraft] = useState({ subjectId: '', teacherId: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [d, w] = await Promise.all([
        getTimetableDetail(timetableId),
        getTimetableWorkload(timetableId),
      ]);
      setDetail(d);
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

  const subjectColorMap = useMemo(() => {
    const m = new Map<string, string>();
    detail?.subjects.forEach((s) => m.set(s.id, s.color));
    return m;
  }, [detail?.subjects]);

  const sidebarItems = useMemo(() => {
    if (!detail) return [];
    const q = search.toLowerCase();
    if (view === 'section') {
      return detail.classes.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (view === 'faculty') {
      return detail.teachers.filter((t) => t.name.toLowerCase().includes(q));
    }
    return detail.classes.filter((c) =>
      `${c.name} ${c.roomNumber}`.toLowerCase().includes(q)
    );
  }, [detail, view, search]);

  useEffect(() => {
    if (sidebarItems.length > 0 && !sidebarItems.find((i) => i.id === selectedId)) {
      setSelectedId(sidebarItems[0].id);
    }
  }, [sidebarItems, selectedId]);

  const filteredSlots = useMemo(() => {
    if (!detail) return [];
    if (view === 'section') {
      return detail.slots.filter((s) => s.classId === selectedId);
    }
    if (view === 'faculty') {
      return detail.slots.filter((s) => s.teacherId === selectedId);
    }
    return detail.slots.filter((s) => s.classId === selectedId);
  }, [detail, view, selectedId]);

  const openEditor = (
    dayOfWeek: number,
    periodId: string,
    slot?: TimetableDetail['slots'][number]
  ) => {
    const classId =
      view === 'faculty' && slot
        ? slot.classId
        : selectedId;
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

  const periodLabel = editCell
    ? detail?.periods.find((p) => p.id === editCell.periodId)?.label ?? ''
    : '';

  if (loading || !detail) {
    return (
      <div className='max-w-[1600px] mx-auto'>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className='max-w-[1600px] mx-auto'>
      <div className='flex flex-wrap items-center gap-4 mb-6'>
        <Button variant='ghost' size='icon' asChild>
          <Link href='/admin/timetables'>
            <ArrowLeft className='h-4 w-4' />
          </Link>
        </Button>
        <div className='flex-1 min-w-0'>
          <h1 className='text-2xl font-bold truncate'>{detail.name}</h1>
          <p className='text-sm text-muted-foreground capitalize'>{detail.status.toLowerCase()}</p>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value='section'>Section</TabsTrigger>
            <TabsTrigger value='faculty'>Faculty</TabsTrigger>
            <TabsTrigger value='room'>Room</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant='outline' size='sm'>
          <Filter className='h-4 w-4 mr-1' />
          Filter
        </Button>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6'>
        <GlassCard className='p-4 h-fit max-h-[70vh] overflow-hidden flex flex-col'>
          <Input
            placeholder='Search…'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className='mb-3 shrink-0'
          />
          <div className='overflow-y-auto space-y-1 flex-1'>
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                type='button'
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                  selectedId === item.id
                    ? 'bg-indigo-500/15 text-indigo-600 font-medium'
                    : 'hover:bg-muted/50 text-muted-foreground'
                )}
              >
                {'name' in item ? item.name : (item as { name: string }).name}
                {view === 'room' && 'roomNumber' in item && (
                  <span className='block text-xs opacity-70'>
                    Room {(item as { roomNumber: string }).roomNumber}
                  </span>
                )}
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className='p-4'>
          <TimetableGrid
            periods={detail.periods}
            slots={filteredSlots}
            subjectColorMap={subjectColorMap}
            onCellClick={openEditor}
            renderCell={(_day, _period, slot) => {
              if (!slot) return null;
              const color = subjectColorMap.get(slot.subjectId) ?? '#6366f1';
              if (view === 'faculty') {
                return (
                  <SubjectChip
                    name={slot.className}
                    color={color}
                    sublabel={slot.subjectName}
                  />
                );
              }
              return (
                <SubjectChip
                  name={slot.subjectName}
                  color={color}
                  sublabel={slot.teacherName}
                />
              );
            }}
          />
        </GlassCard>
      </div>

      {workload && (
        <GlassCard className='p-6 mt-6'>
          <WorkloadPanel
            classWorkload={workload.classWorkload}
            teacherWorkload={workload.teacherWorkload}
          />
        </GlassCard>
      )}

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
