'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Check, CheckCircle2, Sparkles, ChevronRight, Zap, Rocket, Crown, X } from 'lucide-react';
import { fetchSaasPlans, switchPlan, submitTrialRequest } from '@/lib/api-services';
import type { SaasPlan } from '@/lib/api-services';

export default function UpgradePage() {
  // Core states
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Checkout & UI segment toggles
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [mobileNumber, setMobileNumber] = useState('');
  const [state, setState] = useState('');
  const [switchingPlan, setSwitchingPlan] = useState(false);

  // Trial Modal states
  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [trialReason, setTrialReason] = useState('');
  const [trialForm, setTrialForm] = useState({
    instituteName: '',
    contactNo: '',
    email: '',
    planId: '',
  });
  const [submittingTrial, setSubmittingTrial] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await fetchSaasPlans();
      const filteredPlans = data.filter(plan => plan.id !== 'plan-free');
      setPlans(filteredPlans);
      
      const schoolRes = await fetch('/api/admin/school');
      if (schoolRes.ok) {
        const schoolData = await schoolRes.json();
        setCurrentPlanId(schoolData.planId || null);
      }
    } catch (error) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  
  // Price computation matching standard tier structures
  const basePricePerMonth = selectedPlan?.priceMonthly || 0;
  const baseAmount = billingPeriod === 'monthly' 
    ? basePricePerMonth 
    : Math.round(basePricePerMonth * 12 * 0.83); // ~17% off applied natively for annual

  const gst = Math.round(baseAmount * 0.18);
  const total = Math.round(baseAmount + gst);

  const handlePayment = async () => {
    if (!mobileNumber.trim() || !state.trim()) {
      toast.error('Please fill in your Contact details and State');
      return;
    }

    setSwitchingPlan(true);
    try {
      await switchPlan(selectedPlanId!);
      toast.success('Plan upgraded successfully');
      setCurrentPlanId(selectedPlanId);
      setSelectedPlanId(null); // Close segment screen
      // Reload the page to refresh plan data for feature-gating
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to switch plan');
    } finally {
      setSwitchingPlan(false);
    }
  };

  const handleTrialSubmit = async () => {
    if (!trialReason.trim() || !trialForm.instituteName.trim() || !trialForm.contactNo.trim() || !trialForm.email.trim() || !trialForm.planId.trim()) {
      toast.error('Please complete all mandatory trial fields');
      return;
    }

    setSubmittingTrial(true);
    try {
      await submitTrialRequest({
        reason: trialReason,
        instituteName: trialForm.instituteName,
        contactNo: trialForm.contactNo,
        email: trialForm.email,
        planId: trialForm.planId,
      });
      toast.success('Trial registration submitted successfully');
      setTrialDialogOpen(false);
      setTrialReason('');
      setTrialForm({ instituteName: '', contactNo: '', email: '', planId: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to register trial context');
    } finally {
      setSubmittingTrial(false);
    }
  };

  const getPlanStyles = (index: number) => {
    switch (index) {
      case 0:
        return { border: 'border-slate-200 dark:border-slate-800', btn: 'bg-slate-900 hover:bg-slate-800 text-white', icon: <Zap className="h-5 w-5 text-amber-500" /> };
      case 1:
        return { border: 'border-purple-500 dark:border-purple-600 ring-2 ring-purple-500/20', btn: 'bg-purple-600 hover:bg-purple-700 text-white', icon: <Rocket className="h-5 w-5 text-white" /> };
      default:
        return { border: 'border-amber-400 dark:border-amber-600', btn: 'bg-amber-500 hover:bg-amber-600 text-white', icon: <Crown className="h-5 w-5 text-amber-600" /> };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50/30 dark:from-slate-950 dark:to-indigo-950/10 py-12 px-4 transition-all duration-300">
      <div className="max-w-6xl mx-auto">
        
        {/* Main Header matching image_49a079.jpg */}
        <div className="text-center mb-16">
          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-none px-4 py-1.5 rounded-full mb-4 text-sm font-medium">
            <Sparkles className="h-3.5 w-3.5 mr-1 inline" /> Upgrade Your Plan
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            Choose the Perfect Plan for Your School
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
Scale your timetable management with plans for any school size.          </p>
        </div>

        {/* 3-Card Layout Structure */}
        <div className="grid md:grid-cols-3 gap-8 items-stretch mb-12">
          {plans.map((plan, index) => {
            const style = getPlanStyles(index);
            const isPopular = index === 1;

            return (
              <motion.div
                key={plan.id}
                whileHover={{ y: -6, scale: 1.01 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className={`relative bg-white dark:bg-slate-900 rounded-2xl p-8 flex flex-col justify-between shadow-sm border ${style.border}`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    {style.icon}
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                  </div>

                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">₹{plan.priceMonthly}</span>
                    <span className="text-slate-500 dark:text-slate-400">/month</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                    {index === 0 ? 'Ideal for growing institutions' : index === 1 ? 'Ideal for growing institutions' : 'For large schools and districts'}
                  </p>

                  <hr className="border-slate-100 dark:border-slate-800 my-4" />

                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                      <span>Up to <strong className="text-slate-900 dark:text-white">{plan.teacherMax} teachers</strong></span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                      <span>Unlimited timetable slots</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                      <span>CSV bulk import</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`w-full py-6 font-semibold rounded-xl text-base flex items-center justify-center gap-2 transition-all ${style.btn}`}
                >
                  Switch to {plan.name} <ChevronRight className="h-4 w-4" />
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Free Trial Button Footer */}
        <div className="flex justify-center items-center mt-8">
          <Dialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-2 px-6 py-5 rounded-xl shadow-sm hover:bg-slate-50">
                <Sparkles className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                Request 7-Day Free Trial
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Request Free Trial</DialogTitle>
                <DialogDescription>Fill in details below to test plan functionalities.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1"><Label>Institute Name *</Label><Input placeholder="Your school" value={trialForm.instituteName} onChange={e => setTrialForm({...trialForm, instituteName: e.target.value})} /></div>
                <div className="space-y-1"><Label>Contact Number *</Label><Input type="tel" placeholder="+91" value={trialForm.contactNo} onChange={e => setTrialForm({...trialForm, contactNo: e.target.value})} /></div>
                <div className="space-y-1"><Label>Email *</Label><Input type="email" placeholder="email@school.com" value={trialForm.email} onChange={e => setTrialForm({...trialForm, email: e.target.value})} /></div>
                <div className="space-y-1">
                  <Label>Select Target Plan *</Label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background" value={trialForm.planId} onChange={e => setTrialForm({...trialForm, planId: e.target.value})}>
                    <option value="">Choose your plan tier...</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label>Reason for trial *</Label><Textarea placeholder="Describe requirements..." rows={3} value={trialReason} onChange={e => setTrialReason(e.target.value)} /></div>
                <Button onClick={handleTrialSubmit} disabled={submittingTrial} className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-2">Submit Trial Claim</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Animated Pop-Up Overlay with Backdrop Blur */}
        <AnimatePresence>
          {selectedPlanId && selectedPlan && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.93, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.93, y: 15, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl relative overflow-hidden grid md:grid-cols-12"
              >
                {/* Close Button Trigger */}
                <button 
                  onClick={() => setSelectedPlanId(null)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                </button>

                {/* Left Area Segment - Popped/Increased Active Card view */}
                <div className="md:col-span-7 p-8 md:p-10 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      {getPlanStyles(plans.findIndex(p => p.id === selectedPlanId)).icon}
                      <Badge variant="outline" className="text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50">Selected Plan</Badge>
                    </div>
                    
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">{selectedPlan.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Full institutional core breakdown module and allocations list</p>

                    <div className="space-y-4 mb-8">
                      <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                        <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Up to {selectedPlan.teacherMax} registered teacher slots</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                        <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Unlimited structural configurations saved live</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                        <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Full CSV/XLSX custom exports & imports system</span>
                      </div>
                    </div>
                  </div>

                  {/* Monthly / Yearly Switch segment inside left panel bottom */}
                  <div className="bg-white dark:bg-slate-950 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 flex gap-2 mt-4">
                    <button
                      onClick={() => setBillingPeriod('monthly')}
                      className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all ${billingPeriod === 'monthly' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingPeriod('annual')}
                      className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all relative ${billingPeriod === 'annual' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
                    >
                      Annual
                      <span className="absolute -top-2 -right-1 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Save 17%</span>
                    </button>
                  </div>
                </div>

                {/* Right Area Segment - Payment & Taxes breakdown */}
                <div className="md:col-span-5 p-8 md:p-10 flex flex-col justify-between bg-white dark:bg-slate-900">
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Payment Details</h3>
                    
                    {/* Invoice math items */}
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                        <span>Base Price ({billingPeriod})</span>
                        <span className="font-medium text-slate-900 dark:text-white">₹{baseAmount}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                        <span>GST Tax (18%)</span>
                        <span className="font-medium text-slate-900 dark:text-white">₹{gst}</span>
                      </div>
                      <hr className="border-slate-200 dark:border-slate-800 my-2" />
                      <div className="flex justify-between items-baseline">
                        <span className="text-base font-bold text-slate-900 dark:text-white">Total Amount</span>
                        <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">₹{total}</span>
                      </div>
                    </div>

                    {/* Form requirements input */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="checkoutPhone" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mobile Number *</Label>
                        <Input id="checkoutPhone" type="tel" placeholder="+91 98765-43210" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} className="rounded-xl py-5" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="checkoutState" className="text-xs font-semibold uppercase tracking-wider text-slate-500">State *</Label>
                        <Input id="checkoutState" placeholder="e.g. Maharashtra" value={state} onChange={e => setState(e.target.value)} className="rounded-xl py-5" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <Button
                      onClick={handlePayment}
                      disabled={switchingPlan || !mobileNumber.trim() || !state.trim()}
                      className="w-full py-6 font-bold text-base rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      {switchingPlan ? 'Deploying Gateway...' : `Pay & Activate Plan`}
                    </Button>
                    <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-3">By activating, your dynamic core configurations automatically scale.</p>
                  </div>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}