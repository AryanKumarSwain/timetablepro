'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getTimetables,
  createTimetable,
  updateTimetable,
  deleteTimetable,
  type TimetableSummary,
} from '@/lib/api-services';
import { PageHeader } from '@/components/enterprise/page-header';
import { StatCard } from '@/components/enterprise/stat-card';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Calendar,
  MoreVertical,
  Share2,
  Table2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function TimetableRow({
  item,
  onPublish,
  onUnpublish,
  onDelete,
}: {
  item: TimetableSummary;
  onPublish: () => void;
  onUnpublish: () => void;
  onDelete: () => void;
}) {
  const isPublished = item.status === 'PUBLISHED';

  return (
    <div className='flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-card/50 hover:bg-muted/20 transition-colors'>
      <div
        className={cn(
          'h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0',
          avatarColor(item.name)
        )}
      >
        {item.name.charAt(0).toUpperCase()}
      </div>
      <div className='flex-1 min-w-0'>
        <Link
          href={`/admin/timetables/${item.id}/edit`}
          className='font-semibold hover:text-indigo-600 transition-colors truncate block'
        >
          {item.name}
        </Link>
        <p className='text-xs text-muted-foreground mt-0.5'>
          {item.slotCount} slots · Updated {formatDate(item.updatedAt)}
        </p>
      </div>
      <Badge
        variant='outline'
        className={cn(
          isPublished
            ? 'border-emerald-500/30 text-emerald-600 bg-emerald-500/10'
            : 'border-amber-500/30 text-amber-600 bg-amber-500/10'
        )}
      >
        {item.status}
      </Badge>
      <div className='flex items-center gap-2 shrink-0'>
        {isPublished ? (
          <>
            <Button size='sm' variant='outline' className='rounded-lg' onClick={onUnpublish}>
              Unpublish
            </Button>
            <Button
              size='sm'
              variant='outline'
              className='rounded-lg'
              onClick={() =>
                navigator.clipboard.writeText(
                  `${window.location.origin}/admin/timetables/${item.id}/edit`
                )
              }
            >
              <Share2 className='h-3.5 w-3.5 mr-1' />
              Share
            </Button>
          </>
        ) : (
          <Button size='sm' className='rounded-lg' onClick={onPublish}>
            Publish
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size='icon' variant='ghost' className='h-8 w-8 rounded-lg'>
              <MoreVertical className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem asChild>
              <Link href={`/admin/timetables/${item.id}/edit`}>Edit</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className='text-destructive'
              onClick={onDelete}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function TimetablesPage() {
  useRequireAuth('admin');

  const [timetables, setTimetables] = useState<TimetableSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setTimetables(await getTimetables());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const published = useMemo(
    () => timetables.filter((t) => t.status === 'PUBLISHED'),
    [timetables]
  );
  const drafts = useMemo(
    () => timetables.filter((t) => t.status === 'DRAFT'),
    [timetables]
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createTimetable(newName.trim());
      setNewName('');
      setModalOpen(false);
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className='max-w-5xl mx-auto'>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className='max-w-5xl mx-auto'>
      <PageHeader
        title='My Timetables'
        description='Manage all your timetables and track their status'
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Timetables' },
        ]}
        actions={
          <Button
            className='rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md hover:from-indigo-500 hover:to-violet-500 transition-all'
            onClick={() => setModalOpen(true)}
          >
            <Plus className='h-4 w-4 mr-1.5' />
            New Timetable
          </Button>
        }
      />

      <div className='grid sm:grid-cols-3 gap-4 mb-8 mt-6'>
        <StatCard
          label='Total Timetables'
          value={timetables.length}
          icon={Table2}
          variant='primary'
          index={0}
        />
        <StatCard
          label='Published'
          value={published.length}
          icon={Calendar}
          variant='success'
          index={1}
        />
        <StatCard
          label='Drafts'
          value={drafts.length}
          variant='warning'
          index={2}
        />
      </div>

      <GlassCard className='p-6 mb-6'>
        <h2 className='text-lg font-semibold mb-4 text-foreground'>
          Published Timetables [{published.length}]
        </h2>
        {published.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No published timetables yet.</p>
        ) : (
          <div className='space-y-3'>
            {published.map((t) => (
              <TimetableRow
                key={t.id}
                item={t}
                onPublish={() => void updateTimetable(t.id, { status: 'PUBLISHED' }).then(load)}
                onUnpublish={() => void updateTimetable(t.id, { status: 'DRAFT' }).then(load)}
                onDelete={() => {
                  if (window.confirm('Delete this timetable?')) {
                    void deleteTimetable(t.id).then(load);
                  }
                }}
              />
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard className='p-6'>
        <h2 className='text-lg font-semibold mb-4 text-foreground'>
          Draft Timetables [{drafts.length}]
        </h2>
        {drafts.length === 0 ? (
          <p className='text-sm text-muted-foreground'>No draft timetables.</p>
        ) : (
          <div className='space-y-3'>
            {drafts.map((t) => (
              <TimetableRow
                key={t.id}
                item={t}
                onPublish={() => void updateTimetable(t.id, { status: 'PUBLISHED' }).then(load)}
                onUnpublish={() => void updateTimetable(t.id, { status: 'DRAFT' }).then(load)}
                onDelete={() => {
                  if (window.confirm('Delete this timetable?')) {
                    void deleteTimetable(t.id).then(load);
                  }
                }}
              />
            ))}
          </div>
        )}
      </GlassCard>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className='rounded-2xl border border-border/60 bg-background/95 backdrop-blur-md'>
          <DialogHeader>
            <DialogTitle className='text-xl font-bold'>New Timetable</DialogTitle>
          </DialogHeader>
          <Input
            placeholder='Timetable name'
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
            className='rounded-xl'
          />
          <DialogFooter className='gap-2 sm:gap-0'>
            <Button variant='outline' className='rounded-xl' onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              disabled={creating || !newName.trim()} 
              onClick={() => void handleCreate()}
              className='rounded-xl bg-indigo-600 hover:bg-indigo-500'
            >
              {creating ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}