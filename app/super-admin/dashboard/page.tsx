'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  TrendingUp,
  Users,
  Server,
  ShieldCheck,
  Activity,
  Loader2,
} from 'lucide-react';

import { useRequireAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/enterprise/page-header';
import { StatCard } from '@/components/enterprise/stat-card';
import { GlassCard } from '@/components/enterprise/glass-card';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import {
  getPlatformSummary,
  getPlatformSchools,
  getPlatformTeacherDistribution,
  getPlatformRevenueDetail,
  getPlatformHealthDetail,
  type PlatformSummary,
  type PlatformSchoolRow,
  type PlatformTeacherDistribution,
  type PlatformRevenueDetail,
  type PlatformHealthProbe,
} from '@/lib/api-services';

type ActivePanel = 'schools' | 'teachers' | 'revenue' | 'health' | null;

export default function SuperAdminDashboardPage() {
  useRequireAuth('super-admin');

  // State Management
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  
  // Drill-down Data States
  const [schools, setSchools] = useState<PlatformSchoolRow[]>([]);
  const [teacherDistribution, setTeacherDistribution] = useState<PlatformTeacherDistribution[]>([]);
  const [revenueDetail, setRevenueDetail] = useState<PlatformRevenueDetail | null>(null);
  const [healthProbes, setHealthProbes] = useState<PlatformHealthProbe[]>([]);
  const [healthUptime, setHealthUptime] = useState('99.9%');

  useEffect(() => {
    getPlatformSummary().then(setSummary).catch(console.error);
  }, []);

  const openPanel = useCallback(async (panel: ActivePanel) => {
    setActivePanel(panel);
    setPanelLoading(true);
    try {
      if (panel === 'schools') setSchools(await getPlatformSchools());
      if (panel === 'teachers') setTeacherDistribution(await getPlatformTeacherDistribution());
      if (panel === 'revenue') setRevenueDetail(await getPlatformRevenueDetail());
      if (panel === 'health') {
        const data = await getPlatformHealthDetail();
        setHealthProbes(data.probes ?? []);
        setHealthUptime(`${data.uptimePercent ?? '99.9'}%`);
      }
    } catch (err) {
      console.error(`Error loading ${panel}:`, err);
    } finally {
      setPanelLoading(false);
    }
  }, []);

  const statusBadgeClass = (status?: string | null) => {
    const s = status?.toLowerCase() ?? '';
    if (s === 'active') return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    if (s === 'trial') return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
    return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='max-w-7xl mx-auto space-y-6'>
      <PageHeader
        title='Platform Command Center'
        description='Global SaaS metrics, tenant health, and institutional analytics.'
        breadcrumbs={[{ label: 'Super Admin', href: '/super-admin/dashboard' }, { label: 'Dashboard' }]}
      />

      {/* Stats Grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard label='Monthly Revenue' value={summary?.monthlyRecurringRevenue ?? '—'} variant='primary' icon={TrendingUp} onClick={() => openPanel('revenue')} />
        <StatCard label='Active Schools' value={summary?.activeSchools ?? '—'} icon={Building2} onClick={() => openPanel('schools')} />
        <StatCard label='Platform Teachers' value={summary?.platformTeachers ?? '—'} icon={Users} onClick={() => openPanel('teachers')} />
        <StatCard label='Infrastructure' value={summary?.systemHealth ?? '—'} variant='success' icon={Server} onClick={() => openPanel('health')} />
      </div>

      {/* Charts Section - Using optional chaining for safe data access */}
      <div className='grid lg:grid-cols-2 gap-6'>
        <GlassCard className='p-6'>
          <h3 className='font-semibold'>Institutional Growth</h3>
          <div className='h-72'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart data={summary?.growthData ?? []}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='month' />
                <YAxis />
                <Tooltip />
                <Line type='monotone' dataKey='schools' stroke='oklch(0.55 0.15 265)' strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className='p-6'>
          <h3 className='font-semibold'>Plan Distribution</h3>
          <div className='h-72'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie data={summary?.planMix ?? []} dataKey='count' nameKey='plan' innerRadius={70} outerRadius={100}>
                  {(summary?.planMix ?? []).map((_, i) => <Cell key={i} fill={['#3b82f6', '#10b981', '#f59e0b'][i % 3]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Modals & Sheets (Dialogs) */}
      <Dialog open={activePanel === 'schools'} onOpenChange={() => setActivePanel(null)}>
        <DialogContent className='max-w-4xl'>
          <DialogHeader>
            <DialogTitle>Active School Registers</DialogTitle>
            <DialogDescription>Institutional tenant registry and licensing overview.</DialogDescription>
          </DialogHeader>

          {panelLoading ? (
            <div className='py-10 text-center text-sm text-muted-foreground'>Loading schools...</div>
          ) : (
            <div className='overflow-hidden rounded-xl border border-border/50'>
              <table className='w-full text-sm'>
                <thead className='bg-muted/40'>
                  <tr>
                    <th className='p-3 text-left'>School</th>
                    <th className='p-3 text-left'>Plan</th>
                    <th className='p-3 text-left'>Status</th>
                    <th className='p-3 text-left'>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((school) => (
                    <tr key={school.id} className='border-t border-border/30'>
                      <td className='p-3'>{school.name}</td>
                      <td className='p-3'>{school.planName}</td>
                      <td className='p-3'>
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium', statusBadgeClass(school.licenseStatus))}>
                          {school.licenseStatus}
                        </span>
                      </td>
                      <td className='p-3'>{school.licenseDate ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === 'teachers'} onOpenChange={() => setActivePanel(null)}>
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Teacher Distribution</DialogTitle>
            <DialogDescription>Active teacher allocations grouped by institution.</DialogDescription>
          </DialogHeader>

          {panelLoading ? (
            <div className='py-10 text-center text-sm text-muted-foreground'>Loading teacher metrics...</div>
          ) : (
            <div className='space-y-3'>
              {teacherDistribution.length === 0 ? (
                <div className='rounded-xl border border-border/50 bg-muted/20 p-5 text-center text-sm text-muted-foreground'>No teacher distribution data available.</div>
              ) : (
                teacherDistribution.map((teacher) => (
                  <div key={teacher.schoolId} className='flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 p-4'>
                    <div>
                      <p className='font-medium'>{teacher.schoolName}</p>
                      <p className='text-xs text-muted-foreground'>Faculty load cluster</p>
                    </div>
                    <div className='text-lg font-semibold'>{teacher.teacherCount}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={activePanel === 'revenue'} onOpenChange={() => setActivePanel(null)}>
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Revenue Analytics</DialogTitle>
            <DialogDescription>Monthly recurring revenue and tier contribution details.</DialogDescription>
          </DialogHeader>

          {panelLoading || !revenueDetail ? (
            <div className='py-10 text-center text-sm text-muted-foreground'>Loading revenue analytics...</div>
          ) : (
            <div className='space-y-6'>
              <div className='grid md:grid-cols-2 gap-4'>
                <GlassCard className='p-5'>
                  <p className='text-sm text-muted-foreground'>Annual Revenue Forecast</p>
                  <h3 className='text-3xl font-bold mt-2'>${(revenueDetail.activeMrr * 12).toLocaleString()}</h3>
                </GlassCard>
                <GlassCard className='p-5'>
                  <p className='text-sm text-muted-foreground'>Active Transactions</p>
                  <h3 className='text-3xl font-bold mt-2'>{revenueDetail.transactions.length}</h3>
                </GlassCard>
              </div>

              <div className='overflow-hidden rounded-xl border border-border/50'>
                <table className='w-full text-sm'>
                  <thead className='bg-muted/40'>
                    <tr>
                      <th className='p-3 text-left'>Tier</th>
                      <th className='p-3 text-left'>Monthly Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueDetail.tierContributions.map((item, index) => (
                      <tr key={`revenue-tier-${index}`} className='border-t border-border/30'>
                        <td className='p-3'>{item.planName}</td>
                        <td className='p-3'>${item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                    {revenueDetail.tierContributions.length === 0 && (
                      <tr>
                        <td colSpan={2} className='p-3 text-center text-muted-foreground text-sm'>No tier contribution data available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={activePanel === 'health'} onOpenChange={() => setActivePanel(null)}>
        <SheetContent className='w-[500px] sm:w-[600px]'>
          <SheetHeader>
            <SheetTitle>Infrastructure Telemetry</SheetTitle>
            <SheetDescription>Live global node health and server response monitoring.</SheetDescription>
          </SheetHeader>

          <div className='mt-6 space-y-4'>
            <div className='rounded-xl border border-border/40 bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>Global Uptime</p>
              <h3 className='mt-2 text-3xl font-bold'>{healthUptime}</h3>
            </div>

            {panelLoading ? (
              <div className='py-10 text-center text-sm text-muted-foreground'>Probing regional clusters...</div>
            ) : (
              <div className='space-y-3'>
                {healthProbes.length === 0 ? (
                  <div className='rounded-xl border border-border/40 bg-muted/20 p-5 text-sm text-muted-foreground text-center'>No telemetry probes available.</div>
                ) : (
                  healthProbes.map((probe) => (
                    <div key={probe.regionId} className='rounded-xl border border-border/40 bg-muted/20 p-4'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='font-medium'>{probe.regionLabel}</p>
                          <p className='text-xs text-muted-foreground'>Ping latency: {probe.latencyMs}ms</p>
                        </div>
                        <span className={cn('px-3 py-1 rounded-full text-xs font-medium', probe.statusCode === 200 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500')}>
                          {probe.statusCode === 200 ? 'ONLINE' : 'DEGRADED'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}