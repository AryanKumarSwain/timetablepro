'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Page() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (session) {
        // Redirect based on role
        if (session.user.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (session.user.role === 'teacher') {
          router.push('/teacher/schedule');
        }
      } else {
        // Redirect to login if not authenticated
        router.push('/login');
      }
    }
  }, [session, loading, router]);

  return (
    <div className='min-h-screen bg-background flex items-center justify-center'>
      <p className='text-muted-foreground'>Redirecting...</p>
    </div>
  );
}
