'use client';

import { useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { NavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';

interface TopNavbarProps {
  userName?: string;
  userEmail?: string;
  schoolName?: string;
  navItems: NavItem[];
  onOpenCommand: () => void;
  onLogout: () => void;
}

export function TopNavbar({
  userName,
  userEmail,
  schoolName = 'Demo International School',
  navItems,
  onOpenCommand,
  onLogout,
}: TopNavbarProps) {
  const { theme, setTheme } = useTheme();
  const initials =
    userName?.slice(0, 2).toUpperCase() ||
    userEmail?.slice(0, 2).toUpperCase() ||
    'U';

  return (
    <header className='sticky top-0 z-40 h-14 border-b border-border/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60'>
      <div className='flex h-full items-center gap-3 px-4 md:px-6'>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant='ghost' size='icon' className='md:hidden'>
              <Menu className='h-5 w-5' />
            </Button>
          </SheetTrigger>
          <SheetContent side='left' className='w-72 p-0'>
            <div className='p-4 border-b border-border'>
              <p className='font-semibold'>TimetableMaster</p>
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm' className='hidden lg:flex gap-2 rounded-xl'>
              <Building2 className='h-4 w-4 text-indigo-500' />
              <span className='max-w-[140px] truncate'>{schoolName}</span>
              <ChevronDown className='h-3 w-3 opacity-50' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuLabel>Workspace</DropdownMenuLabel>
            <DropdownMenuItem>{schoolName}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className='ml-auto flex items-center gap-1'>
          <Button
            variant='ghost'
            size='icon'
            className='sm:hidden'
            onClick={onOpenCommand}
          >
            <Search className='h-4 w-4' />
          </Button>

          <Button
            variant='ghost'
            size='icon'
            className='relative'
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className='h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0' />
            <Moon className='absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100' />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='relative'>
                <Bell className='h-4 w-4' />
                <span className='absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-80'>
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className='flex flex-col items-start gap-1 py-3'>
                <span className='text-xs font-medium text-amber-600'>Pending</span>
                <span className='text-sm'>Substitution assignments awaiting confirmation</span>
              </DropdownMenuItem>
              <DropdownMenuItem className='flex flex-col items-start gap-1 py-3'>
                <span className='text-xs font-medium text-rose-600'>Alert</span>
                <span className='text-sm'>Teachers marked absent today</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
  );
}
