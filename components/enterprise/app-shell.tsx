'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getNavForRole, type AppRole } from '@/lib/navigation';
import { EnterpriseSidebar } from './sidebar';
import { TopNavbar } from './top-navbar';
import { CommandPalette } from './command-palette';

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

  const navItems = getNavForRole(role);

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
      {/* 👇 UPDATED: Added userRole prop mapping below */}
      <TopNavbar
        userName={user?.name}
        userEmail={user?.email}
        userRole={role} // 👈 This links your active shell role to the navbar visibility logic!
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
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );
}