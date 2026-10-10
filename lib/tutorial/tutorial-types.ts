export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export type InteractivePracticeType = 'click' | 'explore' | 'preview' | 'tab' | 'action' | 'form-create';

export interface InteractivePractice {
  type: InteractivePracticeType;
  actionPrompt: string;
  targetElementSelector?: string;
  practiceButtonText?: string;
  feedbackText: string;
  formSelector?: string;
  formPrompt?: string;
  submitButtonSelector?: string;
  entityType?: 'classes' | 'subjects' | 'teachers' | 'rooms' | 'timetables' | 'timetable-slot';
  sampleButtonText?: string;
}

export interface TutorialStep {
  id: string;
  moduleKey: string;
  title: string;
  shortDescription: string;
  detailedExplanation: string;
  targetSelector: string;
  route: string;
  placement?: TourPlacement;
  role?: 'admin' | 'teacher' | 'super-admin' | 'all';
  primaryActionLabel?: string;
  proTip?: string;
  interactivePractice?: InteractivePractice;
}

export interface TutorialModuleInfo {
  key: string;
  name: string;
  category: 'Foundation' | 'Academic Setup' | 'Scheduling & Operations' | 'Academic Monitoring' | 'System & Billing';
  route: string;
  iconName: string;
  tagline: string;
  purpose: string;
  whereToFind: string;
  primaryAction: string;
  importantControls: string[];
  nextSteps: string;
  proTip: string;
  role: 'admin' | 'teacher' | 'super-admin' | 'all';
}

export interface TutorialPersistenceState {
  hasSeenWelcome: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  currentStepIndex: number;
  completedAt?: string;
  skippedAt?: string;
}
