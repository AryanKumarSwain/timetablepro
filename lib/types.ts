// ============================================================================
// Type Definitions for School Timetable, Attendance & Replacement Management
// ============================================================================

export type UserRole = 'super-admin' | 'admin' | 'teacher';

export type LeaveRequestStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

// ============================================================================
// Teacher
// ============================================================================

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  qualifications: string[];
  subjects: string[];
  active: boolean;
  joinDate: string;
  maxPeriodsPerWeek?: number;
  subjectSpecialtyId?: string;
}

// ============================================================================
// Subject
// ============================================================================

export interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  description?: string;
}

// ============================================================================
// Class
// ============================================================================

export interface Class {
  id: string;
  name: string;
  classLevel: number;
  section: string;
  strength: number;
  classTeacher: string;
  grade?: string;
  roomNumber?: string;
}

export interface SaasPlan {
  id: string;
  name: string;
  description?: string;
  teacherMin: number;
  teacherMax: number;
  priceMonthly: number;
  features: string[];
  reportEnabled: boolean;
  attendanceEnabled: boolean;
  homeworkEnabled: boolean;
  exportFormats: string[];
  watermarkRequired: boolean;
  schoolCount: number;
}

// ============================================================================
// Period
// ============================================================================

export interface Period {
  name: string;
  id: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  label: string;
}

// ============================================================================
// Weekly Timetable
// ============================================================================

export interface WeeklyTimetableEntry {
  id: string;
  classId: string;
  dayOfWeek: number;
  periodId: string;
  teacherId: string;
  subjectId: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Attendance
// ============================================================================

export interface DailyAttendance {
  id: string;
  classId: string;
  date: string;
  periodId: string;
  teacherId: string;
  subjectId: string;
  isAbsent: boolean;
  reason?: string;
  markedAt: string;
}

// ============================================================================
// Replacement
// ============================================================================

export interface Replacement {
  id: string;
  classId: string;
  date: string;
  periodId: string;
  periodName?: string;
  originalTeacherId: string;
  replacementTeacherId: string;
  replacementTeacherName?: string;
  subjectId: string;
  reason: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  confirmedAt?: string;
}

// ============================================================================
// User & Auth
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId?: string | null;
  teacherId?: string;
  leaveRequestStatus?: LeaveRequestStatus;
  phone?: string | null;
  countryCode?: string | null;
  onboardingDone?: boolean;
  active: boolean;
}

export interface AuthSession {
  user: User;
}

// ============================================================================
// Teacher Schedule
// ============================================================================

export interface TodayScheduleItem {
  periodId: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  isAbsent: boolean;
  replacement?: Replacement;
  attendance?: DailyAttendance;
}

// ============================================================================
// Dashboard
// ============================================================================

export interface AdminDashboardStats {
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  totalPeriods: number;
  todayAbsent: number;
  todayReplacements: number;
  pendingReplacements: number;
}

// ============================================================================
// Substitute Candidate
// ============================================================================

export interface SubstituteCandidate {
  teacherId: string;
  name: string;
  email: string;
  priority: 1 | 2 | 3;
  substitutionCountToday: number;
  warnings: string[];
}