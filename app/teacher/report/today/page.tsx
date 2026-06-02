'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
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
  useRequireAuth('teacher');

  const [report, setReport] = useState<DailyReportData | null>(null);
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
      const data = await getTeacherReport('today');
      setReport(data);
      setSubmitted(data.status === 'SUBMITTED');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const scheduleSlots = report?.scheduleSlots ?? [];

  const getEntryForSlot = (classId: string, subjectId: string) =>
    report?.entries.find(
      (e) => e.classId === classId && e.subjectId === subjectId
    );

  const persistEntries = useCallback(
    (entries: DailyReportData['entries']) => {
      if (!report || report.status === 'SUBMITTED') return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void updateTeacherReport(report.id, {
          entries: entries.map((e) => ({
            id: e.id,
            description: e.description,
            isCompleted: e.isCompleted,
          })),
        }).catch(console.error);
      }, 1000);
    },
    [report]
  );

  const updateEntry = (
    entryId: string,
    patch: { description?: string; isCompleted?: boolean }
  ) => {
    if (!report || report.status === 'SUBMITTED') return;
    const next = report.entries.map((e) =>
      e.id === entryId ? { ...e, ...patch } : e
    );
    setReport({ ...report, entries: next });
    persistEntries(next);
  };

  const handleSubmit = async () => {
    if (!report) return;
    setSubmitting(true);
    try {
      const updated = await updateTeacherReport(report.id, {
        status: 'SUBMITTED',
        entries: report.entries.map((e) => ({
          id: e.id,
          description: e.description,
          isCompleted: e.isCompleted,
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

  if (loading || !report) {
    return (
      <div className='max-w-3xl mx-auto'>
        <PageSkeleton rows={3} />
      </div>
    );
  }

  const readOnly = report.status === 'SUBMITTED';

  return (
    <div className='max-w-3xl mx-auto'>
      <PageHeader
        title="Today's Report"
        description={todayLabel}
        breadcrumbs={[
          { label: 'Teacher', href: '/teacher/schedule' },
          { label: "Today's Report" },
        ]}
      />

      {readOnly && (
        <div
          className={cn(
            'mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/30',
            'bg-emerald-500/10 px-4 py-3 text-emerald-700 dark:text-emerald-400'
          )}
        >
          <CheckCircle2 className='h-5 w-5' />
          <span className='font-medium'>Report submitted</span>
          <Badge variant='outline' className='ml-auto border-emerald-500/30'>
            SUBMITTED
          </Badge>
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
            if (!entry) return null;
            return (
              <ReportEntryCard
                key={`${slot.periodId}-${slot.classId}-${index}`}
                periodLabel={`Period ${slot.periodNumber}`}
                timeRange={`${slot.startTime}–${slot.endTime}`}
                className={slot.className}
                subjectName={slot.subjectName}
                description={entry.description}
                isCompleted={entry.isCompleted}
                readOnly={readOnly}
                onDescriptionChange={(v) =>
                  updateEntry(entry.id, { description: v })
                }
                onCompletedChange={(v) =>
                  updateEntry(entry.id, { isCompleted: v })
                }
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

      {submitted && !readOnly && (
        <p className='text-sm text-emerald-600 mt-4 text-center'>
          Report submitted successfully!
        </p>
      )}
    </div>
  );
}
