'use client';

import { AppShell } from '@/components/enterprise/app-shell';
import { LoginAlertProvider } from '@/components/enterprise/login-alert-provider';
import { TrialWarningBanner } from '@/components/trial-warning-banner';
import { useAuth } from '@/lib/auth-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  return (
    <LoginAlertProvider>
      <TrialWarningBanner schoolId={user?.schoolId || undefined} />
      <AppShell role='admin' roleLabel='School Admin'>
        {children}
      </AppShell>
    </LoginAlertProvider>
  );
}