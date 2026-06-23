'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, RefreshCw, Check, X, AlertCircle, Clock } from 'lucide-react';

import { useRequireAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  schoolId: string;
  planId: string;
  amount: string;
  billingCycle: string;
  utrNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  createdAt: string;
  school: {
    id: string;
    name: string;
    email: string | null;
  };
}

export default function PaymentsPage() {
  useRequireAuth('super-admin');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; transactionId: string; reason: string }>({
    open: false,
    transactionId: '',
    reason: ''
  });

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/transactions?status=PENDING');
      const data = await res.json();
      setTransactions(data || []);
    } catch (err) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleApprove = async (transactionId: string) => {
    setProcessing(transactionId);
    try {
      const res = await fetch(`/api/super-admin/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');
      toast.success('Transaction approved and plan activated');
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve transaction');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.reason.trim()) {
      return toast.error('Please provide a rejection reason');
    }
    setProcessing(rejectDialog.transactionId);
    try {
      const res = await fetch(`/api/super-admin/transactions/${rejectDialog.transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', rejectionReason: rejectDialog.reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject');
      toast.success('Transaction rejected');
      setRejectDialog({ open: false, transactionId: '', reason: '' });
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject transaction');
    } finally {
      setProcessing(null);
    }
  };

  const openRejectDialog = (transactionId: string) => {
    setRejectDialog({ open: true, transactionId, reason: '' });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='max-w-7xl mx-auto space-y-6'>
      <PageHeader
        title='Payment Verification'
        description='Review and approve subscription payment requests from schools.'
        breadcrumbs={[{ label: 'Super Admin', href: '/super-admin/dashboard' }, { label: 'Payments' }]}
        actions={
          <Button variant='outline' size='sm' onClick={fetchTransactions} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <GlassCard className='p-6'>
        {loading ? (
          <div className='space-y-4'>
            {[...Array(3)].map((_, i) => (
              <div key={i} className='h-20 bg-muted/30 rounded-lg animate-pulse' />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className='text-center py-12'>
            <div className='w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center'>
              <Check className='w-8 h-8 text-slate-400' />
            </div>
            <h3 className='text-lg font-semibold text-slate-900 dark:text-white mb-2'>No Pending Transactions</h3>
            <p className='text-sm text-slate-500'>All payment requests have been processed.</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/40'>
                <tr>
                  <th className='p-4 text-left font-medium'>School</th>
                  <th className='p-4 text-left font-medium'>Plan ID</th>
                  <th className='p-4 text-left font-medium'>Amount</th>
                  <th className='p-4 text-left font-medium'>Billing Cycle</th>
                  <th className='p-4 text-left font-medium'>UTR Number</th>
                  <th className='p-4 text-left font-medium'>Submitted</th>
                  <th className='p-4 text-right font-medium'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className='border-t border-border/30 hover:bg-muted/20 transition-colors'>
                    <td className='p-4'>
                      <div>
                        <p className='font-medium text-slate-900 dark:text-white'>{transaction.school.name}</p>
                        <p className='text-xs text-slate-500'>{transaction.school.email || 'No email'}</p>
                      </div>
                    </td>
                    <td className='p-4 font-mono text-xs'>{transaction.planId.slice(0, 8)}...</td>
                    <td className='p-4 font-semibold'>₹{transaction.amount}</td>
                    <td className='p-4'>
                      <Badge variant='outline' className='capitalize'>{transaction.billingCycle}</Badge>
                    </td>
                    <td className='p-4 font-mono text-xs'>{transaction.utrNumber}</td>
                    <td className='p-4 text-xs text-slate-500'>
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </td>
                    <td className='p-4 text-right'>
                      <div className='flex items-center justify-end gap-2'>
                        <Button
                          size='sm'
                          onClick={() => handleApprove(transaction.id)}
                          disabled={processing === transaction.id}
                          className='bg-emerald-600 hover:bg-emerald-700 text-white'
                        >
                          <Check className='w-4 h-4 mr-1' />
                          Approve
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => openRejectDialog(transaction.id)}
                          disabled={processing === transaction.id}
                          className='text-rose-600 border-rose-200 hover:bg-rose-50'
                        >
                          <X className='w-4 h-4 mr-1' />
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transaction</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payment verification.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <Textarea
              placeholder='Enter rejection reason...'
              value={rejectDialog.reason}
              onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
              rows={3}
            />
            <div className='flex gap-3 justify-end'>
              <Button variant='outline' onClick={() => setRejectDialog({ open: false, transactionId: '', reason: '' })}>
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={processing === rejectDialog.transactionId || !rejectDialog.reason.trim()}
                className='bg-rose-600 hover:bg-rose-700 text-white'
              >
                {processing === rejectDialog.transactionId ? 'Rejecting...' : 'Reject Transaction'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
