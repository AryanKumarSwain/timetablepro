'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GlassCard } from './glass-card';
import type { LucideIcon } from 'lucide-react';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'primary';

const variantStyles: Record<Variant, string> = {
  default: 'from-slate-500/10 to-transparent border-border/60',
  primary: 'from-indigo-500/15 to-violet-500/5 border-indigo-500/20',
  success: 'from-emerald-500/15 to-transparent border-emerald-500/25',
  warning: 'from-amber-500/15 to-transparent border-amber-500/25',
  danger: 'from-rose-500/15 to-transparent border-rose-500/25',
};

const iconStyles: Record<Variant, string> = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  danger: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
};

interface StatCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  variant?: Variant;
  icon?: LucideIcon;
  trend?: string;
  index?: number;
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  subtext,
  variant = 'default',
  icon: Icon,
  trend,
  index = 0,
  onClick,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
    >
      <GlassCard
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={cn(
          'p-4 sm:p-5 bg-gradient-to-br border',
          variantStyles[variant],
          onClick &&
            'cursor-pointer hover:border-indigo-500/40 hover:shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40'
        )}
      >
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
              {label}
            </p>
            <p className='text-3xl font-bold mt-2 tabular-nums'>{value}</p>
            {subtext && (
              <p className='text-xs text-muted-foreground mt-1.5'>{subtext}</p>
            )}
            {trend && (
              <p className='text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium'>
                {trend}
              </p>
            )}
          </div>
          {Icon && (
            <div
              className={cn(
                'shrink-0 p-2.5 rounded-xl',
                iconStyles[variant]
              )}
            >
              <Icon className='h-5 w-5' />
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}
