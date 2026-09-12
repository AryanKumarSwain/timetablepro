'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookMarked,
  Search,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Users,
  Eye,
  X,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlanButton } from '@/components/ui/plan-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { ProtectedFeature } from '@/components/protected-feature';
import { useAuth, useRequireAuth } from '@/lib/auth-context';
import { getSchoolDetails } from '@/lib/api-services';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { LessonDetailView } from '@/components/lesson-planning/lesson-detail-view';
import { format, addDays } from 'date-fns';
import { GlassCard } from '@/components/enterprise/glass-card';
import { cn } from '@/lib/utils';

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

interface ClassOption {
  id: string;
  name: string;
  grade?: string;
  section?: string;
}

interface TeacherOption {
  id: string;
  name: string;
}

const statusColors = {
  DRAFT: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold',
  PLANNED: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-bold',
  COMPLETED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold',
  SKIPPED: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30 font-bold',
  CANCELLED: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold',
};

export default function AdminLessonPlanningPage() {
  const auth = useRequireAuth('admin');
  const { user } = useAuth();
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);

  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<LessonPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeacherId, setFilterTeacherId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [expandedDates, setExpandedDates] = useState<string[]>([todayStr]);
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (auth.loading || !auth.user) return;
    fetchLessonPlans();
  }, [auth.loading, auth.user, searchTerm, filterTeacherId, filterStatus, filterClassId, dateFrom, dateTo]);

  useEffect(() => {
    if (auth.loading || !auth.user) return;
    fetchClasses();
    fetchTeachers();
    void fetchFeatureAccess();
  }, [auth.loading, auth.user]);

  // Auto-dismiss success notification
  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => {
      setSuccessMsg(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  const fetchFeatureAccess = async () => {
    try {
      const schoolData = await getSchoolDetails();
      const plan = schoolData?.plan;
      setFeatureEnabled(plan?.lessonPlanningEnabled || false);
    } catch (error) {
      console.error('Failed to fetch lesson planning feature access', error);
      setFeatureEnabled(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      if (!res.ok) throw new Error('Failed to fetch classes');
      const data = await res.json();
      setClasses(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/teachers');
      if (!res.ok) throw new Error('Failed to fetch teachers');
      const data = await res.json();
      setTeachers(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchLessonPlans = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterTeacherId) params.append('teacherId', filterTeacherId);
      if (filterStatus) params.append('status', filterStatus);
      if (filterClassId) params.append('classId', filterClassId);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

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
      const params = new URLSearchParams();
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      params.append('format', 'csv');
      if (filterClassId) params.append('classId', filterClassId);

      const res = await fetch(`/api/admin/lesson-plans/export?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to export');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lesson-plans-${dateFrom}-to-${dateTo}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMsg('Lessons exported to CSV successfully');
    } catch (error) {
      toast.error('Failed to export lessons');
      console.error(error);
    }
  };

  const handlePrevious = () => {
    if (!dateFrom || !dateTo) return;
    const from = new Date(`${dateFrom}T00:00:00`);
    const to = new Date(`${dateTo}T00:00:00`);
    setDateFrom(format(addDays(from, -1), 'yyyy-MM-dd'));
    setDateTo(format(addDays(to, -1), 'yyyy-MM-dd'));
  };

  const handleNext = () => {
    if (!dateFrom || !dateTo) return;
    const from = new Date(`${dateFrom}T00:00:00`);
    const to = new Date(`${dateTo}T00:00:00`);
    setDateFrom(format(addDays(from, 1), 'yyyy-MM-dd'));
    setDateTo(format(addDays(to, 1), 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    setDateFrom(todayStr);
    setDateTo(todayStr);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterTeacherId('');
    setFilterStatus('');
    setFilterClassId('');
    setDateFrom(todayStr);
    setDateTo(todayStr);
  };

  const hasActiveFilters = Boolean(searchTerm || filterTeacherId || filterStatus || filterClassId || dateFrom !== todayStr || dateTo !== todayStr);

  const toggleExpandedDate = (date: string) => {
    setExpandedDates((current) =>
      current.includes(date) ? current.filter((item) => item !== date) : [...current, date]
    );
  };

  const startDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : new Date();
  const endDate = dateTo ? new Date(`${dateTo}T23:59:59`) : new Date();

  const filteredLessons = lessonPlans.filter((lesson) => {
    const lessonDate = new Date(`${lesson.planDate}T12:00:00`);
    const matchesDate = lessonDate >= startDate && lessonDate <= endDate;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      lesson.class.name.toLowerCase().includes(searchLower) ||
      lesson.teacher.name.toLowerCase().includes(searchLower) ||
      lesson.subject.name.toLowerCase().includes(searchLower) ||
      lesson.lessonTitle.toLowerCase().includes(searchLower) ||
      (lesson.topic && lesson.topic.toLowerCase().includes(searchLower));

    return matchesDate && matchesSearch;
  });

  const sortedLessons = [...filteredLessons].sort((a, b) => {
    const dateCompare = new Date(a.planDate).getTime() - new Date(b.planDate).getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.period.startTime.localeCompare(b.period.startTime);
  });

  const lessonsByDate = sortedLessons.reduce((acc, lesson) => {
    const date = lesson.planDate;
    if (!acc[date]) acc[date] = [];
    acc[date].push(lesson);
    return acc;
  }, {} as Record<string, LessonPlan[]>);

  // Derived statistics for dashboard cards
  const plannedCount = useMemo(() => {
    return filteredLessons.filter((l) => l.status === 'PLANNED' || l.status === 'COMPLETED').length;
  }, [filteredLessons]);

  const draftCount = useMemo(() => {
    return filteredLessons.filter((l) => l.status === 'DRAFT').length;
  }, [filteredLessons]);

  const activeClassesCount = useMemo(() => {
    const classNames = new Set(filteredLessons.map((l) => l.class.name));
    return classNames.size;
  }, [filteredLessons]);

  const planningStatusSummary = useMemo(() => {
    const summaryDates: Array<{ date: string; entries: Array<{ teacherId: string; teacherName: string; status: 'SUBMITTED' | 'DRAFT' | 'NOT_SUBMITTED' }> }> = [];

    for (let current = new Date(startDate); current <= endDate; current = addDays(current, 1)) {
      const dateKey = format(current, 'yyyy-MM-dd');
      const entries = teachers.map((teacher) => {
        const teacherPlans = lessonPlans.filter(
          (lesson) => lesson.teacher.id === teacher.id && lesson.planDate === dateKey
        );

        let status: 'SUBMITTED' | 'DRAFT' | 'NOT_SUBMITTED' = 'NOT_SUBMITTED';
        if (teacherPlans.some((lesson) => lesson.status === 'PLANNED' || lesson.status === 'COMPLETED')) {
          status = 'SUBMITTED';
        } else if (teacherPlans.some((lesson) => lesson.status === 'DRAFT')) {
          status = 'DRAFT';
        }

        return {
          teacherId: teacher.id,
          teacherName: teacher.name,
          status,
        };
      });

      summaryDates.push({ date: dateKey, entries });
    }

    return summaryDates;
  }, [startDate, endDate, lessonPlans, teachers]);

  return (
    <ProtectedFeature
      featureKey="lesson-planning"
      featureName="Lesson Planning"
      isEnabled={featureEnabled}
      schoolId={user?.schoolId || undefined}
    >
      <div className="max-w-7xl mx-auto relative space-y-6 pb-12">
        {/* Page Header */}
        <PageHeader
          title="Lesson Planning Overview"
          description="Monitor, review, and export all teachers' lesson plans across academic departments."
          breadcrumbs={[
            { label: 'Admin', href: '/admin/dashboard' },
            { label: 'Academic' },
            { label: 'Lesson Planning' },
          ]}
          actions={
            <Button
              onClick={handleExport}
              disabled={isLoading}
              className="gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-md shadow-purple-500/20 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          }
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

        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <GlassCard className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <BookMarked className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{filteredLessons.length}</p>
              <p className="text-xs text-muted-foreground font-medium">Total Lesson Plans</p>
            </div>
          </GlassCard>

          <GlassCard className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{plannedCount}</p>
              <p className="text-xs text-muted-foreground font-medium">Planned / Completed</p>
            </div>
          </GlassCard>

          <GlassCard className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{draftCount}</p>
              <p className="text-xs text-muted-foreground font-medium">Draft Plans</p>
            </div>
          </GlassCard>

          <GlassCard className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{activeClassesCount}</p>
              <p className="text-xs text-muted-foreground font-medium">Active Classes</p>
            </div>
          </GlassCard>
        </div>

        {/* SEARCH & FILTERS TOOLBAR */}
        <GlassCard className="p-4 md:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-500" />
              <Input
                placeholder="Search by teacher, class, topic, or chapter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-xs sm:text-sm h-10 rounded-xl bg-background border-border/80 focus-visible:ring-purple-500/30"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5">
              <Select value={filterTeacherId || 'all'} onValueChange={(value) => setFilterTeacherId(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-full sm:w-[170px] text-xs h-10 rounded-xl bg-background border-border/80 font-semibold focus:ring-purple-500/30">
                  <SelectValue placeholder="All teachers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All teachers</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterClassId || 'all'} onValueChange={(value) => setFilterClassId(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-full sm:w-[170px] text-xs h-10 rounded-xl bg-background border-border/80 font-semibold focus:ring-purple-500/30">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus || 'all'} onValueChange={(value) => setFilterStatus(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-full sm:w-[140px] text-xs h-10 rounded-xl bg-background border-border/80 font-semibold focus:ring-purple-500/30">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="PLANNED">Planned</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SKIPPED">Skipped</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  className="h-10 text-xs font-semibold rounded-xl border-dashed border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                </Button>
              )}
            </div>
          </div>

          {/* Date Range Navigation Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60 pt-3">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <span className="text-xs font-bold text-foreground shrink-0 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-purple-500" />
                Date Range:
              </span>
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-[130px] text-xs h-9 px-2.5 rounded-xl bg-background border-border/80 font-medium"
                />
                <span className="text-muted-foreground text-xs font-medium">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-[130px] text-xs h-9 px-2.5 rounded-xl bg-background border-border/80 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
              <Button
                size="sm"
                onClick={handlePrevious}
                className="h-9 px-3 text-xs font-bold rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-all cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
              </Button>
              <Button
                size="sm"
                onClick={handleToday}
                className="h-9 px-3 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all cursor-pointer"
              >
                Today
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
                className="h-9 px-3 text-xs font-bold rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-all cursor-pointer"
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* MAIN CONTENT SPLIT GRID */}
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr] items-start">
          <div className="space-y-6">
            {/* Lessons Display */}
            {isLoading ? (
              <GlassCard className="p-8">
                <PageSkeleton rows={3} />
              </GlassCard>
            ) : Object.keys(lessonsByDate).length === 0 ? (
              <GlassCard className="p-8 sm:p-12 text-center">
                <BookMarked className="h-12 w-12 text-purple-400 mx-auto mb-3 opacity-60" />
                <p className="text-slate-800 dark:text-white text-base sm:text-lg font-bold">No lesson plans found</p>
                <p className="text-muted-foreground text-xs mt-1">Try adjusting your date range or filter criteria.</p>
              </GlassCard>
            ) : (
              <div className="space-y-6">
                {Object.entries(lessonsByDate).map(([date, lessons]) => (
                  <GlassCard key={date} className="overflow-hidden p-0 border-purple-500/20 shadow-sm">
                    {/* Date Header */}
                    <div className="bg-gradient-to-r from-purple-500/15 via-indigo-500/10 to-transparent px-4 sm:px-6 py-3.5 border-b border-purple-500/15 flex items-center justify-between">
                      <div>
                        <h2 className="font-extrabold text-base sm:text-lg text-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          {format(new Date(`${date}T00:00:00`), 'EEEE, MMMM d, yyyy')}
                        </h2>
                      </div>
                      <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 font-extrabold text-xs px-3 py-1 border-purple-500/30 rounded-xl">
                        {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
                      </Badge>
                    </div>

                    {/* Lessons Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm">
                        <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase text-[11px] font-bold tracking-wider">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left">Time</th>
                            <th className="px-4 sm:px-6 py-3 text-left">Teacher</th>
                            <th className="px-4 sm:px-6 py-3 text-left">Class</th>
                            <th className="px-4 sm:px-6 py-3 text-left">Subject</th>
                            <th className="px-4 sm:px-6 py-3 text-left">Lesson Title</th>
                            <th className="px-4 sm:px-6 py-3 text-left">Status</th>
                            <th className="px-4 sm:px-6 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 bg-card/40">
                          {lessons.map((lesson) => (
                            <tr key={lesson.id} className="hover:bg-purple-500/5 transition-colors">
                              <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-xs font-semibold text-foreground">
                                {lesson.period.startTime} - {lesson.period.endTime}
                              </td>
                              <td className="px-4 sm:px-6 py-3 text-xs font-bold text-foreground whitespace-nowrap">{lesson.teacher.name}</td>
                              <td className="px-4 sm:px-6 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{lesson.class.name}</td>
                              <td className="px-4 sm:px-6 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{lesson.subject.name}</td>
                              <td className="px-4 sm:px-6 py-3 max-w-xs truncate text-xs font-semibold text-foreground">{lesson.lessonTitle}</td>
                              <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                                <Badge className={cn('text-[10px] px-2.5 py-0.5 rounded-full shadow-2xs', statusColors[lesson.status as keyof typeof statusColors])}>
                                  {lesson.status}
                                </Badge>
                              </td>
                              <td className="px-4 sm:px-6 py-3 text-right whitespace-nowrap">
                                <Button
                                  size="sm"
                                  className="h-8 text-xs rounded-xl px-3 font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs border-none cursor-pointer"
                                  onClick={() => setSelectedLesson(lesson)}
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  View
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR: SUBMISSION TRACKER */}
          <div className="lg:col-span-1">
            <GlassCard className="p-4 space-y-3 sticky top-6">
              <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                <h3 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Status Tracker
                </h3>
                <Badge className="text-[10px] rounded-full bg-purple-600 text-white font-extrabold border-none px-2.5 py-0.5">
                  {planningStatusSummary.length} day{planningStatusSummary.length === 1 ? '' : 's'}
                </Badge>
              </div>

              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
                {planningStatusSummary.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/80 p-4 text-xs text-muted-foreground text-center font-medium">
                    No planning data for the selected range.
                  </div>
                ) : (
                  planningStatusSummary.map((day) => {
                    const isExpanded = expandedDates.includes(day.date);
                    const activeSubmitted = day.entries.filter((entry) => entry.status !== 'NOT_SUBMITTED').length;
                    return (
                      <div key={day.date} className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 p-3">
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 text-left cursor-pointer"
                          onClick={() => toggleExpandedDate(day.date)}
                        >
                          <p className="text-xs font-bold text-foreground">
                            {format(new Date(`${day.date}T00:00:00`), 'MMM d, yyyy')}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Badge className="text-[10px] font-extrabold bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30">
                              {activeSubmitted}/{day.entries.length} active
                            </Badge>
                            <ChevronDown className={`h-4 w-4 text-purple-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="mt-2.5 space-y-1.5">
                            {day.entries.map((entry) => (
                              <div
                                key={`${day.date}-${entry.teacherId}`}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                                  entry.status === 'SUBMITTED'
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                    : entry.status === 'DRAFT'
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                    : 'bg-muted/60 text-muted-foreground border-border/80'
                                }`}
                              >
                                <span className="truncate mr-2 font-bold">{entry.teacherName}</span>
                                <span className="shrink-0 text-[10px] uppercase tracking-wider font-extrabold">
                                  {entry.status === 'NOT_SUBMITTED' ? 'Not submitted' : entry.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Detail View Modal */}
        {selectedLesson && (
          <LessonDetailView
            lesson={selectedLesson}
            onClose={() => setSelectedLesson(null)}
            onCommentAdded={() => {
              fetchLessonPlans();
            }}
          />
        )}
      </div>
    </ProtectedFeature>
  );
}