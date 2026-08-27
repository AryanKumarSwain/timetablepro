'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles, Shield, GraduationCap, CheckCircle2, CalendarRange, School, Users, BarChart3, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ForgotPasswordModal } from '@/components/auth/forgot-password-modal';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' fill='currentColor'>
      <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' fill='#4285F4' />
      <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' fill='#34A853' />
      <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z' fill='#FBBC05' />
      <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' fill='#EA4335' />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('admin');
  const [mounted, setMounted] = useState(false);

  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);

    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error === 'AccountNotFound') {
      setError('No account found. Please sign up first.');
    } else if (error === 'account_exists') {
      setError('An account with this email already exists. Please sign in using your original password or account method.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const redirectTo = await auth.login(email, password, tab);
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError('');
    const destination = tab === 'admin' ? '/admin/dashboard' : '/dashboard';
    window.location.href = `/api/auth/google?callbackUrl=${encodeURIComponent(destination)}`;
  };

  return (
    <div
      className='relative min-h-screen overflow-hidden bg-slate-200'
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.7), rgba(255,255,255,0.72)), url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className='absolute inset-0 bg-white/10 backdrop-blur-[1px]' />

      <div className='relative z-10 flex min-h-screen items-center justify-center px-4 py-6 lg:px-8 xl:px-12'>
        <div className='flex w-full max-w-[1320px] items-center gap-8 lg:gap-10'>
          <div className='hidden flex-1 max-w-[720px] flex-col justify-between lg:flex'>
            <div className='mb-9 inline-flex items-center gap-3 rounded-full border border-white/40 bg-white/25 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm backdrop-blur-sm'>
              <span className='flex h-6 w-6 items-center justify-center rounded-full border border-indigo-200 bg-white/40 text-indigo-600'>
                <Sparkles className='h-3.5 w-3.5' />
              </span>
              Next-Gen School Platform
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className='space-y-8 pb-10'
            >
              <h1 className='max-w-[620px] text-[4.2rem] font-black leading-[0.9] tracking-[-0.05em] text-slate-900'>
                Grow Your
                <span className='block text-blue-600'>Time Table</span>
              </h1>

              <h2 className='text-[2.5rem] font-semibold tracking-[-0.04em] text-slate-800'>
                School Scheduling System
              </h2>

              <p className='max-w-[620px] text-[1.05rem] leading-8 text-slate-700'>
                Plan classes, manage teachers, track attendance, and organize every school day from one smart time table platform.
              </p>

              <div className='grid max-w-[620px] grid-cols-2 gap-4'>
                <div className='rounded-2xl border border-white/60 bg-white/75 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
                  <div className='mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md'>
                    <CalendarRange className='h-5 w-5' />
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700'>
                      <School className='h-4 w-4' />
                    </div>
                    <h3 className='text-xl font-semibold text-slate-800'>Class Planner</h3>
                  </div>
                  <p className='mt-3 text-sm leading-6 text-slate-600'>Build weekly schedules with room, teacher, and class allocations.</p>
                </div>

                <div className='rounded-2xl border border-white/60 bg-white/75 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
                  <div className='mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-md'>
                    <CheckCircle2 className='h-5 w-5' />
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'>
                      <Users className='h-4 w-4' />
                    </div>
                    <h3 className='text-xl font-semibold text-slate-800'>Teacher Load</h3>
                  </div>
                  <p className='mt-3 text-sm leading-6 text-slate-600'>Balance classroom coverage and staffing across multiple periods.</p>
                </div>

                <div className='rounded-2xl border border-white/60 bg-white/75 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
                  <div className='mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md'>
                    <CheckCircle2 className='h-5 w-5' />
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700'>
                      <Shield className='h-4 w-4' />
                    </div>
                    <h3 className='text-xl font-semibold text-slate-800'>Attendance</h3>
                  </div>
                  <p className='mt-3 text-sm leading-6 text-slate-600'>Track daily attendance with reporting and real-time insights.</p>
                </div>

                <div className='rounded-2xl border border-white/60 bg-white/75 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm'>
                  <div className='mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md'>
                    <CheckCircle2 className='h-5 w-5' />
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-700'>
                      <BarChart3 className='h-4 w-4' />
                    </div>
                    <h3 className='text-xl font-semibold text-slate-800'>Reports</h3>
                  </div>
                  <p className='mt-3 text-sm leading-6 text-slate-600'>Monitor attendance, class utilization, and academic performance.</p>
                </div>
              </div>
            </motion.div>

            <p className='text-sm text-slate-600'>© 2026 TimetablePro. All rights reserved.</p>
          </div>

          <div className='flex w-full max-w-[430px] justify-center'>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className='w-full rounded-[26px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-md md:p-6 lg:p-7'
            >
              <Link href='/' className='mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors'>
                <ArrowLeft className='h-4 w-4' />
                Back to home
              </Link>

              <div className='lg:hidden mb-6 flex items-center gap-2 font-semibold text-slate-800'>
                <div className='flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white'>
                  <Sparkles className='h-4 w-4' />
                </div>
                TimetablePro
              </div>

              <div className='mb-4 flex items-center justify-center'>
                <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md'>
                  <GraduationCap className='h-5 w-5' />
                </div>
              </div>

              <div className='text-center'>
                <h2 className='text-[2.15rem] font-bold tracking-[-0.03em] text-slate-900'>Welcome back</h2>
                <p className='mt-1 text-sm text-slate-500'>Sign in to your workspace</p>
              </div>

              <Tabs value={tab} onValueChange={setTab} className='mt-6'>
                <TabsList className='grid w-full grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1'>
                  <TabsTrigger value='admin' className='rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm'>
                    Admin Login
                  </TabsTrigger>
                  <TabsTrigger value='teacher' className='rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm'>
                    Teacher Login
                  </TabsTrigger>
                </TabsList>
                <TabsContent value='admin' className='mt-0' />
                <TabsContent value='teacher' className='mt-0' />
              </Tabs>

              {!mounted ? (
                <div className='mt-6 space-y-4' aria-hidden>
                  <div className='h-12 rounded-xl bg-slate-100 animate-pulse' />
                  <div className='h-12 rounded-xl bg-slate-100 animate-pulse' />
                  <div className='h-12 rounded-xl bg-slate-100 animate-pulse' />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className='mt-6 space-y-4' suppressHydrationWarning>
                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>Email</label>
                    <Input
                      type='email'
                      autoComplete='email'
                      className='h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      required
                      placeholder='admin@mail.com'
                    />
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>Password</label>
                    <div className='relative'>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete='current-password'
                        className='h-12 rounded-xl border-slate-200 bg-slate-50 pr-11 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        placeholder='••••••••'
                      />
                      <button
                        type='button'
                        className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600'
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                      </button>
                    </div>
                  </div>

                  <div className='flex justify-end'>
                    <button
                      type='button'
                      onClick={() => setForgotPasswordOpen(true)}
                      className='text-xs font-medium text-blue-600 transition-colors hover:text-blue-700'
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className='rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600'
                    >
                      {error}
                    </motion.p>
                  )}

                  <Button
                    type='submit'
                    disabled={loading}
                    className={cn(
                      'h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-base font-semibold text-white shadow-lg shadow-blue-600/20 hover:brightness-105',
                      loading && 'opacity-80'
                    )}
                  >
                    {loading ? (
                      <span className='flex items-center gap-2'>
                        <span className='h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin' />
                        Signing in…
                      </span>
                    ) : (
                      'Sign In'
                    )}
                  </Button>

                  {tab === 'admin' && (
                    <>
                      <div className='relative my-1 flex items-center'>
                        <div className='h-px flex-1 bg-slate-200' />
                        <span className='mx-4 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400'>or</span>
                        <div className='h-px flex-1 bg-slate-200' />
                      </div>

                      <Button
                        type='button'
                        variant='outline'
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className='h-12 w-full rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50'
                      >
                        <GoogleIcon className='mr-2 h-5 w-5' />
                        Continue with Google
                      </Button>
                    </>
                  )}
                </form>
              )}

              <p className='mt-6 text-center text-sm text-slate-500'>
                Don&apos;t have an account?{' '}
                <Link href='/signup' className='font-semibold text-blue-600 transition-colors hover:text-blue-700'>
                  Create an account
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal isOpen={forgotPasswordOpen} onClose={() => setForgotPasswordOpen(false)} />
    </div>
  );
}
