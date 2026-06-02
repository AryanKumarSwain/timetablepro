'use client';

import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import { getTeacherReportHistory, type DailyReportData } from '@/lib/api-services';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { GlassCard } from '@/components/enterprise/glass-card';
import { ReportHistoryRow } from '@/components/reports/report-history-row';

export default function TeacherReportHistoryPage() {
  useRequireAuth('teacher');

  const [reports, setReports] = useState<DailyReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    void getTeacherReportHistory()
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className='max-w-3xl mx-auto'>
        <PageSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className='max-w-3xl mx-auto'>
      <PageHeader
        title='Report History'
        description='Your past daily teaching reports'
        breadcrumbs={[
          { label: 'Teacher', href: '/teacher/schedule' },
          { label: 'Report History' },
        ]}
      />

      {reports.length === 0 ? (
        <GlassCard className='p-12 text-center'>
          <p className='text-muted-foreground'>No reports yet</p>
        </GlassCard>
      ) : (
        <div className='space-y-2'>
          {reports.map((r) => (
            <ReportHistoryRow
              key={r.id}
              report={r}
              expanded={expandedId === r.id}
              onToggle={() =>
                setExpandedId(expandedId === r.id ? null : r.id)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
