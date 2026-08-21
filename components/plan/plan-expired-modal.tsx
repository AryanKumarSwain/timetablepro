"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { UserX, Sparkles, Check, AlertTriangle, Trash2 } from 'lucide-react';
import { getTeachers, deleteTeacher } from '@/lib/api-services';

interface TeacherItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export default function PlanExpiredModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [teacherCount, setTeacherCount] = useState<number>(0);
  const [planTeacherMax, setPlanTeacherMax] = useState<number>(5);
  const [planName, setPlanName] = useState<string>('Free');

  const [mode, setMode] = useState<'overview' | 'select_teachers'>('overview');
  const [teachersList, setTeachersList] = useState<TeacherItem[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/admin/school');
      if (!res.ok) return;
      const data = await res.json();

      const status = data.licenseStatus;
      const planEndsAt = data.planEndsAt ? new Date(data.planEndsAt) : null;
      const now = new Date();

      const currentTeacherCount = typeof data.teacherCount === 'number' ? data.teacherCount : 0;
      const maxAllowed = data.plan?.teacherMax ?? 5;
      const currentPlanName = data.plan?.name ?? 'Free';

      const isExpired = status === 'EXPIRED' || (planEndsAt && planEndsAt < now);
      const isOverLimit = currentTeacherCount > maxAllowed;

      if (isOverLimit || (isExpired && maxAllowed < currentTeacherCount)) {
        setTeacherCount(currentTeacherCount);
        setPlanTeacherMax(maxAllowed);
        setPlanName(currentPlanName);
        setOpen(true);

        // Fetch teachers list for selection flow
        try {
          const list = await getTeachers();
          setTeachersList(list || []);
        } catch (e) {
          console.error('Failed to fetch teachers for removal modal', e);
        }
      } else {
        setOpen(false);
      }
    } catch (e) {
      console.error('Failed to fetch school status for PlanExpiredModal', e);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const excessCount = Math.max(0, teacherCount - planTeacherMax);

  const handleTeacherToggle = (teacherId: string) => {
    setSelectedTeachers((prev) => {
      if (prev.includes(teacherId)) {
        return prev.filter((id) => id !== teacherId);
      }
      if (prev.length >= excessCount) {
        toast.error(`You need to select exactly ${excessCount} teachers to delete.`);
        return prev;
      }
      return [...prev, teacherId];
    });
  };

  const handleBulkDelete = async () => {
    if (selectedTeachers.length !== excessCount) {
      toast.error(`Please select exactly ${excessCount} teachers to delete.`);
      return;
    }

    setDeleting(true);
    try {
      for (const id of selectedTeachers) {
        await deleteTeacher(id);
      }
      toast.success(`${selectedTeachers.length} teacher(s) deleted successfully.`);
      setSelectedTeachers([]);
      setMode('overview');
      await checkStatus();
    } catch (err) {
      console.error('Error deleting excess teachers:', err);
      toast.error('Failed to delete selected teachers.');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenChange = () => {
    // Modal is mandatory when over limit
    if (teacherCount > planTeacherMax) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-lg p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-amber-200 dark:border-amber-900/50">
        {mode === 'overview' ? (
          <div className="space-y-4">
            <DialogHeader className="text-left space-y-2">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-white">
                Teacher Limit Exceeded ({planName} Plan)
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Your school has reverted to the <strong className="text-slate-900 dark:text-slate-200">{planName} plan</strong> (Max {planTeacherMax} teachers). 
                You currently have <strong className="text-amber-600 font-bold">{teacherCount}</strong> active teachers, which is <strong className="text-rose-600 font-bold">{excessCount}</strong> teacher(s) over the limit.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <p className="font-semibold">Action Required:</p>
              <p>Please select and delete {excessCount} teacher(s) to stay within the {planName} plan limit, or upgrade your plan to keep all teachers.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={() => setMode('select_teachers')}
                variant="default"
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center justify-center gap-2 py-5 text-xs rounded-xl shadow-xs"
              >
                <UserX className="h-4 w-4" />
                Select & Delete Teachers ({excessCount})
              </Button>

              <Button
                onClick={() => router.push('/admin/upgrade')}
                variant="outline"
                className="flex-1 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-semibold flex items-center justify-center gap-2 py-5 text-xs rounded-xl"
              >
                <Sparkles className="h-4 w-4" />
                Upgrade Plan Now
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <DialogHeader className="text-left space-y-1">
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserX className="h-5 w-5 text-rose-500" /> Select {excessCount} Teacher(s) to Delete
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                You must remove {excessCount} teacher(s) to bring your count down from {teacherCount} to the {planName} plan limit of {planTeacherMax}.
              </DialogDescription>
            </DialogHeader>

            {/* Teacher Selection List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 my-2">
              {teachersList.map((teacher) => {
                const isSelected = selectedTeachers.includes(teacher.id);
                return (
                  <div
                    key={teacher.id}
                    onClick={() => handleTeacherToggle(teacher.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-rose-50 border-rose-400 dark:bg-rose-950/40 dark:border-rose-800 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{teacher.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{teacher.email}</p>
                    </div>

                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-rose-600 border-rose-600 text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                    }`}>
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>Selected for deletion: <strong className="text-rose-600">{selectedTeachers.length}</strong> / {excessCount}</span>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setMode('overview')}
                disabled={deleting}
                className="flex-1 py-4 text-xs rounded-xl"
              >
                Back
              </Button>

              <Button
                onClick={handleBulkDelete}
                disabled={deleting || selectedTeachers.length !== excessCount}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-4 text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting...' : `Delete Selected (${selectedTeachers.length})`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
