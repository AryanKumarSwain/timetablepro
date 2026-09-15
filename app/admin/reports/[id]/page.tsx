'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/auth-context';
import { getAdminReport, getSchoolDetails, type DailyReportData } from '@/lib/api-services';
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
import { FileText, FileSpreadsheet, FileCheck, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminReportDetailPage() {
  useRequireAuth('admin');
  const params = useParams();
  const id = String(params.id);
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [allowedFormats, setAllowedFormats] = useState<string[]>(['pdf']);
  const [planName, setPlanName] = useState<string>('Free');

  useEffect(() => {
    Promise.all([
      getAdminReport(id),
      getSchoolDetails().catch(() => null),
    ])
      .then(([reportData, schoolData]) => {
        setReport(reportData);
        if (schoolData) {
          setAllowedFormats(schoolData.exportFormats || schoolData.plan?.exportFormats || ['pdf']);
          setPlanName(schoolData.plan?.name || 'Free');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const isFormatAllowed = (fmt: string) => {
    const f = fmt.toLowerCase().trim();
    if (f === 'word' || f === 'docx') return allowedFormats.includes('docx') || allowedFormats.includes('word');
    return allowedFormats.includes(f);
  };

  const handleDownload = (format: 'pdf' | 'docx' | 'csv') => {
    if (!isFormatAllowed(format)) {
      const label = format === 'docx' ? 'Word (DOCX)' : format.toUpperCase();
      toast.error(`"${label}" export is not included in your ${planName} plan. Please upgrade.`);
      return;
    }
    window.open(`/api/admin/reports/${id}/${format}`, '_blank');
  };

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
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='gap-1.5 rounded-xl font-semibold'
              onClick={() => handleDownload('pdf')}
            >
              <FileText className='h-4 w-4 text-rose-500' />
              PDF
              {!isFormatAllowed('pdf') && <Lock className='h-3 w-3 opacity-60' />}
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='gap-1.5 rounded-xl font-semibold'
              onClick={() => handleDownload('docx')}
            >
              <FileCheck className='h-4 w-4 text-blue-500' />
              Word
              {!isFormatAllowed('docx') && <Lock className='h-3 w-3 opacity-60' />}
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='gap-1.5 rounded-xl font-semibold'
              onClick={() => handleDownload('csv')}
            >
              <FileSpreadsheet className='h-4 w-4 text-emerald-500' />
              CSV
              {!isFormatAllowed('csv') && <Lock className='h-3 w-3 opacity-60' />}
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
              <DataGridTh>Type</DataGridTh>
              <DataGridTh>Class</DataGridTh>
              <DataGridTh>Subject</DataGridTh>
              <DataGridTh>Details</DataGridTh>
              <DataGridTh>Completed</DataGridTh>
            </tr>
          </DataGridHead>
          <tbody>
            {report.entries.map((e, i) => {
              const isActivity = e.entryType === 'ACTIVITY';
              const entryLabel = isActivity ? 'Activity' : 'Classroom';
              const entryBadgeColor = isActivity ? 'bg-purple-500/15 text-purple-600' : 'bg-blue-500/15 text-blue-600';
              
              return (
                <DataGridRow key={e.id}>
                  <DataGridTd>{i + 1}</DataGridTd>
                  <DataGridTd>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${entryBadgeColor}`}>
                      {entryLabel}
                    </span>
                  </DataGridTd>
                  <DataGridTd>{e.className}</DataGridTd>
                  <DataGridTd>{e.subjectName}</DataGridTd>
                  <DataGridTd className='max-w-md'>
                    {isActivity ? (
                      <div className='space-y-1'>
                        {e.activityCategory && (
                          <div className='text-xs font-semibold text-purple-600'>
                            {e.activityCategory}
                          </div>
                        )}
                        {e.activityDescription && (
                          <div className='text-xs text-muted-foreground'>
                            {e.activityDescription}
                          </div>
                        )}
                        {e.learningOutcome && (
                          <div className='text-xs text-muted-foreground italic'>
                            Outcome: {e.learningOutcome}
                          </div>
                        )}
                        {e.evidenceFiles && e.evidenceFiles.length > 0 && (
                          <div className='space-y-1'>
                            <div className='text-xs font-semibold text-purple-600'>
                              Evidence Files ({e.evidenceFiles.length})
                            </div>
                            {e.evidenceFiles.some(f => (typeof f === 'string' ? f : f.url).startsWith('blob:')) && (
                              <div className='text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200'>
                                ⚠️ Some files need to be re-uploaded by the teacher
                              </div>
                            )}
                            <div className='flex flex-wrap gap-2'>
                              {e.evidenceFiles.map((file, idx) => {
                                const fileUrl = typeof file === 'string' ? file : file.url;
                                const fileName = typeof file === 'string' ? `File ${idx + 1}` : file.name;
                                const isBlobUrl = fileUrl.startsWith('blob:');

                                return (
                                  <div key={idx} className="flex items-center gap-1">
                                    {isBlobUrl ? (
                                      <span className="text-xs text-amber-600 italic">
                                        {fileName} (not accessible)
                                      </span>
                                    ) : (
                                      <a
                                        href={fileUrl}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className='text-xs text-blue-600 hover:text-blue-800 underline'
                                      >
                                        {fileName}
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className='text-xs'>{e.description || '—'}</div>
                    )}
                  </DataGridTd>
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
              );
            })}
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
