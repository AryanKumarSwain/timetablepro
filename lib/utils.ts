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
