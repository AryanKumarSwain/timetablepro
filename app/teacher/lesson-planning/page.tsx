'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { BookMarked, Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default function LessonPlanningPage() {
  const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    fetchLessonPlans();
    fetchTimetableSlots();
  }, []);

  const fetchLessonPlans = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await fetch(`/api/teacher/lesson-plans?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setLessonPlans(data);
    } catch (error) {
      toast.error('Failed to fetch lesson plans');
      console.error(error);
    }
  };

  const fetchTimetableSlots = async () => {
    try {
      const res = await fetch(`/api/teacher/timetable-periods`);
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
      setIsDialogOpen(false);
      setSelectedSlot(null);
      fetchLessonPlans();
    } catch (error) {
      throw error;
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

  // Get lessons for selected date
  const lessonsForDate = lessonPlans.filter((p) => p.planDate === selectedDate);

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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookMarked className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Lesson Planning</h1>
        </div>
        <p className="text-gray-600">Plan and manage your lessons for all your classes</p>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <LessonStatsWidget
          todaysLessons={todaysLessons}
          thisWeeksLessons={thisWeeksLessons}
          completedLessons={completedLessons}
          pendingLessons={pendingLessons}
        />
      </div>

      {/* Main Content */}
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

          {/* Quick Add */}
          <div className="bg-white p-4 rounded-lg shadow">
            <Button
              onClick={() => {
                if (timetableSlots.length === 0) {
                  toast.error('No timetable slots found');
                  return;
                }
                setSelectedSlot(timetableSlots[0]);
                setIsDialogOpen(true);
              }}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Lesson
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search and Filter */}
          <div className="bg-white p-4 rounded-lg shadow flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search lessons..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  fetchLessonPlans();
                }}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Lessons for Selected Date */}
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">
                Lessons for {selectedDateValue.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </h2>
              <Button
                size="sm"
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Lesson
              </Button>
            </div>

            {lessonsForDate.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No lessons planned for this date</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDialogOpen(true)}
                  className="mt-4"
                >
                  Create First Lesson
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {lessonsForDate.map((lesson) => (
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
                    onDelete={handleDeleteLesson}
                  />
                ))}
              </div>
            )}
          </div>

          {/* All Lessons */}
          {lessonsForDate.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="font-semibold mb-4">All Your Lessons</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lessonPlans.map((lesson) => (
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
                    onDelete={handleDeleteLesson}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Lesson Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Lesson Plan</DialogTitle>
          </DialogHeader>
          <LessonPlanForm
            onSubmit={handleCreateLesson}
            slotInfo={
              selectedSlot
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
  );
}
