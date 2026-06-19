'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Edit, Plus, Trash2, Check, X } from 'lucide-react';

import { useRequireAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableHeader, TableBody, TableRow,
  TableHead, TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  createSuperAdminPlan,
  deleteSuperAdminPlan,
  getSuperAdminPlans,
  updateSuperAdminPlan,
  type SaasPlan,
} from '@/lib/api-services';

// ─── Types ────────────────────────────────────────────────────────────────────

type SchoolTrialRequest = {
  id: string;
  schoolId: string;
  schoolName: string;
  trialPlanId: string | null;
  trialPlanName: string | null;
  currentPlanName: string | null;
  trialStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  trialEndsAt: string | null;
  createdAt: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPORT_FORMATS = ['pdf', 'docx', 'csv'] as const;

const FEATURE_FLAGS = [
  { field: 'reportEnabled',     label: 'Reports' },
  { field: 'attendanceEnabled', label: 'Attendance' },
  { field: 'homeworkEnabled',   label: 'Homework' },
  { field: 'watermarkRequired', label: 'Watermark required' },
] as const;

type FeatureFlagField = typeof FEATURE_FLAGS[number]['field'];

const emptyForm = {
  name:              '',
  description:       '',
  teacherMin:        '0',
  teacherMax:        '0',
  priceMonthly:      '0',
  features:          [] as string[],
  reportEnabled:     true,
  attendanceEnabled: true,
  homeworkEnabled:   true,
  watermarkRequired: false,
  exportFormats:     [] as string[],
};

type PlanForm = typeof emptyForm;
type PlanMode = 'create' | 'edit';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTeacherRange = (min: number, max: number) =>
  max > 9999 ? `${min}+` : `${min}–${max}`;

const parseNumber = (value: string) => Number(value.replace(/[^0-9.]/g, '') || 0);

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlansPage() {
  useRequireAuth('super-admin');

  const { toast } = useToast();

  const [plans, setPlans]                 = useState<SaasPlan[]>([]);
  const [trialRequests, setTrialRequests] = useState<SchoolTrialRequest[]>([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [fetchError, setFetchError]       = useState<string | null>(null);

  // form dialog
  const [formOpen, setFormOpen]         = useState(false);
  const [formMode, setFormMode]         = useState<PlanMode>('create');
  const [selectedPlan, setSelectedPlan] = useState<SaasPlan | null>(null);
  const [formValues, setFormValues]     = useState<PlanForm>(emptyForm);
  const [formErrors, setFormErrors]     = useState<Partial<Record<keyof PlanForm, string>>>({});

  // delete dialog
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SaasPlan | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchPlans = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await getSuperAdminPlans();
      setPlans(data);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrialRequests = async () => {
    try {
      const res = await fetch('/api/super-admin/trial-requests');
      if (res.ok) setTrialRequests(await res.json());
    } catch (err) {
      console.error('Failed to load trial requests:', err);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchTrialRequests();
  }, []);

  const planRows = useMemo(() => plans, [plans]);

  // Check for duplicate plan names
  const duplicateNames = useMemo(() => {
    const nameCounts = plans.reduce((acc, plan) => {
      acc[plan.name] = (acc[plan.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(nameCounts).filter(([_, count]) => count > 1).map(([name]) => name);
  }, [plans]);

  // ── Form helpers ───────────────────────────────────────────────────────────

  const openCreate = () => {
    setFormMode('create');
    setSelectedPlan(null);
    setFormValues(emptyForm);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (plan: SaasPlan) => {
    setFormMode('edit');
    setSelectedPlan(plan);
    setFormValues({
      name:              plan.name,
      description:       plan.description ?? '',
      teacherMin:        String(plan.teacherMin),
      teacherMax:        String(plan.teacherMax),
      priceMonthly:      String(plan.priceMonthly),
      features:          plan.features          ?? [],
      reportEnabled:     plan.reportEnabled     ?? true,
      attendanceEnabled: plan.attendanceEnabled ?? true,
      homeworkEnabled:   plan.homeworkEnabled   ?? true,
      watermarkRequired: plan.watermarkRequired ?? false,
      exportFormats:     plan.exportFormats     ?? [],
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const openDelete = (plan: SaasPlan) => {
    setPlanToDelete(plan);
    setDeleteOpen(true);
  };

  const toggleExportFormat = (format: string) => {
    setFormValues((cur) => {
      const has = cur.exportFormats.includes(format);
      return {
        ...cur,
        exportFormats: has
          ? cur.exportFormats.filter((f) => f !== format)
          : [...cur.exportFormats, format],
      };
    });
  };

  const setFlag = (field: FeatureFlagField, checked: boolean) => {
    setFormValues((cur) => ({ ...cur, [field]: checked }));
  };

  // ── Validation ─────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof PlanForm, string>> = {};
    const name        = formValues.name.trim();
    const teacherMin  = parseNumber(formValues.teacherMin);
    const teacherMax  = parseNumber(formValues.teacherMax);
    const priceMonthly = parseNumber(formValues.priceMonthly);

    if (!name) errors.name = 'Plan name is required.';
    if (!Number.isFinite(teacherMin) || teacherMin < 0)
      errors.teacherMin = 'Enter a valid minimum teacher count.';
    if (!Number.isFinite(teacherMax) || teacherMax < 0)
      errors.teacherMax = 'Enter a valid maximum teacher count.';
    if (Number.isFinite(teacherMin) && Number.isFinite(teacherMax) && teacherMax < teacherMin)
      errors.teacherMax = 'Maximum must be ≥ minimum.';
    if (!Number.isFinite(priceMonthly) || priceMonthly < 0)
      errors.priceMonthly = 'Enter a valid monthly price.';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Submit / delete ────────────────────────────────────────────────────────

  const handleFormSubmit = async () => {
    if (!validateForm()) return;

    const payload = {
      name:              formValues.name.trim(),
      description:       formValues.description.trim(),
      teacherMin:        parseNumber(formValues.teacherMin),
      teacherMax:        parseNumber(formValues.teacherMax),
      priceMonthly:      parseNumber(formValues.priceMonthly),
      features:          formValues.features,
      reportEnabled:     formValues.reportEnabled,
      attendanceEnabled: formValues.attendanceEnabled,
      homeworkEnabled:   formValues.homeworkEnabled,
      watermarkRequired: formValues.watermarkRequired,
      exportFormats:     formValues.exportFormats,
    };

    setSaving(true);
    try {
      if (formMode === 'create') {
        const created = await createSuperAdminPlan(payload);
        setPlans((cur) => [created, ...cur]);
        toast({ title: 'Plan created', description: `${created.name} was added successfully.` });
      } else if (selectedPlan) {
        const updated = await updateSuperAdminPlan(selectedPlan.id, payload);
        setPlans((cur) => cur.map((p) => (p.id === updated.id ? updated : p)));
        toast({ title: 'Plan updated', description: `${updated.name} has been saved.` });
      }
      setFormOpen(false);
    } catch (err) {
      toast({
        title: 'Unable to save plan',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setSaving(true);
    try {
      await deleteSuperAdminPlan(planToDelete.id);
      setPlans((cur) => cur.filter((p) => p.id !== planToDelete.id));
      toast({ title: 'Plan deleted', description: `${planToDelete.name} has been removed.` });
      setDeleteOpen(false);
    } catch (err) {
      toast({
        title: 'Unable to delete plan',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTrialAction = async (requestId: string, action: 'APPROVE' | 'REJECT') => {
    setSaving(true);
    try {
      const res = await fetch('/api/super-admin/trial-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process trial request');
      }
      toast({ title: 'Success', description: `Trial request ${action.toLowerCase()}d` });
      await fetchTrialRequests();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to process trial request',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='max-w-7xl mx-auto space-y-6'>
      <PageHeader
        title='Subscription Plans'
        description='Create and manage the pricing plans your schools subscribe to.'
        breadcrumbs={[
          { label: 'Super Admin', href: '/super-admin/dashboard' },
          { label: 'Plans' },
        ]}
      />

      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h2 className='text-lg font-semibold'>Plan catalog</h2>
          <p className='text-sm text-muted-foreground'>
            Add, edit, and remove subscription plans for your platform.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className='w-4 h-4 mr-2' />
          New plan
        </Button>
      </div>

      {/* ── Trial requests banner ── */}
      {trialRequests.length > 0 && (
        <GlassCard className='p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20'>
          <h3 className='font-semibold text-amber-700 dark:text-amber-400 mb-4'>
            Pending Trial Requests ({trialRequests.length})
          </h3>
          <div className='space-y-3'>
            {trialRequests.map((req) => (
              <div
                key={req.id}
                className='flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border/40'
              >
                <div>
                  <p className='font-medium'>{req.schoolName}</p>
                  <p className='text-sm text-muted-foreground'>
                    Current: {req.currentPlanName || 'No plan'} → Trial:{' '}
                    {req.trialPlanName || 'No plan selected'}
                  </p>
                </div>
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => handleTrialAction(req.id, 'REJECT')}
                    disabled={saving}
                    className='text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                  >
                    <X className='w-4 h-4 mr-1' /> Reject
                  </Button>
                  <Button
                    size='sm'
                    onClick={() => handleTrialAction(req.id, 'APPROVE')}
                    disabled={saving}
                    className='bg-emerald-600 hover:bg-emerald-700'
                  >
                    <Check className='w-4 h-4 mr-1' /> Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {fetchError && (
        <div className='rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-600'>
          {fetchError}
        </div>
      )}

      {duplicateNames.length > 0 && (
        <div className='rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600'>
          <p className='font-semibold mb-1'>⚠️ Duplicate plan names detected:</p>
          <p className='mb-2'>{duplicateNames.join(', ')}</p>
          <p className='text-xs'>Please delete the duplicate plans to avoid confusion. Duplicate plans cannot be edited to the same name.</p>
        </div>
      )}

      {/* ── Plan table ── */}
      <GlassCard className='p-6'>
        {loading ? (
          <div className='space-y-3'>
            {[...Array(4)].map((_, i) => (
              <div key={i} className='h-16 rounded-lg bg-muted/30 animate-pulse' />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Plan name</TableHead>
                <TableHead>Teacher range</TableHead>
                <TableHead>Monthly price</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Exports</TableHead>
                <TableHead>Schools</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {planRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='py-6 text-center text-sm text-muted-foreground'>
                    No subscription plans are configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                planRows.map((plan) => {
                  const isDuplicate = duplicateNames.includes(plan.name);
                  return (
                    <TableRow key={plan.id} className={isDuplicate ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}>
                      <TableCell className='font-medium'>
                        {plan.name}
                        {isDuplicate && (
                          <Badge variant='outline' className='ml-2 text-xs text-amber-600 border-amber-500/50'>
                            Duplicate
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatTeacherRange(plan.teacherMin, plan.teacherMax)}</TableCell>
                      <TableCell>₹{plan.priceMonthly.toFixed(2)}</TableCell>

                    {/* Feature flags summary */}
                    <TableCell>
                      <div className='flex flex-wrap gap-1'>
                        {plan.reportEnabled     && <Badge variant='secondary' className='text-xs'>Reports</Badge>}
                        {plan.attendanceEnabled  && <Badge variant='secondary' className='text-xs'>Attendance</Badge>}
                        {plan.homeworkEnabled    && <Badge variant='secondary' className='text-xs'>Homework</Badge>}
                        {plan.watermarkRequired  && <Badge variant='outline'   className='text-xs'>Watermark</Badge>}
                      </div>
                    </TableCell>

                    {/* Export formats summary */}
                    <TableCell>
                      <div className='flex flex-wrap gap-1'>
                        {(plan.exportFormats ?? []).map((fmt) => (
                          <Badge key={fmt} variant='outline' className='text-xs uppercase'>
                            {fmt}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell>{plan.schoolCount}</TableCell>
                    <TableCell className='text-right space-x-2'>
                      <Button variant='outline' size='sm' onClick={() => openEdit(plan)}>
                        <Edit className='w-4 h-4' />
                      </Button>
                      <Button variant='destructive' size='sm' onClick={() => openDelete(plan)}>
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      {/* ── Create / Edit dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Create new plan' : 'Edit plan'}
            </DialogTitle>
          </DialogHeader>

          <div className='space-y-5'>
            {/* Name */}
            <div className='grid gap-2'>
              <Label htmlFor='plan-name'>Plan name</Label>
              <Input
                id='plan-name'
                value={formValues.name}
                onChange={(e) => setFormValues((c) => ({ ...c, name: e.target.value }))}
              />
              {formErrors.name && <p className='text-sm text-destructive'>{formErrors.name}</p>}
            </div>

            {/* Description */}
            <div className='grid gap-2'>
              <Label htmlFor='plan-description'>Description</Label>
              <textarea
                id='plan-description'
                className='flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                value={formValues.description}
                onChange={(e) => setFormValues((c) => ({ ...c, description: e.target.value }))}
                placeholder='Describe this plan...'
              />
            </div>

            {/* Features */}
            <div className='grid gap-2'>
              <Label htmlFor='plan-features'>Features (one per line)</Label>
              <textarea
                id='plan-features'
                className='flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
                value={formValues.features.join('\n')}
                onChange={(e) => setFormValues((c) => ({ ...c, features: e.target.value.split('\n').filter(f => f.trim()) }))}
                placeholder='Up to 20 teachers&#10;Unlimited timetable slots&#10;CSV bulk import&#10;Priority support'
              />
              <p className='text-xs text-muted-foreground'>Enter each feature on a new line. These will be displayed on the upgrade page.</p>
            </div>

            {/* Teacher range */}
            <div className='grid gap-2 grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='teacher-min'>Min teachers</Label>
                <Input
                  id='teacher-min'
                  type='number'
                  value={formValues.teacherMin}
                  onChange={(e) => setFormValues((c) => ({ ...c, teacherMin: e.target.value }))}
                />
                {formErrors.teacherMin && (
                  <p className='text-sm text-destructive'>{formErrors.teacherMin}</p>
                )}
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='teacher-max'>Max teachers</Label>
                <Input
                  id='teacher-max'
                  type='number'
                  value={formValues.teacherMax}
                  onChange={(e) => setFormValues((c) => ({ ...c, teacherMax: e.target.value }))}
                />
                {formErrors.teacherMax && (
                  <p className='text-sm text-destructive'>{formErrors.teacherMax}</p>
                )}
              </div>
            </div>

            {/* Price */}
            <div className='grid gap-2'>
              <Label htmlFor='price-monthly'>Monthly price (₹)</Label>
              <Input
                id='price-monthly'
                type='number'
                value={formValues.priceMonthly}
                onChange={(e) => setFormValues((c) => ({ ...c, priceMonthly: e.target.value }))}
              />
              {formErrors.priceMonthly && (
                <p className='text-sm text-destructive'>{formErrors.priceMonthly}</p>
              )}
            </div>

            {/* Feature flags */}
            <div className='space-y-3'>
              <p className='text-sm font-medium'>Feature gates</p>
              <div className='grid grid-cols-2 gap-3'>
                {FEATURE_FLAGS.map(({ field, label }) => (
                  <div key={field} className='flex items-center gap-2'>
                    <Checkbox
                      id={`flag-${field}`}
                      checked={Boolean(formValues[field])}
                      onCheckedChange={(checked) => setFlag(field, Boolean(checked))}
                    />
                    <Label htmlFor={`flag-${field}`} className='text-sm font-normal cursor-pointer'>
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Export formats */}
            <div className='space-y-3'>
              <p className='text-sm font-medium'>Export formats</p>
              <div className='flex gap-6'>
                {EXPORT_FORMATS.map((fmt) => (
                  <div key={fmt} className='flex items-center gap-2'>
                    <Checkbox
                      id={`fmt-${fmt}`}
                      checked={formValues.exportFormats.includes(fmt)}
                      onCheckedChange={() => toggleExportFormat(fmt)}
                    />
                    <Label htmlFor={`fmt-${fmt}`} className='text-sm font-normal uppercase cursor-pointer'>
                      {fmt}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline' disabled={saving}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleFormSubmit} disabled={saving}>
              {saving ? 'Saving…' : formMode === 'create' ? 'Create plan' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {planToDelete
                ? `This will permanently delete "${planToDelete.name}". It cannot be restored.`
                : 'Confirm deletion.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant='destructive' disabled={saving} onClick={handleDeletePlan}>
                Delete plan
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}