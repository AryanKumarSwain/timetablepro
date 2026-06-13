'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Users, TrendingUp, RefreshCw, Building2, AlertCircle } from 'lucide-react';

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

type AnalyticsData = {
  totalSchools: number;
  statusDistribution: {
    ACTIVE: number;
    TRIAL: number;
    SUSPENDED: number;
    TRAIL_EXPIRED: number;
  };
  planBreakdown: Array<{
    id: string;
    name: string;
    teacherMin: number;
    teacherMax: number;
    priceMonthly: number;
    schoolCount: number;
  }>;
};

export default function AnalyticsPage() {
  useRequireAuth('super-admin');

  const [teacherDistribution, setTeacherDistribution] = useState<PlatformTeacherDistribution[]>([]);
  const [revenueDetail, setRevenueDetail] = useState<PlatformRevenueDetail | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teachers, revenue, analytics] = await Promise.all([
        getPlatformTeacherDistribution(),
        getPlatformRevenueDetail(),
        fetch('/api/super-admin/analytics').then((res) => res.json()),
      ]);
      setTeacherDistribution(teachers ?? []);
      setRevenueDetail(revenue);
      setAnalyticsData(analytics);
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

      <div className='grid md:grid-cols-4 gap-4'>
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
              <Building2 className='w-5 h-5 text-purple-500' />
            </div>
            <p className='text-sm text-muted-foreground'>Total Schools</p>
          </div>
          <h3 className='text-2xl font-bold'>{analyticsData?.totalSchools ?? 0}</h3>
        </GlassCard>

        <GlassCard className='p-6'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center'>
              <AlertCircle className='w-5 h-5 text-rose-500' />
            </div>
            <p className='text-sm text-muted-foreground'>Trial Expired</p>
          </div>
          <h3 className='text-2xl font-bold'>{analyticsData?.statusDistribution?.TRAIL_EXPIRED ?? 0}</h3>
        </GlassCard>
      </div>

      <div className='grid lg:grid-cols-2 gap-6'>
        <GlassCard className='p-6'>
          <h3 className='font-semibold mb-4'>License Status Distribution</h3>
          {loading ? (
            <div className='space-y-3'>
              {[...Array(4)].map((_, i) => (
                <div key={i} className='h-12 bg-muted/30 rounded-lg animate-pulse' />
              ))}
            </div>
          ) : (
            <div className='space-y-3'>
              <div className='flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20'>
                <span className='text-sm font-medium'>Active</span>
                <span className='text-lg font-bold text-emerald-600'>{analyticsData?.statusDistribution?.ACTIVE ?? 0}</span>
              </div>
              <div className='flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20'>
                <span className='text-sm font-medium'>Trial</span>
                <span className='text-lg font-bold text-blue-600'>{analyticsData?.statusDistribution?.TRIAL ?? 0}</span>
              </div>
              <div className='flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20'>
                <span className='text-sm font-medium'>Suspended</span>
                <span className='text-lg font-bold text-amber-600'>{analyticsData?.statusDistribution?.SUSPENDED ?? 0}</span>
              </div>
              <div className='flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/20'>
                <span className='text-sm font-medium'>Trial Expired</span>
                <span className='text-lg font-bold text-rose-600'>{analyticsData?.statusDistribution?.TRAIL_EXPIRED ?? 0}</span>
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard className='p-6'>
          <h3 className='font-semibold mb-4'>Plan Breakdown</h3>
          {loading ? (
            <div className='space-y-3'>
              {[...Array(4)].map((_, i) => (
                <div key={i} className='h-12 bg-muted/30 rounded-lg animate-pulse' />
              ))}
            </div>
          ) : analyticsData?.planBreakdown && analyticsData.planBreakdown.length > 0 ? (
            <div className='space-y-3'>
              {analyticsData.planBreakdown.map((plan) => (
                <div key={plan.id} className='flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40'>
                  <div>
                    <p className='text-sm font-medium'>{plan.name}</p>
                    <p className='text-xs text-muted-foreground'>${plan.priceMonthly.toFixed(2)}/mo</p>
                  </div>
                  <div className='text-right'>
                    <p className='text-lg font-bold'>{plan.schoolCount}</p>
                    <p className='text-xs text-muted-foreground'>schools</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-center text-sm text-muted-foreground py-8'>No plan data available</div>
          )}
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
