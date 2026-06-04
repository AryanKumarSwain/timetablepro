"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getDraftReportToday,
  getReportClassesToday,
  submitReport,
  type DailyReportData,
} from '@/lib/api-services';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

function splitDescription(desc = '') {
  const marker = '\n\nTLM:';
  const idx = desc.indexOf(marker);
  if (idx === -1) {
    return { description: desc, tlm: '' };
  }
  return {
    description: desc.slice(0, idx),
    tlm: desc.slice(idx + marker.length).trim(),
  };
}

export default function TeacherReportsPage() {
  const auth = useRequireAuth('teacher');
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [rows, setRows] = useState<Array<{ entryId?: string; classId: string; className: string; subjectId: string; subjectName: string; description: string; tlm: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      void load();
    }
  }, [auth.loading, auth.user]);

  const load = async () => {
    try {
      setLoading(true);
      setLoadMessage(null);

      let existingReport: DailyReportData | null = null;
      let scheduleSlots: DailyReportData['scheduleSlots'] = [];

      try {
        existingReport = await getDraftReportToday();
      } catch (error) {
        console.warn('Draft report not found, loading assigned classes.', error);
      }

      if (existingReport && existingReport.entries.length > 0) {
        setReport(existingReport);
        setRows(
          existingReport.entries.map((entry) => {
            const { description, tlm } = splitDescription(entry.description);
            return {
              entryId: entry.id,
              classId: entry.classId,
              className: entry.className,
              subjectId: entry.subjectId,
              subjectName: entry.subjectName,
              description,
              tlm,
            };
          })
        );
      } else {
        const classData = await getReportClassesToday();
        scheduleSlots = classData.scheduleSlots ?? [];
        setReport(existingReport);
        setRows(
          scheduleSlots.map((slot) => ({
            classId: slot.classId,
            className: slot.className,
            subjectId: slot.subjectId,
            subjectName: slot.subjectName,
            description: '',
            tlm: '',
          }))
        );

        if (scheduleSlots.length === 0) {
          setLoadMessage(
            'No scheduled classes were found for today. Please verify your published timetable and teacher assignments.'
          );
        }
      }
    } catch (e) {
      console.error(e);
      setLoadMessage('Unable to load today\'s scheduled classes. Please refresh or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const readOnly = useMemo(() => report?.status === 'SUBMITTED', [report]);

  const updateRow = (idx: number, patch: Partial<{ description: string; tlm: string }>) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const handleSubmit = async () => {
    if (rows.length === 0) return;
    setSubmitting(true);
    try {
      const entriesPayload = rows.map((r) => ({
        id: r.entryId,
        classId: r.classId,
        subjectId: r.subjectId,
        description: `${r.description}${r.tlm ? `\n\nTLM: ${r.tlm}` : ''}`,
        isCompleted: true,
      }));

      const updatedReport = await submitReport({
        reportId: report?.id,
        date: 'today',
        status: 'SUBMITTED',
        entries: entriesPayload,
      });

      setReport(updatedReport);
      setRows(
        updatedReport.entries.map((entry) => {
          const { description, tlm } = splitDescription(entry.description);
          return {
            entryId: entry.id,
            classId: entry.classId,
            className: entry.className,
            subjectId: entry.subjectId,
            subjectName: entry.subjectName,
            description,
            tlm,
          };
        })
      );
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className='max-w-3xl mx-auto'>
        <PageSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className='max-w-3xl mx-auto space-y-6'>
      <PageHeader title="Daily Lesson Report" description="Submit today's lesson details" />

      {rows.length === 0 ? (
        <GlassCard className='p-12 text-center'>
          {loadMessage ?? 'No scheduled classes for today.'}
        </GlassCard>
      ) : (
        <div className='space-y-4'>
          {rows.map((r, i) => (
            <GlassCard key={`${r.classId}-${r.subjectId}-${i}`} className='p-4'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <h3 className='font-bold'>{r.subjectName}</h3>
                  <p className='text-sm text-muted-foreground'>Class {r.className}</p>
                </div>
                <div className='w-1/3'>
                  <label className='text-xs font-semibold'>TLM (used / lab visits)</label>
                  <Input value={r.tlm} onChange={(e) => updateRow(i, { tlm: e.target.value })} readOnly={readOnly} className='mt-2' />
                </div>
              </div>

              <div className='mt-3'>
                <label className='text-xs font-semibold'>What was taught in today's class?</label>
                <Textarea value={r.description} onChange={(e) => updateRow(i, { description: e.target.value })} readOnly={readOnly} className='mt-2' />
              </div>
            </GlassCard>
          ))}

          {!readOnly && (
            <div className='flex justify-end'>
              <Button size='lg' onClick={() => void handleSubmit()} disabled={submitting} className={cn('rounded-xl')}>{submitting ? 'Submitting…' : 'Submit Report'}</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
