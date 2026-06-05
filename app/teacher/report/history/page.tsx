'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import { getTeacherReportHistory, type DailyReportData } from '@/lib/api-services';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { GlassCard } from '@/components/enterprise/glass-card';
import { ReportHistoryRow } from '@/components/reports/report-history-row';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function TeacherReportHistoryPage() {
  useRequireAuth('teacher');

  const [reports, setReports] = useState<DailyReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Search/Filter state parameters
  const [searchDate, setSearchDate] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    void getTeacherReportHistory()
      .then((data) => {
        const normalizedReports = (data || []).map((report) => {
          if (!report.reportDate) return report;
          const d = new Date(report.reportDate);
          if (isNaN(d.getTime())) return report;

          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          
          return {
            ...report,
            reportDate: `${yyyy}-${mm}-${dd}`, 
          };
        });
        setReports(normalizedReports);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchDate, selectedClass]);

  // Extract unique classes for dropdown matching
  const uniqueClasses = useMemo(() => {
    const classSet = new Set<string>();
    reports.forEach((report) => {
      (report.entries || []).forEach((entry) => {
        if (entry.class?.name) {
          classSet.add(entry.class.name);
        } else if ((entry as any).className) {
          classSet.add((entry as any).className);
        }
      });
    });
    return Array.from(classSet).sort();
  }, [reports]);

  // Apply filters to data list parameters
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (searchDate && report.reportDate !== searchDate) {
        return false;
      }

      if (selectedClass !== 'all') {
        const matchesClass = (report.entries || []).some((entry) => {
          const currentName = entry.class?.name || (entry as any).className || '';
          return currentName.toLowerCase() === selectedClass.toLowerCase();
        });
        if (!matchesClass) return false;
      }

      return true;
    });
  }, [reports, searchDate, selectedClass]);

  // ─── PAGINATION COMPILATION RUNNERS ───
  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE) || 1;

  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReports.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredReports, currentPage]);

  const hasActiveFilters = searchDate !== '' || selectedClass !== 'all';

  const handleResetFilters = () => {
    setSearchDate('');
    setSelectedClass('all');
  };

  if (loading) {
    return (
      <div className='max-w-3xl mx-auto'>
        <PageSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className='max-w-3xl mx-auto space-y-6 pb-12'>
      <PageHeader
        title='Report History'
        description='Your past daily teaching reports'
        breadcrumbs={[
          { label: 'Teacher', href: '/teacher/schedule' },
          { label: 'Report History' },
        ]}
      />

      {/* Filter panel deck */}
      <GlassCard className="p-4 bg-card/40 border border-muted/50 rounded-xl">
        <div className="flex flex-col sm:flex-row gap-4 items-end justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:max-w-xl">
            
            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Search by Date</label>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full text-sm bg-background border border-input rounded-lg h-9 px-3 focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
              />
            </div>

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Filter by Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full text-sm bg-background border border-input rounded-lg h-9 px-2 focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
              >
                <option value="all">All Classes</option>
                {uniqueClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-2 rounded-lg transition-colors w-full sm:w-auto text-center"
            >
              Clear Filters
            </button>
          )}
        </div>
      </GlassCard>

      {/* Historical rows item output frame viewport */}
      {paginatedReports.length === 0 ? (
        <GlassCard className='p-12 text-center border border-muted/40'>
          <p className='text-muted-foreground font-medium'>
            {hasActiveFilters 
              ? 'No reports match your chosen date and class criteria.' 
              : 'No reports yet.'
            }
          </p>
        </GlassCard>
      ) : (
        <div className='space-y-2'>
          {paginatedReports.map((r) => (
            <ReportHistoryRow
              key={r.id}
              report={r}
              expanded={expandedId === r.id}
              onToggle={() =>
                setExpandedId(expandedId === r.id ? null : r.id)
              }
            />
          ))}

          {/* ─── PAGINATION NAV CONTROLS DECK ─── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 px-2">
              <div className="text-xs text-muted-foreground font-medium">
                Showing entries <span className="font-semibold text-foreground">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span>–
                <span className="font-semibold text-foreground">{Math.min(currentPage * ITEMS_PER_PAGE, filteredReports.length)}</span> of{' '}
                <span className="font-semibold text-foreground">{filteredReports.length}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-input bg-background text-foreground transition-all hover:bg-muted disabled:opacity-40 disabled:hover:bg-background cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <div className="text-xs font-semibold px-2">
                  Page {currentPage} of {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-input bg-background text-foreground transition-all hover:bg-muted disabled:opacity-40 disabled:hover:bg-background cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}