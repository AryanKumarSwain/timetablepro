'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, RefreshCw, MoreHorizontal, Ban, CheckCircle, Building2, Crown, Users } from 'lucide-react';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'custom' | 'suspended'>('all');
  const [actionDialog, setActionDialog] = useState<{ open: boolean; school: PlatformSchoolRow | null; action: 'suspend' | 'unsuspend' }>({ open: false, school: null, action: 'suspend' });
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Institute details edit dialog
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    school: PlatformSchoolRow | null;
    form: {
      name: string;
      type: string;
      state: string;
      city: string;
      country: string;
      studentsRange: string;
      facultyRange: string;
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
      type: '',
      state: '',
      city: '',
      country: 'India',
      studentsRange: '',
      facultyRange: '',
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
        type: school.type || '',
        state: school.state || '',
        city: school.city || '',
        country: school.country || 'India',
        studentsRange: school.studentsRange || '',
        facultyRange: school.facultyRange || '',
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
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (typeof school.name === 'string' && school.name.toLowerCase().includes(q)) ||
      (school.adminEmails && school.adminEmails.some((email) => email.toLowerCase().includes(q))) ||
      (school.isCustomPlan && 'custom plan enterprise'.includes(q));
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && school.licenseStatus?.toLowerCase() === 'active') ||
      (statusFilter === 'trial' && school.licenseStatus?.toLowerCase() === 'trial') ||
      (statusFilter === 'custom' && Boolean(school.isCustomPlan)) ||
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
                placeholder='Search schools or plan...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-9'
              />
            </div>
            <div className='flex gap-1 border border-border/50 rounded-lg p-1 bg-muted/20'>
              {(['all', 'active', 'trial', 'custom', 'suspended'] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'secondary' : 'ghost'}
                  size='sm'
                  onClick={() => setStatusFilter(status)}
                  className='capitalize text-xs h-7 px-2.5'
                >
                  {status === 'custom' ? 'Custom Plan' : status}
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
                        <td className='p-3'>
                          {school.isCustomPlan ? (
                            <div className='space-y-1'>
                              <div className='flex items-center gap-1.5 flex-wrap'>
                                <Badge className='bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs'>
                                  <Crown className='w-3 h-3 text-amber-600 dark:text-amber-400' />
                                  Custom Plan
                                </Badge>
                                {school.customTeacherLimit && (
                                  <span className='text-xs font-semibold text-slate-800 dark:text-slate-200'>
                                    {school.customTeacherLimit} Teachers
                                  </span>
                                )}
                              </div>
                              {school.customPriceMonthly !== null && school.customPriceMonthly !== undefined ? (
                                <div className='text-xs leading-tight space-y-0.5'>
                                  <p className='font-bold text-emerald-600 dark:text-emerald-400'>
                                    ₹{school.customPriceMonthly.toLocaleString('en-IN')}/mo
                                    {school.customPriceYearly && (
                                      <span className='text-slate-500 dark:text-slate-400 font-normal'>
                                        {' '}· ₹{school.customPriceYearly.toLocaleString('en-IN')}/yr
                                      </span>
                                    )}
                                  </p>
                                  <p className='text-[10px] text-muted-foreground'>
                                    +18% GST ({school.customBillingCycle === 'annual' ? 'Annual cycle' : 'Monthly cycle'})
                                  </p>
                                </div>
                              ) : (
                                <span className='text-xs text-muted-foreground'>{school.planName}</span>
                              )}
                            </div>
                          ) : (
                            <span className='font-medium text-slate-800 dark:text-slate-200'>
                              {typeof school.planName === 'string' ? school.planName : '-'}
                            </span>
                          )}
                        </td>
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
        <DialogContent className='sm:max-w-lg p-6 rounded-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader className='space-y-1.5'>
            <div className='flex items-center gap-2'>
              <div className='w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600'>
                <Building2 className='w-4 h-4' />
              </div>
              <DialogTitle className='text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2'>
                Institute Details
                <Badge variant='outline' className='text-[10px] font-normal text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'>
                  Read-only
                </Badge>
              </DialogTitle>
            </div>
            <DialogDescription className='text-xs text-muted-foreground'>
              View school's signup information and contact details
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2'>
            {editDialog.school?.isCustomPlan && (
              <div className='p-3.5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Crown className='w-4 h-4 text-amber-600 dark:text-amber-400' />
                    <span className='text-xs font-bold text-amber-900 dark:text-amber-200'>
                      Custom Enterprise Plan
                    </span>
                  </div>
                  <Badge className='bg-amber-600 text-white text-[10px] font-bold'>
                    {editDialog.school.customTeacherLimit || 101} Teachers
                  </Badge>
                </div>
                {editDialog.school.customPriceMonthly !== null && editDialog.school.customPriceMonthly !== undefined && (
                  <p className='text-xs text-amber-800 dark:text-amber-300 font-medium'>
                    Pricing: ₹{editDialog.school.customPriceMonthly.toLocaleString('en-IN')}/mo
                    {editDialog.school.customPriceYearly && (
                      <span> · ₹{editDialog.school.customPriceYearly.toLocaleString('en-IN')}/yr</span>
                    )}
                    {' '}<span className='text-[10px] text-amber-700/80 dark:text-amber-400/80'>(+18% GST)</span>
                  </p>
                )}
              </div>
            )}

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                Institute Name
              </Label>
              <Input
                readOnly
                placeholder='Institute Name'
                value={editDialog.form.name || '—'}
                className='h-10 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-default focus-visible:ring-0'
              />
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                  Institute Type
                </Label>
                <Input
                  readOnly
                  placeholder='Institute Type'
                  value={editDialog.form.type || '—'}
                  className='h-10 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-default focus-visible:ring-0'
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                  Country
                </Label>
                <Input
                  readOnly
                  placeholder='Country'
                  value={editDialog.form.country || '—'}
                  className='h-10 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-default focus-visible:ring-0'
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                Address
              </Label>
              <Input
                readOnly
                placeholder='Address'
                value={editDialog.form.address || '—'}
                className='h-10 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-default focus-visible:ring-0'
              />
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                State
              </Label>
              <Input
                readOnly
                placeholder='State'
                value={editDialog.form.state || '—'}
                className='h-10 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-default focus-visible:ring-0'
              />
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                City
              </Label>
              <Input
                readOnly
                placeholder='City'
                value={editDialog.form.city || '—'}
                className='h-10 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-default focus-visible:ring-0'
              />
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                    No. of Faculty
                  </Label>
                  {editDialog.school?.teacherCount !== undefined && (
                    <span className='text-[10px] text-muted-foreground font-medium flex items-center gap-1'>
                      <Users className='w-3 h-3' /> {editDialog.school.teacherCount} Registered
                    </span>
                  )}
                </div>
                <Input
                  readOnly
                  placeholder='Faculty'
                  value={editDialog.form.facultyRange ? `${editDialog.form.facultyRange} Faculty` : '—'}
                  className='h-10 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-default focus-visible:ring-0'
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                  No. of Students
                </Label>
                <Input
                  readOnly
                  placeholder='Students'
                  value={editDialog.form.studentsRange ? `${editDialog.form.studentsRange} Students` : '—'}
                  className='h-10 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-default focus-visible:ring-0'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                  Phone Number
                </Label>
                <Input
                  readOnly
                  placeholder='Phone Number'
                  value={editDialog.form.phone || '—'}
                  className='h-10 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-default focus-visible:ring-0'
                />
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                  Email Address
                </Label>
                <Input
                  readOnly
                  placeholder='Email Address'
                  value={editDialog.form.email || '—'}
                  className='h-10 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-default focus-visible:ring-0'
                />
              </div>
            </div>

            <div className='pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3'>
              <p className='text-xs font-bold text-slate-700 dark:text-slate-300'>Social Media & Web Links</p>
              
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                  Website / Web Portal
                </Label>
                <Input
                  readOnly
                  placeholder='Website'
                  value={editDialog.form.website || '—'}
                  className='h-10 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-default focus-visible:ring-0'
                />
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                    Instagram
                  </Label>
                  <Input
                    readOnly
                    placeholder='Instagram'
                    value={editDialog.form.instagram || '—'}
                    className='h-10 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-default focus-visible:ring-0'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                    Facebook
                  </Label>
                  <Input
                    readOnly
                    placeholder='Facebook'
                    value={editDialog.form.facebook || '—'}
                    className='h-10 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-default focus-visible:ring-0'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                    LinkedIn
                  </Label>
                  <Input
                    readOnly
                    placeholder='LinkedIn'
                    value={editDialog.form.linkedin || '—'}
                    className='h-10 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-default focus-visible:ring-0'
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold text-slate-700 dark:text-slate-300'>
                    Twitter / X
                  </Label>
                  <Input
                    readOnly
                    placeholder='Twitter / X'
                    value={editDialog.form.twitter || '—'}
                    className='h-10 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 cursor-default focus-visible:ring-0'
                  />
                </div>
              </div>
            </div>

            <Button
              type='button'
              variant='outline'
              onClick={() => setEditDialog((prev) => ({ ...prev, open: false }))}
              className='w-full h-11 font-semibold rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm transition-all mt-4 cursor-pointer'
            >
              Close
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