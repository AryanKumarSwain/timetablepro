'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getAdminReports,
  getClasses,
  getSubjects,
  type DailyReportData,
} from '@/lib/api-services';
import type { Class, Subject } from '@/lib/types';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import {
  DataGrid,
  DataGridTable,
  DataGridHead,
  DataGridRow,
  DataGridTh,
  DataGridTd,
} from '@/components/enterprise/data-grid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Download, Eye } from 'lucide-react';

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

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [r, c, s] = await Promise.all([
        getAdminReports({
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

      <DataGrid title='Daily reports' empty={reports.length === 0}>
        <DataGridTable>
          <DataGridHead>
            <tr>
              <DataGridTh>Teacher</DataGridTh>
              <DataGridTh>Date</DataGridTh>
              <DataGridTh>Submitted At</DataGridTh>
              <DataGridTh>Entries</DataGridTh>
              <DataGridTh>Status</DataGridTh>
              <DataGridTh>Actions</DataGridTh>
            </tr>
          </DataGridHead>
          <tbody>
            {reports.map((r) => (
              <DataGridRow key={r.id}>
                <DataGridTd className='font-medium'>{r.teacherName}</DataGridTd>
                <DataGridTd>{r.reportDate}</DataGridTd>
                <DataGridTd className='text-muted-foreground'>
                  {r.submittedAt
                    ? new Date(r.submittedAt).toLocaleString()
                    : '—'}
                </DataGridTd>
                <DataGridTd>{r.entryCount ?? r.entries.length}</DataGridTd>
                <DataGridTd>
                  <Badge
                    variant='outline'
                    className={cn(
                      r.status === 'SUBMITTED'
                        ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
                        : 'border-amber-500/30 text-amber-600 bg-amber-500/10'
                    )}
                  >
                    {r.status}
                  </Badge>
                </DataGridTd>
                <DataGridTd>
                  <div className='flex gap-2'>
                    <Button size='sm' variant='outline' asChild>
                      <Link href={`/admin/reports/${r.id}`}>
                        <Eye className='h-3.5 w-3.5 mr-1' />
                        View
                      </Link>
                    </Button>
                    <Button size='sm' variant='outline' asChild>
                      <a href={`/api/admin/reports/${r.id}/csv`} download>
                        CSV
                      </a>
                    </Button>
                    <Button size='sm' variant='outline' asChild>
                      <a href={`/api/admin/reports/${r.id}/pdf`} download>
                        <Download className='h-3.5 w-3.5' />
                      </a>
                    </Button>
                  </div>
                </DataGridTd>
              </DataGridRow>
            ))}
          </tbody>
        </DataGridTable>
      </DataGrid>
    </div>
  );
}
