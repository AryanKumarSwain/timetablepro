'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'with-next-link';
import { useRouter as useNextRouter } from 'next/navigation';
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
import { AlertTriangle, UserPlus, Radio, Share2, Download, CheckCircle2, CalendarX, Link2 } from 'lucide-react';
import { cn, isTeacherActive } from '@/lib/utils';

export default function DailyDeskPage() {
  // 1. Intercept URL parameter matrix to identify if reader arrived via public token share
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isPublicView = searchParams?.get('public') === 'true';

  // 2. Fall back to safety route shield ONLY if it is not designated as a public viewing link
  if (!isPublicView) {
    useRequireAuth('admin');
  }

  const router = useNextRouter();

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

  const localeDate = new Date();
  const today = `${localeDate.getFullYear()}-${String(localeDate.getMonth() + 1).padStart(2, '0')}-${String(localeDate.getDate()).padStart(2, '0')}`;

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
    let isMounted = true;

    async function init() {
      if (isMounted) setLoading(true);
      await loadData();
      if (isMounted) setLoading(false);
    }

    void init();

    const handleFocus = () => {
      void loadData();
      router.refresh();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadData, router]);

  const handleMarkAttendance = async (
    classId: string,
    periodId: string,
    teacherId: string,
    isAbsent: boolean
  ) => {
    try {
      await markAttendance(classId, periodId, teacherId, today, isAbsent);
      await loadData();
      router.refresh();
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
        status: 'confirmed',
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

  // Safe Clipboard Copy Operation for public generation link distribution
  const handleCopyShareableLink = async () => {
    if (typeof window === 'undefined') return;

    const publicUrl = `${window.location.origin}${window.location.pathname}?public=true`;
    const shareData = {
      title: 'Daily Desk Live View',
      text: 'Open the live daily desk schedule.',
      url: publicUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') {
          return;
        }
        console.error('Native share failed:', err);
      }
    }

    try {
      await navigator.clipboard.writeText(publicUrl);
      window.alert('📋 Live view access link successfully copied to clipboard!');
    } catch (err) {
      console.error('Link generation capture failure:', err);
      window.alert(`Unable to copy link automatically. Please use this URL manually:\n${publicUrl}`);
    }
  };

  const handlePrintPDF = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const openCoverForm = (classId: string, periodId: string, originalTeacherId: string) => {
    setReplacementForm({
      periodId,
      classId,
      // If the original teacher is a sub who is now absent, 
      // originalTeacherId passed here will be the sub's ID.
      originalTeacherId: originalTeacherId,
      replacementTeacherId: '',
      reason: 'Leave',
    });
    setShowReplacementForm(true);
  };

  const getTeacherName = (id: string) =>
    teachers.find((t) => t.id === id)?.name || 'Unknown Faculty';

  const getSubjectClass = (subjectName: string): string => {
    if (!subjectName) return '';
    const name = subjectName.toLowerCase();
    if (name.includes('biology') || name.includes('bio')) return 'sub-biology';
    if (name.includes('chemistry') || name.includes('chem')) return 'sub-chemistry';
    if (name.includes('geography') || name.includes('geo')) return 'sub-geography';
    if (name.includes('economics') || name.includes('eco')) return 'sub-economics';
    if (name.includes('physical education') || name.includes('p.e') || name.includes('pe')) return 'sub-physical-education';
    if (name.includes('math') || name.includes('mathematics')) return 'sub-mathematics';
    if (name.includes('history')) return 'sub-history';
    if (name.includes('computer') || name.includes('cs') || name.includes('it')) return 'sub-computer-science';
    if (name.includes('physics') || name.includes('phy')) return 'sub-physics';
    return '';
  };

  if (loading || !gridData) {
    return (
      <div className='max-w-[1600px] mx-auto p-4'>
        <PageSkeleton />
      </div>
    );
  }

  const totalRealSlotsScheduled = gridData.grid?.reduce((total, row) => {
    if (!row || !row.cells) return total;
    const filledCellsInRow = row.cells.filter(cell => cell && (cell.empty === false || !!cell.subjectName || !!cell.teacherId)).length;
    return total + filledCellsInRow;
  }, 0) || 0;

  const isTimetableEmpty =
    !gridData.classes || gridData.classes.length === 0 ||
    !gridData.periods || gridData.periods.length === 0 ||
    (!gridData.grid || gridData.grid.length === 0 && totalRealSlotsScheduled === 0);

  return (
    <div className='max-w-[1600px] mx-auto space-y-6 px-4 py-2 print:p-0 print:max-w-full'>
      {/* HEADER SECTION - Completely completely hidden to public view links */}
      {!isPublicView && (
        <div className="print:hidden">
          <PageHeader
            title='Daily Desk'
            description={`${today} · Real-time attendance & substitution command center`}
            breadcrumbs={[
              { label: 'Admin', href: '/admin/dashboard' },
              { label: 'Daily Desk' },
            ]}
            actions={
              <button
                onClick={() => { void loadData(); router.refresh(); }}
                className='flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider shadow-sm hover:bg-emerald-500/20 transition-all'
              >
                <Radio className='h-3.5 w-3.5 animate-pulse text-emerald-500' />
                Force Sync
              </button>
            }
          />
        </div>
      )}

      {/* DYNAMIC GRID LAYOUT MATRICES CONTAINER */}
      <div className={cn(
        'grid grid-cols-1 gap-6 items-start print:block print:w-full',
        !isPublicView ? 'xl:grid-cols-[1fr_360px]' : 'xl:grid-cols-1'
      )}>

        {/* TIMETABLE VIEW CONTAINER */}
        <div className='min-w-0 w-full overflow-visible print:border-none print:p-0'>
          <GlassCard className='p-5 print:bg-transparent print:border-none print:p-0 print:shadow-none'>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 print:mb-8">
              <div>
                <h2 className='text-base font-bold uppercase tracking-wide text-foreground print:text-xl print:text-black'>
                  Daily Operations Layout Matrix
                </h2>
                <p className='text-xs text-muted-foreground mt-0.5 print:text-sm print:text-gray-600'>
                  Live scheduling run verified for calendar timeline: <strong>{today}</strong>.
                </p>
              </div>

              {/* ACTION MODULE CONTROLS */}
              <div className="flex items-center gap-2 self-start sm:self-center print:hidden">
                {!isPublicView ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCopyShareableLink()}
                    disabled={isTimetableEmpty}
                    className="rounded-xl text-xs font-bold h-9 border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 shadow-sm"
                  >
                    <Link2 className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
                    Copy Live Link
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrintPDF}
                  disabled={isTimetableEmpty}
                  className="rounded-xl text-xs font-semibold h-9 border-border/80 hover:bg-muted"
                >
                  <Download className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  Download PDF
                </Button>
              </div>
            </div>

            {/* CONDITIONAL TIMETABLE VIEW REGION */}
            {isTimetableEmpty ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-4 border border-dashed border-border/60 bg-muted/10 rounded-2xl">
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full mb-3 dark:bg-rose-500/20">
                  <CalendarX className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">No timetable is active now</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1">
                  There are no scheduled periods or designated classes configured for this operational date block.
                </p>
              </div>
            ) : (
              <div
                id="timetable-capture"
                className='timetable-matrix-scroll w-full overflow-x-auto rounded-xl border border-border/60 bg-background p-4 scrollbar-thin scrollbar-thumb-accent print:overflow-visible print:border-none print:bg-transparent'
              >
                <div className='timetable-inner-container print:min-w-full'>
                  <table className='w-full border-collapse text-left min-w-[800px] print:min-w-full print:table-layout-fixed'>
                    <thead>
                      <tr className='bg-muted/80 backdrop-blur border-b border-border/40 print:bg-gray-100 print:border-b-2 print:border-gray-300'>
                        <th className='p-4 text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 w-[140px] sticky left-0 bg-muted z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-border/40 print:static print:bg-gray-100 print:text-black print:shadow-none'>
                          Timetable
                        </th>
                        {gridData.periods.map((p) => (
                          <th
                            key={p.id}
                            className='p-3 border-l border-border/40 text-center min-w-[180px] w-[200px] print:border-gray-300 print:p-2'
                          >
                            <div className='text-xs font-bold text-foreground uppercase tracking-wider print:text-black print:text-[11px]'>
                              {p.isBreak ? (p.label || 'BREAK') : `P${p.periodNumber}`}
                            </div>
                            <div className='text-[10px] text-muted-foreground font-medium mt-0.5 print:text-gray-600 print:text-[9px]'>
                              {p.startTime}–{p.endTime}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-border/40 bg-background/40 print:bg-transparent print:divide-gray-300'>
                      {gridData.classes.map((cls) => (
                        <tr key={cls.id} className='hover:bg-muted/10 transition-colors print:hover:bg-transparent print:break-inside-avoid'>
                          <td className='p-4 font-bold text-sm text-foreground bg-background/90 sticky left-0 z-10 border-r border-border/40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:bg-transparent print:text-black print:shadow-none print:p-2 print:border-r print:border-gray-300'>
                            {cls.name}
                          </td>

                          {gridData.periods.map((period) => {
                            const periodRow = gridData.grid.find((row) => row.periodId === period.id);
                            const cell = periodRow?.cells.find((c) => c.classId === cls.id);

                            if (!cell || cell.empty) {
                              return (
                                <td
                                  key={`${cls.id}-${period.id}`}
                                  className='p-3 border-l border-border/40 text-center text-muted-foreground/20 bg-background/5 vertical-middle min-h-[115px] print:border-gray-300 print:p-1'
                                >
                                  <span className="text-xs font-semibold tracking-widest print:text-gray-300">—</span>
                                </td>
                              );
                            }

                            const hasServerReplacement = !!cell.replacement;
                            const isCovered = hasServerReplacement && (cell.replacement?.status === 'confirmed' || cell.replacement?.status === 'approved');
                            const isCoverMissing = cell.isReplacementAbsent === true;
                            const subjectColorClass = getSubjectClass(cell.subjectName);

                            return (
                              <td
                                key={`${cls.id}-${period.id}`}
                                className={cn(
                                  'p-2 border-l border-border/40 h-full min-h-[115px] align-top transition-colors print:border-gray-300 print:p-1',
                                  cell.isAbsent
                                    ? (isCovered && !isCoverMissing ? 'bg-emerald-50 dark:bg-emerald-950/30 print:bg-green-50' : 'bg-rose-50 dark:bg-rose-950/30 print:bg-red-50')
                                    : 'bg-background/10'
                                )}
                              >
                                <Card
                                  className={cn(
                                    'p-3 rounded-lg h-full text-xs flex flex-col justify-between shadow-none transition-all border print:p-1.5 print:border-gray-300 print:bg-white',
                                    cell.isAbsent
                                      ? (isCovered && !isCoverMissing)
                                        ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20'
                                        : 'border-rose-500/40 bg-rose-500/5 ring-1 ring-rose-500/10'
                                      : cn('border-border/60 bg-background hover:border-indigo-500/40', subjectColorClass)
                                  )}
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-1 mb-1">
                                      <p className='font-bold text-foreground truncate flex-1 print:text-black print:text-[11px]'>{cell.subjectName}</p>
                                    </div>
                                    <p className={cn(
                                      'font-medium truncate mb-2 print:text-[10px] print:mb-1',
                                      cell.isAbsent ? 'text-muted-foreground/60 line-through print:text-gray-400' : 'text-muted-foreground print:text-gray-700'
                                    )}>
                                      {cell.teacherName}
                                    </p>
                                  </div>

                                  <div className='flex flex-col gap-1 mt-auto print:mt-0'>
                                    {cell.isAbsent ? (
                                      <>
                                        {isCovered && !isCoverMissing && (
                                          <div className="space-y-1.5 print:space-y-0.5">
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm print:bg-transparent print:border-none print:p-0 print:text-green-700">
                                              <CheckCircle2 className='h-3 w-3 shrink-0 text-emerald-500 print:hidden' />
                                              <span className="text-[10px] font-bold uppercase tracking-wider print:text-[8px]">Cover Active</span>
                                            </div>
                                            <p className="text-[11px] font-medium text-foreground bg-muted/60 px-1.5 py-1 rounded border border-border/40 truncate print:text-[9px] print:bg-gray-50 print:p-0.5">
                                              <span className="text-muted-foreground font-normal print:text-gray-600">Sub:</span> {cell.replacement?.replacementTeacherName}
                                            </p>
                                          </div>
                                        )}

                                        {isCovered && isCoverMissing && (
                                          <div className="space-y-1.5 print:space-y-0.5">
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                              <AlertTriangle className='h-3 w-3 shrink-0' />
                                              <span className="text-[10px] font-bold uppercase">Sub Absent!</span>
                                            </div>

                                            <p className="text-[11px] font-medium text-muted-foreground bg-rose-500/5 px-1.5 py-1 rounded border border-rose-500/20 line-through truncate">
                                              Sub: {cell.replacement?.replacementTeacherName}
                                            </p>

                                            <Button
                                              size='sm'
                                              variant='secondary'
                                              className='h-6 text-[10px] font-bold rounded bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 hover:bg-indigo-500/20 w-full'
                                              onClick={() => openCoverForm(
                                                cell.classId,
                                                period.id,
                                                // Targeting the current (absent) sub's ID for replacement
                                                cell.replacement?.replacementTeacherId || cell.teacherId
                                              )}
                                            >
                                              Re-Assign Cover
                                            </Button>
                                          </div>
                                        )}

                                        {!isCovered && (
                                          <>
                                            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mb-1 print:bg-transparent print:border-none print:p-0 print:text-red-700 print:mb-0">
                                              <AlertTriangle className='h-3 w-3 shrink-0 text-rose-500 print:hidden' />
                                              <span className="text-[9px] font-bold uppercase tracking-wide print:text-[8px]">ABSENT</span>
                                            </div>

                                            {/* Hide action trigger inputs from general public users */}
                                            {!isPublicView && (
                                              <div className="grid grid-cols-2 gap-1 print:hidden">
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
                                            )}
                                          </>
                                        )}
                                      </>
                                    ) : (
                                      /* Hide edit states from public readers */
                                      !isPublicView && (
                                        <Button
                                          size='sm'
                                          variant='outline'
                                          className='h-6 text-[10px] font-bold rounded border-rose-500/20 text-rose-600 hover:bg-rose-500/10 transition-colors w-full print:hidden'
                                          onClick={() =>
                                            void handleMarkAttendance(cell.classId, period.id, cell.teacherId, true)
                                          }
                                        >
                                          Mark Absent
                                        </Button>
                                      )
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
              </div>
            )}
          </GlassCard>
        </div>

        {/* SIDE BAR: CONTROL ENGINE - Completely skipped if accessed via shared public URL hook */}
        {!isPublicView && (
          <div className='w-full max-w-[360px] ml-auto print:hidden'>
            <GlassCard className='p-5 sticky top-6 space-y-4'>
              <div className='flex items-center justify-between pb-2 border-b border-border/40'>
                <div>
                  <h2 className='text-sm font-bold uppercase tracking-wider text-foreground'>Cover Assignments</h2>
                  <p className='text-[11px] text-muted-foreground mt-0.5'>Substitution pipeline manager</p>
                </div>
                <Button
                  size='sm'
                  variant={showReplacementForm ? 'ghost' : 'default'}
                  disabled={isTimetableEmpty}
                  className='rounded-xl text-xs font-bold h-8 transition-all'
                  onClick={() => setShowReplacementForm(!showReplacementForm)}
                >
                  {showReplacementForm ? 'Cancel' : <><UserPlus className='h-3.5 w-3.5 mr-1' /> Assign</>}
                </Button>
              </div>

              {showReplacementForm && !isTimetableEmpty && (
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
                          {p.isBreak ? (p.label || 'BREAK') : `Period ${p.periodNumber} (${p.startTime})`}
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
                      {(() => {
                        const activeTeachers = teachers.filter((t) => isTeacherActive(t.active));
                        return activeTeachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ));
                      })()}
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
                      {(() => {
                        const activeTeachers = teachers.filter((t) => isTeacherActive(t.active));
                        return activeTeachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ));
                      })()}
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

              {/* REPLACEMENT LIST / HISTORIC ACCORDION REGION */}
              <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto">
                {/* Remaining replacement stack UI items go here under admin visibility */}
              </div>
            </GlassCard>
          </div>
        )}

      </div>
    </div>
  );
}