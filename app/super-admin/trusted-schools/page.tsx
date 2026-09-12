'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
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
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';

interface TrustedSchool {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export default function TrustedSchoolsPage() {
  useRequireAuth('super-admin');

  const [trustedSchools, setTrustedSchools] = useState<TrustedSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<TrustedSchool, 'id' | 'createdAt' | 'updatedAt' | 'order'>>({
    name: '',
    isActive: true,
  });

  useEffect(() => {
    loadTrustedSchools();
  }, []);

  const loadTrustedSchools = async () => {
    try {
      const response = await fetch('/api/admin/trusted-schools');
      if (response.ok) {
        const data = await response.json();
        setTrustedSchools(data);
      }
    } catch (error) {
      console.error('Error loading trusted schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/admin/trusted-schools';
      const method = editingId ? 'PUT' : 'POST';
      
      const body = editingId 
        ? { ...formData, id: editingId }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setSuccessMsg(editingId ? 'School updated successfully' : 'School added successfully');
        setTimeout(() => setSuccessMsg(null), 3000);
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: '', isActive: true });
        loadTrustedSchools();
      }
    } catch (error) {
      console.error('Error saving trusted school:', error);
    }
  };

  const handleEdit = (school: TrustedSchool) => {
    setEditingId(school.id);
    setFormData({
      name: school.name,
      isActive: school.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this school?')) return;
    
    try {
      const response = await fetch(`/api/admin/trusted-schools?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccessMsg('School deleted successfully');
        setTimeout(() => setSuccessMsg(null), 3000);
        loadTrustedSchools();
      }
    } catch (error) {
      console.error('Error deleting trusted school:', error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', isActive: true });
  };

  if (loading) {
    return <div className='p-8'>Loading...</div>;
  }

  return (
    <div className='p-8'>
      <PageHeader
        title='Trusted Schools'
        description='Manage schools displayed on the landing page'
      />

      {successMsg && (
        <div className='mb-4 rounded-lg bg-emerald-50 p-4 text-emerald-800'>
          {successMsg}
        </div>
      )}

      <Card className='p-6'>
        {!showForm ? (
          <div className='mb-6'>
            <Button onClick={() => setShowForm(true)} className='gap-2'>
              <Plus className='h-4 w-4' />
              Add School
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className='mb-6 rounded-lg border border-slate-200 dark:border-slate-800 p-6'>
            <h3 className='mb-4 text-lg font-semibold'>
              {editingId ? 'Edit School' : 'Add New School'}
            </h3>
            <div className='flex flex-col sm:flex-row items-stretch sm:items-end gap-4 max-w-2xl'>
              <div className='flex-1'>
                <label className='mb-2 block text-sm font-medium'>School Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder='Enter school name'
                  required
                />
              </div>
              <div className='flex items-center gap-2'>
                <Button type='submit' className='gap-2'>
                  <Save className='h-4 w-4' />
                  {editingId ? 'Update' : 'Add'}
                </Button>
                <Button type='button' variant='outline' onClick={handleCancel} className='gap-2'>
                  <X className='h-4 w-4' />
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        )}

        <DataGrid>
          <DataGridTable>
            <DataGridHead>
              <DataGridRow>
                <DataGridTh>Name</DataGridTh>
                <DataGridTh>Status</DataGridTh>
                <DataGridTh className='text-right'>Actions</DataGridTh>
              </DataGridRow>
            </DataGridHead>
            <tbody>
              {trustedSchools.map((school) => (
                <DataGridRow key={school.id}>
                  <DataGridTd>{school.name}</DataGridTd>
                  <DataGridTd>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        school.isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {school.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </DataGridTd>
                  <DataGridTd className='text-right'>
                    <div className='flex justify-end gap-2'>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleEdit(school)}
                        className='gap-1'
                      >
                        <Edit2 className='h-4 w-4' />
                        Edit
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        onClick={() => handleDelete(school.id)}
                        className='gap-1 text-red-600 hover:text-red-700'
                      >
                        <Trash2 className='h-4 w-4' />
                        Delete
                      </Button>
                    </div>
                  </DataGridTd>
                </DataGridRow>
              ))}
              {trustedSchools.length === 0 && (
                <DataGridRow>
                  <DataGridTd colSpan={3} className='text-center text-slate-500 py-8'>
                    No trusted schools found. Add your first school above.
                  </DataGridTd>
                </DataGridRow>
              )}
            </tbody>
          </DataGridTable>
        </DataGrid>
      </Card>
    </div>
  );
}
