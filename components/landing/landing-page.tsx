'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Shield,
  BarChart3,
  RefreshCw,
  FileText,
  Check,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/enterprise/glass-card';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { usePlanTheme } from '@/lib/plan-theme';

const features = [
  {
    icon: Zap,
    title: 'Smart Substitute Engine',
    desc: 'Priority-ranked cover teachers by subject, department, and workload.',
  },
  {
    icon: Shield,
    title: 'Conflict-Free Scheduling',
    desc: 'Hard filters prevent double-booking and absent teacher conflicts.',
  },
  {
    icon: Sparkles,
    title: 'Multi-Tenant SaaS',
    desc: 'Isolated schools, plans, and licenses on one platform.',
  },
  {
    icon: BarChart3,
    title: 'Burnout Analytics',
    desc: 'Workload meters and substitution load visibility per teacher.',
  },
  {
    icon: RefreshCw,
    title: 'Real-Time Updates',
    desc: 'Daily desk operations with live attendance and cover status.',
  },
  {
    icon: FileText,
    title: 'Advanced PDF Exports',
    desc: 'Branded class and teacher timetables for any date range.',
  },
];

const plans = [
  {
    name: 'Basic',
    range: '0–30 teachers',
    price: { monthly: 49, yearly: 470 },
    features: ['Daily desk', 'Substitutions', 'Weekly timetable', 'Email support'],
  },
  {
    name: 'Growth',
    range: '30–50 teachers',
    price: { monthly: 99, yearly: 950 },
    popular: true,
    features: ['Everything in Basic', 'Analytics', 'Clone day ops', 'Priority support'],
  },
  {
    name: 'Enterprise',
    range: '50+ teachers',
    price: { monthly: 199, yearly: 1910 },
    features: ['Custom SLA', 'SSO', 'Dedicated onboarding', 'API access'],
  },
];

export function LandingPage() {
  const [yearly, setYearly] = useState(false);
  const { theme } = usePlanTheme();

  return (
    <div className='min-h-screen bg-background overflow-x-hidden'>
      <header className='sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl'>
        <div className='max-w-6xl mx-auto px-4 h-16 flex items-center justify-between'>
          <Link href='/' className='flex items-center gap-2 font-semibold'>
            <div className='h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center'>
              <Sparkles className='h-4 w-4 text-white' />
            </div>
            TimetablePro
          </Link>
          <nav className='hidden md:flex items-center gap-8 text-sm text-muted-foreground'>
            <a href='#features' className='hover:text-foreground transition-colors'>
              Features
            </a>
            <a href='#pricing' className='hover:text-foreground transition-colors'>
              Pricing
            </a>
          </nav>
          <div className='flex items-center gap-2'>
            <Button variant='ghost' asChild>
              <Link href='/login'>Sign in</Link>
            </Button>
            <Button asChild className='rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600'>
              <Link href='/signup'>Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className='relative pt-20 pb-28 px-4 overflow-hidden'>
        <div className='absolute inset-0 mesh-gradient pointer-events-none' />
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className='absolute top-32 right-[10%] w-48 h-32 rounded-2xl glass-panel p-3 hidden lg:block rotate-3'
        >
          <p className='text-[10px] text-muted-foreground'>Period 3 · Class 10-A</p>
          <p className='text-sm font-semibold mt-1'>Physics</p>
          <p className='text-xs text-indigo-500'>Dr. Rajesh Kumar</p>
        </motion.div>
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className='absolute bottom-40 left-[8%] w-40 h-28 rounded-2xl glass-panel p-3 hidden lg:block -rotate-2'
        >
          <p className='text-xs font-medium text-emerald-600'>+12% efficiency</p>
          <p className='text-2xl font-bold mt-2'>98%</p>
          <p className='text-[10px] text-muted-foreground'>Cover rate this week</p>
        </motion.div>

        <div className='max-w-4xl mx-auto text-center relative'>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-4'
          >
            Enterprise scheduling for modern schools
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className='text-4xl md:text-6xl font-bold tracking-tight leading-tight'
          >
            Effortlessly Manage School Timetables with{' '}
            <span className='gradient-text'>AI Powered Automation</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className='mt-6 text-lg text-muted-foreground max-w-2xl mx-auto'
          >
            TimetablePro unifies weekly scheduling, daily attendance, and
            intelligent substitute assignment in one premium SaaS platform.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className='mt-10 flex flex-wrap justify-center gap-4'
          >
            <Button
              size='lg'
              asChild
              className='rounded-xl h-12 px-8 bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/25'
            >
              <Link href='/signup'>
                Start Free Trial
                <ArrowRight className='ml-2 h-4 w-4' />
              </Link>
            </Button>
            <Button size='lg' variant='outline' asChild className='rounded-xl h-12 px-8'>
              <Link href='/login'>Book Personal Demo</Link>
            </Button>
          </motion.div>
          <div className='mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto'>
            {[
              { label: 'Schools', value: '120+' },
              { label: 'Teachers', value: '8.4k' },
              { label: 'Covers / mo', value: '24k' },
              { label: 'Uptime', value: '99.9%' },
            ].map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.08 }}
              >
                <GlassCard className='p-4 text-center'>
                  <p className='text-2xl font-bold'>{m.value}</p>
                  <p className='text-xs text-muted-foreground mt-1'>{m.label}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id='features' className='py-24 px-4 max-w-6xl mx-auto'>
        <h2 className='text-3xl font-bold text-center mb-4'>Built for operations teams</h2>
        <p className='text-center text-muted-foreground mb-12 max-w-xl mx-auto'>
          Everything you need to run a school day — without spreadsheet chaos.
        </p>
        <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <GlassCard hover className='p-6 h-full'>
                <div className='h-10 w-10 rounded-xl bg-indigo-500/15 flex items-center justify-center mb-4'>
                  <f.icon className='h-5 w-5 text-indigo-500' />
                </div>
                <h3 className='font-semibold text-lg'>{f.title}</h3>
                <p className='text-sm text-muted-foreground mt-2'>{f.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      <section id='pricing' className='py-24 px-4 border-t border-border/50'>
        <div className='max-w-6xl mx-auto'>
          <h2 className='text-3xl font-bold text-center'>Simple, transparent pricing</h2>
          <div className='flex justify-center items-center gap-3 mt-6'>
            <span className={cn('text-sm', !yearly && 'font-semibold')}>Monthly</span>
            <button
              type='button'
              onClick={() => setYearly((y) => !y)}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                yearly ? `bg-${theme.primary}` : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 h-4 w-4 rounded-full bg-white transition-transform',
                  yearly ? 'left-7' : 'left-1'
                )}
              />
            </button>
            <span className={cn('text-sm', yearly && 'font-semibold')}>
              Yearly <span className='text-emerald-600 text-xs'>(save 20%)</span>
            </span>
          </div>
          <div className='grid md:grid-cols-3 gap-6 mt-12'>
            {plans.map((plan) => (
              <GlassCard
                key={plan.name}
                hover
                className={cn(
                  'p-6 relative',
                  plan.popular && `ring-2 ring-${theme.primary}/50 scale-[1.02]`
                )}
              >
                {plan.popular && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full bg-${theme.primary} text-white`}>
                    Most popular
                  </span>
                )}
                <h3 className='text-xl font-bold'>{plan.name}</h3>
                <p className='text-sm text-muted-foreground'>{plan.range}</p>
                <p className='mt-4 text-4xl font-bold'>
                  ${yearly ? plan.price.yearly : plan.price.monthly}
                  <span className='text-sm font-normal text-muted-foreground'>
                    /{yearly ? 'yr' : 'mo'}
                  </span>
                </p>
                <ul className='mt-6 space-y-2'>
                  {plan.features.map((feat) => (
                    <li key={feat} className='flex items-center gap-2 text-sm'>
                      <Check className='h-4 w-4 text-emerald-500 shrink-0' />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={cn(
                    'w-full mt-6 rounded-xl',
                    plan.popular && 'bg-gradient-to-r from-indigo-600 to-violet-600'
                  )}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  <Link href='/signup'>Get started</Link>
                </Button>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      <footer className='border-t border-border/50 py-8 text-center text-sm text-muted-foreground'>
        © {new Date().getFullYear()} TimetablePro. Enterprise school scheduling.
      </footer>
    </div>
  );
}
