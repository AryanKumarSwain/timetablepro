'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import { getTeachers, getDailyDeskGrid } from '@/lib/api-services';
import type { Teacher } from '@/lib/types';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { Calendar, RefreshCw, CheckCircle, XCircle, Search, FileText, Download, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type StatusFilter = 'ALL' | 'PRESENT' | 'ABSENT';

export default function AdminAttendancePage() {
  useRequireAuth('admin');

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [gridData, setGridData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const loadDataRegistry = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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

  // Client-Side Search and Status Filter Logic
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
    try {
      setUpdatingId(teacherId);

      const response = await fetch('/api/admin/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: teacherId,
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
    } catch (err: any) {
      console.error('API Mutation Error:', err);
      toast.error(err.message || 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Metrics extraction helper
  const stats = useMemo(() => {
    const total = teachers.length;
    let absent = 0;
    teachers.forEach(t => {
      if (getTeacherCurrentStatus(t.id) === 'ABSENT') absent++;
    });
    return { total, absent, present: total - absent };
  }, [teachers, getTeacherCurrentStatus]);

  // Export to CSV/Excel Document Utility
  const exportToExcel = () => {
    try {
      const headers = ['Faculty Name', 'Email Address', 'Date Context', 'Attendance State'];
      const rows = filteredTeachers.map(t => [
        t.name,
        t.email || 'N/A',
        selectedDate,
        getTeacherCurrentStatus(t.id)
      ]);

      const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Attendance_Matrix_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Excel database logs generated safely.');
    } catch (err) {
      toast.error('Failed to compile data stream to Excel format.');
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4 mesh-gradient min-h-screen print:max-w-full print:p-0 print:bg-transparent">
      
      {/* SCREEN READABLE PAGE HEADER */}
      <div className="print:hidden">
        <PageHeader
          title={<span className=" font-black tracking-tight text-2xl">Attendance & Substitution Desk</span>}
          description="Enforce global roster updates. Active absent triggers instantly fire backup substitution slots."
          breadcrumbs={[
            { label: 'Admin', href: '/admin/dashboard' },
            { label: 'Operations' },
            { label: 'Roster Matrix' },
          ]}
          actions={
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-9 pr-4 py-1.5 w-full md:w-48 rounded-lg bg-card text-foreground border border-border text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <button 
                onClick={() => void loadDataRegistry(false)} 
                className="inline-flex items-center justify-center px-3 h-9 rounded-lg border border-border bg-card text-xs font-bold text-foreground hover:bg-muted transition-colors gap-1.5 shadow-sm"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 text-primary", loading && "animate-spin")} />
                Sync
              </button>
            </div>
          }
        />
      </div>

      {/* PRINT-ONLY TIMETABLE IDENTITY BLOCK */}
      <div className="hidden print:block border-b border-gray-300 pb-4 mb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight text-black">Roster Attendance Registry</h1>
        <p className="text-xs text-gray-600 font-medium">Systemic Scope Execution Date: <span className="font-bold">{selectedDate}</span></p>
      </div>

      {/* LIVE INTERACTIVE STATUS METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div className="glass-panel rounded-xl p-4 flex items-center justify-between border-l-4 border-l-primary shadow-sm">
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Total Teachers</p>
            <h4 className="text-2xl font-black mt-1">{stats.total}</h4>
          </div>
          <Users className="h-8 w-8 text-muted-foreground/30" />
        </div>
        <div className="glass-panel rounded-xl p-4 flex items-center justify-between border-l-4 border-l-emerald-500 shadow-sm">
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Present Teachers</p>
            <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.present}</h4>
          </div>
          <CheckCircle className="h-8 w-8 text-emerald-500/20" />
        </div>
        <div className="glass-panel rounded-xl p-4 flex items-center justify-between border-l-4 border-l-destructive shadow-sm">
          <div>
            <p className="text-[10px] uppercase font-black tracking-wider text-muted-foreground">Absent Teachers</p>
            <h4 className="text-2xl font-black text-destructive mt-1">{stats.absent}</h4>
          </div>
          <XCircle className="h-8 w-8 text-destructive/20" />
        </div>
      </div>

      {/* MULTI-CRITERIA FILTER ACTIONS BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center print:hidden">
        {/* Dynamic Search Box */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search teacher by name or institutional email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-xs font-semibold placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Custom Tab Toggles */}
        <div className="flex bg-muted/60 p-1 rounded-xl border border-border/80">
          {(['ALL', 'PRESENT', 'ABSENT'] as StatusFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={cn(
                "flex-1 text-[10px] font-black tracking-widest uppercase py-2 rounded-lg transition-all",
                statusFilter === tab 
                  ? "bg-card text-foreground shadow-sm border border-border/30" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* COMPACT DATA CORE GRID WRAPPER */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl print:border-none print:shadow-none">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-muted/80 border-b border-border/60 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <th className="p-4 w-[450px]">Faculty Personnel Identifier</th>
              <th className="p-4 w-[250px] text-center">Status Flag</th>
              <th className="p-4 text-right print:hidden">Mutation Desk Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-xs font-semibold">
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((teacher) => {
                const status = getTeacherCurrentStatus(teacher.id);
                const isWorking = updatingId === teacher.id;

                return (
                  <tr 
                    key={teacher.id} 
                    className={cn(
                      "transition-all duration-150 hover:bg-muted/40",
                      status === 'ABSENT' && "bg-destructive/5 pulse-absent"
                    )}
                  >
                    {/* Personnel Identity Block */}
                    <td className="p-4">
                      <div className="font-extrabold text-base tracking-tight text-foreground">{teacher.name}</div>
                      <div className="text-[10px] text-muted-foreground font-normal tracking-wide mt-0.5">
                        {teacher.email || 'No institutional mailbox assigned'}
                      </div>
                    </td>

                    {/* Status Pill Badge Display */}
                    <td className="p-4 text-center">
                      <span className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm print:border print:shadow-none",
                        status === 'PRESENT'
                          ? "bg-emerald-500 text-white print:bg-transparent print:text-emerald-600 print:border-emerald-600"
                          : "bg-destructive text-destructive-foreground print:bg-transparent print:text-red-600 print:border-red-600"
                      )}>
                        {status === 'PRESENT' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {status}
                      </span>
                    </td>

                    {/* Action Execution Fields */}
                    <td className="p-4 text-right print:hidden">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          disabled={isWorking}
                          onClick={() => void handleStatusChange(teacher.id, 'PRESENT')}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-150 min-w-[125px] text-center cursor-pointer shadow-sm border border-transparent",
                            status === 'PRESENT'
                              ? "bg-emerald-600 text-white shadow-emerald-600/20 shadow-md border-b-2 border-b-emerald-800"
                              : "bg-card text-muted-foreground border-border hover:bg-muted/80"
                          )}
                        >
                          Mark Present
                        </button>
                        <button
                          disabled={isWorking}
                          onClick={() => void handleStatusChange(teacher.id, 'ABSENT')}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-150 min-w-[125px] text-center cursor-pointer shadow-sm border border-transparent",
                            status === 'ABSENT'
                              ? "bg-destructive text-destructive-foreground shadow-destructive/20 shadow-md border-b-2 border-b-red-900"
                              : "bg-card text-muted-foreground border-border hover:bg-destructive/10 hover:text-destructive"
                          )}
                        >
                          Mark Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3} className="p-12 text-center text-muted-foreground font-medium tracking-wide">
                  No active personnel profiles match your filtering constraints.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* EXPORT OPTIONS ACCESS PANEL */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/40 print:hidden">
        <p className="text-[11px] text-muted-foreground font-semibold">
          Filtered Slice Matrix: <span className="text-foreground font-black">{filteredTeachers.length}</span> entries isolated.
        </p>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={exportToPDF}
            className="flex-1 sm:flex-none inline-flex items-center justify-center h-10 px-5 rounded-xl border border-border bg-card text-xs font-black uppercase tracking-wider text-foreground hover:bg-muted transition-colors gap-2 shadow-sm"
          >
            <FileText className="h-4 w-4 text-destructive" />
            Print Report
          </button>
          <button
            onClick={exportToExcel}
            className="flex-1 sm:flex-none inline-flex items-center justify-center h-10 px-5 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity gap-2 shadow-sm"
          >
            <Download className="h-4 w-4" />
            Export Sheets
          </button>
        </div>
      </div>

    </div>
  );
}