'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Users, TrendingUp, RefreshCw } from 'lucide-react';

import { useRequireAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import {
  getPlatformTeacherDistribution,
  getPlatformRevenueDetail,
  type PlatformTeacherDistribution,
  type PlatformRevenueDetail,
} from '@/lib/api-services';

export default function AnalyticsPage() {
  useRequireAuth('super-admin');

  const [teacherDistribution, setTeacherDistribution] = useState<PlatformTeacherDistribution[]>([]);
  const [revenueDetail, setRevenueDetail] = useState<PlatformRevenueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teachers, revenue] = await Promise.all([
        getPlatformTeacherDistribution(),
        getPlatformRevenueDetail(),
      ]);
      setTeacherDistribution(teachers ?? []);
      setRevenueDetail(revenue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalTeachers = teacherDistribution.reduce((sum, t) => sum + (typeof t.teacherCount === 'number' ? t.teacherCount : 0), 0);
  const annualRevenue = revenueDetail?.activeMrr ? revenueDetail.activeMrr * 12 : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='max-w-7xl mx-auto space-y-6'>
      <PageHeader
        title='Platform Analytics'
        description='Revenue metrics, teacher distribution, and platform-wide performance insights.'
        breadcrumbs={[{ label: 'Super Admin', href: '/super-admin/dashboard' }, { label: 'Analytics' }]}
      />

      {error && (
        <div className='p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm'>
          {error}
        </div>
      )}

      <div className='grid md:grid-cols-3 gap-4'>
        <GlassCard className='p-6'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center'>
              <DollarSign className='w-5 h-5 text-emerald-500' />
            </div>
            <p className='text-sm text-muted-foreground'>Annual Revenue</p>
          </div>
          <h3 className='text-2xl font-bold'>${annualRevenue.toLocaleString()}</h3>
        </GlassCard>

        <GlassCard className='p-6'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center'>
              <Users className='w-5 h-5 text-blue-500' />
            </div>
            <p className='text-sm text-muted-foreground'>Total Teachers</p>
          </div>
          <h3 className='text-2xl font-bold'>{totalTeachers.toLocaleString()}</h3>
        </GlassCard>

        <GlassCard className='p-6'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center'>
              <TrendingUp className='w-5 h-5 text-purple-500' />
            </div>
            <p className='text-sm text-muted-foreground'>Active Schools</p>
          </div>
          <h3 className='text-2xl font-bold'>{teacherDistribution.length}</h3>
        </GlassCard>
      </div>

      <div className='grid lg:grid-cols-2 gap-6'>
        <GlassCard className='p-6'>
          <div className='flex items-center justify-between mb-6'>
            <h3 className='font-semibold'>Teacher Distribution by School</h3>
            <Button variant='outline' size='icon' onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {loading ? (
            <div className='space-y-3'>
              {[...Array(5)].map((_, i) => (
                <div key={i} className='h-16 bg-muted/30 rounded-lg animate-pulse' />
              ))}
            </div>
          ) : (
            <div className='space-y-3'>
              {teacherDistribution.length === 0 ? (
                <div className='rounded-xl border border-border/50 bg-muted/20 p-5 text-center text-sm text-muted-foreground'>
                  No teacher distribution data available.
                </div>
              ) : (
                teacherDistribution.map((teacher) => (
                  <div
                    key={teacher.schoolId}
                    className='flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 p-4 hover:bg-muted/30 transition-colors'
                  >
                    <div>
                      <p className='font-medium'>{typeof teacher.schoolName === 'string' ? teacher.schoolName : '-'}</p>
                      <p className='text-xs text-muted-foreground'>Faculty load cluster</p>
                    </div>
                    <div className='text-lg font-semibold'>
                      {typeof teacher.teacherCount === 'number' ? teacher.teacherCount : 0}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </GlassCard>

        <GlassCard className='p-6'>
          <div className='flex items-center justify-between mb-6'>
            <h3 className='font-semibold'>Revenue by Tier</h3>
            <Button variant='outline' size='icon' onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {loading ? (
            <div className='space-y-3'>
              {[...Array(3)].map((_, i) => (
                <div key={i} className='h-20 bg-muted/30 rounded-lg animate-pulse' />
              ))}
            </div>
          ) : !revenueDetail ? (
            <div className='rounded-xl border border-border/50 bg-muted/20 p-5 text-center text-sm text-muted-foreground'>
              No revenue data available.
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='grid md:grid-cols-2 gap-4 mb-4'>
                <div className='p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20'>
                  <p className='text-sm text-muted-foreground'>Monthly Recurring Revenue</p>
                  <h3 className='text-2xl font-bold mt-1'>
                    ${typeof revenueDetail.activeMrr === 'number' ? revenueDetail.activeMrr.toLocaleString() : '0'}
                  </h3>
                </div>
                <div className='p-4 rounded-lg bg-blue-500/10 border border-blue-500/20'>
                  <p className='text-sm text-muted-foreground'>Total Transactions</p>
                  <h3 className='text-2xl font-bold mt-1'>
                    {Array.isArray(revenueDetail.transactions) ? revenueDetail.transactions.length : 0}
                  </h3>
                </div>
              </div>

              <div className='overflow-hidden rounded-xl border border-border/50'>
                <table className='w-full text-sm'>
                  <thead className='bg-muted/40'>
                    <tr>
                      <th className='p-3 text-left font-medium'>Tier</th>
                      <th className='p-3 text-left font-medium'>Schools</th>
                      <th className='p-3 text-left font-medium'>Monthly Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(revenueDetail.tierContributions ?? []).map((item, index) => (
                      <tr key={`revenue-tier-${index}`} className='border-t border-border/30'>
                        <td className='p-3 font-medium'>{typeof item.planName === 'string' ? item.planName : '-'}</td>
                        <td className='p-3'>{typeof item.count === 'number' ? item.count : 0}</td>
                        <td className='p-3'>${typeof item.subtotal === 'number' ? item.subtotal.toFixed(2) : '0.00'}</td>
                      </tr>
                    ))}
                    {(revenueDetail.tierContributions ?? []).length === 0 && (
                      <tr>
                        <td colSpan={3} className='p-3 text-center text-muted-foreground text-sm'>
                          No tier contribution data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </motion.div>
  );
}
