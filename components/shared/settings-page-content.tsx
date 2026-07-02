'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { KeyRound, RefreshCw, ShieldCheck, Mail, CheckCircle2, Building2, Plus, Trash2, Sun, Moon } from 'lucide-react';
import { PlanButton } from '@/components/ui/plan-button';

async function fetchClient<T>(url: string, { method = 'GET', body }: { method?: string; body?: any } = {}): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Something went wrong processing configurations');
  }
  return res.json();
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  schoolId?: string;
  leaveRequestStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface AdminLeaveRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  requestedAt: string;
  reason?: string | null;
}

interface SettingsPageContentProps {
  initialUser: UserProfile | null;
  activeTab?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const stepVariants: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
};

export function SettingsPageContent({ initialUser, activeTab }: SettingsPageContentProps) {
  const isTeacher = initialUser?.role?.toLowerCase() === 'teacher';
  const showLeaveRequestsTab = !isTeacher && activeTab === 'leave-requests';
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [name, setName] = useState(initialUser?.name ?? '');
  const [phone, setPhone] = useState(initialUser?.phone ?? '');
  const [instituteName, setInstituteName] = useState('');

  const [pendingLeaveRequests, setPendingLeaveRequests] = useState<AdminLeaveRequest[]>([]);
  const [leaveRequestsLoading, setLeaveRequestsLoading] = useState(false);
  const [leaveRequestActionIds, setLeaveRequestActionIds] = useState<string[]>([]);

  // Operation Pendings
  const [profilePending, setProfilePending] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [sendOtpPending, setSendOtpPending] = useState(false);
  const [institutePending, setInstitutePending] = useState(false);

  // Flow State for Teachers
  const [otpStep, setOtpStep] = useState<'idle' | 'sent' | 'done'>('idle');

  // Fields State
  const [otp, setOtp] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [leaveRequestStatus, setLeaveRequestStatus] = useState<'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'>(initialUser?.leaveRequestStatus ?? 'NONE');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveRequestPending, setLeaveRequestPending] = useState(false);
  const [leaveRequestError, setLeaveRequestError] = useState<string | null>(null);

  // Institute Details State
  const [instituteDetails, setInstituteDetails] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    logo: '',
  });
  const [instituteDetailsPending, setInstituteDetailsPending] = useState(false);


  // Substitution Settings State
  const [leaveReasons, setLeaveReasons] = useState<string[]>([]);
  const [newLeaveReason, setNewLeaveReason] = useState('');
  const [leaveReasonsPending, setLeaveReasonsPending] = useState(false);

  useEffect(() => {
    if (initialUser) {
      setName(initialUser.name || '');
      setPhone(initialUser.phone || '');
      setLeaveRequestStatus(initialUser.leaveRequestStatus ?? 'NONE');
    }
  }, [initialUser]);

  useEffect(() => {
    if (initialUser?.schoolId && !isTeacher) {
      fetchInstituteName();
    }
  }, [initialUser?.schoolId, isTeacher]);

  useEffect(() => {
    if (!isTeacher) {
      fetchLeaveRequests();
    }
  }, [isTeacher]);

  useEffect(() => {
    if (showLeaveRequestsTab) {
      document.getElementById('leave-requests-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showLeaveRequestsTab]);

  // Load institute details when institute tab is active
  useEffect(() => {
    if (activeTab === 'institute' && !isTeacher) {
      fetchInstituteDetails();
    }
  }, [activeTab, isTeacher]);


  // Load leave reasons when leave-reasons tab is active
  useEffect(() => {
    if (activeTab === 'leave-reasons' && !isTeacher) {
      fetchLeaveReasons();
    }
  }, [activeTab, isTeacher]);

  const fetchInstituteDetails = async () => {
    try {
      const res = await fetch('/api/admin/school');
      if (res.ok) {
        const data = await res.json();
        setInstituteDetails({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          logo: data.logo || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch institute details:', error);
    }
  };


  const fetchLeaveReasons = async () => {
    try {
      const res = await fetch('/api/admin/substitution/leave-reasons');
      if (res.ok) {
        const data = await res.json();
        setLeaveReasons(data.reasons || []);
      }
    } catch (error) {
      console.error('Failed to fetch reasons:', error);
    }
  };

  const fetchInstituteName = async () => {
    try {
      const res = await fetch('/api/admin/school');
      if (res.ok) {
        const data = await res.json();
        setInstituteName(data.name || '');
      }
    } catch (error) {
      console.error('Failed to fetch institute name:', error);
    }
  };

  const fetchLeaveRequests = async () => {
    setLeaveRequestsLoading(true);
    try {
      const res = await fetch('/api/admin/leave-requests');
      if (res.ok) {
        const data = await res.json();
        setPendingLeaveRequests(data.data || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Failed to fetch departure requests:', errData);
      }
    } catch (error) {
      console.error('Failed to fetch departure requests:', error);
    } finally {
      setLeaveRequestsLoading(false);
    }
  };

  const handleLeaveRequestAction = async (id: string, action: 'approve' | 'reject') => {
    if (leaveRequestActionIds.includes(id)) return;
    setLeaveRequestActionIds((prev) => [...prev, id]);

    try {
      const res = await fetch(`/api/admin/leave-requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Unable to process departure request');
      }

      toast.success(`Departure request ${action === 'approve' ? 'approved' : 'declined'} successfully`);
      await fetchLeaveRequests();
    } catch (e: any) {
      toast.error(e.message || 'Failed processing departure request');
    } finally {
      setLeaveRequestActionIds((prev) => prev.filter((leaveId) => leaveId !== id));
    }
  };

  const handleProfileSave = async () => {
    if (!name.trim()) return toast.error('Name parameter is mandatory');

    setProfilePending(true);
    try {
      await fetchClient<UserProfile>('/api/auth/me', {
        method: 'PATCH',
        body: { name: name.trim(), phone: phone.trim() || undefined }
      });
      toast.success('Profile configurations successfully updated');
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error(e.message || 'Failed saving profile info');
    } finally {
      setProfilePending(false);
    }
  };

  const handleInstituteNameSave = async () => {
    if (!instituteName.trim()) return toast.error('Institute name is required');

    setInstitutePending(true);
    try {
      await fetchClient('/api/admin/school', {
        method: 'PATCH',
        body: { name: instituteName.trim() }
      });
      toast.success('Institute name updated successfully');
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update institute name');
    } finally {
      setInstitutePending(false);
    }
  };

  const handleInstituteDetailsSave = async () => {
    if (!instituteDetails.name.trim()) return toast.error('Institute name is required');

    setInstituteDetailsPending(true);
    try {
      await fetchClient('/api/admin/school', {
        method: 'PATCH',
        body: {
          name: instituteDetails.name.trim(),
          address: instituteDetails.address.trim() || undefined,
          phone: instituteDetails.phone.trim() || undefined,
          email: instituteDetails.email.trim() || undefined,
          logo: instituteDetails.logo.trim() || undefined,
        }
      });
      toast.success('Institute details updated successfully');
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update institute details');
    } finally {
      setInstituteDetailsPending(false);
    }
  };


  const handleAddLeaveReason = async () => {
    if (!newLeaveReason.trim()) return toast.error('Reason is required');
    if (leaveReasons.includes(newLeaveReason.trim())) return toast.error('Reason already exists');

    setLeaveReasonsPending(true);
    try {
      await fetchClient('/api/admin/substitution/leave-reasons', {
        method: 'POST',
        body: { reason: newLeaveReason.trim() }
      });
      setLeaveReasons(prev => [...prev, newLeaveReason.trim()]);
      setNewLeaveReason('');
      toast.success('Reason added successfully');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add reason');
    } finally {
      setLeaveReasonsPending(false);
    }
  };

  const handleDeleteLeaveReason = async (reason: string) => {
    setLeaveReasonsPending(true);
    try {
      await fetchClient('/api/admin/substitution/leave-reasons', {
        method: 'DELETE',
        body: { reason }
      });
      setLeaveReasons(prev => prev.filter(r => r !== reason));
      toast.success('Reason deleted successfully');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete reason');
    } finally {
      setLeaveReasonsPending(false);
    }
  };

  const handleLeaveRequest = async () => {
    if (leaveRequestStatus === 'PENDING') {
      return toast.info('You already have a pending departure request.');
    }

    setLeaveRequestPending(true);
    setLeaveRequestError(null);
    try {
      await fetchClient('/api/teacher/leave-request', {
        method: 'POST',
        body: { reason: leaveReason.trim() || undefined },
      });
      setLeaveRequestStatus('PENDING');
      setLeaveRequestError(null);
      toast.success('Departure request submitted. Your school admin will review it shortly.');
    } catch (e: any) {
      setLeaveRequestError(e.message || 'Failed submitting departure request');
      toast.error(e.message || 'Failed submitting departure request');
    } finally {
      setLeaveRequestPending(false);
    }
  };

  // Triggered for Teachers to acquire Code
  const handleSendOtp = async () => {
    setSendOtpPending(true);
    try {
      const res = await fetchClient<{ message: string }>('/api/auth/me/send-otp', { method: 'POST' });
      setOtpStep('sent');
      toast.success(res.message || 'Verification token sent.');
    } catch (e: any) {
      toast.error(e.message || 'Failed generating verification code.');
    } finally {
      setSendOtpPending(false);
    }
  };

  // Unified execution trigger mapping flows conditionally
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return toast.error('New password string missing');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters long');

    if (!isTeacher && !oldPassword) {
      return toast.error('Current password is required for Admin modifications');
    }
    if (isTeacher && (!otp || otp.length !== 6)) {
      return toast.error('Please supply your valid 6-digit OTP code');
    }

    setPasswordPending(true);
    try {
      await fetchClient('/api/auth/me', {
        method: 'PATCH',
        body: {
          name: name.trim(),
          phone: phone.trim() || undefined,
          newPassword,
          oldPassword: !isTeacher ? oldPassword : undefined,
          otp: isTeacher ? otp : undefined
        }
      });
      
      toast.success('Security password update successful');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtp('');
      if (isTeacher) setOtpStep('done');
    } catch (e: any) {
      toast.error(e.message || 'Failed setting custom verification attributes');
    } finally {
      setPasswordPending(false);
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="mx-auto max-w-2xl space-y-6">
      {/* Theme Toggle */}
      {(activeTab === 'profile' || !activeTab) && (
        <motion.div variants={cardVariants}>
          <Card className="border border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold tracking-tight">Appearance</CardTitle>
              <CardDescription>Customize your visual experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
                <div className="flex items-center gap-3">
                  {mounted && (
                    <>
                      <Sun className="h-4 w-4 text-foreground rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="h-4 w-4 text-foreground absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-foreground">Theme Mode</p>
                    <p className="text-xs text-muted-foreground">Switch between light and dark appearance</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="rounded-xl"
                >
                  {mounted && (theme === 'dark' ? 'Light' : 'Dark')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Account Info */}
      {activeTab === 'profile' && (
        <motion.div variants={cardVariants}>
          <Card className="border border-border/60 shadow-sm backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-lg font-bold tracking-tight">Account Overview</CardTitle>
              <CardDescription>Your registered administrative profile assignments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email Address</span>
                <span className="font-semibold text-foreground">{initialUser?.email || 'N/A'}</span>
              </div>
              <Separator className="bg-border/40" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Functional Assignment Role</span>
                <Badge variant="secondary" className="uppercase text-[10px] tracking-wide font-bold">
                  {initialUser?.role || 'user'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Leave Requests Panel (Admin Only) */}
      {!isTeacher && activeTab === 'leave-requests' && (
        <motion.div
          variants={cardVariants}
          id="leave-requests-panel"
          className={showLeaveRequestsTab ? 'rounded-3xl ring-2 ring-indigo-500/30 shadow-xl' : ''}
        >
          <Card className="border border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-500" />
                  <div>
                    <CardTitle className="text-lg font-bold tracking-tight">Left Requests</CardTitle>
                    <CardDescription>Review and approve pending left requests.</CardDescription>
                  </div>
                </div>
                {showLeaveRequestsTab && (
                  <Badge variant="secondary" className="uppercase text-[10px] font-bold">
                    Focused tab
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {leaveRequestsLoading ? (
                <div className="rounded-xl border border-border/60 bg-muted/80 p-4 text-center text-sm text-muted-foreground">
                  Loading pending Left requests…
                </div>
              ) : pendingLeaveRequests.length === 0 ? (
                <div className="rounded-xl border border-border/60 bg-muted/80 p-4 text-center text-sm text-muted-foreground">
                  No pending Left requests found.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingLeaveRequests.map((request) => {
                    const isProcessing = leaveRequestActionIds.includes(request.id);
                    return (
                      <div key={request.id} className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{request.teacherName}</p>
                              <p className="text-xs text-muted-foreground">{request.teacherEmail}</p>
                            </div>
                            <Badge variant="secondary" className="uppercase text-[10px] font-bold">
                              Pending
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Requested at: {new Date(request.requestedAt).toLocaleString()}</p>
                          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-[12px] text-muted-foreground">
                            {request.reason || 'No reason supplied.'}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Button
                              onClick={() => void handleLeaveRequestAction(request.id, 'approve')}
                              disabled={isProcessing}
                              className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              {isProcessing ? 'Processing…' : 'Yes'}
                            </Button>
                            <Button
                              onClick={() => void handleLeaveRequestAction(request.id, 'reject')}
                              disabled={isProcessing}
                              variant="outline"
                              className="w-full rounded-xl"
                            >
                              {isProcessing ? 'Processing…' : 'No'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Institute Name Settings (Admin Only) */}

      {/* Edit Profile Info */}
      {(activeTab === 'profile' || !activeTab) && (
        <motion.div variants={cardVariants}>
          <Card className="border border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold tracking-tight">Modify Parameters</CardTitle>
              <CardDescription>Update identity keys and communication links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold">Full Identity Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g., Dr. Rajesh Kumar"
                  className="rounded-xl border-border/80 text-xs focus-visible:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-bold">Telephone Number</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                  className="rounded-xl border-border/80 text-xs focus-visible:ring-indigo-500"
                />
              </div>
              <PlanButton
                onClick={handleProfileSave}
                disabled={profilePending}
                variant="primary"
                className="w-full rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all"
              >
                {profilePending && <RefreshCw className="h-3 w-3 animate-spin" />}
                {profilePending ? 'Updating Data Matrices...' : 'Save Updated Dimensions'}
              </PlanButton>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Teacher Leave Request */}
      {isTeacher && (activeTab === 'profile' || !activeTab) && (
        <motion.div variants={cardVariants}>
          <Card className="border border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-500" />
                <CardTitle className="text-lg font-bold tracking-tight">Left Request</CardTitle>
              </div>
              <CardDescription>Submit a left request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Current Status</span>
                  <Badge 
                    variant={leaveRequestStatus === 'PENDING' ? 'secondary' : leaveRequestStatus === 'APPROVED' ? 'default' : leaveRequestStatus === 'REJECTED' ? 'destructive' : 'outline'}
                    className="uppercase text-[10px] font-bold"
                  >
                    {leaveRequestStatus}
                  </Badge>
                </div>
              </div>
              
              {leaveRequestStatus === 'NONE' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="leaveReason" className="text-xs font-bold">Reason for Departure (Optional)</Label>
                    <Textarea
                      id="leaveReason"
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder="Please provide a reason for your departure request..."
                      className="rounded-xl border-border/80 text-xs focus-visible:ring-indigo-500"
                      rows={3}
                    />
                  </div>
                  {leaveRequestError && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center">
                      <p className="text-xs text-red-600 dark:text-red-400">{leaveRequestError}</p>
                    </div>
                  )}
                  <PlanButton
                    onClick={handleLeaveRequest}
                    disabled={leaveRequestPending}
                    variant="primary"
                    className="w-full rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    {leaveRequestPending && <RefreshCw className="h-3 w-3 animate-spin" />}
                    {leaveRequestPending ? 'Submitting Request...' : 'Submit Departure Request'}
                  </PlanButton>
                </>
              )}
              
              {leaveRequestStatus === 'PENDING' && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Your departure request is pending review by the school administrator.</p>
                </div>
              )}
              
              {leaveRequestStatus === 'APPROVED' && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">Your departure request has been approved. You can now join a new school.</p>
                </div>
              )}
              
              {leaveRequestStatus === 'REJECTED' && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
                  <p className="text-sm text-red-600 dark:text-red-400">Your departure request was declined by the administrator.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Institute Details Tab */}
      {activeTab === 'institute' && !isTeacher && (
        <motion.div variants={cardVariants}>
          <Card className="border border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-500" />
                <CardTitle className="text-lg font-bold tracking-tight">Institute Details</CardTitle>
              </div>
              <CardDescription>Manage your school's information and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="instituteName" className="text-xs font-bold">Institute Name</Label>
                <Input
                  id="instituteName"
                  value={instituteDetails.name}
                  onChange={(e) => setInstituteDetails(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="E.g., Delhi Public School"
                  className="rounded-xl border-border/80 text-xs focus-visible:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="instituteAddress" className="text-xs font-bold">Address</Label>
                <Textarea
                  id="instituteAddress"
                  value={instituteDetails.address}
                  onChange={(e) => setInstituteDetails(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full institute address"
                  className="rounded-xl border-border/80 text-xs focus-visible:ring-indigo-500"
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="institutePhone" className="text-xs font-bold">Phone Number</Label>
                <Input
                  id="institutePhone"
                  value={instituteDetails.phone}
                  onChange={(e) => setInstituteDetails(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 XXXXX XXXXX"
                  className="rounded-xl border-border/80 text-xs focus-visible:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="instituteEmail" className="text-xs font-bold">Email Address</Label>
                <Input
                  id="instituteEmail"
                  value={instituteDetails.email}
                  onChange={(e) => setInstituteDetails(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@school.edu"
                  className="rounded-xl border-border/80 text-xs focus-visible:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="instituteLogo" className="text-xs font-bold">Logo URL</Label>
                <Input
                  id="instituteLogo"
                  value={instituteDetails.logo}
                  onChange={(e) => setInstituteDetails(prev => ({ ...prev, logo: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                  className="rounded-xl border-border/80 text-xs focus-visible:ring-indigo-500"
                />
              </div>
              <PlanButton
                onClick={handleInstituteDetailsSave}
                disabled={instituteDetailsPending}
                variant="primary"
                className="w-full rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all"
              >
                {instituteDetailsPending && <RefreshCw className="h-3 w-3 animate-spin" />}
                {instituteDetailsPending ? 'Updating Institute Details...' : 'Save Institute Details'}
              </PlanButton>
            </CardContent>
          </Card>
        </motion.div>
      )}


      {/* Leave Reasons Settings Tab */}
      {activeTab === 'leave-reasons' && !isTeacher && (
        <motion.div variants={cardVariants}>
          <Card className="border border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
                <CardTitle className="text-lg font-bold tracking-tight">Leave Reasons</CardTitle>
              </div>
              <CardDescription>Manage reasons for faculty absence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Add New Reason</Label>
                <div className="flex gap-2">
                  <Input
                    value={newLeaveReason}
                    onChange={(e) => setNewLeaveReason(e.target.value)}
                    placeholder="E.g., Medical Leave, Personal Emergency"
                    className="rounded-xl border-border/80 text-xs focus-visible:ring-indigo-500"
                  />
                  <PlanButton
                    onClick={handleAddLeaveReason}
                    disabled={leaveReasonsPending || !newLeaveReason.trim()}
                    variant="primary"
                    className="rounded-xl"
                  >
                    <Plus className="h-4 w-4" />
                  </PlanButton>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs font-bold">Existing Reasons</Label>
                {leaveReasons.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No reasons configured yet.</p>
                ) : (
                  <div className="space-y-2">
                    {leaveReasons.map((reason) => (
                      <div key={reason} className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20">
                        <span className="text-xs font-medium text-foreground">{reason}</span>
                        <Button
                          onClick={() => handleDeleteLeaveReason(reason)}
                          disabled={leaveReasonsPending}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Dynamic Authentication Context Card */}
      {(activeTab === 'profile' || !activeTab) && (
        <motion.div variants={cardVariants}>
          <Card className="border border-border/60 shadow-sm overflow-hidden">
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-indigo-500" />
                <CardTitle className="text-lg font-bold tracking-tight">Authentication Update</CardTitle>
              </div>
              <CardDescription>
                {isTeacher 
                  ? `Verification code configuration will dispatch automatically to ${initialUser?.email || 'your email'}.`
                  : 'Direct re-authentication update context for Admin parameters.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait" initial={false}>
                
                {/* FLOW 1: ADMIN FLOW OR INITIAL TEACHER TRIGGER */}
                {(!isTeacher || otpStep === 'idle') && (
                  <motion.form key="direct-password-form" variants={stepVariants} initial="initial" animate="animate" exit="exit" onSubmit={handlePasswordUpdate} className="space-y-4">
                    {!isTeacher && (
                      <div className="space-y-1.5">
                        <Label htmlFor="oldPassword" className="text-xs font-bold">Current Password</Label>
                        <Input
                          id="oldPassword"
                          type="password"
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          placeholder="••••••••"
                          className="rounded-xl border-border/80 text-xs focus-visible:ring-indigo-500"
                        />
                      </div>
                    )}

                    {isTeacher ? (
                      <Button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendOtpPending}
                        variant="outline"
                        className="w-full rounded-xl text-xs font-bold border-border/80 hover:bg-muted/50 transition-all flex items-center justify-center"
                      >
                        <Mail className={`mr-2 h-4 w-4 text-indigo-500 ${sendOtpPending ? 'animate-pulse' : ''}`} />
                        {sendOtpPending ? 'Generating OTP Credentials...' : 'Send Verification OTP Code'}
                      </Button>
                    ) : (
                      <>
                        <Separator className="bg-border/40 my-1" />
                        <div className="space-y-1.5">
                          <Label htmlFor="newPassword" className="text-xs font-bold">New Password</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimum 8 characters"
                            className="rounded-xl text-xs focus-visible:ring-indigo-500"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="confirmPassword" className="text-xs font-bold">Confirm New Password</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Match choice criteria"
                            className="rounded-xl text-xs focus-visible:ring-indigo-500"
                          />
                        </div>
                        <PlanButton
                          type="submit"
                          disabled={passwordPending}
                          variant="primary"
                          className="w-full rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all"
                        >
                          {passwordPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                          Save New Password
                        </PlanButton>
                      </>
                    )}
                  </motion.form>
                )}

                {/* FLOW 2: TEACHER LIVE OTP ENTRY VIEW */}
                {isTeacher && otpStep === 'sent' && (
                  <motion.form key="teacher-otp-form" variants={stepVariants} initial="initial" animate="animate" exit="exit" onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-4 py-2.5 text-xs text-indigo-600 dark:text-indigo-400">
                      <span className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5" /> Code dispatched successfully.
                      </span>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendOtpPending}
                        className="text-xs font-bold underline flex items-center gap-1 hover:opacity-80 transition-opacity"
                      >
                        <RefreshCw className={`h-3 w-3 ${sendOtpPending ? 'animate-spin' : ''}`} /> Resend
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="otp" className="text-xs font-bold">6-Digit Verification Code</Label>
                      <Input
                        id="otp"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="text-center font-mono text-base tracking-widest rounded-xl focus-visible:ring-indigo-500"
                        maxLength={6}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword" className="text-xs font-bold">New Secure Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="rounded-xl text-xs focus-visible:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-xs font-bold">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Verify profile characters choice"
                        className="rounded-xl text-xs focus-visible:ring-indigo-500"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button type="button" variant="outline" className="flex-1 rounded-xl text-xs font-bold" onClick={() => { setOtpStep('idle'); setOtp(''); }}>
                        Cancel
                      </Button>
                      <PlanButton type="submit" disabled={passwordPending} variant="primary" className="flex-1 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all">
                        {passwordPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                        Verify & Lock Changes
                      </PlanButton>
                    </div>
                  </motion.form>
                )}

                {/* FLOW 3: SUCCESS CONFIRMATION DISPLAY */}
                {isTeacher && otpStep === 'done' && (
                  <motion.div key="teacher-success-view" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center gap-2 py-4 text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-bounce" />
                    <p className="font-bold text-sm text-foreground">Password Reset Complete</p>
                    <p className="text-xs text-muted-foreground">Teacher account credentials updated securely.</p>
                    <Button variant="outline" onClick={() => setOtpStep('idle')} className="mt-2 text-xs rounded-xl">
                      Back to settings
                    </Button>
                  </motion.div>
                )}

              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}