'use client';

import { AppShell } from '@/components/enterprise/app-shell';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell role='teacher' roleLabel='Teacher Portal'>
      {children}
    </AppShell>
  );
}
