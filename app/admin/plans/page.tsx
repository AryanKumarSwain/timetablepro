'use client';

import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Save, Settings } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  teacherMin: number;
  teacherMax: number;
  priceMonthly: number;
  reportEnabled: boolean;
  attendanceEnabled: boolean;
  homeworkEnabled: boolean;
  exportFormats: string[];
  watermarkRequired: boolean;
}

export default function AdminPlansPage() {
  const auth = useRequireAuth('admin');
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      void loadPlans();
    }
  }, [auth.loading, auth.user]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/plans');
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      console.error('Failed to load plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = (planId: string, field: keyof Plan, value: any) => {
    setPlans(plans.map(plan => 
      plan.id === planId ? { ...plan, [field]: value } : plan
    ));
  };

  const handleExportFormatToggle = (planId: string, format: string) => {
    setPlans(plans.map(plan => {
      if (plan.id === planId) {
        const currentFormats = plan.exportFormats || [];
        const newFormats = currentFormats.includes(format)
          ? currentFormats.filter(f => f !== format)
          : [...currentFormats, format];
        return { ...plan, exportFormats: newFormats };
      }
      return plan;
    }));
  };

  const handleSavePlan = async (plan: Plan) => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });

      if (!response.ok) {
        throw new Error('Failed to update plan');
      }

      toast.success(`Plan "${plan.name}" updated successfully`);
    } catch (error) {
      console.error('Failed to update plan:', error);
      toast.error('Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      await Promise.all(plans.map(plan => handleSavePlan(plan)));
      toast.success('All plans updated successfully');
    } catch (error) {
      console.error('Failed to update plans:', error);
      toast.error('Failed to update some plans');
    } finally {
      setSaving(false);
    }
  };

  if (loading || auth.loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="container mx-auto p-6">
      <PageHeader
        title="Plan Management"
        description="Configure pricing tiers and feature access controls"
      />

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSaveAll} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>

      <div className="mt-6 space-y-6">
        {plans.map((plan) => (
          <GlassCard key={plan.id} className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {plan.teacherMin}-{plan.teacherMax} Teachers
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor={`price-${plan.id}`}>Monthly Price (₹)</Label>
                <Input
                  id={`price-${plan.id}`}
                  type="number"
                  value={plan.priceMonthly}
                  onChange={(e) => handlePlanChange(plan.id, 'priceMonthly', parseFloat(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`min-${plan.id}`}>Min Teachers</Label>
                  <Input
                    id={`min-${plan.id}`}
                    type="number"
                    value={plan.teacherMin}
                    onChange={(e) => handlePlanChange(plan.id, 'teacherMin', parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`max-${plan.id}`}>Max Teachers</Label>
                  <Input
                    id={`max-${plan.id}`}
                    type="number"
                    value={plan.teacherMax}
                    onChange={(e) => handlePlanChange(plan.id, 'teacherMax', parseInt(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="font-semibold">Feature Access Gates</h4>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`reports-${plan.id}`}
                  checked={plan.reportEnabled}
                  onCheckedChange={(checked) => handlePlanChange(plan.id, 'reportEnabled', checked)}
                />
                <Label htmlFor={`reports-${plan.id}`}>Reports Enabled</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`attendance-${plan.id}`}
                  checked={plan.attendanceEnabled}
                  onCheckedChange={(checked) => handlePlanChange(plan.id, 'attendanceEnabled', checked)}
                />
                <Label htmlFor={`attendance-${plan.id}`}>Attendance Enabled</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`homework-${plan.id}`}
                  checked={plan.homeworkEnabled}
                  onCheckedChange={(checked) => handlePlanChange(plan.id, 'homeworkEnabled', checked)}
                />
                <Label htmlFor={`homework-${plan.id}`}>Homework Enabled</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`watermark-${plan.id}`}
                  checked={plan.watermarkRequired}
                  onCheckedChange={(checked) => handlePlanChange(plan.id, 'watermarkRequired', checked)}
                />
                <Label htmlFor={`watermark-${plan.id}`}>Watermark Required</Label>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="font-semibold">Export Formats</h4>
              <div className="flex flex-wrap gap-4">
                {['pdf', 'docx', 'csv'].map((format) => (
                  <div key={format} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${format}-${plan.id}`}
                      checked={(plan.exportFormats || []).includes(format)}
                      onCheckedChange={() => handleExportFormatToggle(plan.id, format)}
                    />
                    <Label htmlFor={`${format}-${plan.id}`} className="uppercase">
                      {format}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => handleSavePlan(plan)}
                disabled={saving}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save {plan.name}
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
