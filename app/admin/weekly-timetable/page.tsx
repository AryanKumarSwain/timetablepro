'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getClasses,
  getPeriods,
  getTeachers,
  getSubjects,
  getWeeklyTimetableForClass,
  createWeeklyTimetableEntry,
  deleteWeeklyTimetableEntry,
} from '@/lib/api-services';
import type {
  Class,
  Period,
  Teacher,
  Subject,
  WeeklyTimetableEntry,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { cn, isTeacherActive } from '@/lib/utils';

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** dayOfWeek values aligned with Prisma `weeklyTimetableSlot.dayOfWeek` */
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

type CellDraft = {
  teacherId: string;
  subjectId: string;
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
    return {
      ...row,
      startTime: db.startTime,
      endTime: db.endTime,
    };
  });
}

function resolveDbPeriodId(
  operational: OperationalPeriod,
  dbPeriods: Period[]
): string | null {
  const byNumber = dbPeriods.find(
    (p) => p.periodNumber === operational.periodNumber
  );
  if (byNumber) return byNumber.id;

  const byId = dbPeriods.find((p) => p.id === operational.id);
  return byId?.id ?? null;
}

function cellDraftKey(periodId: string, dayIndex: number): string {
  return `${periodId}-${dayIndex}`;
}

function toTimeInputValue(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '08:00';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export default function WeeklyTimetablePage() {
  useRequireAuth('admin');

  const [rows, setRows] = useState<OperationalPeriod[]>(buildDefaultRows);
  const [dbPeriods, setDbPeriods] = useState<Period[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<WeeklyTimetableEntry[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [cellDrafts, setCellDrafts] = useState<Record<string, CellDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const loadClassTimetable = useCallback(async (classId: string) => {
    if (!classId) return;
    try {
      const data = await getWeeklyTimetableForClass(classId);
      setTimetable(data);
    } catch (error) {
      console.error('Failed to load weekly timetable:', error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

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

        if (cancelled) return;

        setClasses(classesData);
        setDbPeriods(periodsData);
        setTeachers(teachersData);
        setSubjects(subjectsData);
        setRows((prev) => syncRowTimesFromDb(prev, periodsData));

        if (classesData.length > 0) {
          setSelectedClass(classesData[0].id);
        }
      } catch (error) {
        console.error('Failed to load weekly timetable masters:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedClass) {
      void loadClassTimetable(selectedClass);
    }
  }, [selectedClass, loadClassTimetable]);

  const getTeacherName = useCallback(
    (id: string) => teachers.find((t) => t.id === id)?.name ?? '',
    [teachers]
  );

  const getSubjectName = useCallback(
    (id: string) => subjects.find((s) => s.id === id)?.name ?? '',
    [subjects]
  );

  const entryMatchesPeriod = useCallback(
    (entry: WeeklyTimetableEntry, operational: OperationalPeriod) => {
      if (entry.periodId === operational.id) return true;
      const entryDb = dbPeriods.find((p) => p.id === entry.periodId);
      return entryDb?.periodNumber === operational.periodNumber;
    },
    [dbPeriods]
  );

  const getEntryForCell = useCallback(
    (dayIndex: number, operational: OperationalPeriod) =>
      timetable.find(
        (entry) =>
          entry.dayOfWeek === dayIndex &&
          entryMatchesPeriod(entry, operational)
      ),
    [timetable, entryMatchesPeriod]
  );

  const updateCellDraft = (
    periodId: string,
    dayIndex: number,
    patch: Partial<CellDraft>
  ) => {
    const key = cellDraftKey(periodId, dayIndex);
    setCellDrafts((prev) => ({
      ...prev,
      [key]: {
        teacherId: prev[key]?.teacherId ?? '',
        subjectId: prev[key]?.subjectId ?? '',
        ...patch,
      },
    }));
  };

  const handleAddEntry = async (
    dayIndex: number,
    operational: OperationalPeriod
  ) => {
    const key = cellDraftKey(operational.id, dayIndex);
    const draft = cellDrafts[key];

    if (!draft?.teacherId || !draft?.subjectId) {
      window.alert('Please select both teacher and subject');
      return;
    }

    const periodId = resolveDbPeriodId(operational, dbPeriods);
    if (!periodId) {
      window.alert(
        'This period is not registered in the database yet. Add it under school periods first.'
      );
      return;
    }

    setSavingCell(key);
    try {
      await createWeeklyTimetableEntry({
        classId: selectedClass,
        dayOfWeek: dayIndex,
        periodId,
        teacherId: draft.teacherId,
        subjectId: draft.subjectId,
      });
      setCellDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      await loadClassTimetable(selectedClass);
    } catch (error) {
      console.error('Failed to add timetable entry:', error);
    } finally {
      setSavingCell(null);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Delete this timetable entry?')) return;

    try {
      await deleteWeeklyTimetableEntry(entryId);
      await loadClassTimetable(selectedClass);
    } catch (error) {
      console.error('Failed to delete timetable entry:', error);
    }
  };

  const updateRowTime = (
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

  const handleRemovePeriod = async (periodId: string) => {
    const operational = rows.find((row) => row.id === periodId);
    if (!operational) return;

    if (periodId === lunchPeriodId) {
      window.alert('The lunch break row cannot be removed.');
      return;
    }

    const entriesToRemove = timetable.filter((entry) =>
      entryMatchesPeriod(entry, operational)
    );

    setRows((prev) => prev.filter((row) => row.id !== periodId));
    setTimetable((prev) =>
      prev.filter((entry) => !entryMatchesPeriod(entry, operational))
    );
    setCellDrafts((prev) => {
      const next: Record<string, CellDraft> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (!key.startsWith(`${periodId}-`)) {
          next[key] = value;
        }
      }
      return next;
    });

    await Promise.all(
      entriesToRemove.map((entry) =>
        deleteWeeklyTimetableEntry(entry.id).catch((error) => {
          console.error('Failed to delete slot during period removal:', error);
        })
      )
    );

    if (selectedClass) {
      await loadClassTimetable(selectedClass);
    }
  };

  const gridColumns = useMemo(
    () => 'grid-cols-[minmax(11rem,13rem)_repeat(6,minmax(9rem,1fr))]',
    []
  );

  if (loading) {
    return (
      <div className='max-w-7xl mx-auto bg-background text-foreground'>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className='max-w-[1500px] mx-auto bg-background text-foreground'
    >
      <PageHeader
        title='Weekly Timetable'
        description='Six-day class schedule matrix with dynamic periods and lunch break'
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Weekly Timetable' },
        ]}
      />

      <GlassCard className='p-4 mb-6'>
        <label
          htmlFor='weekly-class-select'
          className='block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2'
        >
          Class section
        </label>
        <select
          id='weekly-class-select'
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className='w-full sm:w-72 px-4 py-2.5 bg-muted/30 border border-border/60 rounded-xl text-foreground'
        >
          {classes.map((cls, index) => (
            <option key={`class-option-${cls.id}-${index}`} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
      </GlassCard>

      <div className='mb-4 flex flex-wrap items-center gap-3'>
        <Button
          type='button'
          onClick={handleAddCustomPeriod}
          className='bg-accent hover:bg-accent/90 text-accent-foreground font-semibold'
        >
          + Add Custom Period
        </Button>
        <p className='text-xs text-muted-foreground'>
          Slots persist via{' '}
          <span className='font-mono text-foreground/80'>
            weeklyTimetableSlot
          </span>{' '}
          · Masters from classRoom, period, teacher, subject
        </p>
      </div>

      <div className='overflow-x-auto rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-lg'>
        <div className={cn('grid min-w-[1100px]', gridColumns)}>
          <div
            className={cn(
              'sticky top-0 z-10 bg-card/90 backdrop-blur border-b',
              'p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground'
            )}
          >
            Time / Period
          </div>

          {DAYS.map((day, index) => (
            <div
              key={`header-day-${day}-${index}`}
              className={cn(
                'sticky top-0 z-10 bg-card/90 backdrop-blur border-b border-l border-border/50',
                'p-4 text-center text-xs font-semibold uppercase tracking-wider text-foreground'
              )}
            >
              {day}
            </div>
          ))}

          {rows.map((period, index) => {
            if (period.id === lunchPeriodId) {
              return (
                <motion.div
                  key={`row-${period.id}-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className={cn('contents')}
                >
                  <div className='p-4 font-medium border-t border-r border-border/50 bg-muted/20 whitespace-nowrap'>
                    <div className='text-sm'>{period.label}</div>
                    <div className='text-xs text-muted-foreground'>
                      {period.startTime} – {period.endTime}
                    </div>
                  </div>

                  <div
                    className={cn(
                      'col-span-6 border-t border-l border-border/50',
                      'flex items-center justify-center p-4'
                    )}
                  >
                    <div
                      className={cn(
                        'w-full rounded-xl border-2 border-dashed border-amber-500/40',
                        'bg-amber-500/5 px-6 py-5 text-center text-sm font-medium',
                        'text-amber-700 dark:text-amber-300'
                      )}
                    >
                      🍱 Lunch Break (12:00 PM - 01:00 PM)
                    </div>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key={`row-${period.id}-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className='contents'
              >
                <div className='p-4 font-medium border-t border-r border-border/50 bg-muted/20 whitespace-nowrap'>
                  <div className='flex items-start justify-between gap-2'>
                    <div className='space-y-1.5 min-w-0'>
                      <div className='text-sm'>{period.label}</div>
                      <div className='flex flex-col gap-1'>
                        <input
                          type='time'
                          value={toTimeInputValue(period.startTime)}
                          onChange={(e) =>
                            updateRowTime(
                              period.id,
                              'startTime',
                              e.target.value
                            )
                          }
                          className='w-full text-[10px] px-1.5 py-0.5 rounded bg-input border border-border'
                          aria-label={`${period.label} start time`}
                        />
                        <input
                          type='time'
                          value={toTimeInputValue(period.endTime)}
                          onChange={(e) =>
                            updateRowTime(period.id, 'endTime', e.target.value)
                          }
                          className='w-full text-[10px] px-1.5 py-0.5 rounded bg-input border border-border'
                          aria-label={`${period.label} end time`}
                        />
                      </div>
                    </div>
                    <button
                      type='button'
                      aria-label={`Remove ${period.label}`}
                      onClick={() => void handleRemovePeriod(period.id)}
                      className={cn(
                        'shrink-0 rounded-lg p-1.5 text-muted-foreground',
                        'hover:bg-destructive/10 hover:text-destructive transition-colors'
                      )}
                    >
                      <Trash2 className='h-4 w-4' />
                    </button>
                  </div>
                </div>

                {DAY_INDICES.map((dayIndex, dayColIndex) => {
                  const entry = getEntryForCell(dayIndex, period);
                  const draftKey = cellDraftKey(period.id, dayIndex);
                  const draft = cellDrafts[draftKey] ?? {
                    teacherId: '',
                    subjectId: '',
                  };
                  const isSaving = savingCell === draftKey;
                  const cellKey = entry
                    ? `${entry.periodId}-${entry.dayOfWeek}-${dayColIndex}`
                    : `${period.id}-${dayIndex}-${dayColIndex}`;

                  return (
                    <div
                      key={cellKey}
                      className='p-2 border-t border-l border-border/50 align-top min-h-[7.5rem]'
                    >
                      {entry ? (
                        <Card
                          className={cn(
                            'p-3 rounded-xl border-indigo-500/20 h-full',
                            'bg-gradient-to-br from-indigo-500/10 to-violet-500/5',
                            'hover:shadow-md transition-shadow'
                          )}
                        >
                          <div className='text-xs font-semibold text-foreground mb-1'>
                            {getSubjectName(entry.subjectId)}
                          </div>
                          <div className='text-xs text-muted-foreground mb-2'>
                            {getTeacherName(entry.teacherId)}
                          </div>
                          <Button
                            type='button'
                            onClick={() => void handleDeleteEntry(entry.id)}
                            size='sm'
                            variant='outline'
                            className='w-full text-xs border-destructive/30 text-destructive hover:bg-destructive/10'
                          >
                            Remove
                          </Button>
                        </Card>
                      ) : (
                        <div className='space-y-2 text-xs h-full flex flex-col'>
                          <select
                            name='teacher'
                            value={draft.teacherId}
                            onChange={(e) =>
                              updateCellDraft(period.id, dayIndex, {
                                teacherId: e.target.value,
                              })
                            }
                            className='w-full px-2 py-1.5 bg-input border border-border rounded-lg text-foreground text-xs'
                          >
                            <option value=''>Teacher</option>
                            {(() => {
                              const activeTeachers = teachers.filter((t) => isTeacherActive(t.active));
                              return activeTeachers.map((teacher, teacherIndex) => (
                                <option
                                  key={`teacher-${period.id}-${dayIndex}-${teacher.id}-${teacherIndex}`}
                                  value={teacher.id}
                                >
                                  {teacher.name.split(' ')[0]}
                                </option>
                              ));
                            })()}
                          </select>
                          <select
                            name='subject'
                            value={draft.subjectId}
                            onChange={(e) =>
                              updateCellDraft(period.id, dayIndex, {
                                subjectId: e.target.value,
                              })
                            }
                            className='w-full px-2 py-1.5 bg-input border border-border rounded-lg text-foreground text-xs'
                          >
                            <option value=''>Subject</option>
                            {subjects.map((subject, subjectIndex) => (
                              <option
                                key={`subject-${period.id}-${dayIndex}-${subject.id}-${subjectIndex}`}
                                value={subject.id}
                              >
                                {subject.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            type='button'
                            disabled={isSaving || !selectedClass}
                            onClick={() =>
                              void handleAddEntry(dayIndex, period)
                            }
                            size='sm'
                            className='w-full text-xs bg-accent hover:bg-accent/90 mt-auto'
                          >
                            {isSaving ? 'Saving…' : 'Add'}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
