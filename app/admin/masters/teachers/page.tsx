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
import { Upload } from 'lucide-react';

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

  useEffect(() => {
    loadTeachers();
  }, []);

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
    try {
      if (editingId) {
        await updateTeacher(editingId, formData);
      } else {
        await createTeacher(formData);
      }
      await loadTeachers();
      resetForm();
    } catch (error) {
      console.error('Failed to save teacher:', error);
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setFormData({
      name: teacher.name ?? '',
      email: teacher.email ?? '',
      phone: teacher.phone ?? '',
      qualifications: Array.isArray(teacher.qualifications)
        ? teacher.qualifications
        : [],
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
        await deleteTeacher(id);
        await loadTeachers();
      } catch (error) {
        console.error('Failed to delete teacher:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData(createEmptyTeacherForm());
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
    <div className='max-w-7xl mx-auto'>
      <PageHeader
        title='Teachers'
        description='Manage faculty profiles and specialties'
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Masters' },
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
              <Button
                onClick={() => setShowForm(true)}
                className='rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600'
              >
                Add Teacher
              </Button>
            </div>
          ) : undefined
        }
      />

      {showForm && (
        <Card className='p-6 mb-6 border-border'>
          <h2 className='text-xl font-semibold text-foreground mb-4'>
            {editingId ? 'Edit Teacher' : 'Add New Teacher'}
          </h2>
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
            </div>

            <div className='flex gap-2'>
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
        entity='teachers'
        onSuccess={() => void loadTeachers()}
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
