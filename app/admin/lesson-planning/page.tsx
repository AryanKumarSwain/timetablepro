'use client';

import { useState, useEffect } from 'react';
import { BookMarked, Search, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { LessonDetailView } from '@/components/lesson-planning/lesson-detail-view';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, eachDayOfInterval } from 'date-fns';

interface LessonPlan {
  id: string;
  lessonTitle: string;
  topic?: string;
  planDate: string;
  status: string;
  teacher: { id: string; name: string };
  class: { name: string };
  subject: { name: string };
  period: { startTime: string; endTime: string };
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PLANNED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  SKIPPED: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function AdminLessonPlanningPage() {
  const [view, setView] = useState<'day' | 'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<LessonPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeacherId, setFilterTeacherId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchLessonPlans();
  }, [searchTerm, filterTeacherId, filterStatus]);

  const fetchLessonPlans = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterTeacherId) params.append('teacherId', filterTeacherId);
      if (filterStatus) params.append('status', filterStatus);

      const res = await fetch(`/api/admin/lesson-plans?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setLessonPlans(data);
    } catch (error) {
      toast.error('Failed to fetch lesson plans');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const dateFrom = view === 'month' ? format(startOfMonth(currentDate), 'yyyy-MM-dd') : currentDate.toISOString().split('T')[0];
      const dateTo = view === 'month' ? format(endOfMonth(currentDate), 'yyyy-MM-dd') : dateFrom;

      const params = new URLSearchParams();
      params.append('dateFrom', dateFrom);
      params.append('dateTo', dateTo);
      params.append('format', 'csv');

      const res = await fetch(`/api/admin/lesson-plans/export?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to export');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lesson-plans-${currentDate.toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Lessons exported successfully');
    } catch (error) {
      toast.error('Failed to export lessons');
      console.error(error);
    }
  };

  const handlePrevious = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (view === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (view === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  // Get the date range based on the current view
  let startDate: Date, endDate: Date;
  if (view === 'month') {
    startDate = startOfMonth(currentDate);
    endDate = endOfMonth(currentDate);
  } else if (view === 'week') {
    startDate = startOfWeek(currentDate);
    endDate = endOfWeek(currentDate);
  } else {
    startDate = currentDate;
    endDate = currentDate;
  }

  // Filter lessons for the current view
  const filteredLessons = lessonPlans.filter((lesson) => {
    const lessonDate = new Date(lesson.planDate);
    return lessonDate >= startDate && lessonDate <= endDate;
  });

  // Sort lessons by date and time
  const sortedLessons = [...filteredLessons].sort((a, b) => {
    const dateCompare = new Date(a.planDate).getTime() - new Date(b.planDate).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.period.startTime.localeCompare(b.period.startTime);
  });

  // Group lessons by date
  const lessonsByDate = sortedLessons.reduce((acc, lesson) => {
    const date = lesson.planDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(lesson);
    return acc;
  }, {} as Record<string, LessonPlan[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookMarked className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Lesson Planning Overview</h1>
        </div>
        <p className="text-gray-600">Monitor and review all teachers' lesson plans</p>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by teacher, topic, or chapter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* View and Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(['day', 'week', 'month'] as const).map((v) => (
              <Button
                key={v}
                size="sm"
                variant={view === v ? 'default' : 'outline'}
                onClick={() => setView(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold min-w-40 text-center">
              {view === 'month' && format(currentDate, 'MMMM yyyy')}
              {view === 'week' &&
                `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`}
              {view === 'day' && format(currentDate, 'MMMM d, yyyy')}
            </span>
            <Button variant="outline" size="sm" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Lessons Display */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading lesson plans...</p>
        </div>
      ) : Object.keys(lessonsByDate).length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600 text-lg">No lesson plans found for this period</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(lessonsByDate).map(([date, lessons]) => (
            <div key={date} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Date Header */}
              <div className="bg-blue-50 px-6 py-3 border-b">
                <h2 className="font-semibold text-lg">
                  {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </h2>
                <p className="text-sm text-gray-600">{lessons.length} lessons</p>
              </div>

              {/* Lessons Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">Time</th>
                      <th className="px-6 py-3 text-left font-semibold">Teacher</th>
                      <th className="px-6 py-3 text-left font-semibold">Class</th>
                      <th className="px-6 py-3 text-left font-semibold">Subject</th>
                      <th className="px-6 py-3 text-left font-semibold">Lesson Title</th>
                      <th className="px-6 py-3 text-left font-semibold">Status</th>
                      <th className="px-6 py-3 text-left font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessons.map((lesson) => (
                      <tr key={lesson.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3">
                          {lesson.period.startTime} - {lesson.period.endTime}
                        </td>
                        <td className="px-6 py-3">{lesson.teacher.name}</td>
                        <td className="px-6 py-3">{lesson.class.name}</td>
                        <td className="px-6 py-3">{lesson.subject.name}</td>
                        <td className="px-6 py-3 max-w-xs truncate">{lesson.lessonTitle}</td>
                        <td className="px-6 py-3">
                          <Badge className={statusColors[lesson.status as keyof typeof statusColors]}>
                            {lesson.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedLesson(lesson)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail View Modal */}
      {selectedLesson && (
        <LessonDetailView
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          onCommentAdded={() => {
            // Refresh the lesson details
            fetchLessonPlans();
          }}
        />
      )}
    </div>
  );
}
