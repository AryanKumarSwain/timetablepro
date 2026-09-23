'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getSubjects,
  getClasses,
  createSubject,
  updateSubject,
  deleteSubject,
  getSchoolDetails,
} from '@/lib/api-services';
import { Subject, Class } from '@/lib/types';
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
import { Upload, CheckCircle2, Pencil, Trash2, BookOpen, Layers } from 'lucide-react';

export default function SubjectsPage() {
  useRequireAuth('admin');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [schoolPlan, setSchoolPlan] = useState<any>(null);

  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    classIds: string[];
  }>({
    name: '',
    code: '',
    classIds: [],
  });

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [subjectsData, classesData] = await Promise.all([
        getSubjects(),
        getClasses(),
      ]);
      setSubjects(subjectsData);
      setClasses(classesData);
    } catch (error) {
      console.error('Failed to load subjects data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const data = await getSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('Failed to reload subjects:', error);
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
        loadSubjects();
      } else {
        setSuccessMsg(`Subject catalog listing ${currentFormData.name} logged successfully.`);
        resetForm();
        await createSubject(currentFormData);
        loadSubjects();
      }
    } catch (error) {
      console.error('Failed to save subject:', error);
      setShowForm(true);
      setFormData(currentFormData);
    }
  };

  const handleBulkUploadSuccess = () => {
    setSuccessMsg('Bulk import successful! All curriculum course subjects initialized successfully.');
    loadData();
  };

  const handleEdit = (subject: Subject) => {
    setSuccessMsg(null);
    setFormData({
      name: subject.name,
      code: subject.code,
      classIds: Array.isArray(subject.classIds) ? subject.classIds : [],
    });
    setEditingId(subject.id);
    setShowForm(true);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
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
      classIds: [],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const toggleClassSelection = (classId: string) => {
    setFormData((prev) => {
      const exists = prev.classIds.includes(classId);
      return {
        ...prev,
        classIds: exists
          ? prev.classIds.filter((id) => id !== classId)
          : [...prev.classIds, classId],
      };
    });
  };

  const selectAllClasses = () => {
    setFormData((prev) => ({
      ...prev,
      classIds: classes.map((c) => c.id),
    }));
  };

  const clearAllClasses = () => {
    setFormData((prev) => ({
      ...prev,
      classIds: [],
    }));
  };

  // Quick lookup map: classId -> Class
  const classMap = useMemo(() => {
    const map = new Map<string, Class>();
    classes.forEach((c) => map.set(c.id, c));
    return map;
  }, [classes]);

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
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
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
          <form onSubmit={handleSubmit} className='space-y-5'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Subject Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder='e.g. Mathematics'
                  required
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Subject Code
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder='e.g. MATH101'
                  required
                />
              </div>
            </div>

            {/* CLASS LINKING / MULTI-SELECT */}
            <div className='pt-2 border-t border-border/50'>
              <div className='flex items-center justify-between mb-2'>
                <div>
                  <label className='block text-sm font-semibold text-foreground'>
                    Assign to Classes
                  </label>
                  <p className='text-xs text-muted-foreground'>
                    Select which classes study this subject (leave empty or select all for school-wide)
                  </p>
                </div>
                {classes.length > 0 && (
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={selectAllClasses}
                      className='text-xs font-medium text-primary hover:underline'
                    >
                      Select All
                    </button>
                    <span className='text-xs text-muted-foreground'>•</span>
                    <button
                      type='button'
                      onClick={clearAllClasses}
                      className='text-xs font-medium text-muted-foreground hover:text-foreground'
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {classes.length === 0 ? (
                <div className='p-3 bg-muted/40 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground'>
                  No classes created yet. You can create classes first under the Classes tab.
                </div>
              ) : (
                <div className='flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto p-1'>
                  {classes.map((cls) => {
                    const isSelected = formData.classIds.includes(cls.id);
                    const label = cls.section ? `${cls.name} (${cls.section})` : cls.name;
                    return (
                      <button
                        key={cls.id}
                        type='button'
                        onClick={() => toggleClassSelection(cls.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[10px] border ${
                          isSelected ? 'bg-primary-foreground text-primary border-primary-foreground' : 'border-muted-foreground/40'
                        }`}>
                          {isSelected && '✓'}
                        </span>
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className='mt-2 flex items-center gap-2 text-xs text-muted-foreground'>
                <span className='inline-block w-2 h-2 rounded-full bg-primary/70' />
                {formData.classIds.length === 0 ? (
                  <span>Applies to <strong>All Classes</strong> (School-wide)</span>
                ) : (
                  <span>Selected for <strong>{formData.classIds.length}</strong> of {classes.length} classes</span>
                )}
              </div>
            </div>

            <div className='flex gap-2 pt-3 border-t border-border/50'>
              <Button
                type='submit'
                className='bg-primary hover:bg-primary/90'
              >
                {editingId ? 'Update Subject' : 'Create Subject'}
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
              <DataGridTh className='w-1/3 min-w-[160px]'>Name</DataGridTh>
              <DataGridTh className='w-1/6 min-w-[100px]'>Code</DataGridTh>
              <DataGridTh className='w-1/3 min-w-[180px]'>Assigned Classes</DataGridTh>
              <DataGridTh className='w-1/6 text-right pr-6'>Actions</DataGridTh>
            </tr>
          </DataGridHead>
          <tbody>
            {subjects.map((subject) => {
              const hasClasses = Array.isArray(subject.classIds) && subject.classIds.length > 0;
              return (
                <DataGridRow key={subject.id}>
                  <DataGridTd className='font-medium text-foreground'>
                    <div className='flex flex-col gap-1'>
                      <span>{subject.name}</span>
                      <span className='sm:hidden inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-medium bg-muted text-muted-foreground border border-border/50 w-fit'>
                        {subject.code}
                      </span>
                    </div>
                  </DataGridTd>
                  <DataGridTd className='text-muted-foreground'>
                    <span className='inline-flex items-center px-2.5 py-0.5 rounded-md font-mono text-xs font-medium bg-muted text-muted-foreground border border-border/50'>
                      {subject.code}
                    </span>
                  </DataGridTd>
                  <DataGridTd>
                    {hasClasses ? (
                      <div className='flex flex-wrap gap-1 max-w-sm'>
                        {subject.classIds!.map((cid) => {
                          const cls = classMap.get(cid);
                          const label = cls ? (cls.section ? `${cls.name} (${cls.section})` : cls.name) : cid;
                          return (
                            <span
                              key={cid}
                              className='inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-primary/10 text-primary border border-primary/20'
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className='inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/50'>
                        All Classes
                      </span>
                    )}
                  </DataGridTd>
                  <DataGridTd className='text-right pr-6'>
                    <div className='flex items-center justify-end gap-2'>
                      <Button
                        onClick={() => handleEdit(subject)}
                        size='sm'
                        variant='outline'
                        className='rounded-lg h-8'
                      >
                        <Pencil className='h-3.5 w-3.5 mr-1 text-muted-foreground' />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(subject.id)}
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
              );
            })}
          </tbody>
        </DataGridTable>
      </DataGrid>
    </div>
  );
}