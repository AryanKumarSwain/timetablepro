'use client';

import { AppShell } from '@/components/enterprise/app-shell';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell role='admin' roleLabel='School Admin'>
      {children}
    </AppShell>
  );
}
