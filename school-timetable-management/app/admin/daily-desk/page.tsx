'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getClasses,
  getPeriods,
  getTeachers,
  getSubjects,
  getWeeklyTimetableForClass,
  getDailyAttendance,
  markAttendance,
  getReplacements,
  createReplacement,
  updateReplacementStatus,
} from '@/lib/api-services';
import type {
  Class,
  Period,
  Teacher,
  Subject,
  DailyAttendance,
  Replacement,
  WeeklyTimetableEntry,
} from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { AlertTriangle, UserPlus, Radio, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const DAY_INDICES = [1, 2, 3, 4, 5, 6] as const;
const lunchPeriodId = 'P005';

const DEFAULT_PERIOD_TIMES: { startTime: string; endTime: string }[] = [
  { startTime: '08:00 AM', endTime: '09:00 AM' },
  { startTime: '09:00 AM', endTime: '10:00 AM' },
  { startTime: '10:00 AM', endTime: '11:00 AM' },
  { startTime: '11:00 AM', endTime: '12:00 PM' },
  { startTime: '12:00 PM', endTime: '01:00 PM' },
  { startTime: '01:00 PM', endTime: '02:00 PM' },
  { startTime: '02:00 PM', endTime: '03:00 PM' },
];

type OperationalPeriod = {
  id: string;
  label: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
};

function localPeriodId(periodNumber: number): string {
  return `P${String(periodNumber).padStart(3, '0')}`;
}

function buildDefaultRows(): OperationalPeriod[] {
  return DEFAULT_PERIOD_TIMES.map((slot, index) => {
    const periodNumber = index + 1;
    return {
      id: localPeriodId(periodNumber),
      label: `Period ${periodNumber}`,
      periodNumber,
      startTime: slot.startTime,
      endTime: slot.endTime,
    };
  });
}

function syncRowTimesFromDb(
  rows: OperationalPeriod[],
  dbPeriods: Period[]
): OperationalPeriod[] {
  if (dbPeriods.length === 0) return rows;
  return rows.map((row) => {
    const db = dbPeriods.find((p) => p.periodNumber === row.periodNumber);
    if (!db) return row;
    return { ...row, startTime: db.startTime, endTime: db.endTime };
  });
}

function getTodayDayOfWeek(): number {
  const d = new Date().getDay();
  return d === 0 ? -1 : d;
}

export default function DailyDeskPage() {
  useRequireAuth('admin');

  const [classes, setClasses] = useState<Class[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rows, setRows] = useState<OperationalPeriod[]>(buildDefaultRows);
  const [selectedClass, setSelectedClass] = useState('');
  const [attendance, setAttendance] = useState<DailyAttendance[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<
    WeeklyTimetableEntry[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showReplacementForm, setShowReplacementForm] = useState(false);
  const [replacementForm, setReplacementForm] = useState({
    periodId: '',
    originalTeacherId: '',
    replacementTeacherId: '',
    reason: 'Leave',
  });

  const todayDayOfWeek = getTodayDayOfWeek();

  const loadDailyData = useCallback(async () => {
    if (!selectedClass) return;
    try {
      const today = getTodayDate();
      const [attendanceData, replacementData, timetableData] =
        await Promise.all([
          getDailyAttendance(today),
          getReplacements({ date: today }),
          getWeeklyTimetableForClass(selectedClass),
        ]);
      setAttendance(attendanceData);
      setReplacements(replacementData);
      setTimetableEntries(timetableData);
    } catch (error) {
      console.error('Failed to load daily data:', error);
    }
  }, [selectedClass]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const [classesData, periodsData, teachersData, subjectsData] =
          await Promise.all([
            getClasses(),
            getPeriods(),
            getTeachers(),
            getSubjects(),
          ]);
        setClasses(classesData);
        setPeriods(periodsData);
        setTeachers(teachersData);
        setSubjects(subjectsData);
        setRows((prev) => syncRowTimesFromDb(prev, periodsData));
        if (classesData.length > 0) {
          setSelectedClass(classesData[0].id);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) void loadDailyData();
  }, [selectedClass, loadDailyData]);

  const entryMatchesPeriod = useCallback(
    (entry: WeeklyTimetableEntry, operational: OperationalPeriod) => {
      if (entry.periodId === operational.id) return true;
      const entryDb = periods.find((p) => p.id === entry.periodId);
      return entryDb?.periodNumber === operational.periodNumber;
    },
    [periods]
  );

  const getEntryForCell = useCallback(
    (dayIndex: number, operational: OperationalPeriod) =>
      timetableEntries.find(
        (entry) =>
          entry.dayOfWeek === dayIndex &&
          entryMatchesPeriod(entry, operational)
      ),
    [timetableEntries, entryMatchesPeriod]
  );

  const handleMarkAttendance = async (
    classId: string,
    periodId: string,
    teacherId: string,
    isAbsent: boolean
  ) => {
    try {
      await markAttendance(
        classId,
        periodId,
        teacherId,
        getTodayDate(),
        isAbsent
      );
      await loadDailyData();
    } catch (error) {
      console.error('Failed to mark attendance:', error);
    }
  };

  const handleAddReplacement = async () => {
    if (
      !replacementForm.periodId ||
      !replacementForm.originalTeacherId ||
      !replacementForm.replacementTeacherId
    ) {
      window.alert('Please fill all fields');
      return;
    }
    try {
      await createReplacement({
        classId: selectedClass,
        date: getTodayDate(),
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
        originalTeacherId: '',
        replacementTeacherId: '',
        reason: 'Leave',
      });
      await loadDailyData();
    } catch (error) {
      console.error('Failed to create replacement:', error);
    }
  };

  const handleConfirmReplacement = async (replacementId: string) => {
    try {
      await updateReplacementStatus(replacementId, 'confirmed');
      await loadDailyData();
    } catch (error) {
      console.error('Failed to confirm replacement:', error);
    }
  };

  const handleAddCustomPeriod = () => {
    setRows((prev) => {
      const nextNumber =
        prev.reduce((max, row) => Math.max(max, row.periodNumber), 0) + 1;
      const times =
        DEFAULT_PERIOD_TIMES[(nextNumber - 1) % DEFAULT_PERIOD_TIMES.length];
      return [
        ...prev,
        {
          id: localPeriodId(nextNumber),
          label: `Period ${nextNumber}`,
          periodNumber: nextNumber,
          startTime: times?.startTime ?? '03:00 PM',
          endTime: times?.endTime ?? '04:00 PM',
        },
      ];
    });
  };

  const handleRemovePeriod = (periodId: string) => {
    if (periodId === lunchPeriodId) {
      window.alert('The lunch break row cannot be removed.');
      return;
    }
    const operational = rows.find((row) => row.id === periodId);
    if (!operational) return;
    setRows((prev) => prev.filter((row) => row.id !== periodId));
    setTimetableEntries((prev) =>
      prev.filter((entry) => !entryMatchesPeriod(entry, operational))
    );
  };

  const updatePeriodTime = (
    periodId: string,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === periodId ? { ...row, [field]: value } : row
      )
    );
  };

  const getTodayDate = () => new Date().toISOString().split('T')[0];
  const getTeacherName = (id: string) =>
    teachers.find((t) => t.id === id)?.name || 'Unknown';
  const getSubjectName = (id: string) =>
    subjects.find((s) => s.id === id)?.name || 'Unknown';
  const getPeriodInfo = (id: string) => periods.find((p) => p.id === id) || null;

  const gridColumns = useMemo(
    () => 'grid-cols-[minmax(11rem,13rem)_repeat(6,minmax(8rem,1fr))]',
    []
  );

  const dayIndexMatchesToday = (dayOfWeek: number) =>
    dayOfWeek === todayDayOfWeek;

  if (loading) {
    return (
      <div className='max-w-7xl mx-auto bg-background text-foreground'>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className='max-w-[1500px] mx-auto bg-background text-foreground'>
      <PageHeader
        title='Daily Desk'
        description={`${getTodayDate()} · Real-time attendance & substitution command center`}
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

      <GlassCard className='p-4 mb-6'>
        <label className='block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2'>
          Active class section
        </label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className='w-full sm:w-72 px-4 py-2.5 bg-muted/30 border border-border/60 rounded-xl text-foreground focus:ring-2 focus:ring-indigo-500/30'
        >
          {classes.map((cls, index) => (
            <option key={`class-${cls.id}-${index}`} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
      </GlassCard>

      <div className='mb-4'>
        <Button
          type='button'
          onClick={handleAddCustomPeriod}
          className='bg-accent hover:bg-accent/90 text-accent-foreground font-semibold'
        >
          + Add Custom Period
        </Button>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <GlassCard className='p-6'>
            <h2 className='text-lg font-semibold mb-1'>Weekly operations matrix</h2>
            <p className='text-xs text-muted-foreground mb-4'>
              Six-day cycle · mark attendance in today&apos;s column (
              {DAYS[todayDayOfWeek - 1] ?? 'Sunday — no column'})
            </p>

            <div className='overflow-x-auto rounded-2xl border border-border/60 bg-card/50'>
              <div className={cn('grid min-w-[1000px]', gridColumns)}>
                <div className='sticky top-0 z-10 bg-card/90 backdrop-blur border-b p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  Time / Period
                </div>
                {DAYS.map((day, index) => (
                  <div
                    key={`header-${day}-${index}`}
                    className={cn(
                      'sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-l border-border/50 p-3 text-center text-xs font-semibold uppercase',
                      dayIndexMatchesToday(index + 1) &&
                        'ring-2 ring-inset ring-indigo-500/40 text-indigo-600 dark:text-indigo-400'
                    )}
                  >
                    {day}
                    {dayIndexMatchesToday(index + 1) && (
                      <span className='block text-[10px] font-normal mt-0.5'>
                        Today
                      </span>
                    )}
                  </div>
                ))}

                {rows.map((period, index) => {
                  if (period.id === lunchPeriodId) {
                    return (
                      <div key={`row-${period.id}-${index}`} className='contents'>
                        <div className='p-3 border-t border-r border-border/50 bg-muted/20 text-sm'>
                          {period.label}
                        </div>
                        <div className='col-span-6 border-t border-l border-border/50 p-3 flex items-center justify-center'>
                          <div className='w-full rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-3 text-center text-sm font-medium text-amber-700 dark:text-amber-300'>
                            🍱 Lunch Break (12:00 PM - 01:00 PM)
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={`row-${period.id}-${index}`} className='contents'>
                      <div className='p-3 border-t border-r border-border/50 bg-muted/20'>
                        <div className='flex items-start justify-between gap-1'>
                          <div className='min-w-0 flex-1'>
                            <p className='text-sm font-medium'>{period.label}</p>
                            <div className='mt-1 space-y-1'>
                              <input
                                type='text'
                                value={period.startTime}
                                onChange={(e) =>
                                  updatePeriodTime(
                                    period.id,
                                    'startTime',
                                    e.target.value
                                  )
                                }
                                className='w-full text-[10px] px-1.5 py-0.5 rounded bg-input border border-border'
                                aria-label={`${period.label} start`}
                              />
                              <input
                                type='text'
                                value={period.endTime}
                                onChange={(e) =>
                                  updatePeriodTime(
                                    period.id,
                                    'endTime',
                                    e.target.value
                                  )
                                }
                                className='w-full text-[10px] px-1.5 py-0.5 rounded bg-input border border-border'
                                aria-label={`${period.label} end`}
                              />
                            </div>
                          </div>
                          <button
                            type='button'
                            aria-label={`Remove ${period.label}`}
                            onClick={() => handleRemovePeriod(period.id)}
                            className='shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                          >
                            <Trash2 className='h-3.5 w-3.5' />
                          </button>
                        </div>
                      </div>

                      {DAY_INDICES.map((dayOfWeek, dayColIndex) => {
                        const entry = getEntryForCell(dayOfWeek, period);
                        const isToday = dayOfWeek === todayDayOfWeek;
                        const attendanceRecord = entry
                          ? attendance.find((a) => a.periodId === entry.periodId)
                          : undefined;
                        const isAbsent = attendanceRecord?.isAbsent === true;
                        const cellKey = entry
                          ? `${entry.periodId}-${entry.dayOfWeek}-${dayColIndex}`
                          : `${period.id}-${dayOfWeek}-${dayColIndex}`;

                        return (
                          <div
                            key={cellKey}
                            className={cn(
                              'p-2 border-t border-l border-border/50 min-h-[5.5rem] text-xs',
                              isToday && 'bg-indigo-500/5',
                              isToday && isAbsent && 'bg-rose-500/10'
                            )}
                          >
                            {entry ? (
                              <Card
                                className={cn(
                                  'p-2 rounded-lg h-full',
                                  isAbsent
                                    ? 'border-rose-500/50 bg-rose-500/5'
                                    : 'border-border/50 bg-card/80'
                                )}
                              >
                                <p className='font-medium truncate'>
                                  {getSubjectName(entry.subjectId)}
                                </p>
                                <p className='text-muted-foreground truncate mb-2'>
                                  {getTeacherName(entry.teacherId)}
                                </p>
                                {isToday && (
                                  <div className='flex flex-col gap-1'>
                                    {isAbsent && (
                                      <AlertTriangle className='h-3.5 w-3.5 text-rose-500' />
                                    )}
                                    <Button
                                      size='sm'
                                      variant='outline'
                                      className={cn(
                                        'h-6 text-[10px] px-1',
                                        attendanceRecord?.isAbsent === false &&
                                          'bg-green-500/20 border-green-500/30'
                                      )}
                                      onClick={() =>
                                        void handleMarkAttendance(
                                          entry.classId,
                                          entry.periodId,
                                          entry.teacherId,
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
                                        isAbsent &&
                                          'bg-red-500/20 border-red-500/30'
                                      )}
                                      onClick={() =>
                                        void handleMarkAttendance(
                                          entry.classId,
                                          entry.periodId,
                                          entry.teacherId,
                                          true
                                        )
                                      }
                                    >
                                      Absent
                                    </Button>
                                  </div>
                                )}
                              </Card>
                            ) : (
                              <span className='text-muted-foreground/60'>—</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
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
                  <label className='block text-sm mb-1 text-foreground'>
                    Period
                  </label>
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
                    {periods.map((p, index) => (
                      <option key={`rep-period-${p.id}-${index}`} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm mb-1 text-foreground'>
                    Absent Teacher
                  </label>
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
                    {teachers.map((t, index) => (
                      <option key={`rep-absent-${t.id}-${index}`} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm mb-1 text-foreground'>
                    Cover Teacher
                  </label>
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
                    {teachers.map((t, index) => (
                      <option key={`rep-cover-${t.id}-${index}`} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm mb-1 text-foreground'>
                    Reason
                  </label>
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
                {replacements.map((rep, index) => (
                  <Card
                    key={`replacement-${rep.id}-${index}`}
                    className='p-3 rounded-xl border-border/50 bg-card/50 hover:shadow-md transition-shadow'
                  >
                    <div className='flex items-center justify-between mb-2'>
                      <p className='font-medium text-sm text-foreground'>
                        {getPeriodInfo(rep.periodId)?.label}
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
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
