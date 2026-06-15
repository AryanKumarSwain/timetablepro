'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Check, CheckCircle2, Zap, Crown, Rocket, ArrowRight, Sparkles } from 'lucide-react';
import { fetchSaasPlans, switchPlan, submitTrialRequest } from '@/lib/api-services';
import type { SaasPlan } from '@/lib/api-services';

export default function UpgradePage() {
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switchingPlan, setSwitchingPlan] = useState<string | null>(null);
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
      // Filter out the free tier from upgrade options
      setPlans(data.filter(plan => plan.id !== 'baseline-free-tier'));
      
      // Get current plan from school data
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

  const handleSwitchPlan = async (planId: string) => {
    setSwitchingPlan(planId);
    try {
      await switchPlan(planId);
      toast.success('Plan switched successfully');
      setCurrentPlanId(planId);
      await loadPlans();
    } catch (error: any) {
      toast.error(error.message || 'Failed to switch plan');
    } finally {
      setSwitchingPlan(null);
    }
  };

  const handleTrialSubmit = async () => {
    if (!trialReason.trim()) {
      toast.error('Please provide a reason for the trial');
      return;
    }
    if (!trialForm.instituteName.trim() || !trialForm.contactNo.trim() || !trialForm.email.trim() || !trialForm.planId.trim()) {
      toast.error('Please fill in all required fields');
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
      toast.success('Trial request submitted successfully');
      setTrialDialogOpen(false);
      setTrialReason('');
      setTrialForm({ instituteName: '', contactNo: '', email: '', planId: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit trial request');
    } finally {
      setSubmittingTrial(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-violet-50/20 dark:from-slate-950 dark:via-indigo-950/20 dark:to-violet-950/20">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-full text-sm font-medium mb-4"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade Your Plan
            </motion.div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Choose the Perfect Plan for Your School
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Scale your timetable management with flexible pricing plans designed for institutions of all sizes
            </p>
          </div>

          {/* Current Plan Banner */}
          {currentPlanId && (() => {
            const currentPlan = plans.find(p => p.id === currentPlanId);
            if (!currentPlan) return null;
            return (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-8"
              >
                <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                          <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Current Plan</p>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{currentPlan.name}</h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            ₹{currentPlan.priceMonthly}/month • Up to {currentPlan.teacherMax} teachers
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-600 text-white px-3 py-1">
                        Active
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })()}

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {plans.map((plan, index) => {
              const isCurrentPlan = plan.id === currentPlanId;
              const isPopular = index === 1;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-3 py-1 text-xs font-bold shadow-lg shadow-indigo-500/30">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <Card
                    className={`h-full transition-all duration-300 hover:shadow-2xl ${
                      isCurrentPlan
                        ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                        : index === 2
                        ? 'border-amber-400 shadow-lg shadow-amber-400/30 bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-950'
                        : isPopular
                        ? 'border-violet-500 shadow-lg shadow-violet-500/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {index === 0 && <Zap className="h-5 w-5 text-amber-500" />}
                          {index === 1 && <Rocket className="h-5 w-5 text-violet-500" />}
                          {index === 2 && <Crown className="h-5 w-5 text-amber-500" />}
                          <CardTitle className="text-xl">{plan.name}</CardTitle>
                        </div>
                        {isCurrentPlan && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-slate-900 dark:text-white">
                          ₹{plan.priceMonthly}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">/month</span>
                      </div>
                      <CardDescription className="text-sm">
                        {plan.teacherMin === 0 && plan.teacherMax === 15
                          ? 'Perfect for small schools getting started'
                          : plan.teacherMax <= 50
                          ? 'Ideal for growing institutions'
                          : 'For large schools and districts'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300">
                            Up to <strong>{plan.teacherMax}</strong> teachers
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300">
                            Unlimited timetable slots
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300">
                            CSV bulk import
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-slate-700 dark:text-slate-300">
                            Priority support
                          </span>
                        </div>
                      </div>

                      {isCurrentPlan ? (
                        <Button
                          disabled
                          className="w-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 cursor-not-allowed"
                        >
                          Current Plan
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleSwitchPlan(plan.id)}
                          disabled={switchingPlan === plan.id}
                          className={`w-full ${
                            index === 2
                              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-lg shadow-amber-500/30'
                              : isPopular
                              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'
                              : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                          }`}
                        >
                          {switchingPlan === plan.id ? (
                            'Switching...'
                          ) : (
                            <>
                              Switch to {plan.name}
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <Dialog open={trialDialogOpen} onOpenChange={setTrialDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="lg" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Request 7-Day Free Trial
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Free Trial</DialogTitle>
                  <DialogDescription>
                    Fill in your details to request a 7-day free trial. We'll review your request and get back to you within 24 hours.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="instituteName">Institute Name *</Label>
                    <Input
                      id="instituteName"
                      placeholder="Your institute name"
                      value={trialForm.instituteName}
                      onChange={(e) => setTrialForm({ ...trialForm, instituteName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactNo">Contact Number *</Label>
                    <Input
                      id="contactNo"
                      type="tel"
                      placeholder="+91 9876543210"
                      value={trialForm.contactNo}
                      onChange={(e) => setTrialForm({ ...trialForm, contactNo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={trialForm.email}
                      onChange={(e) => setTrialForm({ ...trialForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="planId">Select Plan *</Label>
                    <select
                      id="planId"
                      value={trialForm.planId}
                      onChange={(e) => setTrialForm({ ...trialForm, planId: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    >
                      <option value="">Choose a plan...</option>
                      {plans.filter(plan => plan.id !== 'baseline-free-tier').map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} - ₹{plan.priceMonthly}/month ({plan.teacherMin}-{plan.teacherMax} teachers)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for trial *</Label>
                    <Textarea
                      id="reason"
                      placeholder="Describe your use case and why you need a trial..."
                      value={trialReason}
                      onChange={(e) => setTrialReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={handleTrialSubmit}
                    disabled={submittingTrial || !trialReason.trim() || !trialForm.instituteName.trim() || !trialForm.contactNo.trim() || !trialForm.email.trim() || !trialForm.planId.trim()}
                    className="w-full"
                  >
                    {submittingTrial ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
