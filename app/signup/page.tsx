'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    <svg className={className} viewBox='0 0 24 24' aria-hidden='true'>
      <path
        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
        fill='#4285F4'
      />
      <path
        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
        fill='#34A853'
      />
      <path
        d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
        fill='#FBBC05'
      />
      <path
        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
        fill='#EA4335'
      />
    </svg>
  );
}

function RequiredMark() {
  return <span className='text-red-500 ml-0.5'>*</span>;
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

  return (
    <div
      className={cn(
        'transition-all duration-300',
        isActive
          ? 'opacity-100 translate-y-0 relative'
          : 'opacity-0 translate-y-4 absolute inset-0 pointer-events-none'
      )}
      aria-hidden={!isActive}
    >
      <div className='text-center mb-8'>
        <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 mb-4'>
          <Sparkles className='h-5 w-5 text-white' />
        </div>
        <h1 className='text-2xl font-bold text-gray-900'>{title}</h1>
        {subtitle ? (
          <p className='text-sm text-gray-500 mt-1'>{subtitle}</p>
        ) : null}
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

  const gradientBtn =
    'w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-purple-400 text-white hover:opacity-95';

  if (checkingSession) {
    return (
      <div className='min-h-screen bg-[#f5f5f7] flex items-center justify-center'>
        <p className='text-gray-500 animate-pulse'>Loading…</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#f5f5f7] flex items-center justify-center p-6'>
      <div className='w-full max-w-md'>
        <div className='bg-white rounded-2xl shadow-sm p-8 relative min-h-[520px]'>
          <StepShell
            step={1}
            currentStep={step}
            title='Create your account'
            subtitle='Start your free trial — no credit card required'
          >
            <form onSubmit={handleEmailSignup} className='space-y-4'>
              <div>
                <label className='text-sm font-medium text-gray-700'>Full Name</label>
                <Input
                  className='mt-1.5 rounded-lg border-gray-200 bg-white focus-visible:ring-purple-400'
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />
                {fieldErrors.fullName ? (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.fullName}</p>
                ) : null}
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700'>Email address</label>
                <Input
                  type='email'
                  className='mt-1.5 rounded-lg border-gray-200 bg-white focus-visible:ring-purple-400'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
                {fieldErrors.email ? (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.email}</p>
                ) : null}
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700'>Phone Number</label>
                <div className='mt-1.5 flex gap-2'>
                  <Select value={countryCode} onValueChange={setCountryCode} disabled={loading}>
                    <SelectTrigger className='w-[110px] rounded-lg border-gray-200 bg-white'>
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
                    className='flex-1 rounded-lg border-gray-200 bg-white focus-visible:ring-purple-400'
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                {fieldErrors.phone ? (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.phone}</p>
                ) : null}
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700'>Password</label>
                <Input
                  type='password'
                  minLength={6}
                  className='mt-1.5 rounded-lg border-gray-200 bg-white focus-visible:ring-purple-400'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                {fieldErrors.password ? (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.password}</p>
                ) : null}
              </div>

              {formError ? (
                <p className='text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2'>
                  {formError}
                </p>
              ) : null}
              {fieldErrors._form ? (
                <p className='text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2'>
                  {fieldErrors._form}
                </p>
              ) : null}

              <Button type='submit' disabled={loading} className={gradientBtn}>
                {loading ? 'Creating account…' : 'Create Account'}
              </Button>
            </form>

            <p className='text-center text-sm text-gray-600 mt-4'>
              Already have an account?{' '}
              <Link href='/login' className='text-purple-600 font-medium hover:underline'>
                Log in
              </Link>
            </p>

            <div className='flex items-center gap-3 my-6'>
              <div className='flex-1 h-px bg-gray-200' />
              <span className='text-xs text-gray-400 uppercase'>or</span>
              <div className='flex-1 h-px bg-gray-200' />
            </div>

            <Button
              type='button'
              variant='outline'
              onClick={handleGoogleSignup}
              disabled={loading}
              className='w-full h-11 rounded-xl bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            >
              <GoogleIcon className='h-5 w-5 mr-2' />
              Continue with Google
            </Button>

            <p className='text-xs text-center text-gray-400 mt-6'>
              By signing up, you agree to our{' '}
              <Link href='#' className='underline hover:text-gray-600'>
                Terms
              </Link>{' '}
              and{' '}
              <Link href='#' className='underline hover:text-gray-600'>
                Privacy Policy
              </Link>
            </p>
          </StepShell>

          <StepShell step={2} currentStep={step} title='Complete Your Registration'>
            <div className='flex flex-col items-center mb-6'>
              <div className='h-14 w-14 rounded-full bg-teal-500 flex items-center justify-center text-white text-xl font-semibold'>
                {googleEmail ? googleEmail.charAt(0).toUpperCase() : 'G'}
              </div>
              <p className='mt-3 text-sm font-medium text-gray-900'>{googleEmail}</p>
              <p className='text-xs text-gray-500'>Signing up with Google</p>
            </div>

            <form onSubmit={handleCompleteGoogleProfile} className='space-y-4'>
              <div>
                <label className='text-sm font-medium text-gray-700'>Full Name</label>
                <Input
                  className='mt-1.5 rounded-lg border-gray-200 bg-white focus-visible:ring-purple-400'
                  value={googleFullName}
                  onChange={(e) => setGoogleFullName(e.target.value)}
                  required
                  disabled={loading}
                />
                {fieldErrors.fullName ? (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.fullName}</p>
                ) : null}
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700'>Phone Number</label>
                <div className='mt-1.5 flex gap-2'>
                  <Select
                    value={googleCountryCode}
                    onValueChange={setGoogleCountryCode}
                    disabled={loading}
                  >
                    <SelectTrigger className='w-[110px] rounded-lg border-gray-200 bg-white'>
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
                    className='flex-1 rounded-lg border-gray-200 bg-white focus-visible:ring-purple-400'
                    value={googlePhone}
                    onChange={(e) => setGooglePhone(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                {fieldErrors.phone ? (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.phone}</p>
                ) : null}
              </div>

              {formError ? (
                <p className='text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2'>
                  {formError}
                </p>
              ) : null}

              <Button type='submit' disabled={loading} className={gradientBtn}>
                {loading ? 'Saving…' : 'Create Account'}
              </Button>
            </form>

            <p className='text-xs text-center text-gray-400 mt-6'>
              By signing up, you agree to our{' '}
              <Link href='#' className='underline hover:text-gray-600'>
                Terms
              </Link>{' '}
              and{' '}
              <Link href='#' className='underline hover:text-gray-600'>
                Privacy Policy
              </Link>
            </p>
          </StepShell>

          <StepShell
            step={3}
            currentStep={step}
            title='One last step!'
            subtitle='Tell us about your institute to personalize your experience'
          >
            <form onSubmit={handleOnboarding} className='space-y-4'>
              <div>
                <label className='text-sm font-medium text-gray-700'>
                  Institute Name
                  <RequiredMark />
                </label>
                <Input
                  placeholder='e.g., Springfield High School'
                  className='mt-1.5 rounded-lg border-gray-200 bg-white focus-visible:ring-purple-400'
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                  required
                  disabled={loading}
                />
                {fieldErrors.instituteName ? (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.instituteName}</p>
                ) : null}
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700'>
                  Institute Type
                  <RequiredMark />
                </label>
                <Select value={instituteType} onValueChange={setInstituteType} disabled={loading}>
                  <SelectTrigger className='mt-1.5 w-full rounded-lg border-gray-200 bg-white'>
                    <SelectValue placeholder='Select type' />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTITUTE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.instituteType ? (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.instituteType}</p>
                ) : null}
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700'>
                  City
                  <RequiredMark />
                </label>
                <Input
                  className='mt-1.5 rounded-lg border-gray-200 bg-white focus-visible:ring-purple-400'
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  disabled={loading}
                />
                {fieldErrors.city ? (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.city}</p>
                ) : null}
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700'>
                  Country
                  <RequiredMark />
                </label>
                <Select value={country} onValueChange={setCountry} disabled={loading}>
                  <SelectTrigger className='mt-1.5 w-full rounded-lg border-gray-200 bg-white'>
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
                {fieldErrors.country ? (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.country}</p>
                ) : null}
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700'>
                  No. of Students
                  <RequiredMark />
                </label>
                <Select
                  value={studentsRange}
                  onValueChange={setStudentsRange}
                  disabled={loading}
                >
                  <SelectTrigger className='mt-1.5 w-full rounded-lg border-gray-200 bg-white'>
                    <SelectValue placeholder='Select range' />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDENT_RANGES.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.studentsRange ? (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.studentsRange}</p>
                ) : null}
              </div>

              <div>
                <label className='text-sm font-medium text-gray-700'>
                  No. of Faculty
                  <RequiredMark />
                </label>
                <Select value={facultyRange} onValueChange={setFacultyRange} disabled={loading}>
                  <SelectTrigger className='mt-1.5 w-full rounded-lg border-gray-200 bg-white'>
                    <SelectValue placeholder='Select range' />
                  </SelectTrigger>
                  <SelectContent>
                    {FACULTY_RANGES.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.facultyRange ? (
                  <p className='text-xs text-red-500 mt-1'>{fieldErrors.facultyRange}</p>
                ) : null}
              </div>

              {formError ? (
                <p className='text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2'>
                  {formError}
                </p>
              ) : null}

              <Button type='submit' disabled={loading} className={gradientBtn}>
                {loading ? 'Completing setup…' : 'Complete Setup'}
              </Button>
            </form>
          </StepShell>
        </div>

        <p className='text-center text-sm text-gray-500 mt-6'>
          <Link href='/' className='hover:text-gray-700 transition-colors'>
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
