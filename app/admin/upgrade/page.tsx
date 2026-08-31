'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Check, CheckCircle2, Sparkles, ChevronRight, Zap, Rocket, Crown, X, Clock } from 'lucide-react';
import { fetchSaasPlans, submitTrialRequest } from '@/lib/api-services';
import { getTeachers, deleteTeacher } from '@/lib/api-services';
import type { SaasPlan } from '@/lib/api-services';
import { QRCodeSVG } from 'qrcode.react';

interface PlanConfig {
  border: string;
  btn: string;
  icon: React.ReactNode;
  desc: string;
}

interface SchoolData {
  id: string;
  name: string;
  planId: string | null;
  planStartsAt: string | null;
  planEndsAt: string | null;
  queuedPlanId: string | null;
  queuedPlanStartsAt: string | null;
  queuedPlan: any;
  teacherCount: number;
  [key: string]: any;
}

interface CheckoutFormState {
  mobileNumber: string;
  state: string;
  utrNumber: string;
}

interface TrialFormState {
  instituteName: string;
  contactNo: string;
  email: string;
  planId: string;
  reason: string;
}

interface CustomPlanFormState {
  instituteName: string;
  contactNo: string;
  email: string;
  reason: string;
}

const PLAN_TIER_CONFIG: PlanConfig[] = [
  { border: 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 hover:shadow-lg transition-all duration-300', btn: 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white shadow-md hover:shadow-lg hover:shadow-slate-900/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer', icon: <Zap className="h-5 w-5 text-amber-500 group-hover:scale-110 transition-transform duration-300" />, desc: 'Ideal for growing institutions' },
  { border: 'border-purple-500 dark:border-purple-600 ring-2 ring-purple-500/20 hover:border-purple-400 hover:shadow-purple-500/10 hover:shadow-xl transition-all duration-300', btn: 'bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer', icon: <Rocket className="h-5 w-5 text-white group-hover:scale-110 transition-transform duration-300" />, desc: 'Ideal for growing institutions' },
  { border: 'border-amber-400 dark:border-amber-500 shadow-md shadow-amber-500/5 hover:border-amber-300 hover:shadow-amber-500/15 hover:shadow-xl transition-all duration-300', btn: 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer', icon: <Crown className="h-5 w-5 text-amber-500 group-hover:scale-110 transition-transform duration-300" />, desc: 'For large schools and districts' }
];

export default function UpgradePage() {
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [allPlans, setAllPlans] = useState<SaasPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [checkoutForm, setCheckoutForm] = useState<CheckoutFormState>({ mobileNumber: '', state: '', utrNumber: '' });
  const [switchingPlan, setSwitchingPlan] = useState<boolean>(false);
  const [verificationPending, setVerificationPending] = useState<{ show: boolean; utrNumber: string }>({ show: false, utrNumber: '' });
  const [timerExpired, setTimerExpired] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(300);
  const [planCountdownSeconds, setPlanCountdownSeconds] = useState<number | null>(null);
  const [autoRefreshedOnExpiry, setAutoRefreshedOnExpiry] = useState<boolean>(false);
  const [suppressAutoDowngradePopup, setSuppressAutoDowngradePopup] = useState<boolean>(false);

  const [trialDialogOpen, setTrialDialogOpen] = useState<boolean>(false);
  const [submittingTrial, setSubmittingTrial] = useState<boolean>(false);
  const [trialForm, setTrialForm] = useState<TrialFormState>({ instituteName: '', contactNo: '', email: '', planId: '', reason: '' });
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('example@upi');
  const [customPlanDialogOpen, setCustomPlanDialogOpen] = useState<boolean>(false);
  const [submittingCustomPlan, setSubmittingCustomPlan] = useState<boolean>(false);
  const [customPlanFacultyLimit, setCustomPlanFacultyLimit] = useState<number>(100);
  const [customPlanForm, setCustomPlanForm] = useState<CustomPlanFormState>({ instituteName: '', contactNo: '', email: '', reason: '' });
  const [teacherCount, setTeacherCount] = useState<number>(0);
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponValidating, setCouponValidating] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string>('');
  const [showQueuedPlans, setShowQueuedPlans] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [downgradeWarning, setDowngradeWarning] = useState<{ show: boolean; currentLimit: number; newLimit: number; teachersToRemove: number }>({ show: false, currentLimit: 0, newLimit: 0, teachersToRemove: 0 });
  const [teacherSelectionOpen, setTeacherSelectionOpen] = useState<boolean>(false);
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [selectedTeachersToRemove, setSelectedTeachersToRemove] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      // Detect if we navigated here due to an automatic expiry refresh
      const autoExpired = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('auto_expired') === '1';
      if (autoExpired) setSuppressAutoDowngradePopup(true);
      try {
        const data = await fetchSaasPlans();
        if (!isMounted) return;
        setAllPlans(data || []);
        setPlans((data || []).filter(p => p.name.toLowerCase() !== 'free'));

        const schoolRes = await fetch('/api/admin/school', { credentials: 'include' });
        if (schoolRes.ok && isMounted) {
          try {
            const schoolInfo: SchoolData = await schoolRes.json();
            setCurrentPlanId(schoolInfo.planId || null);
            setSchoolData(schoolInfo);
            setTeacherCount(schoolInfo.teacherCount || 0);

              // If server marked this school as auto-downgraded, suppress the downgrade popup
              if ((schoolInfo as any).autoDowngradedAt) {
                setSuppressAutoDowngradePopup(true);
              }

            // After loading school and plans, if the current plan is Free and
            // teacher count exceeds Free plan's teacherMax, prompt for removal
            // so the school doesn't remain over the limit after automatic downgrade.
            const freePlan = (data || []).find((p: SaasPlan) => p.name.toLowerCase() === 'free' || p.id === 'free-plan-default');
                if (freePlan && schoolInfo.planId === freePlan.id) {
                  const currentTeachers = schoolInfo.teacherCount || 0;
                  const newLimit = freePlan.teacherMax || 0;
                  // Only prompt the admin to remove teachers when they manually change plans.
                  // Suppress this popup if the page was auto-refreshed due to plan expiry.
                  if (currentTeachers > newLimit && !suppressAutoDowngradePopup) {
                    setDowngradeWarning({ show: true, currentLimit: currentTeachers, newLimit, teachersToRemove: currentTeachers - newLimit });
                    try {
                      const teachers = await getTeachers();
                      setTeachersList(teachers);
                    } catch (err) {
                      console.error('Failed to load teachers list for downgrade flow', err);
                    }
                  }
                }
          } catch (jsonError) {
            console.error('Failed to parse school data:', jsonError);
          }
        }

        const sessionRes = await fetch('/api/auth/session', { credentials: 'include' });
        if (sessionRes.ok && isMounted) {
          try {
            const sessionData = await sessionRes.json();
            setUserEmail(sessionData.user?.email || '');
          } catch (jsonError) {
            console.error('Failed to parse session data:', jsonError);
          }
        }

        try {
          const upiRes = await fetch('/api/public/platform-settings', { credentials: 'include' });
          if (upiRes.ok && isMounted) {
            try {
              const upiData = await upiRes.json();
              setUpiId(upiData.upiId || 'example@upi');
            } catch (jsonError) {
              console.error('Failed to parse UPI data:', jsonError);
              setUpiId('example@upi');
            }
          }
        } catch (fetchError) {
          console.error('Failed to fetch UPI settings:', fetchError);
          setUpiId('example@upi');
        }
      } catch (error) {
        console.error('Failed to load upgrade page data:', error);
        toast.error('Failed to load plans');
      } finally {
        if (isMounted) setLoading(false);
        // Clean the auto_expired flag out of the URL so subsequent navigation behaves normally
        try {
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('auto_expired') === '1') {
              params.delete('auto_expired');
              const url = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
              window.history.replaceState({}, '', url);
            }
          }
        } catch (e) {
          // ignore
        }
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const basePricePerMonth = selectedPlan?.priceMonthly || 0;
  const baseAmount = billingPeriod === 'monthly' ? basePricePerMonth : Math.round(basePricePerMonth * 12 * 0.83);
  const discountAmount = Math.round(baseAmount * (couponDiscount / 100));
  const discountedAmount = baseAmount - discountAmount;
  const gst = Math.round(discountedAmount * 0.18);
  const total = Math.round(discountedAmount + gst);

  const handleDigitFilter = (value: string, callback: (sanitized: string) => void) => {
    const numericSanitized = value.replace(/\D/g, '');
    callback(numericSanitized);
  };

  useEffect(() => {
    if (!selectedPlanId || timerExpired) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setTimerExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedPlanId, timerExpired]);

  // Live countdown for current plan expiry
  useEffect(() => {
    if (!schoolData || !schoolData.planEndsAt) {
      setPlanCountdownSeconds(null);
      return;
    }

    const computeSeconds = () => {
      const ends = new Date(schoolData.planEndsAt).getTime();
      const now = Date.now();
      const secs = Math.max(0, Math.floor((ends - now) / 1000));
      return secs;
    };

    setPlanCountdownSeconds(computeSeconds());

    const iv = setInterval(() => {
      setPlanCountdownSeconds(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          // expired
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(iv);
  }, [schoolData?.planEndsAt]);

  // Auto-refresh once when plan expires so UI reflects new plan/queued-plan
  useEffect(() => {
    if (planCountdownSeconds === null) return;
    if (planCountdownSeconds <= 0 && schoolData && !autoRefreshedOnExpiry) {
      setAutoRefreshedOnExpiry(true);
      // small delay to allow any background cron to update DB
      setTimeout(() => {
        // reload page to fetch fresh server state (includes any queued plan activation)
        if (typeof window !== 'undefined') {
          try {
            const u = new URL(window.location.href);
            u.searchParams.set('auto_expired', '1');
            window.location.href = u.toString();
          } catch (e) {
            window.location.reload();
          }
        }
      }, 1500);
    }
  }, [planCountdownSeconds, schoolData, autoRefreshedOnExpiry]);

  const formatPlanCountdown = (seconds: number | null) => {
    if (seconds === null) return '';
    if (seconds <= 0) return '00:00:00';
    const days = Math.floor(seconds / 86400);
    let rem = seconds % 86400;
    const hours = Math.floor(rem / 3600);
    rem = rem % 3600;
    const mins = Math.floor(rem / 60);
    const secs = rem % 60;
    const hh = String(hours).padStart(2, '0');
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    if (days > 0) return `${days}d ${hh}:${mm}:${ss}`;
    return `${hh}:${mm}:${ss}`;
  };

  useEffect(() => {
    if (selectedPlanId) {
      setTimeRemaining(300);
      setTimerExpired(false);
    }
  }, [selectedPlanId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadRazorpayScript = () => new Promise<boolean>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window not available'));
      return;
    }

    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(script);
  });

  const handleValidateCoupon = async () => {
    if (!couponCode.trim() || !selectedPlanId) {
      return;
    }

    setCouponValidating(true);
    setCouponError('');

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          code: couponCode,
          planId: selectedPlanId,
          billingCycle: billingPeriod
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setCouponError(data.error || 'Invalid coupon code');
        setCouponDiscount(0);
        return;
      }

      setCouponDiscount(data.coupon.discountPercent);
      toast.success(`Coupon applied! ${data.discountPercent}% discount`);
    } catch (error) {
      console.error('Coupon validation error:', error);
      setCouponError('Failed to validate coupon');
      setCouponDiscount(0);
    } finally {
      setCouponValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setCouponError('');
  };

  // ── Custom Plan ──────────────────────────────────────────────────────────────
  const openCustomPlanDialog = () => {
    setCustomPlanForm({
      instituteName: schoolData?.name || '',
      contactNo: '',
      email: userEmail || '',
      reason: '',
    });
    setCustomPlanDialogOpen(true);
  };

  const handleCustomPlanSubmit = async () => {
    if (customPlanFacultyLimit < 1) {
      return toast.error('Faculty limit must be at least 1');
    }
    if (
      !customPlanForm.instituteName.trim() ||
      !customPlanForm.contactNo.trim() ||
      !customPlanForm.email.trim() ||
      !customPlanForm.reason.trim()
    ) {
      return toast.error('Please complete all fields');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customPlanForm.email.trim())) {
      return toast.error('Please enter a valid email address');
    }
    if (customPlanForm.contactNo.length < 10) {
      return toast.error('Please enter a valid 10-digit contact number');
    }

    setSubmittingCustomPlan(true);
    try {
      const res = await fetch('/api/admin/custom-plan-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedFacultyLimit: customPlanFacultyLimit,
          instituteName: customPlanForm.instituteName,
          contactNo: customPlanForm.contactNo,
          email: customPlanForm.email,
          reason: customPlanForm.reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit request');
      toast.success('Custom plan request submitted successfully');
      setCustomPlanDialogOpen(false);
      setCustomPlanForm({ instituteName: '', contactNo: '', email: '', reason: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit custom plan request');
    } finally {
      setSubmittingCustomPlan(false);
    }
  };

  // ── Payment ──────────────────────────────────────────────────────────────────
  const handlePayment = async () => {
    if (!selectedPlanId || !selectedPlan) {
      return toast.error('Please select a plan first');
    }

    const cleanPhone = checkoutForm.mobileNumber.trim();
    const cleanState = checkoutForm.state.trim();

    if (cleanPhone && (cleanPhone.length < 10 || cleanPhone.length > 11)) {
      return toast.error('Please input a valid 10-digit phone number');
    }

    if (!cleanState) {
      return toast.error('Please enter your state');
    }

    setSwitchingPlan(true);
    try {
      await loadRazorpayScript();

      const orderRes = await fetch('/api/admin/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planId: selectedPlanId,
          amount: total,
          billingCycle: billingPeriod,
          couponCode: couponCode || undefined,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to create Razorpay order');
      }

      const razorpayOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Timetable Pro',
        description: `${selectedPlan.name} - ${billingPeriod === 'annual' ? 'Annual' : 'Monthly'} plan`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          const confirmRes = await fetch('/api/admin/subscription-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              planId: selectedPlanId,
              amount: total,
              billingCycle: billingPeriod,
              couponCode: couponCode || undefined,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
              mobileNumber: cleanPhone,
              state: cleanState,
              adminEmail: userEmail,
            }),
          });

          const confirmData = await confirmRes.json();
          if (!confirmRes.ok) {
            throw new Error(confirmData.error || 'Payment verification failed');
          }

          toast.success('Payment successful and plan activated');
          setSelectedPlanId(null);
          setCheckoutForm({ mobileNumber: '', state: '', utrNumber: '' });

          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        },
        prefill: {
          name: schoolData?.name || '',
          email: userEmail || '',
          contact: cleanPhone || '',
        },
        notes: {
          schoolName: schoolData?.name || '',
          state: cleanState,
          planId: selectedPlanId,
          billingCycle: billingPeriod,
        },
        theme: {
          color: '#7c3aed',
        },
      };

      const razorpay = new (window as any).Razorpay(razorpayOptions);
      razorpay.open();
    } catch (err: any) {
      toast.error(err.message || 'Failed to start Razorpay payment');
    } finally {
      setSwitchingPlan(false);
    }
  };

  // ── Trial ────────────────────────────────────────────────────────────────────
  const handleTrialSubmit = async () => {
    if (Object.values(trialForm).some(v => !v.trim())) {
      return toast.error('Please complete all mandatory trial fields');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trialForm.email.trim())) {
      return toast.error('Please provide a valid structured institutional email address');
    }
    if (trialForm.contactNo.length < 10) {
      return toast.error('Please verify the trial user contact integer parameters');
    }

    setSubmittingTrial(true);
    try {
      await submitTrialRequest(trialForm);
      toast.success('Trial registration submitted successfully');
      setTrialDialogOpen(false);
      setTrialForm({ instituteName: '', contactNo: '', email: '', planId: '', reason: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to register trial');
    } finally {
      setSubmittingTrial(false);
    }
  };

  const openTrialDialog = () => {
    setTrialForm({
      instituteName: schoolData?.name || '',
      contactNo: '',
      email: userEmail || '',
      planId: '',
      reason: '',
    });
    setTrialDialogOpen(true);
  };

  const handlePlanSelection = async (planId: string) => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) return;

    const currentPlan = plans.find(p => p.id === currentPlanId);
    const currentLimit = currentPlan?.teacherMax || 15;
    const newLimit = selectedPlan.teacherMax;

    console.log('Plan selection details:', {
      currentPlanId,
      selectedPlanId: planId,
      currentLimit,
      newLimit,
      teacherCount
    });

    // Always fetch actual teacher count to ensure accuracy
    let actualTeacherCount = 0;
    try {
      const teachers = await getTeachers();
      actualTeacherCount = teachers.length;
      setTeacherCount(actualTeacherCount);
      console.log('Actual teacher count:', actualTeacherCount, 'New limit:', newLimit);
    } catch (error) {
      console.error('Failed to load teacher count:', error);
      actualTeacherCount = teacherCount;
    }

    // Check if this is a downgrade
    const isDowngrade = newLimit < currentLimit;
    const exceedsLimit = actualTeacherCount > newLimit;
    
    console.log('Downgrade check:', {
      isDowngrade,
      exceedsLimit,
      actualTeacherCount,
      newLimit
    });

    if (isDowngrade && exceedsLimit) {
      const teachersToRemove = actualTeacherCount - newLimit;
      console.log('Teachers to remove:', teachersToRemove);
      setDowngradeWarning({
        show: true,
        currentLimit,
        newLimit,
        teachersToRemove
      });
      
      // Load teachers for selection
      try {
        const teachers = await getTeachers();
        setTeachersList(teachers);
      } catch (error) {
        console.error('Failed to load teachers:', error);
        toast.error('Failed to load teachers list');
      }
      
      // Don't set selectedPlanId yet - wait until teachers are removed
    } else {
      setSelectedPlanId(planId);
    }
  };

  const handleDowngradeConfirm = () => {
    // Keep the warning data intact, just hide the warning dialog
    setDowngradeWarning(prev => ({ ...prev, show: false }));
    setTeacherSelectionOpen(true);
  };

  const handleTeacherSelection = (teacherId: string) => {
    setSelectedTeachersToRemove(prev => {
      if (prev.includes(teacherId)) {
        return prev.filter(id => id !== teacherId);
      } else {
        const maxToRemove = downgradeWarning.teachersToRemove || 0;
        if (maxToRemove === 0) {
          toast.error('Error: No teachers need to be removed');
          return prev;
        }
        if (prev.length >= maxToRemove) {
          toast.error(`You can only select ${maxToRemove} teachers to remove`);
          return prev;
        }
        return [...prev, teacherId];
      }
    });
  };

  const handleRemoveSelectedTeachers = async () => {
    const requiredRemoval = downgradeWarning.teachersToRemove;
    if (selectedTeachersToRemove.length !== requiredRemoval) {
      toast.error(`Please select exactly ${requiredRemoval} teachers to remove`);
      return;
    }

    try {
      for (const teacherId of selectedTeachersToRemove) {
        await deleteTeacher(teacherId);
      }
      toast.success(`${selectedTeachersToRemove.length} teachers removed successfully`);
      setTeacherSelectionOpen(false);
      setSelectedTeachersToRemove([]);
      setTeacherCount(prev => prev - selectedTeachersToRemove.length);
      
      // Now proceed with plan change - find the plan that was being downgraded to
      const targetPlan = plans.find(p => p.teacherMax === downgradeWarning.newLimit);
      if (targetPlan) {
        setSelectedPlanId(targetPlan.id);
      }
    } catch (error) {
      console.error('Failed to remove teachers:', error);
      toast.error('Failed to remove teachers');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
    </div>
  );

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-indigo-50/30 dark:from-slate-950 dark:to-indigo-950/10 py-6 px-4 md:px-8 transition-all flex items-center justify-center">
      <div className="max-w-5xl w-full mx-auto flex flex-col justify-between">

        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-none px-3.5 py-1 rounded-full mb-3 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 mr-1 inline" /> Upgrade Your Plan
          </Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Choose the Perfect Plan</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">Scale your timetable management with plans for any school size.</p>

          {/* Current Plan Status */}
          {/* Plan Status Row — current + queued on one line */}
          {schoolData && (schoolData.planId || schoolData.queuedPlanId) && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {schoolData.planId && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <Clock className="h-4 w-4 text-purple-600" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {schoolData.planEndsAt ? (
                      new Date(schoolData.planEndsAt) > new Date() ? (
                        <span className="font-semibold text-purple-700 dark:text-purple-300">
                          Active — Expires in {formatPlanCountdown(planCountdownSeconds)} ({new Date(schoolData.planEndsAt).toLocaleDateString()})
                        </span>
                      ) : (
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          Expired on {new Date(schoolData.planEndsAt).toLocaleDateString()}
                        </span>
                      )
                    ) : (
                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                        Plan end date not set
                      </span>
                    )}
                  </span>
                </motion.div>
              )}

              {schoolData.queuedPlanId && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => setShowQueuedPlans(!showQueuedPlans)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 rounded-full border border-amber-200 dark:border-amber-800 shadow-sm cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors"
                >
                  <Zap className="h-4 w-4 text-amber-600" />
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    Queued: {schoolData.queuedPlan?.name || 'Plan'} activates on {schoolData.queuedPlanStartsAt ? new Date(schoolData.queuedPlanStartsAt).toLocaleDateString() : 'N/A'}
                  </span>
                  <ChevronRight className={`h-3 w-3 text-amber-600 transition-transform ${showQueuedPlans ? 'rotate-90' : ''}`} />
                </motion.div>
              )}
              
              <Button onClick={async () => {
                setHistoryOpen(true);
                setHistoryLoading(true);
                setHistoryError(null);
                try {
                  const res = await fetch('/api/admin/subscription-history', { credentials: 'include' });
                  const json = await res.json();
                  if (res.ok) {
                    setHistoryData(json || []);
                  } else {
                    console.error('Failed to load subscription history', json);
                    setHistoryData([]);
                    setHistoryError(json?.error || 'Failed to load subscription history');
                  }
                } catch (err: any) {
                  console.error('Failed to load subscription history', err);
                  setHistoryData([]);
                  setHistoryError(err?.message || 'Failed to load subscription history');
                } finally {
                  setHistoryLoading(false);
                }
              }} className="px-3.5 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs ml-2 shadow-xs hover:shadow-md hover:shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer">View Plan History</Button>
            </div>
          )}

          {/* Queued Plans Details */}

          <AnimatePresence>
            {showQueuedPlans && schoolData && schoolData.queuedPlanId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800"
              >
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
                  <span className="font-bold text-amber-800 dark:text-amber-200">
                    {schoolData.queuedPlan?.name || 'Plan'}
                  </span>
                  <span className="text-amber-700 dark:text-amber-300">
                    Starts: {schoolData.queuedPlanStartsAt ? new Date(schoolData.queuedPlanStartsAt).toLocaleDateString() : 'N/A'}
                  </span>
                  <span className="text-amber-700 dark:text-amber-300">
                    Expires: {schoolData.queuedPlanStartsAt
                      ? new Date(new Date(schoolData.queuedPlanStartsAt).setMonth(new Date(schoolData.queuedPlanStartsAt).getMonth() + 1)).toLocaleDateString()
                      : 'N/A'}
                  </span>
                  <Badge className="bg-amber-500 text-white text-[10px]">Pending</Badge>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Plan History Dialog */}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Plan History</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {historyLoading ? (
                <div className="text-center py-8">Loading…</div>
              ) : historyError ? (
                <div className="text-center py-6 text-sm text-rose-600">{historyError}</div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-8">No subscription history found.</div>
              ) : (
                <div className="space-y-2">
                  {historyData.map((tx) => (
                    <div key={tx.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{tx.plan?.name || 'Plan'}</div>
                          <div className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="text-right text-sm">
                          <div>₹{tx.amount}</div>
                          <div className="text-xs">{tx.status}</div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">UTR: {tx.utrNumber || '—'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Plan Cards */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 items-stretch mb-8">
          {plans.map((plan, idx) => {
            const style = PLAN_TIER_CONFIG[idx] || PLAN_TIER_CONFIG[2];
            const isCurrentPlan = currentPlanId === plan.id && (!schoolData || !schoolData.planEndsAt || new Date(schoolData.planEndsAt) > new Date());

            // Feature rows: [label, enabled]
            const features: [string, boolean][] = [
              [`${plan.teacherMin}–${plan.teacherMax} Teachers`, true],
              ['Reports', !!plan.reportEnabled],
              ['Attendance', !!plan.attendanceEnabled],
              ['Homework', !!plan.homeworkEnabled],
              ['Lesson Planning', !!plan.lessonPlanningEnabled],
              [
                `Exports: ${plan.exportFormats && plan.exportFormats.length > 0 ? plan.exportFormats.join(', ').toUpperCase() : 'None'}`,
                !!(plan.exportFormats && plan.exportFormats.length > 0),
              ],
              ['No watermark', !plan.watermarkRequired],
            ];

            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -4, scale: 1.005 }}
                className={`relative bg-white dark:bg-slate-900 rounded-xl p-6 flex flex-col justify-between shadow-sm border ${style.border}`}
              >
                {idx === 1 && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">Most Popular</span>
                )}
                {idx === 2 && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Crown className="h-3 w-3" /> Luxury Tier
                  </span>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    {style.icon}
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                    {isCurrentPlan && (
                      <Badge className="ml-auto bg-emerald-500 hover:bg-emerald-600 text-white text-[10px]">Active</Badge>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">₹{plan.priceMonthly}</span>
                    <span className="text-slate-400 text-xs">/month</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{style.desc}</p>
                  <hr className="border-slate-100 dark:border-slate-800 my-3" />

                  {/* Feature list — ✅ enabled / ❌ locked */}
                  <ul className="space-y-3">
                    {features.map(([label, enabled], fIdx) => (
                      <li key={fIdx} className="flex items-center gap-2.5 text-xs">
                        {enabled
                          ? <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          : <X className="h-4 w-4 text-rose-500 shrink-0" />}
                        <span className={`truncate ${enabled ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600 line-through'}`}>
                          {label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => handlePlanSelection(plan.id)}
                  className={`w-full group py-5 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                    isCurrentPlan
                      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700 hover:bg-purple-200 dark:hover:bg-purple-900/60 hover:shadow-md hover:-translate-y-0.5'
                      : style.btn
                  }`}
                >
                  <span>{isCurrentPlan ? `Renew ${plan.name}` : `Switch to ${plan.name}`}</span>
                  <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Actions: Free Trial & Custom Enterprise Plan */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
          {/* Free Trial Button */}
          <Dialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openTrialDialog}
                variant="outline"
                className="group border-purple-200 dark:border-purple-800/80 bg-purple-50/60 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/50 hover:border-purple-400 dark:hover:border-purple-500 hover:text-purple-950 dark:hover:text-purple-100 gap-2.5 px-6 py-5 rounded-xl text-xs font-semibold shadow-xs hover:shadow-lg hover:shadow-purple-500/15 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" />
                <span>Request 7-Day Free Trial</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Request Free Trial</DialogTitle>
                <DialogDescription>Fill in details below to test plan functionalities.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2 text-sm">
                <div className="space-y-1">
                  <Label>Institute Name *</Label>
                  <Input type="text" placeholder="Your school" value={trialForm.instituteName} onChange={e => setTrialForm({ ...trialForm, instituteName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Contact Number *</Label>
                  <Input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="9876543210" value={trialForm.contactNo} onChange={e => handleDigitFilter(e.target.value, (clean) => setTrialForm({ ...trialForm, contactNo: clean }))} maxLength={11} />
                </div>
                <div className="space-y-1">
                  <Label>Email *</Label>
                  <Input type="email" placeholder="email@school.com" value={trialForm.email} onChange={e => setTrialForm({ ...trialForm, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Select Target Plan *</Label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background text-sm" value={trialForm.planId} onChange={e => setTrialForm({ ...trialForm, planId: e.target.value })}>
                    <option value="">Choose your plan tier...</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Reason for trial *</Label>
                  <Textarea placeholder="Describe requirements..." rows={3} value={trialForm.reason} onChange={e => setTrialForm({ ...trialForm, reason: e.target.value })} />
                </div>
                <Button
                  onClick={handleTrialSubmit}
                  disabled={submittingTrial}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-3 py-5 font-semibold text-xs rounded-xl shadow-md hover:shadow-purple-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingTrial ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Submit Trial Claim
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Custom Enterprise Plan Button */}
          <Dialog open={customPlanDialogOpen} onOpenChange={setCustomPlanDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openCustomPlanDialog}
                variant="outline"
                className="group border-amber-200 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-950 dark:hover:text-amber-100 gap-2.5 px-6 py-5 rounded-xl text-xs font-semibold shadow-xs hover:shadow-lg hover:shadow-amber-500/15 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
              >
                <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300" />
                <span>Request Custom Enterprise Plan</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Request Custom Enterprise Plan</DialogTitle>
                <DialogDescription>
                  Tell us about your school and requirements. Our team will contact you with a tailored quote.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2 text-sm">
                <div className="space-y-1">
                  <Label>Institute Name *</Label>
                  <Input
                    type="text"
                    placeholder="Your school"
                    value={customPlanForm.instituteName}
                    onChange={e => setCustomPlanForm({ ...customPlanForm, instituteName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Contact Number *</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="9876543210"
                    value={customPlanForm.contactNo}
                    onChange={e => handleDigitFilter(e.target.value, (clean) => setCustomPlanForm({ ...customPlanForm, contactNo: clean }))}
                    maxLength={11}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="email@school.com"
                    value={customPlanForm.email}
                    onChange={e => setCustomPlanForm({ ...customPlanForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Desired Faculty Limit *</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 150"
                    value={customPlanFacultyLimit}
                    onChange={e => setCustomPlanFacultyLimit(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-[10px] text-slate-400">Number of faculty members you need to support</p>
                </div>
                <div className="space-y-1">
                  <Label>Requirements / Reason *</Label>
                  <Textarea
                    placeholder="Describe your school's specific needs..."
                    rows={3}
                    value={customPlanForm.reason}
                    onChange={e => setCustomPlanForm({ ...customPlanForm, reason: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleCustomPlanSubmit}
                  disabled={submittingCustomPlan}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white mt-3 py-5 font-semibold text-xs rounded-xl shadow-md hover:shadow-amber-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingCustomPlan ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <>
                      <Crown className="h-4 w-4" />
                      Submit Enterprise Request
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Checkout Modal */}
        <AnimatePresence mode="wait">
          {selectedPlanId && selectedPlan && !verificationPending.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 10, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 10, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl relative overflow-hidden grid md:grid-cols-12 max-h-[90vh] overflow-y-auto"
              >
                <button
                  onClick={() => setSelectedPlanId(null)}
                  className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  <X className="h-4 w-4 text-slate-600" />
                </button>

                {/* Left column */}
                <div className="md:col-span-7 p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {(PLAN_TIER_CONFIG[plans.findIndex(p => p.id === selectedPlanId)] || PLAN_TIER_CONFIG[2]).icon}
                      <Badge variant="outline" className="text-purple-600 dark:text-purple-400 border-purple-200 text-[11px]">Selected Plan</Badge>
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">{selectedPlan.name}</h2>
                    <p className="text-xs text-slate-400 mb-4">Full feature breakdown for this plan.</p>

                    {/* Dynamic feature list from selectedPlan */}
                    <div className="space-y-2">
                      {(
                        [
                          [`Up to ${selectedPlan.teacherMax} teacher slots`, true],
                          ['Reports module', !!selectedPlan.reportEnabled],
                          ['Attendance module', !!selectedPlan.attendanceEnabled],
                          ['Homework module', !!selectedPlan.homeworkEnabled],
                          [
                            `Exports: ${selectedPlan.exportFormats?.length ? selectedPlan.exportFormats.join(', ').toUpperCase() : 'None'}`,
                            !!(selectedPlan.exportFormats?.length),
                          ],
                          ['No watermark on exports', !selectedPlan.watermarkRequired],
                        ] as [string, boolean][]
                      ).map(([label, enabled], iIdx) => (
                        <div
                          key={iIdx}
                          className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs ${enabled
                            ? 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800'
                            : 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/30 opacity-70'
                            }`}
                        >
                          {enabled
                            ? <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0" />
                            : <X className="h-4 w-4 text-rose-500 shrink-0" />}
                          <span className={`font-medium ${enabled ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 line-through'}`}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Billing period toggle */}
                  <div className="bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex gap-1 mt-4">
                    {(['monthly', 'annual'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setBillingPeriod(period)}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all relative ${billingPeriod === period
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:bg-slate-50'
                          }`}
                      >
                        {period === 'annual' ? 'Annual (-17%)' : 'Monthly'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right column */}
                <div className="md:col-span-5 p-6 md:p-8 flex flex-col justify-between bg-white dark:bg-slate-900">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Payment Details</h3>

                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Secure payment</p>
                      <div className="flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 p-3 text-white">
                        <div className="text-center">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-violet-100">Razorpay</p>
                          <p className="text-lg font-bold mt-1">₹{total}</p>
                        </div>
                      </div>
                    </div>

                    {/* Price breakdown */}
                    <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl text-xs border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between text-slate-500"><span>Base Price</span><span>₹{baseAmount}</span></div>
                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount ({couponDiscount}%)</span>
                          <span>-₹{discountAmount}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-500"><span>GST (18%)</span><span>₹{gst}</span></div>
                      <hr className="border-slate-200 dark:border-slate-800 my-1.5" />
                      <div className="flex justify-between items-baseline font-bold">
                        <span className="text-slate-900 dark:text-white">Total</span>
                        <span className="text-base text-purple-600">₹{total}</span>
                      </div>
                    </div>

                    {/* Coupon Code */}
                    <div className="space-y-2">
                      <Label htmlFor="couponCode" className="text-[11px] font-semibold text-slate-400 uppercase">Coupon Code (Optional)</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="couponCode"
                            type="text"
                            placeholder="e.g. TTP20"
                            value={couponCode}
                            onChange={e => {
                              setCouponCode(e.target.value.toUpperCase());
                              setCouponError('');
                            }}
                            className={`h-9 ${couponError ? 'border-rose-500' : ''}`}
                          />
                          {couponDiscount > 0 && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute right-2 top-1/2 -translate-y-1/2"
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </motion.div>
                          )}
                        </div>
                        {couponDiscount > 0 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveCoupon}
                            className="h-9 text-xs"
                          >
                            <X className="h-3 w-3 mr-1" /> Remove
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleValidateCoupon}
                            disabled={couponValidating || !couponCode.trim()}
                            className="h-9 text-xs"
                          >
                            {couponValidating ? '...' : 'Apply'}
                          </Button>
                        )}
                      </div>
                      {couponError && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-[10px] text-rose-500"
                        >
                          {couponError}
                        </motion.p>
                      )}
                    </div>

                    {/* Form fields */}
                    <div className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <Label htmlFor="checkoutPhone" className="text-[11px] font-semibold text-slate-400 uppercase">Mobile Number *</Label>
                        <Input
                          id="checkoutPhone"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="9876543210"
                          value={checkoutForm.mobileNumber}
                          onChange={e => handleDigitFilter(e.target.value, (clean) => setCheckoutForm({ ...checkoutForm, mobileNumber: clean }))}
                          maxLength={11}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="checkoutState" className="text-[11px] font-semibold text-slate-400 uppercase">State *</Label>
                        <Input
                          id="checkoutState"
                          placeholder="e.g. Maharashtra"
                          value={checkoutForm.state}
                          onChange={e => setCheckoutForm({ ...checkoutForm, state: e.target.value })}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Button
                      onClick={handlePayment}
                      disabled={switchingPlan || !checkoutForm.state.trim()}
                      className="w-full h-10 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                    >
                      {switchingPlan ? 'Preparing payment...' : 'Pay with Razorpay'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verification Pending Modal */}
        <AnimatePresence mode="wait">
          {verificationPending.show && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 10, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 10, opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden p-8 text-center"
              >
                <button
                  onClick={() => setVerificationPending({ show: false, utrNumber: '' })}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  <X className="h-4 w-4 text-slate-600" />
                </button>

                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>

                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verification Pending</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Payment proof submitted successfully. Our team will verify the transaction (UTR:{' '}
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">{verificationPending.utrNumber}</span>
                  ) and activate your plan within 12 hours.
                </p>

                <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 text-left space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Payment proof received</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Verification in progress</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                    <span>Expected activation: Within 12 hours</span>
                  </div>
                </div>

                <Button onClick={() => setVerificationPending({ show: false, utrNumber: '' })} variant="outline" className="w-full">
                  Close
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}