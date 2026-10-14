'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTutorial } from '@/lib/tutorial/tutorial-context';
import { TUTORIAL_STEPS } from '@/lib/tutorial/tutorial-steps';
import { TEACHER_TUTORIAL_STEPS } from '@/lib/tutorial/teacher-tutorial-steps';
import { Button } from '@/components/ui/button';
import { PlanButton } from '@/components/ui/plan-button';
import { Badge } from '@/components/ui/badge';
import confetti from 'canvas-confetti';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Sparkles,
  CheckCircle2,
  Lightbulb,
  MousePointerClick,
  Compass,
  ArrowRight,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ElementBounds {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export function TutorialSpotlightOverlay() {
  const {
    isTourActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    activeModuleKey,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
    isNavigatingRoute,
    isTeacher,
  } = useTutorial();

  const [targetBounds, setTargetBounds] = useState<ElementBounds | null>(null);
  const [elementFound, setElementFound] = useState(false);
  const [isSearching, setIsSearching] = useState(true);
  const [practiceDone, setPracticeDone] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  }>({ top: 100, left: 100, placement: 'bottom' });

  const popoverRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const allCurrentSteps = useMemo(() => {
    return isTeacher ? TEACHER_TUTORIAL_STEPS : TUTORIAL_STEPS;
  }, [isTeacher]);

  // Module-scoped progress and step calculations (must be called unconditionally before any early return)
  const moduleSteps = useMemo(() => {
    if (!currentStep) return [];
    const key = activeModuleKey || currentStep.moduleKey;
    return allCurrentSteps.filter((s) => s.moduleKey === key);
  }, [currentStep, activeModuleKey, allCurrentSteps]);

  const moduleStepIndex = useMemo(() => {
    if (!currentStep) return 0;
    const idx = moduleSteps.findIndex((s) => s.id === currentStep.id);
    return idx !== -1 ? idx : 0;
  }, [currentStep, moduleSteps]);

  // Trigger celebratory confetti on finish
  const triggerConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#10b981'],
      });
    } catch {
      // Safe fallback if canvas-confetti is not loaded
    }
  }, []);

  // Reset practice and form state when step changes
  useEffect(() => {
    setPracticeDone(false);
    setIsFormOpen(false);
    setIsMobileExpanded(false);
  }, [currentStepIndex]);

  // Monitor DOM for creation form opening/closing
  useEffect(() => {
    if (!isTourActive || !currentStep?.interactivePractice?.formSelector) {
      setIsFormOpen(false);
      return;
    }

    const formSel = currentStep.interactivePractice.formSelector;

    const checkForm = () => {
      const formEl = document.querySelector(formSel) as HTMLElement | null;
      const isVisible = Boolean(
        formEl && (formEl.offsetHeight > 0 || formEl.getBoundingClientRect().height > 0)
      );
      setIsFormOpen(isVisible);
    };

    checkForm();
    const interval = setInterval(checkForm, 250);

    return () => clearInterval(interval);
  }, [isTourActive, currentStep]);

  // Listen for successful creation events to complete interactive practice
  useEffect(() => {
    const handleCreationSuccess = (e: any) => {
      const entity = e.detail?.type;
      if (
        currentStep?.interactivePractice?.entityType &&
        entity === currentStep.interactivePractice.entityType
      ) {
        setPracticeDone(true);
        triggerConfetti();
      }
    };

    window.addEventListener('tutorial:creation-success', handleCreationSuccess);
    return () => window.removeEventListener('tutorial:creation-success', handleCreationSuccess);
  }, [currentStep, triggerConfetti]);

  // Find and measure target element with retries
  // Find and measure target element with retries
  const measureTargetElement = useCallback(() => {
    if (!currentStep) return;

    // If creation form is currently open, spotlight the form! Otherwise main target
    const isFormMode = Boolean(
      currentStep.interactivePractice?.formSelector && isFormOpen
    );
    const selector = isFormMode
      ? currentStep.interactivePractice!.formSelector!
      : currentStep.targetSelector;

    if (!selector) {
      setElementFound(false);
      setTargetBounds(null);
      return;
    }

    const element = document.querySelector(selector) as HTMLElement | null;

    if (element) {
      const rect = element.getBoundingClientRect();
      // Ignore hidden or collapsed elements (e.g. while skeletons or tabs are transitioning)
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

      // Only scroll into view if vertically significantly offscreen
      const isOffscreen = rect.top < 0 || rect.bottom > viewportHeight;
      if (isOffscreen) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }

      const updatedRect = element.getBoundingClientRect();
      const bounds: ElementBounds = {
        top: Math.max(0, updatedRect.top),
        left: Math.max(0, updatedRect.left),
        width: Math.min(viewportWidth, updatedRect.width),
        height: Math.min(viewportHeight, updatedRect.height),
        right: Math.min(viewportWidth, updatedRect.right),
        bottom: Math.min(viewportHeight, updatedRect.bottom),
      };

      setTargetBounds(bounds);
      setElementFound(true);
      setIsSearching(false);
    } else {
      // Element not yet in DOM
      setElementFound(false);
      setTargetBounds(null);
    }
  }, [currentStep, isFormOpen]);

  // Trigger measure immediately when form state flips
  useEffect(() => {
    if (isTourActive) {
      measureTargetElement();
    }
  }, [isFormOpen, isTourActive, measureTargetElement]);

  // Handle element discovery with polling / retry and MutationObserver
  useEffect(() => {
    if (!isTourActive || !currentStep || isNavigatingRoute) {
      setTargetBounds(null);
      setElementFound(false);
      return;
    }

    setIsSearching(true);

    const checkAndMeasure = (): boolean => {
      const isFormMode = Boolean(
        currentStep.interactivePractice?.formSelector && isFormOpen
      );
      const selector = isFormMode
        ? currentStep.interactivePractice!.formSelector!
        : currentStep.targetSelector;

      if (!selector) return false;
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          measureTargetElement();
          return true;
        }
      }
      return false;
    };

    // Immediate check
    if (checkAndMeasure()) return;

    // Polling retry for async fetches (e.g. dashboard stats or skeleton replacements)
    let attempts = 0;
    const maxAttempts = 50; // 50 * 150ms = 7.5s retry window
    const interval = setInterval(() => {
      attempts++;
      const found = checkAndMeasure();
      if (found || attempts >= maxAttempts) {
        clearInterval(interval);
        if (!found) {
          setIsSearching(false);
        }
      }
    }, 150);

    // Watch DOM mutations to immediately capture elements rendered after API loads
    const observer = new MutationObserver(() => {
      if (checkAndMeasure()) {
        clearInterval(interval);
      }
    });

    if (typeof document !== 'undefined' && document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      clearInterval(interval);
      observer.disconnect();
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [isTourActive, currentStep, isFormOpen, isNavigatingRoute, measureTargetElement]);

  // Recalculate on window resize or scroll
  useEffect(() => {
    if (!isTourActive) return;

    const handleResize = () => {
      measureTargetElement();
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [isTourActive, measureTargetElement]);

  // Compute smart popover position with screen collision avoidance
  useEffect(() => {
    if (!isTourActive) return;

    const popoverEl = popoverRef.current;
    const popoverWidth = popoverEl ? popoverEl.offsetWidth : 420;
    const popoverHeight = popoverEl ? popoverEl.offsetHeight : 280;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 16;
    const isMobile = viewportWidth < 640;

    // Mobile layout: dock card comfortably at top or bottom to never clip or obstruct spotlight
    if (isMobile) {
      const isTargetInBottomHalf = Boolean(
        targetBounds && targetBounds.top + targetBounds.height / 2 > viewportHeight / 2
      );
      setPopoverPosition({
        top: isTargetInBottomHalf ? 12 : Math.max(12, viewportHeight - popoverHeight - 14),
        left: 12,
        placement: isTargetInBottomHalf ? 'top' : 'bottom',
      });
      return;
    }

    // DESKTOP (PC) LOGIC - 100% UNCHANGED
    if (!targetBounds || !elementFound) {
      // Fallback: Center on screen
      setPopoverPosition({
        top: Math.max(margin, (viewportHeight - popoverHeight) / 2),
        left: Math.max(margin, (viewportWidth - popoverWidth) / 2),
        placement: 'center',
      });
      return;
    }

    // When creation form is open, dock the card at bottom-right so it NEVER obstructs the form
    if (isFormOpen) {
      setPopoverPosition({
        top: Math.max(margin, viewportHeight - popoverHeight - 24),
        left: Math.max(margin, viewportWidth - popoverWidth - 24),
        placement: 'bottom',
      });
      return;
    }

    const rawPlacement = currentStep?.placement;
    const preferredPlacement: 'top' | 'bottom' | 'left' | 'right' =
      rawPlacement === 'top' || rawPlacement === 'bottom' || rawPlacement === 'left' || rawPlacement === 'right'
        ? rawPlacement
        : 'bottom';
    let top = 0;
    let left = 0;
    let chosenPlacement: 'top' | 'bottom' | 'left' | 'right' | 'center' = preferredPlacement;

    // Default calculations based on preferred placement
    if (preferredPlacement === 'bottom') {
      top = targetBounds.bottom + margin;
      left = targetBounds.left + targetBounds.width / 2 - popoverWidth / 2;

      // If overflowing bottom, flip to top
      if (top + popoverHeight > viewportHeight - margin && targetBounds.top - popoverHeight - margin > 0) {
        top = targetBounds.top - popoverHeight - margin;
        chosenPlacement = 'top';
      }
    } else if (preferredPlacement === 'top') {
      top = targetBounds.top - popoverHeight - margin;
      left = targetBounds.left + targetBounds.width / 2 - popoverWidth / 2;

      // If overflowing top, flip to bottom
      if (top < margin && targetBounds.bottom + popoverHeight + margin < viewportHeight) {
        top = targetBounds.bottom + margin;
        chosenPlacement = 'bottom';
      }
    } else if (preferredPlacement === 'right') {
      top = targetBounds.top + targetBounds.height / 2 - popoverHeight / 2;
      left = targetBounds.right + margin;

      // If overflowing right, flip to left or bottom
      if (left + popoverWidth > viewportWidth - margin) {
        if (targetBounds.left - popoverWidth - margin > 0) {
          left = targetBounds.left - popoverWidth - margin;
          chosenPlacement = 'left';
        } else {
          top = targetBounds.bottom + margin;
          left = Math.max(margin, targetBounds.left);
          chosenPlacement = 'bottom';
        }
      }
    } else if (preferredPlacement === 'left') {
      top = targetBounds.top + targetBounds.height / 2 - popoverHeight / 2;
      left = targetBounds.left - popoverWidth - margin;

      // If overflowing left, flip to right
      if (left < margin) {
        left = targetBounds.right + margin;
        chosenPlacement = 'right';
      }
    }

    // Horizontal clamp
    if (left + popoverWidth > viewportWidth - margin) {
      left = viewportWidth - popoverWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    // Vertical clamp
    if (top + popoverHeight > viewportHeight - margin) {
      top = viewportHeight - popoverHeight - margin;
    }
    if (top < margin) {
      top = margin;
    }

    setPopoverPosition({ top, left, placement: chosenPlacement });
  }, [targetBounds, elementFound, currentStep?.placement, isTourActive, isFormOpen]);

  // Handle keyboard navigation (ArrowRight, ArrowLeft, Escape)
  useEffect(() => {
    if (!isTourActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        skipTour();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentStepIndex === totalSteps - 1) {
          triggerConfetti();
          finishTour();
        } else {
          nextStep();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourActive, currentStepIndex, totalSteps, nextStep, prevStep, skipTour, finishTour, triggerConfetti]);

  // Handle interactive practice click
  const handlePerformPractice = () => {
    if (!currentStep?.interactivePractice) return;

    const isFormCreate = currentStep.interactivePractice.type === 'form-create';

    const targetSel = currentStep.interactivePractice.targetElementSelector;
    if (targetSel) {
      const el = document.querySelector(targetSel) as HTMLElement;
      if (el) {
        el.click();
      }
    }

    // If it's a form creation step, do NOT mark done yet! Wait for data entry & submit button click
    if (!isFormCreate) {
      setPracticeDone(true);
    }
  };

  // Handle auto-fill sample data in form
  const handleAutoFillSample = () => {
    if (!currentStep?.interactivePractice?.entityType) return;
    window.dispatchEvent(
      new CustomEvent('tutorial:fill-sample', {
        detail: { type: currentStep.interactivePractice.entityType },
      })
    );
  };

  // Elevate target element z-index so internal inputs & buttons are fully clickable
  useEffect(() => {
    if (!isTourActive || !elementFound) return;
    const isFormMode = Boolean(
      currentStep?.interactivePractice?.formSelector && isFormOpen
    );
    const selector = isFormMode
      ? currentStep?.interactivePractice?.formSelector
      : currentStep?.targetSelector;

    if (!selector) return;
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return;

    const originalPosition = el.style.position;
    const originalZIndex = el.style.zIndex;
    const originalPointerEvents = el.style.pointerEvents;

    const computedPos = window.getComputedStyle(el).position;
    if (computedPos === 'static') {
      el.style.position = 'relative';
    }
    el.style.zIndex = '9999';
    el.style.pointerEvents = 'auto';

    return () => {
      el.style.position = originalPosition;
      el.style.zIndex = originalZIndex;
      el.style.pointerEvents = originalPointerEvents;
    };
  }, [isTourActive, elementFound, currentStep, isFormOpen]);

  if (!isTourActive || !currentStep) {
    return null;
  }

  const isModuleTour = Boolean(activeModuleKey) && moduleSteps.length > 0;
  const displayStepNumber = isModuleTour ? moduleStepIndex + 1 : currentStepIndex + 1;
  const displayTotalSteps = isModuleTour ? moduleSteps.length : totalSteps;
  const isLastStep = isModuleTour
    ? moduleStepIndex === moduleSteps.length - 1
    : currentStepIndex === totalSteps - 1;
  const progressPercent = Math.round((displayStepNumber / displayTotalSteps) * 100);

  const holeTop = targetBounds ? Math.max(0, targetBounds.top - 6) : 0;
  const holeLeft = targetBounds ? Math.max(0, targetBounds.left - 6) : 0;
  const holeWidth = targetBounds ? targetBounds.width + 12 : 0;
  const holeHeight = targetBounds ? targetBounds.height + 12 : 0;
  const holeBottom = holeTop + holeHeight;
  const holeRight = holeLeft + holeWidth;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none transition-opacity duration-300">
      {/* Visual SVG Mask Spotlight Backdrop Layer (pointer-events-none so it renders the smooth masked darkening without blocking any clicks) */}
      {elementFound && targetBounds ? (
        <>
          <svg
            className="fixed inset-0 w-full h-full pointer-events-none z-[9997]"
            style={{ width: '100vw', height: '100vh' }}
          >
            <defs>
              <mask id="tutorial-spotlight-mask">
                {/* White fills entire viewport */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Black cuts out the spotlight hole */}
                <rect
                  x={holeLeft}
                  y={holeTop}
                  width={holeWidth}
                  height={holeHeight}
                  rx="16"
                  ry="16"
                  fill="black"
                />
              </mask>
            </defs>
            {/* Dimmed backdrop with cutout mask applied */}
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(9, 11, 18, 0.72)"
              mask="url(#tutorial-spotlight-mask)"
            />
          </svg>

          {/* 4 Click-Blocker Panels outside the hole: blocks interaction with the rest of the page, while leaving the spotlight hole 100% interactive */}
          {/* 1. Top Blocker */}
          <div
            className="fixed top-0 left-0 right-0 pointer-events-auto z-[9998]"
            style={{ height: Math.max(0, holeTop) }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* 2. Bottom Blocker */}
          <div
            className="fixed left-0 right-0 bottom-0 pointer-events-auto z-[9998]"
            style={{ top: Math.max(0, holeBottom) }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* 3. Left Blocker */}
          <div
            className="fixed left-0 pointer-events-auto z-[9998]"
            style={{
              top: Math.max(0, holeTop),
              height: Math.max(0, holeHeight),
              width: Math.max(0, holeLeft),
            }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* 4. Right Blocker */}
          <div
            className="fixed right-0 pointer-events-auto z-[9998]"
            style={{
              top: Math.max(0, holeTop),
              height: Math.max(0, holeHeight),
              left: Math.max(0, holeRight),
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </>
      ) : (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto transition-opacity z-[9998]"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Target Element Glow Ring Highlight */}
      {elementFound && targetBounds && (
        <div
          className="fixed pointer-events-none rounded-2xl ring-4 ring-indigo-500/70 border-2 border-indigo-500/90 shadow-[0_0_35px_rgba(99,102,241,0.65)] transition-all duration-300 z-[9998]"
          style={{
            top: holeTop,
            left: holeLeft,
            width: holeWidth,
            height: holeHeight,
          }}
        >
          <div className="absolute -inset-1 rounded-[18px] ring-4 ring-indigo-500/30 animate-pulse pointer-events-none" />
        </div>
      )}

      {/* Interactive Tour Popover Card */}
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="fixed pointer-events-auto w-[calc(100vw-24px)] sm:w-[92vw] sm:max-w-[395px] rounded-2xl sm:rounded-3xl bg-background/98 sm:bg-background/95 backdrop-blur-2xl border border-border/80 shadow-2xl p-3.5 sm:p-5 space-y-2.5 sm:space-y-3.5 z-[10000] max-h-[75vh] sm:max-h-none overflow-y-auto sm:overflow-visible"
        style={{
          top: popoverPosition.top,
          left: popoverPosition.left,
        }}
      >
        {/* Header & Step Counter */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 sm:pb-2.5">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="flex h-5.5 w-5.5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] sm:text-[11px] font-bold">
              {displayStepNumber}
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Step {displayStepNumber} of {displayTotalSteps}
            </span>
            {isModuleTour && (
              <Badge variant="outline" className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 px-1.5 py-0">
                {currentStep.moduleKey.replace('-', ' ')}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[9.5px] sm:text-[10px] font-semibold text-muted-foreground/80">
              {progressPercent}%
            </span>
            <button
              onClick={skipTour}
              aria-label="Skip Tutorial"
              className="h-6.5 w-6.5 sm:h-7 sm:w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Title & Short Description */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
            <h3 className="text-[13px] sm:text-base font-extrabold text-foreground tracking-tight leading-snug">
              {currentStep.title}
            </h3>
            {currentStep.primaryActionLabel && (
              <Badge variant="outline" className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                {currentStep.primaryActionLabel}
              </Badge>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-foreground font-medium leading-relaxed">
            {currentStep.shortDescription}
          </p>

          {/* Detailed Explanation & Pro Tip: Collapsible on mobile, permanently visible on PC (sm:block) */}
          <div className={cn("space-y-2 pt-0.5", isMobileExpanded ? "block" : "hidden sm:block")}>
            <p className="text-[10.5px] sm:text-[11.5px] text-muted-foreground leading-relaxed">
              {currentStep.detailedExplanation}
            </p>

            {currentStep.proTip && (
              <div className="flex items-start gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-[10px] sm:text-[11px] leading-relaxed">
                  <span className="font-bold">Pro Tip: </span>
                  {currentStep.proTip}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Read More / Read Less Toggle (hidden on PC) */}
          <div className="sm:hidden pt-0.5">
            <button
              type="button"
              onClick={() => setIsMobileExpanded((prev) => !prev)}
              className="text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{isMobileExpanded ? 'Show less' : 'Read more & Pro Tip...'}</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", isMobileExpanded && "rotate-180")} />
            </button>
          </div>
        </div>

        {/* Interactive Practice Task (Full box on PC; on mobile show action/form buttons or when expanded) */}
        {currentStep.interactivePractice && (
          <div className={cn(
            "rounded-xl sm:rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20",
            currentStep.interactivePractice.type === 'explore'
              ? (isMobileExpanded ? "p-2 sm:p-3 space-y-1 sm:space-y-2 block" : "p-2 sm:p-3 space-y-1 sm:space-y-2 hidden sm:block")
              : "p-2 sm:p-3 space-y-1.5 sm:space-y-2 block"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10.5px] sm:text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <MousePointerClick className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span>
                  {currentStep.interactivePractice.type === 'explore'
                    ? 'Walkthrough Focus'
                    : 'Interactive Practice'}
                </span>
              </div>
              {isFormOpen && !practiceDone && (
                <Badge variant="outline" className="text-[9px] sm:text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 px-1.5 py-0">
                  Form Active
                </Badge>
              )}
            </div>

            <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
              {practiceDone
                ? 'Practice goal completed!'
                : isFormOpen
                ? currentStep.interactivePractice.formPrompt || currentStep.interactivePractice.actionPrompt
                : currentStep.interactivePractice.actionPrompt}
            </p>

            {practiceDone ? (
              <div className="flex items-start gap-1.5 text-[10.5px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-1.5 sm:p-2 rounded-xl border border-emerald-500/20 animate-in fade-in">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{currentStep.interactivePractice.feedbackText}</span>
              </div>
            ) : isFormOpen ? (
              <div className="space-y-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAutoFillSample}
                  className="w-full h-7.5 sm:h-9 text-[10.5px] sm:text-xs font-semibold rounded-xl border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="h-3 w-3" />
                  {currentStep.interactivePractice.sampleButtonText || 'Auto-Fill Sample Data'}
                </Button>
                <p className="text-[9px] sm:text-[10px] text-center text-muted-foreground">
                  Fill details above and click the create button to finish this practice.
                </p>
              </div>
            ) : currentStep.interactivePractice.type === 'click' || currentStep.interactivePractice.type === 'form-create' ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handlePerformPractice}
                className="w-full h-7.5 sm:h-9 text-[10.5px] sm:text-xs font-semibold rounded-xl border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-600 shadow-sm"
              >
                {currentStep.interactivePractice.practiceButtonText || 'Try This Action'}
              </Button>
            ) : null}
          </div>
        )}

        {/* When element is loading or navigating */}
        {isSearching && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground animate-pulse">
            <Info className="h-3.5 w-3.5" />
            <span>Locating module element...</span>
          </div>
        )}

        {/* Tour Navigation Controls */}
        <div className="pt-2 sm:pt-2.5 flex items-center justify-between gap-2 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={prevStep}
            disabled={displayStepNumber === 1}
            className="h-8 sm:h-9 rounded-xl text-xs font-semibold px-2.5 sm:px-3"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Back
          </Button>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={skipTour}
              className="h-8 sm:h-9 text-xs font-semibold text-muted-foreground hover:text-foreground px-2 sm:px-3"
            >
              Skip
            </Button>

            <PlanButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                if (isLastStep) {
                  triggerConfetti();
                  finishTour();
                } else {
                  nextStep();
                }
              }}
              className={cn(
                "h-8 sm:h-9 rounded-xl text-xs font-bold px-3.5 sm:px-4 shadow-md shadow-indigo-500/25 flex items-center gap-1.5 transition-all",
                practiceDone && "ring-2 ring-indigo-400 shadow-indigo-500/40 animate-pulse"
              )}
            >
              {isLastStep ? (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isModuleTour ? 'Finish Guide' : 'Finish Tour'}</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </>
              )}
            </PlanButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
