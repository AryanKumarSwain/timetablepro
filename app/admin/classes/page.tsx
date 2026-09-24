'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getSchoolDetails,
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
import { Upload, CheckCircle2, Pencil, Trash2, AlertCircle } from 'lucide-react';

export default function ClassesPage() {
  useRequireAuth('admin');

  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [schoolPlan, setSchoolPlan] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

  // Cleaned up form state containing only Name and Section
  const [formData, setFormData] = useState<Omit<Class, 'id' | 'strength' | 'classTeacher' | 'roomNumber'>>({
    name: '',
    section: 'A',
  });
  const [selectedSections, setSelectedSections] = useState<string[]>(['A']);

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

  // Auto-dismiss timers for notifications
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
      const classesData = await getClasses();
      // Sort classes by grade (numeric) and then section (alphabetical)
      const sortedClasses = classesData.sort((a, b) => {
        const gradeA = parseInt(a.grade || '0');
        const gradeB = parseInt(b.grade || '0');
        if (gradeA !== gradeB) {
          return gradeA - gradeB;
        }
        return (a.section || '').localeCompare(b.section || '');
      });
      setClasses(sortedClasses);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Find all sections already taken by other classes with the current class name
  const takenSectionsForName = useMemo(() => {
    const rawName = (formData.name || '').trim().toLowerCase();
    if (!rawName) return new Set<string>();

    const taken = new Set<string>();
    classes.forEach((c) => {
      // In edit mode, exclude the class currently being edited
      if (editingId && c.id === editingId) return;
      if (c.name.trim().toLowerCase() === rawName) {
        taken.add(c.section.trim().toUpperCase());
      }
    });
    return taken;
  }, [classes, formData.name, editingId]);

  // In edit mode: check if selected section conflicts with another class with the same name
  const isDuplicateInEdit = useMemo(() => {
    if (!editingId) return false;
    const currentSec = (formData.section || '').trim().toUpperCase();
    return currentSec ? takenSectionsForName.has(currentSec) : false;
  }, [editingId, formData.section, takenSectionsForName]);

  // In create mode: check which selected sections already exist for this class name
  const duplicateSectionsInCreate = useMemo(() => {
    if (editingId) return [];
    return selectedSections.filter((sec) => takenSectionsForName.has(sec.toUpperCase()));
  }, [editingId, selectedSections, takenSectionsForName]);

  const toggleSection = (sec: string) => {
    setErrorMsg(null);
    setSelectedSections((prev) =>
      prev.includes(sec) ? prev.filter((s) => s !== sec) : [...prev, sec].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const rawName = formData.name.trim();
    if (!rawName) return;

    if (editingId) {
      const targetSection = formData.section.trim().toUpperCase() || 'A';

      // Validation: Same class name cannot have duplicate section
      if (isDuplicateInEdit) {
        setErrorMsg(
          `Class "${rawName}" with Section "${targetSection}" already exists! Same class cannot have duplicate sections.`
        );
        return;
      }

      const currentFormData = { name: rawName, section: targetSection };
      try {
        setSuccessMsg(`Class ${currentFormData.name} (${currentFormData.section}) updated successfully.`);
        resetForm();
        await updateClass(editingId, currentFormData);
        loadData();
      } catch (error: any) {
        console.error('Failed to update class:', error);
        setErrorMsg(error?.message || 'Failed to update class');
        setShowForm(true);
      }
    } else {
      if (selectedSections.length === 0) {
        setErrorMsg('Please select at least one section.');
        return;
      }

      // If user typed e.g. "Class 10-A" but selected multiple sections, clean base name to "Class 10"
      const baseName =
        selectedSections.length > 1 && /[-_\s]+[A-Fa-f]$/.test(rawName)
          ? rawName.replace(/[-_\s]+[A-Fa-f]$/, '').trim()
          : rawName;

      // Validation: Prevent duplicate sections in create mode
      if (duplicateSectionsInCreate.length > 0) {
        setErrorMsg(
          `Class "${baseName}" already has Section(s): ${duplicateSectionsInCreate.join(', ')}. Please unselect them.`
        );
        return;
      }

      try {
        const msg =
          selectedSections.length === 1
            ? `Class ${baseName} (Section ${selectedSections[0]}) created successfully.`
            : `${selectedSections.length} classes created for ${baseName} (Sections: ${selectedSections.join(', ')}).`;
        setSuccessMsg(msg);
        resetForm();

        // Create classes for all selected sections in order
        for (const sec of selectedSections) {
          await createClass({
            name: baseName,
            section: sec,
          });
        }
        loadData();
      } catch (error: any) {
        console.error('Failed to create classes:', error);
        setErrorMsg(error?.message || 'Failed to create classes');
        setShowForm(true);
      }
    }
  };

  const handleBulkUploadSuccess = () => {
    setSuccessMsg('Bulk import successful! All new classes have been saved.');
    loadData();
  };

  const handleEdit = (cls: Class) => {
    setSuccessMsg(null);
    setErrorMsg(null);
    setFormData({
      name: cls.name,
      section: cls.section || 'A',
    });
    setSelectedSections([cls.section || 'A']);
    setEditingId(cls.id);
    setShowForm(true);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure?')) {
      try {
        setSuccessMsg('Class record removed successfully.');
        await deleteClass(id);
        loadData();
      } catch (error: any) {
        console.error('Failed to delete class:', error);
        setErrorMsg(error?.message || 'Failed to delete class');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      section: 'A',
    });
    setSelectedSections(['A']);
    setEditingId(null);
    setErrorMsg(null);
    setShowForm(false);
  };

  const filteredClasses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return classes;

    return classes.filter((cls) => {
      const name = (cls.name || '').toLowerCase();
      const section = (cls.section || '').toLowerCase();
      const combined = `${name} ${section}`.toLowerCase();
      const sectionLabel = `section ${section}`.toLowerCase();
      return name.includes(q) || section.includes(q) || combined.includes(q) || sectionLabel.includes(q);
    });
  }, [classes, searchQuery]);

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
        description={`Manage school classes (${classes.length}/100)`}
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
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
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
            {editingId ? 'Edit Class' : 'Add New Class'}
          </h2>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-foreground mb-2'>
                  Class Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setFormData({ ...formData, name: e.target.value });
                  }}
                  placeholder='e.g. Class 10 or L.K.G'
                  required
                />
                <p className='text-[11px] text-muted-foreground mt-1.5'>
                  {editingId
                    ? 'Class name (e.g. L.K.G or Class 10)'
                    : 'Enter class name without section (e.g. Class 10 or L.K.G)'}
                </p>
              </div>

              <div>
                <div className='flex items-center justify-between mb-2'>
                  <label className='block text-sm font-medium text-foreground'>
                    Section {editingId ? '(Select Section)' : '(Multi-select A to F)'}
                  </label>
                  {!editingId && (
                    <div className='flex items-center gap-2'>
                      <button
                        type='button'
                        onClick={() => {
                          setErrorMsg(null);
                          setSelectedSections([...SECTION_OPTIONS]);
                        }}
                        className='text-xs text-primary hover:underline font-medium'
                      >
                        Select All (A-F)
                      </button>
                      <span className='text-xs text-muted-foreground/50'>|</span>
                      <button
                        type='button'
                        onClick={() => {
                          setErrorMsg(null);
                          setSelectedSections([]);
                        }}
                        className='text-xs text-muted-foreground hover:underline'
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {editingId ? (
                  /* Edit Mode: Select Section without redundant text box */
                  <div className='space-y-2'>
                    <div className='flex flex-wrap gap-2'>
                      {SECTION_OPTIONS.map((sec) => {
                        const isSelected = formData.section.toUpperCase() === sec;
                        const isTaken = takenSectionsForName.has(sec);
                        return (
                          <button
                            key={sec}
                            type='button'
                            onClick={() => {
                              setErrorMsg(null);
                              setFormData({ ...formData, section: sec });
                            }}
                            title={
                              isTaken
                                ? `Section ${sec} already exists for ${formData.name.trim()}`
                                : `Select Section ${sec}`
                            }
                            className={`h-10 w-11 rounded-xl text-sm font-bold transition-all border flex items-center justify-center select-none relative ${
                              isSelected
                                ? isTaken
                                  ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                                  : 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                                : isTaken
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                                : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/70 hover:text-foreground'
                            }`}
                          >
                            {sec}
                            {isTaken && (
                              <span
                                className='absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-background'
                                title='Already taken by another class'
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Only show input if user has a non-standard section */}
                    {!SECTION_OPTIONS.includes(formData.section.toUpperCase()) && (
                      <Input
                        value={formData.section}
                        onChange={(e) => {
                          setErrorMsg(null);
                          setFormData({ ...formData, section: e.target.value });
                        }}
                        placeholder='Custom section (e.g. A)'
                        required
                      />
                    )}

                    {isDuplicateInEdit ? (
                      <div className='p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2'>
                        <AlertCircle className='h-4 w-4 shrink-0' />
                        <span>
                          Class <strong>{formData.name.trim()}</strong> with <strong>Section {formData.section}</strong> already exists. Duplicate sections are not allowed!
                        </span>
                      </div>
                    ) : (
                      <p className='text-xs text-muted-foreground pt-0.5'>
                        Current Section: <strong className='text-foreground'>{formData.section || 'None'}</strong>
                      </p>
                    )}
                  </div>
                ) : (
                  /* Create Mode: Multi-select A-F */
                  <div className='space-y-2'>
                    {/* A to F MULTI-SELECT CHIPS */}
                    <div className='flex flex-wrap gap-2'>
                      {SECTION_OPTIONS.map((sec) => {
                        const isSelected = selectedSections.includes(sec);
                        const isAlreadyTaken = takenSectionsForName.has(sec);
                        return (
                          <button
                            key={sec}
                            type='button'
                            onClick={() => toggleSection(sec)}
                            title={
                              isAlreadyTaken
                                ? `Section ${sec} already exists for ${formData.name.trim() || 'this class'}`
                                : `Toggle Section ${sec}`
                            }
                            className={`h-10 w-11 rounded-xl text-sm font-bold transition-all border flex items-center justify-center select-none relative ${
                              isSelected
                                ? isAlreadyTaken
                                  ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                                  : 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                                : isAlreadyTaken
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                                : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/70 hover:text-foreground'
                            }`}
                          >
                            {sec}
                            {isAlreadyTaken && (
                              <span
                                className='absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-background'
                                title='Already exists'
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {duplicateSectionsInCreate.length > 0 ? (
                      <div className='p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2'>
                        <AlertCircle className='h-4 w-4 shrink-0' />
                        <span>
                          Section(s) <strong>{duplicateSectionsInCreate.join(', ')}</strong> already exist for <strong>{formData.name.trim()}</strong>. Please unselect them.
                        </span>
                      </div>
                    ) : selectedSections.length > 0 ? (
                      <p className='text-xs text-muted-foreground pt-0.5'>
                        Will create <strong className='text-foreground'>{selectedSections.length}</strong> {selectedSections.length === 1 ? 'class' : 'classes'}:{' '}
                        <span className='font-medium text-primary'>
                          {selectedSections
                            .map((s) => `${formData.name.trim() || 'Class'} (${s})`)
                            .join(', ')}
                        </span>
                      </p>
                    ) : (
                      <p className='text-xs text-rose-500 font-medium pt-0.5'>
                        Please select at least one section.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className='flex gap-2 pt-2'>
              <Button
                type='submit'
                className='bg-primary hover:bg-primary/90'
                disabled={
                  editingId
                    ? isDuplicateInEdit || !formData.name.trim() || !formData.section.trim()
                    : selectedSections.length === 0 || duplicateSectionsInCreate.length > 0 || !formData.name.trim()
                }
              >
                {editingId
                  ? 'Update Class'
                  : selectedSections.length > 1
                  ? `Create ${selectedSections.length} Classes`
                  : 'Create Class'}
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

      <DataGrid
        title='Classes list'
        searchPlaceholder='Search classes by name or section...'
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        empty={filteredClasses.length === 0}
        emptyMessage={
          searchQuery.trim()
            ? `No classes found matching "${searchQuery}"`
            : 'No classes found'
        }
      >
        <DataGridTable>
          <DataGridHead>
            <tr>
              <DataGridTh className='w-1/2 min-w-[160px]'>Name</DataGridTh>
              <DataGridTh className='hidden sm:table-cell w-1/4 min-w-[120px]'>Section</DataGridTh>
              <DataGridTh className='w-1/4 text-right pr-6'>Actions</DataGridTh>
            </tr>
          </DataGridHead>
          <tbody>
            {filteredClasses.map((cls) => (
              <DataGridRow key={cls.id}>
                <DataGridTd className='font-medium text-foreground'>
                  <div className='flex flex-col gap-1'>
                    <span>{cls.name}</span>
                    {/* Section badge shown only on mobile, below name */}
                    <span className='sm:hidden inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-xs font-medium w-fit'>
                      Section {cls.section}
                    </span>
                  </div>
                </DataGridTd>
                {/* Section column hidden on mobile */}
                <DataGridTd className='hidden sm:table-cell text-muted-foreground'>
                  <span className='inline-flex items-center px-2.5 py-0.5 rounded-md bg-muted text-xs font-medium'>
                    Section {cls.section}
                  </span>
                </DataGridTd>
                <DataGridTd className='text-right pr-6'>
                  <div className='flex items-center justify-end gap-2'>
                    <Button
                      onClick={() => handleEdit(cls)}
                      size='sm'
                      variant='outline'
                      className='rounded-lg h-8'
                    >
                      <Pencil className='h-3.5 w-3.5 mr-1 text-muted-foreground' />
                      Edit
                    </Button>
                    <Button
                      onClick={() => handleDelete(cls.id)}
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
            ))}
          </tbody>
        </DataGridTable>
      </DataGrid>
    </div>
  );
}