'use client';

import { AppShell } from '@/components/enterprise/app-shell';
import { LoginAlertProvider } from '@/components/enterprise/login-alert-provider';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <LoginAlertProvider>
      <AppShell role='admin' roleLabel='School Admin'>
        {children}
      </AppShell>
    </LoginAlertProvider>
  );
}