"use client";

import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  CalendarRange,
  Check,
  Clock3,
  Facebook,
  FileText,
  Instagram,
  Linkedin,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Twitter,
  Users,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { usePlanTheme } from '@/lib/plan-theme';
import { getSuperAdminPlans, type SaasPlan } from '@/lib/api-services';

const heroSlides = [
  {
    src: '/slides/daily-desk.jpg',
    title: 'Daily Desk Operations',
    subtitle: 'Real-Time Attendance & Substitution Matrix',
    tag: 'Live Operations',
    statTop: { label: 'DAILY MATRIX', value: 'Live Schedule Active' },
    statBottom: { label: 'COVER STATUS', value: '18 Pending Covers' },
  },
  {
    src: '/slides/timetable-builder.jpg',
    title: 'Timetable Builder',
    subtitle: 'Conflict-Free Weekly Class & Room Grid',
    tag: 'Smart Builder',
    statTop: { label: 'TOTAL CLASSES', value: '100+ Managed' },
    statBottom: { label: 'CONFLICT ENGINE', value: '0 Clashes / 100% Clean' },
  },
  {
    src: '/slides/operations-dashboard.jpg',
    title: 'Operations Dashboard',
    subtitle: 'Faculty Workload & Subject Analytics',
    tag: 'Live Analytics',
    statTop: { label: 'TOTAL TEACHERS', value: '125 Active Staff' },
    statBottom: { label: 'SUBJECT DISTRIBUTION', value: '210 Slots Tracked' },
  },
];

const landingFeatures = [
  {
    icon: Zap,
    title: 'Smart substitute engine',
    desc: 'Autosuggest the best cover teacher based on subject match, availability, and workload.',
  },
  {
    icon: CalendarRange,
    title: 'Conflict-free scheduling',
    desc: 'Create clean weekly plans without clashes, teacher gaps, or room conflicts.',
  },
  {
    icon: ShieldCheck,
    title: 'School-wide control',
    desc: 'Manage roles, access, policies, and school operations from one secure dashboard.',
  },
  {
    icon: BarChart3,
    title: 'Live attendance analytics',
    desc: 'Track classes, attendance, and workload performance with instant insights.',
  },
  {
    icon: BookOpenText,
    title: 'Lesson planning hub',
    desc: 'Keep homework, lesson plans, and teaching notes aligned across the academic calendar.',
  },
  {
    icon: FileText,
    title: 'Export-ready reports',
    desc: 'Share professional class schedules and summaries in polished PDF and Excel formats.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Set up your school',
    text: 'Add classes, teachers, periods, and rooms in minutes with guided onboarding.',
  },
  {
    number: '02',
    title: 'Build and review timetables',
    text: 'Use live conflict detection and drag-and-drop scheduling to plan each week.',
  },
  {
    number: '03',
    title: 'Track and improve',
    text: 'Monitor daily execution, attendance, and teaching activity with simple dashboards.',
  },
];

const defaultPlans: { id: string; name: string; teacherMin: number; teacherMax: number; priceMonthly: number; reportEnabled?: boolean; attendanceEnabled?: boolean; homeworkEnabled?: boolean; lessonPlanningEnabled?: boolean; exportFormats?: string[] }[] = [];

export function LandingPage() {
  const [yearly, setYearly] = useState(false);
  const { theme } = usePlanTheme();
  const [plans, setPlans] = useState<SaasPlan[] | null>(null);
  const [trustedSchools, setTrustedSchools] = useState<string[]>([]);

  const [activeSlide, setActiveSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isHovered]);

  useEffect(() => {
    let mounted = true;
    getSuperAdminPlans()
      .then((data) => {
        if (mounted) setPlans(data);
      })
      .catch(() => {
        // ignore - keep showing empty state
      });

    fetch('/api/trusted-schools')
      .then((res) => res.json())
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setTrustedSchools(data.map((school: { name: string }) => school.name));
        }
      })
      .catch(() => {
        // ignore - keep showing default schools
      });

    return () => { mounted = false; };
  }, []);

  return (
    <div className='min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_28%,#fdfcff_100%)] text-slate-800'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.22),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(167,139,250,0.20),_transparent_22%),radial-gradient(circle_at_bottom_left,_rgba(34,197,94,0.16),_transparent_25%)]' />

      <header className='sticky top-0 z-50 border-b border-sky-100 bg-white/80 backdrop-blur-xl'>
        <div className='mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8'>
          <Link href='/' className='flex items-center gap-1.5 sm:gap-3 font-semibold text-slate-900 min-w-0 shrink'>
            <Image
              src='/logo-only.png'
              alt='TimetablePro Icon'
              width={48}
              height={48}
              className='h-7 sm:h-9 w-auto object-contain shrink-0'
              priority
            />
            <Image
              src='/logo-text.png'
              alt='TimetablePro Text'
              width={180}
              height={48}
              className='h-5 sm:h-9 max-w-[95px] min-[380px]:max-w-[120px] sm:max-w-none w-auto object-contain shrink min-w-0'
              priority
            />
          </Link>

          <nav className='hidden items-center gap-8 text-sm text-slate-600 md:flex'>
            <a href='#features' className='transition-colors hover:text-slate-900'>Features</a>
            <a href='#how-it-works' className='transition-colors hover:text-slate-900'>How it works</a>
            <a href='#pricing' className='transition-colors hover:text-slate-900'>Pricing</a>
          </nav>

          <div className='flex items-center gap-1 sm:gap-2 shrink-0'>
            <Button variant='ghost' size='sm' asChild className='rounded-xl font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200 text-[11px] sm:text-sm px-2 sm:px-4 h-8 sm:h-10'>
              <Link href='/login'>Sign in</Link>
            </Button>
            <Button size='sm' asChild className='rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20 hover:brightness-110 text-[11px] sm:text-sm px-2.5 sm:px-4 h-8 sm:h-10 whitespace-nowrap'>
              <Link href='/signup'>Start free trial</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className='relative z-10'>
        <section className='px-4 pb-20 pt-14 sm:px-6 lg:px-8'>
          <div className='mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_1.15fr]'>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className='max-w-xl'
            >
              <div className='inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100 px-3 py-1.5 text-xs font-medium tracking-[0.18em] text-blue-700 uppercase'>
                <span className='h-2 w-2 rounded-full bg-emerald-500' />
                Smart school operations
              </div>

              <h1 className='mt-6 text-4xl font-black tracking-[-0.06em] text-slate-900 sm:text-5xl lg:text-6xl xl:text-7xl'>
                Build smarter
                <span className='block bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 bg-clip-text text-transparent'>school time tables</span>
              </h1>

              <p className='mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg'>
                TimetablePro helps schools schedule classes, manage staff, track attendance, and reduce daily chaos with automation built for serious academic operations.
              </p>

              <div className='mt-8 flex flex-wrap items-center gap-4'>
                <Button asChild className='h-12 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 text-base font-semibold text-white shadow-lg shadow-blue-500/20 hover:brightness-110'>
                  <Link href='/signup'>Get started free <ArrowRight className='ml-2 h-4 w-4' /></Link>
                </Button>
                <Button asChild variant='outline' className='h-12 rounded-xl border-sky-200 bg-white px-6 text-base font-semibold text-slate-800 hover:bg-sky-50'>
                  <Link href='/login'>View demo</Link>
                </Button>
              </div>

              <div className='mt-10 flex flex-wrap gap-6 text-sm text-slate-600'>
                {['No setup hassle', 'Secure access', 'Built for schools'].map((item) => (
                  <div key={item} className='inline-flex items-center gap-2'>
                    <span className='flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600'>
                      <Check className='h-3 w-3' />
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className='relative w-full'
            >
              {/* Floating Stat Card - Top Left */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                whileHover={{ scale: 1.08, y: -12 }}
                className="absolute -top-5 left-1 sm:-left-4 z-30 hidden sm:flex items-center gap-3 rounded-2xl border border-sky-100/90 bg-white/95 p-2.5 pr-4 shadow-[0_15px_35px_rgba(37,99,235,0.12)] backdrop-blur-md cursor-pointer transition-shadow hover:shadow-[0_20px_45px_rgba(37,99,235,0.22)]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600 border border-pink-500/20 shrink-0">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSlide}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                        {heroSlides[activeSlide].statTop.label}
                      </p>
                      <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                        {heroSlides[activeSlide].statTop.value}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Floating Stat Card - Bottom Right */}
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                whileHover={{ scale: 1.08, y: 12 }}
                className="absolute -bottom-5 right-1 sm:-right-4 z-30 hidden sm:flex items-center gap-3 rounded-2xl border border-sky-100/90 bg-white/95 p-2.5 pr-4 shadow-[0_15px_35px_rgba(37,99,235,0.12)] backdrop-blur-md cursor-pointer transition-shadow hover:shadow-[0_20px_45px_rgba(37,99,235,0.22)]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSlide}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
                        {heroSlides[activeSlide].statBottom.label}
                      </p>
                      <p className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                        {heroSlides[activeSlide].statBottom.value}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Glow Blur Backgrounds */}
              <div className='absolute -left-6 top-8 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl' />
              <div className='absolute -right-4 bottom-6 h-40 w-40 rounded-full bg-violet-400/20 blur-3xl' />

              {/* Slideshow Frame */}
              <motion.div
                whileHover={{ scale: 1.025 }}
                transition={{ duration: 0.3 }}
                className='relative overflow-hidden rounded-[26px] border border-sky-100 bg-white p-2 sm:p-3 shadow-[0_25px_80px_rgba(37,99,235,0.14)] backdrop-blur-xl group transition-shadow duration-300 hover:shadow-[0_35px_95px_rgba(37,99,235,0.22)]'
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div className='relative overflow-hidden rounded-[20px] border border-slate-200/80 bg-slate-900 aspect-[16/10.5] sm:min-h-[380px] shadow-inner'>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSlide}
                      initial={{ opacity: 0, scale: 1.03 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0"
                    >
                      <img
                        src={heroSlides[activeSlide].src}
                        alt={heroSlides[activeSlide].title}
                        className="w-full h-full object-cover object-top"
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Pill Dot Indicators */}
                <div className="mt-3 flex items-center justify-center gap-2">
                  {heroSlides.map((slide, idx) => (
                    <button
                      key={slide.title}
                      onClick={() => setActiveSlide(idx)}
                      className={cn(
                        'h-2.5 rounded-full transition-all duration-300',
                        activeSlide === idx
                          ? 'w-8 bg-blue-600 shadow-sm'
                          : 'w-2.5 bg-slate-200 hover:bg-slate-300'
                      )}
                      title={`Go to ${slide.title}`}
                    />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section className='border-y border-sky-100 bg-white/50 py-8'>
          <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
            <p className='text-center text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 mb-6'>Trusted by schools</p>
            <div className='overflow-hidden'>
              <div className='flex gap-12 animate-marquee'>
                {trustedSchools.length > 0 ? (
                  <>
                    {trustedSchools.map((school, index) => (
                      <span key={index} className='whitespace-nowrap text-base font-medium text-slate-400'>
                        {school}
                      </span>
                    ))}
                    {trustedSchools.map((school, index) => (
                      <span key={`dup-${index}`} className='whitespace-nowrap text-base font-medium text-slate-400'>
                        {school}
                      </span>
                    ))}
                  </>
                ) : (
                  <>
                    {['Northview Academy', "St. Martin's", 'Horizon International', 'Greenwood School', 'Springfield High', 'Oakridge Academy', 'Westside College', 'Riverside School', 'Mountain View High', 'Lakeside Academy', 'Sunrise International', 'Valley Creek School'].map((school, index) => (
                      <span key={index} className='whitespace-nowrap text-base font-medium text-slate-400'>
                        {school}
                      </span>
                    ))}
                    {['Northview Academy', "St. Martin's", 'Horizon International', 'Greenwood School', 'Springfield High', 'Oakridge Academy', 'Westside College', 'Riverside School', 'Mountain View High', 'Lakeside Academy', 'Sunrise International', 'Valley Creek School'].map((school, index) => (
                      <span key={`dup-${index}`} className='whitespace-nowrap text-base font-medium text-slate-400'>
                        {school}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id='features' className='border-t border-sky-100 bg-white/70 px-4 py-24 sm:px-6 lg:px-8'>
          <div className='mx-auto max-w-7xl'>
            <div className='mx-auto max-w-2xl text-center'>
              <p className='text-sm font-medium uppercase tracking-[0.2em] text-blue-600'>Features</p>
              <h2 className='mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl'>Everything modern schools need</h2>
            </div>

            <div className='mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
              {landingFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06 }}
                  className='group rounded-3xl border border-sky-100 bg-white p-6 shadow-[0_18px_35px_rgba(148,163,184,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_20px_45px_rgba(59,130,246,0.12)]'
                >
                  <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-violet-100 text-blue-600'>
                    <feature.icon className='h-5 w-5' />
                  </div>
                  <h3 className='mt-5 text-xl font-semibold text-slate-900'>{feature.title}</h3>
                  <p className='mt-3 text-sm leading-6 text-slate-600'>{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id='how-it-works' className='px-4 py-24 sm:px-6 lg:px-8'>
          <div className='mx-auto max-w-7xl'>
            <div className='mx-auto max-w-2xl text-center'>
              <p className='text-sm font-medium uppercase tracking-[0.2em] text-violet-600'>How it works</p>
              <h2 className='mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl'>A clearer way to run your school day</h2>
            </div>

            <div className='mt-12 grid gap-6 md:grid-cols-3'>
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className='rounded-3xl border border-sky-100 bg-white p-6 shadow-[0_18px_35px_rgba(148,163,184,0.12)]'
                >
                  <div className='text-sm font-semibold uppercase tracking-[0.2em] text-blue-600'>{step.number}</div>
                  <h3 className='mt-4 text-2xl font-semibold text-slate-900'>{step.title}</h3>
                  <p className='mt-3 text-sm leading-6 text-slate-600'>{step.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id='pricing' className='border-t border-sky-100 bg-white/70 px-4 py-24 sm:px-6 lg:px-8'>
          <div className='mx-auto max-w-7xl'>
            <div className='mx-auto max-w-2xl text-center'>
              <p className='text-sm font-medium uppercase tracking-[0.2em] text-emerald-600'>Pricing</p>
              <h2 className='mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl'>Choose the right plan for your school</h2>
            </div>

            <div className='mt-8 flex items-center justify-center gap-3 text-sm'>
              <span className={cn('text-slate-600', !yearly && 'font-semibold text-slate-900')}>Monthly</span>
              <button
                type='button'
                onClick={() => setYearly((value) => !value)}
                className={cn(
                  'relative h-7 w-12 rounded-full border transition-colors',
                  yearly ? 'border-violet-200 bg-violet-100' : 'border-slate-200 bg-slate-100'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                    yearly ? 'left-6' : 'left-1'
                  )}
                />
              </button>
              <span className={cn('text-slate-600', yearly && 'font-semibold text-slate-900')}>
                Yearly <span className='text-emerald-600'>-17%</span>
              </span>
            </div>

            <div className='mt-12 flex gap-5 overflow-x-auto pb-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible'>
              {(() => {
                const rawPlans = (plans && plans.length > 0 ? plans : [
                  { id: 'standard', name: 'Standard', teacherMin: 0, teacherMax: 15, priceMonthly: 199, reportEnabled: true, attendanceEnabled: false, homeworkEnabled: false, lessonPlanningEnabled: true, exportFormats: ['pdf'] },
                  { id: 'premium', name: 'Premium', teacherMin: 16, teacherMax: 30, priceMonthly: 299, reportEnabled: true, attendanceEnabled: true, homeworkEnabled: false, lessonPlanningEnabled: true, exportFormats: ['pdf', 'docx'] },
                  { id: 'elite', name: 'Elite', teacherMin: 31, teacherMax: 100, priceMonthly: 399, reportEnabled: true, attendanceEnabled: true, homeworkEnabled: true, lessonPlanningEnabled: true, exportFormats: ['pdf', 'docx', 'csv'] },
                ])
                  .filter((plan) => Number(plan.priceMonthly) > 0)
                  .sort((a, b) => Number(a.priceMonthly) - Number(b.priceMonthly));

                return rawPlans.map((plan, index) => {
                  const isPremium = plan.name.toLowerCase().includes('premium');
                  const isElite = plan.name.toLowerCase().includes('elite');
                  const baseAnnual = Math.round(Number(plan.priceMonthly) * 12 * 0.83);
                  const gstAnnual = Math.round(baseAnnual * 0.18);
                  const displayPrice = yearly ? baseAnnual : Number(plan.priceMonthly);
                  const periodicLabel = yearly ? ' / year' : ' /month';

                  const features = [
                    `0-${plan.teacherMax} Teachers`,
                    'Reports',
                    'Attendance',
                    'Homework',
                    'Lesson Planning',
                    `Exports: ${plan.exportFormats?.join(', ').toUpperCase() || 'PDF'}`,
                    'No watermark',
                  ];

                  const includedSet = new Set<string>([
                    'Reports',
                    'Lesson Planning',
                    'No watermark',
                  ]);

                  if (plan.attendanceEnabled) includedSet.add('Attendance');
                  if (plan.homeworkEnabled) includedSet.add('Homework');

                  return (
                    <div
                      key={plan.id || plan.name}
                      className={cn(
                        'relative flex min-h-[520px] flex-col rounded-[22px] border bg-white p-0 shadow-[0_20px_45px_rgba(15,23,42,0.08)] min-w-[300px] md:min-w-0',
                        isPremium && 'border-violet-500 ring-2 ring-violet-100',
                        isElite && 'border-amber-400 bg-amber-50/40',
                        !isPremium && !isElite && 'border-slate-200'
                      )}
                    >
                      {isPremium && (
                        <div className='absolute inset-x-6 -top-3 inline-flex justify-center'>
                          <span className='rounded-full bg-gradient-to-r from-violet-700 to-purple-700 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-md'>Most Popular</span>
                        </div>
                      )}

                      {isElite && (
                        <div className='absolute inset-x-6 -top-3 inline-flex justify-center'>
                          <span className='rounded-full bg-gradient-to-r from-amber-500 to-lime-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-900 shadow-md'>Luxury Tier</span>
                        </div>
                      )}

                      <div className={cn('rounded-t-[22px] px-5 pb-4 pt-7', isPremium ? 'bg-gradient-to-r from-violet-700 to-purple-700 text-white' : isElite ? 'bg-gradient-to-r from-amber-500 to-lime-500 text-slate-900' : 'bg-gradient-to-r from-slate-800 to-slate-900 text-white')}>
                        <div className='flex items-center justify-between'>
                          <h3 className='text-[1.75rem] font-bold tracking-[-0.04em]'>{plan.name}</h3>
                        </div>
                        <div className='mt-2 flex items-end gap-2'>
                          <span className='text-4xl font-black'>₹{displayPrice.toLocaleString('en-IN')}</span>
                          <span className={cn('pb-1 text-sm font-medium', isPremium ? 'text-violet-100' : isElite ? 'text-slate-800' : 'text-slate-200')}>{periodicLabel}</span>
                        </div>
                        <p className={cn('mt-2 text-sm', isPremium ? 'text-violet-100' : isElite ? 'text-slate-800' : 'text-slate-300')}>
                          {plan.name === 'Standard' ? 'Ideal for growing institutions' : plan.name === 'Premium' ? 'Ideal for growing institutions' : 'For large schools and districts'}
                        </p>
                      </div>

                      <div className='flex flex-1 flex-col px-5 pb-5 pt-5'>
                        <ul className='space-y-3'>
                          {features.map((feature) => {
                            const isPositive = feature === 'Reports' || feature === 'Lesson Planning' || feature === 'No watermark' || feature.startsWith('Exports:') || feature.startsWith('0-') || (isElite && (feature === 'Attendance' || feature === 'Homework')) || (isPremium && feature === 'Attendance') || (!isPremium && !isElite && feature === 'Reports');

                            return (
                              <li key={feature} className='flex items-center gap-3 text-sm text-slate-700'>
                                <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold', isPositive ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500')}>
                                  {isPositive ? '✓' : '✕'}
                                </span>
                                <span className={cn(isPositive ? 'text-slate-800' : 'text-slate-500')}>{feature}</span>
                              </li>
                            );
                          })}
                        </ul>

                        <div className='mt-auto pt-6'>
                          <Button
                            asChild
                            className={cn(
                              'h-12 w-full rounded-xl border-0 text-base font-semibold shadow-md',
                              isPremium ? 'bg-gradient-to-r from-violet-700 to-purple-700 text-white hover:brightness-110' : isElite ? 'bg-gradient-to-r from-amber-500 to-lime-500 text-slate-900 hover:brightness-105' : 'bg-slate-900 text-white hover:bg-slate-800'
                            )}
                          >
                            <Link href='/signup'>
                              {index === 0 ? 'Switch to Standard' : index === 1 ? 'Switch to Premium' : 'Switch to Elite'}
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </section>
      </main>

      <footer className='border-t border-slate-800 bg-slate-900 px-5 py-12 sm:px-8 lg:px-12 text-slate-400'>
        <div className='mx-auto max-w-7xl space-y-10'>
          <div className='grid grid-cols-2 gap-8 md:grid-cols-2 lg:grid-cols-4'>
            {/* Brand Section */}
            <div className='col-span-2 md:col-span-1 space-y-4'>
              <div className='flex items-center gap-2 sm:gap-3'>
                <Image
                  src='/logo-only.png'
                  alt='TimetablePro Icon'
                  width={40}
                  height={40}
                  className='h-7 sm:h-9 w-auto object-contain shrink-0 brightness-0 invert'
                />
                <Image
                  src='/logo-text.png'
                  alt='TimetablePro Text'
                  width={180}
                  height={48}
                  className='h-6 sm:h-9 w-auto object-contain shrink-0 brightness-0 invert'
                />
              </div>
              <p className='text-sm leading-relaxed text-slate-400 max-w-sm'>
                Smart school operations platform for modern educational institutions.
              </p>
              <div className='flex items-center gap-3 pt-1'>
                <a href='https://www.facebook.com/webncodetechnologies' target='_blank' rel='noopener noreferrer' className='flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-blue-600 hover:text-white transition-all duration-200'>
                  <Facebook className='h-4 w-4' />
                </a>
                <a href='https://www.instagram.com/webncodetechnologies' target='_blank' rel='noopener noreferrer' className='flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-pink-600 hover:text-white transition-all duration-200'>
                  <Instagram className='h-4 w-4' />
                </a>
                <a href='https://x.com/webncodetech' target='_blank' rel='noopener noreferrer' className='flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-sky-500 hover:text-white transition-all duration-200'>
                  <Twitter className='h-4 w-4' />
                </a>
                <a href='https://www.linkedin.com/company/webncodetechnologies' target='_blank' rel='noopener noreferrer' className='flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:bg-blue-700 hover:text-white transition-all duration-200'>
                  <Linkedin className='h-4 w-4' />
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div className='col-span-1 space-y-4'>
              <h3 className='font-semibold text-white text-base tracking-wide'>Product</h3>
              <ul className='space-y-2.5 text-sm text-slate-400'>
                <li><a href='#features' className='hover:text-white transition-colors'>Features</a></li>
                <li><a href='#pricing' className='hover:text-white transition-colors'>Pricing</a></li>
                <li><a href='#how-it-works' className='hover:text-white transition-colors'>How it works</a></li>
              </ul>
            </div>

            {/* Company Links */}
            <div className='col-span-1 space-y-4'>
              <h3 className='font-semibold text-white text-base tracking-wide'>Company</h3>
              <ul className='space-y-2.5 text-sm text-slate-400'>
                <li><a href='#' className='hover:text-white transition-colors'>About Us</a></li>
                <li><a href='#' className='hover:text-white transition-colors'>Contact</a></li>
                <li><a href='#' className='hover:text-white transition-colors'>Privacy Policy</a></li>
                <li><a href='#' className='hover:text-white transition-colors'>Terms of Service</a></li>
              </ul>
            </div>

            {/* Contact Information */}
            <div className='col-span-2 md:col-span-1 space-y-4'>
              <h3 className='font-semibold text-white text-base tracking-wide'>Contact</h3>
              <ul className='space-y-3 text-sm text-slate-400'>
                <li className='flex items-center gap-2.5'>
                  <svg className='h-4 w-4 text-blue-400 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' />
                  </svg>
                  <a href='mailto:timetablepro@webncode.in' className='hover:text-white transition-colors truncate'>timetablepro@webncode.in</a>
                </li>
                <li className='flex items-center gap-2.5'>
                  <svg className='h-4 w-4 text-emerald-400 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
                  </svg>
                  <a href='tel:+918947919195' className='hover:text-white transition-colors'>+91 8947919195</a>
                </li>
                <li className='flex items-center gap-2.5'>
                  <svg className='h-4 w-4 text-violet-400 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' />
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 11a3 3 0 11-6 0 3 3 0 016 0z' />
                  </svg>
                  <span className='hover:text-white transition-colors'>Jaipur, Rajasthan</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright Divider */}
          <div className='border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500'>
            <p>© {new Date().getFullYear()} TimetablePro. All rights reserved.</p>
            <p className='text-slate-600'>Empowering schools across India</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
