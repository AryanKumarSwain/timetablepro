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

export type SaasPlan = {
  id: string;
  name: string;
  teacherMin: number;
  teacherMax: number;
  priceMonthly: number;
  schoolCount: number;
};
import type { CsvImportEntity, CsvImportResult, ParsedCsvRow } from './csv-import/types';


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
export async function getTeachers(schoolId?: string): Promise<Teacher[]> {
  const url = schoolId ? `/api/teachers?schoolId=${encodeURIComponent(schoolId)}` : '/api/teachers';
  return apiFetch(url);
}

export async function getTeacher(id: string): Promise<Teacher | null> {
  const list = await getTeachers();
  return list.find((t) => t.id === id) ?? null;
}

export async function createTeacher(data: Omit<Teacher, 'id'>): Promise<Teacher> {
  return apiFetch('/api/admin/teachers/create', {
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
// Bulk CSV import
// ============================================================================
export async function bulkImportCsv(
  entity: CsvImportEntity,
  rows: ParsedCsvRow[]
): Promise<CsvImportResult> {
  return apiFetch('/api/admin/bulk-import', {
    method: 'POST',
    body: JSON.stringify({ entity, rows }),
  });
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

export async function getPublishedWeeklyTimetable(
  classId?: string,
  teacherId?: string
): Promise<WeeklyTimetableEntry[]> {
  const qs = new URLSearchParams();
  if (classId) qs.set('classId', classId);
  if (teacherId) qs.set('teacherId', teacherId);
  return apiFetch(`/api/teacher/weekly-schedule${qs.toString() ? `?${qs.toString()}` : ''}`);
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
}, schoolId?: string): Promise<Replacement[]> {
  const params = new URLSearchParams();
  if (filters?.date) params.set('date', filters.date);
  if (filters?.status) params.set('status', filters.status);
  if (schoolId) params.set('schoolId', schoolId);
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
export type PlatformPlanMixItem = {
  plan: string;
  count: number;
};

export type PlatformGrowthDatum = {
  month: string;
  schools: number;
};

export type PlatformSummary = {
  activeSchools: number;
  trialSchools: number;
  platformTeachers: number;
  monthlyRecurringRevenue: string;
  monthlyRecurringRevenueRaw: number;
  systemHealth: string;
  latencyMs: number;
  planMix: PlatformPlanMixItem[];
  growthData: PlatformGrowthDatum[];
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

export async function getSuperAdminPlans(): Promise<SaasPlan[]> {
  return apiFetch('/api/super-admin/plans');
}

export async function fetchSaasPlans(): Promise<SaasPlan[]> {
  return apiFetch('/api/super-admin/plans');
}

export async function switchPlan(planId: string): Promise<{ success: boolean }> {
  return apiFetch('/api/admin/plan', {
    method: 'PATCH',
    body: JSON.stringify({ planId }),
  });
}

export async function submitTrialRequest(data: {
  reason: string;
  instituteName: string;
  contactNo: string;
  email: string;
  noOfTeachers: string;
}): Promise<{ success: boolean; message: string }> {
  return apiFetch('/api/trial-request', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createSuperAdminPlan(
  data: Pick<SaasPlan, 'name' | 'teacherMin' | 'teacherMax' | 'priceMonthly'>
): Promise<SaasPlan> {
  return apiFetch('/api/super-admin/plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSuperAdminPlan(
  id: string,
  data: Pick<SaasPlan, 'name' | 'teacherMin' | 'teacherMax' | 'priceMonthly'>
): Promise<SaasPlan> {
  return apiFetch(`/api/super-admin/plans/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSuperAdminPlan(id: string): Promise<void> {
  await apiFetch(`/api/super-admin/plans/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function getTodayScheduleForTeacher(
  teacherId?: string
): Promise<TodayScheduleItem[]> {
  const qs = teacherId ? `?teacherId=${encodeURIComponent(teacherId)}` : '';
  return apiFetch(`/api/teacher/schedule${qs}`);
}

// ============================================================================
// Timetables (builder)
// ============================================================================

export type TimetableSummary = {
  id: string;
  name: string;
  status: 'DRAFT' | 'PUBLISHED';
  slotCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TimetableDetail = TimetableSummary & {
  periods: Period[];
  classes: { id: string; name: string; grade: string; section: string; roomNumber: string }[];
  subjects: { id: string; name: string; code: string; color: string }[];
  teachers: { id: string; name: string; email: string; active: boolean }[];
  slots: {
    id: string;
    dayOfWeek: number;
    periodId: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    periodNumber: number;
    className: string;
    subjectName: string;
    teacherName: string;
  }[];
};

export type WorkloadData = {
  classWorkload: {
    classId: string;
    name: string;
    assigned: number;
    total: number;
    remaining: number;
    utilization: number;
  }[];
  teacherWorkload: {
    teacherId: string;
    name: string;
    assigned: number;
    total: number;
    remaining: number;
    utilization: number;
  }[];
};

export async function getTimetables(): Promise<TimetableSummary[]> {
  return apiFetch('/api/admin/timetables');
}

export async function createTimetable(name: string): Promise<TimetableSummary> {
  return apiFetch('/api/admin/timetables', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateTimetable(
  id: string,
  data: { name?: string; status?: 'DRAFT' | 'PUBLISHED' }
): Promise<TimetableSummary> {
  return apiFetch(`/api/admin/timetables/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTimetable(id: string): Promise<void> {
  await apiFetch(`/api/admin/timetables/${id}`, { method: 'DELETE' });
}

export async function getTimetableDetail(id: string): Promise<TimetableDetail> {
  return apiFetch(`/api/admin/timetables/${id}`);
}

export async function upsertTimetableSlot(
  timetableId: string,
  data: {
    dayOfWeek: number;
    periodId: string;
    classId: string;
    subjectId: string;
    teacherId: string;
  }
) {
  return apiFetch(`/api/admin/timetables/${timetableId}/slots`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteTimetableSlot(
  timetableId: string,
  slotId: string
): Promise<void> {
  await apiFetch(`/api/admin/timetables/${timetableId}/slots/${slotId}`, {
    method: 'DELETE',
  });
}

export async function getTimetableWorkload(
  timetableId: string
): Promise<WorkloadData> {
  return apiFetch(`/api/admin/timetables/${timetableId}/workload`);
}

export type DailyDeskGrid = {
  date: string;
  dayOfWeek: number;
  classes: { id: string; name: string }[];
  periods: Period[];
  // Transformed grid structure to map cleanly to your table rows:
  grid: {
    classId: string;
    className: string;
    slots: {
      periodId: string;
      periodNumber: number;
      label: string;         // e.g., "P1", "P2"
      startTime: string;
      endTime: string;
      empty: boolean;
      slotId?: string;
      subjectId?: string;
      subjectName?: string;
      teacherId?: string;
      teacherName?: string;
      isAbsent?: boolean;
      replacement: {
        id: string;
        replacementTeacherId: string;
        replacementTeacherName: string;
        status: 'PENDING' | 'APPROVED' | 'DECLINED'; // Clearer type instead of string
      } | null;
    }[];
  }[];
  attendance: DailyAttendance[];
  replacements: Replacement[];
};

export async function getDailyDeskGrid(date: string, schoolId?: string): Promise<any> {
  const url = schoolId 
    ? `/api/admin/daily-desk?date=${encodeURIComponent(date)}&schoolId=${encodeURIComponent(schoolId)}`
    : `/api/admin/daily-desk?date=${encodeURIComponent(date)}`;
  return apiFetch(url);
}

// ============================================================================
// Daily Reports
// ============================================================================

export type DailyReportData = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  reportDate: string;
  status: 'DRAFT' | 'SUBMITTED';
  submittedAt: string | null;
  entries: {
    id: string;
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    description: string;
    isCompleted: boolean;
  }[];
  scheduleSlots?: {
    periodId: string;
    periodNumber: number;
    startTime: string;
    endTime: string;
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    entryId?: string;
  }[];
  entryCount?: number;
};

export async function getTeacherReport(date = 'today'): Promise<DailyReportData> {
  return apiFetch(`/api/teacher/reports?date=${encodeURIComponent(date)}`);
}

export async function getTeacherReportHistory(): Promise<DailyReportData[]> {
  return apiFetch('/api/teacher/reports?history=true');
}

export async function updateTeacherReport(
  id: string,
  data: {
    status?: 'DRAFT' | 'SUBMITTED';
    entries?: { id: string; description?: string; isCompleted?: boolean }[];
  }
): Promise<DailyReportData> {
  return apiFetch(`/api/teacher/reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getAdminReports(filters?: {
  teacherName?: string;
  date?: string;
  classId?: string;
  subjectId?: string;
}): Promise<DailyReportData[]> {
  const params = new URLSearchParams();
  if (filters?.teacherName) params.set('teacherName', filters.teacherName);
  if (filters?.date) params.set('date', filters.date);
  if (filters?.classId) params.set('classId', filters.classId);
  if (filters?.subjectId) params.set('subjectId', filters.subjectId);
  const qs = params.toString();
  return apiFetch(`/api/admin/reports${qs ? `?${qs}` : ''}`);
}

export async function getAdminReport(id: string): Promise<DailyReportData> {
  return apiFetch(`/api/admin/reports/${id}`);
}

export async function getReports(filters?: {
  teacherName?: string;
  date?: string;
  classId?: string;
  subjectId?: string;
}): Promise<DailyReportData[]> {
  const params = new URLSearchParams();
  if (filters?.teacherName) params.set('teacherName', filters.teacherName);
  if (filters?.date) params.set('date', filters.date);
  if (filters?.classId) params.set('classId', filters.classId);
  if (filters?.subjectId) params.set('subjectId', filters.subjectId);
  const qs = params.toString();
  return apiFetch(`/api/reports${qs ? `?${qs}` : ''}`);
}

// CRITICAL EXPORT RESTORATION & JSON ERROR CAPTURE PATCH
export async function downloadReportsCsv(date: string): Promise<Blob> {
  const cleanDate = date.includes('T') ? date.split('T')[0] : date;
  const res = await fetch(`/api/reports/download/csv/${encodeURIComponent(cleanDate)}`, {
    credentials: 'include',
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = `Failed to download reports for ${cleanDate}`;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error) message = parsed.error;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  return res.blob();
}

export async function getDraftReportToday(): Promise<DailyReportData> {
  return apiFetch('/api/reports/draft/today');
}

export async function getReportClassesToday(): Promise<{ scheduleSlots: DailyReportData['scheduleSlots'] }> {
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  return apiFetch(`/api/reports/classes?day=${encodeURIComponent(dayName)}`);
}

export async function submitReport(data: {
  reportId?: string;
  date?: string;
  status?: 'DRAFT' | 'SUBMITTED';
  entries: Array<{
    id?: string;
    classId: string;
    subjectId: string;
    description: string;
    isCompleted: boolean;
  }>;
}): Promise<DailyReportData> {
  return apiFetch('/api/reports/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}