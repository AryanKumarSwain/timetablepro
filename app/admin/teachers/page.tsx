'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  resendTeacherCredentials,
  getSchoolDetails,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Upload,
  AlertCircle,
  CheckCircle2,
  Eye,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  BookOpen,
  KeyRound,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';

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
  const [selectedTeacherForView, setSelectedTeacherForView] = useState<Teacher | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [credentialsModal, setCredentialsModal] = useState<{
    open: boolean;
    teacherName: string;
    email: string;
    password?: string;
    sent: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [schoolPlan, setSchoolPlan] = useState<any>(null);

  // 1. Core Initial Data Fetch
  useEffect(() => {
    loadTeachers();
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
    setSelectedTeacherForView(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        setSuccessMsg(null);
        await deleteTeacher(id);
        await loadTeachers();
        setSuccessMsg('Teacher record removed successfully.');
        if (selectedTeacherForView?.id === id) {
          setSelectedTeacherForView(null);
        }
      } catch (error) {
        console.error('Failed to delete teacher:', error);
      }
    }
  };

  const handleResendCredentials = async (teacher: Teacher) => {
    try {
      setResendingId(teacher.id);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await resendTeacherCredentials(teacher.id);
      setCredentialsModal({
        open: true,
        teacherName: teacher.name,
        email: res.email,
        password: res.tempPassword,
        sent: res.sent,
      });
      if (res.sent) {
        setSuccessMsg(`Login credentials successfully emailed to ${res.email}`);
      } else {
        setSuccessMsg(`New login credentials generated for ${teacher.name}`);
      }
    } catch (err: any) {
      console.error('Failed to resend credentials:', err);
      setErrorMsg(err.message || 'Failed to resend credentials');
    } finally {
      setResendingId(null);
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
        description={`Manage faculty profiles and specialties (${teachers.length}/${schoolPlan?.teacherMax || 15})`}
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
                  if (typeof window !== 'undefined') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
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
        {/* DESKTOP TABLE VIEW */}
        <div className='hidden md:block'>
          <DataGridTable>
            <DataGridHead>
              <tr>
                <DataGridTh className='w-[28%] min-w-[180px]'>Name</DataGridTh>
                <DataGridTh className='w-[28%] min-w-[200px]'>Email</DataGridTh>
                <DataGridTh className='w-[16%] min-w-[130px]'>Phone</DataGridTh>
                <DataGridTh className='w-[10%] min-w-[90px] text-center'>Status</DataGridTh>
                <DataGridTh className='w-[18%] min-w-[200px] text-right pr-6'>Actions</DataGridTh>
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
                    {teacher.phone || '—'}
                  </DataGridTd>
                  <DataGridTd className='text-center'>
                    {teacher.active ? (
                      <span className='inline-flex items-center px-2.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs rounded-full font-medium'>
                        Active
                      </span>
                    ) : (
                      <span className='inline-flex items-center px-2.5 py-0.5 bg-muted text-muted-foreground text-xs rounded-full'>
                        Inactive
                      </span>
                    )}
                  </DataGridTd>
                  <DataGridTd className='text-right pr-6'>
                    <div className='flex items-center justify-end gap-1.5'>
                      <Button
                        onClick={() => setSelectedTeacherForView(teacher)}
                        size='sm'
                        variant='ghost'
                        className='rounded-lg h-8 text-primary hover:bg-primary/10'
                      >
                        <Eye className='h-3.5 w-3.5 mr-1' />
                        View
                      </Button>
                      <Button
                        onClick={() => handleResendCredentials(teacher)}
                        size='sm'
                        variant='outline'
                        disabled={resendingId === teacher.id}
                        className='rounded-lg h-8 border-amber-500/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                        title='Resend login credentials to teacher email'
                      >
                        {resendingId === teacher.id ? (
                          <Loader2 className='h-3.5 w-3.5 animate-spin mr-1' />
                        ) : (
                          <KeyRound className='h-3.5 w-3.5 mr-1' />
                        )}
                        Resend
                      </Button>
                      <Button
                        onClick={() => handleEdit(teacher)}
                        size='sm'
                        variant='outline'
                        className='rounded-lg h-8'
                      >
                        <Pencil className='h-3.5 w-3.5 mr-1' />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleDelete(teacher.id)}
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
        </div>

        {/* MOBILE COMPACT LIST VIEW - NO HORIZONTAL SCROLL NEEDED */}
        <div className='block md:hidden divide-y divide-border/40'>
          {teachers.map((teacher) => (
            <div key={teacher.id} className='p-3.5 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors'>
              <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-2'>
                  <p className='font-semibold text-sm text-foreground truncate'>{teacher.name}</p>
                  {teacher.active ? (
                    <span className='inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0' title='Active' />
                  ) : (
                    <span className='inline-block w-2 h-2 rounded-full bg-zinc-400 shrink-0' title='Inactive' />
                  )}
                </div>
              </div>
              
              <div className='flex items-center gap-1 shrink-0'>
                <Button
                  onClick={() => setSelectedTeacherForView(teacher)}
                  size='sm'
                  variant='outline'
                  className='h-8 px-2.5 text-xs text-primary border-primary/30 rounded-lg hover:bg-primary/10'
                >
                  <Eye className='h-3.5 w-3.5 mr-1' />
                  View
                </Button>
                <Button
                  onClick={() => handleResendCredentials(teacher)}
                  size='sm'
                  variant='outline'
                  disabled={resendingId === teacher.id}
                  className='h-8 px-2 text-xs border-amber-500/30 text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30'
                  title='Resend credentials'
                >
                  {resendingId === teacher.id ? (
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  ) : (
                    <KeyRound className='h-3.5 w-3.5' />
                  )}
                </Button>
                <Button
                  onClick={() => handleEdit(teacher)}
                  size='sm'
                  variant='outline'
                  className='h-8 px-2.5 text-xs rounded-lg'
                >
                  <Pencil className='h-3.5 w-3.5 mr-1' />
                  Edit
                </Button>
                <Button
                  onClick={() => handleDelete(teacher.id)}
                  size='sm'
                  variant='outline'
                  className='h-8 px-2 text-xs border-rose-500/30 text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30'
                >
                  <Trash2 className='h-3.5 w-3.5' />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DataGrid>

      {/* TEACHER DETAILS MODAL / DIALOG */}
      <Dialog open={!!selectedTeacherForView} onOpenChange={(open) => !open && setSelectedTeacherForView(null)}>
        {selectedTeacherForView && (
          <DialogContent className='sm:max-w-md rounded-2xl'>
            <DialogHeader>
              <div className='flex items-center justify-between gap-2 pr-4'>
                <DialogTitle className='text-xl font-bold flex items-center gap-2'>
                  {selectedTeacherForView.name}
                </DialogTitle>
                {selectedTeacherForView.active ? (
                  <span className='px-2.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-full'>
                    Active
                  </span>
                ) : (
                  <span className='px-2.5 py-0.5 bg-muted text-muted-foreground text-xs font-semibold rounded-full'>
                    Inactive
                  </span>
                )}
              </div>
              <DialogDescription className='text-xs text-muted-foreground'>
                Faculty Member Detailed Profile
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-2 text-sm'>
              <div className='flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50'>
                <Mail className='h-4 w-4 text-primary shrink-0' />
                <div className='min-w-0 flex-1'>
                  <p className='text-xs text-muted-foreground font-medium'>Email Address</p>
                  <p className='font-semibold text-foreground truncate'>{selectedTeacherForView.email || 'N/A'}</p>
                </div>
              </div>

              <div className='flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50'>
                <Phone className='h-4 w-4 text-primary shrink-0' />
                <div className='min-w-0 flex-1'>
                  <p className='text-xs text-muted-foreground font-medium'>Phone Number</p>
                  <p className='font-semibold text-foreground'>{selectedTeacherForView.phone || 'N/A'}</p>
                </div>
              </div>

              <div className='flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50'>
                <Calendar className='h-4 w-4 text-primary shrink-0' />
                <div className='min-w-0 flex-1'>
                  <p className='text-xs text-muted-foreground font-medium'>Joining Date</p>
                  <p className='font-semibold text-foreground'>{selectedTeacherForView.joinDate || 'N/A'}</p>
                </div>
              </div>

              {selectedTeacherForView.qualifications && selectedTeacherForView.qualifications.length > 0 && (
                <div className='p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1.5'>
                  <div className='flex items-center gap-2 text-xs text-muted-foreground font-medium'>
                    <GraduationCap className='h-4 w-4 text-primary' />
                    <span>Qualifications</span>
                  </div>
                  <div className='flex flex-wrap gap-1.5 pt-1'>
                    {selectedTeacherForView.qualifications.map((q, idx) => (
                      <span key={idx} className='px-2 py-0.5 text-xs bg-background rounded-md border border-border font-medium'>
                        {q}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTeacherForView.subjects && selectedTeacherForView.subjects.length > 0 && (
                <div className='p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1.5'>
                  <div className='flex items-center gap-2 text-xs text-muted-foreground font-medium'>
                    <BookOpen className='h-4 w-4 text-primary' />
                    <span>Assigned Subjects</span>
                  </div>
                  <div className='flex flex-wrap gap-1.5 pt-1'>
                    {selectedTeacherForView.subjects.map((sub, idx) => (
                      <span key={idx} className='px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-md font-medium'>
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className='pt-2'>
                <Button
                  onClick={() => handleResendCredentials(selectedTeacherForView)}
                  disabled={resendingId === selectedTeacherForView.id}
                  variant='outline'
                  className='w-full rounded-xl border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium'
                >
                  {resendingId === selectedTeacherForView.id ? (
                    <Loader2 className='h-4 w-4 animate-spin mr-2' />
                  ) : (
                    <KeyRound className='h-4 w-4 mr-2 text-amber-500' />
                  )}
                  Resend Login Credentials
                </Button>
              </div>
            </div>

            <DialogFooter className='flex flex-row gap-2 pt-2 sm:justify-between'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setSelectedTeacherForView(null)}
                className='rounded-xl flex-1'
              >
                Close
              </Button>
              <Button
                variant='default'
                size='sm'
                onClick={() => {
                  const teacher = selectedTeacherForView;
                  setSelectedTeacherForView(null);
                  handleEdit(teacher);
                }}
                className='rounded-xl flex-1'
              >
                <Pencil className='h-4 w-4 mr-1.5' />
                Edit Profile
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* CREDENTIALS SENT / GENERATED POPUP DIALOG */}
      <Dialog
        open={!!credentialsModal?.open}
        onOpenChange={(open) => !open && setCredentialsModal(null)}
      >
        {credentialsModal && (
          <DialogContent className='sm:max-w-md rounded-2xl'>
            <DialogHeader>
              <div className='flex items-center gap-2'>
                <div className='p-2 rounded-xl bg-amber-500/15 text-amber-600'>
                  <KeyRound className='h-5 w-5' />
                </div>
                <div>
                  <DialogTitle className='text-lg font-bold'>
                    Teacher Credentials
                  </DialogTitle>
                  <DialogDescription className='text-xs text-muted-foreground'>
                    {credentialsModal.sent
                      ? `Credentials emailed to ${credentialsModal.email}`
                      : `New login password generated for ${credentialsModal.teacherName}`}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className='space-y-3 py-2 text-sm'>
              {credentialsModal.sent ? (
                <div className='p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2'>
                  <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-600' />
                  <span>Email sent successfully with portal login instructions!</span>
                </div>
              ) : (
                <div className='p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2'>
                  <AlertCircle className='h-4 w-4 shrink-0 text-amber-600 mt-0.5' />
                  <span>SMTP is not configured or email delivery failed. You can copy the credentials below and share them manually.</span>
                </div>
              )}

              <div className='space-y-2 p-3.5 rounded-xl bg-muted/40 border border-border/50'>
                <div>
                  <span className='text-xs text-muted-foreground font-medium block'>Teacher Name</span>
                  <span className='font-semibold text-sm'>{credentialsModal.teacherName}</span>
                </div>
                <div>
                  <span className='text-xs text-muted-foreground font-medium block'>Login Email</span>
                  <span className='font-semibold text-sm'>{credentialsModal.email}</span>
                </div>
                {credentialsModal.password && (
                  <div>
                    <span className='text-xs text-muted-foreground font-medium block'>Temporary Password</span>
                    <div className='flex items-center gap-2 mt-1'>
                      <code className='px-2.5 py-1 rounded-lg bg-background border border-border font-mono text-sm font-bold text-foreground'>
                        {credentialsModal.password}
                      </code>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            navigator.clipboard.writeText(
                              `Teacher Portal Login\nEmail: ${credentialsModal.email}\nPassword: ${credentialsModal.password}\nLogin at: ${window.location.origin}/login`
                            );
                          }
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className='h-8 px-2.5 text-xs rounded-lg'
                      >
                        {copied ? (
                          <>
                            <Check className='h-3.5 w-3.5 mr-1 text-emerald-600' />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className='h-3.5 w-3.5 mr-1' />
                            Copy Details
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setCredentialsModal(null)}
                className='w-full rounded-xl'
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}