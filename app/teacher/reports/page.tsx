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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Helper to separate text from comma-separated items
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

// 1. Tag Input UI Component matching image_c2c9ff.png
interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  readOnly?: boolean;
  placeholder?: string;
}

function TagInput({ tags, onChange, readOnly, placeholder = "Add item..." }: TagInputProps) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim().replace(/,+/g, ''); // strip out raw commas
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border rounded-xl bg-background/50 min-h-[90px] content-start items-center focus-within:ring-2 focus-within:ring-ring">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 bg-[#f3f4f6] text-[#374151] text-xs font-medium px-2 py-1 rounded-md border border-gray-200/60 shadow-sm"
        >
          {tag}
          {!readOnly && (
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="text-gray-400 hover:text-gray-600 transition-colors font-bold text-[9px] w-3.5 h-3.5 flex items-center justify-center rounded-full bg-gray-200/40 hover:bg-gray-200"
            >
              ✕
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 bg-transparent border-0 outline-none p-0 text-sm min-w-[70px] focus:ring-0 focus:outline-none placeholder:text-xs text-foreground"
        />
      )}
    </div>
  );
}

export default function TeacherReportsPage() {
  const auth = useRequireAuth('teacher');
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [rows, setRows] = useState<Array<{ entryId?: string; classId: string; className: string; subjectId: string; subjectName: string; description: string; tlm: string[] }>>([]);
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
              // Convert stored comma-separated layout string into structural array arrays
              tlm: tlm ? tlm.split(',').map(t => t.trim()).filter(Boolean) : [],
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
            tlm: [],
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

  const updateRow = (idx: number, patch: Partial<{ description: string; tlm: string[] }>) => {
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
      const entriesPayload = rows.map((r) => {
        const tlmString = r.tlm.join(', ');
        return {
          id: r.entryId,
          classId: r.classId,
          subjectId: r.subjectId,
          description: `${r.description}${tlmString ? `\n\nTLM: ${tlmString}` : ''}`,
          isCompleted: true,
        };
      });

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
            tlm: tlm ? tlm.split(',').map(t => t.trim()).filter(Boolean) : [],
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
    <div className='max-w-4xl mx-auto space-y-6'>
      <PageHeader title="Daily Lesson Report" description="Submit today's lesson details" />

      {rows.length === 0 ? (
        <GlassCard className='p-12 text-center'>
          {loadMessage ?? 'No scheduled classes for today.'}
        </GlassCard>
      ) : (
        <div className='space-y-4'>
          {rows.map((r, i) => (
            <GlassCard key={`${r.classId}-${r.subjectId}-${i}`} className='p-5'>
              {/* Header Title Section */}
              <div className='border-b pb-2 mb-3'>
                <h3 className='font-bold text-lg'>{r.subjectName}</h3>
                <p className='text-xs text-muted-foreground font-medium uppercase tracking-wider'>Class {r.className}</p>
              </div>

              {/* 2. Side-by-Side Flexbox Layout */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-start'>
                {/* Description Element Box (Takes up 2/3 width) */}
                <div className='md:col-span-2'>
                  <label className='text-xs font-semibold text-muted-foreground'>What was taught in today's class?</label>
                  <Textarea 
                    value={r.description} 
                    onChange={(e) => updateRow(i, { description: e.target.value })} 
                    readOnly={readOnly} 
                    placeholder="Enter structural learning details..."
                    className='mt-1.5 min-h-[90px] resize-none' 
                  />
                </div>

                {/* TLM Pill Box Element (Takes up 1/3 width, positioned right beside description) */}
                <div className='md:col-span-1'>
                  <label className='text-xs font-semibold text-muted-foreground'>TLM Materials Used</label>
                  <div className="mt-1.5">
                    <TagInput 
                      tags={r.tlm} 
                      onChange={(tags) => updateRow(i, { tlm: tags })} 
                      readOnly={readOnly} 
                      placeholder="Type material & press Enter" 
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}

          {!readOnly && (
            <div className='flex justify-end'>
              <Button size='lg' onClick={() => void handleSubmit()} disabled={submitting} className={cn('rounded-xl px-8')}>
                {submitting ? 'Submitting…' : 'Submit Report'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}