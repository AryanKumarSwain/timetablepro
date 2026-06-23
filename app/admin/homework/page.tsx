'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
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
  getSchoolDetails,
} from '@/lib/api-services';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { PlanButton } from '@/components/ui/plan-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ProtectedFeature } from '@/components/protected-feature';
import { Plus, Edit, Trash2, BookOpen, Send, Download, ChevronDown, ChevronRight, FileText, MoreVertical, Calendar, RefreshCw, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Helper to extract homework from description
function extractHomeworkFromDescription(desc = '') {
  const homeworkMarker = '\n\nHomework:';
  const idx = desc.indexOf(homeworkMarker);
  if (idx === -1) return null;
  return desc.slice(idx + homeworkMarker.length).trim();
}

export default function AdminHomeworkPage() {
  const auth = useRequireAuth('admin');
  const { user } = useAuth();
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const [loading, setLoading] = useState(true);
  const [homework, setHomework] = useState<Record<string, Homework[]>>({});
  const [reportHomework, setReportHomework] = useState<Record<string, any[]>>({});
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [schoolName, setSchoolName] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | (any & { isFromReport?: boolean }) | null>(null);
  const [form, setForm] = useState({ title: '', description: '', classId: '', teacherId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Date selection states
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dateHomework, setDateHomework] = useState<any[]>([]);
  const [isDateLoading, setIsDateLoading] = useState<boolean>(false);
  const [showHistoryView, setShowHistoryView] = useState(false);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      void load();
    }
  }, [auth.loading, auth.user]);

  // 2-second auto-dismiss timer for notifications
  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => {
      setSuccessMsg(null);
    }, 2000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  const load = async () => {
    try {
      setLoading(true);
      const [homeworkData, classesData, teachersData, reportsData, schoolData] = await Promise.all([
        getAdminHomework('SENT_TO_ADMIN'),
        getClasses(),
        getTeachers(),
        getAdminReports(),
        getSchoolDetails(),
      ]);
      
      // Check if homework feature is enabled
      const plan = schoolData.plan;
      const homeworkEnabled = plan?.homeworkEnabled || false;
      setFeatureEnabled(homeworkEnabled);
      
      setHomework(homeworkData);
      setClasses(classesData);
      setTeachers(teachersData);
      setSchoolName(schoolData.name || 'School');

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
              title: entry.subjectName || 'Homework',
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
      setSuccessMsg('Homework assignment created successfully.');
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
      setSuccessMsg('Homework assignment updated successfully.');
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
      setSuccessMsg('Homework assignment removed successfully.');
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
        setSuccessMsg('Homework assignment updated successfully.');
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
      toast.info('Preparing PDF for print...');
      // Collect all homework for this class
      const classHomework = [...(homework[className] || []), ...(reportHomework[className] || [])];
      
      // Fetch school plan to check watermark requirement
      let showWatermark = true;
      try {
        const planResponse = await fetch('/api/admin/school');
        if (planResponse.ok) {
          const planData = await planResponse.json();
          showWatermark = planData.watermarkRequired !== false;
        }
      } catch (e) {
        console.error('Failed to fetch plan for watermark check:', e);
      }
      
      // Create a printable HTML template
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Failed to open print window');
        return;
      }

      const currentDate = new Date().toLocaleDateString();
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Homework Agenda - ${className}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 900px;
              margin: 0 auto;
              padding: 40px 20px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .school-name {
              font-size: 28px;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 10px;
            }
            .divider {
              border-top: 2px solid #333;
              margin: 20px 0;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              font-size: 14px;
              color: #666;
              margin-top: 10px;
            }
            .meta-left {
              text-align: left;
            }
            .meta-right {
              text-align: right;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 30px;
            }
            th {
              background-color: #f3f4f6;
              border: 1px solid #e5e7eb;
              padding: 12px;
              text-align: left;
              font-weight: bold;
              font-size: 14px;
            }
            td {
              border: 1px solid #e5e7eb;
              padding: 12px;
              font-size: 13px;
              vertical-align: top;
            }
            .sno {
              width: 50px;
              text-align: center;
            }
            .subject {
              width: 150px;
            }
            .task {
              width: 400px;
            }
            .assigned-by {
              width: 200px;
            }
            .footer {
              position: fixed;
              bottom: 20px;
              right: 20px;
              color: #9ca3af;
              font-size: 12px;
            }
            @media print {
              body {
                padding: 20px;
              }
              .footer {
                position: fixed;
                bottom: 10px;
                right: 10px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">${schoolName}</div>
            <div class="divider"></div>
            <div class="meta-row">
              <div class="meta-left">Date: ${currentDate}</div>
              <div class="meta-right">Class: ${className}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="sno">S.No.</th>
                <th class="subject">Subject</th>
                <th class="task">Homework Task</th>
                <th class="assigned-by">Assigned By</th>
              </tr>
            </thead>
            <tbody>
              ${classHomework.map((hw: any, index: number) => {
                const subjectName = hw.subject?.name || 'General';
                const capitalizedSubject = subjectName.charAt(0).toUpperCase() + subjectName.slice(1).toLowerCase();
                return `
                  <tr>
                    <td class="sno">${index + 1}</td>
                    <td class="subject">${capitalizedSubject}</td>
                    <td class="task">${hw.description}</td>
                    <td class="assigned-by">${hw.teacher.name}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          ${showWatermark ? '<div class="footer">Generated via Timetable Pro</div>' : ''}
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for the content to load then trigger print
      setTimeout(() => {
        printWindow.print();
        toast.success('Print dialog opened');
      }, 250);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to prepare PDF');
    }
  };

  const handleDownloadWord = async (className: string) => {
    try {
      toast.info('Generating Word document...');
      // Collect all homework for this class
      const classHomework = [...(homework[className] || []), ...(reportHomework[className] || [])];
      
      // Fetch school plan to check watermark requirement
      let showWatermark = true;
      try {
        const planResponse = await fetch('/api/admin/school');
        if (planResponse.ok) {
          const planData = await planResponse.json();
          showWatermark = planData.watermarkRequired !== false;
        }
      } catch (e) {
        console.error('Failed to fetch plan for watermark check:', e);
      }
      
      // Use dynamic school name from state
      const currentSchoolName = schoolName || 'School';
      const currentDate = new Date().toLocaleDateString();

      // Build document children
      const documentChildren = [
        // School Header - Bold, Uppercase, Centered
        new Paragraph({
          text: currentSchoolName.toUpperCase(),
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        
        // Divider
        new Paragraph({
          text: '',
          border: { bottom: { color: '000000', space: 1, style: 'single', size: 6 } },
          spacing: { after: 200 },
        }),
        
        // Metadata row - Left: Date, Right: Class
        new Paragraph({
          children: [
            new TextRun({ text: `Date: ${currentDate}`, size: 22 }),
          ],
          tabStops: [
            { type: 'right', position: 8000 },
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Class: ${className}`, size: 22 }),
          ],
          tabStops: [
            { type: 'right', position: 8000 },
          ],
          spacing: { after: 400 },
        }),
        
        // Homework Table with proper structure
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            // Table Header
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 10, type: WidthType.PERCENTAGE },
                  shading: { fill: 'F3F4F6' },
                  children: [new Paragraph({
                    children: [new TextRun({ text: 'S.No.', bold: true, size: 22 })],
                    alignment: AlignmentType.CENTER,
                  })],
                }),
                new TableCell({
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  shading: { fill: 'F3F4F6' },
                  children: [new Paragraph({
                    children: [new TextRun({ text: 'Subject', bold: true, size: 22 })],
                  })],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  shading: { fill: 'F3F4F6' },
                  children: [new Paragraph({
                    children: [new TextRun({ text: 'Homework Task', bold: true, size: 22 })],
                  })],
                }),
                new TableCell({
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  shading: { fill: 'F3F4F6' },
                  children: [new Paragraph({
                    children: [new TextRun({ text: 'Assigned By', bold: true, size: 22 })],
                  })],
                }),
              ],
            }),
            // Table Rows
            ...classHomework.map((hw: any, index: number) => {
              const subjectName = hw.subject?.name || 'General';
              const capitalizedSubject = subjectName.charAt(0).toUpperCase() + subjectName.slice(1).toLowerCase();
              return new TableRow({
                children: [
                  new TableCell({
                    width: { size: 10, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({
                      children: [new TextRun({ text: String(index + 1), size: 20 })],
                      alignment: AlignmentType.CENTER,
                    })],
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({
                      children: [new TextRun({ text: capitalizedSubject, size: 20 })],
                    })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({
                      children: [new TextRun({ text: hw.description, size: 20 })],
                    })],
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({
                      children: [new TextRun({ text: hw.teacher.name, size: 20 })],
                    })],
                  }),
                ],
              });
            }),
          ],
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
          },
        }),
      ];

      // Add footer watermark only if required
      if (showWatermark) {
        documentChildren.push(
          new Paragraph({
            children: [
              new TextRun({ 
                text: 'Generated via Timetable Pro', 
                size: 18, 
                color: '9CA3AF',
                italics: true 
              }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 800 },
          })
        );
      }

      // Create professional Word document with table structure
      const doc = new Document({
        sections: [{
          properties: {},
          children: documentChildren,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `homework-${className}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Word document downloaded successfully');
    } catch (error) {
      console.error('Word generation error:', error);
      toast.error('Failed to generate Word document');
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

  const fetchDateHomework = useCallback(async () => {
    if (!selectedDate) return;
    try {
      setIsDateLoading(true);
      const response = await fetch(`/api/admin/homework?range=true&start=${selectedDate}&end=${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch homework for date.');
      const data = await response.json();
      setDateHomework(data.summary?.[selectedDate] || []);
      setShowHistoryView(true);
      setSuccessMsg(`Homework loaded for ${selectedDate}.`);
    } catch (err) {
      console.error(err);
      toast.error('Could not load homework for this date.');
    } finally {
      setIsDateLoading(false);
    }
  }, [selectedDate]);

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
    <div className='max-w-7xl mx-auto relative'>
      <PageHeader
        title="Homework Management"
        description="View and manage homework assignments submitted by teachers"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Academic' },
          { label: 'Homework' },
        ]}
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

      <ProtectedFeature
        featureKey='homework'
        featureName='Homework Management'
        isEnabled={featureEnabled}
        schoolId={user?.schoolId || undefined}
      >
        <div className='space-y-6'>
          {/* DATE SELECTOR PANEL */}
          <div className='glass-panel p-4 rounded-xl border border-border/80 space-y-3 pointer-events-auto'>
            <div className='flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground'>
              <Calendar className='h-3.5 w-3.5 text-primary' />
              Homework History by Date
            </div>
            <div className='flex flex-wrap items-center gap-4'>
              <div className='flex items-center gap-2'>
                <span className='text-xs text-muted-foreground font-medium'>Select Date:</span>
                <input type='date' value={selectedDate} max={todayStr} onChange={(e) => setSelectedDate(e.target.value)} className='bg-card border p-1.5 rounded-lg text-xs font-semibold' />
              </div>
              <button onClick={fetchDateHomework} disabled={isDateLoading} className='px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold rounded-lg disabled:opacity-50'>
                {isDateLoading ? 'Loading...' : 'Load Homework'}
              </button>
              {showHistoryView && (
                <button onClick={() => setShowHistoryView(false)} className='px-4 py-2 border border-border bg-card text-xs font-bold rounded-lg'>
                  View Current Homework
                </button>
              )}
            </div>
          </div>

          {!showHistoryView && (
            <div className='flex justify-between items-center'>
              <div>
                <h2 className='text-xl font-bold'>Submitted Homework</h2>
                <p className='text-sm text-slate-600'>
                  {allClassKeys.length} {allClassKeys.length === 1 ? 'class' : 'classes'} with submitted homework
                </p>
              </div>
              <PlanButton onClick={openDialog} variant="primary" className='gap-2 rounded-xl'>
                <Plus className='h-4 w-4' />
                Create Homework
              </PlanButton>
            </div>
          )}

          {/* DATE-SPECIFIC HOMEWORK VIEW */}
          {showHistoryView && (
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <h2 className='text-xl font-bold'>Homework for {selectedDate}</h2>
                <p className='text-sm text-slate-600'>
                  {dateHomework.length} {dateHomework.length === 1 ? 'homework' : 'homeworks'} found
                </p>
              </div>
              
              {dateHomework.length === 0 ? (
                <Card className='p-12 text-center border-border'>
                  <BookOpen className='h-12 w-12 mx-auto mb-4 text-slate-400' />
                  <p className='text-slate-600'>No homework found for this date.</p>
                </Card>
              ) : (
                <div className='space-y-3'>
                  {dateHomework.map((hw: any) => (
                    <Card key={hw.id} className='p-5 border-border'>
                      <div className='flex justify-between items-start mb-3'>
                        <div className='flex-1'>
                          <h4 className='font-bold text-lg'>{hw.title}</h4>
                          <p className='text-xs text-slate-600 dark:text-slate-400 mb-2'>
                            Teacher: {hw.teacher.name} ({hw.teacher.email})
                          </p>
                          <p className='text-xs text-slate-600 dark:text-slate-400 mb-1'>
                            Class: {hw.class.name}
                          </p>
                          <p className='text-xs text-slate-600 dark:text-slate-400 mb-1'>
                            Submitted: {new Date(hw.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p className='text-slate-700 dark:text-slate-300 text-sm'>{hw.description}</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
      </div>

      {!showHistoryView && allClassKeys.length === 0 ? (
        <Card className='p-12 text-center border-border'>
          <BookOpen className='h-12 w-12 mx-auto mb-4 text-slate-400' />
          <p className='text-slate-600'>No homework assignments have been submitted yet.</p>
        </Card>
      ) : !showHistoryView && (
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
                     {className}
                    </h3>
                    <span className='text-sm text-slate-600 dark:text-slate-400'>
                      ({classHomeworkCount} {classHomeworkCount === 1 ? 'homework' : 'homeworks'})
                    </span>
                  </div>
                  <div className='flex gap-2' onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size='sm' variant='outline' className='gap-1'>
                          <Download className='h-3 w-3' />
                          Export
                          <ChevronDown className='h-3 w-3' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem onClick={() => handleDownloadPDF(className)} className='gap-2'>
                          <FileText className='h-4 w-4' />
                          Export as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownloadWord(className)} className='gap-2'>
                          <FileText className='h-4 w-4' />
                          Export as Word Document
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {isExpanded && (
                  <div className='space-y-3'>
                {/* Homework from Homework table */}
                {homework[className]?.map((hw) => (
                  <Card key={hw.id} className='p-5 border-border'>
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
                  </Card>
                ))}
                {/* Homework from reports */}
                {reportHomework[className]?.map((hw) => (
                  <Card key={hw.id} className='p-5 border-l-4 border-l-blue-500 border-border'>
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
                  </Card>
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
      </ProtectedFeature>
    </div>
  );
}
