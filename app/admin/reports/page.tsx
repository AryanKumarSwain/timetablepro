'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getReports,
  getClasses,
  getSubjects,
  getDailyDeskGrid,
  downloadReportsCsv,
  type DailyReportData,
} from '@/lib/api-services';
import type { Class, Subject } from '@/lib/types';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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

export default function AdminReportsPage() {
  useRequireAuth('admin');

  const [reports, setReports] = useState<DailyReportData[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherName, setTeacherName] = useState('');
  const [date, setDate] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [currentGrid, setCurrentGrid] = useState<any | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [r, c, s] = await Promise.all([
        getReports({
          teacherName: teacherName || undefined,
          date: date || undefined,
          classId: classId || undefined,
          subjectId: subjectId || undefined,
        }),
        getClasses(),
        getSubjects(),
      ]);
      setReports(r);
      setClasses(c);
      setSubjects(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [teacherName, date, classId, subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetails = async (d: string) => {
    setOpenDate(d);
    try {
      const grid = await getDailyDeskGrid(d);
      setCurrentGrid(grid);
    } catch (e) {
      console.error(e);
      setCurrentGrid(null);
    }
  };

  const exportDateCsv = async (d: string) => {
    try {
      // CRITICAL FIX: Ensure the date passed to the API is strictly YYYY-MM-DD
      const cleanDate = d.includes('T') ? d.split('T')[0] : d;
      const blob = await downloadReportsCsv(cleanDate);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports-${cleanDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Unable to download report CSV.');
    }
  };

  // CRITICAL FIX: Normalize keys to standard YYYY-MM-DD strings so array grouping works perfectly
  const byDate = reports.reduce((acc: Record<string, DailyReportData[]>, r) => {
    if (!r.reportDate) return acc;
    const cleanKey = String(r.reportDate).includes('T') 
      ? String(r.reportDate).split('T')[0] 
      : String(r.reportDate);
      
    (acc[cleanKey] ||= []).push(r);
    return acc;
  }, {} as Record<string, DailyReportData[]>);

  if (loading) {
    return (
      <div className='max-w-7xl mx-auto'>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto'>
      <PageHeader
        title='Reports'
        description='Review submitted daily teaching reports'
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Reports' },
        ]}
      />

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6'>
        <Input
          placeholder='Search teacher name'
          value={teacherName}
          onChange={(e) => setTeacherName(e.target.value)}
        />
        <Input type='date' value={date} onChange={(e) => setDate(e.target.value)} />
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className='px-3 py-2 rounded-xl border border-border bg-background text-sm'
        >
          <option value=''>All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className='px-3 py-2 rounded-xl border border-border bg-background text-sm'
        >
          <option value=''>All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        {Object.keys(byDate)
          .sort((a, b) => b.localeCompare(a))
          .map((d) => {
            const list = byDate[d];
            const submitted = list.filter((x) => x.status === 'SUBMITTED').length;
            return (
              <div key={d} className='p-4 bg-white rounded-2xl border shadow-sm'>
                <div className='flex items-start justify-between gap-2'>
                  <div>
                    <div className='text-sm font-bold'>{d}</div>
                    <div className='text-xs text-muted-foreground'>{list.length} reports — {submitted} submitted</div>
                  </div>
                  <div className='flex gap-2'>
                    <Button size='sm' variant='ghost' onClick={() => openDetails(d)}>
                      <Eye className='h-4 w-4' />
                    </Button>
                    <Button size='sm' variant='outline' onClick={() => exportDateCsv(d)}>
                      <Download className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <Dialog open={!!openDate} onOpenChange={(v) => { if (!v) setOpenDate(null); }}>
        <DialogContent className='sm:max-w-4xl max-h-[80vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Reports for {openDate}</DialogTitle>
            <DialogDescription>Submitted and pending reports</DialogDescription>
          </DialogHeader>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
            <div>
              <h4 className='font-bold mb-2'>Submitted Reports</h4>
              {(byDate[openDate ?? ''] || []).filter((r) => r.status === 'SUBMITTED').map((r) => (
                <GlassCard key={r.id} className='mb-2 p-3'>
                  <div className='text-sm font-semibold'>{r.teacherName}</div>
                  <div className='text-xs text-muted-foreground'>{r.entries.map((e) => `${e.className} · ${e.subjectName}`).join(', ')}</div>
                  <div className='mt-2 text-sm whitespace-pre-wrap'>
                    {r.entries.map((e) => {
                      const { description, tlm } = splitDescription(e.description);
                      return (
                        <div key={e.id} className='mb-3'>
                          <div className='font-medium'>{e.className} • {e.subjectName}</div>
                          <div>{description || <span className='text-muted-foreground'>No description provided.</span>}</div>
                          {tlm ? <div className='text-xs text-muted-foreground mt-1'>TLM: {tlm}</div> : null}
                        </div>
                      );
                    })}
                  </div>
                </GlassCard>
              ))}
            </div>
            <div>
              <h4 className='font-bold mb-2'>Pending / Non-Submitted Faculty</h4>
              {currentGrid ? (
                (() => {
                  const teachers = new Map<string, string>();
                  
                  if (currentGrid.grid && Array.isArray(currentGrid.grid)) {
                    currentGrid.grid.forEach((row: any) => {
                      if (row?.cells && Array.isArray(row.cells)) {
                        row.cells.forEach((c: any) => {
                          if (c && !c.empty && c.teacherId) {
                            teachers.set(String(c.teacherId), String(c.teacherName));
                          }
                        });
                      }
                    });
                  }

                  const matchingDayReports = byDate[openDate ?? ''] || [];
                  const submittedIds = new Set(
                    matchingDayReports
                      .filter((r) => r.status === 'SUBMITTED')
                      .map((r) => String(r.teacherId))
                  );

                  const pending = Array.from(teachers.entries()).filter(([id]) => !submittedIds.has(id));

                  return pending.length === 0 ? (
                    <div className='text-sm text-muted-foreground bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 text-emerald-700'>
                      All scheduled teachers submitted.
                    </div>
                  ) : (
                    <div className='space-y-2 max-h-[400px] overflow-y-auto pr-1'>
                      {pending.map(([id, name]) => (
                        <div key={id} className='p-3 rounded-xl border bg-muted/30 flex items-center justify-between'>
                          <span className='text-sm font-medium'>{name}</span>
                          <span className='text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 font-medium'>
                            Pending
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                <div className='text-sm text-muted-foreground p-3 border border-dashed rounded-xl text-center'>
                  No schedule layout active for this date range.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// FIXED API FETCH HANDLER
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const fullUrl = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(fullUrl, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    credentials: 'include',
  });

  const text = await res.text().catch(() => '');

  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    const errorMessage =
      typeof parsed === 'object' && parsed !== null && 'error' in parsed
        ? String((parsed as { error?: unknown }).error)
        : typeof parsed === 'string'
          ? parsed
          : `Request failed (${res.status})`;

    console.error('[apiFetch]', {
      path: fullUrl,
      status: res.status,
      errorMessage,
      parsed,
    });

    throw new Error(errorMessage);
  }

  if (res.status === 204 || text.length === 0) {
    return undefined as T;
  }

  return parsed as T;
}

export { apiFetch };