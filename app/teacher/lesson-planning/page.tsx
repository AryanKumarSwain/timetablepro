'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { BookMarked, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/enterprise/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { LessonCalendar } from '@/components/lesson-planning/lesson-calendar';
import { LessonPlanForm, LessonPlanFormData } from '@/components/lesson-planning/lesson-plan-form';
import { LessonPlanCard } from '@/components/lesson-planning/lesson-plan-card';
import { LessonStatsWidget } from '@/components/lesson-planning/lesson-stats-widget';

interface TimetableSlot {
  id: string;
  classId: string;
  class: { name: string };
  subjectId: string;
  subject: { name: string };
  periodId: string;
  period: { startTime: string; endTime: string };
  dayOfWeek: number;
}

interface LessonPlan {
  id: string;
  lessonTitle: string;
  topic?: string;
  planDate: string;
  status: string;
  estimatedDuration?: number;
  classId: string;
  class: { name: string };
  subjectId: string;
  subject: { name: string };
  periodId: string;
  period: { startTime: string; endTime: string };
  slotId: string;
}

interface ClassOption {
  id: string;
  name: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

export default function LessonPlanningPage() {
  const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LessonPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');

  // Fetch all lesson plans on mount (removed filter dependencies to preserve daily schedule)
  useEffect(() => {
    fetchLessonPlans();
  }, []);

  useEffect(() => {
    fetchTimetableSlots(selectedDate);
    fetchClassesAndSubjects();
  }, [selectedDate]);

  const fetchClassesAndSubjects = async () => {
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/subjects'),
      ]);

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData);
      }

      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json();
        setSubjects(subjectsData);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchLessonPlans = async () => {
    try {
      // Fetching all lessons so stats and daily view remain intact
      const res = await fetch(`/api/teacher/lesson-plans`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setLessonPlans(data);
    } catch (error) {
      toast.error('Failed to fetch lesson plans');
      console.error(error);
    }
  };

  const fetchTimetableSlots = async (date = selectedDate) => {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);

      const res = await fetch(`/api/teacher/timetable-periods?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setTimetableSlots(data);
    } catch (error) {
      toast.error('Failed to fetch timetable');
      console.error(error);
    }
  };

  const handleCreateLesson = async (data: LessonPlanFormData) => {
    if (!selectedSlot) {
      toast.error('Please select a class period');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/teacher/lesson-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          slotId: selectedSlot.id,
          planDate: selectedDate,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create lesson plan');
      }

      toast.success('Lesson plan created');
      handleCloseDialog();
      fetchLessonPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create lesson plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLesson = async (data: LessonPlanFormData) => {
    if (!selectedLesson) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/teacher/lesson-plans/${selectedLesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update lesson plan');
      }

      toast.success('Lesson plan updated');
      handleCloseDialog();
      fetchLessonPlans();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update lesson plan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lesson plan?')) return;

    try {
      const res = await fetch(`/api/teacher/lesson-plans/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      toast.success('Lesson plan deleted');
      fetchLessonPlans();
    } catch (error) {
      toast.error('Failed to delete lesson plan');
      console.error(error);
    }
  };

  const handleOpenCreateDialog = (slot: TimetableSlot) => {
    setSelectedSlot(slot);
    setSelectedLesson(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (lesson: LessonPlan) => {
    setSelectedLesson(lesson);
    setSelectedSlot(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSlot(null);
    setSelectedLesson(null);
  };

  const parseDateOnly = (value: string) => {
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const selectedDateValue = parseDateOnly(selectedDate) ?? new Date();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Get lesson dates for calendar
  const lessonDates = lessonPlans.map((p) => p.planDate);

  // Get lessons for selected date (Unfiltered by UI search)
  const dayScheduleEntries = [...timetableSlots]
    .sort((a, b) => a.period.startTime.localeCompare(b.period.startTime))
    .map((slot) => ({
      slot,
      lesson: lessonPlans.find((plan) => plan.slotId === slot.id && plan.planDate === selectedDate) ?? null,
    }));

  // Client-side filtering for the "All Your Lessons" section
  const filteredAllLessons = lessonPlans.filter((lesson) => {
    const matchesSearch = !searchTerm || 
      lesson.lessonTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (lesson.topic && lesson.topic.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesClass = !selectedClassId || lesson.classId === selectedClassId;
    const matchesSubject = !selectedSubjectId || lesson.subjectId === selectedSubjectId;
    const matchesDate = !selectedDateFilter || lesson.planDate === selectedDateFilter;
    const matchesStatus = !selectedStatus || lesson.status === selectedStatus;

    return matchesSearch && matchesClass && matchesSubject && matchesDate && matchesStatus;
  });

  // Calculate stats
  const todaysLessons = lessonPlans.filter((p) => p.planDate === today).length;
  const weekStart = new Date(selectedDateValue);
  weekStart.setDate(selectedDateValue.getDate() - selectedDateValue.getDay());
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
  const thisWeeksLessons = lessonPlans.filter(
    (p) => p.planDate >= weekStartStr && p.planDate <= weekEndStr
  ).length;
  const completedLessons = lessonPlans.filter((p) => p.status === 'COMPLETED').length;
  const pendingLessons = lessonPlans.filter((p) => p.status === 'DRAFT' || p.status === 'PLANNED').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Lesson Planning"
          description="Plan and manage your lessons for all your classes"
          breadcrumbs={[{ label: 'Teacher', href: '/teacher/schedule' }, { label: 'Lesson Planning' }]}
        />

      {/* Stats */}
      <div className="mb-8">
        <LessonStatsWidget
          todaysLessons={todaysLessons}
          thisWeeksLessons={thisWeeksLessons}
          completedLessons={completedLessons}
          pendingLessons={pendingLessons}
        />
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Calendar */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="font-semibold mb-4">Calendar</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                {(['day', 'week', 'month'] as const).map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={view === v ? 'default' : 'outline'}
                    onClick={() => setView(v)}
                    className="flex-1"
                  >
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </Button>
                ))}
              </div>
              <LessonCalendar
                view={view}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                lessonDates={lessonDates}
              />
            </div>
          </div>
        </div>

        {/* Selected Date Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Lessons for Selected Date */}
          <div className="bg-white p-4 rounded-lg shadow border border-slate-200/70">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">
                Lessons for {selectedDateValue.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </h2>
            </div>

            {dayScheduleEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No timetable periods found for this date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dayScheduleEntries.map(({ slot, lesson }) => (
                  <LessonPlanCard
                    key={slot.id}
                    id={lesson?.id ?? slot.id}
                    lessonTitle={lesson?.lessonTitle ?? 'No lesson plan yet'}
                    className={slot.class.name}
                    subjectName={slot.subject.name}
                    periodTime={`${slot.period.startTime} - ${slot.period.endTime}`}
                    date={selectedDate}
                    status={lesson?.status ?? 'PENDING'}
                    topic={lesson?.topic}
                    estimatedDuration={lesson?.estimatedDuration}
                    isEmpty={!lesson}
                    onClick={() => {
                      if (lesson) {
                        handleOpenEditDialog(lesson);
                      } else {
                        handleOpenCreateDialog(slot);
                      }
                    }}
                    onDelete={lesson ? () => handleDeleteLesson(lesson.id) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* All Lessons section with Filter applied purely here */}
      {lessonPlans.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm mt-6 w-full">
          
          {/* Header & Filter Controls side-by-side */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <h2 className="font-semibold text-xl text-gray-900 whitespace-nowrap">All Your Lessons</h2>
            
            <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 min-w-[200px] w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search lessons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              <Select value={selectedClassId || 'all'} onValueChange={(value) => setSelectedClassId(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>{classItem.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedSubjectId || 'all'} onValueChange={(value) => setSelectedSubjectId(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={selectedDateFilter}
                onChange={(e) => setSelectedDateFilter(e.target.value)}
                className="w-full sm:w-[150px]"
              />
              <Button variant="outline" size="icon" className="shrink-0 hidden sm:flex">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAllLessons.map((lesson) => (
              <LessonPlanCard
                key={lesson.id}
                id={lesson.id}
                lessonTitle={lesson.lessonTitle}
                className={lesson.class.name}
                subjectName={lesson.subject.name}
                periodTime={`${lesson.period.startTime} - ${lesson.period.endTime}`}
                date={lesson.planDate}
                status={lesson.status}
                topic={lesson.topic}
                estimatedDuration={lesson.estimatedDuration}
                onClick={() => handleOpenEditDialog(lesson)}
                onDelete={() => handleDeleteLesson(lesson.id)}
              />
            ))}
            
            {filteredAllLessons.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                No lessons match your filters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lesson Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) handleCloseDialog();
        else setIsDialogOpen(true);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLesson ? 'Edit Lesson Plan' : 'Create New Lesson Plan'}</DialogTitle>
          </DialogHeader>
          <LessonPlanForm
            onSubmit={selectedLesson ? handleUpdateLesson : handleCreateLesson}
            initialData={selectedLesson ? {
              ...selectedLesson,
              status: selectedLesson.status === 'PLANNED' ? 'PLANNED' : 'DRAFT',
            } : undefined}
            slotInfo={
              selectedLesson
                ? {
                    className: selectedLesson.class.name,
                    subjectName: selectedLesson.subject.name,
                    periodTime: `${selectedLesson.period.startTime} - ${selectedLesson.period.endTime}`,
                  }
                : selectedSlot
                ? {
                    className: selectedSlot.class.name,
                    subjectName: selectedSlot.subject.name,
                    periodTime: `${selectedSlot.period.startTime} - ${selectedSlot.period.endTime}`,
                  }
                : undefined
            }
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}