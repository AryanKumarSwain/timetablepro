import type {
  Teacher as DbTeacher,
  Subject as DbSubject,
  ClassRoom,
  Period as DbPeriod,
  WeeklyTimetableSlot,
  TeacherAttendance,
  ReplacementAssignment,
} from '@prisma/client';
import type {
  Teacher,
  Subject,
  Class,
  Period,
  WeeklyTimetableEntry,
  DailyAttendance,
  Replacement,
} from '@/lib/types';

export function mapTeacher(t: DbTeacher): Teacher {
  return {
    id: t.id,
    name: t.name,
    email: t.email,
    phone: t.phone,
    qualifications: [],
    subjects: [t.subjectSpecialtyId],
    active: true,
    joinDate: '',
    maxPeriodsPerWeek: t.maxPeriodsPerWeek,
    subjectSpecialtyId: t.subjectSpecialtyId,
  };
}

export function mapSubject(s: DbSubject): Subject {
  return {
    id: s.id,
    name: s.name,
    code: s.code,
    credits: 0,
  };
}

export function mapClass(c: ClassRoom): Class {
  return {
    id: c.id,
    name: c.name,
    classLevel: parseInt(c.grade, 10) || 0,
    section: c.section,
    strength: 0,
    classTeacher: '',
    grade: c.grade,
    roomNumber: c.roomNumber,
  };
}

export function mapPeriod(p: DbPeriod): Period {
  return {
    id: p.id,
    periodNumber: p.periodNumber,
    startTime: p.startTime,
    endTime: p.endTime,
    label: `Period ${p.periodNumber}`,
  };
}

export function mapWeeklySlot(s: WeeklyTimetableSlot): WeeklyTimetableEntry {
  return {
    id: s.id,
    classId: s.classId,
    dayOfWeek: s.dayOfWeek,
    periodId: s.periodId,
    teacherId: s.teacherId,
    subjectId: s.subjectId,
    createdAt: '',
    updatedAt: '',
  };
}

export function mapTeacherAttendance(
  a: TeacherAttendance,
  meta?: { classId?: string; periodId?: string; subjectId?: string }
): DailyAttendance {
  return {
    id: a.id,
    classId: meta?.classId ?? '',
    date: a.date,
    periodId: meta?.periodId ?? '',
    teacherId: a.teacherId,
    subjectId: meta?.subjectId ?? '',
    isAbsent: a.status === 'ABSENT',
    markedAt: a.date,
  };
}

export function mapReplacement(r: ReplacementAssignment): Replacement {
  const reasonMap: Record<string, Replacement['reason']> = {
    CASUAL_LEAVE: 'Leave',
    MEDICAL_LEAVE: 'Medical',
    OTHER_DUTY: 'Other',
  };
  const statusMap: Record<string, Replacement['status']> = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
  };
  return {
    id: r.id,
    classId: r.classId,
    date: r.date,
    periodId: r.periodId,
    originalTeacherId: r.originalTeacherId,
    replacementTeacherId: r.replacementTeacherId,
    subjectId: '',
    reason: reasonMap[r.reason] ?? 'Leave',
    status: statusMap[r.status] ?? 'pending',
    createdAt: r.date,
  };
}

export function mapLeaveReason(
  reason: string
): 'CASUAL_LEAVE' | 'MEDICAL_LEAVE' | 'OTHER_DUTY' {
  const normalized = reason.toLowerCase();
  if (normalized.includes('medical')) return 'MEDICAL_LEAVE';
  if (normalized.includes('other') || normalized.includes('duty')) {
    return 'OTHER_DUTY';
  }
  return 'CASUAL_LEAVE';
}
