'use client';

import { SettingsPageContent } from '@/components/shared/settings-page-content';
import { useAuth, useRequireAuth } from '@/lib/auth-context';
import { UserCheck } from 'lucide-react';

export default function AdminSettingsPage() {
  useRequireAuth('admin');
  const { user, loading } = useAuth();

  if (loading) {
    return <div className='max-w-[1200px] mx-auto p-4 text-xs text-muted-foreground'>Loading settings…</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 p-4">
      <div className="flex items-center gap-2 border-b border-border/40 pb-4">
        <h1 className="text-xl font-black uppercase tracking-wider text-foreground flex items-center gap-2">
          Admin Settings Control Workspace
        </h1>
      </div>
      <SettingsPageContent initialUser={user} />
    </div>
  );
}