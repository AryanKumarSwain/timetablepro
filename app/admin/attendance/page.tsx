'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import { getTeachers, getDailyDeskGrid } from '@/lib/api-services';
import type { Teacher } from '@/lib/types';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { Calendar, RefreshCw, CheckCircle, XCircle, Search, FileText, Download, Users, SlidersHorizontal, Check, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ProtectedFeature } from '@/components/protected-feature';
import { getSchoolDetails } from '@/lib/api-services';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import {
  DataGrid,
  DataGridTable,
  DataGridHead,
  DataGridRow,
  DataGridTh,
  DataGridTd,
} from '@/components/enterprise/data-grid';

type StatusFilter = 'ALL' | 'PRESENT' | 'ABSENT';

interface DayLog {
  date: string;
  status: 'P' | 'A';
}

export default function AdminAttendancePage() {
  useRequireAuth('admin');
  const { user } = useAuth();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [gridData, setGridData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [featureEnabled, setFeatureEnabled] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Date Range States
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [rangeSummary, setRangeSummary] = useState<Record<string, DayLog[]>>({});
  const [isRangeLoading, setIsRangeLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Date Lock Guards
  const isPastDate = selectedDate < todayStr;
  const isFutureDate = selectedDate > todayStr;
  const isEditable = !isPastDate && !isFutureDate;

  // Extract unique distinct dates for columns from the range metrics map
  const uniqueDates = useMemo(() => {
    const firstTeacherId = Object.keys(rangeSummary)[0];
    if (!firstTeacherId || !rangeSummary[firstTeacherId]) return [];
    return rangeSummary[firstTeacherId].map(log => log.date);
  }, [rangeSummary]);

  const loadDataRegistry = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      // Check if attendance feature is enabled
      const schoolData = await getSchoolDetails();
      const plan = schoolData.plan;
      const attendanceEnabled = plan?.attendanceEnabled || false;
      setFeatureEnabled(attendanceEnabled);
      
      const [teachersList, deskGrid] = await Promise.all([
        getTeachers(),
        getDailyDeskGrid(selectedDate),
      ]);
      setTeachers(teachersList);
      setGridData(deskGrid);
    } catch (error) {
      console.error(error);
      toast.error('Failed to update dashboard matrix logs.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadDataRegistry(false);
  }, [loadDataRegistry]);

  // 2-second auto-dismiss timer for notifications
  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => {
      setSuccessMsg(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  const fetchRangeTelemetry = useCallback(async () => {
    if (!startDate || !endDate) return;
    try {
      setIsRangeLoading(true);
      const response = await fetch(`/api/admin/attendance?range=true&start=${startDate}&end=${endDate}`);
      if (!response.ok) throw new Error('Range metrics pipeline rejected.');
      const data = await response.json();
      setRangeSummary(data.summary || {});
      setSuccessMsg('Roster range matrix compiled successfully.');
    } catch (err) {
      console.error(err);
      toast.error('Could not map chronological range tracking.');
    } finally {
      setIsRangeLoading(false);
    }
  }, [startDate, endDate]);

  const getTeacherCurrentStatus = useCallback((teacherId: string): 'PRESENT' | 'ABSENT' => {
    if (!gridData) return 'PRESENT';

    if (gridData.attendance && Array.isArray(gridData.attendance)) {
      const isAbsentInAttendance = gridData.attendance.some(
        (a: any) => 
          a.teacherId === teacherId || 
          a.id === teacherId || 
          a.facultyId === teacherId ||
          (a.teacher && a.teacher.id === teacherId)
      );
      if (isAbsentInAttendance) return 'ABSENT';
    }

    if (gridData.grid && Array.isArray(gridData.grid)) {
      for (const row of gridData.grid) {
        const structuralCell = row.cells?.find((c: any) => c.teacherId === teacherId && !c.empty);
        if (structuralCell && structuralCell.isAbsent) {
          return 'ABSENT';
        }
      }
    }
    
    return 'PRESENT';
  }, [gridData]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const matchesSearch = 
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (teacher.email && teacher.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const status = getTeacherCurrentStatus(teacher.id);
      const matchesFilter = 
        statusFilter === 'ALL' || statusFilter === status;

      return matchesSearch && matchesFilter;
    });
  }, [teachers, searchQuery, statusFilter, getTeacherCurrentStatus]);

  const handleStatusChange = async (teacherId: string, targetStatus: 'PRESENT' | 'ABSENT') => {
    if (!isEditable) return;

    try {
      setUpdatingId(teacherId);

      const response = await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          date: selectedDate,
          status: targetStatus
        })
      });

      if (!response.ok) {
        const dataError = await response.json().catch(() => ({}));
        throw new Error(dataError.error || `Server Error: ${response.status}`);
      }

      toast.success(`Status updated to ${targetStatus}`);
      await loadDataRegistry(true);
      if (Object.keys(rangeSummary).length > 0) {
        void fetchRangeTelemetry();
      }
    } catch (err: any) {
      console.error('API Mutation Error:', err);
      toast.error(err.message || 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = useMemo(() => {
    const total = teachers.length;
    let absent = 0;
    teachers.forEach(t => {
      if (getTeacherCurrentStatus(t.id) === 'ABSENT') absent++;
    });
    return { total, absent, present: total - absent };
  }, [teachers, getTeacherCurrentStatus]);

  // Clean Matrix CSV Compiler matching the image fix
  const exportToExcel = async () => {
    try {
      const hasRangeData = uniqueDates.length > 0;
      
      let showWatermark = true;
      try {
        const schoolData = await getSchoolDetails();
        showWatermark = schoolData.watermarkRequired !== false;
      } catch (e) {
        console.error('Failed to fetch plan for watermark check:', e);
      }
      
      let headers = ['Faculty Name', 'Email Address', `Status (${selectedDate})`];
      if (hasRangeData) {
        headers = ['Faculty Name', 'Email Address', ...uniqueDates, 'Total Present (P)', 'Total Absent (A)'];
      }

      const rows = filteredTeachers.map(t => {
        if (hasRangeData) {
          const logs = rangeSummary[t.id] || [];
          const statusCells = uniqueDates.map(d => {
            const match = logs.find(l => l.date === d);
            return match ? match.status : 'N/A';
          });

          const totalP = logs.filter(l => l.status === 'P').length;
          const totalA = logs.filter(l => l.status === 'A').length;

          return [t.name, t.email || 'N/A', ...statusCells, totalP, totalA];
        }

        return [t.name, t.email || 'N/A', getTeacherCurrentStatus(t.id)];
      });

      const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
      
      const finalContent = showWatermark 
        ? csvContent + '\n\n"Generated via Timetable Pro"' 
        : csvContent;
      
      const blob = new Blob([finalContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Attendance_Matrix_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Matrix CSV downloaded.');
    } catch (err) {
      toast.error('Failed to compile data stream to CSV format.');
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto p-4"><PageSkeleton /></div>;
  }

  return (
    <div className='max-w-7xl mx-auto relative space-y-6'>
      {/* 1. FIXED HEADER SECTION (MOVED OUTSIDE PROTECTED WRAPPER FOR EXCELLENT VISIBILITY) */}
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <span className="font-black tracking-tight text-2xl">Attendance & Substitution Desk</span>
            {isPastDate && <span className="text-xs bg-zinc-600 text-white px-2 py-0.5 rounded-md font-bold">READ ONLY</span>}
          </div>
        }
        description="Dynamic timeline tracking dashboard with automated row/column matrix mapping configurations."
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Operations' },
          { label: 'Attendance' },
        ]}
        actions={
          <div className="flex items-center gap-3 w-full md:w-auto pointer-events-auto">
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-9 pr-4 py-1.5 w-full md:w-48 rounded-lg bg-card border text-xs font-semibold focus:outline-none"
              />
            </div>
            <button onClick={() => void loadDataRegistry(false)} className="inline-flex items-center justify-center px-3 h-9 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold gap-1.5">
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Sync
            </button>
          </div>
        }
      />

      {/* TOP-RIGHT POPUP TOAST BOX */}
      {successMsg && (
        <div className='fixed top-6 right-6 z-50 max-w-sm p-4 bg-white dark:bg-zinc-900 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl shadow-xl flex items-start gap-3 animate-in slide-in-from-top-4 fade-in duration-300'>
          <CheckCircle2 className='h-5 w-5 shrink-0 text-emerald-500 mt-0.5' />
          <div>
            <p className='font-semibold mb-0.5'>Action Successful</p>
            <p className='text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed'>{successMsg}</p>
          </div>
        </div>
      )}

      {/* 2. PROTECTED WRAPPER GUARDS ONLY THE UNDERLYING DASHBOARD BLOCKS */}
      <ProtectedFeature
        featureKey='attendance'
        featureName='Attendance Management'
        isEnabled={featureEnabled}
        schoolId={user?.schoolId || undefined}
      >
        <div className="space-y-6">
          {/* TODAY'S TARGET PRESENT/ABSENT OVERVIEW SEGMENT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-2xl border border-border/80">
            {/* Present Grid Column */}
            <div className="bg-card rounded-xl p-4 border border-emerald-500/20 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" /> Present Right Now ({stats.present})
                </span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {teachers.filter(t => getTeacherCurrentStatus(t.id) === 'PRESENT').map(t => (
                  <span key={t.id} className="text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    {t.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Absent Grid Column */}
            <div className="bg-card rounded-xl p-4 border border-destructive/20 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-destructive flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" /> Absent / On Leave ({stats.absent})
                </span>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {teachers.filter(t => getTeacherCurrentStatus(t.id) === 'ABSENT').map(t => (
                  <span key={t.id} className="text-xs font-semibold bg-destructive/10 text-destructive px-2.5 py-1 rounded-lg border border-destructive/20 animate-pulse">
                    {t.name}
                  </span>
                ))}
                {stats.absent === 0 && <p className="text-xs text-muted-foreground italic">No faculty absences recorded today.</p>}
              </div>
            </div>
          </div>

          {/* CHRONOLOGICAL RANGE FILTER PANEL */}
          <div className="glass-panel p-4 rounded-xl border border-border/80 space-y-3 pointer-events-auto">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              Range Matrix Multi-Day Parser
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">From:</span>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-card border p-1.5 rounded-lg text-xs font-semibold" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">To:</span>
                <input type="date" value={endDate} max={todayStr} onChange={(e) => setEndDate(e.target.value)} className="bg-card border p-1.5 rounded-lg text-xs font-semibold" />
              </div>
              <button onClick={fetchRangeTelemetry} disabled={isRangeLoading} className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold rounded-lg disabled:opacity-50">
                {isRangeLoading ? 'Spreading Columns...' : 'Generate Matrix Grid'}
              </button>
            </div>
          </div>

          {/* SEARCH/FILTERS CONTAINER */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search faculty name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border text-xs font-semibold focus:outline-none"
              />
            </div>
            <div className="flex bg-muted/60 p-1 rounded-xl border w-full sm:w-auto">
              {(['ALL', 'PRESENT', 'ABSENT'] as StatusFilter[]).map((tab) => (
                <button key={tab} onClick={() => setStatusFilter(tab)} className={cn("px-4 py-2 text-[10px] font-black tracking-widest uppercase rounded-lg transition-all", statusFilter === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* CORE MATRIX TABLE DESIGN */}
          <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[800px]">
              <thead>
                <tr className="bg-muted/80 border-b text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <th className="p-4 min-w-[200px]">Faculty Head</th>
                  <th className="p-4 text-center w-[140px]">Selected Date Status</th>
                  
                  {/* Dynamic Column Binding for Unique Dates */}
                  {uniqueDates.map(dateHeader => (
                    <th key={dateHeader} className="p-4 text-center border-l border-border/40 min-w-[100px] bg-muted/30">
                      {dateHeader}
                    </th>
                  ))}

                  {/* Aggregation Accumulators Header Columns */}
                  {uniqueDates.length > 0 && (
                    <>
                      <th className="p-4 text-center border-l-2 border-emerald-500/30 text-emerald-600 bg-emerald-500/5 min-w-[80px]">Total P</th>
                      <th className="p-4 text-center border-l border-destructive/30 text-destructive bg-destructive/5 min-w-[80px]">Total A</th>
                    </>
                  )}
                  <th className="p-4 text-right print:hidden min-w-[260px]">Actions Desk</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs font-semibold">
                {filteredTeachers.map((teacher) => {
                  const liveStatus = getTeacherCurrentStatus(teacher.id);
                  const isWorking = updatingId === teacher.id;
                  const teacherLogs = rangeSummary[teacher.id] || [];

                  // Calculate runtime sums
                  const summaryPresentCount = teacherLogs.filter(l => l.status === 'P').length;
                  const summaryAbsentCount = teacherLogs.filter(l => l.status === 'A').length;

                  return (
                    <tr key={teacher.id} className={cn("hover:bg-muted/30 transition-colors", liveStatus === 'ABSENT' && "bg-destructive/5")}>
                      {/* Row Head: Teacher Name & Email */}
                      <td className="p-4 sticky left-0 bg-card/90 backdrop-blur-sm shadow-sm">
                        <div className="font-extrabold text-sm text-foreground">{teacher.name}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">{teacher.email || 'N/A'}</div>
                      </td>

                      {/* Targeted Day Indicator */}
                      <td className="p-4 text-center">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1",
                          liveStatus === 'PRESENT' ? "bg-emerald-500 text-white" : "bg-destructive text-white"
                        )}>
                          {liveStatus === 'PRESENT' ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                          {liveStatus}
                        </span>
                      </td>

                      {/* Render sequential data points directly corresponding to headers */}
                      {uniqueDates.map(dateKey => {
                        const statusObj = teacherLogs.find(l => l.date === dateKey);
                        const statusLetter = statusObj ? statusObj.status : '-';
                        return (
                          <td key={dateKey} className="p-4 text-center border-l border-border/30 font-mono text-xs">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-black",
                              statusLetter === 'P' && "text-emerald-600 bg-emerald-500/10",
                              statusLetter === 'A' && "text-destructive bg-destructive/10",
                              statusLetter === '-' && "text-muted-foreground"
                            )}>
                              {statusLetter}
                            </span>
                          </td>
                        );
                      })}

                      {/* Accumulation Values Render Block */}
                      {uniqueDates.length > 0 && (
                        <>
                          <td className="p-4 text-center border-l-2 border-emerald-500/20 bg-emerald-500/5 font-black text-emerald-600 text-sm">
                            {summaryPresentCount}
                          </td>
                          <td className="p-4 text-center border-l border-destructive/20 bg-destructive/5 font-black text-destructive text-sm">
                            {summaryAbsentCount}
                          </td>
                        </>
                      )}

                      {/* Actions Column */}
                      <td className="p-4 text-right print:hidden">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={isWorking || !isEditable}
                            onClick={() => void handleStatusChange(teacher.id, 'PRESENT')}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider min-w-[100px]",
                              liveStatus === 'PRESENT' && isEditable ? "bg-emerald-600 text-white" : "bg-card border text-muted-foreground"
                            )}
                          >
                            Present
                          </button>
                          <button
                            disabled={isWorking || !isEditable}
                            onClick={() => void handleStatusChange(teacher.id, 'ABSENT')}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider min-w-[100px]",
                              liveStatus === 'ABSENT' && isEditable ? "bg-destructive text-white" : "bg-card border text-muted-foreground hover:bg-destructive/10"
                            )}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* EXPORT CONTROL DESK */}
          <div className="flex items-center justify-between pt-4 border-t print:hidden">
            <p className="text-[11px] text-muted-foreground font-semibold">
              Active roster grid contains <span className="text-foreground font-black">{filteredTeachers.length}</span> faculty tracks.
            </p>
            <div className="flex gap-3">
              <button onClick={() => window.print()} className="inline-flex items-center h-10 px-5 rounded-xl border bg-card text-xs font-black uppercase tracking-wider gap-2">
                <FileText className="h-4 w-4 text-destructive" /> Print Report
              </button>
              <button onClick={exportToExcel} className="inline-flex items-center h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider gap-2">
                <Download className="h-4 w-4" /> Export Matrix CSV
              </button>
            </div>
          </div>
        </div>
      </ProtectedFeature>
    </div>
  );
}