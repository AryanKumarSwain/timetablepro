'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getPublishedWeeklyTimetable,
  getPeriods,
  getClasses,
  getSubjects,
} from '@/lib/api-services';
import {
  WeeklyTimetableEntry,
  Period,
  Class,
  Subject,
} from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Eye, Calendar, Layers, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_INDICES = [1, 2, 3, 4, 5, 6];

export default function TeacherWeeklySchedulePage() {
  const auth = useRequireAuth('teacher');
  const [allTimetableSlots, setAllTimetableSlots] = useState<WeeklyTimetableEntry[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [timetableData, periodsData, classesData, subjectsData] =
          await Promise.all([
            getPublishedWeeklyTimetable(),
            getPeriods(),
            getClasses(),
            getSubjects(),
          ]);

        if (!isMounted) return;

        const allocatedPeriodIds = new Set(
          timetableData.map((slot: any) => slot.periodId)
        );

        const relevantPeriods = periodsData.filter((p: any) => 
          allocatedPeriodIds.has(p.id)
        );

        const sortedPeriods = [...relevantPeriods].sort((a, b) => {
          const timeA = (a.startTime || "").padStart(5, '0');
          const timeB = (b.startTime || "").padStart(5, '0');
          return timeA.localeCompare(timeB);
        });

        setAllTimetableSlots(timetableData);
        setPeriods(sortedPeriods);
        setClasses(classesData);
        setSubjects(subjectsData);
      } catch (error) {
        console.error('Failed to synchronize master admin schedule engine parameters:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  const subjectColorMap = useMemo(() => new Map(subjects.map((s) => [s.id, (s as any).color || '#059669'])), [subjects]);

  const getClassName = (id: string) => classMap.get(id) || 'Unknown Batch';
  const getSubjectName = (id: string) => subjectMap.get(id) || 'Subject';
  const getSubjectColor = (id: string) => subjectColorMap.get(id) || '#059669';

  const currentTeacherId = auth.user?.teacherId;

  const filteredSlots = useMemo(() => {
    if (selectedClassId === 'all') {
      return allTimetableSlots;
    }
    return allTimetableSlots.filter((slot) => slot.classId === selectedClassId);
  }, [allTimetableSlots, selectedClassId]);

  const classCurrentlyViewingLabel = useMemo(() => {
    if (selectedClassId === 'all') return null;
    return classMap.get(selectedClassId) || null;
  }, [selectedClassId, classMap]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <p className="text-muted-foreground animate-pulse text-sm font-semibold tracking-wide">
          Synchronizing engine state with live admin master blueprints...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-6 space-y-6 bg-[#f8fafc] min-h-screen">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-full sm:w-[280px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              Select Batch Matrix
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs font-bold h-10 rounded-xl border border-slate-200 bg-white px-3 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">⚡ All My Scheduled Batches</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  🏫 Class {cls.name}
                </option>
              ))}
            </select>
          </div>

          {classCurrentlyViewingLabel && (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-emerald-700 border border-emerald-500/20 self-end h-10 shadow-sm">
              <Layers className="h-3.5 w-3.5 text-emerald-600" />
              <span>{classCurrentlyViewingLabel}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-center">
          <div className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-600 font-bold px-3 py-2 h-10 rounded-xl border border-emerald-200/60 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            LIVE TIMETABLE
          </div>
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 text-slate-500 font-bold px-3 py-2 h-10 rounded-xl border border-slate-200 shadow-sm">
            <Eye className="h-4 w-4 text-slate-400" />
            READ-ONLY
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              My Weekly Routines
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200">
                <th className="p-4 text-xs font-black uppercase tracking-widest text-slate-400 w-[180px]">
                  TIME PLANNER
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    className="p-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600 border-l border-slate-100 min-w-[160px]"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {periods.map((period) => {
                const isBreakPeriod =
                  (period as any).isBreak === true ||
                  period.label?.toLowerCase().includes('break') ||
                  period.label?.toLowerCase().includes('lunch');

                return (
                  <tr key={period.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="p-4 font-medium whitespace-nowrap bg-slate-50/40 border-r border-slate-200/80">
                      <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        {period.label || `Period ${period.periodNumber}`}
                      </div>
                      <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                        {period.startTime} - {period.endTime}
                      </div>
                    </td>

                    {DAY_INDICES.map((dayIndex) => {
                      if (isBreakPeriod) {
                        return (
                          <td
                            key={`${dayIndex}-${period.id}`}
                            className="p-4 border-l border-slate-100 bg-amber-500/[0.01] text-center align-middle"
                          >
                            <span className="text-[10px] font-bold tracking-widest text-amber-600 uppercase bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/40">
                              LUNCH BREAK
                            </span>
                          </td>
                        );
                      }

                      const cellSlots = filteredSlots.filter(
                        (s) => s.dayOfWeek === dayIndex && s.periodId === period.id
                      );

                      // Filter out everything except this specific logged-in teacher
                      const teacherSpecificSlot = cellSlots.find(
                        (s) => s.teacherId === currentTeacherId
                      );

                      return (
                        <td
                          key={`${dayIndex}-${period.id}`}
                          className={cn(
                            'p-3 border-l border-slate-100 align-top min-h-[105px]',
                            // Highly visible glowing emerald backdrop accent for running sessions
                            teacherSpecificSlot ? 'bg-emerald-500/[0.08]' : 'bg-transparent'
                          )}
                        >
                          {teacherSpecificSlot ? (
                            // Highly green customized card layout
                            <Card className="p-3 bg-emerald-500 border border-emerald-600 shadow-md flex flex-col justify-between min-h-[85px] rounded-xl group hover:bg-emerald-600 transition-colors">
                              <div>
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-white text-emerald-700 mb-2 shadow-sm">
                                  {getSubjectName(teacherSpecificSlot.subjectId)}
                                </span>
                                <p className="font-extrabold text-sm text-white tracking-wide">
                                  Class {getClassName(teacherSpecificSlot.classId)}
                                </p>
                              </div>
                              <div className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider pt-1.5 border-t border-emerald-400/40 mt-2 flex items-center gap-1">
                                <BookOpen className="h-2.5 w-2.5 text-white" /> Active Session
                              </div>
                            </Card>
                          ) : (
                            // Safe layout fallback: All other teachers' entries are skipped/hidden completely
                            <div className="text-center py-7">
                              <span className="text-slate-200 font-light">—</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}