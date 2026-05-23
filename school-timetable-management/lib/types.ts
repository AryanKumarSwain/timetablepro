// ============================================================================
// Type Definitions for School Timetable, Attendance & Replacement Management
// ============================================================================

/**
 * Core Master Data Types
 */
export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  qualifications: string[];
  subjects: string[];
  active: boolean;
  joinDate: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  description?: string;
}

export interface Class {
  id: string;
  name: string;
  classLevel: number; // e.g., 1-12
  section: string; // A, B, C, etc.
  strength: number;
  classTeacher: string; // Teacher ID
}

export interface Period {
  id: string;
  periodNumber: number;
  startTime: string; // HH:mm format
  endTime: string;
  label: string; // "Period 1", "Lunch", etc.
}

/**
 * Timetable Types
 */
export interface WeeklyTimetableEntry {
  id: string;
  classId: string;
  dayOfWeek: number; // 0-6 (Mon-Sun)
  periodId: string;
  teacherId: string;
  subjectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyAttendance {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  periodId: string;
  teacherId: string;
  subjectId: string;
  isAbsent: boolean;
  reason?: string;
  markedAt: string;
}

export interface Replacement {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  periodId: string;
  originalTeacherId: string;
  replacementTeacherId: string;
  subjectId: string;
  reason: string; // "Leave", "Medical", "Other"
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt: string;
  confirmedAt?: string;
}

/**
 * Session/Auth Types
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "teacher";
  teacherId?: string; // populated if role is teacher
  active: boolean;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

/**
 * Composite/View Types
 */
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

export interface AdminDashboardStats {
  totalTeachers: number;
  totalClasses: number;
  todayAbsent: number;
  todayReplacements: number;
  pendingReplacements: number;
}
