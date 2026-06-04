'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/auth-context';
import { getTeachers, getDailyDeskGrid, markAttendance, type DailyDeskGrid } from '@/lib/api-services';
import type { Teacher } from '@/lib/types';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, AlertCircle, Save, RefreshCw, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TeacherAttendancePage() {
  useRequireAuth('admin');
  const router = useRouter();

  // State Management
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [gridData, setGridData] = useState<DailyDeskGrid | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingState, setSavingState] = useState<Record<string, boolean>>({});

  // Core Data Loader
  const loadAttendanceMatrix = useCallback(async () => {
    try {
      setLoading(true);
      const [teachersList, deskGrid] = await Promise.all([
        getTeachers(),
        getDailyDeskGrid(selectedDate),
      ]);
      setTeachers(teachersList);
      setGridData(deskGrid);
    } catch (error) {
      console.error('Failed to pull localized teacher timeline matrix:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadAttendanceMatrix();
  }, [loadAttendanceMatrix]);

  // Helper function to check if a teacher is absent for a given period from the grid data
  const isPeriodAbsent = (teacherId: string, periodId: string): boolean => {
    if (!gridData) return false;
    const periodRow = gridData.grid.find((row) => row.periodId === periodId);
    if (!periodRow) return false;
    
    // Find any cell where this teacher teaches during this period and is marked absent
    const cell = periodRow.cells.find((c) => c.teacherId === teacherId);
    return cell ? cell.isAbsent : false;
  };

  // Helper function to check if a teacher is absent for ALL assigned periods (Full Day)
  const isFullDayAbsent = (teacherId: string): boolean => {
    if (!gridData) return false;
    
    let totalAssignedPeriods = 0;
    let absentPeriodsCount = 0;

    gridData.grid.forEach((row) => {
      const cell = row.cells.find((c) => c.teacherId === teacherId && !c.empty);
      if (cell) {
        totalAssignedPeriods++;
        if (cell.isAbsent) absentPeriodsCount++;
      }
    });

    return totalAssignedPeriods > 0 && totalAssignedPeriods === absentPeriodsCount;
  };

  // Dispatch attendance changes to backend API service
  const handleAttendanceToggle = async (
    teacherId: string,
    periodId: string,
    currentAbsentStatus: boolean
  ) => {
    if (!gridData) return;
    const key = `${teacherId}-${periodId}`;
    
    try {
      setSavingState((prev) => ({ ...prev, [key]: true }));
      
      // Locate the targeted cell instance to get the context classId
      const periodRow = gridData.grid.find((row) => row.periodId === periodId);
      const cell = periodRow?.cells.find((c) => c.teacherId === teacherId && !c.empty);

      if (!cell) {
        console.warn(`No assigned class found for teacher ${teacherId} in period ${periodId}`);
        return;
      }

      // Flip the current status: if currently absent, mark present (false), and vice versa
      await markAttendance(cell.classId, periodId, teacherId, selectedDate, !currentAbsentStatus);
      
      // Refresh local view data and synchronize global Next.js cache state
      await loadAttendanceMatrix();
      router.refresh();
    } catch (err) {
      console.error('Error changing local execution marker parameter:', err);
    } finally {
      setSavingState((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Full Day Bulk Attendance Action
  const handleFullDayToggle = async (teacherId: string, markAsAbsent: boolean) => {
    if (!gridData) return;
    const key = `${teacherId}-fullday`;

    try {
      setSavingState((prev) => ({ ...prev, [key]: true }));

      // Find all active class sessions this teacher owns throughout the selected day
      const promises: Promise<any>[] = [];
      
      gridData.grid.forEach((row) => {
        const cell = row.cells.find((c) => c.teacherId === teacherId && !c.empty);
        if (cell) {
          // Fire updates in parallel for each assigned slot
          promises.push(
            markAttendance(cell.classId, row.periodId, teacherId, selectedDate, markAsAbsent)
          );
        }
      });

      if (promises.length === 0) {
        window.alert('This teacher has no active periods assigned in the baseline timetable today.');
        return;
      }

      await Promise.all(promises);
      await loadAttendanceMatrix();
      router.refresh();
    } catch (err) {
      console.error('Failed executing full day operations modification matrix:', err);
    } finally {
      setSavingState((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 p-4">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-foreground flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-indigo-500" />
            Teacher Attendance Register
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage granular absences. Checked entries mark absences, which flow live onto your Daily Desk matrix.
          </p>
        </div>

        {/* DATE PICKER & FORCE SYNC CONTROL */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-9 pr-4 py-1.5 w-full md:w-48 rounded-xl bg-background border border-border/60 text-xs font-semibold focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void loadAttendanceMatrix()}
            className="rounded-xl border-border/80 h-9 text-xs font-bold"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
            Sync
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 py-12 text-center text-xs font-medium text-muted-foreground animate-pulse">
          Parsing timetable registry structures...
        </div>
      ) : (
        <GlassCard className="p-0 overflow-hidden border border-border/60">
          <div className="w-full overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse text-left min-w-[900px]">
              <thead>
                <tr className="bg-muted/60 border-b border-border/40 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                  <th className="p-4 w-[240px] bg-muted/80 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    Faculty Personnel
                  </th>
                  <th className="p-4 text-center w-[150px]">
                    Full Day Absence
                  </th>
                  {gridData?.periods.map((period) => (
                    <th key={period.id} className="p-3 text-center border-l border-border/40 min-w-[120px]">
                      <div className="text-foreground font-bold">
                        {period.isBreak ? (period.label || 'BREAK') : `P${period.periodNumber}`}
                      </div>
                      <div className="text-[9px] text-muted-foreground font-medium lowercase tracking-normal">
                        ({period.startTime})
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 text-xs font-medium text-foreground">
                {teachers.map((teacher) => {
                  const fullAbsent = isFullDayAbsent(teacher.id);
                  const isFullDaySaving = savingState[`${teacher.id}-fullday`];

                  return (
                    <tr 
                      key={teacher.id} 
                      className={cn(
                        "hover:bg-muted/5 transition-colors",
                        fullAbsent && "bg-rose-500/[0.02]"
                      )}
                    >
                      {/* Name Column */}
                      <td className="p-4 font-bold sticky left-0 bg-background/95 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-border/30">
                        <div className="truncate">{teacher.name}</div>
                        <div className="text-[10px] text-muted-foreground font-normal truncate mt-0.5">
                          {teacher.email || 'No registry email'}
                        </div>
                      </td>

                      {/* Bulk Toggle Full Day Column */}
                      <td className="p-4 text-center vertical-middle">
                        <button
                          disabled={isFullDaySaving}
                          onClick={() => void handleFullDayToggle(teacher.id, !fullAbsent)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                            fullAbsent
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/30 shadow-sm"
                              : "bg-emerald-500/5 text-emerald-600 border-emerald-500/20 hover:bg-rose-500/5 hover:text-rose-500 hover:border-rose-500/20"
                          )}
                        >
                          {isFullDaySaving ? 'Updating...' : fullAbsent ? '⚡ Absent (All)' : 'Mark Absent'}
                        </button>
                      </td>

                      {/* Dynamic Intersect Periods Mapping */}
                      {gridData?.periods.map((period) => {
                        const periodRow = gridData.grid.find((row) => row.periodId === period.id);
                        const cell = periodRow?.cells.find((c) => c.teacherId === teacher.id && !c.empty);
                        
                        // If teacher doesn't have a class session during this period, block interaction safely
                        if (!cell) {
                          return (
                            <td key={period.id} className="p-3 text-center border-l border-border/30 text-muted-foreground/20 bg-muted/5 select-none">
                              <span className="text-[10px] tracking-widest font-normal">—</span>
                            </td>
                          );
                        }

                        const isAbsent = cell.isAbsent;
                        const isSaving = savingState[`${teacher.id}-${period.id}`];

                        return (
                          <td 
                            key={period.id} 
                            className={cn(
                              "p-3 text-center border-l border-border/30 transition-colors",
                              isAbsent ? "bg-rose-500/[0.03]" : "bg-emerald-500/[0.01]"
                            )}
                          >
                            <label className="flex flex-col items-center justify-center cursor-pointer gap-1.5 group select-none">
                              <input
                                type="checkbox"
                                checked={isAbsent}
                                disabled={isSaving || isFullDaySaving}
                                onChange={() => void handleAttendanceToggle(teacher.id, period.id, isAbsent)}
                                className="w-4 h-4 rounded border-border/80 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer disabled:opacity-40"
                              />
                              <span 
                                className={cn(
                                  "text-[9px] font-bold tracking-wide uppercase transition-colors px-1 rounded",
                                  isAbsent 
                                    ? "text-rose-600 bg-rose-500/10" 
                                    : "text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 group-hover:text-rose-500"
                                )}
                              >
                                {isSaving ? '...' : isAbsent ? 'Absent' : 'Present'}
                              </span>
                              <span className="text-[8px] text-muted-foreground font-medium max-w-[100px] truncate block opacity-70">
                                {cell.className} · {cell.subjectName}
                              </span>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}