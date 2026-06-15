'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Sparkles, Shield, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ForgotPasswordModal } from '@/components/auth/forgot-password-modal';

// Custom inline Google Icon component
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
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
    
    // Check for AccountNotFound error in URL
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error === 'AccountNotFound') {
      setError('No account found. Please sign up first.');
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
    <div className='min-h-screen grid lg:grid-cols-2'>
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
            Enterprise scheduling for modern schools
          </h2>
          <p className='text-white/70 max-w-md'>
            Attendance, substitutions, and weekly timetables — unified in one
            operational command center.
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

      <div className='flex items-center justify-center p-6 md:p-10 mesh-gradient'>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className='w-full max-w-md'
        >
          <div className='lg:hidden flex items-center gap-2 mb-8 font-semibold'>
            <div className='h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center'>
              <Sparkles className='h-4 w-4 text-white' />
            </div>
            TimetablePro
          </div>

          <GlassCard className='p-8'>
            <h1 className='text-2xl font-bold'>Welcome back</h1>
            <p className='text-sm text-muted-foreground mt-1'>
              Sign in to your workspace
            </p>

            <Tabs value={tab} onValueChange={setTab} className='mt-6'>
              <TabsList className='grid w-full grid-cols-2 rounded-xl'>
                <TabsTrigger value='admin' className='rounded-lg'>
                  Admin Login
                </TabsTrigger>
                <TabsTrigger value='teacher' className='rounded-lg'>
                  Teacher Login
                </TabsTrigger>
              </TabsList>
              <TabsContent value='admin' className='mt-0' />
              <TabsContent value='teacher' className='mt-0' />
            </Tabs>

            {!mounted ? (
              <div className='mt-6 space-y-4' aria-hidden>
                <div className='h-16 rounded-xl bg-muted/40 animate-pulse' />
                <div className='h-16 rounded-xl bg-muted/40 animate-pulse' />
                <div className='h-11 rounded-xl bg-muted/40 animate-pulse' />
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className='mt-6 space-y-4'
                suppressHydrationWarning
              >
                <div>
                  <label className='text-sm font-medium'>Email</label>
                  <Input
                    type='email'
                    autoComplete='email'
                    className='mt-1.5 rounded-xl'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <label className='text-sm font-medium'>Password</label>
                  <div className='relative mt-1.5' suppressHydrationWarning>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete='current-password'
                      className='rounded-xl pr-10'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      required
                      suppressHydrationWarning
                    />
                    <button
                      type='button'
                      className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                      onClick={() => setShowPassword((v) => !v)}
                      suppressHydrationWarning
                    >
                      {showPassword ? (
                        <EyeOff className='h-4 w-4' />
                      ) : (
                        <Eye className='h-4 w-4' />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(true)}
                    className="text-xs font-medium text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className='text-sm text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2'
                  >
                    {error}
                  </motion.p>
                )}

                <div className="space-y-3 pt-2">
                  <Button
                    type='submit'
                    disabled={loading}
                    className={cn(
                      'w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white',
                      loading && 'opacity-80'
                    )}
                    suppressHydrationWarning
                  >
                    {loading ? (
                      <span className='flex items-center gap-2'>
                        <span className='h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin' />
                        Signing in…
                      </span>
                    ) : (
                      'Sign in'
                    )}
                  </Button>

                  {/* Only show Google login option for Admin tier */}
                  {tab === 'admin' && (
                    <>
                      <div className="relative flex py-2 items-center text-xs text-muted-foreground">
                        <div className="flex-grow border-t border-border/60"></div>
                        <span className="flex-shrink mx-4 uppercase tracking-wider">or</span>
                        <div className="flex-grow border-t border-border/60"></div>
                      </div>

                      <Button
                        type='button'
                        variant='outline'
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className='w-full h-11 rounded-xl bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors'
                      >
                        <GoogleIcon className='h-5 w-5 mr-2' />
                        Continue with Google
                      </Button>
                    </>
                  )}
                </div>
              </form>
            )}
          </GlassCard>

          <p className='text-center text-sm text-muted-foreground mt-6'>
            Don&apos;t have an account?{' '}
            <Link
              href='/signup'
              className='text-indigo-500 hover:text-indigo-600 font-medium transition-colors'
            >
              create a new account
            </Link>
          </p>

          <p className='text-center text-sm text-muted-foreground mt-3'>
            <Link href='/' className='hover:text-foreground transition-colors'>
              ← Back to home
            </Link>
          </p>
        </motion.div>
      </div>

      <ForgotPasswordModal 
        isOpen={forgotPasswordOpen} 
        onClose={() => setForgotPasswordOpen(false)} 
      />
    </div>
  );
}