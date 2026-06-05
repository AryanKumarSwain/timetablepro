'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle2, Mail, KeyRound } from 'lucide-react';

// Reusable mock fetch client adapted for your Next.js API endpoints
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

export function SettingsPageContent({ initialUser }: SettingsPageContentProps) {
  const [name, setName] = useState(initialUser?.name ?? '');
  const [phone, setPhone] = useState(initialUser?.phone ?? '');

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

  const profileMutation = useMutation({
    mutationFn: (data: { name?: string; phone?: string }) =>
      fetchClient<UserProfile>('/api/auth/me', { method: 'PATCH', body: data }),
    onSuccess: () => {
      toast.success('Profile configurations successfully updated');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendOtpMutation = useMutation({
    mutationFn: () => fetchClient<{ message: string }>('/api/auth/me/send-otp', { method: 'POST', body: {} }),
    onSuccess: (res) => {
      setStep('otp-sent');
      toast.success(res.message || 'Verification token dispatched successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (data: { otp: string; newPassword: string }) =>
      fetchClient('/api/auth/me/verify-otp', { method: 'POST', body: data }),
    onSuccess: () => {
      setStep('done');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Security entry change complete. Your password is modified.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleProfileSave = () => {
    if (!name.trim()) return toast.error('Name parameter is mandatory');
    profileMutation.mutate({ name: name.trim(), phone: phone.trim() || undefined });
  };

  const handleVerifyOtp = () => {
    if (!otp || otp.length !== 6) return toast.error('Enter valid 6-digit verification sequence');
    if (!newPassword) return toast.error('New secure password text string missing');
    if (newPassword !== confirmPassword) return toast.error('Passwords mismatch verification criteria');
    if (newPassword.length < 8) return toast.error('Password length must safely clear minimum 8 characters requirement');
    verifyOtpMutation.mutate({ otp, newPassword });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Account Info */}
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

      {/* Edit Profile */}
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
              className="rounded-xl border-border/80 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-bold">Telephone Number</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 XXXXX XXXXX"
              className="rounded-xl border-border/80 text-xs"
            />
          </div>
          <Button
            onClick={handleProfileSave}
            disabled={profileMutation.isPending}
            className="w-full rounded-xl text-xs font-bold shadow-md bg-indigo-600 hover:bg-indigo-700 transition-all text-white"
          >
            {profileMutation.isPending ? 'Updating Data Matrices...' : 'Save Updated Dimensions'}
          </Button>
        </CardContent>
      </Card>

      {/* Change Password with OTP */}
      <Card className="border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold tracking-tight">Authentication Update</CardTitle>
          <CardDescription>
            Request secure verification token transmission directly to <strong>{initialUser?.email || 'your email'}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'idle' && (
            <Button
              onClick={() => sendOtpMutation.mutate()}
              disabled={sendOtpMutation.isPending}
              variant="outline"
              className="w-full rounded-xl text-xs font-bold border-border/80 hover:bg-muted/50"
            >
              <Mail className="mr-2 h-4 w-4 text-indigo-500" />
              {sendOtpMutation.isPending ? 'Generating OTP Credentials...' : 'Send Verification OTP'}
            </Button>
          )}

          {step === 'otp-sent' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 px-4 py-3 text-xs text-indigo-600 dark:text-indigo-400">
                <Mail className="h-4 w-4 shrink-0" />
                <span>Verification block dispatched. Review secure inbound digital mailboxes.</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="otp" className="text-xs font-bold">6-Digit OTP Token</Label>
                <Input
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center font-mono text-base tracking-widest rounded-xl"
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
                  className="rounded-xl text-xs"
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
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl text-xs font-bold"
                  onClick={() => { setStep('idle'); setOtp(''); }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={handleVerifyOtp}
                  disabled={verifyOtpMutation.isPending}
                >
                  <KeyRound className="mr-2 h-3.5 w-3.5" />
                  {verifyOtpMutation.isPending ? 'Validating...' : 'Verify & Lock Password'}
                </Button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="font-bold text-sm">Security Profile Shift Complete</p>
              <p className="text-xs text-muted-foreground">The modified credentials have written completely to memory clusters.</p>
              <Button variant="outline" onClick={() => setStep('idle')} className="mt-2 text-xs rounded-xl">
                Reset Form State
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}