'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  Moon,
  Sun,
  Menu,
  Command,
  LogOut,
  Building2,
  ChevronDown,
  Megaphone, // 👈 Correctly mapped lowercase-p import
  Send,
  Info,
  AlertTriangle,
  MailCheck
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { NavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LiveNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'ALERT' | 'SYSTEM';
  createdAt: string;
  isRead: boolean;
}

interface AdminLeaveRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  requestedAt: string;
  reason?: string | null;
}

interface TrialStatus {
  isActive: boolean;
  planName: string | null;
  hoursRemaining: number | null;
}

interface TopNavbarProps {
  userName?: string;
  userEmail?: string;
  schoolName?: string;
  userRole?: string; // Accepts: 'super-admin' | 'admin' | 'teacher'
  navItems: NavItem[];
  onOpenCommand: () => void;
  onLogout: () => void;
}

export function TopNavbar({
  userName,
  userEmail,
  schoolName,
  userRole,
  navItems,
  onOpenCommand,
  onLogout,
}: TopNavbarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Real Notification Stream States Data Tracks
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState<AdminLeaveRequest[]>([]);
  const [processingLeaveIds, setProcessingLeaveIds] = useState<string[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTitle, setComposeTitle] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [composeType, setComposeType] = useState<'INFO' | 'ALERT' | 'SYSTEM'>('INFO');
  const [sending, setSending] = useState(false);
  const [trialStatus, setTrialStatus] = useState<TrialStatus>({ isActive: false, planName: null, hoursRemaining: null });

  // Formatting strings safely to handle dynamic relational role assertions safely
  const parsedRole = (userRole ?? '').toLowerCase().replace('-', '_');
  const canBroadcast = parsedRole === 'super_admin' || parsedRole === 'admin';
  const canFetchAdminData = parsedRole === 'admin' && Boolean(userEmail && userRole);

  const initials =
    userName?.slice(0, 2).toUpperCase() ||
    userEmail?.slice(0, 2).toUpperCase() ||
    'U';

  // Synchronize Active Live Stream Notifications
  const syncNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const payload = await res.json();
        setNotifications(payload.data || []);
      }
    } catch (e) {
      console.error('Failed refreshing message stream parameters.', e);
    }
  };

  const syncLeaveRequests = async () => {
    if (!canFetchAdminData) return;
    try {
      const res = await fetch('/api/admin/leave-requests');
      if (res.ok) {
        const payload = await res.json();
        setPendingLeaveRequests(payload.data || []);
      }
    } catch (e) {
      console.error('Failed loading pending leave requests.', e);
    }
  };

  // Fetch trial status for school admins
  const fetchTrialStatus = async () => {
    if (!canFetchAdminData) return;
    try {
      const res = await fetch('/api/admin/school/trial-status');
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error || `Trial status request failed with status ${res.status}`);
      }
      setTrialStatus(payload);
    } catch (e) {
      console.error('Failed fetching trial status.', e);
    }
  };

  useEffect(() => {
    setMounted(true);
    syncNotifications();
    syncLeaveRequests();
    fetchTrialStatus();

    // Auto-refresh dynamic data blocks every 45 seconds to keep tabs accurate
    const loopTracker = setInterval(syncNotifications, 45000);
    const leaveRequestTracker = setInterval(syncLeaveRequests, 45000);
    const trialStatusTracker = setInterval(fetchTrialStatus, 60000); // Check trial status every minute
    return () => {
      clearInterval(leaveRequestTracker);
      clearInterval(loopTracker);
      clearInterval(trialStatusTracker);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleLeaveRequestAction = async (id: string, action: 'approve' | 'reject') => {
    if (processingLeaveIds.includes(id)) return;
    setProcessingLeaveIds((p) => [...p, id]);
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
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to update leave request');
      }

      toast.success(`Leave request ${action === 'approve' ? 'approved' : 'declined'} successfully`);
      syncLeaveRequests();
      syncNotifications();
    } catch (e: any) {
      toast.error(e.message || 'Failed processing leave request');
    } finally {
      setProcessingLeaveIds((p) => p.filter((x) => x !== id));
    }
  };

  const handleNavigateToLeaveRequests = () => {
    router.push('/admin/settings?tab=leave-requests');
  };

  const handleBroadcastMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTitle.trim() || !composeMessage.trim()) {
      return toast.error('Populate all fields before firing broadcast channels');
    }

    setSending(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: composeTitle, message: composeMessage, type: composeType })
      });

      if (!res.ok) throw new Error();

      toast.success('Message cascade dispatched successfully into workspace parameters');
      setComposeTitle('');
      setComposeMessage('');
      setIsComposeOpen(false);
      syncNotifications();
    } catch (err) {
      toast.error('Failed routing cascading dispatch pipeline data allocations');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Trial Warning Banner */}
      {mounted && trialStatus.isActive && trialStatus.hoursRemaining !== null && trialStatus.hoursRemaining <= 48 && (
        <div className='sticky top-0 z-50 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center'>
          <p className='text-sm font-medium text-amber-700 dark:text-amber-400'>
            ⚠️ Your 7-day trial for the {trialStatus.planName} plan is ending in less than {trialStatus.hoursRemaining <= 24 ? '24' : '48'} hours!{' '}
            <Link href='/admin/upgrade' className='underline font-bold hover:text-amber-800 dark:hover:text-amber-300'>
              Upgrade now
            </Link>{' '}
            to keep your advanced features.
          </p>
        </div>
      )}
      <header className='sticky top-0 z-40 h-14 border-b border-border/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60'>
        <div className='flex h-full items-center gap-3 px-4 md:px-6'>
        {/* MOBILE SIDE NAVIGATION DRAWERS */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant='ghost' size='icon' className='md:hidden'>
              <Menu className='h-5 w-5' />
            </Button>
          </SheetTrigger>
          <SheetContent side='left' className='w-72 p-0'>
            <div className='p-4 border-b border-border'>
              <p className='font-semibold'>TimetablePro</p>
              <p className='text-xs text-muted-foreground'>{schoolName}</p>
            </div>
            <nav className='p-2 space-y-1'>
              {navItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={`${item.href}-${index}`}
                    href={item.href}
                    className='flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted'
                  >
                    <Icon className='h-4 w-4' />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        {/* SEARCH BAR ELEMENT COMMAND BUTTON TRIGGER */}
        <button
          type='button'
          onClick={onOpenCommand}
          className={cn(
            'hidden sm:flex flex-1 max-w-md items-center gap-2 rounded-xl border border-border/60',
            'bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 transition-colors'
          )}
        >
          <Search className='h-4 w-4' />
          <span className='flex-1 text-left'>Search or jump to…</span>
          <kbd className='hidden lg:inline-flex h-5 items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px]'>
            <Command className='h-3 w-3' />K
          </kbd>
        </button>

        {/* ACTIVE WORKSPACE SCOPED SCHOOL CARD DROP-DOWN */}
        <div className="hidden lg:flex items-center gap-2 rounded-xl px-3 py-2 border">
          <Building2 className="h-4 w-4 text-indigo-500" />
          <span className="font-medium text-sm">{schoolName}</span>
        </div>

        <div className='ml-auto flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='sm:hidden'
            onClick={onOpenCommand}
          >
            <Search className='h-4 w-4' />
          </Button>

          {/* DYNAMIC BROADCAST FORM MODAL COMPONENT (AUTHORIZED FOR ADMINS AND SUPER ADMINS) */}
          {mounted && canBroadcast && (
            <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
              <DialogTrigger asChild>
                <Button variant='ghost' size='icon' className="rounded-xl text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 transition-colors">
                  <Megaphone className='h-4 w-4' /> {/* 👈 Patched Component */}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-2xl border-border/60">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-indigo-500" /> {/* 👈 Patched Component */}
                    {parsedRole === 'super_admin' ? 'Broadcast to All Admins' : 'Broadcast to School Teachers'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleBroadcastMessage} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Alert Channel Priority</label>
                    <Select value={composeType} onValueChange={(v: any) => setComposeType(v)}>
                      <SelectTrigger className="rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INFO">💡 Information Notice</SelectItem>
                        <SelectItem value="ALERT">🚨 Operational Emergency Alert</SelectItem>
                        <SelectItem value="SYSTEM">⚙️ System Update Framework</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Header Topic Title</label>
                    <Input
                      value={composeTitle}
                      onChange={(e) => setComposeTitle(e.target.value)}
                      placeholder={parsedRole === 'admin' ? "E.g., Staff Meeting Room Change" : "E.g., System Update Announcement"}
                      className="rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Message Context Body</label>
                    <Textarea
                      value={composeMessage}
                      onChange={(e) => setComposeMessage(e.target.value)}
                      placeholder="Provide clear message details here..."
                      className="min-h-[100px] rounded-xl text-xs resize-none"
                    />
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="submit" disabled={sending} className="w-full text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 justify-center">
                      {sending ? <span className="h-3 w-3 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Fire Target Downstream Broadcast
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {/* THEME CONTROL ICON */}
          <Button
            variant='ghost'
            size='icon'
            className='relative'
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className='h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0' />
            <Moon className='absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100' />
          </Button>

          {/* DYNAMIC BELL NOTIFICATION PANEL AND READ RECEIPT HOOKS */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='relative rounded-xl'>
                <Bell className='h-4 w-4' />
                {mounted && unreadCount > 0 && (
                  <span className='absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background' />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-80 rounded-2xl border-border/80 shadow-xl p-0 overflow-hidden'>
              <div className="p-4 bg-muted/30 border-b border-border/50 flex items-center justify-between">
                <span className="font-bold text-xs tracking-tight text-foreground">Workspace Comms Stream</span>
                {unreadCount > 0 && <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-500 font-bold border-none text-[10px]">{unreadCount} New</Badge>}
              </div>
              <ScrollArea className="max-h-[320px]">
                {mounted && parsedRole === 'admin' && pendingLeaveRequests.length > 0 && (
                  <div className="space-y-2">
                    {pendingLeaveRequests.map((request) => (
                      <div key={request.id} className="p-3.5 border-b border-border/40 bg-slate-50 dark:bg-slate-900/80 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-foreground">Leave Request</p>
                            <p className="text-[11px] text-muted-foreground">{request.teacherName} · {request.teacherEmail}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="uppercase text-[10px] font-bold">
                              Pending
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNavigateToLeaveRequests();
                              }}
                              className="rounded-full px-2 py-1 text-[10px] font-semibold"
                            >
                              View
                            </Button>
                          </div>
                        </div>
                        {request.reason ? (
                          <p className="text-[11px] text-muted-foreground line-clamp-3">{request.reason}</p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">No reason supplied.</p>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <Button
                            size="sm"
                            onClick={() => void handleLeaveRequestAction(request.id, 'approve')}
                            className="flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                            disabled={processingLeaveIds.includes(request.id)}
                          >
                            {processingLeaveIds.includes(request.id) ? 'Processing…' : 'Yes'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleLeaveRequestAction(request.id, 'reject')}
                            className="flex-1 rounded-xl"
                            disabled={processingLeaveIds.includes(request.id)}
                          >
                            {processingLeaveIds.includes(request.id) ? 'Processing…' : 'No'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {mounted && notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-muted-foreground">
                    <MailCheck className="h-7 w-7 text-muted-foreground/40 mb-1.5" />
                    <p className="text-xs font-medium">Channel cleanly optimized</p>
                    <p className="text-[10px] text-muted-foreground/60">No pending announcements found</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                      className={cn(
                        "p-3.5 border-b border-border/40 text-left cursor-pointer transition-all flex items-start gap-2.5 hover:bg-muted/40",
                        !notif.isRead && "bg-indigo-500/[0.02] dark:bg-indigo-400/[0.01]"
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded-lg mt-0.5",
                        notif.type === 'ALERT' ? "bg-rose-500/10 text-rose-500" : "bg-indigo-500/10 text-indigo-500"
                      )}>
                        {notif.type === 'ALERT' ? <AlertTriangle className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("text-xs font-semibold truncate", !notif.isRead ? "text-foreground" : "text-muted-foreground")}>{notif.title}</p>
                          {!notif.isRead && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{notif.message}</p>
                        <p className="text-[9px] text-muted-foreground/60 font-medium">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* USER PROFILE DECORATOR DROP-DOWN COMPONENT */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='gap-2 pl-1 pr-2 rounded-xl'>
                <Avatar className='h-8 w-8'>
                  <AvatarFallback className='bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs'>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className='hidden md:inline text-sm font-medium max-w-[100px] truncate'>
                  {userName || userEmail}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel>
                <p>{userName}</p>
                <p className='text-xs font-normal text-muted-foreground'>{userEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className='text-rose-600'>
                <LogOut className='h-4 w-4 mr-2' />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
    </>
  );
}