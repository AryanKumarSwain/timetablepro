'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Edit, Plus, Trash2 } from 'lucide-react';

import { useRequireAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import {
  createSuperAdminPlan,
  deleteSuperAdminPlan,
  getSuperAdminPlans,
  updateSuperAdminPlan,
} from '@/lib/api-services';
import type { SaasPlan } from '@/lib/types';

const emptyForm = {
  name: '',
  teacherMin: '0',
  teacherMax: '0',
  priceMonthly: '0',
};

type PlanForm = typeof emptyForm;

type PlanMode = 'create' | 'edit';

const formatTeacherRange = (min: number, max: number) =>
  max > 9999 ? `${min}+` : `${min}-${max}`;

const parseNumber = (value: string) => Number(value.replace(/[^0-9.]/g, '') || 0);

export default function PlansPage() {
  useRequireAuth('super-admin');

  const { toast } = useToast();
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<PlanMode>('create');
  const [selectedPlan, setSelectedPlan] = useState<SaasPlan | null>(null);
  const [formValues, setFormValues] = useState<PlanForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PlanForm, string>>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SaasPlan | null>(null);

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

  useEffect(() => {
    fetchPlans();
  }, []);

  const planRows = useMemo(() => plans, [plans]);

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
      name: plan.name,
      teacherMin: String(plan.teacherMin),
      teacherMax: String(plan.teacherMax),
      priceMonthly: String(plan.priceMonthly),
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const openDelete = (plan: SaasPlan) => {
    setPlanToDelete(plan);
    setDeleteOpen(true);
  };

  const validateForm = () => {
    const errors: Partial<Record<keyof PlanForm, string>> = {};
    const name = formValues.name.trim();
    const teacherMin = parseNumber(formValues.teacherMin);
    const teacherMax = parseNumber(formValues.teacherMax);
    const priceMonthly = parseNumber(formValues.priceMonthly);

    if (!name) errors.name = 'Plan name is required.';
    if (!Number.isFinite(teacherMin) || teacherMin < 0) {
      errors.teacherMin = 'Enter a valid minimum teacher count.';
    }
    if (!Number.isFinite(teacherMax) || teacherMax < 0) {
      errors.teacherMax = 'Enter a valid maximum teacher count.';
    }
    if (Number.isFinite(teacherMin) && Number.isFinite(teacherMax) && teacherMax < teacherMin) {
      errors.teacherMax = 'Maximum teachers must be greater than or equal to minimum teachers.';
    }
    if (!Number.isFinite(priceMonthly) || priceMonthly < 0) {
      errors.priceMonthly = 'Enter a valid monthly price.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const payload = {
      name: formValues.name.trim(),
      teacherMin: parseNumber(formValues.teacherMin),
      teacherMax: parseNumber(formValues.teacherMax),
      priceMonthly: parseNumber(formValues.priceMonthly),
    };

    setSaving(true);

    try {
      if (formMode === 'create') {
        const created = await createSuperAdminPlan(payload);
        setPlans((current) => [created, ...current]);
        toast({ title: 'Plan created', description: `${created.name} was added successfully.` });
      } else if (selectedPlan) {
        const updated = await updateSuperAdminPlan(selectedPlan.id, payload);
        setPlans((current) => current.map((plan) => (plan.id === updated.id ? updated : plan)));
        toast({ title: 'Plan updated', description: `${updated.name} has been saved.` });
      }
      setFormOpen(false);
    } catch (err) {
      toast({ title: 'Unable to save plan', description: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setSaving(true);

    try {
      await deleteSuperAdminPlan(planToDelete.id);
      setPlans((current) => current.filter((plan) => plan.id !== planToDelete.id));
      toast({ title: 'Plan deleted', description: `${planToDelete.name} has been removed.` });
      setDeleteOpen(false);
    } catch (err) {
      toast({ title: 'Unable to delete plan', description: err instanceof Error ? err.message : 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='max-w-7xl mx-auto space-y-6'>
      <PageHeader
        title='Subscription Plans'
        description='Create and manage the pricing plans your schools subscribe to.'
        breadcrumbs={[{ label: 'Super Admin', href: '/super-admin/dashboard' }, { label: 'Plans' }]}
      />

      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h2 className='text-lg font-semibold'>Plan catalog</h2>
          <p className='text-sm text-muted-foreground'>Add, edit, and remove subscription plans for your platform.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className='w-4 h-4 mr-2' />
          New plan
        </Button>
      </div>

      {fetchError && (
        <div className='rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-600'>
          {fetchError}
        </div>
      )}

      <GlassCard className='p-6'>
        {loading ? (
          <div className='space-y-3'>
            {[...Array(4)].map((_, index) => (
              <div key={index} className='h-16 rounded-lg bg-muted/30 animate-pulse' />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Plan name</TableHead>
                <TableHead>Teacher range</TableHead>
                <TableHead>Monthly price</TableHead>
                <TableHead>Assigned schools</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {planRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className='py-6 text-center text-sm text-muted-foreground'>
                    No subscription plans are configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                planRows.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>{plan.name}</TableCell>
                    <TableCell>{formatTeacherRange(plan.teacherMin, plan.teacherMax)}</TableCell>
                    <TableCell>${plan.priceMonthly.toFixed(2)}</TableCell>
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
                ))
              )}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'Create new plan' : 'Edit plan'}</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='grid gap-3'>
              <div className='grid gap-2'>
                <Label htmlFor='plan-name'>Plan name</Label>
                <Input
                  id='plan-name'
                  value={formValues.name}
                  onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                />
                {formErrors.name && <p className='text-sm text-destructive'>{formErrors.name}</p>}
              </div>

              <div className='grid gap-2 md:grid-cols-2'>
                <div className='grid gap-2'>
                  <Label htmlFor='teacher-min'>Min teachers</Label>
                  <Input
                    id='teacher-min'
                    type='number'
                    value={formValues.teacherMin}
                    onChange={(event) => setFormValues((current) => ({ ...current, teacherMin: event.target.value }))}
                  />
                  {formErrors.teacherMin && <p className='text-sm text-destructive'>{formErrors.teacherMin}</p>}
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='teacher-max'>Max teachers</Label>
                  <Input
                    id='teacher-max'
                    type='number'
                    value={formValues.teacherMax}
                    onChange={(event) => setFormValues((current) => ({ ...current, teacherMax: event.target.value }))}
                  />
                  {formErrors.teacherMax && <p className='text-sm text-destructive'>{formErrors.teacherMax}</p>}
                </div>
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='price-monthly'>Monthly price</Label>
                <Input
                  id='price-monthly'
                  type='number'
                  value={formValues.priceMonthly}
                  onChange={(event) => setFormValues((current) => ({ ...current, priceMonthly: event.target.value }))}
                />
                {formErrors.priceMonthly && <p className='text-sm text-destructive'>{formErrors.priceMonthly}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline' disabled={saving}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleFormSubmit} disabled={saving}>
              {formMode === 'create' ? 'Create plan' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {planToDelete ? `This will permanently delete the ${planToDelete.name} plan. It cannot be restored.` : 'Confirm deletion.'}
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
