import {
  MOCK_TEACHERS,
  MOCK_SUBJECTS,
  MOCK_CLASSES,
  MOCK_PERIODS,
  MOCK_WEEKLY_TIMETABLE,
  MOCK_DAILY_ATTENDANCE,
  MOCK_REPLACEMENTS,
  MOCK_USERS,
  getTeacherById,
  getSubjectById,
  getClassById,
  getPeriodById,
  getUserByEmail,
} from './mock-data';
import {
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
  AdminDashboardStats,
} from './types';

// Simulated in-memory data stores (would be database in production)
let teachers = [...MOCK_TEACHERS];
let subjects = [...MOCK_SUBJECTS];
let classes = [...MOCK_CLASSES];
let periods = [...MOCK_PERIODS];
let weeklyTimetable = [...MOCK_WEEKLY_TIMETABLE];
let dailyAttendance = [...MOCK_DAILY_ATTENDANCE];
let replacements = [...MOCK_REPLACEMENTS];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================================
// Authentication Services
// ============================================================================
export async function loginUser(
  email: string,
  password: string
): Promise<AuthSession | null> {
  await delay(300); // Simulate network delay

  const user = MOCK_USERS.find((u) => u.email === email);
  if (!user) return null;

  // Mock password validation - in reality, validate against bcrypt hash
  return {
    user,
    token: `mock-token-${user.id}-${Date.now()}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

// ============================================================================
// Teacher CRUD Services
// ============================================================================
export async function getTeachers(): Promise<Teacher[]> {
  await delay(200);
  return [...teachers];
}

export async function getTeacher(id: string): Promise<Teacher | null> {
  await delay(100);
  return teachers.find((t) => t.id === id) || null;
}

export async function createTeacher(data: Omit<Teacher, 'id'>): Promise<Teacher> {
  await delay(300);
  const newTeacher: Teacher = {
    ...data,
    id: `T${Date.now()}`,
  };
  teachers.push(newTeacher);
  return newTeacher;
}

export async function updateTeacher(id: string, data: Partial<Teacher>): Promise<Teacher | null> {
  await delay(300);
  const index = teachers.findIndex((t) => t.id === id);
  if (index === -1) return null;

  teachers[index] = { ...teachers[index], ...data, id };
  return teachers[index];
}

export async function deleteTeacher(id: string): Promise<boolean> {
  await delay(300);
  const index = teachers.findIndex((t) => t.id === id);
  if (index === -1) return false;

  teachers.splice(index, 1);
  return true;
}

// ============================================================================
// Subject CRUD Services
// ============================================================================
export async function getSubjects(): Promise<Subject[]> {
  await delay(200);
  return [...subjects];
}

export async function getSubject(id: string): Promise<Subject | null> {
  await delay(100);
  return subjects.find((s) => s.id === id) || null;
}

export async function createSubject(data: Omit<Subject, 'id'>): Promise<Subject> {
  await delay(300);
  const newSubject: Subject = {
    ...data,
    id: `S${Date.now()}`,
  };
  subjects.push(newSubject);
  return newSubject;
}

export async function updateSubject(id: string, data: Partial<Subject>): Promise<Subject | null> {
  await delay(300);
  const index = subjects.findIndex((s) => s.id === id);
  if (index === -1) return null;

  subjects[index] = { ...subjects[index], ...data, id };
  return subjects[index];
}

export async function deleteSubject(id: string): Promise<boolean> {
  await delay(300);
  const index = subjects.findIndex((s) => s.id === id);
  if (index === -1) return false;

  subjects.splice(index, 1);
  return true;
}

// ============================================================================
// Class CRUD Services
// ============================================================================
export async function getClasses(): Promise<Class[]> {
  await delay(200);
  return [...classes];
}

export async function getClass(id: string): Promise<Class | null> {
  await delay(100);
  return classes.find((c) => c.id === id) || null;
}

export async function createClass(data: Omit<Class, 'id'>): Promise<Class> {
  await delay(300);
  const newClass: Class = {
    ...data,
    id: `C${Date.now()}`,
  };
  classes.push(newClass);
  return newClass;
}

export async function updateClass(id: string, data: Partial<Class>): Promise<Class | null> {
  await delay(300);
  const index = classes.findIndex((c) => c.id === id);
  if (index === -1) return null;

  classes[index] = { ...classes[index], ...data, id };
  return classes[index];
}

export async function deleteClass(id: string): Promise<boolean> {
  await delay(300);
  const index = classes.findIndex((c) => c.id === id);
  if (index === -1) return false;

  classes.splice(index, 1);
  return true;
}

// ============================================================================
// Period CRUD Services
// ============================================================================
export async function getPeriods(): Promise<Period[]> {
  await delay(200);
  return [...periods];
}

// ============================================================================
// Weekly Timetable Services
// ============================================================================
export async function getWeeklyTimetable(): Promise<WeeklyTimetableEntry[]> {
  await delay(300);
  return [...weeklyTimetable];
}

export async function getWeeklyTimetableForClass(
  classId: string
): Promise<WeeklyTimetableEntry[]> {
  await delay(300);
  return weeklyTimetable.filter((t) => t.classId === classId);
}

export async function createWeeklyTimetableEntry(
  data: Omit<WeeklyTimetableEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WeeklyTimetableEntry> {
  await delay(300);
  const entry: WeeklyTimetableEntry = {
    ...data,
    id: `TT${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  weeklyTimetable.push(entry);
  return entry;
}

export async function deleteWeeklyTimetableEntry(id: string): Promise<boolean> {
  await delay(300);
  const index = weeklyTimetable.findIndex((t) => t.id === id);
  if (index === -1) return false;
  weeklyTimetable.splice(index, 1);
  return true;
}

// ============================================================================
// Daily Attendance Services
// ============================================================================
export async function getDailyAttendance(date: string): Promise<DailyAttendance[]> {
  await delay(300);
  return dailyAttendance.filter((a) => a.date === date);
}

export async function markAttendance(
  classId: string,
  periodId: string,
  teacherId: string,
  date: string,
  isAbsent: boolean,
  reason?: string
): Promise<DailyAttendance> {
  await delay(300);

  // Check if attendance already exists
  const existing = dailyAttendance.find(
    (a) => a.classId === classId && a.periodId === periodId && a.date === date
  );

  if (existing) {
    existing.isAbsent = isAbsent;
    existing.reason = reason;
    existing.markedAt = new Date().toISOString();
    return existing;
  }

  // Create new attendance record
  const attendance: DailyAttendance = {
    id: `A${Date.now()}`,
    classId,
    date,
    periodId,
    teacherId,
    subjectId: '', // Would be fetched from timetable
    isAbsent,
    reason,
    markedAt: new Date().toISOString(),
  };

  dailyAttendance.push(attendance);
  return attendance;
}

// ============================================================================
// Replacement Services
// ============================================================================
export async function getReplacements(filters?: {
  date?: string;
  status?: string;
}): Promise<Replacement[]> {
  await delay(300);
  let result = [...replacements];

  if (filters?.date) {
    result = result.filter((r) => r.date === filters.date);
  }
  if (filters?.status) {
    result = result.filter((r) => r.status === filters.status);
  }

  return result;
}

export async function createReplacement(
  data: Omit<Replacement, 'id' | 'createdAt'>
): Promise<Replacement> {
  await delay(300);
  const replacement: Replacement = {
    ...data,
    id: `R${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  replacements.push(replacement);
  return replacement;
}

export async function updateReplacementStatus(
  id: string,
  status: Replacement['status']
): Promise<Replacement | null> {
  await delay(300);
  const replacement = replacements.find((r) => r.id === id);
  if (!replacement) return null;

  replacement.status = status;
  if (status === 'confirmed') {
    replacement.confirmedAt = new Date().toISOString();
  }

  return replacement;
}

export async function deleteReplacement(id: string): Promise<boolean> {
  await delay(300);
  const index = replacements.findIndex((r) => r.id === id);
  if (index === -1) return false;
  replacements.splice(index, 1);
  return true;
}

// ============================================================================
// Dashboard/Analytics Services
// ============================================================================
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  await delay(500);

  const today = new Date().toISOString().split('T')[0];
  const todayAbsentCount = dailyAttendance.filter(
    (a) => a.date === today && a.isAbsent
  ).length;
  const pendingReplacements = replacements.filter((r) => r.status === 'pending').length;
  const todayReplacementsCount = replacements.filter((r) => r.date === today).length;

  return {
    totalTeachers: teachers.length,
    totalClasses: classes.length,
    todayAbsent: todayAbsentCount,
    todayReplacements: todayReplacementsCount,
    pendingReplacements,
  };
}

export async function getTodayScheduleForTeacher(teacherId: string): Promise<TodayScheduleItem[]> {
  await delay(400);

  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay();

  // Get weekly timetable for today
  const todayEntries = weeklyTimetable.filter(
    (t) => t.teacherId === teacherId && t.dayOfWeek === dayOfWeek
  );

  const scheduleItems: TodayScheduleItem[] = todayEntries.map((entry) => {
    const period = periods.find((p) => p.id === entry.periodId);
    const classData = classes.find((c) => c.id === entry.classId);
    const subject = subjects.find((s) => s.id === entry.subjectId);

    // Check for attendance
    const attendance = dailyAttendance.find(
      (a) => a.date === today && a.periodId === entry.periodId
    );

    // Check for replacement
    const replacement = replacements.find(
      (r) => r.date === today && r.periodId === entry.periodId && r.originalTeacherId === teacherId
    );

    return {
      periodId: entry.periodId,
      periodNumber: period?.periodNumber || 0,
      startTime: period?.startTime || '',
      endTime: period?.endTime || '',
      classId: entry.classId,
      className: classData?.name || '',
      subjectId: entry.subjectId,
      subjectName: subject?.name || '',
      isAbsent: attendance?.isAbsent || false,
      replacement,
      attendance,
    };
  });

  return scheduleItems;
}
