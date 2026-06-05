'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import { getTeachers, getDailyDeskGrid } from '@/lib/api-services';
import type { Teacher } from '@/lib/types';
import { GlassCard } from '@/components/enterprise/glass-card';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { Calendar, RefreshCw, UserCheck, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminAttendancePage() {
  useRequireAuth('admin');

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [gridData, setGridData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Load teachers list and daily desk slots matrix simultaneously
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

  // Read current attendance from backend response safely with absolute fallback redundancy
  const getTeacherCurrentStatus = (teacherId: string): 'PRESENT' | 'ABSENT' => {
    if (!gridData) return 'PRESENT';

    // Layer 1: Verify presence inside explicit global attendance logs array matching any structural key variations
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

    // Layer 2: Redundant Fallback Matrix Lookup — inspect layout cell elements directly
    // If ANY block today displays this instructor as absent, immediately treat as absolute ABSENT state
    if (gridData.grid && Array.isArray(gridData.grid)) {
      for (const row of gridData.grid) {
        const structuralCell = row.cells?.find((c: any) => c.teacherId === teacherId && !c.empty);
        if (structuralCell && structuralCell.isAbsent) {
          return 'ABSENT';
        }
      }
    }
    
    return 'PRESENT';
  };

  // Submit data directly to POST endpoint route
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
      
      // Force instant silent reload to fetch updated grid arrays from server
      await loadDataRegistry(true);
    } catch (err: any) {
      console.error('API Mutation Error:', err);
      toast.error(err.message || 'Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Duty Roster & Attendance Controls"
        description="Select daily attendance states. Present teachers maintain slots; Absent triggers substitution workflow."
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Operations' },
          { label: 'Attendance' },
        ]}
        actions={
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-9 pr-4 py-1.5 w-full md:w-48 rounded-xl bg-background border border-border/60 text-xs font-semibold focus:outline-none"
              />
            </div>
            <button 
              onClick={() => void loadDataRegistry(false)} 
              className="inline-flex items-center justify-center px-3 h-9 rounded-xl border border-border bg-background text-xs font-bold hover:bg-muted transition-colors gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Sync
            </button>
          </div>
        }
      />

      <GlassCard className="p-0 overflow-hidden border border-border/60 mt-6">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-muted/60 border-b border-border/40 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              <th className="p-4 w-[400px]">Faculty Personnel Details</th>
              <th className="p-4 w-[250px] text-center">Current Status</th>
              <th className="p-4 text-right">Actions Matrix</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30 text-xs font-medium">
            {teachers.map((teacher) => {
              const status = getTeacherCurrentStatus(teacher.id);
              const isWorking = updatingId === teacher.id;

              return (
                <tr key={teacher.id} className={cn("hover:bg-muted/5 transition-colors", status === 'ABSENT' && "bg-rose-500/[0.02]")}>
                  <td className="p-4">
                    <div className="font-bold text-foreground">{teacher.name}</div>
                    <div className="text-[10px] text-muted-foreground font-normal mt-0.5">{teacher.email || 'No institutional mail bound'}</div>
                  </td>
                  
                  {/* CURRENT METRIC STATUS BADGE */}
                  <td className="p-4 text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm transition-all",
                      status === 'PRESENT' ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    )}>
                      {status === 'PRESENT' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {status}
                    </span>
                  </td>
                  
                  {/* ACTION BUTTONS WITH SOLID COLORS */}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        disabled={isWorking}
                        onClick={() => void handleStatusChange(teacher.id, 'PRESENT')}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-sm duration-150 min-w-[120px] text-center",
                          status === 'PRESENT'
                            ? "bg-emerald-500 text-white border-b-2 border-emerald-700" 
                            : "bg-background text-muted-foreground border border-border/80 hover:bg-muted opacity-60"
                        )}
                      >
                        Mark Present
                      </button>
                      <button
                        disabled={isWorking}
                        onClick={() => void handleStatusChange(teacher.id, 'ABSENT')}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-sm duration-150 min-w-[120px] text-center",
                          status === 'ABSENT'
                            ? "bg-rose-500 text-white border-b-2 border-rose-700" 
                            : "bg-background text-muted-foreground border border-border/80 hover:bg-rose-500/10 opacity-60"
                        )}
                      >
                        Mark Absent
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}