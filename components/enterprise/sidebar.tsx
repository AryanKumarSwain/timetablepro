'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Sparkles, Crown, Zap, Rocket, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';

interface SidebarProps {
  items: NavItem[];
  collapsed: boolean;
  onToggle: () => void;
  roleLabel: string;
}

export function EnterpriseSidebar({
  items,
  collapsed,
  onToggle,
  roleLabel,
}: SidebarProps) {
  const pathname = usePathname();
  const [currentPlan, setCurrentPlan] = useState<{ name: string; priceMonthly: number; id: string; reportEnabled?: boolean; attendanceEnabled?: boolean; homeworkEnabled?: boolean; lessonPlanningEnabled?: boolean } | null>(null);

  useEffect(() => {
    const fetchCurrentPlan = async () => {
      try {
        const res = await fetch('/api/admin/school');
        if (res.ok) {
          const data = await res.json();
          if (data.plan) {
            setCurrentPlan(data.plan);
          }
        }
      } catch (error) {
        console.error('Failed to fetch current plan:', error);
      }
    };
    fetchCurrentPlan();
  }, []);

  // Check if a feature is enabled based on plan
  const isFeatureEnabled = (featureKey?: 'reports' | 'attendance' | 'homework' | 'lesson-planning'): boolean => {
    if (!featureKey || !currentPlan) return true;
    switch (featureKey) {
      case 'reports':
        return currentPlan.reportEnabled || false;
      case 'attendance':
        return currentPlan.attendanceEnabled || false;
      case 'homework':
        return currentPlan.homeworkEnabled || false;
      case 'lesson-planning':
        return currentPlan.lessonPlanningEnabled || false;
      default:
        return true;
    }
  };

  // Get plan-specific colors and icon
  const getPlanTheme = () => {
    if (!currentPlan) return {
      icon: Sparkles,
      gradient: 'from-violet-600 to-purple-700',
      shadow: 'shadow-violet-500/25',
      accent: 'violet',
      activeBg: 'from-violet-500/15 to-purple-500/10',
      activeBorder: 'border-violet-500/20',
      activeText: 'text-violet-500 dark:text-violet-400',
      badgeBg: 'bg-violet-500/20',
      badgeText: 'text-violet-600 dark:text-violet-400',
      footerGradient: 'from-violet-50 to-purple-50',
      footerBorder: 'border-violet-200',
      footerDarkGradient: 'from-violet-950/20 to-purple-950/20',
      footerDarkBorder: 'border-violet-800',
    };

    // Plan themes based on subscription tiers
    const planThemes: Record<string, any> = {
      // Free Plan - Deep Purple
      'free': {
        icon: Sparkles,
        gradient: 'from-violet-600 to-purple-700',
        shadow: 'shadow-violet-500/25',
        accent: 'violet',
        activeBg: 'from-violet-500/15 to-purple-500/10',
        activeBorder: 'border-violet-500/20',
        activeText: 'text-violet-500 dark:text-violet-400',
        badgeBg: 'bg-violet-500/20',
        badgeText: 'text-violet-600 dark:text-violet-400',
        footerGradient: 'from-violet-50 to-purple-50',
        footerBorder: 'border-violet-200',
        footerDarkGradient: 'from-violet-950/20 to-purple-950/20',
        footerDarkBorder: 'border-violet-800',
      },
      // Standard Plan - Rich Green
      'standard': {
        icon: Rocket,
        gradient: 'from-emerald-500 to-green-600',
        shadow: 'shadow-emerald-500/25',
        accent: 'emerald',
        activeBg: 'from-emerald-500/15 to-green-500/10',
        activeBorder: 'border-emerald-500/20',
        activeText: 'text-emerald-500 dark:text-emerald-400',
        badgeBg: 'bg-emerald-500/20',
        badgeText: 'text-emerald-600 dark:text-emerald-400',
        footerGradient: 'from-emerald-50 to-green-50',
        footerBorder: 'border-emerald-200',
        footerDarkGradient: 'from-emerald-950/20 to-green-950/20',
        footerDarkBorder: 'border-emerald-800',
      },
      // Premium Plan - Vibrant Orange
      'premium': {
        icon: Zap,
        gradient: 'from-orange-500 to-amber-500',
        shadow: 'shadow-orange-500/25',
        accent: 'orange',
        activeBg: 'from-orange-500/15 to-amber-500/10',
        activeBorder: 'border-orange-500/20',
        activeText: 'text-orange-500 dark:text-orange-400',
        badgeBg: 'bg-orange-500/20',
        badgeText: 'text-orange-600 dark:text-orange-400',
        footerGradient: 'from-orange-50 to-amber-50',
        footerBorder: 'border-orange-200',
        footerDarkGradient: 'from-orange-950/20 to-amber-950/20',
        footerDarkBorder: 'border-orange-800',
      },
      // Elite Plan - Premium Gold
      'elite': {
        icon: Crown,
        gradient: 'from-yellow-500 to-amber-400',
        shadow: 'shadow-yellow-500/25',
        accent: 'yellow',
        activeBg: 'from-yellow-500/15 to-amber-400/10',
        activeBorder: 'border-yellow-500/20',
        activeText: 'text-yellow-600 dark:text-yellow-400',
        badgeBg: 'bg-yellow-500/20',
        badgeText: 'text-yellow-700 dark:text-yellow-400',
        footerGradient: 'from-yellow-50 to-amber-50',
        footerBorder: 'border-yellow-200',
        footerDarkGradient: 'from-yellow-950/20 to-amber-950/20',
        footerDarkBorder: 'border-yellow-800',
      },
    };

    // Match plan name to theme (case-insensitive)
    const planNameLower = currentPlan.name.toLowerCase();
    if (planNameLower.includes('free') || planNameLower.includes('trial') || planNameLower.includes('basic') || planNameLower.includes('starter')) {
      return planThemes['free'];
    } else if (planNameLower.includes('standard') || planNameLower.includes('growth') || planNameLower.includes('pro')) {
      return planThemes['standard'];
    } else if (planNameLower.includes('premium') || planNameLower.includes('business') || planNameLower.includes('plus')) {
      return planThemes['premium'];
    } else if (planNameLower.includes('elite') || planNameLower.includes('enterprise') || planNameLower.includes('ultimate')) {
      return planThemes['elite'];
    }

    // Default to free theme
    return planThemes['free'];
  };

  const theme = getPlanTheme();
  const ThemeIcon = theme.icon;

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className={cn(
          'hidden md:flex flex-col shrink-0 h-[calc(100vh-3.5rem)] sticky top-14',
          'border-r border-border/50 bg-sidebar/80 backdrop-blur-xl'
        )}
      >
        <div className='p-3 flex items-center justify-between border-b border-border/40'>
          <AnimatePresence mode='wait'>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='flex items-center gap-2 min-w-0'
              >
                <div className={cn('h-8 w-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', theme.gradient, theme.shadow)}>
                  <ThemeIcon className='h-4 w-4 text-white' />
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold truncate'>TimetablePro</p>
                  <p className='text-[10px] text-muted-foreground uppercase tracking-wider'>
                    {roleLabel}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 shrink-0'
            onClick={onToggle}
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform',
                collapsed && 'rotate-180'
              )}
            />
          </Button>
        </div>

        <nav className='flex-1 p-2 space-y-0.5 overflow-y-auto'>
          {items.map((item, index) => {
            const active =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href + '/'));
            const Icon = item.icon;
            const itemKey = `${item.href}-${index}`;
            const isLocked = !isFeatureEnabled(item.featureKey);

            const link = (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  active
                    ? cn('bg-gradient-to-r text-foreground shadow-sm border', theme.activeBg, theme.activeBorder)
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  isLocked && 'opacity-60'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    active && theme.activeText
                  )}
                />
                {!collapsed && <span className='truncate'>{item.label}</span>}
                {!collapsed && isLocked && (
                  <Lock className='h-3 w-3 ml-auto text-rose-500' />
                )}
                {!collapsed && !isLocked && item.badge && (
                  <span className={cn('ml-auto text-[10px] px-1.5 py-0.5 rounded-full', theme.badgeBg, theme.badgeText)}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={itemKey}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side='right'>{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return <div key={itemKey}>{link}</div>;
          })}
        </nav>

        {/* Current Plan Footer */}
        <div className='p-3 border-t border-border/40'>
          <AnimatePresence mode='wait'>
            {!collapsed && currentPlan ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='space-y-2'
              >
                <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                  <ThemeIcon className={cn('h-3 w-3', theme.activeText)} />
                  <span className='font-medium'>Current Plan</span>
                </div>
                <div className={cn('bg-gradient-to-r dark:bg-gradient-to-r border rounded-lg p-2.5', theme.footerGradient, theme.footerBorder, theme.footerDarkGradient, theme.footerDarkBorder)}>
                  <p className='text-sm font-semibold text-slate-900 dark:text-white truncate'>
                    {currentPlan.name}
                  </p>
                  <p className='text-[10px] text-slate-600 dark:text-slate-400'>
                    ₹{currentPlan.priceMonthly}/month
                  </p>
                </div>
              </motion.div>
            ) : (
              !collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                    <Sparkles className='h-3 w-3 text-indigo-500' />
                    <span className='font-medium'>Loading plan...</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Current Plan</TooltipContent>
              </Tooltip>
            </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
