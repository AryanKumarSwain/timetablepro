'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  TrendingUp,
  Users,
  Server,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useRequireAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/enterprise/page-header';
import { StatCard } from '@/components/enterprise/stat-card';
import { GlassCard } from '@/components/enterprise/glass-card';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import {
  getPlatformSummary,
  type PlatformSummary,
} from '@/lib/api-services';

export default function SuperAdminDashboardPage() {
  useRequireAuth('super-admin');
  const router = useRouter();

  // State Management
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlatformSummary()
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='max-w-7xl mx-auto space-y-6'>
      <PageHeader
        title='Platform Command Center'
        description='Global SaaS metrics, tenant health, and institutional analytics.'
        breadcrumbs={[{ label: 'Super Admin', href: '/super-admin/dashboard' }, { label: 'Dashboard' }]}
      />

      {loading ? (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
          {[...Array(4)].map((_, i) => (
            <div key={i} className='h-32 bg-muted/30 rounded-lg animate-pulse' />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            <StatCard
              label='Monthly Recurring Revenue'
              value={`$${summary?.monthlyRecurringRevenueRaw?.toFixed(2) ?? '0.00'}`}
              trend='+8.2%'
              variant='primary'
              icon={TrendingUp}
              onClick={() => router.push('/super-admin/analytics')}
            />
            <StatCard
              label='Active Schools'
              value={`${summary?.activeSchools ?? 0} ${summary?.trialSchools ? `(${summary.trialSchools} trial)` : ''}`}
              icon={Building2}
              onClick={() => router.push('/super-admin/schools')}
            />
            <StatCard
              label='Platform Teachers'
              value={`${summary?.platformTeachers ?? 0}`}
              icon={Users}
              onClick={() => router.push('/super-admin/analytics')}
            />
            <StatCard
              label='Infrastructure Health'
              value={`${summary?.latencyMs ?? 0}ms`}
              variant='success'
              icon={Server}
            />
          </div>
        </>
      )}

      {/* Charts Section */}
      {!loading && (
        <>
          <div className='grid lg:grid-cols-2 gap-6'>
            <GlassCard className='p-6'>
              <h3 className='font-semibold mb-4'>Institutional Growth</h3>
              <div className='h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                  <LineChart data={summary?.growthData ?? []}>
                    <CartesianGrid strokeDasharray='3 3' stroke='currentColor' className='stroke-muted/30' />
                    <XAxis dataKey='month' stroke='currentColor' className='text-xs' />
                    <YAxis stroke='currentColor' className='text-xs' />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        borderRadius: '8px',
                      }}
                    />
                    <Line type='monotone' dataKey='schools' stroke='oklch(0.55 0.15 265)' strokeWidth={3} dot={{ fill: 'oklch(0.55 0.15 265)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard className='p-6'>
              <h3 className='font-semibold mb-4'>Plan Distribution</h3>
              <div className='h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                  <PieChart>
                    <Pie
                      data={summary?.planMix ?? []}
                      dataKey='count'
                      nameKey='plan'
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {(summary?.planMix ?? []).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={['#3b82f6', '#10b981', '#f59e0b'][index % 3]}
                          stroke='rgba(255,255,255,0.2)'
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          <GlassCard className='p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='font-semibold'>Current subscription tiers</h3>
              <span className='text-sm text-muted-foreground'>Updated from active plan data</span>
            </div>
            <div className='grid gap-4'>
              {summary?.planMix?.length ? (
                summary.planMix.map((plan) => (
                  <div key={plan.plan} className='flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-muted/20 p-4'>
                    <div>
                      <p className='font-medium'>{plan.plan}</p>
                      <p className='text-sm text-muted-foreground'>{plan.count} school{plan.count === 1 ? '' : 's'}</p>
                    </div>
                    <div className='text-right'>
                      <p className='text-sm text-muted-foreground'>Adoption</p>
                      <p className='font-semibold'>{plan.count}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className='rounded-xl border border-border/50 bg-muted/20 p-5 text-center text-sm text-muted-foreground'>
                  No pricing plan distribution data available.
                </div>
              )}
            </div>
          </GlassCard>
        </>
      )}
    </motion.div>
  );
}