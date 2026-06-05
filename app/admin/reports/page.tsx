'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getAdminReports,
  getDailyDeskGrid,
  downloadReportsCsv,
  type DailyReportData,
} from '@/lib/api-services';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Eye, FileSpreadsheet, FileText, User, CalendarSearch } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function AdminReportsPage() {
  useRequireAuth('admin');

  const [reports, setReports] = useState<DailyReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherName, setTeacherName] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [currentGrid, setCurrentGrid] = useState<any | null>(null);

  // Calendar search input filter state
  const [calendarSearchDate, setCalendarSearchDate] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await getAdminReports({
        teacherName: teacherName || undefined,
      });
      setReports(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [teacherName]);

  useEffect(() => {
    void load();
  }, [load]);

  // Extract a clean unique list of teachers present across all fetched data records
  const uniqueTeachers = Array.from(
    new Map(
      reports
        .filter((r) => r.teacherId)
        .map((r) => [r.teacherId, { id: r.teacherId, name: r.teacherName }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Default selection fallback to handle instant loading initialization safely
  useEffect(() => {
    if (!selectedTeacherId && uniqueTeachers.length > 0) {
      setSelectedTeacherId(uniqueTeachers[0].id);
    }
  }, [uniqueTeachers, selectedTeacherId]);

  const selectedTeacherDetails = uniqueTeachers.find((t) => t.id === selectedTeacherId);
  const selectedTeacherReports = reports.filter((r) => r.teacherId === selectedTeacherId);

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
      const cleanDate = d.includes('T') ? d.split('T')[0] : d;
      const blob = await downloadReportsCsv(cleanDate);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all-reports-${cleanDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Unable to download report CSV.');
    }
  };

  const handleIndividualDownload = (reportId: string, format: 'pdf' | 'csv') => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    window.open(`${baseUrl}/api/admin/reports/${reportId}/${format}`, '_blank');
  };

  const handleIndividualView = (reportId: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    window.open(`${baseUrl}/api/admin/reports/${reportId}/pdf`, '_blank');
  };

  // Build structural date clusters for the right-hand layout navigator
  const byDate = reports.reduce((acc: Record<string, DailyReportData[]>, r) => {
    if (!r.reportDate) return acc;
    const cleanKey = String(r.reportDate).includes('T') ? String(r.reportDate).split('T')[0] : String(r.reportDate);
    (acc[cleanKey] ||= []).push(r);
    return acc;
  }, {} as Record<string, DailyReportData[]>);

  // Dynamic filter loop matching target search criteria against date tags
  const sortedFilteredDates = useMemo(() => {
    return Object.keys(byDate)
      .filter((d) => {
        if (!calendarSearchDate) return true;
        return d.includes(calendarSearchDate);
      })
      .sort((a, b) => b.localeCompare(a));
  }, [byDate, calendarSearchDate]);

  if (loading && reports.length === 0) {
    return (
      <div className='max-w-7xl mx-auto px-4 py-6'>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto px-4 py-6 space-y-6'>
      {/* 1. TOP ELEMENT: PAGE HEADER SECTION */}
      <PageHeader
        title='Reports'
        description='Review submitted daily teaching reports'
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Reports' }]}
      />

      {/* 2. SHARED FILTER TOOLBAR SYSTEM
          Uses the exact same grid layout breakdown as the cards below (9 cols vs 3 cols) 
          so the search boxes align flawlessly with their respective sections.
      */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-center'>
        {/* Left Side Filter Container */}
        <div className='lg:col-span-9'>
          <div className='max-w-sm'>
            <Input
              placeholder='Search teacher name...'
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
            />
          </div>
        </div>
        
        {/* Right Side Filter Container: Now matches baseline rows perfectly */}
        <div className='lg:col-span-3'>
          <div className="relative flex items-center">
            <CalendarSearch className="absolute left-2.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={calendarSearchDate}
              onChange={(e) => setCalendarSearchDate(e.target.value)}
              className="w-full text-xs bg-white border border-gray-200 hover:bg-gray-50 focus:bg-white rounded-lg h-9 pl-8 pr-2 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 shadow-xs transition-all"
            />
            {calendarSearchDate && (
              <button 
                onClick={() => setCalendarSearchDate('')}
                className="absolute right-2 text-[10px] bg-gray-200/80 hover:bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. CORE DISPLAY MATRIX GRID SYSTEM */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
        
        {/* MAIN PANEL CONTENT GROUPS (LEFT + MIDDLE PANELS) */}
        <div className='lg:col-span-9 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-6 items-start'>
          
          {/* PANEL A: LEFT-HAND TEACHERS SELECTION TRACKER LIST */}
          <div className='md:col-span-1 lg:col-span-3 space-y-2 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm'>
            <h4 className='font-bold text-xs uppercase tracking-wider text-gray-400 px-2 mb-2'>Faculty Roster</h4>
            <div className='space-y-1 h-[240px] overflow-y-auto pr-1 scrollbar-thin'>
              {uniqueTeachers.length === 0 ? (
                <div className='text-xs text-center py-4 text-gray-400'>No faculty found</div>
              ) : (
                uniqueTeachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => setSelectedTeacherId(teacher.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2.5 ${
                      selectedTeacherId === teacher.id
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 pl-2 shadow-xs'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <User className={`h-4 w-4 ${selectedTeacherId === teacher.id ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className='truncate'>{teacher.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* PANEL B: MIDDLE VIEW - LOGGED ENTRIES HISTORY */}
          <div className='md:col-span-2 lg:col-span-6 space-y-4'>
            <div className='p-4 bg-white rounded-2xl border border-gray-200 shadow-sm'>
              <div className='mb-4'>
                <h3 className='font-extrabold text-lg text-gray-900'>
                  {selectedTeacherDetails ? `${selectedTeacherDetails.name}'s History` : 'Select a Teacher'}
                </h3>
                <p className='text-xs text-gray-400'>Timeline tracking records index</p>
              </div>
              
              <div className='overflow-x-auto rounded-xl border border-gray-100'>
                <table className='min-w-full divide-y divide-gray-200 text-left text-sm'>
                  <thead className='bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                    <tr>
                      <th className='px-4 py-3'>Target Date</th>
                      <th className='px-4 py-3 text-center'>Entries</th>
                      <th className='px-4 py-3'>Status</th>
                      <th className='px-4 py-3 text-right'>Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200 bg-white text-gray-700'>
                    {selectedTeacherReports.length === 0 ? (
                      <tr>
                        <td colSpan={4} className='px-4 py-8 text-center text-gray-400 text-xs'>
                          No logging entries recorded for this individual track.
                        </td>
                      </tr>
                    ) : (
                      selectedTeacherReports.map((r) => {
                        const cleanRepDate = r.reportDate ? String(r.reportDate).split('T')[0] : '—';
                        return (
                          <tr key={r.id} className='hover:bg-gray-50/80 transition-colors'>
                            <td className='px-4 py-3 font-semibold text-gray-900 whitespace-nowrap'>{cleanRepDate}</td>
                            <td className='px-4 py-3 text-center font-bold'>{r.entries?.length || 0}</td>
                            <td className='px-4 py-3 whitespace-nowrap'>
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                r.status === 'SUBMITTED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {r.status || 'DRAFT'}
                              </span>
                            </td>
                            <td className='px-4 py-3 text-right whitespace-nowrap'>
                              <div className='inline-flex gap-1'>
                                <Button size='sm' variant='ghost' className='h-8 w-8 p-0' onClick={() => handleIndividualView(r.id)}>
                                  <Eye className='h-4 w-4 text-gray-500' />
                                </Button>
                                <Button size='sm' variant='ghost' className='h-8 w-8 p-0' onClick={() => handleIndividualDownload(r.id, 'csv')}>
                                  <FileSpreadsheet className='h-4 w-4 text-emerald-600' />
                                </Button>
                                <Button size='sm' variant='ghost' className='h-8 w-8 p-0' onClick={() => handleIndividualDownload(r.id, 'pdf')}>
                                  <FileText className='h-4 w-4 text-red-500' />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* PANEL C: RIGHT-HAND TIMELINE INDEX CALENDAR SIDEBAR CARD */}
        <div className='lg:col-span-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm space-y-3'>
          <h4 className='font-bold text-xs uppercase tracking-wider text-gray-400 px-1'>Calendar Checkpoints</h4>

          <div className='space-y-2 h-[345px] overflow-y-auto pr-1 scrollbar-thin'>
            {sortedFilteredDates.length === 0 ? (
              <div className='text-xs text-center py-8 text-gray-400 italic bg-gray-50/50 rounded-xl border border-dashed border-gray-200'>
                No matching checkpoint records
              </div>
            ) : (
              sortedFilteredDates.map((d) => {
                const list = byDate[d];
                return (
                  <div key={d} className='p-2.5 bg-white rounded-xl border border-gray-200/90 shadow-xs flex items-center justify-between gap-2 hover:border-gray-400 transition-all'>
                    <div className="min-w-0 flex-1">
                      <div className='text-xs font-black text-gray-900'>{d}</div>
                      <div className='text-[10px] font-medium text-gray-400 mt-0.5'>{list.length} submissions</div>
                    </div>
                    <div className='flex gap-1 items-center shrink-0'>
                      <Button size='sm' variant='outline' className='h-6 text-[10px] font-bold px-2 bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 rounded-lg' onClick={() => openDetails(d)}>
                        Layout
                      </Button>
                      <Button size='sm' variant='ghost' className='h-6 w-6 p-0 rounded-lg' onClick={() => exportDateCsv(d)}>
                        <Download className='h-3 w-3 text-gray-500' />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* MASTER LAYOUT MATRIX DIALOG */}
      <Dialog open={!!openDate} onOpenChange={(v) => { if (!v) setOpenDate(null); }}>
        <DialogContent className='sm:max-w-xl max-h-[85vh] overflow-y-auto p-6'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold text-gray-900'>Layout Checklist for {openDate}</DialogTitle>
            <DialogDescription className='text-xs text-gray-400'>Comprehensive operational overview matrix balance sheet.</DialogDescription>
          </DialogHeader>
          
          <div className='mt-4 space-y-6'>
            {(() => {
              const dayReports = byDate[openDate ?? ''] || [];
              const submittedItems = dayReports.filter((r) => r.status === 'SUBMITTED');
              const draftItems = dayReports.filter((r) => r.status !== 'SUBMITTED');
              
              const scheduledTeachers = new Map<string, string>();
              if (currentGrid?.grid && Array.isArray(currentGrid.grid)) {
                currentGrid.grid.forEach((row: any) => {
                  if (row?.cells && Array.isArray(row.cells)) {
                    row.cells.forEach((c: any) => {
                      if (c && !c.empty && c.teacherId) {
                        scheduledTeachers.set(String(c.teacherId), String(c.teacherName));
                      }
                    });
                  }
                });
              }
              
              const documentedUserIds = new Set(dayReports.map((r) => String(r.teacherId)));
              const pendingTeachers = Array.from(scheduledTeachers.entries()).filter(([id]) => !documentedUserIds.has(id));

              return (
                <>
                  <div>
                    <h4 className='font-bold text-xs uppercase text-emerald-800 tracking-wider mb-2 bg-emerald-50 px-2 py-1 rounded-md inline-block'>
                      Submitted Core ({submittedItems.length})
                    </h4>
                    {submittedItems.length === 0 ? (
                      <p className='text-xs text-gray-400 italic pl-1'>No final submittals finalized.</p>
                    ) : (
                      <div className='space-y-1.5 max-h-[200px] overflow-y-auto pr-1'>
                        {submittedItems.map((r) => (
                          <div key={r.id} className='p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/20 flex items-center justify-between text-xs'>
                            <span className='font-semibold text-gray-800'>{r.teacherName}</span>
                            <span className='px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold uppercase text-[10px]'>Verified</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className='font-bold text-xs uppercase text-blue-800 tracking-wider mb-2 bg-blue-50 px-2 py-1 rounded-md inline-block'>
                      Draft Saves ({draftItems.length})
                    </h4>
                    {draftItems.length === 0 ? (
                      <p className='text-xs text-gray-400 italic pl-1'>No running drafts saved for this track.</p>
                    ) : (
                      <div className='space-y-1.5 max-h-[200px] overflow-y-auto pr-1'>
                        {draftItems.map((r) => (
                          <div key={r.id} className='p-2.5 rounded-xl border border-blue-100 bg-blue-50/20 flex items-center justify-between text-xs'>
                            <span className='font-semibold text-gray-800'>{r.teacherName}</span>
                            <span className='px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold uppercase text-[10px]'>Drafting</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className='font-bold text-xs uppercase text-amber-800 tracking-wider mb-2 bg-amber-50 px-2 py-1 rounded-md inline-block'>
                      Absent / Pending Submissions ({pendingTeachers.length})
                    </h4>
                    {!currentGrid ? (
                      <p className='text-xs text-gray-400 italic pl-1'>No timetable matrix layouts running on this cycle.</p>
                    ) : pendingTeachers.length === 0 ? (
                      <div className='text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-medium'>
                        Clean deployment balance: All scheduled teachers submitted paperwork!
                      </div>
                    ) : (
                      <div className='space-y-1.5 max-h-[200px] overflow-y-auto pr-1'>
                        {pendingTeachers.map(([id, name]) => (
                          <div key={id} className='p-2.5 rounded-xl border border-amber-200 bg-amber-50/30 flex items-center justify-between text-xs'>
                            <span className='font-medium text-gray-700'>{name}</span>
                            <span className='text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-200 font-bold uppercase'>Missing</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}