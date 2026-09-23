'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Edit, Plus, Trash2, Check, X, Crown, History, RotateCw, Sparkles, ArrowUp, ArrowDown } from 'lucide-react';

import { useRequireAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
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
import { toast } from 'sonner';
import {
  createSuperAdminPlan,
  deleteSuperAdminPlan,
  getSuperAdminPlans,
  updateSuperAdminPlan,
  reorderSuperAdminPlans,
  type SaasPlan,
} from '@/lib/api-services';

// ─── Types ────────────────────────────────────────────────────────────────────

type SchoolTrialRequest = {
  id: string;
  schoolId: string;
  schoolName: string;
  schoolCity: string | null;
  schoolCountry: string | null;
  schoolType: string | null;
  currentTeacherCount: number;
  currentPlan: {
    id: string;
    name: string;
    teacherMax: number;
  } | null;
  adminContacts: {
    name: string | null;
    email: string | null;
    phone: string | null;
  }[];
  trialPlanId: string | null;
  trialPlanName: string | null;
  currentPlanName: string | null;
  trialStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  trialEndsAt: string | null;
  createdAt: string;
};

type CustomPlanRequest = {
  id: string;
  schoolId: string;
  schoolName: string;
  schoolCity: string | null;
  schoolCountry: string | null;
  schoolType: string | null;
  currentTeacherCount: number;
  currentPlan: {
    id: string;
    name: string;
    teacherMax: number;
  } | null;
  adminContacts: {
    name: string | null;
    email: string | null;
    phone: string | null;
  }[];
  requestedFacultyLimit: number;
  price?: number | null;
  priceYearly?: number | null;
  billingCycle?: string | null;
  isPaid?: boolean;
  paidAt?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  rejectionReason: string | null;
  createdAt: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPORT_FORMATS = ['pdf', 'docx', 'csv'] as const;

const FEATURE_FLAGS = [
  { field: 'reportEnabled',         label: 'Reports' },
  { field: 'attendanceEnabled',     label: 'Attendance' },
  { field: 'homeworkEnabled',       label: 'Homework' },
  { field: 'lessonPlanningEnabled', label: 'Lesson Planning' },
  { field: 'aiTimetableEnabled',    label: 'Generate Timetable with AI' },
  { field: 'watermarkRequired',     label: 'Watermark required on exported documents' },
] as const;

type FeatureFlagField = typeof FEATURE_FLAGS[number]['field'];

const emptyForm = {
  name:                 '',
  teacherMin:           '0',
  teacherMax:           '0',
  priceMonthly:         '0',
  reportEnabled:        true,
  attendanceEnabled:    true,
  homeworkEnabled:      true,
  lessonPlanningEnabled: true,
  aiTimetableEnabled:   false,
  watermarkRequired:    false,
  exportFormats:        [] as string[],
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

  const [plans, setPlans]                 = useState<SaasPlan[]>([]);
  const [trialRequests, setTrialRequests] = useState<SchoolTrialRequest[]>([]);
  const [customPlanRequests, setCustomPlanRequests] = useState<CustomPlanRequest[]>([]);
  const [customPlanHistory, setCustomPlanHistory] = useState<CustomPlanRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'approved' | 'rejected'>('all');
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [fetchError, setFetchError]       = useState<string | null>(null);
  const [processingCustomPlan, setProcessingCustomPlan] = useState<string | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [requestToApprove, setRequestToApprove] = useState<CustomPlanRequest | null>(null);
  const [quotePrice, setQuotePrice] = useState<string>('');
  const [quotePriceYearly, setQuotePriceYearly] = useState<string>('');
  const [yearlyManuallyEdited, setYearlyManuallyEdited] = useState<boolean>(false);

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

  const fetchCustomPlanRequests = async () => {
    try {
      const res = await fetch('/api/super-admin/custom-plan-requests?status=PENDING');
      if (res.ok) setCustomPlanRequests(await res.json());
    } catch (err) {
      console.error('Failed to load custom plan requests:', err);
    }
  };

  const fetchCustomPlanHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/super-admin/custom-plan-requests?status=history');
      if (res.ok) setCustomPlanHistory(await res.json());
    } catch (err) {
      console.error('Failed to load custom plan history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openApproveModal = (req: CustomPlanRequest) => {
    setRequestToApprove(req);
    setQuotePrice('');
    setQuotePriceYearly('');
    setYearlyManuallyEdited(false);
    setApproveModalOpen(true);
  };

  const handleMonthlyPriceChange = (val: string) => {
    setQuotePrice(val);
    const num = Number(val);
    if (!yearlyManuallyEdited && Number.isFinite(num) && num > 0) {
      // 17% discount on 12 months = Math.round(monthly * 12 * 0.83)
      const yearly = Math.round(num * 12 * 0.83);
      setQuotePriceYearly(yearly.toString());
    } else if (!val && !yearlyManuallyEdited) {
      setQuotePriceYearly('');
    }
  };

  const handleConfirmApprove = async () => {
    if (!requestToApprove) return;
    const priceNum = Number(quotePrice);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error('Please enter a valid monthly price greater than 0');
      return;
    }

    const yearlyNum = Number(quotePriceYearly) > 0
      ? Number(quotePriceYearly)
      : Math.round(priceNum * 12 * 0.83);

    setProcessingCustomPlan(requestToApprove.id);
    try {
      const res = await fetch(`/api/super-admin/custom-plan-requests/${requestToApprove.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', price: priceNum, priceYearly: yearlyNum })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');
      toast.success(data.message || `Custom plan approved: ₹${priceNum.toLocaleString('en-IN')}/mo & ₹${yearlyNum.toLocaleString('en-IN')}/yr`);
      setApproveModalOpen(false);
      setRequestToApprove(null);
      setQuotePrice('');
      setQuotePriceYearly('');
      setYearlyManuallyEdited(false);
      fetchCustomPlanRequests();
      fetchCustomPlanHistory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve custom plan');
    } finally {
      setProcessingCustomPlan(null);
    }
  };

  const handleRejectCustomPlan = async (requestId: string) => {
    setProcessingCustomPlan(requestId);
    try {
      const res = await fetch(`/api/super-admin/custom-plan-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: 'Request declined' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject');
      toast.success('Custom plan request rejected');
      fetchCustomPlanRequests();
      fetchCustomPlanHistory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject custom plan');
    } finally {
      setProcessingCustomPlan(null);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchTrialRequests();
    fetchCustomPlanRequests();
    fetchCustomPlanHistory();
  }, []);

  const [reordering, setReordering] = useState(false);

  const planRows = useMemo(() => {
    return [...plans].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  }, [plans]);

  const handleMovePlan = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= planRows.length) return;

    const currentItem = planRows[index];
    const targetItem = planRows[targetIndex];

    const newRows = [...planRows];
    newRows[index] = targetItem;
    newRows[targetIndex] = currentItem;

    // Sequential re-indexing
    const updatedWithOrder = newRows.map((p, idx) => ({
      ...p,
      orderIndex: idx,
    }));

    setPlans(updatedWithOrder);
    setReordering(true);
    try {
      await reorderSuperAdminPlans(updatedWithOrder.map((p) => p.id));
      toast.success(`Moved ${currentItem.name} ${direction}. Order updated.`);
    } catch (err: any) {
      toast.error('Failed to update plan order. Reverting...');
      fetchPlans();
    } finally {
      setReordering(false);
    }
  };

  // Check for duplicate plan names
  const duplicateNames = useMemo(() => {
    const nameCounts = plans.reduce((acc, plan) => {
      acc[plan.name] = (acc[plan.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(nameCounts).filter(([_, count]) => Number(count) > 1).map(([name]) => name);
  }, [plans]);

  const isSelectedCustom = Boolean(selectedPlan?.id === 'plan-custom' || selectedPlan?.name?.toLowerCase() === 'custom');

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
      teacherMin:        String(plan.teacherMin),
      teacherMax:        String(plan.teacherMax),
      priceMonthly:      String(plan.priceMonthly),
      reportEnabled:         plan.reportEnabled         ?? true,
      attendanceEnabled:     plan.attendanceEnabled     ?? true,
      homeworkEnabled:       plan.homeworkEnabled       ?? true,
      lessonPlanningEnabled: plan.lessonPlanningEnabled ?? true,
      aiTimetableEnabled:    plan.aiTimetableEnabled    ?? false,
      watermarkRequired:     plan.watermarkRequired     ?? false,
      exportFormats:         plan.exportFormats         ?? [],
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
    if (isSelectedCustom) {
      setFormErrors({});
      return true;
    }

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

    const payload = isSelectedCustom
      ? {
          name:                  selectedPlan?.name || 'Custom',
          teacherMin:            selectedPlan?.teacherMin || 101,
          teacherMax:            selectedPlan?.teacherMax || 999999,
          priceMonthly:          Number(selectedPlan?.priceMonthly || 0),
          reportEnabled:         formValues.reportEnabled,
          attendanceEnabled:     formValues.attendanceEnabled,
          homeworkEnabled:       formValues.homeworkEnabled,
          lessonPlanningEnabled: formValues.lessonPlanningEnabled,
          aiTimetableEnabled:    formValues.aiTimetableEnabled,
          watermarkRequired:     formValues.watermarkRequired,
          exportFormats:         formValues.exportFormats,
        }
      : {
          name:                  formValues.name.trim(),
          teacherMin:            parseNumber(formValues.teacherMin),
          teacherMax:            parseNumber(formValues.teacherMax),
          priceMonthly:          parseNumber(formValues.priceMonthly),
          reportEnabled:         formValues.reportEnabled,
          attendanceEnabled:     formValues.attendanceEnabled,
          homeworkEnabled:       formValues.homeworkEnabled,
          lessonPlanningEnabled: formValues.lessonPlanningEnabled,
          aiTimetableEnabled:    formValues.aiTimetableEnabled,
          watermarkRequired:     formValues.watermarkRequired,
          exportFormats:         formValues.exportFormats,
        };

    setSaving(true);
    try {
      if (formMode === 'create') {
        const created = await createSuperAdminPlan(payload);
        setPlans((cur) => [created, ...cur]);
        toast.success(`Plan created: ${created.name} was added successfully.`);
      } else if (selectedPlan) {
        const updated = await updateSuperAdminPlan(selectedPlan.id, payload);
        setPlans((cur) => cur.map((p) => (p.id === updated.id ? updated : p)));
        toast.success(`Plan updated: ${updated.name} has been saved.`);
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save plan. Please try again.');
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
      toast.success(`Plan deleted: ${planToDelete.name} has been removed.`);
      setDeleteOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to delete plan. Please try again.');
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
      toast.success(`Trial request ${action.toLowerCase()}d`);
      await fetchTrialRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to process trial request');
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

      {/* ── Custom Plan Requests banner ── */}
      {customPlanRequests.length > 0 && (
        <GlassCard className='p-6 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20'>
          <h3 className='font-semibold text-amber-700 dark:text-amber-400 mb-4'>
            Pending Custom Plan Requests ({customPlanRequests.length})
          </h3>
          <div className='space-y-3'>
            {customPlanRequests.map((req) => (
              <div
                key={req.id}
                className='p-4 rounded-lg bg-background/50 border border-border/40'
              >
                <div className='flex items-start justify-between mb-3'>
                  <div className='flex-1'>
                    <p className='font-semibold text-sm'>{req.schoolName}</p>
                    <div className='text-xs text-muted-foreground space-y-1 mt-2'>
                      <p><span className='font-medium'>Location:</span> {req.schoolCity}, {req.schoolCountry}</p>
                      <p><span className='font-medium'>Type:</span> {req.schoolType || 'N/A'}</p>
                      <p><span className='font-medium'>Current Teachers:</span> {req.currentTeacherCount}</p>
                      <p><span className='font-medium'>Current Plan:</span> {req.currentPlan?.name || 'Free'}</p>
                      <p><span className='font-medium'>Requested Limit:</span> {req.requestedFacultyLimit}</p>
                      {req.adminContacts && req.adminContacts.length > 0 && (
                        <div className='mt-2 pt-2 border-t border-border/40'>
                          <p className='font-medium'>Admin Contacts:</p>
                          {req.adminContacts.map((contact, idx) => (
                            <p key={idx} className='text-xs'>
                              {contact.name} - {contact.email} {contact.phone ? `(${contact.phone})` : ''}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='flex gap-2 ml-4'>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleRejectCustomPlan(req.id)}
                      disabled={processingCustomPlan === req.id}
                      className='text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                    >
                      <X className='w-4 h-4 mr-1' /> Reject
                    </Button>
                    <Button
                      size='sm'
                      onClick={() => openApproveModal(req)}
                      disabled={processingCustomPlan === req.id}
                      className='bg-emerald-600 hover:bg-emerald-700 text-white'
                    >
                      <Check className='w-4 h-4 mr-1' /> Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

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
                className='p-4 rounded-lg bg-background/50 border border-border/40'
              >
                <div className='flex items-start justify-between mb-3'>
                  <div className='flex-1'>
                    <p className='font-semibold text-sm'>{req.schoolName}</p>
                    <div className='text-xs text-muted-foreground space-y-1 mt-2'>
                      <p><span className='font-medium'>Location:</span> {req.schoolCity}, {req.schoolCountry}</p>
                      <p><span className='font-medium'>Type:</span> {req.schoolType || 'N/A'}</p>
                      <p><span className='font-medium'>Current Teachers:</span> {req.currentTeacherCount}</p>
                      <p><span className='font-medium'>Current Plan:</span> {req.currentPlan?.name || 'Free'}</p>
                      <p><span className='font-medium'>Trial Plan:</span> {req.trialPlanName || 'No plan selected'}</p>
                      {req.adminContacts && req.adminContacts.length > 0 && (
                        <div className='mt-2 pt-2 border-t border-border/40'>
                          <p className='font-medium'>Admin Contacts:</p>
                          {req.adminContacts.map((contact, idx) => (
                            <p key={idx} className='text-xs'>
                              {contact.name} - {contact.email} {contact.phone ? `(${contact.phone})` : ''}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='flex gap-2 ml-4'>
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
                <TableHead className='w-20 text-center'>Order</TableHead>
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
                  <TableCell colSpan={8} className='py-6 text-center text-sm text-muted-foreground'>
                    No subscription plans are configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                planRows.map((plan, idx) => {
                  const isDuplicate = duplicateNames.includes(plan.name);
                  const isCustom = plan.id === 'plan-custom' || plan.name?.toLowerCase() === 'custom';

                  return (
                    <TableRow
                      key={plan.id}
                      className={
                        isCustom
                          ? 'bg-purple-50/50 dark:bg-purple-950/20 border-l-4 border-l-purple-500'
                          : isDuplicate
                            ? 'bg-amber-50/50 dark:bg-amber-950/20'
                            : ''
                      }
                    >
                      <TableCell className='w-20'>
                        <div className='flex items-center justify-center gap-0.5'>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-20 cursor-pointer'
                            disabled={idx === 0 || reordering}
                            onClick={() => handleMovePlan(idx, 'up')}
                            title='Move plan up'
                          >
                            <ArrowUp className='w-3.5 h-3.5' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-20 cursor-pointer'
                            disabled={idx === planRows.length - 1 || reordering}
                            onClick={() => handleMovePlan(idx, 'down')}
                            title='Move plan down'
                          >
                            <ArrowDown className='w-3.5 h-3.5' />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className='font-medium'>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{plan.name}</span>
                          {isCustom && (
                            <Badge className="bg-purple-600 hover:bg-purple-600 text-white text-[10px] uppercase font-bold tracking-wider">
                              Custom Catalog
                            </Badge>
                          )}
                          {isDuplicate && !isCustom && (
                            <Badge variant='outline' className='text-xs text-amber-600 border-amber-500/50'>
                              Duplicate
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isCustom ? (
                          <span className="inline-flex items-center text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-md border border-purple-200 dark:border-purple-800">
                            Custom per school
                          </span>
                        ) : (
                          formatTeacherRange(plan.teacherMin, plan.teacherMax)
                        )}
                      </TableCell>
                      <TableCell>
                        {isCustom ? (
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                            Custom quote
                          </span>
                        ) : (
                          `₹${plan.priceMonthly.toFixed(2)}`
                        )}
                      </TableCell>

                      {/* Feature flags summary */}
                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          {plan.reportEnabled         && <Badge variant='secondary' className='text-xs'>Reports</Badge>}
                          {plan.attendanceEnabled     && <Badge variant='secondary' className='text-xs'>Attendance</Badge>}
                          {plan.homeworkEnabled       && <Badge variant='secondary' className='text-xs'>Homework</Badge>}
                          {plan.lessonPlanningEnabled && <Badge variant='secondary' className='text-xs'>Lesson Planning</Badge>}
                          {plan.aiTimetableEnabled    && <Badge variant='secondary' className='text-xs bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20'>AI Timetable</Badge>}
                          {plan.watermarkRequired ? (
                            <Badge variant='outline' className='text-xs border-amber-500/40 text-amber-600 dark:text-amber-400'>
                              Watermark
                            </Badge>
                          ) : (
                            <Badge variant='outline' className='text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400'>
                              No Watermark
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Export formats summary */}
                      <TableCell>
                        <div className='flex flex-wrap gap-1'>
                          {(plan.exportFormats ?? []).length === 0 ? (
                            <span className='text-xs text-muted-foreground italic'>None</span>
                          ) : (
                            (plan.exportFormats ?? []).map((fmt) => (
                              <Badge key={fmt} variant='outline' className='text-xs font-semibold uppercase'>
                                {fmt === 'docx' ? 'DOCX' : fmt}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>

                      <TableCell>{plan.schoolCount}</TableCell>
                      <TableCell className='text-right space-x-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => openEdit(plan)}
                          title={isCustom ? 'Configure Custom Plan Features' : 'Edit Plan'}
                        >
                          <Edit className='w-4 h-4' />
                        </Button>
                        {!isCustom && (
                          <Button variant='destructive' size='sm' onClick={() => openDelete(plan)}>
                            <Trash2 className='w-4 h-4' />
                          </Button>
                        )}
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
              {isSelectedCustom
                ? 'Edit Custom Plan Catalog Features'
                : formMode === 'create'
                  ? 'Create new plan'
                  : 'Edit plan'}
            </DialogTitle>
            <DialogDescription className='sr-only'>Plan creation and editing configuration</DialogDescription>
          </DialogHeader>

          <div className='space-y-5'>
            {/* Custom Plan Informational Banner */}
            {isSelectedCustom ? (
              <div className='p-3.5 bg-purple-50/80 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 space-y-1.5'>
                <p className='font-bold flex items-center gap-1.5 text-purple-700 dark:text-purple-300'>
                  <Sparkles className='w-4 h-4' />
                  Custom Plan Catalog (Features Only)
                </p>
                <p className='text-muted-foreground leading-relaxed'>
                  Teacher capacity and monthly subscription price are dynamic and quoted per school request. Here you can configure the exact platform feature gates and export formats included for all Custom Plan schools.
                </p>
              </div>
            ) : (
              /* Name */
              <div className='grid gap-2'>
                <Label htmlFor='plan-name'>Plan name</Label>
                <Input
                  id='plan-name'
                  value={formValues.name}
                  onChange={(e) => setFormValues((c) => ({ ...c, name: e.target.value }))}
                />
                {formErrors.name && <p className='text-sm text-destructive'>{formErrors.name}</p>}
              </div>
            )}

            {/* Plan Summary Display */}
            <div className='grid gap-2'>
              <Label>Plan Summary</Label>
              <div className='p-3 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 text-xs'>
                <p className='font-semibold mb-1'>
                  {isSelectedCustom ? 'Custom Plan (Enterprise)' : formValues.name || 'Plan Name'}:{' '}
                  {isSelectedCustom ? 'Custom per school' : `${formValues.teacherMin}-${formValues.teacherMax} Teachers`},{' '}
                  {isSelectedCustom ? 'Custom Quote' : `₹${formValues.priceMonthly}`}
                </p>
                <p className='mb-1'>
                  {formValues.reportEnabled ? 'Unlocked' : 'Locked'}: Reports,{' '}
                  {formValues.attendanceEnabled ? 'Unlocked' : 'Locked'}: Attendance,{' '}
                  {formValues.homeworkEnabled ? 'Unlocked' : 'Locked'}: Homework,{' '}
                  {formValues.lessonPlanningEnabled ? 'Unlocked' : 'Locked'}: Lesson Planning,{' '}
                  {formValues.aiTimetableEnabled ? 'Unlocked' : 'Locked'}: AI Timetable
                </p>
                <p>Allowed Exports: {formValues.exportFormats.length > 0 ? formValues.exportFormats.map((fmt) => fmt === 'word' ? 'Word' : fmt.toUpperCase()).join(', ') : 'None'}, Watermark: {formValues.watermarkRequired ? 'True' : 'False'}</p>
              </div>
            </div>

            {/* Teacher range - hidden for Custom Plan */}
            {!isSelectedCustom && (
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
            )}

            {/* Price - hidden for Custom Plan */}
            {!isSelectedCustom && (
              <div className='grid gap-2'>
                <div className='flex items-center justify-between'>
                  <Label htmlFor='price-monthly'>Monthly price (₹)</Label>
                  {formMode === 'edit' && (
                    <span className='text-[11px] text-muted-foreground'>
                      Active schools keep current price until period ends
                    </span>
                  )}
                </div>
                <Input
                  id='price-monthly'
                  type='number'
                  value={formValues.priceMonthly}
                  onChange={(e) => setFormValues((c) => ({ ...c, priceMonthly: e.target.value }))}
                />
                {formErrors.priceMonthly && (
                  <p className='text-sm text-destructive'>{formErrors.priceMonthly}</p>
                )}
                {formMode === 'edit' && (
                  <p className='text-[11px] text-muted-foreground bg-muted/40 p-2 rounded border border-border/40'>
                    💡 <strong>Active Subscription Protection:</strong> Changing this price will not increase the rate for currently active schools on this plan. They will continue to see and pay their existing subscribed price until their current subscription expires.
                  </p>
                )}
              </div>
            )}

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
                      {fmt === 'docx' ? 'Word' : fmt.toUpperCase()}
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
              {saving ? 'Saving…' : isSelectedCustom ? 'Save Custom Features' : formMode === 'create' ? 'Create plan' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Custom Plan Requests History Section ── */}
      <GlassCard className='p-6 mt-6'>
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-border/40'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400'>
              <History className='w-5 h-5' />
            </div>
            <div>
              <h3 className='font-bold text-base text-slate-900 dark:text-white'>Custom Plan Requests History</h3>
              <p className='text-xs text-muted-foreground'>
                Record of all approved, active, and rejected custom enterprise requests
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap'>
            {/* Filter Tabs */}
            <div className='flex items-center gap-1 bg-muted/40 p-1 rounded-lg border'>
              <Button
                size='sm'
                variant={historyFilter === 'all' ? 'secondary' : 'ghost'}
                onClick={() => setHistoryFilter('all')}
                className='h-7 px-2.5 text-xs font-medium'
              >
                All ({customPlanHistory.length})
              </Button>
              <Button
                size='sm'
                variant={historyFilter === 'approved' ? 'secondary' : 'ghost'}
                onClick={() => setHistoryFilter('approved')}
                className='h-7 px-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-400'
              >
                Approved ({customPlanHistory.filter(r => r.status === 'APPROVED' || r.status === 'COMPLETED').length})
              </Button>
              <Button
                size='sm'
                variant={historyFilter === 'rejected' ? 'secondary' : 'ghost'}
                onClick={() => setHistoryFilter('rejected')}
                className='h-7 px-2.5 text-xs font-medium text-rose-700 dark:text-rose-400'
              >
                Rejected ({customPlanHistory.filter(r => r.status === 'REJECTED').length})
              </Button>
            </div>

            <Button
              variant='outline'
              size='sm'
              onClick={fetchCustomPlanHistory}
              disabled={loadingHistory}
              className='h-8 text-xs gap-1.5'
            >
              <RotateCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {(() => {
          const filtered = customPlanHistory.filter((req) => {
            if (historyFilter === 'approved') return req.status === 'APPROVED' || req.status === 'COMPLETED';
            if (historyFilter === 'rejected') return req.status === 'REJECTED';
            return true;
          });

          if (loadingHistory) {
            return (
              <div className='text-center py-10 text-sm text-muted-foreground flex items-center justify-center gap-2'>
                <RotateCw className='w-4 h-4 animate-spin' /> Loading history...
              </div>
            );
          }

          if (filtered.length === 0) {
            return (
              <div className='text-center py-10 text-sm text-muted-foreground'>
                No custom plan requests history found.
              </div>
            );
          }

          return (
            <div className='space-y-3 max-h-[520px] overflow-y-auto pr-1'>
              {filtered.map((req) => {
                const isApprovedOrCompleted = req.status === 'APPROVED' || req.status === 'COMPLETED';
                const monthlyBase = req.price ? Number(req.price) : 0;
                const yearlyBase = req.priceYearly ? Number(req.priceYearly) : Math.round(monthlyBase * 12 * 0.83);

                return (
                  <div
                    key={req.id}
                    className='p-4 rounded-xl bg-background/60 border border-border/60 hover:border-border transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4'
                  >
                    <div className='space-y-1.5 flex-1'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <span className='font-bold text-sm text-slate-900 dark:text-white'>
                          {req.schoolName}
                        </span>
                        <span className='text-xs text-muted-foreground'>
                          ({req.schoolCity || 'N/A'}, {req.schoolCountry || 'India'})
                        </span>

                        {/* Status Badges */}
                        {req.isPaid || req.status === 'COMPLETED' ? (
                          <Badge className='bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5'>
                            Paid &amp; Active
                          </Badge>
                        ) : req.status === 'APPROVED' ? (
                          <Badge className='bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5'>
                            Quote Approved (Pending Payment)
                          </Badge>
                        ) : (
                          <Badge variant='destructive' className='text-[10px] font-bold px-2 py-0.5'>
                            Rejected
                          </Badge>
                        )}
                      </div>

                      <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground'>
                        <span>
                          Requested Limit:{' '}
                          <strong className='text-amber-600 dark:text-amber-400 font-bold'>
                            {req.requestedFacultyLimit} Teachers
                          </strong>
                        </span>
                        {req.currentPlan && (
                          <span>Previous Plan: {req.currentPlan.name}</span>
                        )}
                        <span>
                          Requested on:{' '}
                          {new Date(req.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {req.paidAt && (
                          <span className='text-emerald-600 dark:text-emerald-400 font-semibold'>
                            Paid on:{' '}
                            {new Date(req.paidAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        )}
                      </div>

                      {req.adminContacts && req.adminContacts.length > 0 && (
                        <p className='text-[11px] text-muted-foreground'>
                          Admin: {req.adminContacts[0].name} ({req.adminContacts[0].email})
                          {req.adminContacts[0].phone ? ` • ${req.adminContacts[0].phone}` : ''}
                        </p>
                      )}

                      {req.status === 'REJECTED' && req.rejectionReason && (
                        <p className='text-xs text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-950/30 px-2.5 py-1 rounded-md inline-block'>
                          Reason: {req.rejectionReason}
                        </p>
                      )}
                    </div>

                    {/* Pricing Display */}
                    {isApprovedOrCompleted && monthlyBase > 0 && (
                      <div className='text-left md:text-right bg-muted/30 p-3 rounded-lg border shrink-0 min-w-[210px]'>
                        <p className='text-xs font-bold text-slate-900 dark:text-white'>
                          ₹{monthlyBase.toLocaleString('en-IN')}/mo · ₹{yearlyBase.toLocaleString('en-IN')}/yr
                        </p>
                        <p className='text-[10px] text-muted-foreground mt-0.5'>
                          Base Price (+18% GST)
                        </p>
                        <p className='text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1'>
                          Total: ₹{(monthlyBase + Math.round(monthlyBase * 0.18)).toLocaleString('en-IN')}/mo · ₹{(yearlyBase + Math.round(yearlyBase * 0.18)).toLocaleString('en-IN')}/yr
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </GlassCard>

      {/* ── Custom Plan Approval Dialog with Price Quote ── */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              Approve Custom Plan Request
            </DialogTitle>
            <DialogDescription>
              Set monthly and yearly rates for this school. By default, annual rate offers 17% off (Monthly × 12 - 17%) and both are fully editable.
            </DialogDescription>
          </DialogHeader>
          {requestToApprove && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/40 rounded-lg border text-sm space-y-1.5">
                <p><span className="font-semibold text-foreground">School:</span> {requestToApprove.schoolName}</p>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Requested Limit:</span>
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border-amber-500/30">
                    {requestToApprove.requestedFacultyLimit} Teachers
                  </Badge>
                </div>
                <p><span className="font-semibold text-foreground">Current Teachers:</span> {requestToApprove.currentTeacherCount}</p>
                {requestToApprove.adminContacts && requestToApprove.adminContacts.length > 0 && (
                  <p className="text-xs text-muted-foreground pt-1 border-t">
                    <span className="font-medium text-foreground">Admin:</span> {requestToApprove.adminContacts[0].name} ({requestToApprove.adminContacts[0].email})
                  </p>
                )}
              </div>

              {/* Monthly Rate Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="quote-price-monthly" className="font-semibold text-sm">
                    Monthly Price (₹ / month) <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">30-day cycle</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-base">₹</span>
                  <Input
                    id="quote-price-monthly"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 500"
                    value={quotePrice}
                    onChange={(e) => handleMonthlyPriceChange(e.target.value)}
                    className="pl-8 text-base font-semibold"
                    autoFocus
                  />
                </div>
              </div>

              {/* Yearly Rate Input (Default: monthly * 12 with 17% off, and editable) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="quote-price-yearly" className="font-semibold text-sm">
                    Yearly Price (₹ / year) <span className="text-rose-500">*</span>
                  </Label>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300">
                    17% Off Default
                  </Badge>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-base">₹</span>
                  <Input
                    id="quote-price-yearly"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 4980"
                    value={quotePriceYearly}
                    onChange={(e) => {
                      setQuotePriceYearly(e.target.value);
                      setYearlyManuallyEdited(true);
                    }}
                    className="pl-8 text-base font-semibold"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                  <span>Regular 12 mo: ₹{quotePrice ? (Number(quotePrice) * 12).toLocaleString('en-IN') : '0'}</span>
                  {yearlyManuallyEdited && quotePrice && (
                    <button
                      type="button"
                      onClick={() => {
                        const calculated = Math.round(Number(quotePrice) * 12 * 0.83);
                        setQuotePriceYearly(calculated.toString());
                        setYearlyManuallyEdited(false);
                      }}
                      className="text-indigo-600 hover:underline text-[11px] font-medium cursor-pointer"
                    >
                      Reset to 17% off
                    </button>
                  )}
                </div>
              </div>

              {/* GST 18% Breakdown Summary */}
              {quotePrice && Number(quotePrice) > 0 && (
                <div className="bg-muted/40 rounded-xl p-3.5 border space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                    <span>Pricing Breakdown (18% GST Included at Checkout)</span>
                    <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
                      +18% GST Auto-Calculated
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                    <div className="bg-background/80 p-2.5 rounded-lg border">
                      <p className="font-semibold text-foreground">Monthly Cycle</p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">Base: ₹{Number(quotePrice).toLocaleString('en-IN')}</p>
                      <p className="text-muted-foreground text-[11px]">18% GST: ₹{Math.round(Number(quotePrice) * 0.18).toLocaleString('en-IN')}</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs mt-1 pt-1 border-t">
                        Total: ₹{(Number(quotePrice) + Math.round(Number(quotePrice) * 0.18)).toLocaleString('en-IN')}/mo
                      </p>
                    </div>

                    <div className="bg-background/80 p-2.5 rounded-lg border">
                      <p className="font-semibold text-foreground">Yearly Cycle</p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">Base: ₹{Number(quotePriceYearly || 0).toLocaleString('en-IN')}</p>
                      <p className="text-muted-foreground text-[11px]">18% GST: ₹{Math.round(Number(quotePriceYearly || 0) * 0.18).toLocaleString('en-IN')}</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs mt-1 pt-1 border-t">
                        Total: ₹{(Number(quotePriceYearly || 0) + Math.round(Number(quotePriceYearly || 0) * 0.18)).toLocaleString('en-IN')}/yr
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    School admin will see both Monthly and Annual options with base price + 18% GST and can choose either cycle at checkout.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setApproveModalOpen(false)}
              disabled={Boolean(processingCustomPlan)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmApprove}
              disabled={Boolean(processingCustomPlan) || !quotePrice || Number(quotePrice) <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {processingCustomPlan ? 'Sending Approval...' : 'Approve & Send Quote'}
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