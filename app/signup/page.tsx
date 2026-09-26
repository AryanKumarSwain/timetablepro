'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Shield, GraduationCap, CheckCircle2, CalendarRange, School, Users, BarChart3, ArrowLeft, Eye, EyeOff, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  COUNTRIES,
  COUNTRY_CODES,
  FACULTY_RANGES,
  INSTITUTE_TYPES,
  STUDENT_RANGES,
} from '@/lib/signup-constants';

type Step = 1 | 2 | 3 | 4;
type FieldErrors = Record<string, string>;

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

function RequiredMark() {
  return <span className='ml-0.5 text-rose-500'>*</span>;
}

function StepShell({
  step,
  currentStep,
  title,
  subtitle,
  children,
  onBack,
  onCancel,
}: {
  step: Step;
  currentStep: Step;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onCancel?: () => void;
}) {
  const isActive = step === currentStep;

  if (!isActive) return null;

  return (
    <div className='relative w-full'>
      {onBack && (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='absolute -top-2 left-0 h-8 w-8 rounded-lg text-slate-500 hover:text-slate-700'
          onClick={onBack}
        >
          ←
        </Button>
      )}
      <div className={cn('mb-6', onBack && 'pt-8')}>
        <div className='flex items-center justify-between gap-3'>
          <h1 className='text-2xl font-bold text-slate-900'>{title}</h1>
          {onCancel && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={onCancel}
              className='h-8 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg px-2.5 transition-colors'
            >
              Cancel Signup
            </Button>
          )}
        </div>
        {subtitle && <p className='mt-1 text-sm text-slate-500'>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [googleEmail, setGoogleEmail] = useState('');
  const [googleFullName, setGoogleFullName] = useState('');
  const [googlePhone, setGooglePhone] = useState('');
  const [googleCountryCode, setGoogleCountryCode] = useState('+91');

  const [instituteName, setInstituteName] = useState('');
  const [instituteType, setInstituteType] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');
  const [studentsRange, setStudentsRange] = useState('');
  const [facultyRange, setFacultyRange] = useState('');

  const [hasActiveAccount, setHasActiveAccount] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelSignup = async () => {
    try {
      setCancelling(true);
      await fetch('/api/auth/signup/cancel', {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/signup';
    } catch (err) {
      console.error('Cancel signup error:', err);
      window.location.href = '/signup';
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    async function resolveSessionStep() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (!res.ok) {
          setCheckingSession(false);
          return;
        }

        const data = await res.json();
        const user = data.user;
        if (!user) {
          setCheckingSession(false);
          return;
        }

        if (user.onboardingDone) {
          router.replace('/admin/dashboard');
          return;
        }

        setHasActiveAccount(true);
        if (user.name) setFullName(user.name);
        if (user.email) setEmail(user.email);
        if (user.phone) setPhone(user.phone);
        if (user.countryCode) setCountryCode(user.countryCode);

        setGoogleEmail(user.email);
        setGoogleFullName(user.name || '');
        setGooglePhone(user.phone || '');
        if (user.countryCode) setGoogleCountryCode(user.countryCode);

        if (!user.phone || user.phone === null) {
          setStep(3);
        } else {
          setStep(4);
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setCheckingSession(false);
      }
    }

    resolveSessionStep();
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) {
      setFormError('Google sign-in failed. Please try again.');
      window.history.replaceState({}, '', '/signup');
    }
  }, []);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setFormError('');
    setFieldErrors({});

    const clientErrors: FieldErrors = {};
    if (!hasActiveAccount) {
      if (!password) {
        clientErrors.password = 'Password is required';
      } else if (password.length < 6) {
        clientErrors.password = 'Password must be at least 6 characters';
      }

      if (!confirmPassword) {
        clientErrors.confirmPassword = 'Confirm your password';
      } else if (password && confirmPassword && password !== confirmPassword) {
        clientErrors.confirmPassword = 'Passwords do not match';
      }
    } else {
      if (password) {
        if (password.length < 6) {
          clientErrors.password = 'Password must be at least 6 characters';
        }
        if (confirmPassword && password !== confirmPassword) {
          clientErrors.confirmPassword = 'Passwords do not match';
        }
      }
    }

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName,
          email,
          phone,
          countryCode,
          password: password || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.errors) {
          setFieldErrors(data.errors);
        } else {
          setFormError(data.error || 'Unable to create account');
        }
        return;
      }

      if (data.alreadyVerified) {
        setHasActiveAccount(true);
        setStep(4);
        return;
      }

      setPendingEmail(data.email || email);
      setOtpSent(true);
      setStep(2);
    } catch {
      setFormError('Unable to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = '/api/auth/google?callbackUrl=/signup';
  };

  const handleCompleteGoogleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');
    setFieldErrors({});

    try {
      const res = await fetch('/api/auth/signup/complete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: googleFullName,
          phone: googlePhone,
          countryCode: googleCountryCode,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.errors) {
          setFieldErrors(data.errors);
        } else {
          setFormError(data.error || 'Failed to update profile');
        }
        return;
      }

      setHasActiveAccount(true);
      setStep(4);
    } catch {
      setFormError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');
    setFieldErrors({});

    try {
      const res = await fetch('/api/auth/signup/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          instituteName,
          instituteType,
          state,
          city,
          country,
          studentsRange,
          facultyRange,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.errors) {
          setFieldErrors(data.errors);
        } else {
          setFormError(data.error || 'Failed to complete setup');
        }
        return;
      }

      router.push('/admin/dashboard');
    } catch {
      setFormError('Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-slate-950'>
        <p className='animate-pulse tracking-wide text-white/50'>Loading Setup…</p>
      </div>
    );
  }

  return (
    <div
      className='relative min-h-screen overflow-hidden bg-slate-200'
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.72), rgba(255,255,255,0.74)), url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80')",
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

              <div className='mb-5 flex items-center justify-center'>
                <img src="/logo-only.png" alt="TimetablePro Logo" className="h-14 w-auto object-contain" />
              </div>

              <div className='text-center'>
                <h2 className='text-[2.15rem] font-bold tracking-[-0.03em] text-slate-900'>Create Account</h2>
                <p className='mt-2 text-sm text-slate-500'>Start your 30-day free trial</p>
              </div>

              {step === 1 && (
                <form onSubmit={handleEmailSignup} className='mt-6 space-y-4' suppressHydrationWarning>
                  {hasActiveAccount && (
                    <div className='flex items-center justify-between pb-1'>
                      <button
                        type='button'
                        onClick={() => setStep(4)}
                        className='inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors'
                      >
                        ← Continue to Institute Setup (Step 4)
                      </button>
                    </div>
                  )}

                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>Full Name</label>
                    <Input
                      className='h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500'
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      disabled={loading}
                      placeholder='John Smith'
                    />
                    {fieldErrors.fullName && <p className='mt-1 text-xs text-rose-500'>{fieldErrors.fullName}</p>}
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>Email</label>
                    <Input
                      type='email'
                      className='h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading || hasActiveAccount}
                      placeholder='you@example.com'
                    />
                    {fieldErrors.email && <p className='mt-1 text-xs text-rose-500'>{fieldErrors.email}</p>}
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>
                      Password {hasActiveAccount && <span className='text-xs font-normal text-slate-400'>(Leave blank to keep existing)</span>}
                    </label>
                    <div className='relative'>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        minLength={6}
                        className='h-12 rounded-xl border-slate-200 bg-slate-50 pr-11 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500'
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (fieldErrors.password) {
                            setFieldErrors((prev) => {
                              const copy = { ...prev };
                              delete copy.password;
                              return copy;
                            });
                          }
                        }}
                        required={!hasActiveAccount}
                        disabled={loading}
                        placeholder={hasActiveAccount ? '•••••••• (unchanged)' : '••••••••'}
                      />
                      <button
                        type='button'
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none'
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                      </button>
                    </div>
                    {fieldErrors.password && <p className='mt-1 text-xs text-rose-500'>{fieldErrors.password}</p>}
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>
                      Confirm Password {hasActiveAccount && <span className='text-xs font-normal text-slate-400'>(Optional)</span>}
                    </label>
                    <div className='relative'>
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        minLength={6}
                        className='h-12 rounded-xl border-slate-200 bg-slate-50 pr-11 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500'
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (fieldErrors.confirmPassword) {
                            setFieldErrors((prev) => {
                              const copy = { ...prev };
                              delete copy.confirmPassword;
                              return copy;
                            });
                          }
                        }}
                        required={!hasActiveAccount && !!password}
                        disabled={loading}
                        placeholder={hasActiveAccount ? '••••••••' : '••••••••'}
                      />
                      <button
                        type='button'
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none'
                        onClick={() => setShowConfirmPassword((v) => !v)}
                      >
                        {showConfirmPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && <p className='mt-1 text-xs text-rose-500'>{fieldErrors.confirmPassword}</p>}
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>Phone</label>
                    <div className='flex gap-2'>
                      <Select value={countryCode} onValueChange={setCountryCode} disabled={loading}>
                        <SelectTrigger className='h-12 w-[92px] rounded-xl border-slate-200 bg-slate-50 text-slate-700'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_CODES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type='tel'
                        className='h-12 flex-1 rounded-xl border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500'
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        disabled={loading}
                        placeholder='9876543210'
                      />
                    </div>
                    {fieldErrors.phone && <p className='mt-1 text-xs text-rose-500'>{fieldErrors.phone}</p>}
                  </div>

                  {formError && (
                    <p className='rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600'>
                      {formError}
                    </p>
                  )}

                  {fieldErrors._form && (
                    <p className='rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600'>
                      {fieldErrors._form}
                    </p>
                  )}

                  <Button
                    type='submit'
                    disabled={loading}
                    className={cn(
                      'h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-base font-semibold text-white shadow-lg shadow-blue-600/20 hover:brightness-105',
                      loading && 'opacity-80'
                    )}
                  >
                    {loading
                      ? (hasActiveAccount ? 'Saving…' : 'Creating account…')
                      : (hasActiveAccount ? 'Save & Continue to Institute Setup' : 'Sign Up & Get Started')}
                  </Button>

                  {!hasActiveAccount && (
                    <>
                      <div className='relative my-2 flex items-center'>
                        <div className='h-px flex-1 bg-slate-200' />
                        <span className='mx-4 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400'>or</span>
                        <div className='h-px flex-1 bg-slate-200' />
                      </div>

                      <Button
                        type='button'
                        variant='outline'
                        onClick={handleGoogleSignup}
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

              <StepShell
                step={2}
                currentStep={step}
                title='Verify your email'
                subtitle={`We sent a 6-digit code to ${pendingEmail || email}`}
                onBack={() => setStep(1)}
              >
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setLoading(true);
                  setFormError('');

                  try {
                    const res = await fetch('/api/auth/verify-email', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ email: pendingEmail || email, otp }),
                    });

                    const data = await res.json();

                    if (!res.ok || !data.success) {
                      setFormError(data.error || 'Invalid OTP');
                      return;
                    }

                    setHasActiveAccount(true);
                    setStep(4);
                  } catch {
                    setFormError('Verification failed');
                  } finally {
                    setLoading(false);
                  }
                }} className='space-y-4'>
                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>Verification Code</label>
                    <Input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      placeholder='Enter 6-digit OTP'
                      className='h-12 rounded-xl border-slate-200 bg-slate-50 text-center text-lg tracking-[0.3em] text-slate-900 focus-visible:ring-blue-500'
                    />
                  </div>

                  <div className='p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs flex items-center gap-2'>
                    <span>📬 <strong>Note:</strong> If the code is not visible in your inbox, please check your <strong>Spam or Junk folder</strong>.</span>
                  </div>

                  {formError && (
                    <p
                      className={cn(
                        'rounded-xl border px-3 py-2 text-sm',
                        formError === 'OTP resent successfully'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-rose-200 bg-rose-50 text-rose-600'
                      )}
                    >
                      {formError}
                    </p>
                  )}

                  <Button
                    type='submit'
                    disabled={loading || otp.length !== 6}
                    className='h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-base font-semibold text-white shadow-lg shadow-blue-600/20 hover:brightness-105'
                  >
                    {loading ? 'Verifying...' : 'Verify Email'}
                  </Button>

                  <Button
                    type='button'
                    variant='outline'
                    className='h-12 w-full rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50'
                    onClick={async () => {
                      try {
                        await fetch('/api/auth/signup', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ fullName, email, phone, countryCode, password }),
                        });
                        setFormError('OTP resent successfully');
                      } catch {
                        setFormError('Failed to resend OTP');
                      }
                    }}
                  >
                    Resend OTP
                  </Button>
                </form>
              </StepShell>

              <StepShell
                step={3}
                currentStep={step}
                title='Complete Registration'
                onBack={() => setStep(1)}
              >
                <div className='mb-6 flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <div className='flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-bold text-white shadow-lg'>
                    {googleEmail ? googleEmail.charAt(0).toUpperCase() : 'G'}
                  </div>
                  <p className='mt-3 text-sm font-semibold text-slate-800'>{googleEmail || 'Google Account'}</p>
                  <p className='mt-1 text-xs text-slate-500'>Authorized account profile</p>
                </div>

                <form onSubmit={handleCompleteGoogleProfile} className='space-y-4'>
                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>Full Name</label>
                    <Input
                      className='h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-900 focus-visible:ring-blue-500'
                      value={googleFullName}
                      onChange={(e) => setGoogleFullName(e.target.value)}
                      required
                      disabled={loading}
                    />
                    {fieldErrors.fullName && <p className='mt-1 text-xs text-rose-500'>{fieldErrors.fullName}</p>}
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>Phone Number</label>
                    <div className='flex gap-2'>
                      <Select value={googleCountryCode} onValueChange={setGoogleCountryCode} disabled={loading}>
                        <SelectTrigger className='h-12 w-[110px] rounded-xl border-slate-200 bg-slate-50 text-slate-700'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_CODES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type='tel'
                        className='h-12 flex-1 rounded-xl border-slate-200 bg-slate-50 text-slate-900 focus-visible:ring-blue-500'
                        value={googlePhone}
                        onChange={(e) => setGooglePhone(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    {fieldErrors.phone && <p className='mt-1 text-xs text-rose-500'>{fieldErrors.phone}</p>}
                  </div>

                  {formError && (
                    <p className='rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600'>
                      {formError}
                    </p>
                  )}

                  <Button
                    type='submit'
                    disabled={loading}
                    className='h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-base font-semibold text-white shadow-lg shadow-blue-600/20 hover:brightness-105'
                  >
                    {loading ? 'Saving Profile…' : 'Complete Setup'}
                  </Button>
                </form>
              </StepShell>

              <StepShell
                step={4}
                currentStep={step}
                title='One last step!'
                subtitle='Tell us about your institute to personalize your experience'
                onBack={() => {
                  if (googleEmail && (!phone || !fullName)) {
                    setStep(3);
                  } else {
                    setStep(1);
                  }
                }}
                onCancel={() => setCancelDialogOpen(true)}
              >
                <form onSubmit={handleOnboarding} className='space-y-4'>
                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>
                      Institute Name <RequiredMark />
                    </label>
                    <Input
                      placeholder='e.g., Springfield High School'
                      className='h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-900 focus-visible:ring-blue-500'
                      value={instituteName}
                      onChange={(e) => setInstituteName(e.target.value)}
                      required
                      disabled={loading}
                    />
                    {fieldErrors.instituteName && <p className='mt-1 text-xs text-rose-500'>{fieldErrors.instituteName}</p>}
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>
                      Institute Type <RequiredMark />
                    </label>
                    <Select value={instituteType} onValueChange={setInstituteType} disabled={loading}>
                      <SelectTrigger className='h-12 w-full rounded-xl border-slate-200 bg-slate-50 text-slate-700'>
                        <SelectValue placeholder='Select institute type' />
                      </SelectTrigger>
                      <SelectContent>
                        {INSTITUTE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.instituteType && <p className='mt-1 text-xs text-rose-500'>{fieldErrors.instituteType}</p>}
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>
                      State <RequiredMark />
                    </label>
                    <Input
                      className='h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-900 focus-visible:ring-blue-500'
                      placeholder='Enter state'
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                      disabled={loading}
                    />
                    {fieldErrors.state && <p className='mt-1 text-xs text-rose-500'>{fieldErrors.state}</p>}
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>
                      City <RequiredMark />
                    </label>
                    <Input
                      className='h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-900 focus-visible:ring-blue-500'
                      placeholder='Enter city'
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      disabled={loading}
                    />
                    {fieldErrors.city && <p className='mt-1 text-xs text-rose-500'>{fieldErrors.city}</p>}
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>
                      Country <RequiredMark />
                    </label>
                    <Select value={country} onValueChange={setCountry} disabled={loading}>
                      <SelectTrigger className='h-12 w-full rounded-xl border-slate-200 bg-slate-50 text-slate-700'>
                        <SelectValue placeholder='Select country' />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.country && <p className='mt-1 text-xs text-rose-500'>{fieldErrors.country}</p>}
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>
                      No. of Students <RequiredMark />
                    </label>
                    <Select value={studentsRange} onValueChange={setStudentsRange} disabled={loading}>
                      <SelectTrigger className='h-12 w-full rounded-xl border-slate-200 bg-slate-50 text-slate-700'>
                        <SelectValue placeholder='Select student count' />
                      </SelectTrigger>
                      <SelectContent>
                        {STUDENT_RANGES.map((range) => (
                          <SelectItem key={range} value={range}>
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.studentsRange && <p className='mt-1 text-xs text-rose-500'>{fieldErrors.studentsRange}</p>}
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-slate-700'>
                      No. of Faculty <RequiredMark />
                    </label>
                    <Select value={facultyRange} onValueChange={setFacultyRange} disabled={loading}>
                      <SelectTrigger className='h-12 w-full rounded-xl border-slate-200 bg-slate-50 text-slate-700'>
                        <SelectValue placeholder='Select faculty size' />
                      </SelectTrigger>
                      <SelectContent>
                        {FACULTY_RANGES.map((range) => (
                          <SelectItem key={range} value={range}>
                            {range}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors.facultyRange && <p className='mt-1 text-xs text-rose-500'>{fieldErrors.facultyRange}</p>}
                  </div>

                  {formError && (
                    <p className='rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600'>
                      {formError}
                    </p>
                  )}

                  <div className='space-y-2.5 pt-2'>
                    <Button
                      type='submit'
                      disabled={loading || cancelling}
                      className='h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-base font-semibold text-white shadow-lg shadow-blue-600/20 hover:brightness-105'
                    >
                      {loading ? 'Completing setup…' : 'Complete Setup'}
                    </Button>

                    <Button
                      type='button'
                      variant='outline'
                      disabled={loading || cancelling}
                      onClick={() => setCancelDialogOpen(true)}
                      className='h-11 w-full rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 text-sm font-medium transition-colors'
                    >
                      <XCircle className='mr-1.5 h-4 w-4' />
                      Cancel Signup
                    </Button>
                  </div>
                </form>
              </StepShell>

              <p className='mt-6 text-center text-sm text-slate-500'>
                Already have an account?{' '}
                <Link href='/login' className='font-semibold text-blue-600 transition-colors hover:text-blue-700'>
                  Log In
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className='rounded-2xl max-w-md bg-white border border-slate-200 p-6'>
          <AlertDialogHeader>
            <div className='flex items-center gap-3 mb-1'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600'>
                <AlertTriangle className='h-5 w-5' />
              </div>
              <AlertDialogTitle className='text-lg font-bold text-slate-900'>
                Cancel Signup?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className='text-sm text-slate-600 leading-relaxed pt-1'>
              Are you sure you want to cancel registration? Your progress will be discarded and your session will be cleared so you can sign up again anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='mt-4 flex gap-2 sm:justify-end'>
            <AlertDialogCancel
              disabled={cancelling}
              className='rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100'
            >
              Keep Signing Up
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault();
                handleCancelSignup();
              }}
              className='rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-600/20'
            >
              {cancelling ? 'Cancelling...' : 'Yes, Cancel Signup'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
