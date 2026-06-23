'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, RefreshCw, MoreHorizontal, Ban, ArrowUp, Shield } from 'lucide-react';

import { useRequireAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getPlatformSchools, type PlatformSchoolRow } from '@/lib/api-services';
import { getStatusBadgeClass, formatDate } from '@/lib/super-admin-utils';
import { cn } from '@/lib/utils';

export default function SchoolsPage() {
  useRequireAuth('super-admin');

  const [schools, setSchools] = useState<PlatformSchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'suspended'>('all');
  const [actionDialog, setActionDialog] = useState<{ open: boolean; school: PlatformSchoolRow | null; action: 'suspend' | 'upgrade' | 'restrict' }>({ open: false, school: null, action: 'suspend' });
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  const fetchSchools = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPlatformSchools();
      setSchools(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendAccount = async (schoolId: string) => {
    setProcessingAction(schoolId);
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/suspend`, { method: 'PATCH' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to suspend account');
      toast.success('Account suspended successfully');
      fetchSchools();
    } catch (err: any) {
      toast.error(err.message || 'Failed to suspend account');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleUpgradePlan = async (schoolId: string, planId: string) => {
    setProcessingAction(schoolId);
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/upgrade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upgrade plan');
      toast.success('Plan upgraded successfully');
      setActionDialog({ open: false, school: null, action: 'upgrade' });
      fetchSchools();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upgrade plan');
    } finally {
      setProcessingAction(null);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const filteredSchools = schools.filter((school) => {
    const matchesSearch =
      typeof school.name === 'string' && school.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && school.licenseStatus?.toLowerCase() === 'active') ||
      (statusFilter === 'trial' && school.licenseStatus?.toLowerCase() === 'trial') ||
      (statusFilter === 'suspended' && school.licenseStatus?.toLowerCase() === 'suspended');
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='max-w-7xl mx-auto space-y-6'>
      <PageHeader
        title='School Management'
        description='View and manage all institutional tenant accounts and licensing status.'
        breadcrumbs={[{ label: 'Super Admin', href: '/super-admin/dashboard' }, { label: 'Schools' }]}
      />

      <GlassCard className='p-6'>
        <div className='flex flex-col sm:flex-row gap-4 items-center justify-between mb-6'>
          <div className='flex flex-1 gap-3 w-full sm:w-auto'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
              <Input
                placeholder='Search schools...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-10'
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className='px-3 py-2 rounded-md border border-input bg-background text-sm'
            >
              <option value='all'>All Status</option>
              <option value='active'>Active</option>
              <option value='trial'>Trial</option>
              <option value='suspended'>Suspended</option>
            </select>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' size='icon' onClick={fetchSchools} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant='outline' size='icon' onClick={() => {
              if (typeof window !== 'undefined') {
                const csvContent = [
                  ['School', 'Plan', 'Status', 'Created', 'Admin Emails'],
                  ...filteredSchools.map(s => [
                    typeof s.name === 'string' ? s.name : '-',
                    typeof s.planName === 'string' ? s.planName : '-',
                    typeof s.licenseStatus === 'string' ? s.licenseStatus : '-',
                    formatDate(s.licenseDate),
                    Array.isArray(s.adminEmails) ? s.adminEmails.join('; ') : '-'
                  ])
                ].map(row => row.join(',')).join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `schools-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              }
            }}>
              <Download className='w-4 h-4' />
            </Button>
          </div>
        </div>

        {error && (
          <div className='mb-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm'>
            {error}
          </div>
        )}

        {loading ? (
          <div className='space-y-3'>
            {[...Array(5)].map((_, i) => (
              <div key={i} className='h-16 bg-muted/30 rounded-lg animate-pulse' />
            ))}
          </div>
        ) : (
          <div className='overflow-hidden rounded-xl border border-border/50'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/40'>
                <tr>
                  <th className='p-3 text-left font-medium'>School</th>
                  <th className='p-3 text-left font-medium'>Plan</th>
                  <th className='p-3 text-left font-medium'>Status</th>
                  <th className='p-3 text-left font-medium'>Created</th>
                  <th className='p-3 text-left font-medium'>Admin Emails</th>
                  <th className='p-3 text-right font-medium'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={6} className='p-6 text-center text-sm text-muted-foreground'>
                      {searchQuery || statusFilter !== 'all'
                        ? 'No schools match your filters.'
                        : 'No school data available.'}
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((school) => (
                    <tr key={school.id} className='border-t border-border/30 hover:bg-muted/20 transition-colors'>
                      <td className='p-3 font-medium'>{typeof school.name === 'string' ? school.name : '-'}</td>
                      <td className='p-3'>{typeof school.planName === 'string' ? school.planName : '-'}</td>
                      <td className='p-3'>
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium border', getStatusBadgeClass(school.licenseStatus))}>
                          {typeof school.licenseStatus === 'string' ? school.licenseStatus : '-'}
                        </span>
                      </td>
                      <td className='p-3'>{formatDate(school.licenseDate)}</td>
                      <td className='p-3'>
                        <div className='flex flex-wrap gap-1'>
                          {Array.isArray(school.adminEmails) && school.adminEmails.length > 0 ? (
                            school.adminEmails.slice(0, 2).map((email, idx) => (
                              <span key={idx} className='text-xs text-muted-foreground'>
                                {email}
                                {idx === 0 && school.adminEmails.length > 1 && ', ...'}
                              </span>
                            ))
                          ) : (
                            <span className='text-xs text-muted-foreground'>-</span>
                          )}
                        </div>
                      </td>
                      <td className='p-3 text-right'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                              <MoreHorizontal className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem onClick={() => setActionDialog({ open: true, school, action: 'suspend' })}>
                              <Ban className='mr-2 h-4 w-4' />
                              Suspend Account
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setActionDialog({ open: true, school, action: 'upgrade' })}>
                              <ArrowUp className='mr-2 h-4 w-4' />
                              Upgrade Plan
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setActionDialog({ open: true, school, action: 'restrict' })}>
                              <Shield className='mr-2 h-4 w-4' />
                              Modify Restrictions
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredSchools.length > 0 && (
          <div className='mt-4 text-sm text-muted-foreground text-center'>
            Showing {filteredSchools.length} of {schools.length} schools
          </div>
        )}
      </GlassCard>

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'suspend' ? 'Suspend Account' : 
               actionDialog.action === 'upgrade' ? 'Upgrade Plan' : 'Modify Restrictions'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'suspend' ? 
                `Are you sure you want to suspend ${actionDialog.school?.name}? This will disable their access.` :
               actionDialog.action === 'upgrade' ?
                'Select a plan to upgrade this school to.' :
                'Modify restrictions for this school.'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            {actionDialog.action === 'suspend' && (
              <p className='text-sm text-muted-foreground'>
                This action will set the school's license status to SUSPENDED and notify the school administrators.
              </p>
            )}
            {actionDialog.action === 'upgrade' && (
              <div className='space-y-2'>
                <Label htmlFor='planSelect'>Select Plan</Label>
                <select
                  id='planSelect'
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className='w-full px-3 py-2 rounded-md border border-input bg-background text-sm'
                >
                  <option value=''>Select a plan...</option>
                  <option value='standard'>Standard</option>
                  <option value='premium'>Premium</option>
                  <option value='elite'>Elite</option>
                </select>
              </div>
            )}
            {actionDialog.action === 'restrict' && (
              <p className='text-sm text-muted-foreground'>
                Restriction modification feature coming soon.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setActionDialog({ open: false, school: null, action: 'suspend' })}>
              Cancel
            </Button>
            {actionDialog.action === 'suspend' && actionDialog.school && (
              <Button
                variant='destructive'
                onClick={() => handleSuspendAccount(actionDialog.school!.id)}
                disabled={processingAction === actionDialog.school.id}
              >
                {processingAction === actionDialog.school.id ? 'Suspending...' : 'Suspend Account'}
              </Button>
            )}
            {actionDialog.action === 'upgrade' && actionDialog.school && (
              <Button
                onClick={() => handleUpgradePlan(actionDialog.school!.id, selectedPlanId)}
                disabled={processingAction === actionDialog.school.id || !selectedPlanId}
              >
                {processingAction === actionDialog.school.id ? 'Upgrading...' : 'Upgrade Plan'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}