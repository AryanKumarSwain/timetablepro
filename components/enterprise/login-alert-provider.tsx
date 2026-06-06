'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, AlertOctagon, Settings, X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LiveNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'ALERT' | 'SYSTEM';
  createdAt: string;
  isRead: boolean;
}

export function LoginAlertProvider({ children }: { children: React.ReactNode }) {
  const [activeAlert, setActiveAlert] = useState<LiveNotification | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function checkForNewNotifications() {
      try {
        const res = await fetch('/api/notifications');
        if (!res.ok) return;
        
        const payload = await res.json();
        const unreadList: LiveNotification[] = (payload.data || []).filter(
          (n: LiveNotification) => !n.isRead
        );

        // If there are unread notifications, grab the most critical one first
        if (unreadList.length > 0) {
          // Prioritize ALERT > SYSTEM > INFO
          const criticalAlert = unreadList.sort((a, b) => {
            const priority = { ALERT: 3, SYSTEM: 2, INFO: 1 };
            return priority[b.type] - priority[a.type];
          })[0];

          setActiveAlert(criticalAlert);
          
          // Delayed open for smooth layout mount transition
          const timer = setTimeout(() => setIsOpen(true), 1200);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.error('Failed reading unread notification matrices:', err);
      }
    }

    checkForNewNotifications();
  }, []);

  const handleDismissAndMarkRead = async () => {
    if (!activeAlert) return;
    setIsOpen(false);
    
    try {
      // Clean read receipt registration
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: activeAlert.id })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Icon type dictionary mapping your operational requirements perfectly
  const alertStyles = {
    INFO: {
      label: 'Information Notice',
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
      icon: <Lightbulb className="h-5 w-5" />
    },
    ALERT: {
      label: 'Operational Emergency Alert',
      bg: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400',
      icon: <AlertOctagon className="h-5 w-5 animate-pulse" />
    },
    SYSTEM: {
      label: 'System Update Framework',
      bg: 'bg-slate-500/10 border-slate-500/20 text-slate-600 dark:text-slate-400',
      icon: <Settings className="h-5 w-5" />
    }
  };

  const currentStyle = activeAlert ? alertStyles[activeAlert.type] : null;

  return (
    <>
      {children}
      
      <AnimatePresence>
        {isOpen && activeAlert && currentStyle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/40 backdrop-blur-md">
            {/* Dark opaque backdrop closer element wrapper */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/20"
              onClick={() => setIsOpen(false)}
            />

            {/* Main Interactive Glass Card Alert Popup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="relative w-full max-w-md overflow-hidden bg-card border border-border/80 shadow-2xl rounded-2xl p-6 z-10"
            >
              {/* Corner Close Hook Button */}
              <button 
                onClick={() => setIsOpen(false)} 
                className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="space-y-4">
                {/* Header Flag Segment */}
                <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold tracking-tight", currentStyle.bg)}>
                  {currentStyle.icon}
                  {currentStyle.label}
                </div>

                {/* Text Content Blocks */}
                <div className="space-y-1">
                  <h3 className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-indigo-500" />
                    {activeAlert.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {activeAlert.message}
                  </p>
                </div>

                {/* Confirmation Footer Processing Button */}
                <div className="pt-2">
                  <Button 
                    onClick={handleDismissAndMarkRead}
                    className="w-full h-10 text-xs font-bold rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
                  >
                    Acknowledge & Clear Notification
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}