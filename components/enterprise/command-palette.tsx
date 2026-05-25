'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { COMMAND_LINKS } from '@/lib/navigation';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('tms-recent-routes');
    if (stored) setRecent(JSON.parse(stored));
  }, [open]);

  const navigate = (href: string, label: string) => {
    const next = [label, ...recent.filter((r) => r !== label)].slice(0, 5);
    setRecent(next);
    localStorage.setItem('tms-recent-routes', JSON.stringify(next));
    router.push(href);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder='Search pages, actions…' />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {recent.length > 0 && (
          <>
            <CommandGroup heading='Recent'>
              {recent.map((label) => {
                const item = COMMAND_LINKS.find((l) => l.label === label);
                if (!item) return null;
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.href + label}
                    onSelect={() => navigate(item.href, item.label)}
                  >
                    <Icon className='mr-2 h-4 w-4' />
                    {item.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        <CommandGroup heading='Navigation'>
          {COMMAND_LINKS.map((item, index) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={`${item.href}-${item.label}-${index}`}
                onSelect={() => navigate(item.href, item.label)}
              >
                <Icon className='mr-2 h-4 w-4' />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
