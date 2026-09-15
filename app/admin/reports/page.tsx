'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRequireAuth, useAuth } from '@/lib/auth-context';
import {
  getAdminReports,
  getDailyDeskGrid,
  downloadReportsCsv,
  getAdminReport,
  getSchoolDetails,
  type DailyReportData,
} from '@/lib/api-services';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProtectedFeature } from '@/components/protected-feature';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  FileSpreadsheet,
  FileCheck,
  Download,
  Eye,
  User,
  CalendarSearch,
  CheckCircle2,
  X,
  Search,
  Users,
  Clock,
  CheckCircle,
  Filter,
  Layers,
  Sparkles,
  Calendar,
  Lock,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminReportsPage() {
  useRequireAuth('admin');
  const { user } = useAuth();

  const [reports, setReports] = useState<DailyReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherName, setTeacherName] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [currentGrid, setCurrentGrid] = useState<any | null>(null);
  const [calendarSearchDate, setCalendarSearchDate] = useState('');
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [viewReportId, setViewReportId] = useState<string | null>(null);
  const [viewReportData, setViewReportData] = useState<DailyReportData | null>(null);
  const [allowedFormats, setAllowedFormats] = useState<string[]>(['pdf']);
  const [planName, setPlanName] = useState<string>('Free');

  const isFormatAllowed = useCallback((fmt: string) => {
    const f = fmt.toLowerCase().trim();
    if (f === 'word' || f === 'docx') return allowedFormats.includes('docx') || allowedFormats.includes('word');
    return allowedFormats.includes(f);
  }, [allowedFormats]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      
      const schoolData = await getSchoolDetails();
      const plan = schoolData.plan;
      const reportsEnabled = plan?.reportEnabled || false;
      setFeatureEnabled(reportsEnabled);
      setAllowedFormats(schoolData.exportFormats || plan?.exportFormats || ['pdf']);
      setPlanName(plan?.name || 'Free');
      
      const r = await getAdminReports({
        teacherName: teacherName || undefined,
      });
      setReports(r);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [teacherName]);

  useEffect(() => {
    void load();
  }, [load]);

  // 2-second auto-dismiss timer for notifications
  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => {
      setSuccessMsg(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  const uniqueTeachers = useMemo(() => {
    return Array.from(
      new Map(
        reports
          .filter((r) => r.teacherId)
          .map((r) => [r.teacherId, { id: r.teacherId, name: r.teacherName }])
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [reports]);

  useEffect(() => {
    if (!selectedTeacherId && uniqueTeachers.length > 0) {
      setSelectedTeacherId(uniqueTeachers[0].id);
    }
  }, [uniqueTeachers, selectedTeacherId]);

  const selectedTeacherDetails = uniqueTeachers.find((t) => t.id === selectedTeacherId);
  const selectedTeacherReports = useMemo(() => {
    return reports.filter((r) => r.teacherId === selectedTeacherId);
  }, [reports, selectedTeacherId]);

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

  const exportDateReports = async (d: string, format: 'csv' | 'docx' | 'pdf') => {
    if (!isFormatAllowed(format)) {
      const label = format === 'docx' ? 'Word (DOCX)' : format.toUpperCase();
      toast.error(`"${label}" export is not included in your ${planName} plan. Please upgrade.`);
      return;
    }
    try {
      const cleanDate = d.includes('T') ? d.split('T')[0] : d;
      const label = format === 'docx' ? 'Word' : format.toUpperCase();
      setSuccessMsg(`Downloading ${label} report for ${cleanDate}...`);
      window.open(`/api/reports/download/${format}/${encodeURIComponent(cleanDate)}`, '_blank');
    } catch (error) {
      console.error(error);
      toast.error(`Unable to download report.`);
    }
  };

  const exportDateCsv = (d: string) => exportDateReports(d, 'csv');

  const handleIndividualDownload = (reportId: string, format: 'pdf' | 'csv' | 'docx') => {
    if (!isFormatAllowed(format)) {
      const label = format === 'docx' ? 'Word (DOCX)' : format.toUpperCase();
      toast.error(`"${label}" export is not included in your ${planName} plan. Please upgrade.`);
      return;
    }
    window.open(`/api/admin/reports/${reportId}/${format}`, '_blank');
    const label = format === 'docx' ? 'Word' : format.toUpperCase();
    setSuccessMsg(`Downloading report in ${label} format...`);
  };

  const handleIndividualView = async (reportId: string) => {
    setViewReportId(reportId);
    try {
      const reportData = await getAdminReport(reportId);
      setViewReportData(reportData);
    } catch (error) {
      console.error('Failed to load report:', error);
      toast.error('Could not load report details');
    }
  };

  const byDate = useMemo(() => {
    return reports.reduce((acc: Record<string, DailyReportData[]>, r) => {
      if (!r.reportDate) return acc;
      const cleanKey = String(r.reportDate).includes('T') ? String(r.reportDate).split('T')[0] : String(r.reportDate);
      (acc[cleanKey] ||= []).push(r);
      return acc;
    }, {} as Record<string, DailyReportData[]>);
  }, [reports]);

  const sortedFilteredDates = useMemo(() => {
    return Object.keys(byDate)
      .filter((d) => {
        if (!calendarSearchDate) return true;
        return d.includes(calendarSearchDate);
      })
      .sort((a, b) => b.localeCompare(a));
  }, [byDate, calendarSearchDate]);

  // Derived stats for top metric cards
  const totalSubmittedCount = useMemo(() => {
    return reports.filter((r) => r.status === 'SUBMITTED').length;
  }, [reports]);

  const totalDraftCount = useMemo(() => {
    return reports.filter((r) => r.status !== 'SUBMITTED').length;
  }, [reports]);

  const resetFilters = () => {
    setTeacherName('');
    setCalendarSearchDate('');
  };

  const hasActiveFilters = Boolean(teacherName || calendarSearchDate);

  if (loading && reports.length === 0) {
    return (
      <div className='max-w-7xl mx-auto space-y-6'>
        <PageSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto relative space-y-6 pb-12'>
      {/* Page Header */}
      <PageHeader
        title="Daily Teaching Reports"
        description="Review, export, and monitor submitted daily teaching reports across all faculty members."
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Academic' },
          { label: 'Reports' },
        ]}
      />

      {/* TOP-RIGHT POPUP TOAST BOX */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className='fixed top-6 right-6 z-50 max-w-sm p-4 bg-white/95 dark:bg-slate-900/95 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm rounded-2xl shadow-xl backdrop-blur-xl flex items-start gap-3'
          >
            <CheckCircle2 className='h-5 w-5 shrink-0 text-emerald-500 mt-0.5' />
            <div>
              <p className='font-bold text-xs uppercase tracking-wider mb-0.5'>Action Successful</p>
              <p className='text-slate-600 dark:text-slate-300 text-xs leading-relaxed'>{successMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProtectedFeature
        featureKey='reports'
        featureName='Reports Management'
        isEnabled={featureEnabled}
        schoolId={user?.schoolId || undefined}
      >
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <GlassCard className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{reports.length}</p>
              <p className="text-xs text-muted-foreground font-medium">Total Submissions</p>
            </div>
          </GlassCard>

          <GlassCard className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{uniqueTeachers.length}</p>
              <p className="text-xs text-muted-foreground font-medium">Active Faculty</p>
            </div>
          </GlassCard>

          <GlassCard className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalSubmittedCount}</p>
              <p className="text-xs text-muted-foreground font-medium">Verified Core</p>
            </div>
          </GlassCard>

          <GlassCard className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalDraftCount}</p>
              <p className="text-xs text-muted-foreground font-medium">Draft / Pending</p>
            </div>
          </GlassCard>
        </div>

        {/* SEARCH & FILTER TOOLBAR */}
        <GlassCard className="p-4 md:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Teacher */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search teacher name..."
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-background border-border/80 text-xs sm:text-sm"
              />
              {teacherName && (
                <button
                  onClick={() => setTeacherName('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Date Search */}
            <div className="relative flex items-center w-full sm:w-64">
              <CalendarSearch className="absolute left-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={calendarSearchDate}
                onChange={(e) => setCalendarSearchDate(e.target.value)}
                className="w-full text-xs sm:text-sm bg-background border border-border/80 hover:bg-accent/50 focus:bg-background rounded-xl h-10 pl-10 pr-8 focus:outline-none focus:ring-1 focus:ring-purple-500 text-foreground shadow-2xs transition-all dark:[color-scheme:dark]"
              />
              {calendarSearchDate && (
                <button
                  onClick={() => setCalendarSearchDate('')}
                  className="absolute right-2.5 text-[10px] bg-muted hover:bg-muted/80 text-muted-foreground px-2 py-0.5 rounded-md font-bold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={resetFilters}
                className="h-10 text-xs font-semibold rounded-xl border-dashed border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Clear Filters
              </Button>
            )}
          </div>
        </GlassCard>

        {/* THREE PANELS MAIN GRID */}
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
          
          {/* PANEL A: FACULTY ROSTER */}
          <div className='lg:col-span-3'>
            <GlassCard className="p-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className='font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                  <Users className="h-3.5 w-3.5 text-purple-500" />
                  Faculty Roster
                </h4>
                <Badge variant="outline" className="text-[10px] rounded-full font-bold px-2 py-0.5">
                  {uniqueTeachers.length}
                </Badge>
              </div>

              <div className='space-y-1.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin'>
                {uniqueTeachers.length === 0 ? (
                  <div className='text-xs text-center py-8 text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed border-border'>
                    No faculty found
                  </div>
                ) : (
                  uniqueTeachers.map((teacher) => {
                    const isSelected = selectedTeacherId === teacher.id;
                    const teacherReportCount = reports.filter((r) => r.teacherId === teacher.id).length;
                    return (
                      <button
                        key={teacher.id}
                        onClick={() => setSelectedTeacherId(teacher.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                          isSelected
                            ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-l-4 border-purple-500 font-bold shadow-2xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-accent hover:text-accent-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-purple-500/20 text-purple-600' : 'bg-muted text-muted-foreground'}`}>
                            <User className='h-3.5 w-3.5' />
                          </div>
                          <span className='truncate'>{teacher.name}</span>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-extrabold rounded-full px-2 shrink-0 ${
                            isSelected ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {teacherReportCount}
                        </Badge>
                      </button>
                    );
                  })
                )}
              </div>
            </GlassCard>
          </div>

          {/* PANEL B: LOGGED ENTRIES HISTORY */}
          <div className='lg:col-span-6'>
            <GlassCard className="p-4 sm:p-5 space-y-4">
              <div className='flex items-center justify-between border-b border-border/50 pb-3'>
                <div>
                  <h3 className='font-extrabold text-base sm:text-lg text-foreground flex items-center gap-2'>
                    <FileText className="h-5 w-5 text-purple-500" />
                    {selectedTeacherDetails ? `${selectedTeacherDetails.name}'s History` : 'Select a Teacher'}
                  </h3>
                  <p className='text-xs text-muted-foreground mt-0.5'>Timeline tracking records index</p>
                </div>
                <Badge className="text-xs font-bold rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 px-3 py-1">
                  {selectedTeacherReports.length} {selectedTeacherReports.length === 1 ? 'Report' : 'Reports'}
                </Badge>
              </div>

              <div className='overflow-x-auto rounded-xl border border-border/60'>
                <table className='min-w-full divide-y divide-border text-left text-xs sm:text-sm'>
                  <thead className='bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider'>
                    <tr>
                      <th className='px-4 py-3'>Target Date</th>
                      <th className='px-4 py-3 text-center'>Classroom</th>
                      <th className='px-4 py-3 text-center'>Activities</th>
                      <th className='px-4 py-3'>Status</th>
                      <th className='px-4 py-3 text-right'>Actions</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-border/60 bg-card/50 text-foreground'>
                    {selectedTeacherReports.length === 0 ? (
                      <tr>
                        <td colSpan={5} className='px-4 py-8 text-center text-muted-foreground text-xs italic'>
                          No logging entries recorded for this individual track.
                        </td>
                      </tr>
                    ) : (
                      selectedTeacherReports.map((r) => {
                        const cleanRepDate = r.reportDate ? String(r.reportDate).split('T')[0] : '—';
                        const lessonsCount = r.entries?.filter(e => e.entryType === 'LESSON' || !e.entryType).length || 0;
                        const activitiesCount = r.entries?.filter(e => e.entryType === 'ACTIVITY').length || 0;
                        return (
                          <tr key={r.id} className='hover:bg-purple-500/5 transition-colors'>
                            <td className='px-4 py-3 font-semibold whitespace-nowrap'>{cleanRepDate}</td>
                            <td className='px-4 py-3 text-center'>
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                {lessonsCount}
                              </span>
                            </td>
                            <td className='px-4 py-3 text-center'>
                              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                {activitiesCount}
                              </span>
                            </td>
                            <td className='px-4 py-3 whitespace-nowrap'>
                              <Badge className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                                r.status === 'SUBMITTED'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                              }`}>
                                {r.status || 'DRAFT'}
                              </Badge>
                            </td>
                            <td className='px-4 py-3 text-right whitespace-nowrap'>
                              <div className='inline-flex items-center gap-1'>
                                <Button size='sm' variant='ghost' className='h-8 w-8 p-0 rounded-lg hover:bg-purple-500/10' onClick={() => handleIndividualView(r.id)} title="View Details">
                                  <Eye className='h-4 w-4 text-purple-600 dark:text-purple-400' />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size='sm' variant='ghost' className='h-8 w-8 p-0 rounded-lg hover:bg-muted' title="Export Report (PDF / Word / CSV)">
                                      <Download className='h-4 w-4 text-slate-700 dark:text-slate-300' />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align='end' className='w-48 rounded-xl'>
                                    <DropdownMenuItem onClick={() => handleIndividualDownload(r.id, 'pdf')} className='cursor-pointer text-xs flex items-center justify-between'>
                                      <span className='flex items-center gap-2'>
                                        <FileText className='h-3.5 w-3.5 text-rose-500' />
                                        <span>PDF Document</span>
                                      </span>
                                      {!isFormatAllowed('pdf') && <Lock className='h-3 w-3 text-muted-foreground' />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleIndividualDownload(r.id, 'docx')} className='cursor-pointer text-xs flex items-center justify-between'>
                                      <span className='flex items-center gap-2'>
                                        <FileCheck className='h-3.5 w-3.5 text-blue-500' />
                                        <span>Word Document</span>
                                      </span>
                                      {!isFormatAllowed('docx') && <Lock className='h-3 w-3 text-muted-foreground' />}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleIndividualDownload(r.id, 'csv')} className='cursor-pointer text-xs flex items-center justify-between'>
                                      <span className='flex items-center gap-2'>
                                        <FileSpreadsheet className='h-3.5 w-3.5 text-emerald-500' />
                                        <span>CSV Spreadsheet</span>
                                      </span>
                                      {!isFormatAllowed('csv') && <Lock className='h-3 w-3 text-muted-foreground' />}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>

          {/* PANEL C: CALENDAR CHECKPOINTS */}
          <div className='lg:col-span-3'>
            <GlassCard className="p-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h4 className='font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                  <Calendar className="h-3.5 w-3.5 text-purple-500" />
                  Calendar Checkpoints
                </h4>
                <Badge variant="outline" className="text-[10px] rounded-full font-bold px-2 py-0.5">
                  {sortedFilteredDates.length}
                </Badge>
              </div>

              <div className='space-y-2 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin'>
                {sortedFilteredDates.length === 0 ? (
                  <div className='text-xs text-center py-8 text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed border-border'>
                    No matching checkpoint records
                  </div>
                ) : (
                  sortedFilteredDates.map((d) => {
                    const list = byDate[d];
                    return (
                      <div key={d} className='p-3 bg-card/60 rounded-xl border border-border/60 shadow-2xs flex items-center justify-between gap-2 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all'>
                        <div className="min-w-0 flex-1">
                          <div className='text-xs font-black text-foreground'>{d}</div>
                          <div className='text-[10px] font-semibold text-muted-foreground mt-0.5'>{list.length} submissions</div>
                        </div>
                        <div className='flex gap-1.5 items-center shrink-0'>
                          <Button size='sm' variant='outline' className='h-7 text-[11px] font-bold px-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 rounded-lg cursor-pointer' onClick={() => openDetails(d)}>
                            Layout
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size='sm' variant='ghost' className='h-7 w-7 p-0 rounded-lg hover:bg-emerald-500/10 cursor-pointer' title="Export All (PDF / Word / CSV)">
                                <Download className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='w-48 rounded-xl'>
                              <DropdownMenuItem onClick={() => exportDateReports(d, 'pdf')} className='cursor-pointer text-xs flex items-center justify-between'>
                                <span className='flex items-center gap-2'>
                                  <FileText className='h-3.5 w-3.5 text-rose-500' />
                                  <span>PDF Summary</span>
                                </span>
                                {!isFormatAllowed('pdf') && <Lock className='h-3 w-3 text-muted-foreground' />}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportDateReports(d, 'docx')} className='cursor-pointer text-xs flex items-center justify-between'>
                                <span className='flex items-center gap-2'>
                                  <FileCheck className='h-3.5 w-3.5 text-blue-500' />
                                  <span>Word Document</span>
                                </span>
                                {!isFormatAllowed('docx') && <Lock className='h-3 w-3 text-muted-foreground' />}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => exportDateReports(d, 'csv')} className='cursor-pointer text-xs flex items-center justify-between'>
                                <span className='flex items-center gap-2'>
                                  <FileSpreadsheet className='h-3.5 w-3.5 text-emerald-500' />
                                  <span>CSV Spreadsheet</span>
                                </span>
                                {!isFormatAllowed('csv') && <Lock className='h-3 w-3 text-muted-foreground' />}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* MASTER LAYOUT MATRIX DIALOG */}
        <Dialog open={!!openDate} onOpenChange={(v) => { if (!v) setOpenDate(null); }}>
          <DialogContent className='sm:max-w-xl max-h-[85vh] overflow-y-auto p-6 bg-card border border-border text-card-foreground rounded-2xl'>
            <DialogHeader>
              <DialogTitle className='text-lg font-bold text-foreground flex items-center gap-2'>
                <Layers className="h-5 w-5 text-purple-500" />
                Layout Checklist for {openDate}
              </DialogTitle>
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
                      <h4 className='font-bold text-xs uppercase text-emerald-600 dark:text-emerald-400 tracking-wider mb-2 bg-emerald-500/10 px-2.5 py-1 rounded-lg inline-block border border-emerald-500/20'>
                        Submitted Core ({submittedItems.length})
                      </h4>
                      {submittedItems.length === 0 ? (
                        <p className='text-xs text-muted-foreground italic pl-1'>No final submittals finalized.</p>
                      ) : (
                        <div className='space-y-1.5 max-h-[180px] overflow-y-auto pr-1'>
                          {submittedItems.map((r) => (
                            <div key={r.id} className='p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between text-xs text-foreground'>
                              <span className='font-bold'>{r.teacherName}</span>
                              <Badge className='bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold uppercase text-[10px] border-emerald-500/30'>Verified</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className='font-bold text-xs uppercase text-blue-600 dark:text-blue-400 tracking-wider mb-2 bg-blue-500/10 px-2.5 py-1 rounded-lg inline-block border border-blue-500/20'>
                        Draft Saves ({draftItems.length})
                      </h4>
                      {draftItems.length === 0 ? (
                        <p className='text-xs text-muted-foreground italic pl-1'>No running drafts saved for this track.</p>
                      ) : (
                        <div className='space-y-1.5 max-h-[180px] overflow-y-auto pr-1'>
                          {draftItems.map((r) => (
                            <div key={r.id} className='p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-center justify-between text-xs text-foreground'>
                              <span className='font-bold'>{r.teacherName}</span>
                              <Badge className='bg-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold uppercase text-[10px] border-blue-500/30'>Drafting</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className='font-bold text-xs uppercase text-amber-600 dark:text-amber-400 tracking-wider mb-2 bg-amber-500/10 px-2.5 py-1 rounded-lg inline-block border border-amber-500/20'>
                        Absent / Pending Submissions ({pendingTeachers.length})
                      </h4>
                      {!currentGrid ? (
                        <p className='text-xs text-muted-foreground italic pl-1'>No timetable matrix layouts running on this cycle.</p>
                      ) : pendingTeachers.length === 0 ? (
                        <div className='text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 font-bold'>
                          Clean deployment balance: All scheduled teachers submitted paperwork!
                        </div>
                      ) : (
                        <div className='space-y-1.5 max-h-[180px] overflow-y-auto pr-1'>
                          {pendingTeachers.map(([id, name]) => (
                            <div key={id} className='p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between text-xs text-foreground'>
                              <span className='font-semibold'>{name}</span>
                              <Badge className='bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30 font-extrabold uppercase text-[10px]'>Missing</Badge>
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

        {/* Report View Dialog */}
        <Dialog open={!!viewReportId} onOpenChange={(open) => { if (!open) { setViewReportId(null); setViewReportData(null); } }}>
          <DialogContent className='sm:max-w-4xl max-h-[85vh] overflow-y-auto p-6 bg-card border border-border text-card-foreground rounded-2xl'>
            <DialogHeader>
              <div className='flex items-center justify-between'>
                <div>
                  <DialogTitle className='text-lg font-bold text-foreground flex items-center gap-2'>
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    Report Details
                  </DialogTitle>
                  <DialogDescription className='text-xs text-muted-foreground'>
                    {viewReportData ? `${viewReportData.teacherName} — ${viewReportData.reportDate}` : 'Loading...'}
                  </DialogDescription>
                </div>
                <Button variant='ghost' size='sm' className="rounded-xl" onClick={() => { setViewReportId(null); setViewReportData(null); }}>
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </DialogHeader>

            {viewReportData ? (
              <div className='mt-4 space-y-4'>
                {/* Report Info */}
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-xs sm:text-sm bg-purple-500/5 p-4 rounded-xl border border-purple-500/10'>
                  <div>
                    <p className='text-muted-foreground text-xs font-semibold'>Teacher</p>
                    <p className='font-bold text-foreground'>{viewReportData.teacherName}</p>
                  </div>
                  <div>
                    <p className='text-muted-foreground text-xs font-semibold'>Email</p>
                    <p className="font-medium text-foreground truncate">{viewReportData.teacherEmail}</p>
                  </div>
                  <div>
                    <p className='text-muted-foreground text-xs font-semibold'>Report Date</p>
                    <p className="font-bold text-foreground">{viewReportData.reportDate}</p>
                  </div>
                  <div>
                    <p className='text-muted-foreground text-xs font-semibold'>Status</p>
                    <Badge className={`text-[10px] font-bold border ${
                      viewReportData.status === 'SUBMITTED'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    }`}>
                      {viewReportData.status}
                    </Badge>
                  </div>
                </div>

                {/* Entries Table */}
                <div className='overflow-x-auto rounded-xl border border-border/60'>
                  <table className='min-w-full divide-y divide-border text-left text-xs sm:text-sm'>
                    <thead className='bg-muted/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider'>
                      <tr>
                        <th className='px-4 py-3'>Type</th>
                        <th className='px-4 py-3'>Class</th>
                        <th className='px-4 py-3'>Subject</th>
                        <th className='px-4 py-3'>Details</th>
                        <th className='px-4 py-3'>Completed</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-border/60 bg-card text-foreground'>
                      {viewReportData.entries.map((e) => {
                        const isActivity = e.entryType === 'ACTIVITY';
                        const entryLabel = isActivity ? 'Activity' : 'Classroom';
                        const entryBadgeColor = isActivity ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';

                        return (
                          <tr key={e.id} className='hover:bg-muted/40 transition-colors'>
                            <td className='px-4 py-3'>
                              <Badge className={`text-[10px] px-2 py-0.5 font-bold border ${entryBadgeColor}`}>
                                {entryLabel}
                              </Badge>
                            </td>
                            <td className='px-4 py-3 font-semibold'>{e.className}</td>
                            <td className='px-4 py-3 font-medium'>{e.subjectName}</td>
                            <td className='px-4 py-3 max-w-md'>
                              {isActivity ? (
                                <div className='space-y-1'>
                                  {e.activityCategory && (
                                    <div className='text-xs font-bold text-purple-600 dark:text-purple-400'>
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
                                    <div className='space-y-1 mt-1'>
                                      <div className='text-xs font-semibold text-purple-600 dark:text-purple-400'>
                                        Evidence Files ({e.evidenceFiles.length})
                                      </div>
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
                                                  className='text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold'
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
                                <div className='text-xs text-foreground font-medium'>{e.description || '—'}</div>
                              )}
                            </td>
                            <td className='px-4 py-3'>
                              {e.isCompleted ? (
                                <Badge className='text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'>
                                  Yes
                                </Badge>
                              ) : (
                                <span className='text-xs text-muted-foreground font-medium'>No</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Download Buttons (PDF, Word, CSV) */}
                <div className='flex flex-wrap gap-2 justify-end pt-4 border-t border-border'>
                  <Button
                    size='sm'
                    variant='outline'
                    className="rounded-xl font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                    onClick={() => viewReportId && handleIndividualDownload(viewReportId, 'pdf')}
                  >
                    <FileText className='h-4 w-4 mr-2 text-rose-500' />
                    Download PDF
                    {!isFormatAllowed('pdf') && <Lock className='h-3 w-3 ml-1.5 opacity-60' />}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className="rounded-xl font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                    onClick={() => viewReportId && handleIndividualDownload(viewReportId, 'docx')}
                  >
                    <FileCheck className='h-4 w-4 mr-2 text-blue-500' />
                    Download Word
                    {!isFormatAllowed('docx') && <Lock className='h-3 w-3 ml-1.5 opacity-60' />}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    className="rounded-xl font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => viewReportId && handleIndividualDownload(viewReportId, 'csv')}
                  >
                    <FileSpreadsheet className='h-4 w-4 mr-2 text-emerald-500' />
                    Download CSV
                    {!isFormatAllowed('csv') && <Lock className='h-3 w-3 ml-1.5 opacity-60' />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className='flex items-center justify-center py-12'>
                <div className='text-sm text-muted-foreground font-medium'>Loading report details...</div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </ProtectedFeature>
    </div>
  );
}