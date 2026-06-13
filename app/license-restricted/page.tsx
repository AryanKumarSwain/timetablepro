'use client';

import { motion } from 'framer-motion';
import { Lock, AlertTriangle, RefreshCw } from 'lucide-react';

import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';

export default function LicenseRestrictedPage() {
  return (
    <div className='min-h-screen bg-background mesh-gradient flex items-center justify-center p-4'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='w-full max-w-md'
      >
        <GlassCard className='p-8 text-center'>
          <div className='w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6'>
            <Lock className='w-8 h-8 text-rose-500' />
          </div>

          <h1 className='text-2xl font-bold mb-2'>License Restricted</h1>
          <p className='text-muted-foreground mb-6'>
            Your school's license has expired or been suspended. Please contact your administrator or upgrade your plan to continue using TimetablePro.
          </p>

          <div className='bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6'>
            <div className='flex items-start gap-3'>
              <AlertTriangle className='w-5 h-5 text-amber-500 shrink-0 mt-0.5' />
              <div className='text-left'>
                <p className='font-medium text-amber-700 dark:text-amber-400 mb-1'>Action Required</p>
                <p className='text-sm text-amber-600/80 dark:text-amber-400/80'>
                  Contact your school administrator to renew the license or switch to a paid plan.
                </p>
              </div>
            </div>
          </div>

          <div className='space-y-3'>
            <Button onClick={() => window.location.reload()} variant='outline' className='w-full'>
              <RefreshCw className='w-4 h-4 mr-2' />
              Refresh Page
            </Button>
            <Button onClick={() => window.location.href = '/login'} variant='ghost' className='w-full'>
              Sign Out
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
