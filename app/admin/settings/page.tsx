'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SettingsPageContent } from '@/components/shared/settings-page-content';
import { useAuth, useRequireAuth } from '@/lib/auth-context';
import { QueryProvider } from '@/components/providers/query-provider'; // 1. Import your provider
import { UserCheck } from 'lucide-react';

export default function AdminSettingsPage() {
  useRequireAuth('admin');
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'profile';

  if (loading) {
    return <div className='max-w-[1200px] mx-auto p-4 text-xs text-muted-foreground'>Loading settings…</div>;
  }

  if (!user) {
    return null;
  }

  return (
    // 2. Wrap the component tree directly inside the QueryProvider boundary
    <QueryProvider>
      <div className="max-w-[1200px] mx-auto space-y-6 p-4">
        <div className="flex items-center gap-2 border-b border-border/40 pb-4">
          <h1 className="text-xl font-black uppercase tracking-wider text-foreground flex items-center gap-2">
            Admin Settings Control Workspace
          </h1>
        </div>
        <div className='flex flex-wrap gap-2 py-4'>
          {[
            { value: 'profile', label: 'General' },
            { value: 'institute', label: 'Institute' },
            { value: 'features', label: 'Features' },
            { value: 'substitution', label: 'Substitution' },
            { value: 'leave-requests', label: 'Leave Requests' },
          ].map((tab) => (
            <Link
              key={tab.value}
              href={`/admin/settings?tab=${tab.value}`}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.value
                  ? 'border-indigo-500 bg-indigo-500 text-white'
                  : 'border-border/60 bg-background text-muted-foreground hover:border-indigo-400 hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <SettingsPageContent initialUser={user} activeTab={activeTab} />
      </div>
    </QueryProvider>
  );
}