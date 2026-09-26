'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  Lock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatClassName } from '@/lib/utils';
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

const parseArray = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return val ? [val] : [];
    }
  }
  return [];
};

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
  const router = useRouter();

  // Generation Options
  const [scope, setScope] = useState<'all' | 'current'>('all');
  const [equalWorkload, setEqualWorkload] = useState(true);
  const [avoidConsecutive, setAvoidConsecutive] = useState(true);
  const [fillOnlyEmpty, setFillOnlyEmpty] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeTeachers = useMemo(() => {
    return (teachers || []).filter((t) => t.active !== false);
  }, [teachers]);

  // Teachers who have both classes and subjects assigned
  const configuredTeachers = useMemo(() => {
    return activeTeachers.filter((t) => {
      const tClasses = parseArray(t.classes);
      if (tClasses.length === 0) return false;

      const rawSubjects = parseArray(t.subjects);
      const hasSpecialty = Boolean((t as any).subjectSpecialtyId);
      return rawSubjects.length > 0 || hasSpecialty;
    });
  }, [activeTeachers]);

  const currentClassObj = useMemo(() => {
    return (classes || []).find((c) => c.id === currentClassId);
  }, [classes, currentClassId]);

  // Configured teachers for the currently selected class
  const configuredTeachersForCurrentClass = useMemo(() => {
    if (!currentClassId) return configuredTeachers;
    return configuredTeachers.filter((t) => {
      const tClasses = parseArray(t.classes);
      const teachesClass =
        tClasses.includes(currentClassId) ||
        (currentClassObj?.name && tClasses.includes(currentClassObj.name));
      if (!teachesClass) return false;

      const rawSubjects = parseArray(t.subjects);
      const classSpecific = rawSubjects.filter((s: string) => typeof s === 'string' && s.includes(':::'));
      if (classSpecific.length > 0) {
        return classSpecific.some((entry: string) => {
          const [cid] = entry.split(':::');
          return cid === currentClassId || (currentClassObj?.name && cid === currentClassObj.name);
        });
      }
      return true;
    });
  }, [configuredTeachers, currentClassId, currentClassObj]);

  const isScopeLocked =
    scope === 'current'
      ? configuredTeachersForCurrentClass.length === 0
      : configuredTeachers.length === 0;

  const isLocked = isScopeLocked || classes.length === 0 || subjects.length === 0;

  const handleExecuteGeneration = async () => {
    if (isLocked) return;

    setGenerating(true);
    setErrorMessage(null);
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
      // Inline error state instead of toast error as requested ("tost mat do")
      setErrorMessage(err.message || 'Error occurred during timetable generation.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRedirectToTeachers = () => {
    onOpenChange(false);
    router.push('/admin/teachers');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setErrorMessage(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-xl md:max-w-2xl rounded-3xl p-6 shadow-2xl border-purple-500/20 max-h-[90vh] overflow-y-auto">
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

            <div
              className={cn(
                'p-3 rounded-2xl border flex items-center gap-3 transition-colors',
                configuredTeachers.length === 0
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-muted/40 border-border/60'
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-xl shrink-0',
                  configuredTeachers.length === 0
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                )}
              >
                {configuredTeachers.length === 0 ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">Assigned Faculty</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-base font-bold text-foreground">
                    {configuredTeachers.length}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      / {activeTeachers.length}
                    </span>
                  </p>
                  {configuredTeachers.length === 0 && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5 font-semibold"
                    >
                      0 Assigned
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TEACHER ASSIGNMENT REQUIRED WARNING / REDIRECT BANNER */}
          {configuredTeachers.length === 0 ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/25 p-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">
                      Faculty Assignment Required
                    </h4>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-bold tracking-wider border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                    >
                      Locked
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    None of your {activeTeachers.length} teachers have been assigned classes and subjects in the Faculty Directory. Timetable AI requires teacher-class and subject assignments to generate conflict-free schedules.
                  </p>
                  <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                    <Button
                      type="button"
                      onClick={handleRedirectToTeachers}
                      className="h-8 px-3.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-sm transition-all"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Go to Teachers Directory
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-[11px] text-muted-foreground">
                      Assign classes & subjects to unlock AI generation
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : scope === 'current' && configuredTeachersForCurrentClass.length === 0 ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/25 p-4 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                  <Lock className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-foreground">
                      No Faculty Assigned to {formatClassName(currentClassObj) || 'Selected Class'}
                    </h4>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-bold tracking-wider border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                    >
                      Class Locked
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    No faculty members are currently assigned to teach {formatClassName(currentClassObj) || 'this class'}. Assign teachers to this class or switch scope to &quot;All Classes&quot;.
                  </p>
                  <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                    <Button
                      type="button"
                      onClick={handleRedirectToTeachers}
                      className="h-8 px-3.5 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-sm transition-all"
                    >
                      <Users className="h-3.5 w-3.5" />
                      Assign in Teachers Directory
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* INLINE ERROR BANNER (INSTEAD OF TOAST) */}
          {errorMessage && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-xs text-foreground flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-destructive">{errorMessage}</p>
                <div className="mt-2.5">
                  <Button
                    type="button"
                    onClick={handleRedirectToTeachers}
                    variant="outline"
                    className="h-7 px-2.5 rounded-lg text-xs font-medium border-destructive/40 text-destructive hover:bg-destructive/10 gap-1.5"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Open Teachers Directory
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

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
                    Generate slots only for {formatClassName(currentClassObj) || 'currently viewed class'}
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
            disabled={generating || isLocked}
            className={cn(
              'rounded-xl text-xs h-10 font-bold gap-2 px-5 transition-all',
              isLocked
                ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border opacity-70'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-500/25'
            )}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Timetable...
              </>
            ) : isLocked ? (
              <>
                <Lock className="h-4 w-4" />
                Generation Locked
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
