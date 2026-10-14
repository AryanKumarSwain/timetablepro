import type { TutorialModuleInfo } from './tutorial-types';

export const TEACHER_TUTORIAL_MODULES: TutorialModuleInfo[] = [
  {
    key: 'teacher-schedule',
    name: "Today's Timeline & Schedule",
    category: 'Foundation',
    route: '/teacher/schedule',
    iconName: 'LayoutDashboard',
    tagline: "Your live daily teaching timeline and cover assignments",
    purpose:
      "Displays today's classes in chronological period order with start/end timings, classroom names, and subject details. Automatically highlights proxy/substitution coverage and tracks your daily workload and burnout score.",
    whereToFind:
      'Click "Today" in the left sidebar or navigate to /teacher/schedule.',
    primaryAction:
      'Check your daily teaching periods, track upcoming class rooms, and review proxy cover duties.',
    importantControls: [
      'Weekly Burnout Meter (tracks load index: Healthy, Moderate, or High)',
      'Sessions Today counter (shows regular sessions + proxy cover events)',
      'Chronological Timeline with period status badges (Scheduled, Proxy, Absent)',
      'Summary metrics at the bottom (Total Classes, Covers, and Absences)',
    ],
    nextSteps:
      'After checking your morning schedule, head to the Weekly Routine to plan ahead or to Lesson Planning for class preparation.',
    proTip:
      'If you have been assigned as a substitute teacher, the class will be highlighted with a purple "Proxy/Substitution" badge on your timeline.',
    role: 'teacher',
  },
  {
    key: 'teacher-weekly-schedule',
    name: 'Weekly Routine Matrix',
    category: 'Scheduling & Operations',
    route: '/teacher/weekly-schedule',
    iconName: 'CalendarRange',
    tagline: 'Full-week master routine grid with 1-click leave requests',
    purpose:
      'Presents your complete weekly timetable across Monday to Saturday. Allows you to filter by specific classes/batches, submit single-period or full-day absent requests directly to the Daily Desk, and attach personal lesson TODOs to individual timetable slots.',
    whereToFind:
      'Click "Weekly Routine" in the sidebar or visit /teacher/weekly-schedule.',
    primaryAction:
      'Inspect your complete weekly teaching distribution, request planned leaves, or add slot preparation TODOs.',
    importantControls: [
      'Batch Matrix Dropdown to filter by specific classes or view all classes',
      'Live Timetable & Read-Only synchronization status indicators',
      'Mark Absent button on any slot to notify admin of upcoming absence',
      'Full-Day Absence button to request leave for an entire academic day',
      'Add TODO button on slots to save lesson reminders and prep checklists',
    ],
    nextSteps:
      'Use the slot TODO feature to prep materials beforehand; your saved TODOs will automatically sync into your daily teaching reports.',
    proTip:
      'Slot TODOs automatically migrate into your "Today\'s Report" when that period arrives, saving you from re-typing lesson notes.',
    role: 'teacher',
  },
  {
    key: 'teacher-lesson-planning',
    name: 'Lesson Planning & Syllabus',
    category: 'Academic Monitoring',
    route: '/teacher/lesson-planning',
    iconName: 'BookMarked',
    tagline: 'Track syllabus chapters, learning objectives, and dates',
    purpose:
      'Helps you systematically organize your academic curriculum by mapping textbook chapters, topics, and estimated durations to future timetable periods.',
    whereToFind:
      'Click "Lesson Planning" in the sidebar or visit /teacher/lesson-planning.',
    primaryAction:
      'Create lesson plan entries with learning outcomes and assign them to upcoming timetable slots.',
    importantControls: [
      'Calendar View toggle (Day, Week, Month)',
      'Date picker to inspect scheduled periods for any specific day',
      'Create/Edit Lesson Plan modal with topic, duration, and status',
      'Status tags (Pending, In Progress, Completed)',
    ],
    nextSteps:
      'Prepare your week\'s lessons on Friday or Monday morning to ensure seamless classroom delivery.',
    proTip:
      'Linking your lesson plans to calendar dates helps school administrators track syllabus completion percentages across departments.',
    role: 'teacher',
  },
  {
    key: 'teacher-report-today',
    name: "Today's Teaching Report",
    category: 'Academic Monitoring',
    route: '/teacher/report/today',
    iconName: 'FileText',
    tagline: 'Log class coverage, TLM aids, and assign student homework',
    purpose:
      'The essential daily desk log where teachers record what was taught in each period. You can choose Lesson mode or Activity mode, attach TLM (Teaching-Learning Materials), assign student homework, and dispatch the verified report to the school administration.',
    whereToFind:
      'Click "Today\'s Report" in the sidebar or navigate to /teacher/report/today.',
    primaryAction:
      'Fill in period descriptions, select TLM teaching aids, assign homework, and submit the daily report.',
    importantControls: [
      'Period cards populated automatically from today\'s schedule',
      'Entry Type toggle: Standard Lesson vs Hands-on Activity',
      'TLM Aids chips selector (Blackboard, Flashcards, Lab equipment, etc.)',
      'Homework text input for student assignments',
      '"Save Draft" button to preserve notes midway through the day',
      '"Submit Report" button to send final verified report to admin',
    ],
    nextSteps:
      'Submit your report at the end of each school day before departure so administrators have 100% daily campus compliance.',
    proTip:
      'You can save your report as a draft between periods and hit "Submit" once after your final bell of the day.',
    role: 'teacher',
  },
  {
    key: 'teacher-report-history',
    name: 'Report History & Archives',
    category: 'Academic Monitoring',
    route: '/teacher/report/history',
    iconName: 'History',
    tagline: 'Search and review all previously submitted class reports',
    purpose:
      'An immutable archive of every teaching report you have submitted across the term. Allows filtering by date or class to review past coverage or provide audit records during parent-teacher meetings.',
    whereToFind:
      'Click "Report History" in the sidebar or visit /teacher/report/history.',
    primaryAction:
      'Search past dates to review what topics were taught and verify student homework assignments.',
    importantControls: [
      'Date search picker to jump directly to any historical date',
      'Class dropdown filter to isolate reports for a single grade section',
      'Expandable report rows displaying full period breakdown and TLMs',
      'Pagination controls to browse through historical records',
    ],
    nextSteps:
      'Use this historical record to prepare revision schedules or review what was covered before exam terms.',
    proTip:
      'Click on any report row to expand and see the exact learning outcomes, TLM materials, and homework assigned on that day.',
    role: 'teacher',
  },
  {
    key: 'teacher-settings',
    name: 'Teacher Account & Workspace',
    category: 'System & Billing',
    route: '/teacher/settings',
    iconName: 'Settings',
    tagline: 'Personal profile, credentials, and app preferences',
    purpose:
      'Manage your teacher portal account details, update your contact number or password, and customize UI display themes.',
    whereToFind:
      'Click "Settings" in the sidebar or navigate to /teacher/settings.',
    primaryAction:
      'Update your profile information and configure account security settings.',
    importantControls: [
      'Profile Information form (Name, Email, Phone number)',
      'Password update inputs to keep your account secure',
      'Color theme selector (Light, Dark, or System mode)',
    ],
    nextSteps:
      'Ensure your phone number is correct so school admins can send automated timetable updates via WhatsApp.',
    proTip:
      'Keep your contact phone updated in settings to receive instant notifications when substitution assignments are generated.',
    role: 'teacher',
  },
];
