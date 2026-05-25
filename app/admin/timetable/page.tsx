'use client';

import { useState, useEffect } from 'react';
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
import {
  Class,
  Period,
  Teacher,
  Subject,
  WeeklyTimetableEntry,
} from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { cn } from '@/lib/utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_INDICES = [1, 2, 3, 4, 5];

export default function TimetablePage() {
  useRequireAuth('admin');

  const [classes, setClasses] = useState<Class[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<WeeklyTimetableEntry[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadClassTimetable();
    }
  }, [selectedClass]);

  const loadInitialData = async () => {
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

      if (classesData.length > 0) {
        setSelectedClass(classesData[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClassTimetable = async () => {
    try {
      const data = await getWeeklyTimetableForClass(selectedClass);
      setTimetable(data);
    } catch (error) {
      console.error('Failed to load timetable:', error);
    }
  };

  const handleAddEntry = async (dayIndex: number, periodId: string) => {
    const teacherId = (
      document.querySelector(
        `[data-day="${dayIndex}"][data-period="${periodId}"] select[name="teacher"]`
      ) as HTMLSelectElement
    )?.value;
    const subjectId = (
      document.querySelector(
        `[data-day="${dayIndex}"][data-period="${periodId}"] select[name="subject"]`
      ) as HTMLSelectElement
    )?.value;

    if (!teacherId || !subjectId) {
      alert('Please select both teacher and subject');
      return;
    }

    try {
      await createWeeklyTimetableEntry({
        classId: selectedClass,
        dayOfWeek: dayIndex,
        periodId,
        teacherId,
        subjectId,
      });
      await loadClassTimetable();
    } catch (error) {
      console.error('Failed to add entry:', error);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Delete this timetable entry?')) return;

    try {
      await deleteWeeklyTimetableEntry(entryId);
      await loadClassTimetable();
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const getEntryForCell = (dayIndex: number, periodId: string) => {
    return timetable.find(
      (e) => e.dayOfWeek === dayIndex && e.periodId === periodId
    );
  };

  const getTeacherName = (id: string) =>
    teachers.find((t) => t.id === id)?.name || '';
  const getSubjectName = (id: string) =>
    subjects.find((s) => s.id === id)?.name || '';

  if (loading) {
    return (
      <div className='max-w-7xl mx-auto'>
        <PageSkeleton />
      </div>
    );
  }

  const lunchPeriodId = 'P005';

  return (
    <div className='max-w-[1400px] mx-auto'>
      <PageHeader
        title='Weekly Timetable'
        description='Build and manage the class schedule matrix'
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Timetable' },
        ]}
      />

      <GlassCard className='p-4 mb-6'>
        <label className='block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2'>
          Class section
        </label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className='w-full sm:w-72 px-4 py-2.5 bg-muted/30 border border-border/60 rounded-xl'
        >
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
      </GlassCard>

      <div className='overflow-x-auto rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm shadow-lg'>
        <table className='w-full min-w-[800px]'>
          <thead className='sticky top-14 z-20 bg-muted/90 backdrop-blur-md'>
            <tr className='border-b border-border'>
              <th className='p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                Period
              </th>
              {DAYS.map((day) => (
                <th
                  key={day}
                  className='p-4 text-center text-xs font-semibold uppercase tracking-wider border-l border-border/50'
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods
              .filter((p) => p.id !== lunchPeriodId)
              .map((period) => (
                <tr
                  key={period.id}
                  className='border-b border-border/50 hover:bg-muted/20 transition-colors'
                >
                  <td className='p-4 font-medium border-r border-border/50 whitespace-nowrap bg-muted/20'>
                    <div className='text-sm'>{period.label}</div>
                    <div className='text-xs text-muted-foreground'>
                      {period.startTime} - {period.endTime}
                    </div>
                  </td>
                  {DAY_INDICES.map((dayIndex) => {
                    const entry = getEntryForCell(dayIndex, period.id);

                    return (
                      <td
                        key={`${dayIndex}-${period.id}`}
                        className='p-2 border-l border-border/50 align-top'
                        data-day={dayIndex}
                        data-period={period.id}
                      >
                        {entry ? (
                          <Card
                            className={cn(
                              'p-3 rounded-xl border-indigo-500/20',
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
                              onClick={() => handleDeleteEntry(entry.id)}
                              size='sm'
                              variant='outline'
                              className='w-full text-xs border-destructive/30 text-destructive hover:bg-destructive/10'
                            >
                              Remove
                            </Button>
                          </Card>
                        ) : (
                          <div className='space-y-2 text-xs'>
                            <select
                              name='teacher'
                              defaultValue=''
                              className='w-full px-2 py-1 bg-input border border-border rounded text-foreground text-xs'
                            >
                              <option value=''>Teacher</option>
                              {teachers.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name.split(' ')[0]}
                                </option>
                              ))}
                            </select>
                            <select
                              name='subject'
                              defaultValue=''
                              className='w-full px-2 py-1 bg-input border border-border rounded text-foreground text-xs'
                            >
                              <option value=''>Subject</option>
                              {subjects.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                            <Button
                              onClick={() =>
                                handleAddEntry(dayIndex, period.id)
                              }
                              size='sm'
                              className='w-full text-xs bg-accent hover:bg-accent/90'
                            >
                              Add
                            </Button>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
