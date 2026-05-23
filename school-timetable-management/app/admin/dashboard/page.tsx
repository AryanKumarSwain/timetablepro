'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import { getAdminDashboardStats, getDailyAttendance, getReplacements } from '@/lib/api-services';
import { AdminDashboardStats, DailyAttendance, Replacement } from '@/lib/types';
import { KPICard } from '@/components/kpi-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminDashboard() {
  useRequireAuth('admin');

  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [attendance, setAttendance] = useState<DailyAttendance[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [statsData, attendanceData, replacementData] = await Promise.all([
          getAdminDashboardStats(),
          getDailyAttendance(today),
          getReplacements({ date: today }),
        ]);

        setStats(statsData);
        setAttendance(attendanceData);
        setReplacements(replacementData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <p className='text-muted-foreground'>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background'>
      <div className='max-w-7xl mx-auto p-6'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-4xl font-bold text-foreground mb-2'>
            Admin Dashboard
          </h1>
          <p className='text-muted-foreground'>
            School Timetable, Attendance & Replacement Management
          </p>
        </div>

        {/* KPI Section */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          <KPICard
            label='Total Teachers'
            value={stats?.totalTeachers || 0}
            subtext='Active in system'
          />
          <KPICard
            label='Total Classes'
            value={stats?.totalClasses || 0}
            subtext='Classes managed'
          />
          <KPICard
            label='Today&apos;s Absences'
            value={stats?.todayAbsent || 0}
            variant='danger'
            subtext='Teachers absent today'
          />
          <KPICard
            label='Pending Replacements'
            value={stats?.pendingReplacements || 0}
            variant='warning'
            subtext='Awaiting confirmation'
          />
        </div>

        {/* Quick Actions */}
        <div className='mb-8'>
          <h2 className='text-xl font-semibold text-foreground mb-4'>
            Quick Actions
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <Link href='/admin/masters/teachers'>
              <Button className='w-full bg-primary hover:bg-primary/90'>
                Manage Teachers
              </Button>
            </Link>
            <Link href='/admin/timetable'>
              <Button className='w-full bg-primary hover:bg-primary/90'>
                Manage Timetable
              </Button>
            </Link>
            <Link href='/admin/daily-desk'>
              <Button className='w-full bg-primary hover:bg-primary/90'>
                Daily Operations
              </Button>
            </Link>
          </div>
        </div>

        {/* Today's Attendance & Replacements */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Attendance Summary */}
          <Card className='p-6 border-border'>
            <h3 className='text-lg font-semibold text-foreground mb-4'>
              Today&apos;s Attendance
            </h3>
            {attendance.length > 0 ? (
              <div className='space-y-3'>
                {attendance.map((record) => (
                  <div
                    key={record.id}
                    className='flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50'
                  >
                    <div>
                      <p className='text-sm font-medium text-foreground'>
                        Period {record.periodId}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        Class {record.classId}
                      </p>
                    </div>
                    <div>
                      {record.isAbsent ? (
                        <span className='px-3 py-1 bg-destructive/20 text-destructive text-xs rounded-full font-medium'>
                          Absent
                        </span>
                      ) : (
                        <span className='px-3 py-1 bg-green-500/20 text-green-600 dark:text-green-400 text-xs rounded-full font-medium'>
                          Present
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>
                No attendance records yet
              </p>
            )}
          </Card>

          {/* Replacements Summary */}
          <Card className='p-6 border-border'>
            <h3 className='text-lg font-semibold text-foreground mb-4'>
              Today&apos;s Replacements
            </h3>
            {replacements.length > 0 ? (
              <div className='space-y-3'>
                {replacements.map((record) => (
                  <div
                    key={record.id}
                    className='flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50'
                  >
                    <div>
                      <p className='text-sm font-medium text-foreground'>
                        Period {record.periodId}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        Class {record.classId}
                      </p>
                    </div>
                    <div>
                      {record.status === 'pending' ? (
                        <span className='px-3 py-1 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs rounded-full font-medium'>
                          Pending
                        </span>
                      ) : record.status === 'confirmed' ? (
                        <span className='px-3 py-1 bg-green-500/20 text-green-600 dark:text-green-400 text-xs rounded-full font-medium'>
                          Confirmed
                        </span>
                      ) : (
                        <span className='px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full font-medium'>
                          {record.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-sm text-muted-foreground'>
                No replacements scheduled today
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
