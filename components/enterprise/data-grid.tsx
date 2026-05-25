'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GlassCard } from './glass-card';
import { cn } from '@/lib/utils';

interface DataGridProps {
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  empty?: boolean;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataGrid({
  title,
  description,
  searchPlaceholder = 'Search…',
  searchValue,
  onSearchChange,
  toolbar,
  children,
  className,
  empty,
  emptyMessage = 'No records found',
  loading,
}: DataGridProps) {
  return (
    <GlassCard className={cn('overflow-hidden', className)}>
      {(title || onSearchChange || toolbar) && (
        <div className='p-4 border-b border-border/50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            {title && <h3 className='font-semibold'>{title}</h3>}
            {description && (
              <p className='text-xs text-muted-foreground mt-0.5'>{description}</p>
            )}
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            {onSearchChange && (
              <div className='relative'>
                <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className='pl-8 w-full sm:w-56 rounded-xl bg-muted/30'
                />
              </div>
            )}
            {toolbar}
          </div>
        </div>
      )}
      <div className='overflow-x-auto'>
        {loading ? (
          <div className='p-8 space-y-3'>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className='h-12 rounded-xl bg-muted/50 animate-pulse'
              />
            ))}
          </div>
        ) : empty ? (
          <div className='p-12 text-center text-muted-foreground text-sm'>
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>
    </GlassCard>
  );
}

export function DataGridTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <table className={cn('w-full text-sm', className)}>
      {children}
    </table>
  );
}

export function DataGridHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className='sticky top-0 z-10 bg-muted/80 backdrop-blur-sm'>
      {children}
    </thead>
  );
}

export function DataGridRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        'border-b border-border/40 transition-colors hover:bg-muted/30 even:bg-muted/10',
        className
      )}
    >
      {children}
    </tr>
  );
}

export function DataGridTh({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground',
        className
      )}
    >
      {children}
    </th>
  );
}

export function DataGridTd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn('px-4 py-3', className)}>{children}</td>;
}
