'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { TUTORIAL_STEPS } from './tutorial-steps';
import type { TutorialStep, TutorialPersistenceState } from './tutorial-types';

interface TutorialContextType {
  isWelcomeOpen: boolean;
  isTourActive: boolean;
  isHelpCenterOpen: boolean;
  activeModuleKey: string | null;
  currentStepIndex: number;
  currentStep: TutorialStep | null;
  totalSteps: number;
  isNavigatingRoute: boolean;
  state: TutorialPersistenceState;
  startTour: (stepIndex?: number, moduleKey?: string | null) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  finishTour: () => void;
  openHelpCenter: () => void;
  closeHelpCenter: () => void;
  openWelcomeModal: () => void;
  closeWelcomeModal: () => void;
  restartTutorial: () => void;
  jumpToStep: (stepIndex: number) => void;
  jumpToModuleTour: (moduleKey: string) => void;
}

const defaultState: TutorialPersistenceState = {
  hasSeenWelcome: false,
  isCompleted: false,
  isSkipped: false,
  currentStepIndex: 0,
};

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [activeModuleKey, setActiveModuleKey] = useState<string | null>(null);
  const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isNavigatingRoute, setIsNavigatingRoute] = useState(false);

  const storageKey = useMemo(() => {
    return user?.id
      ? `timetablepro_tutorial_v1_${user.id}`
      : 'timetablepro_tutorial_v1_guest';
  }, [user?.id]);

  const [state, setState] = useState<TutorialPersistenceState>(defaultState);

  // Load persistence state once client mounts and user is known
  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState(parsed);
      } else {
        setState(defaultState);
      }
    } catch (e) {
      console.warn('Failed to parse tutorial state from localStorage:', e);
      setState(defaultState);
    }
  }, [storageKey]);

  // Persist state updates to localStorage
  const saveState = useCallback(
    (newState: Partial<TutorialPersistenceState>) => {
      setState((prev) => {
        const updated = { ...prev, ...newState };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(storageKey, JSON.stringify(updated));
          } catch (e) {
            console.error('Failed to save tutorial state to localStorage:', e);
          }
        }
        return updated;
      });
    },
    [storageKey]
  );

  // Check if first-time user should see the welcome modal
  useEffect(() => {
    if (!mounted || authLoading || !user) return;

    // Only auto-trigger welcome modal on authenticated dashboards/pages
    const isAuthenticatedArea =
      pathname.startsWith('/admin') ||
      pathname.startsWith('/teacher') ||
      pathname.startsWith('/super-admin');

    if (!isAuthenticatedArea) return;

    // If user has not seen welcome modal, show it after initial page load
    if (!state.hasSeenWelcome && !isTourActive && !isWelcomeOpen) {
      const timer = setTimeout(() => {
        setIsWelcomeOpen(true);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [mounted, authLoading, user, pathname, state.hasSeenWelcome, isTourActive, isWelcomeOpen]);

  // Filter steps relevant to role if desired (defaults to all admin-available steps)
  const steps = TUTORIAL_STEPS;
  const currentStep = isTourActive && steps[currentStepIndex] ? steps[currentStepIndex] : null;

  // Handle step route synchronization
  const navigateToStepRoute = useCallback(
    async (targetStep: TutorialStep) => {
      if (!targetStep.route) return;

      // Special handling for dynamic timetable editor routes
      if (targetStep.route === '/admin/timetables/editor') {
        if (pathname.startsWith('/admin/timetables/') && pathname.includes('/edit')) {
          setIsNavigatingRoute(false);
          return;
        }

        try {
          setIsNavigatingRoute(true);
          const { getTimetables } = await import('@/lib/api-services');
          const list = await getTimetables();
          const target = list[0];
          if (target?.id) {
            router.push(`/admin/timetables/${target.id}/edit`);
          } else {
            router.push('/admin/timetables');
          }
        } catch {
          router.push('/admin/timetables');
        } finally {
          setTimeout(() => setIsNavigatingRoute(false), 700);
        }
        return;
      }

      if (pathname !== targetStep.route) {
        setIsNavigatingRoute(true);
        router.push(targetStep.route);
        // Small delay to let page mount
        const timer = setTimeout(() => {
          setIsNavigatingRoute(false);
        }, 600);
        return () => clearTimeout(timer);
      } else {
        setIsNavigatingRoute(false);
      }
    },
    [pathname, router]
  );

  const startTour = useCallback(
    (startFromIndex = 0, moduleKey: string | null = null) => {
      const validIndex = Math.max(0, Math.min(startFromIndex, steps.length - 1));
      setIsWelcomeOpen(false);
      setIsHelpCenterOpen(false);
      setActiveModuleKey(moduleKey);
      setCurrentStepIndex(validIndex);
      setIsTourActive(true);

      const targetStep = steps[validIndex];
      if (targetStep) {
        navigateToStepRoute(targetStep);
      }

      saveState({
        hasSeenWelcome: true,
        currentStepIndex: validIndex,
        isSkipped: false,
      });
    },
    [steps, navigateToStepRoute, saveState]
  );

  const finishTour = useCallback(() => {
    setIsTourActive(false);
    setActiveModuleKey(null);
    saveState({
      hasSeenWelcome: true,
      isCompleted: true,
      isSkipped: false,
      completedAt: new Date().toISOString(),
    });
  }, [saveState]);

  const skipTour = useCallback(() => {
    setIsTourActive(false);
    setActiveModuleKey(null);
    saveState({
      hasSeenWelcome: true,
      isSkipped: true,
      skippedAt: new Date().toISOString(),
    });
  }, [saveState]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      const nextTargetStep = steps[nextIndex];
      // If tour was started for a specific module and next step moves to another module, complete module tour!
      if (activeModuleKey && nextTargetStep?.moduleKey !== activeModuleKey) {
        finishTour();
        return;
      }
      setCurrentStepIndex(nextIndex);
      if (nextTargetStep) {
        navigateToStepRoute(nextTargetStep);
      }
      saveState({ currentStepIndex: nextIndex });
    } else {
      // Completed all steps!
      finishTour();
    }
  }, [currentStepIndex, steps, activeModuleKey, navigateToStepRoute, saveState, finishTour]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      const prevTargetStep = steps[prevIndex];
      // Do not step back into a different module if scoped to current module
      if (activeModuleKey && prevTargetStep?.moduleKey !== activeModuleKey) {
        return;
      }
      setCurrentStepIndex(prevIndex);
      if (prevTargetStep) {
        navigateToStepRoute(prevTargetStep);
      }
      saveState({ currentStepIndex: prevIndex });
    }
  }, [currentStepIndex, steps, activeModuleKey, navigateToStepRoute, saveState]);

  const openHelpCenter = useCallback(() => {
    setIsHelpCenterOpen(true);
  }, []);

  const closeHelpCenter = useCallback(() => {
    setIsHelpCenterOpen(false);
  }, []);

  const openWelcomeModal = useCallback(() => {
    setIsWelcomeOpen(true);
  }, []);

  const closeWelcomeModal = useCallback(() => {
    setIsWelcomeOpen(false);
    saveState({
      hasSeenWelcome: true,
      isSkipped: true,
    });
  }, [saveState]);

  const restartTutorial = useCallback(() => {
    setIsHelpCenterOpen(false);
    setIsWelcomeOpen(false);
    startTour(0, null);
  }, [startTour]);

  const jumpToStep = useCallback(
    (index: number) => {
      startTour(index, null);
    },
    [startTour]
  );

  const jumpToModuleTour = useCallback(
    (moduleKey: string) => {
      const stepIdx = steps.findIndex((s) => s.moduleKey === moduleKey);
      if (stepIdx !== -1) {
        startTour(stepIdx, moduleKey);
      } else {
        // Fallback to 0 if not found
        startTour(0, null);
      }
    },
    [steps, startTour]
  );

  const value = {
    isWelcomeOpen,
    isTourActive,
    isHelpCenterOpen,
    activeModuleKey,
    currentStepIndex,
    currentStep,
    totalSteps: steps.length,
    isNavigatingRoute,
    state,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
    openHelpCenter,
    closeHelpCenter,
    openWelcomeModal,
    closeWelcomeModal,
    restartTutorial,
    jumpToStep,
    jumpToModuleTour,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
