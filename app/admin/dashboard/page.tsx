'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getAdminDashboardStats,
  getDailyAttendance,
  getReplacements,
  getTeachers,
  getPeriods,
} from '@/lib/api-services';
import { AdminDashboardStats, DailyAttendance, Replacement, Teacher, Period } from '@/lib/types';
import { KPICard } from '@/components/kpi-card';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { Button } from '@/components/ui/button';
import { PlanButton } from '@/components/ui/plan-button';
import { usePlanTheme } from '@/lib/plan-theme';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserX,
  Clock,
  ArrowRight,
  AlertTriangle,
  BarChart3,
  PieChart as PieIcon,
  SlidersHorizontal,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

function getUniqueColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h = Math.abs(hash % 360);
  const s = 60 + (Math.abs(hash >> 2) % 12);
  const l = 48 + (Math.abs(hash >> 4) % 8);

  return `hsl(${h}, ${s}%, ${l}%)`;
}

export default function AdminDashboard() {
  const auth = useRequireAuth('admin');
  const { theme } = usePlanTheme();

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [attendance, setAttendance] = useState<DailyAttendance[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time Filter Tracking States
  const [timeFilter, setTimeFilter] = useState('1-week');
  const [classFilter, setClassFilter] = useState('all');
  const [sortFilter, setSortFilter] = useState('a-z');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [classList, setClassList] = useState<Array<{ id: string; label: string }>>([]);
  const [dbWorkload, setDbWorkload] = useState<any[]>([]);
  const [dbSubjects, setDbSubjects] = useState<any[]>([]);
  const [totalDatabaseSlots, setTotalDatabaseSlots] = useState(0);

  // Extract the school name dynamically from the session data
  const dynamicSchoolName = useMemo(() => {
    return (auth.session?.user as any)?.schoolName || 'Operations Dashboard';
  }, [auth.session]);

  useEffect(() => {
    if (auth.loading || !auth.session) {
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const schoolId = (auth.session?.user as any)?.schoolId || 'default-id';

        // Prevent un-scoped runtime requests
        if (!schoolId || schoolId === 'default-id') {
          console.warn('School context missing, skipping data load');
          setLoading(false);
          return;
        }

        const [statsData, attendanceData, replacementData, teachersList, periodsList] = await Promise.all([
          getAdminDashboardStats().catch(() => null),
          getDailyAttendance(today).catch(() => []),
          getReplacements({ date: today }, schoolId).catch(() => []),
          getTeachers(schoolId).catch(() => []),
          getPeriods().catch(() => []),
        ]);

        if (!isMounted) return;

        setStats(statsData);
        setAttendance(attendanceData);
        setReplacements(replacementData);
        setTeachers(teachersList);
        setPeriods(periodsList);

        let url = `/api/admin/analytics?range=${timeFilter}&classId=${classFilter}&schoolId=${schoolId}`;
        if (dateRange.start && dateRange.end) {
          url += `&startDate=${dateRange.start}&endDate=${dateRange.end}`;
        }

        const response = await fetch(url);
        const contentType = response.headers.get('content-type');

        if (response.ok && contentType && contentType.includes('application/json')) {
          const liveAnalyticsRes = await response.json();
          if (liveAnalyticsRes && !liveAnalyticsRes.error) {
            setDbWorkload(liveAnalyticsRes.teacherWorkload || []);
            setDbSubjects(liveAnalyticsRes.subjectDistribution || []);
            setTotalDatabaseSlots(liveAnalyticsRes.totalSlots || 0);
            if (liveAnalyticsRes.classesList) {
              setClassList(liveAnalyticsRes.classesList);
            }
          }
        }
      } catch (error) {
        console.error('Error loading dashboard metrics:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [auth.loading, auth.session, timeFilter, classFilter, dateRange]);

  const sortedWorkload = useMemo(() => {
    const dataCopy = dbWorkload.map((item) => ({
      ...item,
      color: getUniqueColor(item.name || 'Unknown Teacher')
    }));

    if (sortFilter === 'a-z') return dataCopy.sort((a, b) => a.name.localeCompare(b.name));
    if (sortFilter === 'z-a') return dataCopy.sort((a, b) => b.name.localeCompare(a.name));
    if (sortFilter === 'low-high') return dataCopy.sort((a, b) => a.classes - b.classes);
    return dataCopy.sort((a, b) => b.classes - a.classes);
  }, [dbWorkload, sortFilter]);

  const formattedSubjects = useMemo(() => {
    return dbSubjects.map((subject) => ({
      ...subject,
      color: getUniqueColor(subject.name || 'General')
    }));
  }, [dbSubjects]);

  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t.name])), [teachers]);
  const periodMap = useMemo(() => new Map(periods.map((p) => [p.id, p.name || `Period ${p.periodNumber || p.name}`])), [periods]);

  if (auth.loading || loading) return <PageSkeleton />;

  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">

      {/* CHANGED HERE: title is now using dynamicSchoolName instead of a static string */}
      <PageHeader
        title={dynamicSchoolName}
        description="Live campus metrics, attendance, and substitution pipeline"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Dashboard' },
        ]}
        actions={
          <PlanButton asChild variant="primary" className="rounded-xl">
            <Link href="/admin/daily-desk">
              Open Daily Desk
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </PlanButton>
        }
      />

      {(stats?.pendingAbsentRequests ?? 0) > 0 && (
        <GlassCard className="p-4 border-amber-500/30 bg-amber-500/5 flex items-center gap-3 rounded-2xl">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">{stats?.pendingAbsentRequests}</span> absent requests awaiting approval.
          </p>
          <Button size="sm" variant="outline" className="ml-auto rounded-xl" asChild>
            <Link href="/admin/daily-desk">Review</Link>
          </Button>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Teachers" value={stats?.totalTeachers || 0} subtext="Active in system" index={0} />
        <KPICard label="Total Classes" value={stats?.totalClasses || 0} subtext="Classes managed" index={1} />
        <KPICard label="Today's Absences" value={stats?.todayAbsent || 0} variant="danger" subtext="Teachers absent today" index={2} />
        <KPICard label="Pending Absent Requests" value={stats?.pendingAbsentRequests || 0} variant="warning" subtext="Awaiting approval" index={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teacher Workload Card */}
        <GlassCard className="lg:col-span-2 p-6 rounded-3xl shadow-sm">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 shrink-0">
              <BarChart3 className="h-4 w-4 text-indigo-500" />
              <h3 className="font-extrabold text-base tracking-tight text-foreground whitespace-nowrap">
                Teacher Workload
              </h3>
            </div>

            <div className="flex flex-wrap items-center xl:justify-end gap-2 w-full xl:w-auto">
              <div className="flex items-center gap-1.5 bg-background border border-border px-2 py-1 rounded-xl shadow-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  type="date"
                  className="bg-transparent w-[105px] text-xs outline-none cursor-pointer text-foreground font-medium"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
                <span className="text-muted-foreground text-xs px-0.5 shrink-0">to</span>
                <input
                  type="date"
                  className="bg-transparent w-[105px] text-xs outline-none cursor-pointer text-foreground font-medium"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
                {(dateRange.start || dateRange.end) && (
                  <button
                    onClick={() => setDateRange({ start: '', end: '' })}
                    className="text-[10px] bg-muted hover:bg-muted/80 px-1.5 py-0.5 rounded ml-1 font-bold text-muted-foreground shrink-0 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 bg-muted/40 px-1.5 py-0.5 rounded-lg border border-border/50 shrink-0">
                <SlidersHorizontal className="h-3 w-3 text-muted-foreground ml-1" />
                <Select value={sortFilter} onValueChange={setSortFilter}>
                  <SelectTrigger className="w-[80px] h-6 rounded-lg text-xs font-semibold bg-transparent border-none shadow-none p-0 focus:ring-0 focus-visible:ring-0">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg shadow-md border-border min-w-[90px]">
                    <SelectItem value="a-z" className="text-xs font-medium">A - Z</SelectItem>
                    <SelectItem value="z-a" className="text-xs font-medium">Z - A</SelectItem>
                    <SelectItem value="high-low" className="text-xs font-medium">Highest</SelectItem>
                    <SelectItem value="low-high" className="text-xs font-medium">Lowest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select
                value={timeFilter}
                onValueChange={(val) => {
                  setTimeFilter(val);
                  setDateRange({ start: '', end: '' });
                }}
              >
                <SelectTrigger className="w-[110px] h-9 rounded-xl text-xs font-medium bg-background border-border shrink-0">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="1-week" className="text-xs">1 Week</SelectItem>
                  <SelectItem value="2-weeks" className="text-xs">2 Weeks</SelectItem>
                  <SelectItem value="6-weeks" className="text-xs">6 Weeks</SelectItem>
                  <SelectItem value="1-year" className="text-xs">1 Year</SelectItem>
                  <SelectItem value="all" className="text-xs">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="h-80">
            {sortedWorkload.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedWorkload} barSize={14} margin={{ top: 25, right: 10, left: 10, bottom: 65 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    className="text-[9px] font-bold text-muted-foreground"
                  />
                  <YAxis axisLine={false} tickLine={false} className="text-[11px] font-semibold text-muted-foreground" />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', height: 'auto', width: 'auto' }}
                    itemStyle={{ margin: 0, padding: 0 }}
                  />
                  <Bar dataKey="classes" radius={[4, 4, 0, 0]}>
                    {sortedWorkload.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No active schedule custom slots found</div>
            )}
          </div>
        </GlassCard>

        {/* Subject Distribution Card */}
        <GlassCard className="p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-pink-500" />
              <h3 className="font-extrabold text-base tracking-tight text-foreground">Subject Distribution</h3>
            </div>

            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[115px] h-8 rounded-lg text-xs font-medium bg-background border-border shadow-none shrink-0">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="all" className="text-xs">All Classes</SelectItem>
                {classList.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id} className="text-xs">
                    {cls.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center">
            {formattedSubjects.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={formattedSubjects}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {formattedSubjects.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `${value}%`}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', height: 'auto', width: 'auto' }}
                      itemStyle={{ margin: 0, padding: 0 }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute text-center flex flex-col items-center">
                  <span className="text-xl font-black text-foreground">{totalDatabaseSlots}</span>
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Slots</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground text-center px-4">No scheduled periods available</div>
            )}
          </div>

          <div className="space-y-2 mt-2 max-h-32 overflow-y-auto">
            {formattedSubjects.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground truncate max-w-[120px]">{item.name}</span>
                </div>
                <span className="text-foreground font-black">{item.value}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Pipeline Card */}
        <GlassCard className="p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <UserX className="h-5 w-5 text-rose-500" />
            <h3 className="font-semibold">Today's Attendance</h3>
          </div>
          {attendance.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {attendance.map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
                  <div>
                    <p className="text-sm font-medium">
                      {teacherMap.get(record.teacherId) || `Teacher ${record.teacherId.slice(0, 8)}…`}
                    </p>
                    <p className="text-xs text-muted-foreground">{record.date}</p>
                  </div>
                  <span className={record.status === 'ABSENT' ? 'px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-600' : 'px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600'}>
                    {record.status?.toLowerCase() || 'unknown'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No attendance records found</p>
          )}
        </GlassCard>

        {/* Substitution Monitoring Grid */}
        <GlassCard className="p-6 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-indigo-500" />
            <h3 className="font-semibold">Substitution Pipeline</h3>
          </div>
          {replacements.length > 0 ? (
            <div className="space-y-2">
              {replacements.slice(0, 4).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">
                      {periodMap.get(record.periodId) || record.periodName || `Period ${record.periodId.slice(0, 6)}…`}
                    </span>
                    {(record.replacementTeacherName || teacherMap.get(record.replacementTeacherId)) && (
                      <span className="text-xs text-muted-foreground">
                        Sub: {record.replacementTeacherName || teacherMap.get(record.replacementTeacherId)}
                      </span>
                    )}
                  </div>
                  <span className={record.status === 'PENDING' ? 'text-amber-600 text-xs font-medium capitalize' : 'text-emerald-600 text-xs font-medium capitalize'}>
                    {record.status?.toLowerCase() || 'pending'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No operational substitutions active today</p>
          )}
        </GlassCard>
      </div>

    </div>
  );
}