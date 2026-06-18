'use client';

import { useEffect, useState } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getAdminHomework,
  createAdminHomework,
  updateAdminHomework,
  deleteAdminHomework,
  type Homework,
  getClasses,
  getTeachers,
  getAdminReports,
} from '@/lib/api-services';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, BookOpen, Send, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

// Helper to extract homework from description
function extractHomeworkFromDescription(desc = '') {
  const homeworkMarker = '\n\nHomework:';
  const idx = desc.indexOf(homeworkMarker);
  if (idx === -1) return null;
  return desc.slice(idx + homeworkMarker.length).trim();
}

export default function AdminHomeworkPage() {
  const auth = useRequireAuth('admin');
  const [loading, setLoading] = useState(true);
  const [homework, setHomework] = useState<Record<string, Homework[]>>({});
  const [reportHomework, setReportHomework] = useState<Record<string, any[]>>({});
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | (any & { isFromReport?: boolean }) | null>(null);
  const [form, setForm] = useState({ title: '', description: '', classId: '', teacherId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!auth.loading && auth.user) {
      void load();
    }
  }, [auth.loading, auth.user]);

  const load = async () => {
    try {
      setLoading(true);
      const [homeworkData, classesData, teachersData, reportsData] = await Promise.all([
        getAdminHomework('SENT_TO_ADMIN'),
        getClasses(),
        getTeachers(),
        getAdminReports(),
      ]);
      setHomework(homeworkData);
      setClasses(classesData);
      setTeachers(teachersData);

      // Extract homework from reports
      const homeworkFromReports: Record<string, any[]> = {};
      reportsData.forEach((report) => {
        report.entries.forEach((entry: any) => {
          const homeworkText = extractHomeworkFromDescription(entry.description);
          if (homeworkText) {
            const className = entry.className || 'Unknown';
            if (!homeworkFromReports[className]) {
              homeworkFromReports[className] = [];
            }
            homeworkFromReports[className].push({
              id: `report-${entry.id}`,
              title: `Homework from Report`,
              description: homeworkText,
              teacher: { name: report.teacherName, email: report.teacherEmail },
              class: { name: entry.className, id: entry.classId },
              subject: { name: entry.subjectName, id: entry.subjectId },
              createdAt: report.submittedAt || report.reportDate,
              isFromReport: true,
              entryId: entry.id,
              reportId: report.id,
            });
          }
        });
      });
      setReportHomework(homeworkFromReports);
    } catch (error) {
      console.error('Failed to load homework:', error);
      toast.error('Failed to load homework data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.description || !form.classId || !form.teacherId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await createAdminHomework(form);
      toast.success('Homework created successfully');
      setDialogOpen(false);
      setForm({ title: '', description: '', classId: '', teacherId: '' });
      setEditingHomework(null);
      await load();
    } catch (error) {
      toast.error('Failed to create homework');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (hw: Homework) => {
    setEditingHomework(hw);
    setForm({ title: hw.title, description: hw.description, classId: hw.classId, teacherId: hw.teacherId });
    setDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingHomework || !form.title || !form.description || !form.classId || !form.teacherId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await updateAdminHomework(editingHomework.id, form);
      toast.success('Homework updated successfully');
      setDialogOpen(false);
      setForm({ title: '', description: '', classId: '', teacherId: '' });
      setEditingHomework(null);
      await load();
    } catch (error) {
      toast.error('Failed to update homework');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAdminHomework(id);
      toast.success('Homework deleted successfully');
      await load();
    } catch (error) {
      toast.error('Failed to delete homework');
    }
  };

  const handleEditReportHomework = (hw: any) => {
    setEditingHomework(hw);
    setForm({ title: hw.title, description: hw.description, classId: hw.class?.id || '', teacherId: '' });
    setDialogOpen(true);
  };

  const isEditingReportHomework = editingHomework?.isFromReport;

  const handleUpdateReportHomework = async () => {
    if (!editingHomework || !form.description) {
      toast.error('Please fill in the required fields');
      return;
    }

    setSubmitting(true);
    try {
      // Update the report entry description
      const response = await fetch(`/api/admin/reports/${editingHomework.reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [{
            id: editingHomework.entryId,
            description: form.description,
            isCompleted: true,
          }],
        }),
      });

      if (response.ok) {
        toast.success('Homework updated successfully');
        setDialogOpen(false);
        setForm({ title: '', description: '', classId: '', teacherId: '' });
        setEditingHomework(null);
        await load();
      } else {
        toast.error('Failed to update homework');
      }
    } catch (error) {
      toast.error('Failed to update homework');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = async (className: string) => {
    try {
      toast.info('Generating PDF...');
      // Collect all homework for this class
      const classHomework = [...(homework[className] || []), ...(reportHomework[className] || [])];
      
      // Create a simple text-based PDF content
      const content = classHomework.map((hw: any) => `
        Title: ${hw.title}
        Teacher: ${hw.teacher.name}
        Subject: ${hw.subject?.name || 'N/A'}
        Description: ${hw.description}
        Submitted: ${new Date(hw.createdAt).toLocaleDateString()}
        ${hw.isFromReport ? '(From Daily Report)' : ''}
        ---
      `).join('\n');

      // Create a blob and download
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `homework-${className}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Downloaded successfully');
    } catch (error) {
      toast.error('Failed to download');
    }
  };

  const handleDownloadExcel = async (className: string) => {
    try {
      toast.info('Generating Excel...');
      // Collect all homework for this class
      const classHomework = [...(homework[className] || []), ...(reportHomework[className] || [])];
      
      // Create CSV content
      const headers = ['Title', 'Teacher', 'Subject', 'Description', 'Submitted', 'Source'];
      const rows = classHomework.map((hw: any) => [
        hw.title,
        hw.teacher.name,
        hw.subject?.name || 'N/A',
        hw.description.replace(/\n/g, ' '),
        new Date(hw.createdAt).toLocaleDateString(),
        hw.isFromReport ? 'Daily Report' : 'Homework Table',
      ]);
      
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      // Create a blob and download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `homework-${className}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Downloaded successfully');
    } catch (error) {
      toast.error('Failed to download');
    }
  };

  const openDialog = () => {
    setEditingHomework(null);
    setForm({ title: '', description: '', classId: '', teacherId: '' });
    setDialogOpen(true);
  };

  const toggleClass = (className: string) => {
    setExpandedClasses((prev) => ({
      ...prev,
      [className]: !prev[className],
    }));
  };

  if (loading) {
    return (
      <div className='max-w-6xl mx-auto'>
        <PageSkeleton rows={4} />
      </div>
    );
  }

  const classKeys = Object.keys(homework);
  const reportClassKeys = Object.keys(reportHomework);
  const allClassKeys = Array.from(new Set([...classKeys, ...reportClassKeys]));

  return (
    <div className='max-w-6xl mx-auto space-y-6'>
      <PageHeader title="Homework Management" description="View and manage homework assignments submitted by teachers" />

      <div className='flex justify-between items-center'>
        <div>
          <h2 className='text-xl font-bold'>Submitted Homework</h2>
          <p className='text-sm text-slate-600'>
            {allClassKeys.length} {allClassKeys.length === 1 ? 'class' : 'classes'} with submitted homework
          </p>
        </div>
        <Button onClick={openDialog} className='gap-2'>
          <Plus className='h-4 w-4' />
          Create Homework
        </Button>
      </div>

      {allClassKeys.length === 0 ? (
        <GlassCard className='p-12 text-center'>
          <BookOpen className='h-12 w-12 mx-auto mb-4 text-slate-400' />
          <p className='text-slate-600'>No homework assignments have been submitted yet.</p>
        </GlassCard>
      ) : (
        <div className='space-y-6'>
          {allClassKeys.map((className) => {
            const isExpanded = expandedClasses[className] || false;
            const classHomeworkCount = (homework[className]?.length || 0) + (reportHomework[className]?.length || 0);
            return (
              <div key={className} className='space-y-3'>
                <div
                  className='flex justify-between items-center border-b pb-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1 -mx-2'
                  onClick={() => toggleClass(className)}
                >
                  <div className='flex items-center gap-2'>
                    {isExpanded ? (
                      <ChevronDown className='h-5 w-5 text-slate-600 dark:text-slate-400' />
                    ) : (
                      <ChevronRight className='h-5 w-5 text-slate-600 dark:text-slate-400' />
                    )}
                    <h3 className='text-lg font-bold text-slate-900 dark:text-white'>
                      Class {className}
                    </h3>
                    <span className='text-sm text-slate-600 dark:text-slate-400'>
                      ({classHomeworkCount} {classHomeworkCount === 1 ? 'homework' : 'homeworks'})
                    </span>
                  </div>
                  <div className='flex gap-2' onClick={(e) => e.stopPropagation()}>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleDownloadPDF(className)}
                      className='gap-1'
                    >
                      <Download className='h-3 w-3' />
                      PDF
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleDownloadExcel(className)}
                      className='gap-1'
                    >
                      <Download className='h-3 w-3' />
                      Excel
                    </Button>
                  </div>
                </div>
                {isExpanded && (
                  <div className='space-y-3'>
                {/* Homework from Homework table */}
                {homework[className]?.map((hw) => (
                  <GlassCard key={hw.id} className='p-5'>
                    <div className='flex justify-between items-start mb-3'>
                      <div className='flex-1'>
                        <h4 className='font-bold text-lg'>{hw.title}</h4>
                        <p className='text-xs text-slate-600 dark:text-slate-400 mb-2'>
                          Teacher: {hw.teacher.name} ({hw.teacher.email})
                        </p>
                        <p className='text-xs text-slate-600 dark:text-slate-400'>
                          Submitted: {new Date(hw.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => handleEdit(hw)}
                          className='gap-1'
                        >
                          <Edit className='h-3 w-3' />
                          Edit
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => handleDelete(hw.id)}
                          className='gap-1 text-red-600 hover:text-red-700'
                        >
                          <Trash2 className='h-3 w-3' />
                          Delete
                        </Button>
                      </div>
                    </div>
                    <p className='text-slate-700 dark:text-slate-300 text-sm'>{hw.description}</p>
                  </GlassCard>
                ))}
                {/* Homework from reports */}
                {reportHomework[className]?.map((hw) => (
                  <GlassCard key={hw.id} className='p-5 border-l-4 border-l-blue-500'>
                    <div className='flex justify-between items-start mb-3'>
                      <div className='flex-1'>
                        <h4 className='font-bold text-lg'>{hw.title}</h4>
                        <p className='text-xs text-slate-600 dark:text-slate-400 mb-1'>
                          Teacher: {hw.teacher.name} ({hw.teacher.email})
                        </p>
                        <p className='text-xs text-slate-600 dark:text-slate-400 mb-1'>
                          Subject: {hw.subject?.name || 'N/A'}
                        </p>
                        <p className='text-xs text-slate-600 dark:text-slate-400 mb-2'>
                          Submitted: {new Date(hw.createdAt).toLocaleDateString()}
                        </p>
                        <span className='inline-block mt-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full'>
                          From Daily Report
                        </span>
                      </div>
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => handleEditReportHomework(hw)}
                          className='gap-1'
                        >
                          <Edit className='h-3 w-3' />
                          Edit
                        </Button>
                      </div>
                    </div>
                    <p className='text-slate-700 dark:text-slate-300 text-sm'>{hw.description}</p>
                  </GlassCard>
                ))}
                </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>{editingHomework ? 'Edit Homework' : 'Create Homework'}</DialogTitle>
            <DialogDescription>
              {editingHomework ? 'Update the homework assignment details.' : 'Create a new homework assignment.'}
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            {isEditingReportHomework ? (
              <>
                <div className='space-y-2'>
                  <Label>Class</Label>
                  <div className='px-3 py-2 border border-border rounded-md bg-muted text-sm'>
                    {editingHomework?.class?.name || 'N/A'}
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label>Teacher</Label>
                  <div className='px-3 py-2 border border-border rounded-md bg-muted text-sm'>
                    {editingHomework?.teacher?.name} ({editingHomework?.teacher?.email})
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label>Subject</Label>
                  <div className='px-3 py-2 border border-border rounded-md bg-muted text-sm'>
                    {editingHomework?.subject?.name || 'N/A'}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className='space-y-2'>
                  <Label htmlFor='title'>Title *</Label>
                  <Input
                    id='title'
                    placeholder='Homework title'
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='teacher'>Teacher *</Label>
                  <select
                    id='teacher'
                    value={form.teacherId}
                    onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                    className='w-full px-3 py-2 border border-border rounded-md bg-background'
                  >
                    <option value=''>Select a teacher...</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='class'>Class *</Label>
                  <select
                    id='class'
                    value={form.classId}
                    onChange={(e) => setForm({ ...form, classId: e.target.value })}
                    className='w-full px-3 py-2 border border-border rounded-md bg-background'
                  >
                    <option value=''>Select a class...</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <div className='space-y-2'>
              <Label htmlFor='description'>Description *</Label>
              <Textarea
                id='description'
                placeholder='Homework description and instructions'
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
              />
            </div>
            <Button
              onClick={editingHomework?.isFromReport ? handleUpdateReportHomework : (editingHomework ? handleUpdate : handleCreate)}
              disabled={submitting}
              className='w-full'
            >
              {submitting ? 'Saving...' : editingHomework?.isFromReport ? 'Update Report Homework' : (editingHomework ? 'Update Homework' : 'Create Homework')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
