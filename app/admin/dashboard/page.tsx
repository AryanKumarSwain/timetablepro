'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getAdminDashboardStats,
  getDailyAttendance,
  getReplacements,
  getTeachers,
  getPeriods, // 1. Added master periods service import
} from '@/lib/api-services';
import { AdminDashboardStats, DailyAttendance, Replacement, Teacher, Period } from '@/lib/types';
import { KPICard } from '@/components/kpi-card';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { Button } from '@/components/ui/button';
import {
  Users,
  GraduationCap,
  UserX,
  Clock,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

const workloadData = [
  { day: 'Mon', load: 82 },
  { day: 'Tue', load: 76 },
  { day: 'Wed', load: 91 },
  { day: 'Thu', load: 68 },
  { day: 'Fri', load: 74 },
];

export default function AdminDashboard() {
  const auth = useRequireAuth('admin');

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [attendance, setAttendance] = useState<DailyAttendance[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]); // 2. State for holding period layout configuration
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.loading) {
      setLoading(true);
      return;
    }

    if (!auth.session) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [statsData, attendanceData, replacementData, teachersList, periodsList] = await Promise.all([
          getAdminDashboardStats(),
          getDailyAttendance(today),
          getReplacements({ date: today }),
          getTeachers(),
          getPeriods(), // 3. Fetch full active system slots structure
        ]);

        if (!isMounted) return;

        setStats(statsData);
        setAttendance(attendanceData);
        setReplacements(replacementData);
        setTeachers(teachersList);
        setPeriods(periodsList);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
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
  }, [auth.loading, auth.session]);

  if (auth.loading || loading) return <PageSkeleton />;

  // 4. Create lookup dictionary maps for clean layout rendering
  const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));
  const periodMap = new Map(periods.map((p) => [p.id, p.name || `Period ${p.periodNumber || p.name}`]));

  return (
    <div className='max-w-7xl mx-auto'>
      <PageHeader
        title='Operations Dashboard'
        description='Live campus metrics, attendance, and substitution pipeline'
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Dashboard' },
        ]}
        actions={
          <Button asChild className='rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600'>
            <Link href='/admin/daily-desk'>
              Open Daily Desk
              <ArrowRight className='ml-2 h-4 w-4' />
            </Link>
          </Button>
        }
      />

      {(stats?.pendingReplacements ?? 0) > 0 && (
        <GlassCard className='mb-6 p-4 border-amber-500/30 bg-amber-500/5 flex items-center gap-3'>
          <AlertTriangle className='h-5 w-5 text-amber-500 shrink-0' />
          <p className='text-sm'>
            <span className='font-semibold'>{stats?.pendingReplacements}</span> substitution
            assignments awaiting confirmation.
          </p>
          <Button size='sm' variant='outline' className='ml-auto rounded-xl' asChild>
            <Link href='/admin/daily-desk'>Review</Link>
          </Button>
        </GlassCard>
      )}

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
        <KPICard
          label='Total Teachers'
          value={stats?.totalTeachers || 0}
          subtext='Active in system'
          index={0}
        />
        <KPICard
          label='Total Classes'
          value={stats?.totalClasses || 0}
          subtext='Classes managed'
          index={1}
        />
        <KPICard
          label="Today's Absences"
          value={stats?.todayAbsent || 0}
          variant='danger'
          subtext='Teachers absent today'
          index={2}
        />
        <KPICard
          label='Pending Replacements'
          value={stats?.pendingReplacements || 0}
          variant='warning'
          subtext='Awaiting confirmation'
          index={3}
        />
      </div>

      <div className='grid lg:grid-cols-3 gap-6 mb-8'>
        <GlassCard className='lg:col-span-2 p-6'>
          <h3 className='font-semibold mb-4'>Weekly workload index</h3>
          <div className='h-56'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={workloadData}>
                <defs>
                  <linearGradient id='loadGrad' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor='oklch(0.55 0.15 265)' stopOpacity={0.4} />
                    <stop offset='100%' stopColor='oklch(0.55 0.15 265)' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' />
                <XAxis dataKey='day' className='text-xs' />
                <YAxis className='text-xs' />
                <Tooltip />
                <Area
                  type='monotone'
                  dataKey='load'
                  stroke='oklch(0.55 0.15 265)'
                  fill='url(#loadGrad)'
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
        <GlassCard className='p-6'>
          <h3 className='font-semibold mb-4'>Quick actions</h3>
          <div className='space-y-2'>
            {[
              { href: '/admin/masters/teachers', label: 'Manage Teachers', icon: Users },
              { href: '/admin/timetable', label: 'Weekly Timetable', icon: GraduationCap },
              { href: '/admin/daily-desk', label: 'Daily Desk', icon: Clock },
            ].map((action) => (
              <Button
                key={action.href}
                variant='outline'
                className='w-full justify-start rounded-xl h-11'
                asChild
              >
                <Link href={action.href}>
                  <action.icon className='h-4 w-4 mr-2 text-indigo-500' />
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <GlassCard className='p-6'>
          <div className='flex items-center gap-2 mb-4'>
            <UserX className='h-5 w-5 text-rose-500' />
            <h3 className='font-semibold'>Today&apos;s Attendance</h3>
          </div>
          {attendance.length > 0 ? (
            <div className='space-y-2 max-h-64 overflow-y-auto'>
              {attendance.map((record) => (
                <div
                  key={record.id}
                  className='flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40'
                >
                  <div>
                    <p className='text-sm font-medium'>
                      {teacherMap.get(record.teacherId) || `Teacher ${record.teacherId.slice(0, 8)}…`}
                    </p>
                    <p className='text-xs text-muted-foreground'>{record.date}</p>
                  </div>
                  <span
                    className={
                      record.isAbsent
                        ? 'px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-600'
                        : 'px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600'
                    }
                  >
                    {record.isAbsent ? 'Absent' : 'Present'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>No attendance records yet</p>
          )}
        </GlassCard>

        <GlassCard className='p-6'>
          <h3 className='font-semibold mb-4'>Substitution pipeline</h3>
          <div className='h-40 mb-4'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart
                data={[
                  { name: 'Pending', count: stats?.pendingReplacements || 0 },
                  { name: 'Today', count: stats?.todayReplacements || 0 },
                ]}
              >
                <CartesianGrid strokeDasharray='3 3' className='stroke-border/50' />
                <XAxis dataKey='name' />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey='count' fill='oklch(0.55 0.15 265)' radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {replacements.length > 0 ? (
            <div className='space-y-2'>
              {replacements.slice(0, 4).map((record) => (
                <div
                  key={record.id}
                  className='flex items-center justify-between p-3 rounded-xl bg-muted/30 text-sm'
                >
                  <div className='flex flex-col gap-0.5'>
                    {/* 5. Dynamically translates the raw periodId hash into names like 'Period 1' or 'P1' */}
                    <span className='font-medium'>
                      {periodMap.get(record.periodId) || record.periodName || `Period ${record.periodId.slice(0, 6)}…`}
                    </span>
                    {(record.replacementTeacherName || teacherMap.get(record.replacementTeacherId)) && (
                      <span className='text-xs text-muted-foreground'>
                        Sub: {record.replacementTeacherName || teacherMap.get(record.replacementTeacherId)}
                      </span>
                    )}
                  </div>
                  <span
                    className={
                      record.status === 'pending'
                        ? 'text-amber-600 text-xs font-medium capitalize'
                        : 'text-emerald-600 text-xs font-medium capitalize'
                    }
                  >
                    {record.status.toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className='text-sm text-muted-foreground'>No replacements scheduled today</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
}