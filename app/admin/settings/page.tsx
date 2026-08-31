'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SettingsPageContent } from '@/components/shared/settings-page-content';
import { useAuth, useRequireAuth } from '@/lib/auth-context';
import { QueryProvider } from '@/components/providers/query-provider'; // 1. Import your provider
import { UserCheck } from 'lucide-react';
import { usePlanTheme } from '@/lib/plan-theme';

export default function AdminSettingsPage() {
  useRequireAuth('admin');
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'profile';
  const { theme } = usePlanTheme();

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
        <div className='flex items-center gap-2 py-3 overflow-x-auto scrollbar-none no-scrollbar touch-pan-x max-w-full pb-2 scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0'>
          {[
            { value: 'profile', label: 'General' },
            { value: 'institute', label: 'Institute' },
            { value: 'leave-reasons', label: 'Leave Reasons' },
            { value: 'leave-requests', label: 'Left Requests' },
          ].map((tab) => (
            <Link
              key={tab.value}
              href={`/admin/settings?tab=${tab.value}`}
              className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-xs sm:text-sm font-semibold transition ${
                activeTab === tab.value
                  ? `border-${theme.primary} bg-${theme.primary} text-white shadow-sm`
                  : `border-border/60 bg-background text-muted-foreground hover:border-${theme.primary} hover:text-foreground`
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <SettingsPageContent initialUser={user as any} activeTab={activeTab} />
      </div>
    </QueryProvider>
  );
}