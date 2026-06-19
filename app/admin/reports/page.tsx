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
import { LockedFeatureModal } from '@/components/locked-feature-modal';
import { getSchoolDetails } from '@/lib/api-services';

export default function AdminReportsPage() {
  useRequireAuth('admin');

  const [reports, setReports] = useState<DailyReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherName, setTeacherName] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [currentGrid, setCurrentGrid] = useState<any | null>(null);
  const [calendarSearchDate, setCalendarSearchDate] = useState('');
  const [lockedModalOpen, setLockedModalOpen] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if reports feature is enabled
      const schoolData = await getSchoolDetails();
      const plan = schoolData.plan;
      const reportsEnabled = plan?.reportEnabled || false;
      setFeatureEnabled(reportsEnabled);
      
      if (!reportsEnabled) {
        setLockedModalOpen(true);
        setLoading(false);
        return;
      }
      
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

  const uniqueTeachers = Array.from(
    new Map(
      reports
        .filter((r) => r.teacherId)
        .map((r) => [r.teacherId, { id: r.teacherId, name: r.teacherName }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

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

  const byDate = reports.reduce((acc: Record<string, DailyReportData[]>, r) => {
    if (!r.reportDate) return acc;
    const cleanKey = String(r.reportDate).includes('T') ? String(r.reportDate).split('T')[0] : String(r.reportDate);
    (acc[cleanKey] ||= []).push(r);
    return acc;
  }, {} as Record<string, DailyReportData[]>);

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
    <div className='max-w-7xl mx-auto px-4 py-6 space-y-6 text-foreground bg-background'>
      <PageHeader
        title='Reports'
        description='Review submitted daily teaching reports'
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Reports' }]}
      />

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-center'>
        <div className='lg:col-span-9'>
          <div className='max-w-sm'>
            <Input
              placeholder='Search teacher name...'
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
            />
          </div>
        </div>
        
        <div className='lg:col-span-3'>
          <div className="relative flex items-center">
            <CalendarSearch className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              value={calendarSearchDate}
              onChange={(e) => setCalendarSearchDate(e.target.value)}
              className="w-full text-xs bg-background border border-input hover:bg-accent/50 focus:bg-background rounded-lg h-9 pl-8 pr-2 focus:outline-none focus:ring-1 focus:ring-ring text-foreground shadow-xs transition-all dark:[color-scheme:dark]"
            />
            {calendarSearchDate && (
              <button 
                onClick={() => setCalendarSearchDate('')}
                className="absolute right-2 text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
        <div className='lg:col-span-9 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-6 items-start'>
          
          {/* PANEL A: FACULTY ROSTER */}
          <div className='md:col-span-1 lg:col-span-3 space-y-2 bg-card p-3 rounded-2xl border border-border shadow-sm'>
            <h4 className='font-bold text-xs uppercase tracking-wider text-muted-foreground px-2 mb-2'>Faculty Roster</h4>
            <div className='space-y-1 h-[240px] overflow-y-auto pr-1 scrollbar-thin'>
              {uniqueTeachers.length === 0 ? (
                <div className='text-xs text-center py-4 text-muted-foreground'>No faculty found</div>
              ) : (
                uniqueTeachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => setSelectedTeacherId(teacher.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2.5 ${
                      selectedTeacherId === teacher.id
                        ? 'bg-primary/10 text-primary border-l-4 border-primary pl-2 shadow-xs'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <User className={`h-4 w-4 ${selectedTeacherId === teacher.id ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className='truncate'>{teacher.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* PANEL B: LOGGED ENTRIES HISTORY */}
          <div className='md:col-span-2 lg:col-span-6 space-y-4'>
            <div className='p-4 bg-card rounded-2xl border border-border shadow-sm'>
              <div className='mb-4'>
                <h3 className='font-extrabold text-lg text-card-foreground'>
                  {selectedTeacherDetails ? `${selectedTeacherDetails.name}'s History` : 'Select a Teacher'}
                </h3>
                <p className='text-xs text-muted-foreground'>Timeline tracking records index</p>
              </div>
              
              <div className='overflow-x-auto rounded-xl border border-border/60'>
                <table className='min-w-full divide-y divide-border text-left text-sm'>
                  <thead className='bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                    <tr>
                      <th className='px-4 py-3'>Target Date</th>
                      <th className='px-4 py-3 text-center'>Entries</th>
                      <th className='px-4 py-3'>Status</th>
                      <th className='px-4 py-3 text-right'>Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-border bg-card text-card-foreground'>
                    {selectedTeacherReports.length === 0 ? (
                      <tr>
                        <td colSpan={4} className='px-4 py-8 text-center text-muted-foreground text-xs'>
                          No logging entries recorded for this individual track.
                        </td>
                      </tr>
                    ) : (
                      selectedTeacherReports.map((r) => {
                        const cleanRepDate = r.reportDate ? String(r.reportDate).split('T')[0] : '—';
                        return (
                          <tr key={r.id} className='hover:bg-muted/40 transition-colors'>
                            <td className='px-4 py-3 font-semibold text-foreground whitespace-nowrap'>{cleanRepDate}</td>
                            <td className='px-4 py-3 text-center font-bold'>{r.entries?.length || 0}</td>
                            <td className='px-4 py-3 whitespace-nowrap'>
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                r.status === 'SUBMITTED'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              }`}>
                                {r.status || 'DRAFT'}
                              </span>
                            </td>
                            <td className='px-4 py-3 text-right whitespace-nowrap'>
                              <div className='inline-flex gap-1'>
                                <Button size='sm' variant='ghost' className='h-8 w-8 p-0' onClick={() => handleIndividualView(r.id)}>
                                  <Eye className='h-4 w-4 text-muted-foreground' />
                                </Button>
                                <Button size='sm' variant='ghost' className='h-8 w-8 p-0' onClick={() => handleIndividualDownload(r.id, 'csv')}>
                                  <FileSpreadsheet className='h-4 w-4 text-emerald-500' />
                                </Button>
                                <Button size='sm' variant='ghost' className='h-8 w-8 p-0' onClick={() => handleIndividualDownload(r.id, 'pdf')}>
                                  <FileText className='h-4 w-4 text-destructive' />
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

        {/* PANEL C: CALENDAR CHECKPOINTS */}
        <div className='lg:col-span-3 bg-card p-3 rounded-2xl border border-border shadow-sm space-y-3'>
          <h4 className='font-bold text-xs uppercase tracking-wider text-muted-foreground px-1'>Calendar Checkpoints</h4>
          <div className='space-y-2 h-[345px] overflow-y-auto pr-1 scrollbar-thin'>
            {sortedFilteredDates.length === 0 ? (
              <div className='text-xs text-center py-8 text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed border-border'>
                No matching checkpoint records
              </div>
            ) : (
              sortedFilteredDates.map((d) => {
                const list = byDate[d];
                return (
                  <div key={d} className='p-2.5 bg-card rounded-xl border border-border shadow-xs flex items-center justify-between gap-2 hover:border-muted-foreground/50 transition-all'>
                    <div className="min-w-0 flex-1">
                      <div className='text-xs font-black text-card-foreground'>{d}</div>
                      <div className='text-[10px] font-medium text-muted-foreground mt-0.5'>{list.length} submissions</div>
                    </div>
                    <div className='flex gap-1 items-center shrink-0'>
                      <Button size='sm' variant='outline' className='h-6 text-[10px] font-bold px-2 bg-muted/50 border-border text-foreground hover:bg-muted rounded-lg' onClick={() => openDetails(d)}>
                        Layout
                      </Button>
                      <Button size='sm' variant='ghost' className='h-6 w-6 p-0 rounded-lg' onClick={() => exportDateCsv(d)}>
                        <Download className='h-3 w-3 text-muted-foreground' />
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
        <DialogContent className='sm:max-w-xl max-h-[85vh] overflow-y-auto p-6 bg-card border border-border text-card-foreground'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold text-foreground'>Layout Checklist for {openDate}</DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground'>Comprehensive operational overview matrix balance sheet.</DialogDescription>
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
                    <h4 className='font-bold text-xs uppercase text-emerald-500 tracking-wider mb-2 bg-emerald-500/10 px-2 py-1 rounded-md inline-block border border-emerald-500/20'>
                      Submitted Core ({submittedItems.length})
                    </h4>
                    {submittedItems.length === 0 ? (
                      <p className='text-xs text-muted-foreground italic pl-1'>No final submittals finalized.</p>
                    ) : (
                      <div className='space-y-1.5 max-h-[200px] overflow-y-auto pr-1'>
                        {submittedItems.map((r) => (
                          <div key={r.id} className='p-2.5 rounded-xl border border-emerald-500/10 bg-emerald-500/5 flex items-center justify-between text-xs text-foreground'>
                            <span className='font-semibold'>{r.teacherName}</span>
                            <span className='px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-500 font-bold uppercase text-[10px]'>Verified</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className='font-bold text-xs uppercase text-blue-500 tracking-wider mb-2 bg-blue-500/10 px-2 py-1 rounded-md inline-block border border-blue-500/20'>
                      Draft Saves ({draftItems.length})
                    </h4>
                    {draftItems.length === 0 ? (
                      <p className='text-xs text-muted-foreground italic pl-1'>No running drafts saved for this track.</p>
                    ) : (
                      <div className='space-y-1.5 max-h-[200px] overflow-y-auto pr-1'>
                        {draftItems.map((r) => (
                          <div key={r.id} className='p-2.5 rounded-xl border border-blue-500/10 bg-blue-500/5 flex items-center justify-between text-xs text-foreground'>
                            <span className='font-semibold'>{r.teacherName}</span>
                            <span className='px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-500 font-bold uppercase text-[10px]'>Drafting</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className='font-bold text-xs uppercase text-amber-500 tracking-wider mb-2 bg-amber-500/10 px-2 py-1 rounded-md inline-block border border-amber-500/20'>
                      Absent / Pending Submissions ({pendingTeachers.length})
                    </h4>
                    {!currentGrid ? (
                      <p className='text-xs text-muted-foreground italic pl-1'>No timetable matrix layouts running on this cycle.</p>
                    ) : pendingTeachers.length === 0 ? (
                      <div className='text-xs text-emerald-500 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 font-medium'>
                        Clean deployment balance: All scheduled teachers submitted paperwork!
                      </div>
                    ) : (
                      <div className='space-y-1.5 max-h-[200px] overflow-y-auto pr-1'>
                        {pendingTeachers.map(([id, name]) => (
                          <div key={id} className='p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between text-xs text-foreground'>
                            <span className='font-medium'>{name}</span>
                            <span className='text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500 border border-amber-500/30 font-bold uppercase'>Missing</span>
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
      
      <LockedFeatureModal
        open={lockedModalOpen}
        onOpenChange={setLockedModalOpen}
        featureName="Reports Management"
      />
    </div>
  );
}