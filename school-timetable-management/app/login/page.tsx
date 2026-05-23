'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const auth = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await auth.login(email, password);
      // Redirect based on role
      if (auth.user?.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/teacher/schedule');
      }
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-background flex items-center justify-center p-4'>
      <div className='w-full max-w-md'>
        <div className='mb-8 text-center'>
          <h1 className='text-3xl font-bold text-foreground mb-2'>
            School Timetable
          </h1>
          <p className='text-muted-foreground'>
            Attendance & Replacement Management
          </p>
        </div>

        <Card className='p-6 shadow-lg'>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-foreground mb-2'>
                Email
              </label>
              <Input
                type='email'
                placeholder='Enter your email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-foreground mb-2'>
                Password
              </label>
              <Input
                type='password'
                placeholder='Enter your password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {error && (
              <div className='p-3 bg-destructive/10 border border-destructive/30 rounded-md'>
                <p className='text-sm text-destructive'>{error}</p>
              </div>
            )}

            <Button
              type='submit'
              className='w-full bg-primary hover:bg-primary/90'
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className='mt-6 pt-6 border-t border-border'>
            <p className='text-sm text-muted-foreground text-center mb-4'>
              Demo Credentials
            </p>
            <div className='space-y-2 text-xs text-muted-foreground'>
              <p>
                <strong>Admin:</strong> admin@school.edu / password
              </p>
              <p>
                <strong>Teacher:</strong> rajesh@school.edu / password
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
