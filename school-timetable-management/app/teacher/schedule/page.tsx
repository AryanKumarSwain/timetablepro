'use client';

import { useState, useEffect } from 'react';
import { useAuth, useRequireAuth } from '@/lib/auth-context';
import { getTodayScheduleForTeacher, getReplacements } from '@/lib/api-services';
import { TodayScheduleItem, Replacement } from '@/lib/types';
import { Card } from '@/components/ui/card';

export default function TeacherSchedulePage() {
  const auth = useRequireAuth('teacher');
  const [schedule, setSchedule] = useState<TodayScheduleItem[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.user?.teacherId) {
      loadSchedule();
    }
  }, [auth.user?.teacherId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const [scheduleData, replacementData] = await Promise.all([
        getTodayScheduleForTeacher(auth.user?.teacherId || ''),
        getReplacements({ date: today }),
      ]);

      setSchedule(scheduleData);
      setReplacements(replacementData);
    } catch (error) {
      console.error('Failed to load schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReplacementForPeriod = (periodId: string) => {
    return replacements.find(
      (r) => r.periodId === periodId && r.originalTeacherId === auth.user?.teacherId
    );
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <p className='text-muted-foreground'>Loading your schedule...</p>
      </div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto p-6'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-foreground mb-1'>
          Today&apos;s Schedule
        </h1>
        <p className='text-muted-foreground'>{getTodayDate()}</p>
      </div>

      {schedule.length === 0 ? (
        <Card className='p-12 border-border text-center'>
          <p className='text-muted-foreground'>
            No classes scheduled for today
          </p>
        </Card>
      ) : (
        <div className='space-y-4'>
          {schedule.map((item) => {
            const replacement = getReplacementForPeriod(item.periodId);

            return (
              <Card
                key={item.periodId}
                className={`p-6 border ${
                  replacement?.status === 'confirmed'
                    ? 'border-accent/50 bg-accent/5'
                    : item.isAbsent
                    ? 'border-destructive/50 bg-destructive/5'
                    : 'border-border bg-card/50'
                }`}
              >
                <div className='flex items-start justify-between mb-4'>
                  <div>
                    <h3 className='text-lg font-semibold text-foreground'>
                      {item.className}
                    </h3>
                    <p className='text-sm text-muted-foreground'>
                      {item.subjectName}
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='font-mono text-lg font-semibold text-foreground'>
                      {item.startTime} - {item.endTime}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      ({item.periodNumber} of 7)
                    </p>
                  </div>
                </div>

                <div className='flex items-center gap-4 flex-wrap'>
                  {item.isAbsent && (
                    <span className='px-4 py-2 bg-destructive/20 text-destructive text-sm font-medium rounded-lg'>
                      Marked Absent
                    </span>
                  )}

                  {replacement ? (
                    <>
                      <div className='flex-1'>
                        <p className='text-xs text-muted-foreground mb-1'>
                          Replacement Info
                        </p>
                        <p className='text-sm font-medium text-foreground'>
                          Covered by: Replacement Teacher
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          Reason: {replacement.reason}
                        </p>
                      </div>
                      {replacement.status === 'pending' && (
                        <span className='px-3 py-2 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs font-medium rounded-lg'>
                          Pending Confirmation
                        </span>
                      )}
                      {replacement.status === 'confirmed' && (
                        <span className='px-3 py-2 bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium rounded-lg'>
                          Replacement Confirmed
                        </span>
                      )}
                    </>
                  ) : (
                    <span className='px-4 py-2 bg-green-500/20 text-green-600 dark:text-green-400 text-sm font-medium rounded-lg'>
                      Class as Scheduled
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      <div className='mt-8 grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card className='p-4 border-border'>
          <p className='text-xs text-muted-foreground mb-1'>Total Classes</p>
          <p className='text-2xl font-bold text-foreground'>{schedule.length}</p>
        </Card>
        <Card className='p-4 border-border'>
          <p className='text-xs text-muted-foreground mb-1'>With Replacements</p>
          <p className='text-2xl font-bold text-accent'>
            {replacements.length}
          </p>
        </Card>
        <Card className='p-4 border-border'>
          <p className='text-xs text-muted-foreground mb-1'>Marked Absent</p>
          <p className='text-2xl font-bold text-destructive'>
            {schedule.filter((s) => s.isAbsent).length}
          </p>
        </Card>
      </div>
    </div>
  );
}
