'use client';

import { AppShell } from '@/components/enterprise/app-shell';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell role='super-admin' roleLabel='Platform Admin'>
      {children}
    </AppShell>
  );
}
