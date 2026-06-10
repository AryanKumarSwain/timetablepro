'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Shield, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GlassCard } from '@/components/enterprise/glass-card';
import { cn } from '@/lib/utils';
import {
  COUNTRIES,
  COUNTRY_CODES,
  FACULTY_RANGES,
  INSTITUTE_TYPES,
  STUDENT_RANGES,
} from '@/lib/signup-constants';

type Step = 1 | 2 | 3;
type FieldErrors = Record<string, string>;

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox='0 0 24 24' fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function RequiredMark() {
  return <span className='text-rose-500 ml-0.5'>*</span>;
}

function StepShell({
  step,
  currentStep,
  title,
  subtitle,
  children,
}: {
  step: Step;
  currentStep: Step;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const isActive = step === currentStep;

  if (!isActive) return null;

  return (
    <div className='relative w-full'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold'>{title}</h1>
        {subtitle && (
          <p className='text-sm text-muted-foreground mt-1'>{subtitle}</p>
        )}
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

  // Step 1
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [password, setPassword] = useState('');

  // Step 2 (Google OAuth completion)
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleFullName, setGoogleFullName] = useState('');
  const [googlePhone, setGooglePhone] = useState('');
  const [googleCountryCode, setGoogleCountryCode] = useState('+91');

  // Step 3
  const [instituteName, setInstituteName] = useState('');
  const [instituteType, setInstituteType] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');
  const [studentsRange, setStudentsRange] = useState('');
  const [facultyRange, setFacultyRange] = useState('');

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

        setGoogleEmail(user.email);
        setGoogleFullName(user.name || '');

        if (!user.phone) {
          setStep(2);
        } else {
          setStep(3);
        }
      } catch {
        // stay on step 1
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
    setLoading(true);
    setFormError('');
    setFieldErrors({});

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ fullName, email, phone, countryCode, password }),
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

      setStep(3);
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

      setStep(3);
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
      <div className='min-h-screen bg-slate-950 flex items-center justify-center'>
        <p className='text-white/50 animate-pulse tracking-wide'>Loading Setup…</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen grid lg:grid-cols-2'>
      {/* Brand Sidebar Display - Left Column */}
      <div className='hidden lg:flex flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 text-white'>
        <div className='absolute inset-0 mesh-gradient opacity-50' />
        <div className='relative flex items-center gap-2 font-semibold text-lg'>
          <div className='h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur'>
            <Sparkles className='h-5 w-5' />
          </div>
          TimetablePro
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className='relative space-y-6'
        >
          <h2 className='text-4xl font-bold leading-tight'>
            Create your institutional control center
          </h2>
          <p className='text-white/70 max-w-md'>
            Unify custom academic streams, track real-time faculty substitutions, and build fully automated schedules.
          </p>
          <div className='flex gap-4'>
            <GlassCard className='p-4 flex-1 bg-white/5 border-white/10'>
              <Shield className='h-5 w-5 text-indigo-300 mb-2' />
              <p className='text-sm font-medium'>Multi-tenant secure</p>
            </GlassCard>
            <GlassCard className='p-4 flex-1 bg-white/5 border-white/10'>
              <GraduationCap className='h-5 w-5 text-violet-300 mb-2' />
              <p className='text-sm font-medium'>Role-based access</p>
            </GlassCard>
          </div>
        </motion.div>

        <p className='relative text-xs text-white/40'>
          © TimetablePro · Trusted by schools worldwide
        </p>
      </div>

      {/* Interactive Signup Canvas - Right Column */}
      <div className='flex items-center justify-center p-6 md:p-10 mesh-gradient'>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className='w-full max-w-md'
        >
          {/* Mobile Navigation Header */}
          <div className='lg:hidden flex items-center gap-2 mb-8 font-semibold'>
            <div className='h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center'>
              <Sparkles className='h-4 w-4 text-white' />
            </div>
            TimetablePro
          </div>

          <GlassCard className='p-8'>
            {/* Step 1: Base Registration */}
            <StepShell
              step={1}
              currentStep={step}
              title='Welcome'
              subtitle='Sign up to create your operational workspace'
            >
              <form onSubmit={handleEmailSignup} className='mt-6 space-y-4' suppressHydrationWarning>
                <div>
                  <label className='text-sm font-medium'>Full Name</label>
                  <Input
                    className='mt-1.5 rounded-xl'
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                    suppressHydrationWarning
                  />
                  {fieldErrors.fullName && (
                    <p className='text-xs text-rose-500 mt-1'>{fieldErrors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className='text-sm font-medium'>Work Email Address</label>
                  <Input
                    type='email'
                    className='mt-1.5 rounded-xl'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    suppressHydrationWarning
                  />
                  {fieldErrors.email && (
                    <p className='text-xs text-rose-500 mt-1'>{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className='text-sm font-medium'>Phone Number</label>
                  <div className='mt-1.5 flex gap-2' suppressHydrationWarning>
                    <Select value={countryCode} onValueChange={setCountryCode} disabled={loading}>
                      <SelectTrigger className='w-[110px] rounded-xl'>
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
                      className='flex-1 rounded-xl'
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className='text-xs text-rose-500 mt-1'>{fieldErrors.phone}</p>
                  )}
                </div>

                <div>
                  <label className='text-sm font-medium'>Secure Password</label>
                  <Input
                    type='password'
                    minLength={6}
                    className='mt-1.5 rounded-xl'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    suppressHydrationWarning
                  />
                  {fieldErrors.password && (
                    <p className='text-xs text-rose-500 mt-1'>{fieldErrors.password}</p>
                  )}
                </div>

                {formError && (
                  <p className='text-sm text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2'>
                    {formError}
                  </p>
                )}
                {fieldErrors._form && (
                  <p className='text-sm text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2'>
                    {fieldErrors._form}
                  </p>
                )}

                <div className='space-y-3 pt-2'>
                  <Button
                    type='submit'
                    disabled={loading}
                    className={cn(
                      'w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white',
                      loading && 'opacity-80'
                    )}
                    suppressHydrationWarning
                  >
                    {loading ? 'Creating account…' : 'Create Account'}
                  </Button>

                  <div className="relative flex py-2 items-center text-xs text-muted-foreground">
                    <div className="flex-grow border-t border-border/60"></div>
                    <span className="flex-shrink mx-4 uppercase tracking-wider">or</span>
                    <div className="flex-grow border-t border-border/60"></div>
                  </div>

                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleGoogleSignup}
                    disabled={loading}
                    className='w-full h-11 rounded-xl bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors'
                  >
                    <GoogleIcon className='h-5 w-5 mr-2' />
                    Continue with Google
                  </Button>
                </div>
              </form>

              <p className='text-center text-sm text-muted-foreground mt-6'>
                Already have an account?{' '}
                <Link
                  href='/login'
                  className='text-indigo-500 hover:text-indigo-600 font-medium transition-colors'
                >
                  Sign in
                </Link>
              </p>

              <p className='text-[11px] text-center text-muted-foreground mt-6 leading-relaxed'>
                By signing up, you agree to our{' '}
                <Link href='#' className='underline hover:text-foreground transition-colors'>
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href='#' className='underline hover:text-foreground transition-colors'>
                  Privacy Policy
                </Link>
              </p>
            </StepShell>

            {/* Step 2: Google Profile Setup Fallback Completion */}
            <StepShell step={2} currentStep={step} title='Complete Registration'>
              <div className='flex flex-col items-center mt-6 mb-6 bg-muted/30 border border-border/40 p-4 rounded-xl'>
                <div className='h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-lg'>
                  {googleEmail ? googleEmail.charAt(0).toUpperCase() : 'G'}
                </div>
                <p className='mt-3 text-sm font-semibold tracking-tight'>{googleEmail}</p>
                <p className='text-xs text-muted-foreground mt-0.5'>Authorized Account Profile</p>
              </div>

              <form onSubmit={handleCompleteGoogleProfile} className='space-y-4' suppressHydrationWarning>
                <div>
                  <label className='text-sm font-medium'>Full Name</label>
                  <Input
                    className='mt-1.5 rounded-xl'
                    value={googleFullName}
                    onChange={(e) => setGoogleFullName(e.target.value)}
                    required
                    disabled={loading}
                    suppressHydrationWarning
                  />
                  {fieldErrors.fullName && (
                    <p className='text-xs text-rose-500 mt-1'>{fieldErrors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className='text-sm font-medium'>Phone Number</label>
                  <div className='mt-1.5 flex gap-2' suppressHydrationWarning>
                    <Select
                      value={googleCountryCode}
                      onValueChange={setGoogleCountryCode}
                      disabled={loading}
                    >
                      <SelectTrigger className='w-[110px] rounded-xl'>
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
                      className='flex-1 rounded-xl'
                      value={googlePhone}
                      onChange={(e) => setGooglePhone(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className='text-xs text-rose-500 mt-1'>{fieldErrors.phone}</p>
                  )}
                </div>

                {formError && (
                  <p className='text-sm text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2'>
                    {formError}
                  </p>
                )}

                <div className='pt-2'>
                  <Button
                    type='submit'
                    disabled={loading}
                    className='w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
                    suppressHydrationWarning
                  >
                    {loading ? 'Saving Profile…' : 'Complete Setup Architecture'}
                  </Button>
                </div>
              </form>
            </StepShell>

            {/* Step 3: Meta Onboarding Setup Data Operations */}
            <StepShell
              step={3}
              currentStep={step}
              title='One last step!'
              subtitle='Tell us about your institute to personalize your experience'
            >
              <form onSubmit={handleOnboarding} className='mt-6 space-y-4' suppressHydrationWarning>
                <div>
                  <label className='text-sm font-medium'>
                    Institute Name<RequiredMark />
                  </label>
                  <Input
                    placeholder='e.g., Springfield High School'
                    className='mt-1.5 rounded-xl'
                    value={instituteName}
                    onChange={(e) => setInstituteName(e.target.value)}
                    required
                    disabled={loading}
                    suppressHydrationWarning
                  />
                  {fieldErrors.instituteName && (
                    <p className='text-xs text-rose-500 mt-1'>{fieldErrors.instituteName}</p>
                  )}
                </div>

                <div>
                  <label className='text-sm font-medium'>
                    Institute Type<RequiredMark />
                  </label>
                  <Select value={instituteType} onValueChange={setInstituteType} disabled={loading}>
                    <SelectTrigger className='mt-1.5 w-full rounded-xl'>
                      <SelectValue placeholder='Select system model type' />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTITUTE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.instituteType && (
                    <p className='text-xs text-rose-500 mt-1'>{fieldErrors.instituteType}</p>
                  )}
                </div>

                <div>
                  <label className='text-sm font-medium'>
                    City<RequiredMark />
                  </label>
                  <Input
                    className='mt-1.5 rounded-xl'
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    disabled={loading}
                    suppressHydrationWarning
                  />
                  {fieldErrors.city && (
                    <p className='text-xs text-rose-500 mt-1'>{fieldErrors.city}</p>
                  )}
                </div>

                <div>
                  <label className='text-sm font-medium'>
                    Country<RequiredMark />
                  </label>
                  <Select value={country} onValueChange={setCountry} disabled={loading}>
                    <SelectTrigger className='mt-1.5 w-full rounded-xl'>
                      <SelectValue placeholder='Select domain country' />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.country && (
                    <p className='text-xs text-rose-500 mt-1'>{fieldErrors.country}</p>
                  )}
                </div>

                <div>
                  <label className='text-sm font-medium'>
                    No. of Students<RequiredMark />
                  </label>
                  <Select
                    value={studentsRange}
                    onValueChange={setStudentsRange}
                    disabled={loading}
                  >
                    <SelectTrigger className='mt-1.5 w-full rounded-xl'>
                      <SelectValue placeholder='Select active student count matrix' />
                    </SelectTrigger>
                    <SelectContent>
                      {STUDENT_RANGES.map((range) => (
                        <SelectItem key={range} value={range}>
                          {range}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.studentsRange && (
                    <p className='text-xs text-rose-500 mt-1'>{fieldErrors.studentsRange}</p>
                  )}
                </div>

                <div>
                  <label className='text-sm font-medium'>
                    No. of Faculty<RequiredMark />
                  </label>
                  <Select value={facultyRange} onValueChange={setFacultyRange} disabled={loading}>
                    <SelectTrigger className='mt-1.5 w-full rounded-xl'>
                      <SelectValue placeholder='Select core faculty allocations' />
                    </SelectTrigger>
                    <SelectContent>
                      {FACULTY_RANGES.map((range) => (
                        <SelectItem key={range} value={range}>
                          {range}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.facultyRange && (
                    <p className='text-xs text-rose-500 mt-1'>{fieldErrors.facultyRange}</p>
                  )}
                </div>

                {formError && (
                  <p className='text-sm text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2'>
                    {formError}
                  </p>
                )}

                <div className='pt-2'>
                  <Button
                    type='submit'
                    disabled={loading}
                    className='w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
                    suppressHydrationWarning
                  >
                    {loading ? 'Completing setup…' : 'Complete Platform Setup'}
                  </Button>
                </div>
              </form>
            </StepShell>
          </GlassCard>

          <p className='text-center text-sm text-muted-foreground mt-6'>
            <Link href='/' className='hover:text-foreground transition-colors'>
              ← Back to home
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}