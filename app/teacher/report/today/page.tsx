'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getTodayScheduleForTeacher,
  getTeacherReport,
  updateTeacherReport,
  type DailyReportData,
} from '@/lib/api-services';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { GlassCard } from '@/components/enterprise/glass-card';
import { ReportEntryCard } from '@/components/reports/report-entry-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

export default function TeacherReportTodayPage() {
  const auth = useRequireAuth('teacher');
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [scheduleSlots, setScheduleSlots] = useState<DailyReportData['scheduleSlots']>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);

      // Send today's formatted local ISO date instead of literal string fallback
      const localISODate = new Date().toISOString().split('T')[0];
      const data = await getTeacherReport(localISODate).catch(() => getTeacherReport('today'));

      setReport(data);
      setSubmitted(data?.status === 'SUBMITTED');

      if (data?.scheduleSlots && data.scheduleSlots.length > 0) {
        // Sort sequentially here
        const sortedSlots = [...data.scheduleSlots].sort((a, b) => Number(a.periodNumber) - Number(b.periodNumber));
        setScheduleSlots(sortedSlots);
      } else if (auth.user?.teacherId) {
        const fallback = await getTodayScheduleForTeacher(auth.user.teacherId);
        const sortedFallback = fallback
          .map((slot) => ({
            periodId: slot.periodId,
            periodNumber: slot.periodNumber,
            startTime: slot.startTime,
            endTime: slot.endTime,
            classId: slot.classId,
            className: slot.className,
            subjectId: slot.subjectId,
            subjectName: slot.subjectName,
          }))
          .sort((a, b) => Number(a.periodNumber) - Number(b.periodNumber)); // Added sequential sorting layer

        setScheduleSlots(sortedFallback);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [auth.user?.teacherId]);

  useEffect(() => {
    if (!auth.loading) {
      void load();
    }
  }, [load, auth.loading]);

  const getEntryForSlot = (classId: string, subjectId: string) => {
    if (!report?.entries) return null;
    return report.entries.find((e) => e.classId === classId && e.subjectId === subjectId);
  };

  const persistEntries = useCallback(
    (entries: DailyReportData['entries']) => {
      if (!report || report.status === 'SUBMITTED') return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void updateTeacherReport(report.id, {
          entries: entries.map((e) => ({
            id: e.id,
            description: e.description || '',
            isCompleted: !!e.isCompleted,
          })),
        }).catch(console.error);
      }, 1000);
    },
    [report]
  );

  const updateEntry = (
    slotClassId: string,
    slotSubjectId: string,
    patch: { description?: string; isCompleted?: boolean }
  ) => {
    if (!report || report.status === 'SUBMITTED') return;

    const existingEntries = report.entries ? [...report.entries] : [];
    const entryIndex = existingEntries.findIndex(
      (e) => e.classId === slotClassId && e.subjectId === slotSubjectId
    );

    if (entryIndex !== -1) {
      existingEntries[entryIndex] = { ...existingEntries[entryIndex], ...patch };
    } else {
      // Self-healing fallback layer to generate missing elements cleanly
      existingEntries.push({
        id: `temp-${Date.now()}`,
        classId: slotClassId,
        subjectId: slotSubjectId,
        description: patch.description ?? '',
        isCompleted: patch.isCompleted ?? false,
      });
    }

    const nextReport = { ...report, entries: existingEntries };
    setReport(nextReport);
    persistEntries(existingEntries);
  };

  const handleSubmit = async () => {
    if (!report) return;
    setSubmitting(true);
    try {
      const updated = await updateTeacherReport(report.id, {
        status: 'SUBMITTED',
        entries: (report.entries || []).map((e) => ({
          id: e.id,
          description: e.description || '',
          isCompleted: !!e.isCompleted,
        })),
      });
      setReport(updated);
      setSubmitted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className='max-w-3xl mx-auto'>
        <PageSkeleton rows={3} />
      </div>
    );
  }

  const readOnly = report?.status === 'SUBMITTED';

  return (
    <div className='max-w-3xl mx-auto'>
      <PageHeader
        title="Today's Report"
        description={todayLabel}
        breadcrumbs={[
          { label: 'Teacher', href: '/teacher/weekly-schedule' },
          { label: "Today's Report" },
        ]}
      />

      {readOnly && (
        <div className={cn(
          'mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/30',
          'bg-emerald-500/10 px-4 py-3 text-emerald-700 dark:text-emerald-400'
        )}>
          <CheckCircle2 className='h-5 w-5' />
          <span className='font-medium'>Report submitted</span>
          <Badge variant='outline' className='ml-auto border-emerald-500/30'>SUBMITTED</Badge>
        </div>
      )}

      {scheduleSlots.length === 0 ? (
        <GlassCard className='p-12 text-center'>
          <p className='text-muted-foreground'>No classes scheduled for today</p>
        </GlassCard>
      ) : (
        <div className='space-y-4'>
          {scheduleSlots.map((slot, index) => {
            const entry = getEntryForSlot(slot.classId, slot.subjectId);
            return (
              <ReportEntryCard
                key={`${slot.periodId}-${slot.classId}-${index}`}
                periodLabel={`Period ${slot.periodNumber}`}
                timeRange={`${slot.startTime}–${slot.endTime}`}
                className={slot.className}
                subjectName={slot.subjectName}
                description={entry?.description ?? ''}
                isCompleted={entry?.isCompleted ?? false}
                readOnly={readOnly}
                onDescriptionChange={(v) => updateEntry(slot.classId, slot.subjectId, { description: v })}
                onCompletedChange={(v) => updateEntry(slot.classId, slot.subjectId, { isCompleted: v })}
              />
            );
          })}
        </div>
      )}

      {!readOnly && scheduleSlots.length > 0 && (
        <div className='mt-8 flex justify-end'>
          <Button
            size='lg'
            className='rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600'
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? 'Submitting…' : 'Submit Report'}
          </Button>
        </div>
      )}

      {submitted && (
        <p className='text-sm text-emerald-600 mt-4 text-center'>
          Report submitted successfully!
        </p>
      )}
    </div>
  );
}