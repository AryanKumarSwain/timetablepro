'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlanButton } from '@/components/ui/plan-button';
import { useTutorial } from '@/lib/tutorial/tutorial-context';
import {
  Sparkles,
  Table2,
  Users,
  Compass,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
} from 'lucide-react';

export function TutorialWelcomeModal() {
  const { isWelcomeOpen, startTour, closeWelcomeModal } = useTutorial();

  return (
    <Dialog open={isWelcomeOpen} onOpenChange={(open) => !open && closeWelcomeModal()}>
      <DialogContent className="w-[95vw] sm:max-w-[620px] max-h-[90vh] sm:max-h-none p-0 overflow-hidden rounded-2xl sm:rounded-3xl border-border/60 bg-background/95 backdrop-blur-2xl shadow-2xl flex flex-col">
        {/* Decorative Top Accent Banner */}
        <div className="relative h-24 sm:h-32 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-4 sm:p-6 flex flex-col justify-between overflow-hidden shrink-0">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -left-4 -bottom-10 w-32 h-32 bg-purple-400/20 rounded-full blur-lg pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10.5px] sm:text-[11px] font-semibold text-white tracking-wide uppercase">
              <Sparkles className="h-3 w-3" />
              Interactive Onboarding
            </span>
            <span className="text-white/80 text-[11px] sm:text-xs font-medium">Timetable Pro v1.0</span>
          </div>

          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Welcome to Timetable Pro!
            </h2>
          </div>
        </div>

        {/* Modal Body: Scrollable on mobile */}
        <div className="p-4 sm:p-7 space-y-4 sm:space-y-6 overflow-y-auto flex-1 min-h-0">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Let&apos;s take a quick tour to help you understand the tools available to you and get the
            most out of your timetable management experience.
          </p>

          {/* Key Value Proposition Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-muted/40 border border-border/50 space-y-1 sm:space-y-1.5 transition-all hover:bg-muted/60">
              <div className="h-7.5 w-7.5 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Table2 className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold text-foreground">Master Timetables</h4>
              <p className="text-[10.5px] sm:text-[11px] text-muted-foreground leading-normal">
                Generate clash-free schedules with AI constraint solvers.
              </p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-muted/40 border border-border/50 space-y-1 sm:space-y-1.5 transition-all hover:bg-muted/60">
              <div className="h-7.5 w-7.5 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-violet-500/10 text-violet-500 dark:text-violet-400 flex items-center justify-center font-bold">
                <Zap className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold text-foreground">Real-time Daily Desk</h4>
              <p className="text-[10.5px] sm:text-[11px] text-muted-foreground leading-normal">
                Handle teacher leaves and instant substitute coverage effortlessly.
              </p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-muted/40 border border-border/50 space-y-1 sm:space-y-1.5 transition-all hover:bg-muted/60">
              <div className="h-7.5 w-7.5 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center font-bold">
                <Users className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold text-foreground">Faculty & Classes</h4>
              <p className="text-[10.5px] sm:text-[11px] text-muted-foreground leading-normal">
                Centralized academic roster with 1-click credential distribution.
              </p>
            </div>
          </div>

          {/* Quick Perks Checklist */}
          <div className="rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-3 sm:p-3.5 border border-border/40 space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-foreground font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0" />
              <span>Interactive step-by-step guidance tailored to your school</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-foreground font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0" />
              <span>Safe sandbox practice — no real data will be accidentally overwritten</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-foreground font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0" />
              <span>Access the tour or module help anytime via the (?) Help menu</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Pinned bottom bar on mobile so it's always accessible */}
        <div className="p-3 sm:p-4 border-t border-border/40 bg-background/98 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 sm:gap-3 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={closeWelcomeModal}
            className="w-full sm:w-auto h-8.5 sm:h-9 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Compass className="h-3.5 w-3.5 mr-1.5" />
            Explore on My Own
          </Button>

          <PlanButton
            type="button"
            variant="primary"
            onClick={() => startTour(0)}
            className="w-full sm:w-auto h-9 sm:h-9.5 rounded-xl text-xs font-bold px-6 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Start Tutorial
            <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
          </PlanButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
