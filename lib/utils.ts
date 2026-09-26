import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isTeacherActive(active?: boolean | string | null): boolean {
  if (active === false || active === 'false') return false;
  if (active === true || active === 'true') return true;
  return true;
}

export function formatClassName(
  c?: { name?: string | null; section?: string | null } | string | null
): string {
  if (!c) return '';
  if (typeof c === 'string') return c;
  const name = (c.name || '').trim();
  const section = (c.section || '').trim();
  if (!section) return name;

  const upperName = name.toUpperCase();
  const upperSec = section.toUpperCase();

  if (
    upperName.endsWith(`-${upperSec}`) ||
    upperName.endsWith(` - ${upperSec}`) ||
    upperName.endsWith(` (${upperSec})`) ||
    upperName.endsWith(` ${upperSec}`)
  ) {
    return name;
  }

  return `${name}-${section}`;
}
