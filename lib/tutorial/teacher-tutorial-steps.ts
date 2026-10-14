import type { TutorialStep } from './tutorial-types';

export const TEACHER_TUTORIAL_STEPS: TutorialStep[] = [
  // 1. Today's Timeline - Header Overview
  {
    id: 'teacher-step-1-schedule-header',
    moduleKey: 'teacher-schedule',
    title: "Today's Teaching Timeline",
    shortDescription: "Your daily chronological timetable with live room numbers, class sections, and proxy alerts.",
    detailedExplanation:
      "Welcome to your teacher daily command center. Here you can see every class assigned to you for today, sorted in sequential period order with start and end times, room names, and assigned subjects.",
    targetSelector: '[data-tour="teacher-schedule-header"]',
    route: '/teacher/schedule',
    placement: 'bottom',
    role: 'teacher',
    primaryActionLabel: 'Daily Timeline',
    proTip: 'Check your timeline first thing every morning to see if you have any substitute cover duties assigned.',
    interactivePractice: {
      type: 'explore',
      actionPrompt: 'Review your scheduled classes and room locations for today.',
      feedbackText: 'Daily schedule inspected successfully!',
    },
  },

  // 2. Today's Timeline - Burnout Meter
  {
    id: 'teacher-step-2-burnout-meter',
    moduleKey: 'teacher-schedule',
    title: 'Burnout Meter & Weekly Load Index',
    shortDescription: 'Real-time calculation of your weekly teaching strain and period distribution.',
    detailedExplanation:
      'The algorithm calculates your total periods against healthy workload limits to prevent teacher fatigue. Scores below 40% are Healthy, 40-70% are Moderate, and above 70% indicate a High teaching load.',
    targetSelector: '[data-tour="teacher-burnout-meter"]',
    route: '/teacher/schedule',
    placement: 'bottom',
    role: 'teacher',
    primaryActionLabel: 'Workload Health',
    proTip: 'If your burnout meter reaches High for consecutive weeks, speak with your school administrator to balance subject distribution.',
  },

  // 3. Today's Timeline - Sessions Today Counter
  {
    id: 'teacher-step-3-sessions-today',
    moduleKey: 'teacher-schedule',
    title: "Sessions Today & Cover Duties",
    shortDescription: "Instant count of total classes scheduled today plus any substitution covers.",
    detailedExplanation:
      "This card tallies your day's work. If another teacher is absent and the AI substitution engine assigned you a cover period, it will be clearly reflected here.",
    targetSelector: '[data-tour="teacher-sessions-today"]',
    route: '/teacher/schedule',
    placement: 'bottom',
    role: 'teacher',
    primaryActionLabel: 'Period Count',
    proTip: 'Cover events show extra classes assigned to you for the day.',
  },

  // 4. Today's Timeline - Class Cards & Proxy Status
  {
    id: 'teacher-step-4-timeline-cards',
    moduleKey: 'teacher-schedule',
    title: 'Class Timeline Cards & Status',
    shortDescription: 'Detailed cards showing period timings, class name, subject, and status badges.',
    detailedExplanation:
      'Each card shows your classroom, subject, and time slot. Green badges indicate regular scheduled classes, while purple badges highlight Proxy/Substitution duties.',
    targetSelector: '[data-tour="teacher-timeline-list"]',
    route: '/teacher/schedule',
    placement: 'top',
    role: 'teacher',
    primaryActionLabel: 'Timeline Details',
    proTip: 'Proxy classes are assigned during other teachers\' absences to ensure zero unsupervised student time.',
  },

  // 5. Today's Timeline - Summary Metrics
  {
    id: 'teacher-step-5-summary-stats',
    moduleKey: 'teacher-schedule',
    title: 'Daily Summary & Attendance Counters',
    shortDescription: 'Quick totals of your classes taught, covers attended, and absent periods.',
    detailedExplanation:
      'These counters summarize your overall day at a glance. They update automatically as daily attendance and replacement coverage are logged.',
    targetSelector: '[data-tour="teacher-summary-stats"]',
    route: '/teacher/schedule',
    placement: 'top',
    role: 'teacher',
    primaryActionLabel: 'Day Summary',
  },

  // 6. Weekly Routine - Overview
  {
    id: 'teacher-step-6-weekly-header',
    moduleKey: 'teacher-weekly-schedule',
    title: 'Weekly Routine Timetable Grid',
    shortDescription: 'Full Monday to Saturday master schedule for all your classes and subjects.',
    detailedExplanation:
      'This interactive grid provides a high-level view of your entire week\'s schedule. You can see when you have free periods, plan your week, and check timetable assignments.',
    targetSelector: '[data-tour="teacher-weekly-header"]',
    route: '/teacher/weekly-schedule',
    placement: 'bottom',
    role: 'teacher',
    primaryActionLabel: 'Weekly Routine',
    proTip: 'Free period slots are clearly visible between scheduled periods, making it easy to schedule lesson prep or meetings.',
  },

  // 7. Weekly Routine - Batch Filter
  {
    id: 'teacher-step-7-weekly-batch',
    moduleKey: 'teacher-weekly-schedule',
    title: 'Batch & Class Filter Matrix',
    shortDescription: 'Switch between all your scheduled classes or focus on a single grade section.',
    detailedExplanation:
      'Use this dropdown to view the entire master timetable for a specific class (like Class 10-A) or view only the classes where you are assigned to teach.',
    targetSelector: '[data-tour="teacher-weekly-batch-select"]',
    route: '/teacher/weekly-schedule',
    placement: 'bottom',
    role: 'teacher',
    primaryActionLabel: 'Class Filter',
    interactivePractice: {
      type: 'explore',
      actionPrompt: 'Test the batch filter dropdown to isolate a specific class routine.',
      feedbackText: 'Batch matrix filtered successfully!',
    },
  },

  // 8. Weekly Routine - Slot Actions & Personal TODOs
  {
    id: 'teacher-step-8-weekly-grid',
    moduleKey: 'teacher-weekly-schedule',
    title: 'Timetable Slot Actions & Personal TODOs',
    shortDescription: 'Click on any scheduled slot to request absence or attach preparation TODOs.',
    detailedExplanation:
      'Every period cell is interactive. You can add lesson preparation TODOs (e.g. "Bring geometry sets", "Conduct unit test") or submit a single-period absence request to administration.',
    targetSelector: '[data-tour="teacher-weekly-grid"]',
    route: '/teacher/weekly-schedule',
    placement: 'top',
    role: 'teacher',
    primaryActionLabel: 'Slot Actions',
    proTip: 'Any TODO added to a timetable slot automatically pre-fills into "Today\'s Report" when that day arrives!',
  },

  // 9. Weekly Routine - Absence Request Button
  {
    id: 'teacher-step-9-weekly-absent',
    moduleKey: 'teacher-weekly-schedule',
    title: '1-Click Absence Request to Daily Desk',
    shortDescription: 'Submit upcoming planned leaves directly to administration for instant substitute coverage.',
    detailedExplanation:
      'Click the "Mark Absent" button on any day or slot to open the leave dialog. Once submitted, the admin Daily Desk receives an instant alert to arrange proxy teacher coverage.',
    targetSelector: '[data-tour="teacher-weekly-absent-btn"]',
    route: '/teacher/weekly-schedule',
    placement: 'bottom',
    role: 'teacher',
    primaryActionLabel: 'Leave Request',
  },

  // 10. Lesson Planning - Calendar & Topics
  {
    id: 'teacher-step-10-lesson-planning',
    moduleKey: 'teacher-lesson-planning',
    title: 'Lesson Planning Calendar & Syllabus',
    shortDescription: 'Map curriculum topics, chapter goals, and estimated durations to upcoming dates.',
    detailedExplanation:
      'Keep your academic teaching on track by preparing lessons in advance. Switch between Day, Week, and Month views, select any date, and link lesson plans to scheduled periods.',
    targetSelector: '[data-tour="teacher-lesson-calendar"]',
    route: '/teacher/lesson-planning',
    placement: 'bottom',
    role: 'teacher',
    primaryActionLabel: 'Lesson Calendar',
    proTip: 'School principals can review these lesson plans in their Reports dashboard to verify syllabus progression.',
  },

  // 11. Today's Report - Form Overview
  {
    id: 'teacher-step-11-report-header',
    moduleKey: 'teacher-report-today',
    title: "Today's Class Log & Teaching Report",
    shortDescription: 'Log daily period coverage, teaching aids used, and assign homework for students.',
    detailedExplanation:
      'At the end of each period or at the end of the school day, record what was taught in class. Choose between standard Lesson mode or Activity mode, and record student homework.',
    targetSelector: '[data-tour="teacher-report-header"]',
    route: '/teacher/report/today',
    placement: 'bottom',
    role: 'teacher',
    primaryActionLabel: 'Daily Log',
  },

  // 12. Today's Report - Period Rows & TLM
  {
    id: 'teacher-step-12-report-rows',
    moduleKey: 'teacher-report-today',
    title: 'Period Entries, TLM Aids & Homework',
    shortDescription: 'Fill out topic descriptions, click TLM aid tags, and type homework instructions.',
    detailedExplanation:
      'For each period, type what you covered. Click on Teaching-Learning Materials (TLM) tags like Flashcards, Whiteboard, or Science Kit, and enter student homework tasks.',
    targetSelector: '[data-tour="teacher-report-rows"]',
    route: '/teacher/report/today',
    placement: 'top',
    role: 'teacher',
    primaryActionLabel: 'TLM & Homework',
    proTip: 'Saving drafts throughout the day ensures none of your lesson notes are lost if you close your browser.',
  },

  // 13. Today's Report - Submit Actions
  {
    id: 'teacher-step-13-report-actions',
    moduleKey: 'teacher-report-today',
    title: 'Save Draft & Submit to Administration',
    shortDescription: 'Preserve in-progress logs with "Save Draft" and submit final daily log with "Submit Report".',
    detailedExplanation:
      'Once all periods are logged, click "Submit Report". Your daily log is immediately dispatched to the administration\'s Daily Desk and saved in your historical records.',
    targetSelector: '[data-tour="teacher-report-actions"]',
    route: '/teacher/report/today',
    placement: 'top',
    role: 'teacher',
    primaryActionLabel: 'Submit Report',
  },

  // 14. Report History - Historical Search
  {
    id: 'teacher-step-14-history-header',
    moduleKey: 'teacher-report-history',
    title: 'Report Archives & Historical Search',
    shortDescription: 'Browse, filter, and review all previous daily reports submitted throughout the academic term.',
    detailedExplanation:
      'Easily look back at past dates to see what chapters were completed, which teaching aids were utilized, and verify student homework assignments across previous weeks.',
    targetSelector: '[data-tour="teacher-history-header"]',
    route: '/teacher/report/history',
    placement: 'bottom',
    role: 'teacher',
    primaryActionLabel: 'Report Archive',
    proTip: 'Use the Date picker to instantly jump to any specific day in the academic calendar.',
  },

  // 15. Settings - Profile & Account
  {
    id: 'teacher-step-15-settings-header',
    moduleKey: 'teacher-settings',
    title: 'Personal Account Workspace & Preferences',
    shortDescription: 'Update your teacher profile, account security, and UI display mode.',
    detailedExplanation:
      'Keep your contact number and password up to date. You can also toggle between Light, Dark, or System themes for comfortable viewing on both mobile and desktop.',
    targetSelector: '[data-tour="teacher-settings-header"]',
    route: '/teacher/settings',
    placement: 'bottom',
    role: 'teacher',
    primaryActionLabel: 'Account Workspace',
  },
];
