'use client';

import { AppShell } from '@/components/enterprise/app-shell';
// 👇 Import the localized alert component we created
import { LoginAlertProvider } from '@/components/enterprise/login-alert-provider';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LoginAlertProvider>
      <AppShell role='teacher' roleLabel='Teacher Portal'>
        {children}
      </AppShell>
    </LoginAlertProvider>
  );
}