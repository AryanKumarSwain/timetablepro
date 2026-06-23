'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
} from '@/lib/api-services';
import { Class } from '@/lib/types';
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
import { Upload, CheckCircle2 } from 'lucide-react';

export default function ClassesPage() {
  useRequireAuth('admin');

  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cleaned up form state containing only Name, Section, and Room Number
  const [formData, setFormData] = useState<Omit<Class, 'id' | 'strength' | 'classTeacher'>>({
    name: '',
    section: '',
    roomNumber: '', 
  });

  useEffect(() => {
    loadData();
  }, []);

  // 2-second auto-dismiss timer for notifications
  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => {
      setSuccessMsg(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  const loadData = async () => {
    try {
      setLoading(true);
      const classesData = await getClasses();
      setClasses(classesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentFormData = { ...formData };
    
    try {
      if (editingId) {
        setSuccessMsg(`Class ${currentFormData.name} updated successfully.`);
        resetForm();
        await updateClass(editingId, currentFormData);
        loadData(); // Runs quietly in background
      } else {
        // Optimistic UI clear and response toast
        setSuccessMsg(`Class ${currentFormData.name} has been created successfully.`);
        resetForm();
        await createClass(currentFormData);
        loadData(); // Runs quietly in background
      }
    } catch (error) {
      console.error('Failed to save class:', error);
      setShowForm(true);
      setFormData(currentFormData);
    }
  };

  const handleBulkUploadSuccess = () => {
    setSuccessMsg('Bulk import successful! All new classes have been saved.');
    loadData();
  };

  const handleEdit = (cls: Class) => {
    setSuccessMsg(null);
    setFormData({
      name: cls.name,
      section: cls.section,
      roomNumber: cls.roomNumber || '',
    });
    setEditingId(cls.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        setSuccessMsg('Class record removed successfully.');
        await deleteClass(id);
        loadData();
      } catch (error) {
        console.error('Failed to delete class:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      section: '',
      roomNumber: '',
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
        title='Classes'
        description='Manage school classes'
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
        
          { label: 'Classes' },
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
                  setShowForm(true);
                }}
                variant="primary"
                className='rounded-xl'
              >
                Add Class
              </PlanButton>
            </div>
          ) : undefined
        }
      />

      {/* TOP-RIGHT POPUP TOAST BOX */}
      {successMsg && (
        <div className='fixed top-6 right-6 z-50 max-w-sm p-4 bg-white dark:bg-zinc-900 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl shadow-xl flex items-start gap-3 animate-in slide-in-from-top-4 fade-in duration-300'>
          <CheckCircle2 className='h-5 w-5 shrink-0 text-emerald-500 mt-0.5' />
          <div>
            <p className='font-semibold mb-0.5'>Action Successful</p>
            <p className='text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed'>{successMsg}</p>
          </div>
        </div>
      )}

      {showForm && (
        <Card className='p-6 mb-6 border-border animate-in fade-in duration-200'>
          <h2 className='text-xl font-semibold text-foreground mb-4'>
            {editingId ? 'Edit Class' : 'Add New Class'}
          </h2>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder='Class 10-A'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Section
                </label>
                <Input
                  value={formData.section}
                  onChange={(e) =>
                    setFormData({ ...formData, section: e.target.value })
                  }
                  placeholder='A'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Room Number (Optional)
                </label>
                <Input
                  value={formData.roomNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, roomNumber: e.target.value })
                  }
                  placeholder='101'
                />
              </div>
            </div>

            <div className='flex gap-2 pt-2'>
              <Button
                type='submit'
                className='bg-primary hover:bg-primary/90'
              >
                {editingId ? 'Update' : 'Create'}
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
        entity='classes'
        onSuccess={handleBulkUploadSuccess}
      />

      <DataGrid title='Classes list' empty={classes.length === 0}>
        <DataGridTable>
          <DataGridHead>
            <tr>
              <DataGridTh>Name</DataGridTh>
              <DataGridTh>Section</DataGridTh>
              <DataGridTh>Room Number</DataGridTh>
              <DataGridTh>Actions</DataGridTh>
            </tr>
          </DataGridHead>
          <tbody>
            {classes.map((cls) => (
              <DataGridRow key={cls.id}>
                <DataGridTd className='font-medium text-foreground'>
                  {cls.name}
                </DataGridTd>
                <DataGridTd className='text-muted-foreground'>
                  {cls.section}
                </DataGridTd>
                <DataGridTd className='text-muted-foreground'>
                  {cls.roomNumber || '—'}
                </DataGridTd>
                <DataGridTd>
                  <div className='flex gap-2'>
                    <Button
                      onClick={() => handleEdit(cls)}
                      size='sm'
                      variant='outline'
                      className='rounded-lg'
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(cls.id)}
                      size='sm'
                      variant='outline'
                      className='rounded-lg border-rose-500/30 text-rose-600'
                    >
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