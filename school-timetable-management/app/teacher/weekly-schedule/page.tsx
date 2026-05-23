'use client';

import { useState, useEffect } from 'react';
import { useAuth, useRequireAuth } from '@/lib/auth-context';
import {
  getWeeklyTimetable,
  getPeriods,
  getClasses,
  getSubjects,
} from '@/lib/api-services';
import {
  WeeklyTimetableEntry,
  Period,
  Class,
  Subject,
} from '@/lib/types';
import { Card } from '@/components/ui/card';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_INDICES = [1, 2, 3, 4, 5];

export default function TeacherWeeklySchedulePage() {
  const auth = useRequireAuth('teacher');
  const [timetable, setTimetable] = useState<WeeklyTimetableEntry[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [timetableData, periodsData, classesData, subjectsData] =
        await Promise.all([
          getWeeklyTimetable(),
          getPeriods(),
          getClasses(),
          getSubjects(),
        ]);

      // Filter timetable for current teacher
      const teacherTimetable = timetableData.filter(
        (t) => t.teacherId === auth.user?.teacherId
      );

      setTimetable(teacherTimetable);
      setPeriods(periodsData);
      setClasses(classesData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntryForCell = (dayIndex: number, periodId: string) => {
    return timetable.find(
      (e) => e.dayOfWeek === dayIndex && e.periodId === periodId
    );
  };

  const getClassName = (id: string) =>
    classes.find((c) => c.id === id)?.name || '';
  const getSubjectName = (id: string) =>
    subjects.find((s) => s.id === id)?.name || '';

  if (loading) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <p className='text-muted-foreground'>Loading weekly schedule...</p>
      </div>
    );
  }

  const lunchPeriodId = 'P005';

  return (
    <div className='max-w-7xl mx-auto p-6'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-foreground mb-2'>
          Weekly Schedule
        </h1>
        <p className='text-muted-foreground'>Your complete weekly timetable</p>
      </div>

      {/* Weekly Timetable Grid */}
      <div className='overflow-x-auto bg-card border border-border rounded-lg'>
        <table className='w-full'>
          <thead>
            <tr className='border-b border-border'>
              <th className='p-3 text-left font-semibold text-foreground'>
                Period
              </th>
              {DAYS.map((day) => (
                <th
                  key={day}
                  className='p-3 text-center font-semibold text-foreground border-l border-border'
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
                <tr key={period.id} className='border-b border-border'>
                  <td className='p-3 font-medium text-foreground border-r border-border whitespace-nowrap'>
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
                        className='p-3 border-l border-border'
                      >
                        {entry ? (
                          <Card className='p-3 bg-primary/10 border-border'>
                            <p className='font-semibold text-sm text-foreground mb-1'>
                              {getClassName(entry.classId)}
                            </p>
                            <p className='text-xs text-muted-foreground'>
                              {getSubjectName(entry.subjectId)}
                            </p>
                          </Card>
                        ) : (
                          <div className='text-center py-8'>
                            <p className='text-xs text-muted-foreground'>-</p>
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

      {/* Statistics */}
      <div className='mt-8 grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card className='p-6 border-border'>
          <p className='text-sm text-muted-foreground mb-2'>Total Classes</p>
          <p className='text-3xl font-bold text-primary'>{timetable.length}</p>
        </Card>
        <Card className='p-6 border-border'>
          <p className='text-sm text-muted-foreground mb-2'>Unique Classes</p>
          <p className='text-3xl font-bold text-accent'>
            {new Set(timetable.map((t) => t.classId)).size}
          </p>
        </Card>
        <Card className='p-6 border-border'>
          <p className='text-sm text-muted-foreground mb-2'>Subjects Teaching</p>
          <p className='text-3xl font-bold text-primary'>
            {new Set(timetable.map((t) => t.subjectId)).size}
          </p>
        </Card>
      </div>

      {/* Subject Details */}
      <div className='mt-8'>
        <h2 className='text-xl font-semibold text-foreground mb-4'>
          Subject Assignments
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {Array.from(new Set(timetable.map((t) => t.subjectId))).map(
            (subjectId) => {
              const classesForSubject = new Set(
                timetable
                  .filter((t) => t.subjectId === subjectId)
                  .map((t) => t.classId)
              );

              return (
                <Card key={subjectId} className='p-4 border-border'>
                  <h3 className='font-semibold text-foreground mb-3'>
                    {getSubjectName(subjectId)}
                  </h3>
                  <div className='space-y-2'>
                    {Array.from(classesForSubject).map((classId) => (
                      <p
                        key={classId}
                        className='text-sm text-muted-foreground'
                      >
                        {getClassName(classId)}
                      </p>
                    ))}
                  </div>
                </Card>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
