'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrialWarningBannerProps {
  schoolId?: string;
}

export function TrialWarningBanner({ schoolId }: TrialWarningBannerProps) {
  const [trialInfo, setTrialInfo] = useState<{
    show: boolean;
    planName: string;
    hoursRemaining: number;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrialStatus = async () => {
      if (!schoolId) return;

      try {
        const res = await fetch('/api/school/trial-status');
        if (res.ok) {
          const data = await res.json();
          if (data.showWarning) {
            setTrialInfo({
              show: true,
              planName: data.planName || 'the selected plan',
              hoursRemaining: data.hoursRemaining || 48,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch trial status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrialStatus();
  }, [schoolId]);

  if (loading || !trialInfo?.show || dismissed) {
    return null;
  }

  return (
    <div className='sticky top-0 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white shadow-lg'>
      <div className='max-w-7xl mx-auto px-4 py-3 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <AlertTriangle className='w-5 h-5 animate-pulse' />
          <p className='font-medium text-sm md:text-base'>
            ⚠️ Your 7-day trial for <span className='font-bold'>{trialInfo.planName}</span> is ending in less than 48 hours! Upgrade now to keep features.
          </p>
        </div>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => setDismissed(true)}
          className='text-white hover:bg-white/20'
        >
          <X className='w-4 h-4' />
        </Button>
      </div>
    </div>
  );
}
