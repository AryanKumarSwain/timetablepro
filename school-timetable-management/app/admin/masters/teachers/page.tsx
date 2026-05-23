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

export default function TeachersPage() {
  useRequireAuth('admin');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Teacher, 'id'>>({
    name: '',
    email: '',
    phone: '',
    qualifications: [],
    subjects: [],
    active: true,
    joinDate: new Date().toISOString().split('T')[0],
  });

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
      loadTeachers();
      resetForm();
    } catch (error) {
      console.error('Failed to save teacher:', error);
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setFormData({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      qualifications: teacher.qualifications,
      subjects: teacher.subjects,
      active: teacher.active,
      joinDate: teacher.joinDate,
    });
    setEditingId(teacher.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteTeacher(id);
        loadTeachers();
      } catch (error) {
        console.error('Failed to delete teacher:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      qualifications: [],
      subjects: [],
      active: true,
      joinDate: new Date().toISOString().split('T')[0],
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className='p-6'>
        <p className='text-muted-foreground'>Loading teachers...</p>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto p-6'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-foreground mb-1'>
            Teachers
          </h1>
          <p className='text-muted-foreground'>Manage school teachers</p>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className='bg-primary hover:bg-primary/90'
          >
            Add Teacher
          </Button>
        )}
      </div>

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
                  value={formData.name}
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
                  value={formData.email}
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
                  value={formData.phone}
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
                  value={formData.joinDate}
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

      {/* Teachers List */}
      <div className='overflow-x-auto'>
        <table className='w-full'>
          <thead>
            <tr className='border-b border-border'>
              <th className='text-left py-3 px-4 font-semibold text-foreground'>
                Name
              </th>
              <th className='text-left py-3 px-4 font-semibold text-foreground'>
                Email
              </th>
              <th className='text-left py-3 px-4 font-semibold text-foreground'>
                Phone
              </th>
              <th className='text-left py-3 px-4 font-semibold text-foreground'>
                Status
              </th>
              <th className='text-left py-3 px-4 font-semibold text-foreground'>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((teacher) => (
              <tr
                key={teacher.id}
                className='border-b border-border hover:bg-card/50 transition'
              >
                <td className='py-3 px-4 text-foreground'>{teacher.name}</td>
                <td className='py-3 px-4 text-muted-foreground'>
                  {teacher.email}
                </td>
                <td className='py-3 px-4 text-muted-foreground'>
                  {teacher.phone}
                </td>
                <td className='py-3 px-4'>
                  {teacher.active ? (
                    <span className='px-2 py-1 bg-green-500/20 text-green-600 dark:text-green-400 text-xs rounded-full'>
                      Active
                    </span>
                  ) : (
                    <span className='px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full'>
                      Inactive
                    </span>
                  )}
                </td>
                <td className='py-3 px-4'>
                  <div className='flex gap-2'>
                    <Button
                      onClick={() => handleEdit(teacher)}
                      size='sm'
                      variant='outline'
                      className='border-border hover:bg-card'
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(teacher.id)}
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
