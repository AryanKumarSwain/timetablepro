'use client';

import { SettingsPageContent } from '@/components/shared/settings-page-content';
import { useAuth, useRequireAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { useTutorial } from '@/lib/tutorial/tutorial-context';
import { UserCircle, HelpCircle } from 'lucide-react';

export default function TeacherSettingsPage() {
  useRequireAuth('teacher');
  const { user, loading } = useAuth();
  const { jumpToModuleTour } = useTutorial();

  if (loading) {
    return <div className='max-w-[1200px] mx-auto p-4 text-xs text-muted-foreground'>Loading settings…</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 p-4">
      <div data-tour="teacher-settings-header" className="flex items-center justify-between border-b border-border/40 pb-4">
        <h1 className="text-xl font-black uppercase tracking-wider text-foreground flex items-center gap-2">
          Personal Account Workspace
        </h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => jumpToModuleTour('teacher-settings')}
          className="gap-2 rounded-xl text-xs font-semibold bg-background/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400"
        >
          <HelpCircle className="h-4 w-4" />
          Settings Guide
        </Button>
      </div>
      <SettingsPageContent initialUser={user} />
    </div>
  );
}