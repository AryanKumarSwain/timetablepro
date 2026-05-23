'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className='min-h-screen bg-background flex items-center justify-center p-4'>
      <Card className='p-8 border-border max-w-md text-center'>
        <div className='mb-6'>
          <h1 className='text-4xl font-bold text-destructive mb-2'>403</h1>
          <h2 className='text-2xl font-semibold text-foreground'>
            Access Denied
          </h2>
        </div>

        <p className='text-muted-foreground mb-6'>
          You don&apos;t have permission to access this resource. Please check your
          account role and permissions.
        </p>

        <Button
          onClick={() => router.push('/login')}
          className='w-full bg-primary hover:bg-primary/90'
        >
          Back to Login
        </Button>
      </Card>
    </div>
  );
}
