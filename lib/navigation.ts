import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  CalendarDays,
  ClipboardList,
  BarChart3,
  School,
  CreditCard,
  FileText,
  History,
  UserCircle,
  CalendarRange,
  Table2,
  UserCheck,
  Settings,
  BookMarked,
} from 'lucide-react';

export type AppRole = 'super-admin' | 'admin' | 'teacher';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  featureKey?: 'reports' | 'attendance' | 'homework' | 'lesson-planning';
}


export const SUPER_ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
  { label: 'Schools', href: '/super-admin/schools', icon: School },      // Change from dashboard
  { label: 'Plans', href: '/super-admin/plans', icon: CreditCard },      // Change from dashboard
  { label: 'Analytics', href: '/super-admin/analytics', icon: BarChart3 },// Change from dashboard
];
export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Teachers', href: '/admin/teachers', icon: Users },
  { label: 'Classes', href: '/admin/classes', icon: GraduationCap },
  { label: 'Subjects', href: '/admin/subjects', icon: BookOpen },
  { label: 'Attendance', href: '/admin/attendance', icon: UserCheck, featureKey: 'attendance' },
  { label: 'Timetables', href: '/admin/timetables', icon: Table2 },
  { label: 'Lesson Planning', href: '/admin/lesson-planning', icon: BookMarked, featureKey: 'lesson-planning' },
  { label: 'Daily Desk', href: '/admin/daily-desk', icon: ClipboardList },
  { label: 'Reports', href: '/admin/reports', icon: FileText, featureKey: 'reports' },
  { label: 'Homework', href: '/admin/homework', icon: BookOpen, featureKey: 'homework' },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
  { label: 'Billing & Upgrade', href: '/admin/upgrade', icon: CreditCard },
];

export const TEACHER_NAV: NavItem[] = [
  { label: 'Today', href: '/teacher/schedule', icon: LayoutDashboard },
  { label: 'Weekly Routine', href: '/teacher/weekly-schedule', icon: CalendarRange },
  { label: 'Lesson Planning', href: '/teacher/lesson-planning', icon: BookMarked, featureKey: 'lesson-planning' },
  { label: "Today's Report", href: '/teacher/report/today', icon: FileText },
  { label: 'Report History', href: '/teacher/report/history', icon: History },
  { label: 'Settings', href: '/teacher/settings', icon: Settings },
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

export function getCommandLinksForRole(role: AppRole): NavItem[] {
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