import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  CalendarDays,
  ClipboardList,
  BarChart3,
  Building2,
  CreditCard,
  School,
  UserCircle,
  CalendarRange,
} from 'lucide-react';

export type AppRole = 'super-admin' | 'admin' | 'teacher';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const SUPER_ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
  { label: 'Schools', href: '/super-admin/dashboard', icon: School },
  { label: 'Plans', href: '/super-admin/dashboard', icon: CreditCard },
  { label: 'Analytics', href: '/super-admin/dashboard', icon: BarChart3 },
];

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Teachers', href: '/admin/masters/teachers', icon: Users },
  { label: 'Classes', href: '/admin/masters/classes', icon: GraduationCap },
  { label: 'Subjects', href: '/admin/masters/subjects', icon: BookOpen },
  { label: 'Weekly Timetable', href: '/admin/timetable', icon: CalendarDays },
  { label: 'Daily Desk', href: '/admin/daily-desk', icon: ClipboardList },
];

export const TEACHER_NAV: NavItem[] = [
  { label: 'Today', href: '/teacher/schedule', icon: LayoutDashboard },
  { label: 'Weekly Routine', href: '/teacher/weekly-schedule', icon: CalendarRange },
  { label: 'Profile', href: '/teacher/schedule', icon: UserCircle },
];

export function getNavForRole(role: AppRole): NavItem[] {
  switch (role) {
    case 'super-admin':
      return SUPER_ADMIN_NAV;
    case 'admin':
      return ADMIN_NAV;
    case 'teacher':
      return TEACHER_NAV;
    default:
      return [];
  }
}

export const COMMAND_LINKS = [
  ...ADMIN_NAV,
  ...TEACHER_NAV,
  ...SUPER_ADMIN_NAV,
].filter(
  (item, index, arr) => arr.findIndex((x) => x.href === item.href) === index
);
