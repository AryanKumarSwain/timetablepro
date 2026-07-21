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
import { Button } from '@/components/ui/button';
import { Eye, Calendar, Layers, BookOpen, Share2, CalendarX, Plus, CheckCircle2, X, Edit, Undo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlanTheme } from '@/lib/plan-theme';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_INDICES = [1, 2, 3, 4, 5, 6];

export default function TeacherWeeklySchedulePage() {
  const auth = useRequireAuth('teacher');
  const { theme } = usePlanTheme();
  const [allTimetableSlots, setAllTimetableSlots] = useState<WeeklyTimetableEntry[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [absentDialogOpen, setAbsentDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [absentReason, setAbsentReason] = useState('');
  const [fullDayAbsentDialogOpen, setFullDayAbsentDialogOpen] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [lastAbsentRequestId, setLastAbsentRequestId] = useState<string | null>(null);
  const [showUndoButton, setShowUndoButton] = useState(false);
  const [todoDialogOpen, setTodoDialogOpen] = useState(false);
  const [editTodoDialogOpen, setEditTodoDialogOpen] = useState(false);
  const [todoItems, setTodoItems] = useState<string[]>(['']);
  const [todos, setTodos] = useState<any[]>([]);
  const [editingTodos, setEditingTodos] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [timetableData, periodsData, classesData, subjectsData] =
          await Promise.all([
            getPublishedWeeklyTimetable(undefined, auth.user?.teacherId),
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
        
        // Load todos
        await loadTodos();
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

  const getClassName = (id: string) => classMap.get(id) || 'Unknown Batch';
  const getSubjectName = (id: string) => subjectMap.get(id) || 'Subject';

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

  const handleMarkAbsent = (slot: any, dayIndex: number) => {
    setSelectedSlot({ ...slot, dayIndex });
    setAbsentDialogOpen(true);
  };

  const handleFullDayAbsent = (dayIndex: number) => {
    setSelectedDayIndex(dayIndex);
    setFullDayAbsentDialogOpen(true);
  };

  const handleAddTodo = (slot: any, dayIndex: number) => {
    setSelectedSlot({ ...slot, dayIndex });
    setTodoItems(['']);
    setTodoDialogOpen(true);
  };

  const handleEditTodo = (slot: any, dayIndex: number) => {
    setSelectedSlot({ ...slot, dayIndex });
    const slotTodos = getTodosForSlot({ ...slot, dayIndex });
    setEditingTodos(slotTodos);
    setTodoItems(slotTodos.map((t: any) => t.title));
    setEditTodoDialogOpen(true);
  };

  const handleDeleteTodo = async (todoId: string) => {
    try {
      const response = await fetch(`/api/teacher/todos/${todoId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        loadTodos();
      } else {
        console.error('Failed to delete TODO:', response.status);
      }
    } catch (error) {
      console.error('Failed to delete TODO:', error);
    }
  };

  const handleSubmitTodo = async () => {
    if (!selectedSlot || !auth.user?.teacherId) return;

    const validItems = todoItems.filter(item => item.trim());
    if (validItems.length === 0) {
      window.alert('Please add at least one TODO item.');
      return;
    }

    try {
      // Calculate the date for the selected day
      const today = new Date();
      const dayOfWeek = selectedSlot.dayIndex;
      const currentDay = today.getDay();
      
      // Handle day index mapping (Monday=1 to Saturday=6, Sunday=0)
      let diff;
      if (dayOfWeek === 0) {
        diff = 0 - currentDay;
      } else if (currentDay === 0) {
        diff = dayOfWeek - 7;
      } else {
        diff = dayOfWeek - currentDay;
      }
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + diff);
      
      // Validate the date is valid
      if (isNaN(targetDate.getTime())) {
        window.alert('Invalid date calculation. Please try again.');
        return;
      }
      
      const dateStr = targetDate.toISOString().split('T')[0];
      console.log('handleSubmitTodo date calculation:', { today, dayOfWeek, currentDay, diff, targetDate, dateStr });

      // Create multiple TODOs
      const promises = validItems.map(title =>
        fetch('/api/teacher/todos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: dateStr,
            periodId: String(selectedSlot.periodId ?? selectedSlot.periodNumber),
            classId: String(selectedSlot.classId),
            title,
          }),
        })
      );

      const responses = await Promise.all(promises);
      console.log('TODO creation responses:', responses);
      const allSuccessful = responses.every(r => r.ok);

      if (allSuccessful) {
        window.alert(`${validItems.length} TODO(s) added successfully!`);
        setTodoDialogOpen(false);
        setTodoItems(['']);
        setSelectedSlot(null);
        // Reload todos
        loadTodos();
      } else {
        const failedResponses = responses.filter(r => !r.ok);
        console.error('Failed TODO responses:', failedResponses);
        window.alert('Failed to add some TODOs. Please try again.');
      }
    } catch (error) {
      console.error('Failed to add TODO:', error);
      window.alert('Failed to add TODO. Please try again.');
    }
  };

  // FIX: previously this only read `slot.dayIndex`, which is only ever set
  // when a dialog is opened (handleAddTodo / handleEditTodo / handleMarkAbsent).
  // The slot objects rendered directly in the table only carry `dayOfWeek`
  // (from the API), so `slot.dayIndex` was `undefined` there, the date
  // calculation produced `NaN`, and this function silently returned `[]`.
  // That made the TODO count badge and the "Edit" button never appear for
  // cells that already had TODOs saved — even though the TODOs were still
  // safely stored on the server — making it look like previously added
  // TODOs "disappeared" whenever a new one was added.
  const getTodosForSlot = (slot: any) => {
    const today = new Date();
    const dayOfWeek = slot.dayIndex ?? slot.dayOfWeek;
    const currentDay = today.getDay();
    
    // Handle day index mapping (Monday=1 to Saturday=6, Sunday=0)
    // JavaScript getDay(): Sunday=0, Monday=1, ..., Saturday=6
    let diff;
    if (dayOfWeek === 0) {
      // Sunday
      diff = 0 - currentDay;
    } else if (currentDay === 0) {
      // Today is Sunday, target is weekday (1-6)
      diff = dayOfWeek - 7;
    } else {
      diff = dayOfWeek - currentDay;
    }
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + diff);
    
    // Validate the date is valid
    if (isNaN(targetDate.getTime())) {
      return [];
    }
    
    const dateStr = targetDate.toISOString().split('T')[0];

    return todos.filter(t => 
      t.date === dateStr && 
      String(t.periodId) === String(slot.periodId) && 
      String(t.classId) === String(slot.classId)
    );
  };

  const handleSubmitEditTodo = async () => {
    if (!selectedSlot || !auth.user?.teacherId) return;

    try {
      // Delete existing todos for this slot
      const slotTodos = getTodosForSlot(selectedSlot);
      await Promise.all(
        slotTodos.map((t: any) =>
          fetch(`/api/teacher/todos/${t.id}`, { method: 'DELETE' })
        )
      );

      // Create new todos from the edited items
      const validItems = todoItems.filter(item => item.trim());
      if (validItems.length > 0) {
        const today = new Date();
        const dayOfWeek = selectedSlot.dayIndex;
        const currentDay = today.getDay();
        
        // Handle day index mapping (Monday=1 to Saturday=6, Sunday=0)
        let diff;
        if (dayOfWeek === 0) {
          diff = 0 - currentDay;
        } else if (currentDay === 0) {
          diff = dayOfWeek - 7;
        } else {
          diff = dayOfWeek - currentDay;
        }
        
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + diff);
        
        // Validate the date is valid
        if (isNaN(targetDate.getTime())) {
          window.alert('Invalid date calculation. Please try again.');
          return;
        }
        
        const dateStr = targetDate.toISOString().split('T')[0];

        const promises = validItems.map(title =>
          fetch('/api/teacher/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: dateStr,
              periodId: String(selectedSlot.periodId ?? selectedSlot.periodNumber),
              classId: String(selectedSlot.classId),
              title,
            }),
          })
        );

        await Promise.all(promises);
      }

      window.alert('TODOs updated successfully!');
      setEditTodoDialogOpen(false);
      setTodoItems(['']);
      setSelectedSlot(null);
      setEditingTodos([]);
      loadTodos();
    } catch (error) {
      console.error('Failed to update TODOs:', error);
      window.alert('Failed to update TODOs. Please try again.');
    }
  };

  const loadTodos = async () => {
    try {
      const response = await fetch('/api/teacher/todos');
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded todos in weekly schedule:', data);
        setTodos(data.todos || []);
      } else {
        console.error('Failed to load todos:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to load todos:', error);
    }
  };

  const handleUndoAbsentRequest = async () => {
    if (!lastAbsentRequestId) return;

    try {
      const response = await fetch(`/api/teacher/absent-request/${lastAbsentRequestId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowUndoButton(false);
        setLastAbsentRequestId(null);
        setSelectedDayIndex(null);
        window.alert('Absent request reverted successfully!');
      } else {
        const error = await response.json();
        window.alert(`Failed to revert request: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to revert absent request:', error);
      window.alert('Failed to revert request. Please try again.');
    }
  };

  const handleSubmitFullDayAbsentRequest = async () => {
    if (selectedDayIndex === null || !auth.user?.teacherId) return;

    try {
      // Calculate the date for the selected day
      const today = new Date();
      const dayOfWeek = selectedDayIndex;
      const currentDay = today.getDay();
      
      // Handle day index mapping (Monday=1 to Saturday=6, Sunday=0)
      let diff;
      if (dayOfWeek === 0) {
        diff = 0 - currentDay;
      } else if (currentDay === 0) {
        diff = dayOfWeek - 7;
      } else {
        diff = dayOfWeek - currentDay;
      }
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + diff);
      
      // Validate the date is valid
      if (isNaN(targetDate.getTime())) {
        window.alert('Invalid date calculation. Please try again.');
        return;
      }
      
      const dateStr = targetDate.toISOString().split('T')[0];

      // Create absent request for all periods of that day
      const teacherSlots = allTimetableSlots.filter(
        (s) => s.dayOfWeek === dayOfWeek && s.teacherId === auth.user?.teacherId
      );

      if (teacherSlots.length === 0) {
        window.alert('No classes scheduled for this day.');
        return;
      }

      // Submit request for the first slot (represents full day)
      const firstSlot = teacherSlots[0];
      const response = await fetch('/api/teacher/absent-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: auth.user.teacherId,
          date: dateStr,
          periodId: firstSlot.periodId,
          classId: firstSlot.classId,
          reason: `Full-day absence: ${absentReason}`,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastAbsentRequestId(data.request?.id || data.absentRequest?.id || null);
        setShowUndoButton(true);
        window.alert('Full-day absent request submitted successfully! Admin will review it.');
        setFullDayAbsentDialogOpen(false);
        setAbsentReason('');
        setSelectedDayIndex(dayOfWeek);
      } else {
        const error = await response.json();
        window.alert(`Failed to submit request: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to submit full-day absent request:', error);
      window.alert('Failed to submit request. Please try again.');
    }
  };

  const handleSubmitAbsentRequest = async () => {
    if (!selectedSlot || !auth.user?.teacherId) return;

    try {
      // Calculate the date for the selected day
      const today = new Date();
      const dayOfWeek = selectedSlot.dayIndex;
      const currentDay = today.getDay();
      
      // Handle day index mapping (Monday=1 to Saturday=6, Sunday=0)
      let diff;
      if (dayOfWeek === 0) {
        diff = 0 - currentDay;
      } else if (currentDay === 0) {
        diff = dayOfWeek - 7;
      } else {
        diff = dayOfWeek - currentDay;
      }
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + diff);
      
      // Validate the date is valid
      if (isNaN(targetDate.getTime())) {
        window.alert('Invalid date calculation. Please try again.');
        return;
      }
      
      const dateStr = targetDate.toISOString().split('T')[0];

      const response = await fetch('/api/teacher/absent-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: auth.user.teacherId,
          date: dateStr,
          periodId: selectedSlot.periodId,
          classId: selectedSlot.classId,
          reason: absentReason,
        }),
      });

      if (response.ok) {
        window.alert('Absent request submitted successfully! Admin will review it.');
        setAbsentDialogOpen(false);
        setAbsentReason('');
        setSelectedSlot(null);
      } else {
        const error = await response.json();
        window.alert(`Failed to submit request: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to submit absent request:', error);
      window.alert('Failed to submit request. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-muted-foreground animate-pulse text-sm font-semibold tracking-wide text-center">
          Synchronizing engine state with live admin master blueprints...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-3 sm:p-6 space-y-6 bg-background text-foreground min-h-screen">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-full sm:w-[280px]">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
              Select Batch Matrix
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs font-bold h-10 rounded-xl border border-input bg-background px-3 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="all">All My Scheduled Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {classCurrentlyViewingLabel && (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-blue-500 border border-blue-500/20 self-end h-10 shadow-sm">
              <Layers className="h-3.5 w-3.5 text-blue-500" />
              <span>{classCurrentlyViewingLabel}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-end md:self-center">

          <div className="flex items-center gap-1.5 text-xs bg-blue-500/10 text-blue-500 font-bold px-3 py-2 h-10 rounded-xl border border-blue-500/20 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            LIVE TIMETABLE
          </div>
          <div className="flex items-center gap-1.5 text-xs bg-muted text-muted-foreground font-bold px-3 py-2 h-10 rounded-xl border border-border shadow-sm">
            <Eye className="h-4 w-4 text-muted-foreground" />
            READ-ONLY
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-bold text-card-foreground uppercase tracking-wider">
              My Weekly Routines
            </span>
          </div>
        </div>

        {/* Mobile scroll hint */}
        <div className="sm:hidden text-[10px] font-semibold text-muted-foreground text-center py-2 border-b border-border/40 tracking-wide">
          ← Scroll sideways to see all days →
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[1100px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="p-4 text-xs font-black uppercase tracking-widest text-muted-foreground w-[180px] sticky left-0 bg-muted/50 z-10">
                  TIME PLANNER
                </th>
                {DAYS.map((day, idx) => {
                  const today = new Date();
                  const currentDay = today.getDay();
                  const dayIndex = DAY_INDICES[idx];
                  let diff;
                  if (dayIndex === 0) {
                    diff = 0 - currentDay;
                  } else if (currentDay === 0) {
                    diff = dayIndex - 7;
                  } else {
                    diff = dayIndex - currentDay;
                  }
                  const targetDate = new Date(today);
                  targetDate.setDate(today.getDate() + diff);
                  const dateStr = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  
                  return (
                    <th
                      key={day}
                      className={cn(
                        "p-3 sm:p-4 text-center text-xs font-bold uppercase tracking-wider text-card-foreground border-l min-w-[140px] sm:min-w-[160px]",
                        showUndoButton && selectedDayIndex === DAY_INDICES[idx] 
                          ? "border-rose-500 bg-rose-50/50" 
                          : "border-border/40"
                      )}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center justify-center gap-2">
                          {day}
                          {showUndoButton && selectedDayIndex === DAY_INDICES[idx] ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleUndoAbsentRequest}
                              className="h-7 w-7 sm:h-6 sm:w-6 p-0 rounded-lg border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
                              title="Undo Request"
                            >
                              <Undo className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 sm:h-6 sm:w-6 p-0 rounded-lg hover:bg-rose-500/10 text-rose-500 hover:text-rose-600"
                              onClick={() => handleFullDayAbsent(DAY_INDICES[idx])}
                              title="Request full-day absence"
                            >
                              <CalendarX className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">{dateStr}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {periods.map((period) => {
                const isBreakPeriod =
                  (period as any).isBreak === true ||
                  period.label?.toLowerCase().includes('break') ||
                  period.label?.toLowerCase().includes('lunch');

                return (
                  <tr key={period.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 sm:p-4 font-medium whitespace-nowrap bg-muted/20 border-r border-border sticky left-0 z-10">
                      <div className="text-xs font-bold text-foreground uppercase tracking-wide">
                        {period.label || `Period ${period.periodNumber}`}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                        {period.startTime} - {period.endTime}
                      </div>
                    </td>

                    {DAY_INDICES.map((dayIndex) => {
                      if (isBreakPeriod) {
                        return (
                          <td
                            key={`${dayIndex}-${period.id}`}
                            className="p-3 sm:p-4 border-l border-border/40 bg-amber-500/[0.02] text-center align-middle"
                          >
                            <span className="text-[10px] font-bold tracking-widest text-amber-500 uppercase bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                              LUNCH BREAK
                            </span>
                          </td>
                        );
                      }

                      const cellSlots = filteredSlots.filter(
                        (s) => s.dayOfWeek === dayIndex && s.periodId === period.id
                      );

                      const teacherSpecificSlot = cellSlots.find(
                        (s) => s.teacherId === currentTeacherId
                      );

                      const isProxySlot = teacherSpecificSlot && (teacherSpecificSlot as any).isProxy === true;

                      return (
                        <td
                          key={`${dayIndex}-${period.id}`}
                          className={cn(
                            'p-2 sm:p-3 border-l border-border/40 align-top min-h-[105px]',
                            teacherSpecificSlot ? (isProxySlot ? `bg-${theme.primary}/[0.06]` : 'bg-blue-500/[0.06]') : 'bg-transparent'
                          )}
                        >
                          {teacherSpecificSlot ? (
                            <div className="relative group">
                              <Card className={cn(
                                "p-3 border shadow-md flex flex-col justify-between min-h-[85px] rounded-xl group transition-colors",
                                isProxySlot
                                  ? `bg-${theme.primary} dark:bg-${theme.primaryDark} border-${theme.primaryDark} dark:border-${theme.primaryBorderDark} hover:bg-${theme.primaryHover} dark:hover:bg-${theme.primary}`
                                  : "bg-teal-500 dark:bg-teal-600 border-teal-600 dark:border-teal-700 hover:bg-teal-600 dark:hover:bg-teal-500"
                              )}>
                                <div>
                                  <span className={cn(
                                    "inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-2 shadow-sm",
                                    isProxySlot ? `bg-background ${theme.primaryText}` : "bg-background text-blue-500"
                                  )}>
                                    {isProxySlot ? 'PROXY' : getSubjectName(teacherSpecificSlot.subjectId)}
                                  </span>
                                  <p className="font-extrabold text-sm text-white tracking-wide">
                                    {getClassName(teacherSpecificSlot.classId)}
                                  </p>
                                </div>
                                <div className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider pt-1.5 border-t mt-2 flex items-center gap-1",
                                  isProxySlot ? `text-${theme.primaryLight} border-${theme.primary}/40` : "text-blue-100 border-blue-500/40"
                                )}>
                                  <BookOpen className="h-2.5 w-2.5 text-white" /> {isProxySlot ? 'Substitution' : 'Active Session'}
                                </div>
                              </Card>
                              {getTodosForSlot(teacherSpecificSlot).length > 0 && (
                                <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                                  {getTodosForSlot(teacherSpecificSlot).length}
                                </div>
                              )}
                              <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddTodo(teacherSpecificSlot, dayIndex)}
                                  className="h-7 w-7 sm:h-6 sm:w-6 p-0 rounded-full bg-white/90 hover:bg-white border-indigo-500/30 text-indigo-600 shadow-sm"
                                  title="Add TODO"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-7">
                              <span className="text-border font-light">—</span>
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

      <Dialog open={absentDialogOpen} onOpenChange={setAbsentDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark as Absent</DialogTitle>
            <DialogDescription>
              Submit a request to be absent for this class. The admin will review and approve your request.
            </DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <div className="py-4 space-y-2">
              <p className="text-sm font-medium">
                Class: {getClassName(selectedSlot.classId)}
              </p>
              <p className="text-sm text-muted-foreground">
                Subject: {getSubjectName(selectedSlot.subjectId)}
              </p>
              <p className="text-sm text-muted-foreground">
                Day: {DAYS[selectedSlot.dayIndex - 1] || 'Unknown'}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (optional)</label>
            <textarea
              value={absentReason}
              onChange={(e) => setAbsentReason(e.target.value)}
              placeholder="Provide a reason for your absence..."
              className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setAbsentDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSubmitAbsentRequest} className="w-full sm:w-auto">
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fullDayAbsentDialogOpen} onOpenChange={setFullDayAbsentDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Full-Day Absence</DialogTitle>
            <DialogDescription>
              Submit a request to be absent for the entire day. The admin will review and approve your request.
            </DialogDescription>
          </DialogHeader>
          {selectedDayIndex !== null && (
            <div className="py-4 space-y-2">
              <p className="text-sm font-medium">
                Day: {DAYS[selectedDayIndex - 1] || 'Unknown'}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (optional)</label>
            <textarea
              value={absentReason}
              onChange={(e) => setAbsentReason(e.target.value)}
              placeholder="Provide a reason for your absence..."
              className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setFullDayAbsentDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSubmitFullDayAbsentRequest} className="w-full sm:w-auto">
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={todoDialogOpen} onOpenChange={setTodoDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add TODOs</DialogTitle>
            <DialogDescription>
              Add multiple TODO items for this period. They will appear in your daily report.
            </DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <div className="py-4 space-y-2">
              <p className="text-sm font-medium">
                Class: {getClassName(selectedSlot.classId)}
              </p>
              <p className="text-sm text-muted-foreground">
                Subject: {getSubjectName(selectedSlot.subjectId)}
              </p>
              <p className="text-sm text-muted-foreground">
                Day: {DAYS[selectedSlot.dayIndex - 1] || 'Unknown'}
              </p>
              {getTodosForSlot(selectedSlot).length > 0 && (
                <div className="pt-2 mt-2 border-t border-border/60">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                    Already added ({getTodosForSlot(selectedSlot).length}):
                  </p>
                  <ul className="space-y-1">
                    {getTodosForSlot(selectedSlot).map((t: any) => (
                      <li key={t.id} className="text-xs text-foreground/80 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                        {t.title}
                        <button
                          onClick={() => handleDeleteTodo(t.id)}
                          className="ml-auto text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove TODO"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            <label className="text-sm font-medium">New TODO Items</label>
            {todoItems.map((item, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newItems = [...todoItems];
                    newItems[index] = e.target.value;
                    setTodoItems(newItems);
                  }}
                  placeholder={`TODO ${index + 1}`}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {todoItems.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newItems = todoItems.filter((_, i) => i !== index);
                      setTodoItems(newItems);
                    }}
                    className="h-9 w-9 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTodoItems([...todoItems, ''])}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Another TODO
            </Button>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => {
              setTodoDialogOpen(false);
              setTodoItems(['']);
            }} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSubmitTodo} className="w-full sm:w-auto">
              Add TODOs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editTodoDialogOpen} onOpenChange={setEditTodoDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit TODOs</DialogTitle>
            <DialogDescription>
              Edit TODO items for this period.
            </DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <div className="py-4 space-y-2">
              <p className="text-sm font-medium">
                Class: {getClassName(selectedSlot.classId)}
              </p>
              <p className="text-sm text-muted-foreground">
                Subject: {getSubjectName(selectedSlot.subjectId)}
              </p>
              <p className="text-sm text-muted-foreground">
                Day: {DAYS[selectedSlot.dayIndex - 1] || 'Unknown'}
              </p>
            </div>
          )}
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            <label className="text-sm font-medium">TODO Items</label>
            {todoItems.map((item, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newItems = [...todoItems];
                    newItems[index] = e.target.value;
                    setTodoItems(newItems);
                  }}
                  placeholder={`TODO ${index + 1}`}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                {todoItems.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newItems = todoItems.filter((_, i) => i !== index);
                      setTodoItems(newItems);
                    }}
                    className="h-9 w-9 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTodoItems([...todoItems, ''])}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Another TODO
            </Button>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => {
              setEditTodoDialogOpen(false);
              setTodoItems(['']);
              setEditingTodos([]);
            }} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleSubmitEditTodo} className="w-full sm:w-auto">
              Update TODOs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}