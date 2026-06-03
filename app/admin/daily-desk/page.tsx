'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getDailyDeskGrid,
  getTeachers,
  markAttendance,
  getReplacements,
  createReplacement,
  updateReplacementStatus,
  type DailyDeskGrid,
} from '@/lib/api-services';
import type { Teacher, Replacement } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { AlertTriangle, UserPlus, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DailyDeskPage() {
  useRequireAuth('admin');
  const router = useRouter();

  const [gridData, setGridData] = useState<DailyDeskGrid | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReplacementForm, setShowReplacementForm] = useState(false);
  const [submittingReplacement, setSubmittingReplacement] = useState(false);
  const [replacementForm, setReplacementForm] = useState({
    periodId: '',
    classId: '',
    originalTeacherId: '',
    replacementTeacherId: '',
    reason: 'Leave',
  });

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const loadData = useCallback(async () => {
    try {
      const [desk, teachersData, replacementData] = await Promise.all([
        getDailyDeskGrid(today),
        getTeachers(),
        getReplacements({ date: today }),
      ]);
      setGridData(desk);
      setTeachers(teachersData);
      setReplacements(replacementData);
    } catch (error) {
      console.error('Failed to load daily desk operational matrix data:', error);
    }
  }, [today]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadData();
      setLoading(false);
    }
    void init();
  }, [loadData]);

  const handleMarkAttendance = async (
    classId: string,
    periodId: string,
    teacherId: string,
    isAbsent: boolean
  ) => {
    try {
      await markAttendance(classId, periodId, teacherId, today, isAbsent);
      await loadData();
      router.refresh(); // Clear layout frames across mutli-tenant dashboards
    } catch (error) {
      console.error('Failed to update attendance status markers:', error);
    }
  };

  const handleAddReplacement = async () => {
    if (
      !replacementForm.periodId ||
      !replacementForm.classId ||
      !replacementForm.originalTeacherId ||
      !replacementForm.replacementTeacherId
    ) {
      window.alert('Please fill out all assignment routing values before dispatching.');
      return;
    }
    
    if (replacementForm.originalTeacherId === replacementForm.replacementTeacherId) {
      window.alert('Substitute teacher cannot match the designated absent teacher.');
      return;
    }

    try {
      setSubmittingReplacement(true);
      await createReplacement({
        classId: replacementForm.classId,
        date: today,
        periodId: replacementForm.periodId,
        originalTeacherId: replacementForm.originalTeacherId,
        replacementTeacherId: replacementForm.replacementTeacherId,
        subjectId: '',
        reason: replacementForm.reason as 'Leave' | 'Medical' | 'Other',
        status: 'pending',
      });
      setShowReplacementForm(false);
      setReplacementForm({
        periodId: '',
        classId: '',
        originalTeacherId: '',
        replacementTeacherId: '',
        reason: 'Leave',
      });
      await loadData();
      router.refresh();
    } catch (error) {
      console.error('Failed to register substitute tracking records:', error);
    } finally {
      setSubmittingReplacement(false);
    }
  };

  const handleConfirmReplacement = async (replacementId: string) => {
    try {
      await updateReplacementStatus(replacementId, 'confirmed');
      await loadData();
      router.refresh();
    } catch (error) {
      console.error('Failed verifying duty assignment confirmations:', error);
    }
  };

  const openCoverForm = (classId: string, periodId: string, teacherId: string) => {
    setReplacementForm({
      periodId,
      classId,
      originalTeacherId: teacherId,
      replacementTeacherId: '',
      reason: 'Leave',
    });
    setShowReplacementForm(true);
  };

  const getTeacherName = (id: string) =>
    teachers.find((t) => t.id === id)?.name || 'Unknown Faculty';

  if (loading || !gridData) {
    return (
      <div className='max-w-[1600px] mx-auto p-4'>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className='max-w-[1600px] mx-auto space-y-6 px-4 py-2'>
      <PageHeader
        title='Daily Desk'
        description={`${today} · Real-time attendance & substitution command center`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Daily Desk' },
        ]}
        actions={
          <div className='flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider shadow-sm'>
            <Radio className='h-3.5 w-3.5 animate-pulse text-emerald-500' />
            Live Sync
          </div>
        }
      />

      <div className='grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start'>
        
        {/* TIMETABLE VIEW CONTAINER */}
        <div className='min-w-0 w-full overflow-hidden'>
          <GlassCard className='p-5'>
            <div className="mb-4">
              <h2 className='text-base font-bold uppercase tracking-wide text-foreground'>Today&apos;s Operational Matrix</h2>
              <p className='text-xs text-muted-foreground mt-0.5'>
                Live operations layout matched directly with master timetable structure.
              </p>
            </div>

            {/* SCROLLABLE TABLE FRAMEWORK */}
            <div className='overflow-x-auto rounded-xl border border-border/60 bg-muted/20 scrollbar-thin scrollbar-thumb-accent'>
              <table className='w-full border-collapse text-left min-w-[800px]'>
                <thead>
                  <tr className='bg-muted/80 backdrop-blur border-b border-border/40'>
                    <th className='p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground w-[140px] sticky left-0 bg-muted z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-border/40'>
                      Class
                    </th>
                    {gridData.periods.map((p) => (
                      <th
                        key={p.id}
                        className='p-3 border-l border-border/40 text-center min-w-[180px] w-[200px]'
                      >
                        <div className='text-xs font-bold text-foreground uppercase tracking-wider'>
                          P{p.periodNumber}
                        </div>
                        <div className='text-[10px] text-muted-foreground font-medium mt-0.5'>
                          {p.startTime}–{p.endTime}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-border/40 bg-background/40'>
                  {gridData.classes.map((cls) => (
                    <tr key={cls.id} className='hover:bg-muted/10 transition-colors'>
                      
                      {/* FIXED LEFT CLASS ROW LABELS */}
                      <td className='p-4 font-bold text-sm text-foreground bg-background/90 sticky left-0 z-10 border-r border-border/40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]'>
                        {cls.name}
                      </td>

                      {/* PERIOD HORIZONTAL CELL MAPPERS */}
                      {gridData.periods.map((period) => {
                        const periodRow = gridData.grid.find((row) => row.periodId === period.id);
                        const cell = periodRow?.cells.find((c) => c.classId === cls.id);

                        if (!cell || cell.empty) {
                          return (
                            <td
                              key={`${cls.id}-${period.id}`}
                              className='p-3 border-l border-border/40 text-center text-muted-foreground/20 bg-background/5 vertical-middle min-h-[115px]'
                            >
                              <span className="text-xs font-semibold tracking-widest">—</span>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={`${cls.id}-${period.id}`}
                            className={cn(
                              'p-2 border-l border-border/40 h-full min-h-[115px] align-top transition-colors',
                              cell.isAbsent ? 'bg-rose-500/[0.04]' : 'bg-background/10'
                            )}
                          >
                            <Card
                              className={cn(
                                'p-3 rounded-lg h-full text-xs flex flex-col justify-between shadow-none transition-all border',
                                cell.isAbsent
                                  ? 'border-rose-500/40 bg-rose-500/5 ring-1 ring-rose-500/10'
                                  : 'border-border/60 bg-background hover:border-indigo-500/40'
                              )}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-1 mb-1">
                                  <p className='font-bold text-foreground truncate flex-1'>{cell.subjectName}</p>
                                  {cell.isAbsent && (
                                    <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse shrink-0 mt-1" />
                                  )}
                                </div>
                                <p className='text-muted-foreground font-medium truncate mb-2'>
                                  {cell.teacherName}
                                </p>
                              </div>

                              <div className='flex flex-col gap-1 mt-auto'>
                                {cell.isAbsent ? (
                                  <>
                                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mb-1">
                                      <AlertTriangle className='h-3 w-3 shrink-0 text-rose-500' />
                                      <span className="text-[9px] font-bold uppercase tracking-wide">Absent</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                      <Button
                                        size='sm'
                                        variant='outline'
                                        className='h-6 text-[10px] font-bold rounded border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 transition-colors px-1'
                                        onClick={() =>
                                          void handleMarkAttendance(cell.classId, period.id, cell.teacherId, false)
                                        }
                                      >
                                        Present
                                      </Button>
                                      <Button
                                        size='sm'
                                        variant='secondary'
                                        className='h-6 text-[10px] font-bold rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors px-1'
                                        onClick={() => openCoverForm(cell.classId, period.id, cell.teacherId)}
                                      >
                                        Cover
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    className='h-6 text-[10px] font-bold rounded border-rose-500/20 text-rose-600 hover:bg-rose-500/10 transition-colors w-full'
                                    onClick={() =>
                                      void handleMarkAttendance(cell.classId, period.id, cell.teacherId, true)
                                    }
                                  >
                                    Mark Absent
                                  </Button>
                                )}
                              </div>
                            </Card>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        {/* SIDE BAR: SUBSTITUTION CONTROL ENGINE */}
        <div className='w-full max-w-[360px] ml-auto'>
          <GlassCard className='p-5 sticky top-6 space-y-4'>
            <div className='flex items-center justify-between pb-2 border-b border-border/40'>
              <div>
                <h2 className='text-sm font-bold uppercase tracking-wider text-foreground'>Cover Assignments</h2>
                <p className='text-[11px] text-muted-foreground mt-0.5'>Substitution pipeline manager</p>
              </div>
              <Button
                size='sm'
                variant={showReplacementForm ? 'ghost' : 'default'}
                className='rounded-xl text-xs font-bold h-8 transition-all'
                onClick={() => setShowReplacementForm(!showReplacementForm)}
              >
                {showReplacementForm ? 'Cancel' : <><UserPlus className='h-3.5 w-3.5 mr-1' /> Assign</>}
              </Button>
            </div>

            {showReplacementForm && (
              <div className='space-y-3 p-4 bg-indigo-500/[0.03] rounded-xl border border-indigo-500/20 shadow-inner animate-in fade-in slide-in-from-top-3 duration-200'>
                <div>
                  <label className='block text-[11px] font-bold uppercase text-muted-foreground mb-1'>Period</label>
                  <select
                    value={replacementForm.periodId}
                    onChange={(e) => setReplacementForm({ ...replacementForm, periodId: e.target.value })}
                    className='w-full text-xs p-2 rounded-xl bg-background border border-border/60 focus:outline-none focus:border-indigo-500 transition-colors'
                  >
                    <option value=''>Select Period</option>
                    {gridData.periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        Period {p.periodNumber} ({p.startTime})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-[11px] font-bold uppercase text-muted-foreground mb-1'>Class Section</label>
                  <select
                    value={replacementForm.classId}
                    onChange={(e) => setReplacementForm({ ...replacementForm, classId: e.target.value })}
                    className='w-full text-xs p-2 rounded-xl bg-background border border-border/60 focus:outline-none focus:border-indigo-500 transition-colors'
                  >
                    <option value=''>Select Class</option>
                    {gridData.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-[11px] font-bold uppercase text-muted-foreground mb-1'>Absent Teacher</label>
                  <select
                    value={replacementForm.originalTeacherId}
                    onChange={(e) => setReplacementForm({ ...replacementForm, originalTeacherId: e.target.value })}
                    className='w-full text-xs p-2 rounded-xl bg-background border border-border/60 focus:outline-none focus:border-indigo-500 transition-colors'
                  >
                    <option value=''>Select Teacher</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-[11px] font-bold uppercase text-muted-foreground mb-1'>Substitute Cover Teacher</label>
                  <select
                    value={replacementForm.replacementTeacherId}
                    onChange={(e) => setReplacementForm({ ...replacementForm, replacementTeacherId: e.target.value })}
                    className='w-full text-xs p-2 rounded-xl bg-background border border-border/60 focus:outline-none focus:border-indigo-500 transition-colors'
                  >
                    <option value=''>Select Replacement</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-[11px] font-bold uppercase text-muted-foreground mb-1'>Absence Trigger Reason</label>
                  <select
                    value={replacementForm.reason}
                    onChange={(e) => setReplacementForm({ ...replacementForm, reason: e.target.value })}
                    className='w-full text-xs p-2 rounded-xl bg-background border border-border/60 focus:outline-none focus:border-indigo-500 transition-colors'
                  >
                    <option value='Leave'>Leave</option>
                    <option value='Medical'>Medical</option>
                    <option value='Other'>Other</option>
                  </select>
                </div>
                <Button 
                  className='w-full rounded-xl text-xs font-bold mt-2 bg-indigo-600 hover:bg-indigo-700 text-white' 
                  onClick={() => void handleAddReplacement()}
                  disabled={submittingReplacement}
                >
                  {submittingReplacement ? 'Dispatching...' : 'Confirm & Dispatch Duty'}
                </Button>
              </div>
            )}

            <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto pr-1 scrollbar-thin">
              {replacements.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border/60 rounded-xl bg-background/40">
                  <p className='text-xs font-medium text-muted-foreground'>
                    No active cover duties allocated today.
                  </p>
                </div>
              ) : (
                replacements.map((rep) => {
                  const period = gridData.periods.find((p) => p.id === rep.periodId);
                  return (
                    <Card
                      key={rep.id}
                      className='p-3 rounded-xl border-border/40 bg-background/50 flex flex-col justify-between shadow-none'
                    >
                      <div className='flex items-center justify-between mb-2'>
                        <p className='font-bold text-xs text-foreground uppercase tracking-wide bg-muted px-2 py-0.5 rounded'>
                          {period ? `Period ${period.periodNumber}` : 'Custom Slot'}
                        </p>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                            rep.status === 'confirmed'
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                          )}
                        >
                          {rep.status}
                        </span>
                      </div>
                      <div className='space-y-1 text-xs border-b border-border/30 pb-2.5 mb-2.5'>
                        <p className='text-muted-foreground truncate'>
                          <span className='font-bold text-foreground'>Absent:</span>{' '}
                          {getTeacherName(rep.originalTeacherId)}
                        </p>
                        <p className='text-muted-foreground truncate'>
                          <span className='font-bold text-foreground'>Cover:</span>{' '}
                          {getTeacherName(rep.replacementTeacherId)}
                        </p>
                      </div>
                      {rep.status === 'pending' && (
                        <Button
                          size='sm'
                          className='w-full h-8 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors'
                          onClick={() => void handleConfirmReplacement(rep.id)}
                        >
                          Approve Allocation
                        </Button>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}