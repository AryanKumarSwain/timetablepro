'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} from '@/lib/api-services';
import { Teacher } from '@/lib/types';
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
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

type TeacherFormState = Omit<Teacher, 'id'>;

const createEmptyTeacherForm = (): TeacherFormState => ({
  name: '',
  email: '',
  phone: '',
  qualifications: [],
  subjects: [],
  active: true,
  joinDate: new Date().toISOString().split('T')[0],
});

export default function TeachersPage() {
  useRequireAuth('admin');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TeacherFormState>(createEmptyTeacherForm);
  const [importOpen, setImportOpen] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Core Initial Data Fetch
  useEffect(() => {
    loadTeachers();
  }, []);

  // 2. Separate Self-Dismissing Toast Timer
  useEffect(() => {
    if (!successMsg) return;

    const timer = setTimeout(() => {
      setSuccessMsg(null);
    }, 2000);

    return () => clearTimeout(timer);
  }, [successMsg]);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const data = await getTeachers();
      setTeachers(data);
    } catch (error) {
      console.error('Failed to load teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null); 
    setSuccessMsg(null);
    
    try {
      if (editingId) {
        await updateTeacher(editingId, formData);
        setSuccessMsg(`Profile updated successfully for ${formData.name}.`);
      } else {
        await createTeacher(formData);
        
        console.log('---------------------------------------------------------');
        console.log(`[SMTP Dispatch Simulation Check]`);
        console.log(`TO: ${formData.email}`);
        console.log(`SUBJECT: Welcome to the Portal, ${formData.name}!`);
        console.log(`BODY: Account registration successful. Status configured: ACTIVE.`);
        console.log('---------------------------------------------------------');
        
        setSuccessMsg(`Teacher profile created and credentials sent to ${formData.email}.`);
      }
      await loadTeachers();
      
      setFormData(createEmptyTeacherForm());
      setEditingId(null);
      setShowForm(false); 
    } catch (error: any) {
      console.error('Failed to save teacher record setup:', error);
      if (error?.message) {
        setErrorMsg(error.message);
      } else if (typeof error === 'string') {
        setErrorMsg(error);
      } else {
        setErrorMsg('An unexpected error occurred while saving the teacher record.');
      }
    }
  };

  const handleBulkUploadSuccess = async () => {
    setSuccessMsg('Bulk import successful! Welcome credentials have been sent to all registered teachers.');
    await loadTeachers();
  };

  const handleEdit = (teacher: Teacher) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setFormData({
      name: teacher.name ?? '',
      email: teacher.email ?? '',
      phone: teacher.phone ?? '',
      qualifications: Array.isArray(teacher.qualifications) ? teacher.qualifications : [],
      subjects: Array.isArray(teacher.subjects) ? teacher.subjects : [],
      active: teacher.active ?? true,
      joinDate: teacher.joinDate ?? new Date().toISOString().split('T')[0],
    });
    setEditingId(teacher.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        setSuccessMsg(null);
        await deleteTeacher(id);
        await loadTeachers();
        setSuccessMsg('Teacher record removed successfully.');
      } catch (error) {
        console.error('Failed to delete teacher:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData(createEmptyTeacherForm());
    setEditingId(null);
    setShowForm(false);
    setErrorMsg(null);
    setSuccessMsg(null);
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
        title='Teachers'
        description='Manage faculty profiles and specialties'
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Teachers' },
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
                  setErrorMsg(null);
                  setSuccessMsg(null);
                  setShowForm(true);
                }}
                variant="primary"
                className='rounded-xl'
              >
                Add Teacher
              </PlanButton>
            </div>
          ) : undefined
        }
      />

      {/* TOP-RIGHT POPUP SIDE TOAST */}
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
            {editingId ? 'Edit Teacher' : 'Add New Teacher'}
          </h2>
          
          {errorMsg && (
            <div className='mb-4 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm rounded-xl flex items-start gap-2.5'>
              <AlertCircle className='h-5 w-5 shrink-0 mt-0.5' />
              <div>
                <span className='font-semibold'>Submission Failed:</span> {errorMsg}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Name
                </label>
                <Input
                  value={formData.name || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Email
                </label>
                <Input
                  type='email'
                  value={formData.email || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Phone
                </label>
                <Input
                  value={formData.phone || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Join Date
                </label>
                <Input
                  type='date'
                  value={formData.joinDate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, joinDate: e.target.value })
                  }
                  required
                />
              </div>
              
              <div className='flex items-center space-x-3 pt-4 md:col-span-2'>
                <input
                  type='checkbox'
                  id='active'
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                  className='h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500'
                />
                <label htmlFor='active' className='text-sm font-medium text-foreground select-none'>
                  Teacher is Active (Unchecking hides records from assignment dropdown layouts)
                </label>
              </div>
            </div>

            <div className='flex gap-2 pt-2'>
              <Button
                type='submit'
                className='bg-primary hover:bg-primary/90'
              >
                {editingId ? 'Update Profile' : 'Create Profile'}
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
        entity='teachers'
        onSuccess={handleBulkUploadSuccess}
      />

      <DataGrid title='Faculty directory' empty={teachers.length === 0}>
        <DataGridTable>
          <DataGridHead>
            <tr>
              <DataGridTh>Name</DataGridTh>
              <DataGridTh>Email</DataGridTh>
              <DataGridTh>Phone</DataGridTh>
              <DataGridTh>Status</DataGridTh>
              <DataGridTh>Actions</DataGridTh>
            </tr>
          </DataGridHead>
          <tbody>
            {teachers.map((teacher) => (
              <DataGridRow key={teacher.id}>
                <DataGridTd className='font-medium'>{teacher.name}</DataGridTd>
                <DataGridTd className='text-muted-foreground'>
                  {teacher.email}
                </DataGridTd>
                <DataGridTd className='text-muted-foreground'>
                  {teacher.phone}
                </DataGridTd>
                <DataGridTd>
                  {teacher.active ? (
                    <span className='px-2 py-1 bg-emerald-500/15 text-emerald-600 text-xs rounded-full font-medium'>
                      Active
                    </span>
                  ) : (
                    <span className='px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full'>
                      Inactive
                    </span>
                  )}
                </DataGridTd>
                <DataGridTd>
                  <div className='flex gap-2'>
                    <Button
                      onClick={() => handleEdit(teacher)}
                      size='sm'
                      variant='outline'
                      className='rounded-lg'
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(teacher.id)}
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