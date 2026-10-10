import type { TutorialModuleInfo } from './tutorial-types';

export const TIMETABLE_PRO_MODULES: TutorialModuleInfo[] = [
  {
    key: 'dashboard',
    name: 'Dashboard & Analytics',
    category: 'Foundation',
    route: '/admin/dashboard',
    iconName: 'LayoutDashboard',
    tagline: 'Your school command center and real-time operational pulse',
    purpose:
      'Provides a high-level operational overview of your school: active teacher count, total classes, today absences, pending leaves, faculty workload distribution, and scheduled subject breakdown.',
    whereToFind:
      'Click "Dashboard" at the top of the left sidebar or navigate to /admin/dashboard.',
    primaryAction:
      'Monitor daily absent requests, inspect teacher workload distribution, and launch the Daily Desk.',
    importantControls: [
      'KPI Summary Cards (Total Teachers, Classes, Absences, Requests)',
      'Teacher Workload Bar Chart with Date Range and Sort Filters',
      'Subject Distribution Pie Chart with Class filtering',
      'Quick action button to launch the Daily Desk',
    ],
    nextSteps:
      'Check for any pending absent requests requiring review, then verify that all classes and faculty have assigned periods.',
    proTip:
      'Use the Workload sort filter to immediately spot overworked or underutilized teachers across any date window.',
    role: 'admin',
  },
  {
    key: 'classes',
    name: 'Classes Management',
    category: 'Academic Setup',
    route: '/admin/classes',
    iconName: 'GraduationCap',
    tagline: 'Configure student grades, sections, and classroom capacities',
    purpose:
      'Used to define all academic classes, grade levels, and sections (A, B, C...) in your school. Every timetable slot and subject mapping depends on these classes.',
    whereToFind:
      'Navigate to "Classes" in the left sidebar or visit /admin/classes.',
    primaryAction:
      'Create new classes with grade levels and sections, or bulk import your entire school roster via CSV.',
    importantControls: [
      '"Add Class" button to open the single class creation form',
      '"Import CSV" button to bulk upload classes with sample template download',
      'Search input to filter existing classes by name or grade',
      'Inline edit and delete action buttons for each class card/row',
    ],
    nextSteps:
      'After creating your classes, proceed to Subjects and assign which subjects are taught in each class.',
    proTip:
      'You can select multiple sections (A, B, C) at once during creation to generate multiple class streams in a single click.',
    role: 'admin',
  },
  {
    key: 'subjects',
    name: 'Subjects & Curriculum',
    category: 'Academic Setup',
    route: '/admin/subjects',
    iconName: 'BookOpen',
    tagline: 'Manage courses, subject codes, and class associations',
    purpose:
      'Catalog all academic subjects, curriculum codes, and link them to the specific classes and grade levels where they are taught.',
    whereToFind:
      'Click "Subjects" in the left sidebar or visit /admin/subjects.',
    primaryAction:
      'Add new subjects with course names and associate them with one or multiple classes.',
    importantControls: [
      '"Add Subject" button to open the subject creation dialog',
      'Multi-select class assignment chips to link classes to the subject',
      '"Import CSV" button for bulk subject ingestion',
      'Search bar and subject filter tags',
    ],
    nextSteps:
      'Once subjects are linked to classes, head over to Teachers to assign specialized faculty to these subjects.',
    proTip:
      'Link a subject to multiple classes at once so the timetable generator knows which grades require periods for that subject.',
    role: 'admin',
  },
  {
    key: 'teachers',
    name: 'Teachers & Faculty',
    category: 'Academic Setup',
    route: '/admin/teachers',
    iconName: 'Users',
    tagline: 'Faculty profiles, subject specializations, and portal credentials',
    purpose:
      'Manage teacher profiles, assign subjects and classes, define maximum weekly period workloads, and send direct login credentials via email or WhatsApp.',
    whereToFind:
      'Click "Teachers" in the left sidebar or visit /admin/teachers.',
    primaryAction:
      'Add teacher records, map their subject expertise, and send their login credentials.',
    importantControls: [
      '"Add Teacher" button with subject and class assignment mapping',
      'Class-Subject mapping matrix to specify exact teaching assignments',
      '"Resend Credentials" button to send login info via Email/WhatsApp',
      'Active/Inactive status toggles and weekly period limit configuration',
    ],
    nextSteps:
      'Verify teacher contact details and workload limits before generating your master timetable.',
    proTip:
      'Setting accurate "Max Periods Per Week" prevents teacher burnout and ensures the timetable solver balances allocations evenly.',
    role: 'admin',
  },
  {
    key: 'rooms',
    name: 'Rooms & Facilities',
    category: 'Academic Setup',
    route: '/admin/rooms',
    iconName: 'DoorOpen',
    tagline: 'Physical classrooms, labs, and facility locations',
    purpose:
      'Define physical rooms, lab spaces, floors, and buildings to avoid room scheduling conflicts and guide students and faculty to their rooms.',
    whereToFind:
      'Click "Rooms" in the left sidebar or visit /admin/rooms.',
    primaryAction:
      'Register classroom numbers, blocks, floors, and capacity limits.',
    importantControls: [
      '"Add Room" button with room number, floor, and block fields',
      'Bulk CSV import for schools with large campuses',
      'Room search filter and quick edit controls',
    ],
    nextSteps:
      'With classes, subjects, teachers, and rooms defined, you have completed the foundation for master timetables!',
    proTip:
      'Assigning rooms prevents two classes from being scheduled in the same physical space at the same time.',
    role: 'admin',
  },
  {
    key: 'timetables',
    name: 'Time Tables Master',
    category: 'Scheduling & Operations',
    route: '/admin/timetables',
    iconName: 'Table2',
    tagline: 'Automated conflict-free scheduling and master timetable publishing',
    purpose:
      'The core scheduling engine of Timetable Pro. Create multiple timetable drafts, use automatic AI generation to resolve constraints, manually tweak periods in an interactive grid, and publish live schedules.',
    whereToFind:
      'Click "Time Tables" in the left sidebar or visit /admin/timetables.',
    primaryAction:
      'Create a new timetable, configure period timing, and trigger auto-generation or manual scheduling.',
    importantControls: [
      '"New Time Table" button to start a draft schedule',
      'Status badges (PUBLISHED vs DRAFT)',
      'Action dropdown to Edit, Rename, Share public link, or Delete',
      'Interactive Timetable Grid Editor with drag-and-drop period slots',
    ],
    nextSteps:
      'Open your newly created timetable, auto-generate periods, and click "Publish" to activate it school-wide.',
    proTip:
      'You can create multiple seasonal or term timetables and switch between them seamlessly. Only one published timetable is active at a time.',
    role: 'admin',
  },
  {
    key: 'timetable-editor',
    name: 'Schedule Grid Editor',
    category: 'Scheduling & Operations',
    route: '/admin/timetables/editor',
    iconName: 'LayoutGrid',
    tagline: 'Interactive weekly grid canvas, period timings, clash detection & AI solver',
    purpose:
      'The visual timetable builder where you configure class schedules. Toggle working days, set school bell timings, insert period and recess intervals, manually assign clash-free subjects and teachers, or run the AI constraint solver to automate the entire school roster.',
    whereToFind:
      'Click on any timetable name in the Time Tables list, or click the "Edit Grid" action button.',
    primaryAction:
      'Customize period blocks, assign subjects and teachers to grid cells, and monitor faculty workloads.',
    importantControls: [
      'Class & Section switcher tabs with completion checkmarks',
      'Working Days selector & automated bell timing engine (Start time & duration)',
      '+ Period and + Break buttons to append teaching slots and lunch breaks',
      'Interactive weekly grid cells with instant clash detection',
      'Slot Assigner dialog with smart qualified teacher filtering',
      '"Generate with AI" button for one-click clash-free whole-school scheduling',
      'Real-time Faculty Workload panel with class completion tracker',
    ],
    nextSteps:
      'After finishing schedule assignments, return to the Timetables list and click "Activate" to publish it school-wide.',
    proTip:
      'Adjusting the base start time or period duration automatically updates every period across the entire timetable without losing any assigned subjects!',
    role: 'admin',
  },
  {
    key: 'ai-generator',
    name: 'AI Timetable Generator',
    category: 'Scheduling & Operations',
    route: '/admin/timetables/editor',
    iconName: 'Sparkles',
    tagline: 'Automated mathematical solver for clash-free whole-school timetable routines',
    purpose:
      'The automated scheduling engine that generates conflict-free timetables across all classes simultaneously. Evaluates teacher-class mappings, balances faculty weekly period quotas, ensures zero room clashes, and applies pedagogy rules like spacing same-subject periods.',
    whereToFind:
      'Click "Generate with AI" in the Timetable Editor header toolbar.',
    primaryAction:
      'Verify teacher-class readiness, select scheduling scope (All Classes vs Current Class), configure AI rules, and generate clash-free schedules in seconds.',
    importantControls: [
      'Classes, Subjects, and Assigned Faculty readiness cards',
      'Faculty Assignment Required unlock banner',
      'Scheduling Scope toggles ("All Classes" vs "Current Class Only")',
      'Balance Workload Evenly rule checkbox',
      'Avoid Consecutive Same-Subject Periods rule checkbox',
      'Fill Only Empty Slots rule checkbox',
      '"Generate Timetable with AI" solver button',
    ],
    nextSteps:
      'After generating, inspect the weekly grid and workload panel to review assigned slots or make custom adjustments.',
    proTip:
      'If generation is locked with "Faculty Assignment Required", make sure to assign classes and subjects to your teachers under the Teachers tab first!',
    role: 'admin',
  },
  {
    key: 'daily-desk',
    name: 'Daily Desk (Operations)',
    category: 'Scheduling & Operations',
    route: '/admin/daily-desk',
    iconName: 'ClipboardList',
    tagline: 'Real-time substitute management and daily absent coverage',
    purpose:
      'The daily operations command center. Track teacher absences in real time, view occupied periods, find free teachers, and assign instant proxy/replacement substitutions with automated WhatsApp/SMS alerts.',
    whereToFind:
      'Click "Daily Desk" in the left sidebar or use the quick link from the dashboard.',
    primaryAction:
      'Mark absent teachers for the day and assign replacement faculty to vacant periods.',
    importantControls: [
      'Interactive daily class-by-period matrix grid',
      'Zoom controls (Zoom in, Zoom out, Reset view)',
      'Absent teacher toggle and quick replacement picker',
      'Export options: Word document (.docx), spreadsheet, and image capture',
      'Broadcast alert buttons to notify staff immediately',
    ],
    nextSteps:
      'Open the Daily Desk every morning to review absent staff and confirm all substitute teachers are assigned.',
    proTip:
      'Timetable Pro highlights available teachers with zero conflicts during that period so you never double-book a substitute.',
    role: 'admin',
  },
  {
    key: 'attendance',
    name: 'Teacher Attendance',
    category: 'Academic Monitoring',
    route: '/admin/attendance',
    iconName: 'UserCheck',
    tagline: 'Faculty attendance tracking, leave requests, and monthly logs',
    purpose:
      'Keep accurate records of faculty attendance, view daily check-in logs, approve or reject leave applications submitted by teachers, and export monthly attendance summaries.',
    whereToFind:
      'Click "Teacher Attendance" in the left sidebar or visit /admin/attendance.',
    primaryAction:
      'Review today\'s attendance status, approve pending leave requests, and mark check-in states.',
    importantControls: [
      'Date picker to inspect attendance on any historical day',
      'Leave request approval modal with teacher reasons',
      'Export to Docx / CSV report actions',
      'Teacher search and status filtering (Present, Absent, On Leave)',
    ],
    nextSteps:
      'Approved leaves automatically sync with the Daily Desk, ensuring substitute planning is effortless.',
    proTip:
      'Teachers can submit leave requests from their own portal, which show up in your notification bell and attendance page for instant review.',
    role: 'admin',
  },
  {
    key: 'lesson-planning',
    name: 'Lesson Planning',
    category: 'Academic Monitoring',
    route: '/admin/lesson-planning',
    iconName: 'BookMarked',
    tagline: 'Curriculum delivery tracking and teacher syllabus planning',
    purpose:
      'Monitor teacher lesson plans, review planned topics for upcoming weeks, provide pedagogical feedback or comments, and track curriculum pacing across classes.',
    whereToFind:
      'Click "Lesson Planning" in the left sidebar or visit /admin/lesson-planning.',
    primaryAction:
      'Browse submitted lesson plans by date, teacher, class, and subject.',
    importantControls: [
      'Weekly date navigator (Next/Previous week)',
      'Teacher and Class dropdown filters',
      'Detailed lesson plan viewer with learning objectives and materials',
      'Feedback and comment threads on specific lesson plans',
    ],
    nextSteps:
      'Encourage your teachers to submit their weekly lesson outlines every Friday for the upcoming academic week.',
    proTip:
      'Export weekly lesson planning digests to share with department heads or academic coordinators.',
    role: 'admin',
  },
  {
    key: 'reports',
    name: 'Academic Reports & Audits',
    category: 'Academic Monitoring',
    route: '/admin/reports',
    iconName: 'FileText',
    tagline: 'Comprehensive school audits, daily logs, and compliance exports',
    purpose:
      'Generate and export detailed academic reports: daily classroom delivery logs, teacher substitution history, attendance statistics, and official compliance summaries.',
    whereToFind:
      'Click "Reports" in the left sidebar or visit /admin/reports.',
    primaryAction:
      'Filter reports by date range or teacher and download audit spreadsheets.',
    importantControls: [
      'Single date and date range filters',
      'Teacher search and class filters',
      '"Download CSV" button for instant spreadsheet generation',
      'Detailed report modal showing period-by-period teaching activities',
    ],
    nextSteps:
      'Use the monthly report summaries during school administrative meetings to evaluate teacher utilization and syllabus completion.',
    proTip:
      'Reports capture both scheduled periods and actual replacements, providing complete transparency into daily school operations.',
    role: 'admin',
  },
  {
    key: 'homework',
    name: 'Homework Tracker',
    category: 'Academic Monitoring',
    route: '/admin/homework',
    iconName: 'BookOpen',
    tagline: 'Student assignments, submission deadlines, and homework logs',
    purpose:
      'Oversee homework assigned by teachers to students across classes, check due dates, inspect assignment descriptions, and ensure students have a balanced workload.',
    whereToFind:
      'Click "Homework" in the left sidebar or visit /admin/homework.',
    primaryAction:
      'Inspect assigned homework entries, filter by class or date, and edit or manage tasks.',
    importantControls: [
      'Class and Date selector filters',
      'Add or modify homework dialog',
      'Export homework summaries to DOCX or CSV',
      'Teacher attribution and subject tags for each assignment',
    ],
    nextSteps:
      'Ensure teachers log homework consistently so parents and students receive timely updates.',
    proTip:
      'Filter by class to review total daily homework volume and avoid overloading students on test days.',
    role: 'admin',
  },
  {
    key: 'settings',
    name: 'Settings & Institute Profile',
    category: 'System & Billing',
    route: '/admin/settings',
    iconName: 'Settings',
    tagline: 'School branding, bell timing, leave policies, and admin account',
    purpose:
      'Configure your school identity, official name, address, contact details, logo, custom leave reasons, bell period schedules, and administrative account security.',
    whereToFind:
      'Click "Settings" in the left sidebar or visit /admin/settings.',
    primaryAction:
      'Update your school details, upload official logos, and configure leave categories.',
    importantControls: [
      'Tabs for "General", "Institute", "Leave Reasons", and "Leave Requests"',
      'Institute branding inputs (Name, Phone, Email, Address, Socials)',
      'Password reset and personal profile management',
      'Custom leave reason manager',
    ],
    nextSteps:
      'Ensure your institute name and contact details are up to date so they appear correctly on published timetable headers.',
    proTip:
      'Configure custom leave reasons (e.g. Medical, Casual, Workshop) so faculty can accurately categorize absence submissions.',
    role: 'admin',
  },
  {
    key: 'upgrade',
    name: 'Billing & Upgrade Tiers',
    category: 'System & Billing',
    route: '/admin/upgrade',
    iconName: 'CreditCard',
    tagline: 'Subscription plans, faculty limits, and enterprise features',
    purpose:
      'Review your current active subscription tier (Free, Standard, Pro, Elite), compare feature limits (faculty quota, reports, automated AI generation), and submit upgrade or trial requests.',
    whereToFind:
      'Click "Billing & Upgrade" in the left sidebar or click the plan badge in the sidebar footer.',
    primaryAction:
      'Compare plans and request plan upgrades or free trial activations.',
    importantControls: [
      'Plan comparison matrix with feature checklists',
      '"Request Free Trial" modal for instant feature testing',
      'Checkout and payment verification workflow (UPI / QR Code)',
      'Current teacher count vs plan capacity progress indicator',
    ],
    nextSteps:
      'Upgrade your plan whenever your school adds more faculty or needs advanced PDF exports and AI automated scheduling.',
    proTip:
      'Requesting a free trial unlocks all premium features so you can experience advanced timetable scheduling before committing.',
    role: 'admin',
  },
];
