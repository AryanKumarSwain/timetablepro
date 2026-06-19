'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LockedFeatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
}

export function LockedFeatureModal({ open, onOpenChange, featureName }: LockedFeatureModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push('/admin/upgrade');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-xl">Feature Locked</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            This feature is locked under your active plan. Upgrade your plan subscription to gain instant access to {featureName}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 p-4 rounded-xl border border-purple-100 dark:border-purple-900/50">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-1">Premium Features</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Unlock advanced features like reports, attendance tracking, and homework management with our paid plans.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleUpgrade}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
