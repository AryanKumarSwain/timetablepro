'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Download,
  Smartphone,
  Laptop,
  CheckCircle2,
  Share2,
  PlusSquare,
  MoreVertical,
  QrCode,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PwaDownloadButtonProps {
  variant?: 'header' | 'hero' | 'floating' | 'card';
  className?: string;
}

export function PwaDownloadButton({ variant = 'hero', className }: PwaDownloadButtonProps) {
  const { isInstalled, platform, promptInstall, hasNativePrompt } = usePWAInstall();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop' | 'qr'>('desktop');
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (platform === 'ios') setActiveTab('ios');
    else if (platform === 'android') setActiveTab('android');
    else setActiveTab('desktop');
  }, [platform]);

  const handleClick = async () => {
    if (isInstalled) {
      toast.success('TimetablePro is already installed on your device!', {
        description: 'You can launch it anytime from your home screen or app menu.',
      });
      return;
    }

    if (hasNativePrompt) {
      const outcome = await promptInstall();
      if (outcome === 'accepted') {
        toast.success('Installing TimetablePro...', {
          description: 'TimetablePro has been added to your device apps.',
        });
        return;
      }
    }

    // Otherwise show helpful visual instructions & QR code modal
    setDialogOpen(true);
  };

  return (
    <>
      {/* Header Button Variant */}
      {variant === 'header' && (
        <Button
          onClick={handleClick}
          variant="outline"
          size="sm"
          className={cn(
            'group relative rounded-xl border-sky-200 bg-sky-50/70 hover:bg-sky-100/80 text-blue-700 font-medium transition-all duration-200 h-8 sm:h-10 px-2.5 sm:px-3.5 text-[11px] sm:text-xs shadow-xs hover:border-blue-300',
            className
          )}
          title="Download TimetablePro App"
        >
          <span className="flex items-center gap-1.5">
            {isInstalled ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="hidden min-[480px]:inline text-emerald-700 font-semibold">App Installed</span>
                <span className="inline min-[480px]:hidden text-emerald-700 font-semibold">Installed</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5 text-blue-600 transition-transform group-hover:-translate-y-0.5 shrink-0" />
                <span className="hidden min-[480px]:inline">Download App</span>
                <span className="inline min-[480px]:hidden">App</span>
                <span className="hidden lg:inline-block px-1.5 py-0.2 rounded-full bg-blue-100 text-[10px] font-bold text-blue-800">
                  PWA
                </span>
              </>
            )}
          </span>
        </Button>
      )}

      {/* Hero Button Variant */}
      {variant === 'hero' && (
        <Button
          onClick={handleClick}
          variant="outline"
          className={cn(
            'group relative h-12 rounded-xl border-sky-200 bg-white/90 px-5 text-base font-semibold text-slate-800 shadow-sm backdrop-blur-xs transition-all duration-200 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 hover:shadow-md hover:shadow-blue-500/10',
            className
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              {isInstalled ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 group-hover:text-white" />
              ) : (
                <Download className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
              )}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold leading-tight">
                {isInstalled ? 'App Ready' : 'Download App'}
              </span>
              <span className="text-[11px] font-medium text-slate-500 group-hover:text-blue-600/80">
                {isInstalled ? 'Installed on device' : 'Mobile & Desktop PWA'}
              </span>
            </div>
          </div>
        </Button>
      )}

      {/* Card / Feature Variant */}
      {variant === 'card' && (
        <div
          className={cn(
            'group relative overflow-hidden rounded-2xl border border-sky-200/80 bg-white/95 p-6 shadow-lg shadow-sky-100/60 backdrop-blur-md transition-all duration-300 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-200/40',
            className
          )}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-md shadow-blue-500/25">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/60 mb-1">
                  <Sparkles className="h-3 w-3 text-blue-600" />
                  Zero Store Download Needed
                </div>
                <h3 className="text-lg font-bold text-slate-900">Install TimetablePro App</h3>
                <p className="text-sm text-slate-600 max-w-lg mt-0.5">
                  Get lightning-fast offline schedule access, live period notifications, and full screen experience directly on Windows, macOS, Android, and iPhone.
                </p>
              </div>
            </div>
            <Button
              onClick={handleClick}
              className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 font-semibold text-white shadow-md shadow-blue-500/20 hover:brightness-110 whitespace-nowrap shrink-0 w-full sm:w-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              {isInstalled ? 'Open App' : 'Download Now'}
            </Button>
          </div>
        </div>
      )}

      {/* Floating Bottom Quick Action (Fixed & sticky at bottom-right) */}
      {variant === 'floating' && (
        <aside
          aria-label="Download TimetablePro App"
          className={cn(
            'fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex items-center',
            className
          )}
        >
          <button
            onClick={handleClick}
            className="group relative flex items-center gap-3 rounded-2xl border border-sky-200/90 bg-white/95 p-2.5 sm:p-3 pr-4 sm:pr-5 shadow-[0_12px_32px_rgba(37,99,235,0.22)] backdrop-blur-md transition-all duration-300 hover:shadow-[0_18px_44px_rgba(37,99,235,0.32)] hover:scale-105 hover:border-blue-400 active:scale-95 text-left cursor-pointer"
          >
            {/* Glowing active indicator dot */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-white" />
            </span>

            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 transition-all duration-300 group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-blue-500/25 border border-blue-100 group-hover:border-transparent">
              {isInstalled ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 group-hover:text-white" />
              ) : (
                <Download className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
              )}
            </div>

            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
                  {isInstalled ? 'App Ready' : 'Download App'}
                </span>
                <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[9px] font-extrabold text-blue-700 uppercase tracking-wide">
                  PWA
                </span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 group-hover:text-slate-700">
                {isInstalled ? 'Installed on device' : 'Mobile & Desktop PWA'}
              </span>
            </div>
          </button>
        </aside>
      )}

      {/* Interactive Install Guide Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-sky-100 rounded-2xl shadow-2xl">
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-white text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md border border-white/20">
                <Download className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">Download TimetablePro</DialogTitle>
                <DialogDescription className="text-xs text-blue-100/90 mt-0.5">
                  Direct Progressive Web App (PWA) installation
                </DialogDescription>
              </div>
            </div>

            {/* Quick Benefits Pills */}
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium text-blue-100">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 border border-white/10">
                <Zap className="h-3 w-3 text-amber-300" /> Instant launch
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 border border-white/10">
                <ShieldCheck className="h-3 w-3 text-emerald-300" /> No app store required
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 border border-white/10">
                <Smartphone className="h-3 w-3 text-sky-200" /> 100% Native feel
              </span>
            </div>
          </div>

          <div className="p-6 bg-white space-y-5">
            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab('desktop')}
                className={cn(
                  'flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg transition-all',
                  activeTab === 'desktop'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                )}
              >
                <Laptop className="h-3.5 w-3.5" />
                <span className="hidden min-[400px]:inline">Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={cn(
                  'flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg transition-all',
                  activeTab === 'android'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                )}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={cn(
                  'flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg transition-all',
                  activeTab === 'ios'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                )}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>iOS</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('qr')}
                className={cn(
                  'flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg transition-all',
                  activeTab === 'qr'
                    ? 'bg-white text-blue-700 shadow-xs font-bold'
                    : 'hover:text-slate-900'
                )}
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>QR Code</span>
              </button>
            </div>

            {/* Desktop Step-by-Step */}
            {activeTab === 'desktop' && (
              <div className="space-y-3.5 text-slate-700 text-sm">
                <div className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Look for the Install Icon in your browser</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      On Chrome or Microsoft Edge, look at the right edge of your browser URL address bar for the install app icon (<Download className="inline h-3 w-3 text-blue-600" />).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Click &ldquo;Install TimetablePro&rdquo;</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Or click the browser menu (<MoreVertical className="inline h-3 w-3" />) &gt; <strong>Save and share</strong> / <strong>Apps</strong> &gt; <strong>Install TimetablePro</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Instant Desktop Access</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      You can now launch TimetablePro directly from your Desktop, Taskbar, or Start Menu without opening a browser window.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Android Step-by-Step */}
            {activeTab === 'android' && (
              <div className="space-y-3.5 text-slate-700 text-sm">
                <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Open Chrome Menu</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tap the three dots (<MoreVertical className="inline h-3 w-3" />) in the top-right corner of Google Chrome.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Tap &ldquo;Install app&rdquo; or &ldquo;Add to Home Screen&rdquo;</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select <strong>Install app</strong> from the dropdown menu and confirm.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Added to Your App Drawer</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      TimetablePro will behave just like an APK installed from Play Store, complete with standalone window and offline caching.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* iOS (iPhone/iPad) Step-by-Step */}
            {activeTab === 'ios' && (
              <div className="space-y-3.5 text-slate-700 text-sm">
                <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Tap the Share Button</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      In Safari, tap the <strong>Share</strong> icon (<Share2 className="inline h-3 w-3 text-blue-600" /> box with an upward arrow) in the bottom navigation bar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Select &ldquo;Add to Home Screen&rdquo;</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Scroll down in the action sheet and tap <PlusSquare className="inline h-3 w-3 text-slate-700" /> <strong>Add to Home Screen</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3.5">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Tap &ldquo;Add&rdquo; in top right</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      The TimetablePro icon will appear on your iPhone or iPad home screen for instant 1-tap full-screen access.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code Tab for Cross-Device Install */}
            {activeTab === 'qr' && (
              <div className="flex flex-col items-center justify-center py-2 text-center space-y-4">
                <div className="p-3 bg-white rounded-2xl border-2 border-dashed border-sky-200 shadow-inner">
                  {currentUrl ? (
                    <QRCodeSVG
                      value={currentUrl}
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                  ) : (
                    <div className="h-[180px] w-[180px] bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                      Loading QR...
                    </div>
                  )}
                </div>
                <div className="max-w-xs">
                  <p className="text-xs font-bold text-slate-900">Scan with your Phone Camera</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Point your camera at this QR code to open TimetablePro directly on your mobile device and install it in seconds.
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                Version 1.0 • PWA Standard
              </span>
              <Button
                variant="default"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs px-4"
              >
                Got it
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
