'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getTeachers,
} from '@/lib/api-services';
import { Class, Teacher } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { BulkCsvImportModal } from '@/components/enterprise/bulk-csv-import-modal';
import { Upload } from 'lucide-react';

export default function ClassesPage() {
  useRequireAuth('admin');

  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<Class, 'id'>>({
    name: '',
    classLevel: 9,
    section: '',
    strength: 0,
    classTeacher: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesData, teachersData] = await Promise.all([
        getClasses(),
        getTeachers(),
      ]);
      setClasses(classesData);
      setTeachers(teachersData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateClass(editingId, formData);
      } else {
        await createClass(formData);
      }
      loadData();
      resetForm();
    } catch (error) {
      console.error('Failed to save class:', error);
    }
  };

  const handleEdit = (cls: Class) => {
    setFormData({
      name: cls.name,
      classLevel: cls.classLevel,
      section: cls.section,
      strength: cls.strength,
      classTeacher: cls.classTeacher,
    });
    setEditingId(cls.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
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
      classLevel: 9,
      section: '',
      strength: 0,
      classTeacher: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className='p-6'>
        <p className='text-muted-foreground'>Loading classes...</p>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto p-6'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-foreground mb-1'>Classes</h1>
          <p className='text-muted-foreground'>Manage school classes</p>
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
              Add Class
            </Button>
          </div>
        )}
      </div>

      {showForm && (
        <Card className='p-6 mb-6 border-border'>
          <h2 className='text-xl font-semibold text-foreground mb-4'>
            {editingId ? 'Edit Class' : 'Add New Class'}
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
                  placeholder='Class 10-A'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Class Level
                </label>
                <select
                  value={formData.classLevel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      classLevel: parseInt(e.target.value),
                    })
                  }
                  className='w-full px-3 py-2 bg-input border border-border rounded-md text-foreground'
                  required
                >
                  {[...Array(4)].map((_, i) => (
                    <option key={i + 9} value={i + 9}>
                      Class {i + 9}
                    </option>
                  ))}
                </select>
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
                  Strength
                </label>
                <Input
                  type='number'
                  value={formData.strength}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      strength: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
              <div className='md:col-span-2'>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Class Teacher
                </label>
                <select
                  value={formData.classTeacher}
                  onChange={(e) =>
                    setFormData({ ...formData, classTeacher: e.target.value })
                  }
                  className='w-full px-3 py-2 bg-input border border-border rounded-md text-foreground'
                  required
                >
                  <option value=''>Select a teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
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
        entity='classes'
        onSuccess={() => void loadData()}
      />

      {/* Classes List */}
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead>
            <tr className='border-b border-border'>
              <th className='text-left py-3 px-4 font-semibold text-foreground'>
                Name
              </th>
              <th className='text-left py-3 px-4 font-semibold text-foreground'>
                Level
              </th>
              <th className='text-left py-3 px-4 font-semibold text-foreground'>
                Strength
              </th>
              <th className='text-left py-3 px-4 font-semibold text-foreground'>
                Class Teacher
              </th>
              <th className='text-left py-3 px-4 font-semibold text-foreground'>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => {
              const teacher = teachers.find((t) => t.id === cls.classTeacher);
              return (
                <tr
                  key={cls.id}
                  className='border-b border-border hover:bg-card/50 transition'
                >
                  <td className='py-3 px-4 text-foreground font-medium'>
                    {cls.name}
                  </td>
                  <td className='py-3 px-4 text-muted-foreground'>
                    {cls.classLevel}
                  </td>
                  <td className='py-3 px-4 text-muted-foreground'>
                    {cls.strength}
                  </td>
                  <td className='py-3 px-4 text-muted-foreground'>
                    {teacher?.name || 'Unassigned'}
                  </td>
                  <td className='py-3 px-4'>
                    <div className='flex gap-2'>
                      <Button
                        onClick={() => handleEdit(cls)}
                        size='sm'
                        variant='outline'
                        className='border-border hover:bg-card'
                      >
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(cls.id)}
                        size='sm'
                        variant='outline'
                        className='border-destructive/30 text-destructive hover:bg-destructive/10'
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
