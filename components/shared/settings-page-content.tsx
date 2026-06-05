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
import { CheckCircle2, Mail, KeyRound, RefreshCw } from 'lucide-react';

// Reusable fetch client
async function fetchClient<T>(url: string, { method = 'GET', body }: { method?: string; body?: any } = {}): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Something went wrong processing data configurations');
  }
  return res.json();
}

type PasswordStep = 'idle' | 'otp-sent' | 'done';

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

// Stagger variants for entry cards animation
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

// Form transition animations
const stepVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
};

export function SettingsPageContent({ initialUser }: SettingsPageContentProps) {
  const [name, setName] = useState(initialUser?.name ?? '');
  const [phone, setPhone] = useState(initialUser?.phone ?? '');

  // Manual loading states replacing react-query mutations
  const [profilePending, setProfilePending] = useState(false);
  const [sendOtpPending, setSendOtpPending] = useState(false);
  const [verifyOtpPending, setVerifyOtpPending] = useState(false);

  const [step, setStep] = useState<PasswordStep>('idle');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (initialUser) {
      setName(initialUser.name || '');
      setPhone(initialUser.phone || '');
    }
  }, [initialUser]);

  // 1. Manual Profile Update Function
  const handleProfileSave = async () => {
    if (!name.trim()) return toast.error('Name parameter is mandatory');
    
    setProfilePending(true);
    try {
      await fetchClient<UserProfile>('/api/auth/me', { 
        method: 'PATCH', 
        body: { name: name.trim(), phone: phone.trim() || undefined } 
      });
      toast.success('Profile configurations successfully updated');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (e: any) {
      toast.error(e.message || 'Failed saving updated matrix adjustments');
    } finally {
      setProfilePending(false);
    }
  };

  // 2. Manual Send OTP Function
  const handleSendOtp = async () => {
    setSendOtpPending(true);
    try {
      const res = await fetchClient<{ message: string }>('/api/auth/me/send-otp', { 
        method: 'POST', 
        body: {} 
      });
      setStep('otp-sent');
      toast.success(res.message || 'Verification token dispatched successfully');
    } catch (e: any) {
      toast.error(e.message || 'Failed routing security sequence validation token');
    } finally {
      setSendOtpPending(false);
    }
  };

  // 3. Manual Verify OTP Function
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) return toast.error('Enter valid 6-digit verification sequence');
    if (!newPassword) return toast.error('New secure password text string missing');
    if (newPassword !== confirmPassword) return toast.error('Passwords mismatch verification criteria');
    if (newPassword.length < 8) return toast.error('Password length must safely clear minimum 8 characters requirement');
    
    setVerifyOtpPending(true);
    try {
      await fetchClient('/api/auth/me/verify-otp', { 
        method: 'POST', 
        body: { otp, newPassword } 
      });
      setStep('done');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Security entry change complete. Your password is modified.');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setVerifyOtpPending(false);
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-2xl space-y-6"
    >
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

      {/* Edit Profile */}
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
                className="rounded-xl border-border/80 text-xs transition-colors focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-bold">Telephone Number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="rounded-xl border-border/80 text-xs transition-colors focus-visible:ring-indigo-500"
              />
            </div>
            <Button
              onClick={handleProfileSave}
              disabled={profilePending}
              className="w-full rounded-xl text-xs font-bold shadow-md bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] transition-all text-white flex items-center justify-center gap-2"
            >
              {profilePending && <RefreshCw className="h-3 w-3 animate-spin" />}
              {profilePending ? 'Updating Data Matrices...' : 'Save Updated Dimensions'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Change Password with OTP */}
      <motion.div variants={cardVariants}>
        <Card className="border border-border/60 shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold tracking-tight">Authentication Update</CardTitle>
            <CardDescription>
              Request secure verification token transmission directly to <strong>{initialUser?.email || 'your email'}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <AnimatePresence mode="wait" initial={false}>
              {step === 'idle' && (
                <motion.div
                  key="idle-step"
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <Button
                    onClick={handleSendOtp}
                    disabled={sendOtpPending}
                    variant="outline"
                    className="w-full rounded-xl text-xs font-bold border-border/80 hover:bg-muted/50 active:scale-[0.99] transition-all"
                  >
                    <Mail className={`mr-2 h-4 w-4 text-indigo-500 ${sendOtpPending ? 'animate-pulse' : ''}`} />
                    {sendOtpPending ? 'Generating OTP Credentials...' : 'Send Verification OTP'}
                  </Button>
                </motion.div>
              )}

              {step === 'otp-sent' && (
                <motion.div
                  key="otp-step"
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-4 py-3 text-xs text-indigo-600 dark:text-indigo-400">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0" />
                      <span>Verification block dispatched.</span>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendOtpPending}
                      className="text-xs font-black underline uppercase tracking-wider text-indigo-700 hover:text-indigo-800 disabled:opacity-50 flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className={`h-3 w-3 ${sendOtpPending ? 'animate-spin' : ''}`} />
                      {sendOtpPending ? 'Resending...' : 'Resend OTP'}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="otp" className="text-xs font-bold">6-Digit OTP Token</Label>
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
                    <Label htmlFor="newPassword" className="text-xs font-bold">Target Secure Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters length"
                      className="rounded-xl text-xs focus-visible:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword" className="text-xs font-bold">Verify Entry Sequence</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Match target system password exactly"
                      className="rounded-xl text-xs focus-visible:ring-indigo-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl text-xs font-bold active:scale-[0.99] transition-all"
                      onClick={() => { setStep('idle'); setOtp(''); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                      onClick={handleVerifyOtp}
                      disabled={verifyOtpPending}
                    >
                      {verifyOtpPending ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <KeyRound className="h-3.5 w-3.5" />
                      )}
                      {verifyOtpPending ? 'Validating...' : 'Verify & Lock Password'}
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 'done' && (
                <motion.div
                  key="done-step"
                  variants={stepVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex flex-col items-center gap-2 py-4 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, transition: { type: 'spring', stiffness: 400, damping: 15 } }}
                  >
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </motion.div>
                  <p className="font-bold text-sm">Security Profile Shift Complete</p>
                  <p className="text-xs text-muted-foreground">The modified credentials have written completely to memory clusters.</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('idle')} 
                    className="mt-2 text-xs rounded-xl active:scale-[0.99] transition-all"
                  >
                    Reset Form State
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