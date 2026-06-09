'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Edit, Plus, Trash2, Users, TrendingUp } from 'lucide-react';

import { useRequireAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { getPlatformSummary, type PlatformSummary } from '@/lib/api-services';

const pricingTiers = [
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    period: '/month',
    features: ['Up to 50 teachers', 'Basic scheduling', 'Email support', '5GB storage'],
    color: 'from-blue-500/20 to-blue-600/10',
    borderColor: 'border-blue-500/30',
    accent: 'bg-blue-500',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 79,
    period: '/month',
    features: ['Up to 200 teachers', 'Advanced scheduling', 'Priority support', '25GB storage', 'API access'],
    color: 'from-emerald-500/20 to-emerald-600/10',
    borderColor: 'border-emerald-500/30',
    accent: 'bg-emerald-500',
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pro',
    price: 199,
    period: '/month',
    features: ['Unlimited teachers', 'Custom integrations', '24/7 dedicated support', 'Unlimited storage', 'White-label options'],
    color: 'from-purple-500/20 to-purple-600/10',
    borderColor: 'border-purple-500/30',
    accent: 'bg-purple-500',
  },
];

export default function PlansPage() {
  useRequireAuth('super-admin');

  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPlatformSummary();
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plan data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getPlanCount = (planName: string) => {
    if (!summary?.planMix) return 0;
    const plan = summary.planMix.find((p) => p.plan.toLowerCase() === planName.toLowerCase());
    return plan?.count ?? 0;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='max-w-7xl mx-auto space-y-6'>
      <PageHeader
        title='Subscription Plans'
        description='Manage pricing tiers and view plan adoption across all schools.'
        breadcrumbs={[{ label: 'Super Admin', href: '/super-admin/dashboard' }, { label: 'Plans' }]}
      />

      {error && (
        <div className='p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm'>
          {error}
        </div>
      )}

      <div className='grid md:grid-cols-3 gap-6'>
        {pricingTiers.map((tier) => (
          <motion.div
            key={tier.id}
            whileHover={{ y: -4 }}
            className='rounded-xl border p-6 bg-gradient-to-br relative overflow-hidden'
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${tier.color} rounded-full blur-3xl opacity-30`} />
            <div className='relative'>
              <div className='flex items-center justify-between mb-4'>
                <h4 className='text-lg font-semibold'>{tier.name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${tier.accent} text-white`}>
                  {getPlanCount(tier.name)} schools
                </span>
              </div>
              <div className='flex items-baseline gap-1 mb-6'>
                <span className='text-3xl font-bold'>${tier.price}</span>
                <span className='text-sm text-muted-foreground'>{tier.period}</span>
              </div>
              <ul className='space-y-3 mb-6'>
                {tier.features.map((feature) => (
                  <li key={feature} className='flex items-center gap-2 text-sm'>
                    <CheckCircle2 className='w-4 h-4 text-emerald-500 flex-shrink-0' />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className='flex gap-2'>
                <Button variant='outline' size='sm' className='flex-1'>
                  <Edit className='w-4 h-4 mr-2' />
                  Edit
                </Button>
                <Button variant='outline' size='sm'>
                  <Trash2 className='w-4 h-4' />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <GlassCard className='p-6'>
        <div className='flex items-center justify-between mb-6'>
          <h3 className='font-semibold'>Plan Overview</h3>
          <Button size='sm'>
            <Plus className='w-4 h-4 mr-2' />
            Add Custom Plan
          </Button>
        </div>

        {loading ? (
          <div className='space-y-3'>
            {[...Array(3)].map((_, i) => (
              <div key={i} className='h-20 bg-muted/30 rounded-lg animate-pulse' />
            ))}
          </div>
        ) : (
          <div className='space-y-4'>
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className='flex items-center justify-between p-4 rounded-lg border border-border/40 bg-muted/20'
              >
                <div className='flex items-center gap-4'>
                  <div className={`w-10 h-10 rounded-lg ${tier.accent} flex items-center justify-center`}>
                    <Users className='w-5 h-5 text-white' />
                  </div>
                  <div>
                    <p className='font-medium'>{tier.name}</p>
                    <p className='text-sm text-muted-foreground'>${tier.price}/month • {getPlanCount(tier.name)} active schools</p>
                  </div>
                </div>
                <div className='flex items-center gap-4'>
                  <div className='text-right'>
                    <p className='text-sm text-muted-foreground'>Monthly Revenue</p>
                    <p className='font-semibold'>
                      ${(getPlanCount(tier.name) * tier.price).toLocaleString()}
                    </p>
                  </div>
                  <Button variant='ghost' size='icon'>
                    <Edit className='w-4 h-4' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
