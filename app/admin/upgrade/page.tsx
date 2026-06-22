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
import { Check, CheckCircle2, Sparkles, ChevronRight, Zap, Rocket, Crown, X } from 'lucide-react';
import { fetchSaasPlans, switchPlan, submitTrialRequest } from '@/lib/api-services';
import type { SaasPlan } from '@/lib/api-services';

const PLAN_TIER_CONFIG = [
  { border: 'border-slate-200 dark:border-slate-800', btn: 'bg-slate-900 hover:bg-slate-800 text-white', icon: <Zap className="h-5 w-5 text-amber-500" />, desc: 'Ideal for growing institutions' },
  { border: 'border-purple-500 dark:border-purple-600 ring-2 ring-purple-500/20', btn: 'bg-purple-600 hover:bg-purple-700 text-white', icon: <Rocket className="h-5 w-5 text-white" />, desc: 'Ideal for growing institutions' },
  { border: 'border-amber-400 dark:border-amber-500 shadow-md shadow-amber-500/5', btn: 'bg-amber-500 hover:bg-amber-600 text-white', icon: <Crown className="h-5 w-5 text-amber-500" />, desc: 'For large schools and districts' }
];

export default function UpgradePage() {
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [checkoutForm, setCheckoutForm] = useState({ mobileNumber: '', state: '' });
  const [switchingPlan, setSwitchingPlan] = useState(false);

  const [trialDialogOpen, setTrialDialogOpen] = useState(false);
  const [submittingTrial, setSubmittingTrial] = useState(false);
  const [trialForm, setTrialForm] = useState({ instituteName: '', contactNo: '', email: '', planId: '', reason: '' });

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSaasPlans();
        setPlans(data.filter(p => p.name.toLowerCase() !== 'free'));
        const schoolRes = await fetch('/api/admin/school');
        if (schoolRes.ok) setCurrentPlanId((await schoolRes.json()).planId || null);
      } catch {
        toast.error('Failed to load plans');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const basePricePerMonth = selectedPlan?.priceMonthly || 0;
  const baseAmount = billingPeriod === 'monthly' ? basePricePerMonth : Math.round(basePricePerMonth * 12 * 0.83);
  const gst = Math.round(baseAmount * 0.18);
  const total = Math.round(baseAmount + gst);

  const handlePayment = async () => {
    if (!checkoutForm.mobileNumber.trim() || !checkoutForm.state.trim()) return toast.error('Please fill in your Contact details and State');
    setSwitchingPlan(true);
    try {
      await switchPlan(selectedPlanId!);
      toast.success('Plan upgraded successfully');
      setCurrentPlanId(selectedPlanId);
      setSelectedPlanId(null);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast.error(err.message || 'Failed to switch plan');
    } finally {
      setSwitchingPlan(false);
    }
  };

  const handleTrialSubmit = async () => {
    if (Object.values(trialForm).some(v => !v.trim())) return toast.error('Please complete all mandatory trial fields');
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

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" /></div>;

  return (
    // Uses standard responsive layout metrics instead of forced scale tags to handle sidebars smoothly
    <div className="w-full min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-indigo-50/30 dark:from-slate-950 dark:to-indigo-950/10 py-6 px-4 md:px-8 transition-all flex items-center justify-center">
      <div className="max-w-5xl w-full mx-auto flex flex-col justify-between">
        
        {/* Header Block Section */}
        <div className="text-center mb-8">
          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-none px-3.5 py-1 rounded-full mb-3 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 mr-1 inline" /> Upgrade Your Plan
          </Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Choose the Perfect Plan</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">Scale your timetable management with plans for any school size.</p>
        </div>

        {/* Dynamic 3-Card Layout Matrix */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 items-stretch mb-8">
          {plans.map((plan, idx) => {
            const style = PLAN_TIER_CONFIG[idx] || PLAN_TIER_CONFIG[2];
            return (
              <motion.div key={plan.id} whileHover={{ y: -4, scale: 1.005 }} className={`relative bg-white dark:bg-slate-900 rounded-xl p-6 flex flex-col justify-between shadow-sm border ${style.border}`}>
                {idx === 1 && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">Most Popular</span>}
                {idx === 2 && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"><Crown className="h-3 w-3" /> Premium Tier</span>}
                
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    {style.icon}
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">₹{plan.priceMonthly}</span>
                    <span className="text-slate-400 text-xs">/month</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{style.desc}</p>
                  <hr className="border-slate-100 dark:border-slate-800 my-3" />
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="truncate"><strong>{plan.teacherMin}-{plan.teacherMax} Teachers</strong></span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="truncate">{plan.reportEnabled ? 'Unlocked' : 'Locked'}: Reports</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="truncate">{plan.attendanceEnabled ? 'Unlocked' : 'Locked'}: Attendance</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="truncate">{plan.homeworkEnabled ? 'Unlocked' : 'Locked'}: Homework</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="truncate">Allowed Exports: {plan.exportFormats && plan.exportFormats.length > 0 ? plan.exportFormats.join(', ').toUpperCase() : 'None'}</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="truncate">Watermark: {plan.watermarkRequired ? 'True' : 'False'}</span>
                    </li>
                  </ul>
                </div>
                <Button onClick={() => setSelectedPlanId(plan.id)} className={`w-full py-5 font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all ${style.btn}`}>
                  Switch to {plan.name} <ChevronRight className="h-3 w-3" />
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* Free Trial Button Section Container */}
        <div className="flex justify-center items-center">
          <Dialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 gap-2 px-5 py-4 rounded-lg text-xs shadow-xs hover:bg-slate-50">
                <Sparkles className="h-3.5 w-3.5 text-slate-500" /> Request 7-Day Free Trial
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Request Free Trial</DialogTitle><DialogDescription>Fill in details below to test plan functionalities.</DialogDescription></DialogHeader>
              <div className="space-y-3 py-2 text-sm">
                {[['Institute Name', 'text', 'instituteName', 'Your school'], ['Contact Number', 'tel', 'contactNo', '+91'], ['Email', 'email', 'email', 'email@school.com']].map(([label, type, field, placeholder]) => (
                  <div key={field} className="space-y-1">
                    <Label>{label} *</Label>
                    <Input type={type} placeholder={placeholder} value={trialForm[field as keyof typeof trialForm]} onChange={e => setTrialForm({ ...trialForm, [field]: e.target.value })} />
                  </div>
                ))}
                <div className="space-y-1">
                  <Label>Select Target Plan *</Label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background text-sm" value={trialForm.planId} onChange={e => setTrialForm({ ...trialForm, planId: e.target.value })}>
                    <option value="">Choose your plan tier...</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><Label>Reason for trial *</Label><Textarea placeholder="Describe requirements..." rows={3} value={trialForm.reason} onChange={e => setTrialForm({ ...trialForm, reason: e.target.value })} /></div>
                <Button onClick={handleTrialSubmit} disabled={submittingTrial} className="w-full bg-purple-600 hover:bg-purple-700 text-white mt-2">Submit Trial Claim</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Checkout Dynamic Drawer Component */}
        <AnimatePresence>
          {selectedPlanId && selectedPlan && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, y: 10, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 10, opacity: 0 }} className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl shadow-2xl relative overflow-hidden grid md:grid-cols-12 max-h-[90vh] overflow-y-auto">
                <button onClick={() => setSelectedPlanId(null)} className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                  <X className="h-4 w-4 text-slate-600" />
                </button>

                {/* Left Side Details Column */}
                <div className="md:col-span-7 p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {(PLAN_TIER_CONFIG[plans.findIndex(p => p.id === selectedPlanId)] || PLAN_TIER_CONFIG[2]).icon}
                      <Badge variant="outline" className="text-purple-600 dark:text-purple-400 border-purple-200 text-[11px]">Selected Plan</Badge>
                    </div>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">{selectedPlan.name}</h2>
                    <p className="text-xs text-slate-400 mb-4">Full institutional core breakdown module allocations.</p>
                    <div className="space-y-2">
                      {[`Up to ${selectedPlan.teacherMax} registered teacher slots`, 'Unlimited structural configurations saved live', 'Full CSV/XLSX custom exports system'].map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                          <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex gap-1 mt-4">
                    {['monthly', 'annual'].map((period) => (
                      <button key={period} onClick={() => setBillingPeriod(period as 'monthly' | 'annual')} className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all relative ${billingPeriod === period ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                        {period === 'annual' ? 'Annual (-17%)' : 'Monthly'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Side Billing Action column */}
                <div className="md:col-span-5 p-6 md:p-8 flex flex-col justify-between bg-white dark:bg-slate-900">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Payment Details</h3>
                    <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl text-xs border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between text-slate-500"><span>Base Price</span><span>₹{baseAmount}</span></div>
                      <div className="flex justify-between text-slate-500"><span>GST (18%)</span><span>₹{gst}</span></div>
                      <hr className="border-slate-200 dark:border-slate-800 my-1.5" />
                      <div className="flex justify-between items-baseline font-bold"><span className="text-slate-900 dark:text-white">Total</span><span className="text-base text-purple-600">₹{total}</span></div>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div className="space-y-1">
                        <Label htmlFor="checkoutPhone" className="text-[11px] font-semibold text-slate-400 uppercase">Mobile Number *</Label>
                        <Input id="checkoutPhone" type="tel" placeholder="+91 98765-43210" value={checkoutForm.mobileNumber} onChange={e => setCheckoutForm({ ...checkoutForm, mobileNumber: e.target.value })} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="checkoutState" className="text-[11px] font-semibold text-slate-400 uppercase">State *</Label>
                        <Input id="checkoutState" placeholder="e.g. Maharashtra" value={checkoutForm.state} onChange={e => setCheckoutForm({ ...checkoutForm, state: e.target.value })} className="h-9" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <Button onClick={handlePayment} disabled={switchingPlan || !checkoutForm.mobileNumber.trim() || !checkoutForm.state.trim()} className="w-full h-10 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm">
                      {switchingPlan ? 'Deploying Gateway...' : 'Pay & Activate Plan'}
                    </Button>
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