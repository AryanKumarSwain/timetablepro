'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Crown, Sparkles, X } from 'lucide-react';
import confetti from 'canvas-confetti'; // 👈 'confetti' kar lijiye ise // Note: Ensure your local path matches your app config
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface ProtectedFeatureProps {
  featureKey: 'reports' | 'attendance' | 'homework' | 'lesson-planning';
  featureName: string;
  isEnabled: boolean;
  children: React.ReactNode;
  schoolId?: string;
  showUpgradeButton?: boolean;
}

export function ProtectedFeature({ 
  featureKey, 
  featureName, 
  isEnabled, 
  children,
  schoolId,
  showUpgradeButton = true,
}: ProtectedFeatureProps) {
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [showGlow, setShowGlow] = useState(false);
  const confettiIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const stopConfettiStream = () => {
    if (confettiIntervalRef.current) {
      clearInterval(confettiIntervalRef.current);
      confettiIntervalRef.current = null;
    }
  };

  const handleSkipAnimation = () => {
    stopConfettiStream();
    setShowUnlockAnimation(false);
    if (schoolId) {
      localStorage.setItem(`feature_unlocked_${featureKey}_${schoolId}`, 'true');
    }
  };

  useEffect(() => {
    if (isEnabled && schoolId) {
      const storageKey = `feature_unlocked_${featureKey}_${schoolId}`;
      const wasPreviouslyUnlocked = localStorage.getItem(storageKey) === 'true';

      if (!wasPreviouslyUnlocked) {
        setShowUnlockAnimation(true);
        setShowGlow(true);

        const end = Date.now() + 3000;
        confettiIntervalRef.current = setInterval(() => {
          if (Date.now() > end) {
            stopConfettiStream();
            return;
          }
          confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.8 },
            colors: ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
          });
          confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.8 },
            colors: ['#10b981', '#f59e0b', '#8b5cf6', '#ec4899']
          });
        }, 50);

        const timer = setTimeout(() => {
          handleSkipAnimation();
        }, 3500);

        const glowTimer = setTimeout(() => {
          setShowGlow(false);
        }, 24 * 60 * 60 * 1000);

        return () => {
          stopConfettiStream();
          clearTimeout(timer);
          clearTimeout(glowTimer);
        };
      }
    }
  }, [isEnabled, featureKey, schoolId]);

  const handleUpgrade = () => {
    router.push('/admin/upgrade');
  };

  // ✨ 1. LOCKED STATE VIEW - REFACTORED FOR PERFECT BLENDING
  if (!isEnabled) {
    return (
      <div className="relative w-full rounded-2xl border border-slate-200/60 bg-slate-50/30 p-6 min-h-[400px] flex items-center justify-center overflow-hidden shadow-sm">
        
        {/* Background Content - Highly blurred and integrated */}
        <div className="absolute inset-0 backdrop-blur-[6px] grayscale opacity-20 pointer-events-none select-none p-6 filter blur-[2px]">
          {children}
        </div>

        {/* Dynamic Center Lock Box (Image 2 Aesthetic) */}
        <div className="relative z-10 w-full max-w-md mx-auto p-8 rounded-2xl border border-white/60 bg-white/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)] backdrop-blur-md text-center">
          <div className="flex flex-col items-center justify-center mb-5">
            <motion.div 
              className="p-3 bg-rose-50 text-rose-500 rounded-full border border-rose-100 shadow-sm"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Lock className="h-6 w-6" />
            </motion.div>
            <h3 className="text-xl font-bold text-slate-900 mt-4 tracking-tight">
              {featureName} Management Locked
            </h3>
          </div>
          
          <p className="text-sm text-slate-500 mb-6 leading-relaxed px-2">
            {featureName} is locked under your current active tier. Upgrade your system subscription plan to gain instantaneous structural access.
          </p>

          {showUpgradeButton && (
            <Button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 hover:opacity-95 text-white gap-2 rounded-xl py-5 shadow-md shadow-indigo-600/10 font-semibold tracking-wide transition-all active:scale-[0.99]"
            >
              <Crown className="h-4 w-4 fill-white/20" />
              Upgrade Account
            </Button>
          )}
        </div>
      </div>
    );
  }

  // 2. UNLOCKED STATE WITH HIGHLIGHTS
  return (
    <div className="relative transition-all duration-500">
      {showGlow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="absolute -inset-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-indigo-500 rounded-2xl blur opacity-40 pointer-events-none"
          style={{ zIndex: -1 }}
        />
      )}

      <AnimatePresence>
        {showUnlockAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/10 backdrop-blur-[4px] rounded-2xl"
          >
            <motion.button
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              onClick={handleSkipAnimation}
              className="absolute top-4 right-4 pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-700 text-xs font-semibold rounded-full border border-slate-200/80 shadow-md hover:bg-slate-50 transition-all"
            >
              Skip Intro
              <X className="h-3.5 w-3.5" />
            </motion.button>

            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
            >
              <div className="p-8 text-center border border-white/60 bg-white/90 max-w-sm rounded-2xl shadow-xl">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full">
                    <Sparkles className="h-6 w-6" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">
                  {featureName} Unlocked!
                </h3>
                
                <p className="text-xs font-medium text-slate-500 px-4 leading-relaxed">
                  Your system configuration upgrade was processed successfully.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`transition-all duration-300 ${showUnlockAnimation ? 'pointer-events-none select-none filter blur-[1px]' : ''}`}>
        {children}
      </div>
    </div>
  );
}