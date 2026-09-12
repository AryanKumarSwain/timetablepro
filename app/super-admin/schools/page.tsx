'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, RefreshCw, MoreHorizontal, Ban, CheckCircle, Building2 } from 'lucide-react';

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
  const [actionDialog, setActionDialog] = useState<{ open: boolean; school: PlatformSchoolRow | null; action: 'suspend' | 'unsuspend' }>({ open: false, school: null, action: 'suspend' });
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Institute details edit dialog
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    school: PlatformSchoolRow | null;
    form: {
      name: string;
      address: string;
      phone: string;
      email: string;
      website: string;
      instagram: string;
      facebook: string;
      linkedin: string;
      twitter: string;
    };
  }>({
    open: false,
    school: null,
    form: {
      name: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      instagram: '',
      facebook: '',
      linkedin: '',
      twitter: '',
    },
  });
  const [savingDetails, setSavingDetails] = useState(false);

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

  const openInstituteDetails = (school: PlatformSchoolRow) => {
    setEditDialog({
      open: true,
      school,
      form: {
        name: school.name || '',
        address: school.address || '',
        phone: school.phone || '',
        email: school.email || (school.adminEmails?.[0] || ''),
        website: school.website || '',
        instagram: school.instagram || '',
        facebook: school.facebook || '',
        linkedin: school.linkedin || '',
        twitter: school.twitter || '',
      },
    });
  };

  const handleSaveInstituteDetails = async () => {
    if (!editDialog.school) return;
    if (!editDialog.form.name.trim()) {
      toast.error('Institute name is required');
      return;
    }

    setSavingDetails(true);
    try {
      const res = await fetch(`/api/super-admin/schools/${editDialog.school.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editDialog.form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update institute details');

      toast.success('Institute details saved successfully');
      setEditDialog((prev) => ({ ...prev, open: false }));
      fetchSchools();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save institute details');
    } finally {
      setSavingDetails(false);
    }
  };

  const handleToggleSuspend = async (schoolId: string, action: 'suspend' | 'unsuspend') => {
    setProcessingAction(schoolId);
    try {
      const res = await fetch(`/api/super-admin/schools/${schoolId}/suspend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} account`);
      toast.success(action === 'unsuspend' ? 'Account reactivated successfully' : 'Account suspended successfully');
      setActionDialog({ open: false, school: null, action: 'suspend' });
      fetchSchools();
    } catch (err: any) {
      toast.error(err.message || 'Operation failed');
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
      />

      {/* Actions & Filters */}
      <GlassCard className='p-4'>
        <div className='flex flex-col sm:flex-row gap-4 justify-between items-center'>
          <div className='flex flex-1 w-full sm:w-auto gap-2 items-center'>
            <div className='relative flex-1 max-w-sm'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search schools...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-9'
              />
            </div>
            <div className='flex gap-1 border border-border/50 rounded-lg p-1 bg-muted/20'>
              {(['all', 'active', 'trial', 'suspended'] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'secondary' : 'ghost'}
                  size='sm'
                  onClick={() => setStatusFilter(status)}
                  className='capitalize text-xs h-7 px-2.5'
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
          <div className='flex gap-2 w-full sm:w-auto justify-end'>
            <Button variant='outline' size='sm' onClick={fetchSchools} disabled={loading} className='gap-1.5'>
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Schools Table */}
      <GlassCard className='p-6'>
        {loading ? (
          <div className='py-12 flex justify-center items-center'>
            <RefreshCw className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        ) : error ? (
          <div className='py-8 text-center text-rose-500 space-y-2'>
            <p>{error}</p>
            <Button variant='outline' size='sm' onClick={fetchSchools}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead className='text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border/50'>
                <tr>
                  <th className='p-3'>School Name</th>
                  <th className='p-3'>Plan Tier</th>
                  <th className='p-3'>Status</th>
                  <th className='p-3'>License Expiry</th>
                  <th className='p-3'>Admins</th>
                  <th className='p-3 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border/20'>
                {filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={6} className='p-8 text-center text-muted-foreground'>
                      {searchQuery || statusFilter !== 'all'
                        ? 'No schools match your filters.'
                        : 'No school data available.'}
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((school) => {
                    const isSuspended = school.licenseStatus?.toUpperCase() === 'SUSPENDED';

                    return (
                      <tr
                        key={school.id}
                        onClick={() => openInstituteDetails(school)}
                        className='border-t border-border/30 hover:bg-muted/30 transition-colors cursor-pointer group'
                      >
                        <td className='p-3 font-medium text-slate-900 dark:text-white group-hover:text-primary transition-colors'>
                          <div className='flex items-center gap-2'>
                            <Building2 className='w-4 h-4 text-purple-600 shrink-0 opacity-70 group-hover:opacity-100' />
                            <span>{typeof school.name === 'string' ? school.name : '-'}</span>
                          </div>
                        </td>
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
                        <td className='p-3 text-right' onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                                <MoreHorizontal className='h-4 w-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              <DropdownMenuItem
                                onClick={() => openInstituteDetails(school)}
                                className='cursor-pointer font-medium'
                              >
                                <Building2 className='mr-2 h-4 w-4 text-purple-600' />
                                Institute Details
                              </DropdownMenuItem>
                              {isSuspended ? (
                                <DropdownMenuItem
                                  onClick={() => setActionDialog({ open: true, school, action: 'unsuspend' })}
                                  className='text-emerald-600 focus:text-emerald-700 cursor-pointer font-medium'
                                >
                                  <CheckCircle className='mr-2 h-4 w-4 text-emerald-600' />
                                  Unsuspend Account
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => setActionDialog({ open: true, school, action: 'suspend' })}
                                  className='text-rose-600 focus:text-rose-700 cursor-pointer'
                                >
                                  <Ban className='mr-2 h-4 w-4 text-rose-600' />
                                  Suspend Account
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
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

      {/* Institute Details Dialog */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className='sm:max-w-md p-6 rounded-2xl'>
          <DialogHeader className='space-y-1.5'>
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600'>
                <Building2 className='w-4 h-4' />
              </div>
              <DialogTitle className='text-lg font-bold text-slate-900 dark:text-white'>
                Institute Details
              </DialogTitle>
            </div>
            <DialogDescription className='text-xs text-muted-foreground'>
              Manage your school's information and contact details
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                Institute Name
              </Label>
              <Input
                placeholder='Institute Name'
                value={editDialog.form.name}
                onChange={(e) =>
                  setEditDialog((prev) => ({
                    ...prev,
                    form: { ...prev.form, name: e.target.value },
                  }))
                }
                className='h-10 rounded-xl'
              />
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                Address
              </Label>
              <Input
                placeholder='Address'
                value={editDialog.form.address}
                onChange={(e) =>
                  setEditDialog((prev) => ({
                    ...prev,
                    form: { ...prev.form, address: e.target.value },
                  }))
                }
                className='h-10 rounded-xl'
              />
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                Phone Number
              </Label>
              <Input
                placeholder='+9134635465645'
                value={editDialog.form.phone}
                onChange={(e) =>
                  setEditDialog((prev) => ({
                    ...prev,
                    form: { ...prev.form, phone: e.target.value },
                  }))
                }
                className='h-10 rounded-xl'
              />
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                Email Address
              </Label>
              <Input
                type='email'
                placeholder='contact@school.edu'
                value={editDialog.form.email}
                onChange={(e) =>
                  setEditDialog((prev) => ({
                    ...prev,
                    form: { ...prev.form, email: e.target.value },
                  }))
                }
                className='h-10 rounded-xl'
              />
            </div>

            <div className='pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3'>
              <p className='text-xs font-bold text-slate-700 dark:text-slate-300'>Social Media & Web Links</p>
              
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                  Website / Web Portal
                </Label>
                <Input
                  placeholder='https://yourschool.edu'
                  value={editDialog.form.website}
                  onChange={(e) =>
                    setEditDialog((prev) => ({
                      ...prev,
                      form: { ...prev.form, website: e.target.value },
                    }))
                  }
                  className='h-10 rounded-xl'
                />
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                    Instagram
                  </Label>
                  <Input
                    placeholder='https://instagram.com/school'
                    value={editDialog.form.instagram}
                    onChange={(e) =>
                      setEditDialog((prev) => ({
                        ...prev,
                        form: { ...prev.form, instagram: e.target.value },
                      }))
                    }
                    className='h-10 rounded-xl'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                    Facebook
                  </Label>
                  <Input
                    placeholder='https://facebook.com/school'
                    value={editDialog.form.facebook}
                    onChange={(e) =>
                      setEditDialog((prev) => ({
                        ...prev,
                        form: { ...prev.form, facebook: e.target.value },
                      }))
                    }
                    className='h-10 rounded-xl'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                    LinkedIn
                  </Label>
                  <Input
                    placeholder='https://linkedin.com/company/school'
                    value={editDialog.form.linkedin}
                    onChange={(e) =>
                      setEditDialog((prev) => ({
                        ...prev,
                        form: { ...prev.form, linkedin: e.target.value },
                      }))
                    }
                    className='h-10 rounded-xl'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                    Twitter / X
                  </Label>
                  <Input
                    placeholder='https://x.com/school'
                    value={editDialog.form.twitter}
                    onChange={(e) =>
                      setEditDialog((prev) => ({
                        ...prev,
                        form: { ...prev.form, twitter: e.target.value },
                      }))
                    }
                    className='h-10 rounded-xl'
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleSaveInstituteDetails}
              disabled={savingDetails}
              className='w-full h-11 font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all mt-4 cursor-pointer'
            >
              {savingDetails ? (
                <span className='flex items-center gap-2'>
                  <RefreshCw className='w-4 h-4 animate-spin' />
                  Saving...
                </span>
              ) : (
                'Save Institute Details'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend / Unsuspend Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === 'unsuspend' ? 'Unsuspend Account' : 'Suspend Account'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === 'unsuspend'
                ? `Are you sure you want to unsuspend and reactivate ${actionDialog.school?.name}? Their access will be restored.`
                : `Are you sure you want to suspend ${actionDialog.school?.name}? This will disable their access.`}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <p className='text-sm text-muted-foreground'>
              {actionDialog.action === 'unsuspend'
                ? "This action will restore the school's license status to ACTIVE and grant full access to their dashboard and timetables."
                : "This action will set the school's license status to SUSPENDED and notify the school administrators."}
            </p>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setActionDialog({ open: false, school: null, action: 'suspend' })}>
              Cancel
            </Button>
            {actionDialog.school && (
              <Button
                variant={actionDialog.action === 'unsuspend' ? 'default' : 'destructive'}
                className={actionDialog.action === 'unsuspend' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                onClick={() => handleToggleSuspend(actionDialog.school!.id, actionDialog.action)}
                disabled={processingAction === actionDialog.school.id}
              >
                {processingAction === actionDialog.school.id
                  ? actionDialog.action === 'unsuspend' ? 'Reactivating...' : 'Suspending...'
                  : actionDialog.action === 'unsuspend' ? 'Unsuspend Account' : 'Suspend Account'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}