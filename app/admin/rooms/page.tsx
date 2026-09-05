'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
} from '@/lib/api-services';
import { Room } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlanButton } from '@/components/ui/plan-button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/enterprise/page-header';
import {
  DataGrid,
  DataGridTable,
  DataGridHead,
  DataGridRow,
  DataGridTh,
  DataGridTd,
} from '@/components/enterprise/data-grid';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { BulkCsvImportModal } from '@/components/enterprise/bulk-csv-import-modal';
import { Upload, CheckCircle2, DoorOpen, AlertCircle, Pencil, Trash2 } from 'lucide-react';

export default function RoomsPage() {
  useRequireAuth('admin');

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<Room, 'id'>>({
    roomNumber: '',
    floor: '',
    block: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => {
      setSuccessMsg(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  useEffect(() => {
    if (!errorMsg) return;
    const timer = setTimeout(() => {
      setErrorMsg(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [errorMsg]);

  const loadData = async () => {
    try {
      setLoading(true);
      const roomsData = await getRooms();
      setRooms(roomsData);
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentFormData = { ...formData };
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (editingId) {
        await updateRoom(editingId, currentFormData);
        setSuccessMsg(`Room ${currentFormData.roomNumber} updated successfully.`);
        resetForm();
        await loadData();
      } else {
        await createRoom(currentFormData);
        setSuccessMsg(`Room ${currentFormData.roomNumber} created successfully.`);
        resetForm();
        await loadData();
      }
    } catch (error: any) {
      console.error('Failed to save room:', error);
      setErrorMsg(error?.message || 'Failed to save room.');
      setShowForm(true);
      setFormData(currentFormData);
    }
  };

  const handleBulkUploadSuccess = () => {
    setSuccessMsg('Bulk import successful! All rooms have been saved.');
    loadData();
  };

  const handleEdit = (room: Room) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    setFormData({
      roomNumber: room.roomNumber,
      floor: room.floor || '',
      block: room.block || '',
    });
    setEditingId(room.id);
    setShowForm(true);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      try {
        setSuccessMsg('Room removed successfully.');
        await deleteRoom(id);
        loadData();
      } catch (error: any) {
        console.error('Failed to delete room:', error);
        setErrorMsg(error?.message || 'Failed to delete room.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      roomNumber: '',
      floor: '',
      block: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className='max-w-7xl mx-auto'>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto relative'>
      <PageHeader
        title='Rooms'
        description={`Manage school rooms (${rooms.length}/100)`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Rooms' },
        ]}
        actions={
          !showForm ? (
            <div className='flex flex-wrap gap-2'>
              <Button
                variant='outline'
                onClick={() => setImportOpen(true)}
                className='rounded-xl'
              >
                <Upload className='h-4 w-4 mr-1.5' />
                Import CSV
              </Button>
              <PlanButton
                onClick={() => {
                  setSuccessMsg(null);
                  setErrorMsg(null);
                  setShowForm(true);
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                variant='primary'
                className='rounded-xl'
              >
                Add Room
              </PlanButton>
            </div>
          ) : undefined
        }
      />

      {successMsg && (
        <div className='fixed top-6 right-6 z-50 max-w-sm p-4 bg-white dark:bg-zinc-900 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl shadow-xl flex items-start gap-3 animate-in slide-in-from-top-4 fade-in duration-300'>
          <CheckCircle2 className='h-5 w-5 shrink-0 text-emerald-500 mt-0.5' />
          <div>
            <p className='font-semibold mb-0.5'>Action Successful</p>
            <p className='text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed'>{successMsg}</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className='fixed top-6 right-6 z-50 max-w-sm p-4 bg-white dark:bg-zinc-900 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm rounded-xl shadow-xl flex items-start gap-3 animate-in slide-in-from-top-4 fade-in duration-300'>
          <AlertCircle className='h-5 w-5 shrink-0 text-rose-500 mt-0.5' />
          <div>
            <p className='font-semibold mb-0.5'>Action Failed</p>
            <p className='text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed'>{errorMsg}</p>
          </div>
        </div>
      )}

      {showForm && (
        <Card className='p-6 mb-6 border-border animate-in fade-in duration-200'>
          <h2 className='text-xl font-semibold text-foreground mb-4'>
            {editingId ? 'Edit Room' : 'Add New Room'}
          </h2>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Room No / Name <span className='text-rose-500'>*</span>
                </label>
                <Input
                  value={formData.roomNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, roomNumber: e.target.value })
                  }
                  placeholder='Room 101'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Floor (Optional)
                </label>
                <Input
                  value={formData.floor || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, floor: e.target.value })
                  }
                  placeholder='1st Floor'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Block (Optional)
                </label>
                <Input
                  value={formData.block || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, block: e.target.value })
                  }
                  placeholder='Block A'
                />
              </div>
            </div>

            <div className='flex gap-2 pt-2'>
              <Button type='submit' className='bg-primary hover:bg-primary/90'>
                {editingId ? 'Update Room' : 'Create Room'}
              </Button>
              <Button
                type='button'
                onClick={resetForm}
                variant='outline'
                className='border-border hover:bg-card'
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <BulkCsvImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        entity='rooms'
        onSuccess={handleBulkUploadSuccess}
      />

      <DataGrid title='Rooms list' empty={rooms.length === 0}>
        <DataGridTable>
          <DataGridHead>
            <tr>
              <DataGridTh className='w-1/3 min-w-[150px]'>Room No</DataGridTh>
              <DataGridTh className='w-1/4 min-w-[100px]'>Floor</DataGridTh>
              <DataGridTh className='w-1/4 min-w-[100px]'>Block</DataGridTh>
              <DataGridTh className='text-right pr-6'>Actions</DataGridTh>
            </tr>
          </DataGridHead>
          <tbody>
            {rooms.map((room) => (
              <DataGridRow key={room.id}>
                <DataGridTd className='font-medium text-foreground'>
                  <div className='flex items-center gap-2'>
                    <DoorOpen className='h-4 w-4 text-indigo-500/70' />
                    <span>{room.roomNumber}</span>
                  </div>
                </DataGridTd>
                <DataGridTd className='text-muted-foreground'>
                  {room.floor || '—'}
                </DataGridTd>
                <DataGridTd className='text-muted-foreground'>
                  {room.block || '—'}
                </DataGridTd>
                <DataGridTd className='text-right pr-6'>
                  <div className='flex items-center justify-end gap-2'>
                    <Button
                      onClick={() => handleEdit(room)}
                      size='sm'
                      variant='outline'
                      className='rounded-lg h-8'
                    >
                      <Pencil className='h-3.5 w-3.5 mr-1 text-muted-foreground' />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(room.id)}
                      size='sm'
                      variant='outline'
                      className='rounded-lg h-8 border-rose-500/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                    >
                      <Trash2 className='h-3.5 w-3.5 mr-1' />
                      Delete
                    </Button>
                  </div>
                </DataGridTd>
              </DataGridRow>
            ))}
          </tbody>
        </DataGridTable>
      </DataGrid>
    </div>
  );
}
