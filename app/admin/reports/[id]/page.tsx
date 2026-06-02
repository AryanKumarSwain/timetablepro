'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/auth-context';
import { getAdminReport, type DailyReportData } from '@/lib/api-services';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { GlassCard } from '@/components/enterprise/glass-card';
import {
  DataGrid,
  DataGridTable,
  DataGridHead,
  DataGridRow,
  DataGridTh,
  DataGridTd,
} from '@/components/enterprise/data-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AdminReportDetailPage() {
  useRequireAuth('admin');
  const params = useParams();
  const id = String(params.id);
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getAdminReport(id)
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !report) {
    return (
      <div className='max-w-4xl mx-auto'>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className='max-w-4xl mx-auto'>
      <PageHeader
        title={`${report.teacherName} — ${report.reportDate}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Reports', href: '/admin/reports' },
          { label: report.teacherName },
        ]}
        actions={
          <div className='flex gap-2'>
            <Button variant='outline' asChild>
              <a href={`/api/admin/reports/${id}/csv`} download>
                CSV
              </a>
            </Button>
            <Button variant='outline' asChild>
              <a href={`/api/admin/reports/${id}/pdf`} download>
                PDF
              </a>
            </Button>
          </div>
        }
      />

      <GlassCard className='p-6 mb-6'>
        <div className='grid sm:grid-cols-2 gap-4 text-sm'>
          <div>
            <p className='text-muted-foreground'>Teacher</p>
            <p className='font-semibold'>{report.teacherName}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Email</p>
            <p>{report.teacherEmail}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Report date</p>
            <p>{report.reportDate}</p>
          </div>
          <div>
            <p className='text-muted-foreground'>Status</p>
            <Badge
              variant='outline'
              className={cn(
                report.status === 'SUBMITTED'
                  ? 'border-emerald-500/30 text-emerald-600'
                  : 'border-amber-500/30 text-amber-600'
              )}
            >
              {report.status}
            </Badge>
          </div>
          {report.submittedAt && (
            <div className='sm:col-span-2'>
              <p className='text-muted-foreground'>Submitted at</p>
              <p>{new Date(report.submittedAt).toLocaleString()}</p>
            </div>
          )}
        </div>
      </GlassCard>

      <DataGrid title='Entries'>
        <DataGridTable>
          <DataGridHead>
            <tr>
              <DataGridTh>#</DataGridTh>
              <DataGridTh>Class</DataGridTh>
              <DataGridTh>Subject</DataGridTh>
              <DataGridTh>Description</DataGridTh>
              <DataGridTh>Completed</DataGridTh>
            </tr>
          </DataGridHead>
          <tbody>
            {report.entries.map((e, i) => (
              <DataGridRow key={e.id}>
                <DataGridTd>{i + 1}</DataGridTd>
                <DataGridTd>{e.className}</DataGridTd>
                <DataGridTd>{e.subjectName}</DataGridTd>
                <DataGridTd className='max-w-md'>{e.description || '—'}</DataGridTd>
                <DataGridTd>
                  {e.isCompleted ? (
                    <span className='text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600'>
                      Yes
                    </span>
                  ) : (
                    <span className='text-xs text-muted-foreground'>No</span>
                  )}
                </DataGridTd>
              </DataGridRow>
            ))}
          </tbody>
        </DataGridTable>
      </DataGrid>

      <div className='mt-4'>
        <Button variant='outline' asChild>
          <Link href='/admin/reports'>Back to reports</Link>
        </Button>
      </div>
    </div>
  );
}
