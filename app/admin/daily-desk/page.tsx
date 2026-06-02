'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const [gridData, setGridData] = useState<DailyDeskGrid | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReplacementForm, setShowReplacementForm] = useState(false);
  const [replacementForm, setReplacementForm] = useState({
    periodId: '',
    classId: '',
    originalTeacherId: '',
    replacementTeacherId: '',
    reason: 'Leave',
  });

  const today = new Date().toISOString().split('T')[0];

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
      console.error('Failed to load daily desk:', error);
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
    } catch (error) {
      console.error('Failed to mark attendance:', error);
    }
  };

  const handleAddReplacement = async () => {
    if (
      !replacementForm.periodId ||
      !replacementForm.classId ||
      !replacementForm.originalTeacherId ||
      !replacementForm.replacementTeacherId
    ) {
      window.alert('Please fill all fields');
      return;
    }
    try {
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
    } catch (error) {
      console.error('Failed to create replacement:', error);
    }
  };

  const handleConfirmReplacement = async (replacementId: string) => {
    try {
      await updateReplacementStatus(replacementId, 'confirmed');
      await loadData();
    } catch (error) {
      console.error('Failed to confirm replacement:', error);
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
    teachers.find((t) => t.id === id)?.name || 'Unknown';

  const gridColumns = useMemo(() => {
    const classCount = gridData?.classes.length ?? 1;
    return `grid-cols-[minmax(11rem,13rem)_repeat(${classCount},minmax(8rem,1fr))]`;
  }, [gridData?.classes.length]);

  if (loading || !gridData) {
    return (
      <div className='max-w-7xl mx-auto'>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className='max-w-[1600px] mx-auto'>
      <PageHeader
        title='Daily Desk'
        description={`${today} · Real-time attendance & substitution command center`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Daily Desk' },
        ]}
        actions={
          <div className='flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium'>
            <Radio className='h-3.5 w-3.5 animate-pulse' />
            Live
          </div>
        }
      />

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <GlassCard className='p-6'>
            <h2 className='text-lg font-semibold mb-1'>Today&apos;s schedule</h2>
            <p className='text-xs text-muted-foreground mb-4'>
              All class sections · mark attendance per cell
            </p>

            <div className='overflow-x-auto rounded-2xl border border-border/60 bg-card/50'>
              <div className={cn('grid min-w-[800px]', gridColumns)}>
                <div className='sticky top-0 z-10 bg-card/90 backdrop-blur border-b p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  Period
                </div>
                {gridData.classes.map((cls) => (
                  <div
                    key={cls.id}
                    className='sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-l border-border/50 p-3 text-center text-xs font-semibold uppercase truncate'
                  >
                    {cls.name}
                  </div>
                ))}

                {gridData.grid.map((row) => (
                  <div key={row.periodId} className='contents'>
                    <div className='p-3 border-t border-r border-border/50 bg-muted/20'>
                      <p className='text-sm font-medium'>{row.label}</p>
                      <p className='text-xs text-muted-foreground'>
                        {row.startTime}–{row.endTime}
                      </p>
                    </div>
                    {row.cells.map((cell) => {
                      if (cell.empty) {
                        return (
                          <div
                            key={`${row.periodId}-${cell.classId}`}
                            className='p-2 border-t border-l border-border/50 min-h-[5rem] flex items-center justify-center text-muted-foreground/40'
                          >
                            —
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`${row.periodId}-${cell.classId}`}
                          className={cn(
                            'p-2 border-t border-l border-border/50 min-h-[5rem]',
                            cell.isAbsent && 'bg-rose-500/10'
                          )}
                        >
                          <Card
                            className={cn(
                              'p-2 rounded-lg h-full text-xs',
                              cell.isAbsent
                                ? 'border-rose-500/50 bg-rose-500/5'
                                : 'border-border/50 bg-card/80'
                            )}
                          >
                            <p className='font-medium truncate'>{cell.subjectName}</p>
                            <p className='text-muted-foreground truncate mb-2'>
                              {cell.teacherName}
                            </p>
                            {cell.isAbsent && (
                              <AlertTriangle className='h-3.5 w-3.5 text-rose-500 mb-1' />
                            )}
                            <div className='flex flex-col gap-1'>
                              <Button
                                size='sm'
                                variant='outline'
                                className={cn(
                                  'h-6 text-[10px] px-1',
                                  !cell.isAbsent &&
                                    'bg-green-500/20 border-green-500/30'
                                )}
                                onClick={() =>
                                  void handleMarkAttendance(
                                    cell.classId,
                                    row.periodId,
                                    cell.teacherId,
                                    false
                                  )
                                }
                              >
                                Present
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                className={cn(
                                  'h-6 text-[10px] px-1',
                                  cell.isAbsent &&
                                    'bg-red-500/20 border-red-500/30'
                                )}
                                onClick={() =>
                                  void handleMarkAttendance(
                                    cell.classId,
                                    row.periodId,
                                    cell.teacherId,
                                    true
                                  )
                                }
                              >
                                Absent
                              </Button>
                              {cell.isAbsent && (
                                <Button
                                  size='sm'
                                  variant='secondary'
                                  className='h-6 text-[10px] px-1'
                                  onClick={() =>
                                    openCoverForm(
                                      cell.classId,
                                      row.periodId,
                                      cell.teacherId
                                    )
                                  }
                                >
                                  Assign Cover
                                </Button>
                              )}
                            </div>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        <div className='lg:col-span-1'>
          <GlassCard className='p-6 sticky top-20'>
            <div className='flex items-center justify-between mb-4'>
              <div>
                <h2 className='text-lg font-semibold'>Cover assignments</h2>
                <p className='text-xs text-muted-foreground'>
                  Substitution pipeline
                </p>
              </div>
              <Button
                size='sm'
                className='rounded-xl'
                onClick={() => setShowReplacementForm(!showReplacementForm)}
              >
                <UserPlus className='h-4 w-4 mr-1' />
                {showReplacementForm ? 'Cancel' : 'Assign'}
              </Button>
            </div>

            {showReplacementForm && (
              <div className='space-y-3 mb-6 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20'>
                <div>
                  <label className='block text-sm mb-1'>Period</label>
                  <select
                    value={replacementForm.periodId}
                    onChange={(e) =>
                      setReplacementForm({
                        ...replacementForm,
                        periodId: e.target.value,
                      })
                    }
                    className='w-full text-sm p-2 rounded bg-input border border-border'
                  >
                    <option value=''>Select Period</option>
                    {gridData.periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        Period {p.periodNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm mb-1'>Class</label>
                  <select
                    value={replacementForm.classId}
                    onChange={(e) =>
                      setReplacementForm({
                        ...replacementForm,
                        classId: e.target.value,
                      })
                    }
                    className='w-full text-sm p-2 rounded bg-input border border-border'
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
                  <label className='block text-sm mb-1'>Absent Teacher</label>
                  <select
                    value={replacementForm.originalTeacherId}
                    onChange={(e) =>
                      setReplacementForm({
                        ...replacementForm,
                        originalTeacherId: e.target.value,
                      })
                    }
                    className='w-full text-sm p-2 rounded bg-input border border-border'
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
                  <label className='block text-sm mb-1'>Cover Teacher</label>
                  <select
                    value={replacementForm.replacementTeacherId}
                    onChange={(e) =>
                      setReplacementForm({
                        ...replacementForm,
                        replacementTeacherId: e.target.value,
                      })
                    }
                    className='w-full text-sm p-2 rounded bg-input border border-border'
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
                  <label className='block text-sm mb-1'>Reason</label>
                  <select
                    value={replacementForm.reason}
                    onChange={(e) =>
                      setReplacementForm({
                        ...replacementForm,
                        reason: e.target.value,
                      })
                    }
                    className='w-full text-sm p-2 rounded bg-input border border-border'
                  >
                    <option value='Leave'>Leave</option>
                    <option value='Medical'>Medical</option>
                    <option value='Other'>Other</option>
                  </select>
                </div>
                <Button className='w-full' onClick={() => void handleAddReplacement()}>
                  Save Assignment
                </Button>
              </div>
            )}

            {replacements.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                No cover duties assigned today.
              </p>
            ) : (
              <div className='space-y-3'>
                {replacements.map((rep) => {
                  const period = gridData.periods.find((p) => p.id === rep.periodId);
                  return (
                    <Card
                      key={rep.id}
                      className='p-3 rounded-xl border-border/50 bg-card/50'
                    >
                      <div className='flex items-center justify-between mb-2'>
                        <p className='font-medium text-sm'>
                          {period ? `Period ${period.periodNumber}` : rep.periodId}
                        </p>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-medium',
                            rep.status === 'confirmed'
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                          )}
                        >
                          {rep.status}
                        </span>
                      </div>
                      <div className='space-y-1 text-sm'>
                        <p className='text-muted-foreground'>
                          <span className='font-medium text-foreground'>Absent:</span>{' '}
                          {getTeacherName(rep.originalTeacherId)}
                        </p>
                        <p className='text-muted-foreground'>
                          <span className='font-medium text-foreground'>Cover:</span>{' '}
                          {getTeacherName(rep.replacementTeacherId)}
                        </p>
                      </div>
                      {rep.status === 'pending' && (
                        <Button
                          size='sm'
                          variant='secondary'
                          className='w-full mt-3 h-8 text-xs'
                          onClick={() => void handleConfirmReplacement(rep.id)}
                        >
                          Confirm Assignment
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
