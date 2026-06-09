import { cn } from '@/lib/utils';

/**
 * Returns Tailwind classes for status badges based on license status
 */
export function getStatusBadgeClass(status?: string | null): string {
  const s = typeof status === 'string' ? status.toLowerCase() : '';
  if (s === 'active') return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
  if (s === 'trial') return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
  return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
}

/**
 * Formats a date string to a readable format
 */
export function formatDate(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string') return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
}
