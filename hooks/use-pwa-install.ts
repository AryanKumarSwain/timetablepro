'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'windows' | 'mac' | 'other'>('other');

  useEffect(() => {
    // 1. Detect platform
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(userAgent)) {
        setPlatform('ios');
      } else if (/android/.test(userAgent)) {
        setPlatform('android');
      } else if (/win/.test(userAgent)) {
        setPlatform('windows');
      } else if (/mac/.test(userAgent)) {
        setPlatform('mac');
      }

      // 2. Check if currently running in standalone mode (already launched as installed app)
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');

      if (isStandalone) {
        setIsInstalled(true);
      }

      if ('getInstalledRelatedApps' in navigator) {
        (navigator as unknown as { getInstalledRelatedApps: () => Promise<unknown[]> })
          .getInstalledRelatedApps()
          .then((apps) => {
            if (apps && apps.length > 0) {
              setIsInstalled(true);
            }
          })
          .catch(() => {});
      }

      // 3. Register service worker
      if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/sw.js')
            .catch((err) => console.log('SW registration note:', err));
        });
      } else if ('serviceWorker' in navigator) {
        // Also register in dev to allow PWA testing
        navigator.serviceWorker
          .register('/sw.js')
          .catch((err) => console.log('SW registration note:', err));
      }

      // 4. Capture beforeinstallprompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        setIsInstallable(true);
        setIsInstalled(false);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'instructions_needed'> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setIsInstallable(false);
          try {
            localStorage.setItem('timetablepro_pwa_installed', 'true');
          } catch {
            // ignore
          }
          return 'accepted';
        }
        return 'dismissed';
      } catch (err) {
        console.error('Error showing install prompt:', err);
        return 'instructions_needed';
      }
    }
    return 'instructions_needed';
  }, [deferredPrompt]);

  return {
    isInstallable,
    isInstalled,
    platform,
    promptInstall,
    hasNativePrompt: Boolean(deferredPrompt),
  };
}
