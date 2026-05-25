import {
  Teacher,
  Subject,
  Class,
  Period,
  WeeklyTimetableEntry,
  DailyAttendance,
  Replacement,
  User,
} from './types';

// ============================================================================
// Teachers
// ============================================================================
export const MOCK_TEACHERS: Teacher[] = [
  {
    id: 'T001',
    name: 'Dr. Rajesh Kumar',
    email: 'rajesh@school.edu',
    phone: '9876543210',
    qualifications: ['B.Tech', 'M.Tech', 'Ph.D'],
    subjects: ['S001', 'S002'], // Physics, Mathematics
    active: true,
    joinDate: '2015-06-15',
  },
  {
    id: 'T002',
    name: 'Ms. Priya Sharma',
    email: 'priya@school.edu',
    phone: '9876543211',
    qualifications: ['B.A', 'M.A', 'B.Ed'],
    subjects: ['S003', 'S004'], // English, Hindi
    active: true,
    joinDate: '2016-07-20',
  },
  {
    id: 'T003',
    name: 'Mr. Vikram Singh',
    email: 'vikram@school.edu',
    phone: '9876543212',
    qualifications: ['B.Sc', 'M.Sc', 'B.Ed'],
    subjects: ['S002', 'S005'], // Mathematics, Chemistry
    active: true,
    joinDate: '2017-08-10',
  },
  {
    id: 'T004',
    name: 'Mrs. Anjali Verma',
    email: 'anjali@school.edu',
    phone: '9876543213',
    qualifications: ['B.A', 'M.A'],
    subjects: ['S003'], // English
    active: true,
    joinDate: '2018-09-05',
  },
  {
    id: 'T005',
    name: 'Mr. Arun Nair',
    email: 'arun@school.edu',
    phone: '9876543214',
    qualifications: ['B.Com', 'M.Com', 'B.Ed'],
    subjects: ['S006'], // Economics
    active: true,
    joinDate: '2019-01-15',
  },
  {
    id: 'T006',
    name: 'Ms. Sneha Patel',
    email: 'sneha@school.edu',
    phone: '9876543215',
    qualifications: ['B.Sc', 'M.Sc'],
    subjects: ['S001'], // Physics
    active: false,
    joinDate: '2020-03-20',
  },
];

// ============================================================================
// Subjects
// ============================================================================
export const MOCK_SUBJECTS: Subject[] = [
  {
    id: 'S001',
    name: 'Physics',
    code: 'PHY101',
    credits: 4,
    description: 'Fundamentals of Physics',
  },
  {
    id: 'S002',
    name: 'Mathematics',
    code: 'MAT101',
    credits: 4,
    description: 'Advanced Mathematics',
  },
  {
    id: 'S003',
    name: 'English',
    code: 'ENG101',
    credits: 3,
    description: 'English Language & Literature',
  },
  {
    id: 'S004',
    name: 'Hindi',
    code: 'HIN101',
    credits: 3,
    description: 'Hindi Language & Literature',
  },
  {
    id: 'S005',
    name: 'Chemistry',
    code: 'CHE101',
    credits: 4,
    description: 'Organic & Inorganic Chemistry',
  },
  {
    id: 'S006',
    name: 'Economics',
    code: 'ECO101',
    credits: 3,
    description: 'Micro & Macro Economics',
  },
  {
    id: 'S007',
    name: 'Biology',
    code: 'BIO101',
    credits: 4,
    description: 'General Biology',
  },
  {
    id: 'S008',
    name: 'Computer Science',
    code: 'CS101',
    credits: 4,
    description: 'Introduction to Computing',
  },
];

// ============================================================================
// Classes
// ============================================================================
export const MOCK_CLASSES: Class[] = [
  {
    id: 'C001',
    name: 'Class 10-A',
    classLevel: 10,
    section: 'A',
    strength: 45,
    classTeacher: 'T001',
  },
  {
    id: 'C002',
    name: 'Class 10-B',
    classLevel: 10,
    section: 'B',
    strength: 42,
    classTeacher: 'T002',
  },
  {
    id: 'C003',
    name: 'Class 12-A',
    classLevel: 12,
    section: 'A',
    strength: 50,
    classTeacher: 'T003',
  },
  {
    id: 'C004',
    name: 'Class 12-B',
    classLevel: 12,
    section: 'B',
    strength: 48,
    classTeacher: 'T004',
  },
  {
    id: 'C005',
    name: 'Class 9-A',
    classLevel: 9,
    section: 'A',
    strength: 40,
    classTeacher: 'T005',
  },
];

// ============================================================================
// Periods
// ============================================================================
export const MOCK_PERIODS: Period[] = [
  {
    id: 'P001',
    periodNumber: 1,
    startTime: '09:00',
    endTime: '09:45',
    label: 'Period 1',
  },
  {
    id: 'P002',
    periodNumber: 2,
    startTime: '09:45',
    endTime: '10:30',
    label: 'Period 2',
  },
  {
    id: 'P003',
    periodNumber: 3,
    startTime: '10:30',
    endTime: '11:15',
    label: 'Period 3',
  },
  {
    id: 'P004',
    periodNumber: 4,
    startTime: '11:15',
    endTime: '12:00',
    label: 'Period 4',
  },
  {
    id: 'P005',
    periodNumber: 5,
    startTime: '12:00',
    endTime: '12:45',
    label: 'Lunch Break',
  },
  {
    id: 'P006',
    periodNumber: 6,
    startTime: '12:45',
    endTime: '13:30',
    label: 'Period 5',
  },
  {
    id: 'P007',
    periodNumber: 7,
    startTime: '13:30',
    endTime: '14:15',
    label: 'Period 6',
  },
  {
    id: 'P008',
    periodNumber: 8,
    startTime: '14:15',
    endTime: '15:00',
    label: 'Period 7',
  },
];

// ============================================================================
// Weekly Timetable
// ============================================================================
export const MOCK_WEEKLY_TIMETABLE: WeeklyTimetableEntry[] = [
  // Class 10-A, Monday
  {
    id: 'TT001',
    classId: 'C001',
    dayOfWeek: 1,
    periodId: 'P001',
    teacherId: 'T001',
    subjectId: 'S001',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'TT002',
    classId: 'C001',
    dayOfWeek: 1,
    periodId: 'P002',
    teacherId: 'T002',
    subjectId: 'S003',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'TT003',
    classId: 'C001',
    dayOfWeek: 1,
    periodId: 'P003',
    teacherId: 'T003',
    subjectId: 'S002',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'TT004',
    classId: 'C001',
    dayOfWeek: 1,
    periodId: 'P004',
    teacherId: 'T005',
    subjectId: 'S006',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  // Period 5 is lunch, skip
  {
    id: 'TT005',
    classId: 'C001',
    dayOfWeek: 1,
    periodId: 'P006',
    teacherId: 'T003',
    subjectId: 'S002',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'TT006',
    classId: 'C001',
    dayOfWeek: 1,
    periodId: 'P007',
    teacherId: 'T001',
    subjectId: 'S001',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },

  // Class 10-A, Tuesday
  {
    id: 'TT007',
    classId: 'C001',
    dayOfWeek: 2,
    periodId: 'P001',
    teacherId: 'T002',
    subjectId: 'S003',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'TT008',
    classId: 'C001',
    dayOfWeek: 2,
    periodId: 'P002',
    teacherId: 'T003',
    subjectId: 'S002',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'TT009',
    classId: 'C001',
    dayOfWeek: 2,
    periodId: 'P003',
    teacherId: 'T001',
    subjectId: 'S001',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'TT010',
    classId: 'C001',
    dayOfWeek: 2,
    periodId: 'P004',
    teacherId: 'T004',
    subjectId: 'S004',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'TT011',
    classId: 'C001',
    dayOfWeek: 2,
    periodId: 'P006',
    teacherId: 'T005',
    subjectId: 'S006',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'TT012',
    classId: 'C001',
    dayOfWeek: 2,
    periodId: 'P007',
    teacherId: 'T002',
    subjectId: 'S003',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },

  // Class 10-B, Monday
  {
    id: 'TT013',
    classId: 'C002',
    dayOfWeek: 1,
    periodId: 'P001',
    teacherId: 'T002',
    subjectId: 'S003',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'TT014',
    classId: 'C002',
    dayOfWeek: 1,
    periodId: 'P002',
    teacherId: 'T001',
    subjectId: 'S001',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'TT015',
    classId: 'C002',
    dayOfWeek: 1,
    periodId: 'P003',
    teacherId: 'T005',
    subjectId: 'S006',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
];

// ============================================================================
// Daily Attendance (for today)
// ============================================================================
export const MOCK_DAILY_ATTENDANCE: DailyAttendance[] = [
  {
    id: 'A001',
    classId: 'C001',
    date: getTodayDate(),
    periodId: 'P001',
    teacherId: 'T001',
    subjectId: 'S001',
    isAbsent: false,
    markedAt: new Date().toISOString(),
  },
  {
    id: 'A002',
    classId: 'C001',
    date: getTodayDate(),
    periodId: 'P002',
    teacherId: 'T002',
    subjectId: 'S003',
    isAbsent: true,
    reason: 'Medical Leave',
    markedAt: new Date().toISOString(),
  },
  {
    id: 'A003',
    classId: 'C002',
    date: getTodayDate(),
    periodId: 'P001',
    teacherId: 'T002',
    subjectId: 'S003',
    isAbsent: false,
    markedAt: new Date().toISOString(),
  },
];

// ============================================================================
// Replacements (for today and upcoming)
// ============================================================================
export const MOCK_REPLACEMENTS: Replacement[] = [
  {
    id: 'R001',
    classId: 'C001',
    date: getTodayDate(),
    periodId: 'P002',
    originalTeacherId: 'T002',
    replacementTeacherId: 'T004',
    subjectId: 'S003',
    reason: 'Medical',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
  },
  {
    id: 'R002',
    classId: 'C002',
    date: getTodayDate(),
    periodId: 'P003',
    originalTeacherId: 'T003',
    replacementTeacherId: 'T001',
    subjectId: 'S002',
    reason: 'Leave',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'R003',
    classId: 'C003',
    date: getTodayDate(),
    periodId: 'P004',
    originalTeacherId: 'T005',
    replacementTeacherId: 'T003',
    subjectId: 'S006',
    reason: 'Other',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
];

// ============================================================================
// Users (Admin & Teachers for login)
// ============================================================================
export const MOCK_USERS: User[] = [
  {
    id: 'U001',
    email: 'admin@school.edu',
    name: 'Admin User',
    role: 'admin',
    active: true,
  },
  {
    id: 'U002',
    email: 'rajesh@school.edu',
    name: 'Dr. Rajesh Kumar',
    role: 'teacher',
    teacherId: 'T001',
    active: true,
  },
  {
    id: 'U003',
    email: 'priya@school.edu',
    name: 'Ms. Priya Sharma',
    role: 'teacher',
    teacherId: 'T002',
    active: true,
  },
  {
    id: 'U004',
    email: 'vikram@school.edu',
    name: 'Mr. Vikram Singh',
    role: 'teacher',
    teacherId: 'T003',
    active: true,
  },
  {
    id: 'U005',
    email: 'anjali@school.edu',
    name: 'Mrs. Anjali Verma',
    role: 'teacher',
    teacherId: 'T004',
    active: true,
  },
  {
    id: 'U006',
    email: 'arun@school.edu',
    name: 'Mr. Arun Nair',
    role: 'teacher',
    teacherId: 'T005',
    active: true,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================
function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export function getTeacherById(id: string): Teacher | undefined {
  return MOCK_TEACHERS.find((t) => t.id === id);
}

export function getSubjectById(id: string): Subject | undefined {
  return MOCK_SUBJECTS.find((s) => s.id === id);
}

export function getClassById(id: string): Class | undefined {
  return MOCK_CLASSES.find((c) => c.id === id);
}

export function getPeriodById(id: string): Period | undefined {
  return MOCK_PERIODS.find((p) => p.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return MOCK_USERS.find((u) => u.email === email);
}

export function getTodayScheduleForTeacher(teacherId: string) {
  // This would normally query from a database
  // For now, it returns hardcoded data for T001
  if (teacherId !== 'T001') return [];
  return [
    {
      periodId: 'P001',
      periodNumber: 1,
      startTime: '09:00',
      endTime: '09:45',
      classId: 'C001',
      className: 'Class 10-A',
      subjectId: 'S001',
      subjectName: 'Physics',
      isAbsent: false,
    },
    {
      periodId: 'P006',
      periodNumber: 5,
      startTime: '12:45',
      endTime: '13:30',
      classId: 'C001',
      className: 'Class 10-A',
      subjectId: 'S001',
      subjectName: 'Physics',
      isAbsent: false,
    },
  ];
}
