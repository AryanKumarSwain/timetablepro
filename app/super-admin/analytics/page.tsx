'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Users, TrendingUp, RefreshCw, Building2, AlertCircle, Settings, Check, X, Info, Mail, Phone, Calendar } from 'lucide-react';

import { useRequireAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  getPlatformTeacherDistribution,
  getPlatformRevenueDetail,
  type PlatformTeacherDistribution,
  type PlatformRevenueDetail,
} from '@/lib/api-services';

type AnalyticsData = {
  totalSchools: number;
  statusDistribution: {
    ACTIVE: number;
    TRIAL: number;
    SUSPENDED: number;
    TRAIL_EXPIRED: number;
  };
  planBreakdown: Array<{
    id: string;
    name: string;
    teacherMin: number;
    teacherMax: number;
    priceMonthly: number;
    schoolCount: number;
  }>;
};

export default function AnalyticsPage() {
  useRequireAuth('super-admin');

  const [teacherDistribution, setTeacherDistribution] = useState<PlatformTeacherDistribution[]>([]);
  const [revenueDetail, setRevenueDetail] = useState<PlatformRevenueDetail | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upiId, setUpiId] = useState<string>('');
  const [upiLoading, setUpiLoading] = useState(false);
  const [upiSaving, setUpiSaving] = useState(false);
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [processingTx, setProcessingTx] = useState<string | null>(null);
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; transaction: any }>({ open: false, transaction: null });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teachers, revenue, analytics, settings, transactions] = await Promise.all([
        getPlatformTeacherDistribution(),
        getPlatformRevenueDetail(),
        fetch('/api/super-admin/analytics').then((res) => res.json()),
        fetch('/api/super-admin/platform-settings').then((res) => res.json()),
        fetch('/api/super-admin/transactions?status=PENDING').then((res) => res.json()),
      ]);
      setTeacherDistribution(teachers ?? []);
      setRevenueDetail(revenue);
      setAnalyticsData(analytics);
      setUpiId(settings.upiId || '');
      setPendingTransactions(transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateUpiId = async () => {
    if (!upiId.trim()) {
      return toast.error('Please enter a valid UPI ID');
    }
    setUpiSaving(true);
    try {
      const res = await fetch('/api/super-admin/platform-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upiId: upiId.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update UPI ID');
      toast.success('UPI ID updated successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update UPI ID');
    } finally {
      setUpiSaving(false);
    }
  };

  const handleApproveTransaction = async (transactionId: string) => {
    setProcessingTx(transactionId);
    try {
      const res = await fetch(`/api/super-admin/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');
      toast.success('Transaction approved and plan activated');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve transaction');
    } finally {
      setProcessingTx(null);
    }
  };

  const handleRejectTransaction = async (transactionId: string) => {
    setProcessingTx(transactionId);
    try {
      const res = await fetch(`/api/super-admin/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: 'Payment verification failed' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject');
      toast.success('Transaction rejected');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject transaction');
    } finally {
      setProcessingTx(null);
    }
  };

  const totalTeachers = teacherDistribution.reduce((sum, t) => sum + (typeof t.teacherCount === 'number' ? t.teacherCount : 0), 0);
  const annualRevenue = revenueDetail?.activeMrr ? revenueDetail.activeMrr * 12 : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='max-w-7xl mx-auto space-y-6'>
      <PageHeader
        title='Platform Analytics'
        description='Revenue metrics, teacher distribution, and platform-wide performance insights.'
        breadcrumbs={[{ label: 'Super Admin', href: '/super-admin/dashboard' }, { label: 'Analytics' }]}
      />

      {error && (
        <div className='p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm'>
          {error}
        </div>
      )}

      <div className='grid md:grid-cols-4 gap-4'>
        <GlassCard className='p-6'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center'>
              <DollarSign className='w-5 h-5 text-emerald-500' />
            </div>
            <p className='text-sm text-muted-foreground'>Annual Revenue</p>
          </div>
          <h3 className='text-2xl font-bold'>₹{annualRevenue.toLocaleString()}</h3>
        </GlassCard>

        <GlassCard className='p-6'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center'>
              <Users className='w-5 h-5 text-blue-500' />
            </div>
            <p className='text-sm text-muted-foreground'>Total Teachers</p>
          </div>
          <h3 className='text-2xl font-bold'>{totalTeachers.toLocaleString()}</h3>
        </GlassCard>

        <GlassCard className='p-6'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center'>
              <Building2 className='w-5 h-5 text-purple-500' />
            </div>
            <p className='text-sm text-muted-foreground'>Total Schools</p>
          </div>
          <h3 className='text-2xl font-bold'>{analyticsData?.totalSchools ?? 0}</h3>
        </GlassCard>

        <GlassCard className='p-6'>
          <div className='flex items-center gap-3 mb-2'>
            <div className='w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center'>
              <AlertCircle className='w-5 h-5 text-rose-500' />
            </div>
            <p className='text-sm text-muted-foreground'>Trial Expired</p>
          </div>
          <h3 className='text-2xl font-bold'>{analyticsData?.statusDistribution?.TRAIL_EXPIRED ?? 0}</h3>
        </GlassCard>
      </div>

      {/* Platform Settings Card */}
      <GlassCard className='p-6'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center'>
            <Settings className='w-5 h-5 text-purple-500' />
          </div>
          <div>
            <h3 className='font-semibold'>Platform Settings</h3>
            <p className='text-xs text-muted-foreground'>Configure payment receiving details</p>
          </div>
        </div>
        <div className='space-y-3'>
          <div className='space-y-1'>
            <Label htmlFor='upiId' className='text-xs font-semibold'>UPI Receiving ID</Label>
            <Input
              id='upiId'
              placeholder='example@upi'
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className='h-9'
            />
            <p className='text-[10px] text-muted-foreground'>
              This UPI ID will be used for QR code generation in the checkout flow
            </p>
          </div>
          <Button
            onClick={handleUpdateUpiId}
            disabled={upiSaving || !upiId.trim()}
            className='w-full'
            size='sm'
          >
            {upiSaving ? 'Saving...' : 'Update UPI ID'}
          </Button>
        </div>
      </GlassCard>

      {/* Pending Subscriptions Widget */}
      <GlassCard className='p-6'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center'>
              <DollarSign className='w-5 h-5 text-amber-500' />
            </div>
            <div>
              <h3 className='font-semibold'>Pending Subscriptions</h3>
              <p className='text-xs text-muted-foreground'>{pendingTransactions.length} awaiting verification</p>
            </div>
          </div>
          <Button variant='outline' size='sm' onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {pendingTransactions.length === 0 ? (
          <div className='text-center py-8 text-sm text-muted-foreground'>
            No pending subscriptions
          </div>
        ) : (
          <div className='space-y-3 max-h-80 overflow-y-auto'>
            {pendingTransactions.map((tx) => (
              <div key={tx.id} className='p-4 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/30 transition-colors'>
                <div className='flex items-start justify-between mb-2'>
                  <div>
                    <p className='font-medium text-sm'>{tx.school?.name || 'Unknown School'}</p>
                    <p className='text-xs text-muted-foreground'>Plan: {tx.planId || 'Unknown'}</p>
                  </div>
                  <Badge variant='outline' className='text-xs'>₹{tx.amount}</Badge>
                </div>
                <div className='flex items-center justify-between mt-3'>
                  <p className='text-xs font-mono text-muted-foreground'>UTR: {tx.utrNumber}</p>
                  <div className='flex gap-2'>
                    <Button
                      size='sm'
                      variant='ghost'
                      onClick={() => setDetailsDialog({ open: true, transaction: tx })}
                      className='h-7 text-xs'
                    >
                      <Info className='w-3 h-3 mr-1' />
                      Details
                    </Button>
                    <Button
                      size='sm'
                      onClick={() => handleApproveTransaction(tx.id)}
                      disabled={processingTx === tx.id}
                      className='h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white'
                    >
                      {processingTx === tx.id ? '...' : 'Approve'}
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleRejectTransaction(tx.id)}
                      disabled={processingTx === tx.id}
                      className='h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50'
                    >
                      {processingTx === tx.id ? '...' : 'Reject'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* School Details Dialog */}
      <Dialog open={detailsDialog.open} onOpenChange={(open) => setDetailsDialog({ ...detailsDialog, open })}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>School Details</DialogTitle>
            <DialogDescription>
              Detailed information about the subscription request
            </DialogDescription>
          </DialogHeader>
          {detailsDialog.transaction && (
            <div className='space-y-4 py-4'>
              <div className='space-y-3'>
                <div className='flex items-start gap-3'>
                  <Building2 className='w-5 h-5 text-muted-foreground mt-0.5' />
                  <div>
                    <p className='text-sm font-medium'>{detailsDialog.transaction.school?.name || 'Unknown School'}</p>
                    <p className='text-xs text-muted-foreground'>School Name</p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <Mail className='w-5 h-5 text-muted-foreground mt-0.5' />
                  <div>
                    <p className='text-sm font-medium'>{detailsDialog.transaction.school?.email || 'N/A'}</p>
                    <p className='text-xs text-muted-foreground'>Email</p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <Phone className='w-5 h-5 text-muted-foreground mt-0.5' />
                  <div>
                    <p className='text-sm font-medium'>{detailsDialog.transaction.school?.phone || 'N/A'}</p>
                    <p className='text-xs text-muted-foreground'>Phone Number</p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <DollarSign className='w-5 h-5 text-muted-foreground mt-0.5' />
                  <div>
                    <p className='text-sm font-medium'>{detailsDialog.transaction.school?.planId || 'Free'}</p>
                    <p className='text-xs text-muted-foreground'>Current Plan</p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <TrendingUp className='w-5 h-5 text-muted-foreground mt-0.5' />
                  <div>
                    <p className='text-sm font-medium'>{detailsDialog.transaction.planId || 'Unknown'}</p>
                    <p className='text-xs text-muted-foreground'>Requested Plan</p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <Calendar className='w-5 h-5 text-muted-foreground mt-0.5' />
                  <div>
                    <p className='text-sm font-medium capitalize'>{detailsDialog.transaction.billingCycle}</p>
                    <p className='text-xs text-muted-foreground'>Billing Cycle</p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <AlertCircle className='w-5 h-5 text-muted-foreground mt-0.5' />
                  <div>
                    <p className='text-sm font-mono font-medium'>{detailsDialog.transaction.utrNumber}</p>
                    <p className='text-xs text-muted-foreground'>UTR Number</p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <DollarSign className='w-5 h-5 text-muted-foreground mt-0.5' />
                  <div>
                    <p className='text-sm font-bold text-lg'>₹{detailsDialog.transaction.amount}</p>
                    <p className='text-xs text-muted-foreground'>Amount</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className='grid lg:grid-cols-2 gap-6'>
        <GlassCard className='p-6'>
          <h3 className='font-semibold mb-4'>License Status Distribution</h3>
          {loading ? (
            <div className='space-y-3'>
              {[...Array(4)].map((_, i) => (
                <div key={i} className='h-12 bg-muted/30 rounded-lg animate-pulse' />
              ))}
            </div>
          ) : (
            <div className='space-y-3'>
              <div className='flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20'>
                <span className='text-sm font-medium'>Active</span>
                <span className='text-lg font-bold text-emerald-600'>{analyticsData?.statusDistribution?.ACTIVE ?? 0}</span>
              </div>
              <div className='flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20'>
                <span className='text-sm font-medium'>Trial</span>
                <span className='text-lg font-bold text-blue-600'>{analyticsData?.statusDistribution?.TRIAL ?? 0}</span>
              </div>
              <div className='flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20'>
                <span className='text-sm font-medium'>Suspended</span>
                <span className='text-lg font-bold text-amber-600'>{analyticsData?.statusDistribution?.SUSPENDED ?? 0}</span>
              </div>
              <div className='flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/20'>
                <span className='text-sm font-medium'>Trial Expired</span>
                <span className='text-lg font-bold text-rose-600'>{analyticsData?.statusDistribution?.TRAIL_EXPIRED ?? 0}</span>
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard className='p-6'>
          <h3 className='font-semibold mb-4'>Plan Breakdown</h3>
          {loading ? (
            <div className='space-y-3'>
              {[...Array(4)].map((_, i) => (
                <div key={i} className='h-12 bg-muted/30 rounded-lg animate-pulse' />
              ))}
            </div>
          ) : analyticsData?.planBreakdown && analyticsData.planBreakdown.length > 0 ? (
            <div className='space-y-3'>
              {analyticsData.planBreakdown.map((plan) => (
                <div key={plan.id} className='flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40'>
                  <div>
                    <p className='text-sm font-medium'>{plan.name}</p>
                    <p className='text-xs text-muted-foreground'>₹{plan.priceMonthly.toFixed(2)}/mo</p>
                  </div>
                  <div className='text-right'>
                    <p className='text-lg font-bold'>{plan.schoolCount}</p>
                    <p className='text-xs text-muted-foreground'>schools</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-center text-sm text-muted-foreground py-8'>No plan data available</div>
          )}
        </GlassCard>
      </div>

      <div className='grid lg:grid-cols-2 gap-6'>
        <GlassCard className='p-6'>
          <div className='flex items-center justify-between mb-6'>
            <h3 className='font-semibold'>Teacher Distribution by School</h3>
            <Button variant='outline' size='icon' onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {loading ? (
            <div className='space-y-3'>
              {[...Array(5)].map((_, i) => (
                <div key={i} className='h-16 bg-muted/30 rounded-lg animate-pulse' />
              ))}
            </div>
          ) : (
            <div className='space-y-3'>
              {teacherDistribution.length === 0 ? (
                <div className='rounded-xl border border-border/50 bg-muted/20 p-5 text-center text-sm text-muted-foreground'>
                  No teacher distribution data available.
                </div>
              ) : (
                teacherDistribution.map((teacher) => (
                  <div
                    key={teacher.schoolId}
                    className='flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 p-4 hover:bg-muted/30 transition-colors'
                  >
                    <div>
                      <p className='font-medium'>{typeof teacher.schoolName === 'string' ? teacher.schoolName : '-'}</p>
                      <p className='text-xs text-muted-foreground'>Faculty load cluster</p>
                    </div>
                    <div className='text-lg font-semibold'>
                      {typeof teacher.teacherCount === 'number' ? teacher.teacherCount : 0}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </GlassCard>

        <GlassCard className='p-6'>
          <div className='flex items-center justify-between mb-6'>
            <h3 className='font-semibold'>Revenue by Tier</h3>
            <Button variant='outline' size='icon' onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {loading ? (
            <div className='space-y-3'>
              {[...Array(3)].map((_, i) => (
                <div key={i} className='h-20 bg-muted/30 rounded-lg animate-pulse' />
              ))}
            </div>
          ) : !revenueDetail ? (
            <div className='rounded-xl border border-border/50 bg-muted/20 p-5 text-center text-sm text-muted-foreground'>
              No revenue data available.
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='grid md:grid-cols-2 gap-4 mb-4'>
                <div className='p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20'>
                  <p className='text-sm text-muted-foreground'>Monthly Recurring Revenue</p>
                  <h3 className='text-2xl font-bold mt-1'>
                    ₹{typeof revenueDetail.activeMrr === 'number' ? revenueDetail.activeMrr.toLocaleString() : '0'}
                  </h3>
                </div>
                <div className='p-4 rounded-lg bg-blue-500/10 border border-blue-500/20'>
                  <p className='text-sm text-muted-foreground'>Total Transactions</p>
                  <h3 className='text-2xl font-bold mt-1'>
                    {Array.isArray(revenueDetail.transactions) ? revenueDetail.transactions.length : 0}
                  </h3>
                </div>
              </div>

              <div className='overflow-hidden rounded-xl border border-border/50'>
                <table className='w-full text-sm'>
                  <thead className='bg-muted/40'>
                    <tr>
                      <th className='p-3 text-left font-medium'>Tier</th>
                      <th className='p-3 text-left font-medium'>Schools</th>
                      <th className='p-3 text-left font-medium'>Monthly Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(revenueDetail.tierContributions ?? []).map((item, index) => (
                      <tr key={`revenue-tier-${index}`} className='border-t border-border/30'>
                        <td className='p-3 font-medium'>{typeof item.planName === 'string' ? item.planName : '-'}</td>
                        <td className='p-3'>{typeof item.count === 'number' ? item.count : 0}</td>
                        <td className='p-3'>₹{typeof item.subtotal === 'number' ? item.subtotal.toFixed(2) : '0.00'}</td>
                      </tr>
                    ))}
                    {(revenueDetail.tierContributions ?? []).length === 0 && (
                      <tr>
                        <td colSpan={3} className='p-3 text-center text-muted-foreground text-sm'>
                          No tier contribution data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </motion.div>
  );
}
