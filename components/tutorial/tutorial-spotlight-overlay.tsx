'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTutorial } from '@/lib/tutorial/tutorial-context';
import { Button } from '@/components/ui/button';
import { PlanButton } from '@/components/ui/plan-button';
import { Badge } from '@/components/ui/badge';
import confetti from 'canvas-confetti';
import {
  ChevronLeft,
  ChevronRight,
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
    nextStep,
    prevStep,
    skipTour,
    finishTour,
    isNavigatingRoute,
  } = useTutorial();

  const [targetBounds, setTargetBounds] = useState<ElementBounds | null>(null);
  const [elementFound, setElementFound] = useState(false);
  const [isSearching, setIsSearching] = useState(true);
  const [practiceDone, setPracticeDone] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  }>({ top: 100, left: 100, placement: 'bottom' });

  const popoverRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Reset practice state when step changes
  useEffect(() => {
    setPracticeDone(false);
  }, [currentStepIndex]);

  // Find and measure target element with retries
  const measureTargetElement = useCallback(() => {
    if (!currentStep) return;

    const selector = currentStep.targetSelector;
    const element = document.querySelector(selector);

    if (element) {
      const rect = element.getBoundingClientRect();
      // Scroll into view if needed
      const isVisibleInViewport =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth);

      if (!isVisibleInViewport) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }

      const updatedRect = element.getBoundingClientRect();
      const bounds: ElementBounds = {
        top: Math.max(0, updatedRect.top),
        left: Math.max(0, updatedRect.left),
        width: updatedRect.width,
        height: updatedRect.height,
        right: updatedRect.right,
        bottom: updatedRect.bottom,
      };

      setTargetBounds(bounds);
      setElementFound(true);
      setIsSearching(false);
    } else {
      // Element not yet in DOM
      setElementFound(false);
    }
  }, [currentStep]);

  // Handle element discovery with polling / retry
  useEffect(() => {
    if (!isTourActive || !currentStep || isNavigatingRoute) {
      setTargetBounds(null);
      return;
    }

    setIsSearching(true);
    let attempts = 0;
    const maxAttempts = 15; // 15 * 200ms = 3.0s total retry window

    const interval = setInterval(() => {
      attempts++;
      const selector = currentStep.targetSelector;
      const el = document.querySelector(selector);

      if (el) {
        measureTargetElement();
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        setIsSearching(false);
        setElementFound(false);
        setTargetBounds(null);
      }
    }, 200);

    return () => {
      clearInterval(interval);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [isTourActive, currentStep, isNavigatingRoute, measureTargetElement]);

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

    if (!targetBounds || !elementFound) {
      // Fallback: Center on screen
      setPopoverPosition({
        top: Math.max(margin, (viewportHeight - popoverHeight) / 2),
        left: Math.max(margin, (viewportWidth - popoverWidth) / 2),
        placement: 'center',
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
  }, [targetBounds, elementFound, currentStep?.placement, isTourActive]);

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

    const targetSel = currentStep.interactivePractice.targetElementSelector;
    if (targetSel) {
      const el = document.querySelector(targetSel) as HTMLElement;
      if (el) {
        el.click();
      }
    }
    setPracticeDone(true);
  };

  if (!isTourActive || !currentStep) {
    return null;
  }

  const isLastStep = currentStepIndex === totalSteps - 1;
  const progressPercent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none select-none transition-opacity duration-300">
      {/* Dimmed Backdrop Layer with Spotlight Cutout */}
      {elementFound && targetBounds ? (
        <div
          className="absolute inset-0 pointer-events-auto transition-all duration-300"
          style={{
            background: 'rgba(9, 11, 18, 0.65)',
            clipPath: `polygon(
              0% 0%,
              0% 100%,
              ${targetBounds.left - 6}px 100%,
              ${targetBounds.left - 6}px ${targetBounds.top - 6}px,
              ${targetBounds.right + 6}px ${targetBounds.top - 6}px,
              ${targetBounds.right + 6}px ${targetBounds.bottom + 6}px,
              ${targetBounds.left - 6}px ${targetBounds.bottom + 6}px,
              ${targetBounds.left - 6}px 100%,
              100% 100%,
              100% 0%
            )`,
          }}
          onClick={(e) => {
            // Clicking backdrop does not accidentally close, preventing loss of progress
            e.stopPropagation();
          }}
        />
      ) : (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px] pointer-events-auto transition-opacity"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Target Element Glow Ring Highlight */}
      {elementFound && targetBounds && (
        <div
          className="absolute pointer-events-none rounded-2xl ring-4 ring-indigo-500/70 ring-offset-2 ring-offset-transparent shadow-[0_0_25px_rgba(99,102,241,0.5)] transition-all duration-300"
          style={{
            top: targetBounds.top - 6,
            left: targetBounds.left - 6,
            width: targetBounds.width + 12,
            height: targetBounds.height + 12,
          }}
        />
      )}

      {/* Interactive Tour Popover Card */}
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="absolute pointer-events-auto w-[92vw] max-w-[430px] rounded-3xl bg-background/95 backdrop-blur-2xl border border-border/80 shadow-2xl p-5 sm:p-6 space-y-4"
        style={{
          top: popoverPosition.top,
          left: popoverPosition.left,
        }}
      >
        {/* Header & Step Counter */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">
              {currentStepIndex + 1}
            </span>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-muted-foreground/80">
              {progressPercent}%
            </span>
            <button
              onClick={skipTour}
              aria-label="Skip Tutorial"
              className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
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
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-foreground tracking-tight">
              {currentStep.title}
            </h3>
            {currentStep.primaryActionLabel && (
              <Badge variant="outline" className="text-[10px] font-bold px-2 py-0 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                {currentStep.primaryActionLabel}
              </Badge>
            )}
          </div>
          <p className="text-xs text-foreground font-medium leading-relaxed">
            {currentStep.shortDescription}
          </p>
          <p className="text-[12px] text-muted-foreground leading-relaxed pt-1">
            {currentStep.detailedExplanation}
          </p>
        </div>

        {/* Pro Tip Callout */}
        {currentStep.proTip && (
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
            <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <span className="font-bold">Pro Tip: </span>
              {currentStep.proTip}
            </div>
          </div>
        )}

        {/* Interactive Practice Task (Safe Practice) */}
        {currentStep.interactivePractice && (
          <div className="p-3.5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
              <MousePointerClick className="h-3.5 w-3.5" />
              <span>Interactive Practice</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {currentStep.interactivePractice.actionPrompt}
            </p>

            {practiceDone ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-2 rounded-xl">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{currentStep.interactivePractice.feedbackText}</span>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handlePerformPractice}
                className="w-full text-xs font-semibold rounded-xl border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-600"
              >
                {currentStep.interactivePractice.practiceButtonText || 'Try This Action'}
              </Button>
            )}
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
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="rounded-xl text-xs font-semibold"
          >
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={skipTour}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Skip
            </Button>

            {isLastStep ? (
              <PlanButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  triggerConfetti();
                  finishTour();
                }}
                className="rounded-xl text-xs font-bold px-4 shadow-md shadow-indigo-500/25 flex items-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Finish Tour
              </PlanButton>
            ) : (
              <PlanButton
                type="button"
                variant="primary"
                size="sm"
                onClick={nextStep}
                className="rounded-xl text-xs font-bold px-4 shadow-md shadow-indigo-500/25 flex items-center gap-1.5"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </PlanButton>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
