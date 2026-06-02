'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from '@/lib/api-services';
import { Subject } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BulkCsvImportModal } from '@/components/enterprise/bulk-csv-import-modal';
import { Upload } from 'lucide-react';

export default function SubjectsPage() {
  useRequireAuth('admin');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Subject, 'id'>>({
    name: '',
    code: '',
    credits: 3,
    description: '',
  });

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const data = await getSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('Failed to load subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateSubject(editingId, formData);
      } else {
        await createSubject(formData);
      }
      loadSubjects();
      resetForm();
    } catch (error) {
      console.error('Failed to save subject:', error);
    }
  };

  const handleEdit = (subject: Subject) => {
    setFormData({
      name: subject.name,
      code: subject.code,
      credits: subject.credits,
      description: subject.description || '',
    });
    setEditingId(subject.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteSubject(id);
        loadSubjects();
      } catch (error) {
        console.error('Failed to delete subject:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      credits: 3,
      description: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className='p-6'>
        <p className='text-muted-foreground'>Loading subjects...</p>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto p-6'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-foreground mb-1'>
            Subjects
          </h1>
          <p className='text-muted-foreground'>Manage course subjects</p>
        </div>
        {!showForm && (
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={() => setImportOpen(true)}
            >
              <Upload className='h-4 w-4 mr-1.5' />
              Import CSV
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              className='bg-primary hover:bg-primary/90'
            >
              Add Subject
            </Button>
          </div>
        )}
      </div>

      {showForm && (
        <Card className='p-6 mb-6 border-border'>
          <h2 className='text-xl font-semibold text-foreground mb-4'>
            {editingId ? 'Edit Subject' : 'Add New Subject'}
          </h2>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Code
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Credits
                </label>
                <Input
                  type='number'
                  value={formData.credits}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      credits: parseInt(e.target.value) || 3,
                    })
                  }
                  required
                />
              </div>
              <div className='md:col-span-2'>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    })
                  }
                  className='w-full px-3 py-2 bg-input border border-border rounded-md text-foreground'
                  rows={3}
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
        entity='subjects'
        onSuccess={() => void loadSubjects()}
      />

      {/* Subjects List */}
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead>
            <tr className='border-b border-border'>
              <th className='text-left py-3 px-4 font-semibold text-foreground'>
                Name
              </th>
              <th className='text-left py-3 px-4 font-semibold text-foreground'>
                Code
              </th>
              <th className='text-left py-3 px-4 font-semibold text-foreground'>
                Credits
              </th>
              <th className='text-left py-3 px-4 font-semibold text-foreground'>
                Description
              </th>
              <th className='text-left py-3 px-4 font-semibold text-foreground'>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr
                key={subject.id}
                className='border-b border-border hover:bg-card/50 transition'
              >
                <td className='py-3 px-4 text-foreground font-medium'>
                  {subject.name}
                </td>
                <td className='py-3 px-4 text-muted-foreground'>
                  {subject.code}
                </td>
                <td className='py-3 px-4 text-muted-foreground'>
                  {subject.credits}
                </td>
                <td className='py-3 px-4 text-muted-foreground text-sm'>
                  {subject.description}
                </td>
                <td className='py-3 px-4'>
                  <div className='flex gap-2'>
                    <Button
                      onClick={() => handleEdit(subject)}
                      size='sm'
                      variant='outline'
                      className='border-border hover:bg-card'
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(subject.id)}
                      size='sm'
                      variant='outline'
                      className='border-destructive/30 text-destructive hover:bg-destructive/10'
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
