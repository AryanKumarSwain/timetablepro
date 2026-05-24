'use client';

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        'sticky top-0 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-4 mb-6',
        'border-b border-border/50 bg-background/80 backdrop-blur-xl',
        className
      )}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className='flex items-center gap-1 text-xs text-muted-foreground mb-2'>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.label} className='flex items-center gap-1'>
              {i > 0 && <ChevronRight className='h-3 w-3' />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className='hover:text-foreground transition-colors'
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className='text-foreground font-medium'>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent'>
            {title}
          </h1>
          {description && (
            <p className='text-sm text-muted-foreground mt-1 max-w-2xl'>
              {description}
            </p>
          )}
        </div>
        {actions && <div className='flex flex-wrap items-center gap-2'>{actions}</div>}
      </div>
    </motion.div>
  );
}
