'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getNavForRole, type AppRole } from '@/lib/navigation';
import { EnterpriseSidebar } from './sidebar';
import { TopNavbar } from './top-navbar';
import { CommandPalette } from './command-palette';

// Define the shape matching your Prisma relation for frontend Type safety
interface PrismaUserWithSchool {
  name?: string | null;
  email?: string;
  role?: string;
  school?: {
    id: string;
    name: string; // This maps directly to your Prisma School model
  } | null;
}

interface AppShellProps {
  role: AppRole;
  roleLabel: string;
  children: React.ReactNode;
}

export function AppShell({ role, roleLabel, children }: AppShellProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [schoolName, setSchoolName] = useState<string | undefined>();

  const navItems = getNavForRole(role);

  // Cast user to our relational type to safely extract the school name
  const extendedUser = user as unknown as PrismaUserWithSchool;

  // Fetch school name dynamically to reflect updates from settings
  const fetchSchoolName = async () => {
    try {
      const res = await fetch('/api/admin/school');
      if (res.ok) {
        const data = await res.json();
        setSchoolName(data.name);
      }
    } catch (error) {
      console.error('Failed to fetch school name:', error);
    }
  };

  useEffect(() => {
    // Initialize school name from user object
    setSchoolName(extendedUser?.school?.name ?? undefined);
    
    // Fetch fresh school name from API
    fetchSchoolName();
  }, [extendedUser?.school?.name]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCommandOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  return (
    <div className='min-h-screen bg-background mesh-gradient'>
      <TopNavbar
        userName={extendedUser?.name ?? undefined}
        userEmail={extendedUser?.email}
        schoolName={schoolName} // 👈 Dynamic school name loaded via your Prisma relation!
        userRole={role}
        navItems={navItems}
        onOpenCommand={() => setCommandOpen(true)}
        onLogout={handleLogout}
      />
      <div className='flex'>
        <EnterpriseSidebar
          items={navItems}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          roleLabel={roleLabel}
        />
        <main className='flex-1 min-w-0 px-4 md:px-6 pb-10'>{children}</main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} userRole={role} />
    </div>
  );
}