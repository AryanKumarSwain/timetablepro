'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getSchoolDetails,
} from '@/lib/api-services';
import { Subject } from '@/lib/types';
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

export default function SubjectsPage() {
  useRequireAuth('admin');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [schoolPlan, setSchoolPlan] = useState<any>(null);

  // Kept only Name and Code properties
  const [formData, setFormData] = useState<Omit<Subject, 'id' | 'credits' | 'description'>>({
    name: '',
    code: '',
  });

  useEffect(() => {
    loadSubjects();
    loadSchoolPlan();
  }, []);

  const loadSchoolPlan = async () => {
    try {
      const schoolData = await getSchoolDetails();
      setSchoolPlan(schoolData.plan);
    } catch (error) {
      console.error('Failed to load school plan:', error);
    }
  };

  // 2-second auto-dismiss timer for notifications
  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => {
      setSuccessMsg(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [successMsg]);

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
    const currentFormData = { ...formData };
    
    try {
      if (editingId) {
        setSuccessMsg(`Subject parameters for ${currentFormData.name} customized successfully.`);
        resetForm();
        await updateSubject(editingId, currentFormData);
        loadSubjects(); // Runs quietly in background
      } else {
        // Optimistic instant response mapping layout
        setSuccessMsg(`Subject catalog listing ${currentFormData.name} logged successfully.`);
        resetForm();
        await createSubject(currentFormData);
        loadSubjects(); // Runs quietly in background
      }
    } catch (error) {
      console.error('Failed to save subject:', error);
      setShowForm(true);
      setFormData(currentFormData);
    }
  };

  const handleBulkUploadSuccess = () => {
    setSuccessMsg('Bulk import successful! All curriculum course subjects initialized successfully.');
    loadSubjects();
  };

  const handleEdit = (subject: Subject) => {
    setSuccessMsg(null);
    setFormData({
      name: subject.name,
      code: subject.code,
    });
    setEditingId(subject.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        setSuccessMsg('Subject catalog listing removed successfully.');
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
        title='Subjects'
        description={`Manage course subjects (${subjects.length}/50)`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Subjects' },
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
                Add Subject
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
                  placeholder='Mathematics'
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
                  placeholder='MATH101'
                  required
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
        entity='subjects'
        onSuccess={handleBulkUploadSuccess}
      />

      <DataGrid title='Subjects list' empty={subjects.length === 0}>
        <DataGridTable>
          <DataGridHead>
            <tr>
              <DataGridTh>Name</DataGridTh>
              <DataGridTh>Code</DataGridTh>
              <DataGridTh>Actions</DataGridTh>
            </tr>
          </DataGridHead>
          <tbody>
            {subjects.map((subject) => (
              <DataGridRow key={subject.id}>
                <DataGridTd className='font-medium text-foreground'>
                  {subject.name}
                </DataGridTd>
                <DataGridTd className='text-muted-foreground'>
                  {subject.code}
                </DataGridTd>
                <DataGridTd>
                  <div className='flex gap-2'>
                    <Button
                      onClick={() => handleEdit(subject)}
                      size='sm'
                      variant='outline'
                      className='rounded-lg'
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(subject.id)}
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