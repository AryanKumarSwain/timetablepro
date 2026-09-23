'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Users,
  BookOpen,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wand2,
  Calendar,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Subject, Teacher, Class } from '@/lib/types';

interface AiGenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timetableId: string;
  teachers: (Teacher & { subjects?: any })[];
  subjects: Subject[];
  classes: Class[];
  currentClassId?: string;
  onSuccess: () => Promise<void>;
}

export function AiGenerateModal({
  open,
  onOpenChange,
  timetableId,
  teachers,
  subjects,
  classes,
  currentClassId,
  onSuccess,
}: AiGenerateModalProps) {
  // Generation Options
  const [scope, setScope] = useState<'all' | 'current'>('all');
  const [equalWorkload, setEqualWorkload] = useState(true);
  const [avoidConsecutive, setAvoidConsecutive] = useState(true);
  const [fillOnlyEmpty, setFillOnlyEmpty] = useState(false);
  const [generating, setGenerating] = useState(false);

  const activeTeachers = teachers.filter((t) => t.active !== false);

  const handleExecuteGeneration = async () => {
    setGenerating(true);
    try {
      const targetClassIds =
        scope === 'current' && currentClassId ? [currentClassId] : classes.map((c) => c.id);

      const res = await fetch(`/api/admin/timetables/${timetableId}/auto-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetClassIds,
          options: {
            equalWorkload,
            fillOnlyEmpty,
            avoidConsecutive,
            assignRooms: false,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to auto-generate timetable slots.');
      }

      toast.success(data.message || 'Timetable slots successfully generated with AI!');
      onOpenChange(false);
      await onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error occurred during timetable generation.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl rounded-3xl p-6 shadow-2xl border-purple-500/20">
        {/* MODAL HEADER */}
        <DialogHeader className="pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                Generate Timetable with AI
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Automatically schedules conflict-free periods using your catalog&apos;s class, subject, and teacher linkages.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* CONTENT */}
        <div className="space-y-5 py-2">
          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                <Layers className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Classes</p>
                <p className="text-base font-bold text-foreground">{classes.length}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Subjects</p>
                <p className="text-base font-bold text-foreground">{subjects.length}</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Active Faculty</p>
                <p className="text-base font-bold text-foreground">{activeTeachers.length}</p>
              </div>
            </div>
          </div>

          {/* SCOPE SELECTION */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Scheduling Scope
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all flex items-start justify-between',
                  scope === 'all'
                    ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 text-foreground ring-1 ring-purple-600'
                    : 'border-border bg-card hover:border-border/80 text-muted-foreground'
                )}
              >
                <div>
                  <p className="text-xs font-bold text-foreground">All Classes</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Generate timetable for all {classes.length} school classes
                  </p>
                </div>
                {scope === 'all' && <Check className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => setScope('current')}
                disabled={!currentClassId}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all flex items-start justify-between',
                  !currentClassId && 'opacity-50 cursor-not-allowed',
                  scope === 'current'
                    ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 text-foreground ring-1 ring-purple-600'
                    : 'border-border bg-card hover:border-border/80 text-muted-foreground'
                )}
              >
                <div>
                  <p className="text-xs font-bold text-foreground">Current Class Only</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Generate slots only for currently viewed class
                  </p>
                </div>
                {scope === 'current' && <Check className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />}
              </button>
            </div>
          </div>

          {/* OPTIMIZATION RULES */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              AI Scheduling Rules
            </label>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-xl border border-border/70 hover:bg-muted/30 transition-all cursor-pointer">
                <div className="space-y-0.5 pr-4">
                  <span className="text-xs font-bold text-foreground block">
                    Balance Workload Evenly
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Distributes teaching periods proportionally among eligible teachers
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={equalWorkload}
                  onChange={(e) => setEqualWorkload(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 shrink-0"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-border/70 hover:bg-muted/30 transition-all cursor-pointer">
                <div className="space-y-0.5 pr-4">
                  <span className="text-xs font-bold text-foreground block">
                    Avoid Consecutive Same-Subject Periods
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Prevents students from having back-to-back periods of the same course
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={avoidConsecutive}
                  onChange={(e) => setAvoidConsecutive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 shrink-0"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-border/70 hover:bg-muted/30 transition-all cursor-pointer">
                <div className="space-y-0.5 pr-4">
                  <span className="text-xs font-bold text-foreground block">
                    Fill Only Empty Slots
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Preserves any existing manual slots and fills remaining vacancies
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={fillOnlyEmpty}
                  onChange={(e) => setFillOnlyEmpty(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 shrink-0"
                />
              </label>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <DialogFooter className="pt-4 border-t border-border/60 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={generating}
            className="rounded-xl text-xs h-10"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleExecuteGeneration}
            disabled={generating || classes.length === 0 || subjects.length === 0}
            className="rounded-xl text-xs h-10 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold shadow-md shadow-purple-500/25 gap-2 px-5"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Timetable...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Timetable with AI
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
