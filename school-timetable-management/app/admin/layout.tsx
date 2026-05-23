'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout, user } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className='min-h-screen bg-background'>
      {/* Header Navigation */}
      <header className='bg-card border-b border-border sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-6 py-4 flex items-center justify-between'>
          <Link href='/admin/dashboard' className='flex items-center gap-3'>
            <div className='w-8 h-8 bg-primary rounded-lg flex items-center justify-center'>
              <span className='text-sm font-bold text-primary-foreground'>ST</span>
            </div>
            <h1 className='text-xl font-bold text-foreground'>SchoolTimetable</h1>
          </Link>

          <nav className='hidden md:flex items-center gap-6'>
            <Link
              href='/admin/dashboard'
              className='text-sm text-muted-foreground hover:text-foreground transition'
            >
              Dashboard
            </Link>
            <Link
              href='/admin/masters/teachers'
              className='text-sm text-muted-foreground hover:text-foreground transition'
            >
              Masters
            </Link>
            <Link
              href='/admin/timetable'
              className='text-sm text-muted-foreground hover:text-foreground transition'
            >
              Timetable
            </Link>
            <Link
              href='/admin/daily-desk'
              className='text-sm text-muted-foreground hover:text-foreground transition'
            >
              Daily Desk
            </Link>
          </nav>

          <div className='flex items-center gap-4'>
            <div className='text-sm text-muted-foreground'>
              {user?.name}
            </div>
            <Button
              onClick={handleLogout}
              variant='outline'
              size='sm'
              className='border-border hover:bg-card'
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
