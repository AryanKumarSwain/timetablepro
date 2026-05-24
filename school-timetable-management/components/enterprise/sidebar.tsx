'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
                <div className='h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25'>
                  <Sparkles className='h-4 w-4 text-white' />
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold truncate'>TimetableMaster</p>
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

            const link = (
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-gradient-to-r from-indigo-500/15 to-violet-500/10 text-foreground shadow-sm border border-indigo-500/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    active && 'text-indigo-500 dark:text-indigo-400'
                  )}
                />
                {!collapsed && <span className='truncate'>{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className='ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'>
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
      </motion.aside>
    </TooltipProvider>
  );
}
