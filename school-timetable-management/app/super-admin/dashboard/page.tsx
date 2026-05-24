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
} from 'lucide-react';

import { useRequireAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

import { PageHeader } from '@/components/enterprise/page-header';
import { StatCard } from '@/components/enterprise/stat-card';
import { GlassCard } from '@/components/enterprise/glass-card';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

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

const growthData = [
  { month: 'Jan', schools: 4 },
  { month: 'Feb', schools: 6 },
  { month: 'Mar', schools: 9 },
  { month: 'Apr', schools: 12 },
  { month: 'May', schools: 15 },
];

const planMix = [
  {
    name: 'Basic',
    value: 45,
    color: 'oklch(0.55 0.15 265)',
  },
  {
    name: 'Growth',
    value: 35,
    color: 'oklch(0.65 0.12 195)',
  },
  {
    name: 'Enterprise',
    value: 20,
    color: 'oklch(0.6 0.15 80)',
  },
];

type ActivePanel =
  | 'schools'
  | 'teachers'
  | 'revenue'
  | 'health'
  | null;

export default function SuperAdminDashboardPage() {
  useRequireAuth('super-admin');

  const [summary, setSummary] =
    useState<PlatformSummary | null>(null);

  const [activePanel, setActivePanel] =
    useState<ActivePanel>(null);

  const [panelLoading, setPanelLoading] =
    useState(false);

  const [schools, setSchools] = useState<
    PlatformSchoolRow[]
  >([]);

  const [teacherDistribution, setTeacherDistribution] =
    useState<PlatformTeacherDistribution[]>([]);

  const [revenueDetail, setRevenueDetail] =
    useState<PlatformRevenueDetail | null>(null);

  const [healthProbes, setHealthProbes] =
    useState<PlatformHealthProbe[]>([]);

  const [healthUptime, setHealthUptime] =
    useState('99.9%');

  useEffect(() => {
    getPlatformSummary()
      .then(setSummary)
      .catch((error) => {
        console.error(
          'Failed to load platform summary:',
          error
        );
      });
  }, []);

  const openPanel = useCallback(
    async (panel: ActivePanel) => {
      setActivePanel(panel);
      setPanelLoading(true);

      try {
        if (panel === 'schools') {
          const data = await getPlatformSchools();
          setSchools(data);
        }

        if (panel === 'teachers') {
          const data =
            await getPlatformTeacherDistribution();

          setTeacherDistribution(data);
        }

        if (panel === 'revenue') {
          const data =
            await getPlatformRevenueDetail();

          setRevenueDetail(data);
        }

        if (panel === 'health') {
          const data =
            await getPlatformHealthDetail();

          setHealthProbes(data.probes);
          setHealthUptime(`${data.uptimePercent}%`);
        }
      } catch (error) {
        console.error(
          `Failed to load ${panel} panel`,
          error
        );
      } finally {
        setPanelLoading(false);
      }
    },
    []
  );

  const closePanel = () => {
    setActivePanel(null);
  };

  const statusBadgeClass = (status: string) => {
    const normalized = status.toLowerCase();

    if (normalized === 'active') {
      return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    }

    if (normalized === 'trial') {
      return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
    }

    return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className='max-w-7xl mx-auto space-y-6'
    >
      <PageHeader
        title='Platform Command Center'
        description='Global SaaS metrics, tenant health, infrastructure telemetry, and institutional analytics.'
        breadcrumbs={[
          {
            label: 'Super Admin',
            href: '/super-admin/dashboard',
          },
          {
            label: 'Dashboard',
          },
        ]}
      />

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard
          label='Monthly Recurring Revenue'
          value={
            summary?.monthlyRecurringRevenue ?? '—'
          }
          subtext={
            summary
              ? `$${summary.monthlyRecurringRevenueRaw.toFixed(
                  2
                )} active MRR`
              : 'Loading...'
          }
          variant='primary'
          icon={TrendingUp}
          trend='+8.2%'
          index={0}
          onClick={() => void openPanel('revenue')}
        />

        <StatCard
          label='Active Schools'
          value={summary?.activeSchools ?? '—'}
          subtext={
            summary
              ? `${summary.trialSchools} trial institutes`
              : 'Loading schools...'
          }
          icon={Building2}
          index={1}
          onClick={() => void openPanel('schools')}
        />

        <StatCard
          label='Platform Teachers'
          value={summary?.platformTeachers ?? '—'}
          subtext='Across all active tenants'
          icon={Users}
          index={2}
          onClick={() => void openPanel('teachers')}
        />

        <StatCard
          label='Infrastructure Health'
          value={summary?.systemHealth ?? '—'}
          subtext={
            summary
              ? `${summary.latencyMs}ms primary cluster latency`
              : 'Monitoring global nodes'
          }
          variant='success'
          icon={Server}
          index={3}
          onClick={() => void openPanel('health')}
        />
      </div>

      <div className='grid lg:grid-cols-2 gap-6'>
        <GlassCard className='p-6'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h3 className='font-semibold text-lg'>
                Institutional Growth
              </h3>
              <p className='text-sm text-muted-foreground'>
                Monthly onboarding progression
              </p>
            </div>

            <Activity className='h-5 w-5 text-indigo-500' />
          </div>

          <div className='h-72'>
            <ResponsiveContainer
              width='100%'
              height='100%'
            >
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='month' />
                <YAxis />
                <Tooltip />

                <Line
                  type='monotone'
                  dataKey='schools'
                  stroke='oklch(0.55 0.15 265)'
                  strokeWidth={3}
                  dot={{
                    fill: 'oklch(0.55 0.15 265)',
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className='p-6'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h3 className='font-semibold text-lg'>
                Plan Distribution
              </h3>

              <p className='text-sm text-muted-foreground'>
                Tenant licensing segmentation
              </p>
            </div>

            <ShieldCheck className='h-5 w-5 text-emerald-500' />
          </div>

          <div className='h-72'>
            <ResponsiveContainer
              width='100%'
              height='100%'
            >
              <PieChart>
                <Pie
                  data={planMix}
                  cx='50%'
                  cy='50%'
                  innerRadius={70}
                  outerRadius={100}
                  dataKey='value'
                  label={({ name }) => name}
                >
                  {planMix.map((entry, index) => (
                    <Cell
                      key={`plan-${entry.name}-${index}`}
                      fill={entry.color}
                    />
                  ))}
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard className='p-6'>
        <div className='flex items-center justify-between mb-6'>
          <div>
            <h3 className='text-lg font-semibold'>
              SaaS Subscription Plans
            </h3>

            <p className='text-sm text-muted-foreground'>
              Active institutional pricing structure
            </p>
          </div>
        </div>

        <div className='grid md:grid-cols-3 gap-5'>
          {[
            {
              name: 'Basic (0–30 Teachers)',
              price: '$49/mo',
              schools: 7,
            },
            {
              name: 'Growth (30–50 Teachers)',
              price: '$99/mo',
              schools: 5,
            },
            {
              name: 'Enterprise Pro (50+)',
              price: '$199/mo',
              schools: 3,
            },
          ].map((plan, index) => (
            <motion.div
              key={`subscription-${plan.name}-${index}`}
              whileHover={{ y: -4 }}
              className='rounded-2xl border border-border/50 bg-muted/20 p-5 transition-all'
            >
              <h4 className='font-semibold text-lg'>
                {plan.name}
              </h4>

              <div className='mt-4 text-3xl font-bold'>
                {plan.price}
              </div>

              <p className='mt-2 text-sm text-muted-foreground'>
                {plan.schools} active schools
              </p>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      <Dialog
        open={activePanel === 'schools'}
        onOpenChange={closePanel}
      >
        <DialogContent className='max-w-4xl'>
          <DialogHeader>
            <DialogTitle>
              Active School Registers
            </DialogTitle>

            <DialogDescription>
              Institutional tenant registry and
              licensing overview.
            </DialogDescription>
          </DialogHeader>

          {panelLoading ? (
            <div className='py-10 text-center text-sm text-muted-foreground'>
              Loading schools...
            </div>
          ) : (
            <div className='overflow-hidden rounded-xl border border-border/50'>
              <table className='w-full text-sm'>
                <thead className='bg-muted/40'>
                  <tr>
                    <th className='p-3 text-left'>
                      School
                    </th>

                    <th className='p-3 text-left'>
                      Plan
                    </th>

                    <th className='p-3 text-left'>
                      Status
                    </th>

                    <th className='p-3 text-left'>
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {schools.map((school, index) => (
                    <tr
                      key={`school-row-${school.id}-${index}`}
                      className='border-t border-border/30'
                    >
                      <td className='p-3'>
                        {school.name}
                      </td>

                      <td className='p-3'>
                        {school.planName ??
                          'Standard'}
                      </td>

                      <td className='p-3'>
                        <span
                          className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            statusBadgeClass(
                              school.status
                            )
                          )}
                        >
                          {school.status}
                        </span>
                      </td>

                      <td className='p-3'>
                        {school.createdAt
                          ? new Date(
                              school.createdAt
                            ).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={activePanel === 'teachers'}
        onOpenChange={closePanel}
      >
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              Teacher Distribution
            </DialogTitle>

            <DialogDescription>
              Active teacher allocations grouped by
              institutions.
            </DialogDescription>
          </DialogHeader>

          {panelLoading ? (
            <div className='py-10 text-center text-sm text-muted-foreground'>
              Loading teacher metrics...
            </div>
          ) : (
            <div className='space-y-3'>
              {teacherDistribution.map(
                (teacher, index) => (
                  <div
                    key={`teacher-distribution-${index}`}
                    className='flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 p-4'
                  >
                    <div>
                      <p className='font-medium'>
                        {teacher.schoolName}
                      </p>

                      <p className='text-xs text-muted-foreground'>
                        Faculty load cluster
                      </p>
                    </div>

                    <div className='text-lg font-semibold'>
                      {teacher.teacherCount}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={activePanel === 'revenue'}
        onOpenChange={closePanel}
      >
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>
              Revenue Analytics
            </DialogTitle>

            <DialogDescription>
              Monthly recurring revenue and pricing
              contribution analysis.
            </DialogDescription>
          </DialogHeader>

          {panelLoading || !revenueDetail ? (
            <div className='py-10 text-center text-sm text-muted-foreground'>
              Loading revenue pipelines...
            </div>
          ) : (
            <div className='space-y-6'>
              <div className='grid md:grid-cols-2 gap-4'>
                <GlassCard className='p-5'>
                  <p className='text-sm text-muted-foreground'>
                    Annual Revenue Forecast
                  </p>

                  <h3 className='text-3xl font-bold mt-2'>
                    $
                    {(
                      revenueDetail.totalMrr * 12
                    ).toLocaleString()}
                  </h3>
                </GlassCard>

                <GlassCard className='p-5'>
                  <p className='text-sm text-muted-foreground'>
                    Active Subscriptions
                  </p>

                  <h3 className='text-3xl font-bold mt-2'>
                    {
                      revenueDetail.activeSubscriptionsCount
                    }
                  </h3>
                </GlassCard>
              </div>

              <div className='overflow-hidden rounded-xl border border-border/50'>
                <table className='w-full text-sm'>
                  <thead className='bg-muted/40'>
                    <tr>
                      <th className='p-3 text-left'>
                        Tier
                      </th>

                      <th className='p-3 text-left'>
                        Monthly Revenue
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {revenueDetail.breakdown.map(
                      (item, index) => (
                        <tr
                          key={`revenue-breakdown-${index}`}
                          className='border-t border-border/30'
                        >
                          <td className='p-3'>
                            {item.tierName}
                          </td>

                          <td className='p-3'>
                            $
                            {item.mrrValue.toFixed(
                              2
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet
        open={activePanel === 'health'}
        onOpenChange={closePanel}
      >
        <SheetContent className='w-[500px] sm:w-[600px]'>
          <SheetHeader>
            <SheetTitle>
              Infrastructure Telemetry
            </SheetTitle>

            <SheetDescription>
              Live global node health and server
              response monitoring.
            </SheetDescription>
          </SheetHeader>

          <div className='mt-6 space-y-4'>
            <div className='rounded-xl border border-border/40 bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>
                Global Uptime
              </p>

              <h3 className='mt-2 text-3xl font-bold'>
                {healthUptime}
              </h3>
            </div>

            {panelLoading ? (
              <div className='py-10 text-center text-sm text-muted-foreground'>
                Probing regional clusters...
              </div>
            ) : (
              <div className='space-y-3'>
                {healthProbes.map((probe, index) => (
                  <div
                    key={`probe-${probe.regionCode}-${index}`}
                    className='rounded-xl border border-border/40 bg-muted/20 p-4'
                  >
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='font-medium'>
                          {probe.regionCode}
                        </p>

                        <p className='text-xs text-muted-foreground'>
                          Ping latency:{' '}
                          {probe.latencyMs}ms
                        </p>
                      </div>

                      <span
                        className={cn(
                          'px-3 py-1 rounded-full text-xs font-medium',
                          probe.operational
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-rose-500/10 text-rose-500'
                        )}
                      >
                        {probe.operational
                          ? 'ONLINE'
                          : 'DEGRADED'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}