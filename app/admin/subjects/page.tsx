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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Upload, CheckCircle2, Pencil, Trash2, BookOpen, Layers, Eye, AlertCircle } from 'lucide-react';

export default function SubjectsPage() {
  useRequireAuth('admin');

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedSubjectForView, setSelectedSubjectForView] = useState<Subject | null>(null);
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [schoolPlan, setSchoolPlan] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState<{
    name: string;
    classIds: string[];
  }>({
    name: '',
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

  // Auto-dismiss timers
  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => {
      setSuccessMsg(null);
    }, 2500);
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

  // Check if subject name already exists (excluding the currently edited subject)
  const isDuplicateName = useMemo(() => {
    const raw = (formData.name || '').trim().toLowerCase();
    if (!raw) return false;
    return subjects.some(
      (s) => s.id !== editingId && s.name.trim().toLowerCase() === raw
    );
  }, [subjects, editingId, formData.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const rawName = formData.name.trim();
    if (!rawName) return;

    if (isDuplicateName) {
      setErrorMsg(`Subject "${rawName}" already exists! Same name subjects cannot be added.`);
      return;
    }

    // Auto-generate a clean internal code from subject name for backend compatibility
    const code =
      rawName
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 5) || rawName.slice(0, 4).toUpperCase();

    const payload = {
      name: rawName,
      code,
      classIds: formData.classIds,
    };

    try {
      if (editingId) {
        setSuccessMsg(`Subject parameters for ${payload.name} customized successfully.`);
        resetForm();
        await updateSubject(editingId, payload);
        loadSubjects();
      } else {
        setSuccessMsg(`Subject catalog listing ${payload.name} logged successfully.`);
        resetForm();
        await createSubject(payload);
        loadSubjects();
      }
    } catch (error: any) {
      console.error('Failed to save subject:', error);
      setErrorMsg(error?.message || 'Failed to save subject');
      setShowForm(true);
    }
  };

  const handleBulkUploadSuccess = () => {
    setSuccessMsg('Bulk import successful! All curriculum course subjects initialized successfully.');
    loadData();
  };

  const handleEdit = (subject: Subject) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    setFormData({
      name: subject.name,
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
      } catch (error: any) {
        console.error('Failed to delete subject:', error);
        setErrorMsg(error?.message || 'Failed to delete subject');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      classIds: [],
    });
    setEditingId(null);
    setErrorMsg(null);
    setShowForm(false);
  };

  // Helper to extract base class name (e.g. "Class 1-A" -> "class 1", "L.K.G" -> "l.k.g")
  const getBaseClassName = (name: string) => {
    return name
      .trim()
      .replace(/[-_\s]+[A-Za-z0-9]$/, '')
      .replace(/\s*\([A-Za-z0-9]\)\s*$/, '')
      .trim()
      .toLowerCase();
  };

  const toggleClassSelection = (classId: string, singleOnly = false) => {
    const target = classes.find((c) => c.id === classId);
    if (!target) return;

    if (singleOnly) {
      setFormData((prev) => {
        const exists = prev.classIds.includes(classId);
        return {
          ...prev,
          classIds: exists
            ? prev.classIds.filter((id) => id !== classId)
            : [...prev.classIds, classId],
        };
      });
      return;
    }

    const targetBase = getBaseClassName(target.name);
    const siblingClasses = classes.filter(
      (c) => getBaseClassName(c.name) === targetBase
    );
    const siblingIds = siblingClasses.map((c) => c.id);

    setFormData((prev) => {
      // If not all sibling sections are selected -> auto-select ALL sections of this class
      const allSelected = siblingIds.every((id) => prev.classIds.includes(id));
      if (allSelected) {
        return {
          ...prev,
          classIds: prev.classIds.filter((id) => !siblingIds.includes(id)),
        };
      } else {
        const next = new Set([...prev.classIds, ...siblingIds]);
        return {
          ...prev,
          classIds: Array.from(next),
        };
      }
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

  // Filtered subjects list based on search query
  const filteredSubjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return subjects;

    return subjects.filter((subject) => {
      // 1. Name match
      if (subject.name?.toLowerCase().includes(q)) return true;

      // 2. Code match
      if (subject.code?.toLowerCase().includes(q)) return true;

      // 3. Assigned classes match (or "all classes")
      const hasClasses = Array.isArray(subject.classIds) && subject.classIds.length > 0;
      if (!hasClasses && 'all classes'.includes(q)) return true;

      if (hasClasses) {
        const matchesClass = subject.classIds!.some((cid) => {
          const cls = classMap.get(cid);
          if (!cls) return cid.toLowerCase().includes(q);
          const nameMatch = cls.name?.toLowerCase().includes(q);
          const secMatch = cls.section?.toLowerCase().includes(q);
          const combined = `${cls.name} ${cls.section}`.toLowerCase();
          return nameMatch || secMatch || combined.includes(q);
        });
        if (matchesClass) return true;
      }

      return false;
    });
  }, [subjects, searchQuery, classMap]);

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

      {/* TOP-RIGHT POPUP TOAST BOX - SUCCESS */}
      {successMsg && (
        <div className='fixed top-6 right-6 z-50 max-w-sm p-4 bg-white dark:bg-zinc-900 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm rounded-xl shadow-xl flex items-start gap-3 animate-in slide-in-from-top-4 fade-in duration-300'>
          <CheckCircle2 className='h-5 w-5 shrink-0 text-emerald-500 mt-0.5' />
          <div>
            <p className='font-semibold mb-0.5'>Action Successful</p>
            <p className='text-zinc-600 dark:text-zinc-400 text-xs leading-relaxed'>{successMsg}</p>
          </div>
        </div>
      )}

      {/* TOP-RIGHT POPUP TOAST BOX - ERROR */}
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
            {editingId ? 'Edit Subject' : 'Add New Subject'}
          </h2>
          <form onSubmit={handleSubmit} className='space-y-5'>
            <div>
              <label className='block text-sm font-medium text-foreground mb-2'>
                Subject Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => {
                  setErrorMsg(null);
                  setFormData({ ...formData, name: e.target.value });
                }}
                placeholder='e.g. Mathematics, English, SST'
                required
              />
              {isDuplicateName && (
                <p className='text-xs text-rose-500 font-medium flex items-center gap-1.5 mt-1.5'>
                  <AlertCircle className='h-3.5 w-3.5 shrink-0' />
                  Subject "{formData.name.trim()}" already exists! Same name subjects are not allowed.
                </p>
              )}
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
                        onClick={(e) => toggleClassSelection(cls.id, e.shiftKey || e.ctrlKey || e.altKey)}
                        title='Click to auto-select all sections of this class (Shift+Click for single section)'
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
              <div className='mt-2 flex items-center justify-between text-xs text-muted-foreground'>
                <div className='flex items-center gap-2'>
                  <span className='inline-block w-2 h-2 rounded-full bg-primary/70' />
                  {formData.classIds.length === 0 ? (
                    <span>Applies to <strong>All Classes</strong> (School-wide)</span>
                  ) : (
                    <span>Selected for <strong>{formData.classIds.length}</strong> of {classes.length} classes</span>
                  )}
                </div>
                <span className='text-[11px] text-muted-foreground/70 italic hidden sm:inline'>
                  * Class par click karte hi uske saare sections auto-select ho jayenge
                </span>
              </div>
            </div>

            <div className='flex gap-2 pt-3 border-t border-border/50'>
              <Button
                type='submit'
                className='bg-primary hover:bg-primary/90'
                disabled={isDuplicateName || !formData.name.trim()}
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

      <DataGrid
        title='Subjects list'
        searchPlaceholder='Search subjects by name or class...'
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        empty={filteredSubjects.length === 0}
        emptyMessage={
          searchQuery.trim()
            ? `No subjects found matching "${searchQuery}"`
            : 'No subjects found'
        }
      >
        {/* DESKTOP TABLE VIEW */}
        <div className='hidden md:block'>
          <DataGridTable>
            <DataGridHead>
              <tr>
                <DataGridTh className='w-1/2 min-w-[200px]'>Name</DataGridTh>
                <DataGridTh className='w-1/3 min-w-[180px]'>Assigned Classes</DataGridTh>
                <DataGridTh className='w-1/6 min-w-[180px] text-right pr-6'>Actions</DataGridTh>
              </tr>
            </DataGridHead>
            <tbody>
              {filteredSubjects.map((subject) => {
                const hasClasses = Array.isArray(subject.classIds) && subject.classIds.length > 0;
                return (
                  <DataGridRow key={subject.id}>
                    <DataGridTd className='font-medium text-foreground'>
                      <span>{subject.name}</span>
                    </DataGridTd>
                    <DataGridTd>
                      {hasClasses ? (
                        <div className='flex flex-wrap items-center gap-1 max-w-sm'>
                          {subject.classIds!.slice(0, 3).map((cid) => {
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
                          {subject.classIds!.length > 3 && (
                            <span
                              title={subject.classIds!
                                .slice(3)
                                .map((cid) => {
                                  const cls = classMap.get(cid);
                                  return cls ? (cls.section ? `${cls.name} (${cls.section})` : cls.name) : cid;
                                })
                                .join(', ')}
                              className='inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary/15 text-primary border border-primary/30 cursor-help'
                            >
                              +{subject.classIds!.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className='inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border/50'>
                          All Classes
                        </span>
                      )}
                    </DataGridTd>
                    <DataGridTd className='text-right pr-6'>
                      <div className='flex items-center justify-end gap-1.5'>
                        <Button
                          onClick={() => setSelectedSubjectForView(subject)}
                          size='sm'
                          variant='ghost'
                          className='rounded-lg h-8 text-primary hover:bg-primary/10'
                        >
                          <Eye className='h-3.5 w-3.5 mr-1' />
                          View
                        </Button>
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
        </div>

        {/* MOBILE COMPACT LIST VIEW - NO HORIZONTAL SCROLL NEEDED */}
        <div className='block md:hidden divide-y divide-border/40'>
          {filteredSubjects.map((subject) => {
            const hasClasses = Array.isArray(subject.classIds) && subject.classIds.length > 0;
            return (
              <div
                key={subject.id}
                className='p-3.5 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors'
              >
                {/* Left Side: Subject Name & below it Assigned classes */}
                <div className='min-w-0 flex-1'>
                  <p className='font-semibold text-sm text-foreground truncate'>
                    {subject.name}
                  </p>
                  <div className='flex items-center gap-2 mt-1'>
                    {hasClasses ? (
                      <span className='inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary'>
                        {subject.classIds!.length} {subject.classIds!.length === 1 ? 'class' : 'classes'}
                      </span>
                    ) : (
                      <span className='inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground'>
                        All Classes
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Side: View, Edit, Delete options side by side */}
                <div className='flex items-center gap-1 shrink-0'>
                  <Button
                    onClick={() => setSelectedSubjectForView(subject)}
                    size='sm'
                    variant='outline'
                    className='h-8 px-2 text-xs text-primary border-primary/30 rounded-lg hover:bg-primary/10'
                    title='View details'
                  >
                    <Eye className='h-3.5 w-3.5 mr-1' />
                    View
                  </Button>
                  <Button
                    onClick={() => handleEdit(subject)}
                    size='sm'
                    variant='outline'
                    className='h-8 px-2 text-xs rounded-lg'
                    title='Edit'
                  >
                    <Pencil className='h-3.5 w-3.5 mr-1 text-muted-foreground' />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(subject.id)}
                    size='sm'
                    variant='outline'
                    className='h-8 px-2 text-xs border-rose-500/30 text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30'
                    title='Delete'
                  >
                    <Trash2 className='h-3.5 w-3.5 mr-1' />
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DataGrid>

      {/* SUBJECT DETAILS MODAL / DIALOG */}
      <Dialog
        open={!!selectedSubjectForView}
        onOpenChange={(open) => !open && setSelectedSubjectForView(null)}
      >
        {selectedSubjectForView && (
          <DialogContent className='sm:max-w-md rounded-2xl'>
            <DialogHeader>
              <DialogTitle className='text-xl font-bold flex items-center gap-2'>
                <BookOpen className='h-5 w-5 text-primary' />
                {selectedSubjectForView.name}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Subject Profile & Assigned Classes
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-3.5 py-2 text-sm'>
              <div className='flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50'>
                <BookOpen className='h-4 w-4 text-primary shrink-0' />
                <div className='min-w-0 flex-1'>
                  <p className='text-xs text-muted-foreground font-medium'>Subject Name</p>
                  <p className='font-semibold text-foreground'>{selectedSubjectForView.name}</p>
                </div>
              </div>

              {/* ASSIGNED CLASSES */}
              <div className='p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1.5'>
                <div className='flex items-center justify-between gap-2 text-xs text-muted-foreground font-medium'>
                  <div className='flex items-center gap-2'>
                    <Layers className='h-4 w-4 text-primary' />
                    <span>Assigned Classes</span>
                  </div>
                  {Array.isArray(selectedSubjectForView.classIds) && selectedSubjectForView.classIds.length > 0 && (
                    <span className='text-[11px] font-semibold text-primary'>
                      {selectedSubjectForView.classIds.length} Total
                    </span>
                  )}
                </div>
                {Array.isArray(selectedSubjectForView.classIds) && selectedSubjectForView.classIds.length > 0 ? (
                  <div className='flex flex-wrap gap-1.5 pt-1 max-h-48 overflow-y-auto'>
                    {selectedSubjectForView.classIds.map((cid) => {
                      const cls = classMap.get(cid);
                      const label = cls ? (cls.section ? `${cls.name} (${cls.section})` : cls.name) : cid;
                      return (
                        <span
                          key={cid}
                          className='px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-md border border-primary/20 font-medium'
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className='text-xs text-muted-foreground italic'>Applicable to All Classes</p>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}