import { apiFetch } from './api-client';
import type {
  Teacher,
  Subject,
  Class,
  Period,
  WeeklyTimetableEntry,
  DailyAttendance,
  Replacement,
  User,
  AuthSession,
  TodayScheduleItem,
  SubstituteCandidate,
} from './types';

// ============================================================================
// Authentication
// ============================================================================
export async function loginUser(
  email: string,
  password: string
): Promise<AuthSession & { redirectTo: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.error ??
      (res.status >= 500
        ? 'Server error — check database connection and run npm run db:seed'
        : 'Invalid email or password')
    );
  }
  return { user: data.user, redirectTo: data.redirectTo };
}

export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const data = await apiFetch<{ user: User }>('/api/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
}

// ============================================================================
// Teachers
// ============================================================================
export async function getTeachers(): Promise<Teacher[]> {
  return apiFetch('/api/teachers');
}

export async function getTeacher(id: string): Promise<Teacher | null> {
  const list = await getTeachers();
  return list.find((t) => t.id === id) ?? null;
}

export async function createTeacher(data: Omit<Teacher, 'id'>): Promise<Teacher> {
  return apiFetch('/api/teachers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTeacher(
  id: string,
  data: Partial<Teacher>
): Promise<Teacher | null> {
  return apiFetch(`/api/teachers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTeacher(id: string): Promise<boolean> {
  await apiFetch(`/api/teachers/${id}`, { method: 'DELETE' });
  return true;
}

// ============================================================================
// Subjects
// ============================================================================
export async function getSubjects(): Promise<Subject[]> {
  return apiFetch('/api/subjects');
}

export async function getSubject(id: string): Promise<Subject | null> {
  const list = await getSubjects();
  return list.find((s) => s.id === id) ?? null;
}

export async function createSubject(data: Omit<Subject, 'id'>): Promise<Subject> {
  return apiFetch('/api/subjects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSubject(
  id: string,
  data: Partial<Subject>
): Promise<Subject | null> {
  return apiFetch(`/api/subjects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSubject(id: string): Promise<boolean> {
  await apiFetch(`/api/subjects/${id}`, { method: 'DELETE' });
  return true;
}

// ============================================================================
// Classes
// ============================================================================
export async function getClasses(): Promise<Class[]> {
  return apiFetch('/api/classes');
}

export async function getClass(id: string): Promise<Class | null> {
  const list = await getClasses();
  return list.find((c) => c.id === id) ?? null;
}

export async function createClass(data: Omit<Class, 'id'>): Promise<Class> {
  return apiFetch('/api/classes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateClass(
  id: string,
  data: Partial<Class>
): Promise<Class | null> {
  return apiFetch(`/api/classes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteClass(id: string): Promise<boolean> {
  await apiFetch(`/api/classes/${id}`, { method: 'DELETE' });
  return true;
}

// ============================================================================
// Periods & Timetable
// ============================================================================
export async function getPeriods(): Promise<Period[]> {
  return apiFetch('/api/periods');
}

export async function getWeeklyTimetable(): Promise<WeeklyTimetableEntry[]> {
  return apiFetch('/api/timetable');
}

export async function getWeeklyTimetableForClass(
  classId: string
): Promise<WeeklyTimetableEntry[]> {
  return apiFetch(`/api/timetable?classId=${encodeURIComponent(classId)}`);
}

export async function createWeeklyTimetableEntry(
  data: Omit<WeeklyTimetableEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WeeklyTimetableEntry> {
  return apiFetch('/api/timetable', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteWeeklyTimetableEntry(id: string): Promise<boolean> {
  await apiFetch(`/api/timetable/${id}`, { method: 'DELETE' });
  return true;
}

// ============================================================================
// Attendance & Replacements
// ============================================================================
export async function getDailyAttendance(date: string): Promise<DailyAttendance[]> {
  return apiFetch(`/api/attendance?date=${encodeURIComponent(date)}`);
}

export async function markAttendance(
  classId: string,
  periodId: string,
  teacherId: string,
  date: string,
  isAbsent: boolean,
  reason?: string
): Promise<DailyAttendance> {
  return apiFetch('/api/attendance', {
    method: 'POST',
    body: JSON.stringify({
      classId,
      periodId,
      teacherId,
      date,
      isAbsent,
      reason,
    }),
  });
}

export async function getReplacements(filters?: {
  date?: string;
  status?: string;
}): Promise<Replacement[]> {
  const params = new URLSearchParams();
  if (filters?.date) params.set('date', filters.date);
  if (filters?.status) params.set('status', filters.status);
  const qs = params.toString();
  return apiFetch(`/api/replacements${qs ? `?${qs}` : ''}`);
}

export async function createReplacement(
  data: Omit<Replacement, 'id' | 'createdAt'>
): Promise<Replacement> {
  return apiFetch('/api/replacements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateReplacementStatus(
  id: string,
  status: Replacement['status']
): Promise<Replacement | null> {
  return apiFetch(`/api/replacements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function deleteReplacement(id: string): Promise<boolean> {
  await apiFetch(`/api/replacements/${id}`, { method: 'DELETE' });
  return true;
}

// ============================================================================
// Substitution engine (admin)
// ============================================================================
export async function findSubstitutesForAbsence(input: {
  date: string;
  periodId: string;
  classId: string;
  originalTeacherId: string;
  subjectId?: string;
  markAbsent?: boolean;
}): Promise<{
  candidates: SubstituteCandidate[];
  warnings: { teacherId: string; teacherName: string; message: string }[];
}> {
  if (input.markAbsent) {
    return apiFetch('/api/admin/substitution', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
  const params = new URLSearchParams({
    date: input.date,
    periodId: input.periodId,
    classId: input.classId,
    originalTeacherId: input.originalTeacherId,
  });
  if (input.subjectId) params.set('subjectId', input.subjectId);
  return apiFetch(`/api/admin/substitution?${params}`);
}

export async function cloneOperationalDayToTomorrow(
  date?: string
): Promise<{
  sourceDate: string;
  targetDate: string;
  attendanceCloned: number;
  replacementsCloned: number;
}> {
  return apiFetch('/api/admin/clone-day', {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
}

// ============================================================================
// Dashboard
// ============================================================================

export type AdminDashboardStats = {
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  totalPeriods: number;
  todayAttendance: number;
  pendingReplacements: number;
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  return apiFetch('/api/dashboard/stats');
}

// ============================================================================
// Super Admin platform analytics
// ============================================================================
export type PlatformSummary = {
  activeSchools: number;
  trialSchools: number;
  platformTeachers: number;
  monthlyRecurringRevenue: string;
  monthlyRecurringRevenueRaw: number;
  systemHealth: string;
  latencyMs: number;
};

export type PlatformSchoolRow = {
  id: string;
  name: string;
  licenseStatus: string;
  licenseDate: string;
  planName: string;
  adminEmails: string[];
};

export type PlatformTeacherDistribution = {
  schoolId: string;
  schoolName: string;
  teacherCount: number;
};

export type PlatformRevenueDetail = {
  activeMrr: number;
  transactions: {
    schoolId: string;
    schoolName: string;
    transactionDate: string;
    planName: string;
    planPrice: number;
    licenseStatus: string;
  }[];
  tierContributions: {
    planName: string;
    count: number;
    subtotal: number;
  }[];
};

export type PlatformHealthProbe = {
  regionId: string;
  regionLabel: string;
  statusCode: number;
  latencyMs: number;
  message: string;
};

export async function getPlatformSummary(): Promise<PlatformSummary> {
  return apiFetch('/api/super-admin/platform');
}

export async function getPlatformSchools(): Promise<PlatformSchoolRow[]> {
  return apiFetch('/api/super-admin/platform?panel=schools');
}

export async function getPlatformTeacherDistribution(): Promise<
  PlatformTeacherDistribution[]
> {
  return apiFetch('/api/super-admin/platform?panel=teachers');
}

export async function getPlatformRevenueDetail(): Promise<PlatformRevenueDetail> {
  return apiFetch('/api/super-admin/platform?panel=revenue');
}

export async function getPlatformHealthDetail(): Promise<{
  uptimePercent: string;
  probes: PlatformHealthProbe[];
}> {
  return apiFetch('/api/super-admin/platform?panel=health');
}

export async function getTodayScheduleForTeacher(
  teacherId?: string
): Promise<TodayScheduleItem[]> {
  const qs = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : '';
  return apiFetch(`/api/teacher/schedule${qs}`);
}
