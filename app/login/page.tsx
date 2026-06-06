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
// 👇 Import the recovery modal
import { ForgotPasswordModal } from '@/components/auth/forgot-password-modal';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('admin');
  const [mounted, setMounted] = useState(false);
  
  // 👇 Recovery Modal state tracker
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const redirectTo = await auth.login(email, password);
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'admin' | 'teacher') => {
    if (role === 'admin') {
      setEmail('admin@school.edu');
    } else {
      setEmail('rajesh@school.edu');
    }
    setPassword('password');
    setTab(role);
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

                {/* 👇 Forgot Password Action Link Container */}
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

                <Button
                  type='submit'
                  disabled={loading}
                  className={cn(
                    'w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600',
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
              </form>
            )}

            <div className='mt-6 pt-6 border-t border-border/60'>
              <p className='text-xs text-muted-foreground text-center mb-3'>
                Demo credentials (after seed)
              </p>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='flex-1 rounded-xl text-xs'
                  onClick={() => fillDemo('admin')}
                >
                  Admin demo
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='flex-1 rounded-xl text-xs'
                  onClick={() => fillDemo('teacher')}
                >
                  Teacher demo
                </Button>
              </div>
            </div>
          </GlassCard>

          <p className='text-center text-sm text-muted-foreground mt-6'>
            <Link href='/' className='hover:text-foreground transition-colors'>
              ← Back to home
            </Link>
          </p>
        </motion.div>
      </div>

      {/* 👇 Forgot Password Overlay Verification Modal Component */}
      <ForgotPasswordModal 
        isOpen={forgotPasswordOpen} 
        onClose={() => setForgotPasswordOpen(false)} 
      />
    </div>
  );
}