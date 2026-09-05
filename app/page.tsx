'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { LandingPage } from '@/components/landing/landing-page';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';

export default function Page() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading || !session) return;
    const role = session.user.role;
    if (role === 'admin' && session.user.onboardingDone === false) {
      router.replace('/signup');
      return;
    }
    if (role === 'super-admin') router.replace('/super-admin/dashboard');
    else if (role === 'admin') router.replace('/admin/dashboard');
    else if (role === 'teacher') router.replace('/teacher/schedule');
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className='min-h-screen p-8 max-w-6xl mx-auto'>
        <PageSkeleton />
      </div>
    );
  }

  if (session) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <p className='text-muted-foreground animate-pulse'>Redirecting...</p>
      </div>
    );
  }

  return <LandingPage />;
}