'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { KeyRound, RefreshCw, ShieldCheck, Mail, CheckCircle2 } from 'lucide-react';

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
}

interface SettingsPageContentProps {
  initialUser: UserProfile | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const stepVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
};

export function SettingsPageContent({ initialUser }: SettingsPageContentProps) {
  const isTeacher = initialUser?.role?.toLowerCase() === 'teacher';

  const [name, setName] = useState(initialUser?.name ?? '');
  const [phone, setPhone] = useState(initialUser?.phone ?? '');

  // Operation Pendings
  const [profilePending, setProfilePending] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [sendOtpPending, setSendOtpPending] = useState(false);

  // Flow State for Teachers
  const [otpStep, setOtpStep] = useState<'idle' | 'sent' | 'done'>('idle');

  // Fields State
  const [otp, setOtp] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (initialUser) {
      setName(initialUser.name || '');
      setPhone(initialUser.phone || '');
    }
  }, [initialUser]);

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
      {/* Account Info */}
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

      {/* Edit Profile Info */}
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
            <Button
              onClick={handleProfileSave}
              disabled={profilePending}
              className="w-full rounded-xl text-xs font-bold shadow-md bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 transition-all"
            >
              {profilePending && <RefreshCw className="h-3 w-3 animate-spin" />}
              {profilePending ? 'Updating Data Matrices...' : 'Save Updated Dimensions'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dynamic Authentication Context Card */}
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
                      <Button
                        type="submit"
                        disabled={passwordPending}
                        className="w-full rounded-xl text-xs font-bold shadow-md bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 transition-all"
                      >
                        {passwordPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                        Save New Password
                      </Button>
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
                    <Button type="submit" disabled={passwordPending} className="flex-1 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 transition-all">
                      {passwordPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      Verify & Lock Changes
                    </Button>
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
    </motion.div>
  );
}