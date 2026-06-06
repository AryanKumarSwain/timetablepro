'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, KeyRound, ShieldCheck, RefreshCw, X, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return toast.error('Please enter your email address');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Verification token dispatched if profile matches criteria');
      setStep('otp');
    } catch (err: any) {
      toast.error(err.message || 'Error executing request loop initialization');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return toast.error('Enter valid 6-digit code');
    if (!newPassword) return toast.error('Enter a new password layout');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    if (newPassword.length < 8) return toast.error('Password length must clear 8 characters');

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStep('success');
      toast.success('System parameters adjusted. Credential locked.');
    } catch (err: any) {
      toast.error(err.message || 'Verification sequence validation exception');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          {/* Backdrop Closer */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0" 
            onClick={onClose} 
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md overflow-hidden bg-card border border-border/80 shadow-xl rounded-2xl z-10 p-6"
          >
            {/* Close Trigger Button */}
            <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>

            <AnimatePresence mode="wait">
              {/* STEP 1: CAPTURE EMAIL */}
              {step === 'email' && (
                <motion.div key="email-step" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <div className="mb-4 flex items-center gap-2">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500"><KeyRound className="h-5 w-5" /></div>
                    <div>
                      <h3 className="font-bold text-base text-foreground">Recover Credentials</h3>
                      <p className="text-xs text-muted-foreground">Reset access bounds securely</p>
                    </div>
                  </div>
                  <form onSubmit={handleSendCode} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-email" className="text-xs font-bold text-muted-foreground">Account Email Address</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@school.com"
                        className="rounded-xl h-10 text-xs focus-visible:ring-indigo-500"
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-10 font-bold text-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2">
                      {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                      {loading ? 'Processing Validation...' : 'Send Recovery Token Code'}
                    </Button>
                  </form>
                </motion.div>
              )}

              {/* STEP 2: VERIFY CODE AND ASSIGN NEW PASSWORD */}
              {step === 'otp' && (
                <motion.div key="otp-step" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                  <div className="mb-2">
                    <h3 className="font-bold text-base text-foreground font-tracking-tight">Authorize Credential Update</h3>
                    <p className="text-xs text-muted-foreground">Provide code dispatched to <strong>{email}</strong></p>
                  </div>
                  <form onSubmit={handleVerifyAndReset} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-otp" className="text-xs font-bold">6-Digit Verification OTP</Label>
                      <Input
                        id="reset-otp"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="text-center font-mono text-base tracking-widest rounded-xl focus-visible:ring-indigo-500"
                        maxLength={6}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-pass" className="text-xs font-bold">New Matrix Password</Label>
                      <Input id="reset-pass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 8 characters" className="rounded-xl text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reset-confirm" className="text-xs font-bold">Confirm New Matrix Password</Label>
                      <Input id="reset-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Verify characters mapping" className="rounded-xl text-xs" />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button type="button" variant="outline" className="flex-1 rounded-xl text-xs font-bold" onClick={() => setStep('email')}>Back</Button>
                      <Button type="submit" disabled={loading} className="flex-1 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2">
                        {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                        Commit Changes
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* STEP 3: SUCCESS BLOCK VIEW */}
              {step === 'success' && (
                <motion.div key="success-step" initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex flex-col items-center text-center py-4 space-y-3">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-pulse" />
                  <div>
                    <h3 className="font-bold text-base text-foreground">Access RESTORED</h3>
                    <p className="text-xs text-muted-foreground">The account encryption values have rewritten cleanly.</p>
                  </div>
                  <Button onClick={() => { onClose(); setStep('email'); setEmail(''); setOtp(''); }} className="w-full h-10 rounded-xl bg-foreground text-background font-bold text-xs">
                    Proceed to Login
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}