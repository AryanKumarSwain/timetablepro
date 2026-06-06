'use client';

import { AppShell } from '@/components/enterprise/app-shell';
import { LoginAlertProvider } from '@/components/enterprise/login-alert-provider';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <LoginAlertProvider>
      <AppShell role='super-admin' roleLabel='Platform Admin'>
        {children}
      </AppShell>
    </LoginAlertProvider>
  );
}