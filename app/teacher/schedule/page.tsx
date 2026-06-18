'use client';

import { useState, useEffect } from 'react';
import { useAuth, useRequireAuth } from '@/lib/auth-context';
import { getTodayScheduleForTeacher, getReplacements } from '@/lib/api-services';
import { TodayScheduleItem, Replacement } from '@/lib/types';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Clock, Flame, AlertCircle } from 'lucide-react';

export default function TeacherSchedulePage() {
  const auth = useRequireAuth('teacher');
  const [schedule, setSchedule] = useState<TodayScheduleItem[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSchoolAssignment, setHasSchoolAssignment] = useState(true);

  useEffect(() => {
    if (auth.user?.teacherId) {
      loadSchedule();
    }
  }, [auth.user?.teacherId]);

 const loadSchedule = async () => {
  try {
    setLoading(true);
    // Check if teacher has school assignment
    if (!auth.user?.schoolId) {
      setHasSchoolAssignment(false);
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const [scheduleData, replacementData] = await Promise.all([
      getTodayScheduleForTeacher(auth.user?.teacherId || ''),
      getReplacements({ date: today }),
    ]);

    // Explicit sequential timeline sorting
    const sortedSchedule = [...scheduleData].sort((a, b) => Number(a.periodNumber) - Number(b.periodNumber));

    setSchedule(sortedSchedule);
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
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const burnoutScore = Math.min(100, schedule.length * 12 + replacements.length * 8);

  if (loading) {
    return (
      <div className='max-w-3xl mx-auto'>
        <PageSkeleton rows={3} />
      </div>
    );
  }

  if (!hasSchoolAssignment) {
    return (
      <div className='max-w-3xl mx-auto'>
        <PageHeader
          title="Today's Timeline"
          description={getTodayDate()}
          breadcrumbs={[
            { label: 'Teacher', href: '/teacher/schedule' },
            { label: 'Today' },
          ]}
        />
        <GlassCard className='p-12 text-center'>
          <AlertCircle className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
          <h3 className='text-lg font-semibold mb-2'>No School Assignment</h3>
          <p className='text-muted-foreground'>
            You are not currently assigned to any school. Please wait for an administrator to add you or input an invitation code.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className='max-w-3xl mx-auto'>
      <PageHeader
        title="Today's Timeline"
        description={getTodayDate()}
        breadcrumbs={[
          { label: 'Teacher', href: '/teacher/schedule' },
          { label: 'Today' },
        ]}
      />

      <div className='grid sm:grid-cols-2 gap-4 mb-8'>
        <GlassCard className='p-5'>
          <div className='flex items-center gap-2 mb-3'>
            <Flame className='h-4 w-4 text-amber-500' />
            <p className='text-sm font-medium'>Burnout meter</p>
          </div>
          <Progress value={burnoutScore} className='h-2' />
          <p className='text-xs text-muted-foreground mt-2'>
            Weekly load index · {burnoutScore}% —{' '}
            {burnoutScore > 70 ? 'High' : burnoutScore > 40 ? 'Moderate' : 'Healthy'}
          </p>
        </GlassCard>
        <GlassCard className='p-5'>
          <p className='text-xs text-muted-foreground mb-1'>Sessions today</p>
          <p className='text-3xl font-bold'>{schedule.length}</p>
          <p className='text-xs text-muted-foreground mt-1'>
            {replacements.length} cover events
          </p>
        </GlassCard>
      </div>

      {schedule.length === 0 ? (
        <GlassCard className='p-12 text-center'>
          <p className='text-muted-foreground'>No classes scheduled for today</p>
        </GlassCard>
      ) : (
        <div className='relative space-y-0'>
          <div className='absolute left-4 top-4 bottom-4 w-px bg-border/80' />
          {schedule.map((item, index) => {
            const replacement = getReplacementForPeriod(item.periodId);

            return (
              <div
                key={`${item.periodId}-${index}`}
                className='relative pl-12 pb-6'
              >
                <div
                  className={cn(
                    'absolute left-3 top-5 h-3 w-3 rounded-full ring-4 ring-background',
                    replacement?.status === 'confirmed'
                      ? 'bg-indigo-500'
                      : item.isAbsent
                        ? 'bg-rose-500'
                        : 'bg-emerald-500'
                  )}
                />
                <GlassCard
                  className={cn(
                    'p-5 transition-all hover:shadow-lg',
                    replacement?.status === 'confirmed' && 'border-indigo-500/30',
                    item.isAbsent && 'border-rose-500/30 bg-rose-500/5'
                  )}
                >
                  <div className='flex flex-col sm:flex-row sm:items-start justify-between gap-3'>
                    <div>
                      <p className='text-xs text-muted-foreground flex items-center gap-1'>
                        <Clock className='h-3 w-3' />
                        {item.startTime} – {item.endTime}
                      </p>
                      <h3 className='text-lg font-semibold mt-1'>{item.className}</h3>
                      <p className='text-sm text-muted-foreground'>{item.subjectName}</p>
                    </div>
                    <span className='text-xs font-medium px-2.5 py-1 rounded-full bg-muted'>
                      Period {item.periodNumber}
                    </span>
                  </div>

                  <div className='flex flex-wrap gap-2 mt-4'>
                    {item.isAbsent && (
                      <span className='px-3 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-600'>
                        Marked absent
                      </span>
                    )}
                    {replacement ? (
                      <>
                        <span className='px-3 py-1 rounded-full text-xs bg-muted'>
                          Reason: {replacement.reason}
                        </span>
                        <span
                          className={cn(
                            'px-3 py-1 rounded-full text-xs font-medium',
                            replacement.status === 'pending'
                              ? 'bg-amber-500/15 text-amber-600'
                              : 'bg-emerald-500/15 text-emerald-600'
                          )}
                        >
                          {replacement.status}
                        </span>
                      </>
                    ) : (
                      <span className='px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600'>
                        Scheduled
                      </span>
                    )}
                  </div>
                </GlassCard>
                {index < schedule.length - 1 && (
                  <div className='h-2' aria-hidden />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className='mt-8 grid grid-cols-3 gap-3'>
        {[
          { label: 'Classes', value: schedule.length },
          { label: 'Covers', value: replacements.length },
          { label: 'Absent', value: schedule.filter((s) => s.isAbsent).length },
        ].map((s) => (
          <GlassCard key={s.label} className='p-4 text-center'>
            <p className='text-xs text-muted-foreground'>{s.label}</p>
            <p className='text-xl font-bold mt-1'>{s.value}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
