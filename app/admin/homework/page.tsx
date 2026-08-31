'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRequireAuth, useAuth } from '@/lib/auth-context';
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
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ProtectedFeature } from '@/components/protected-feature';
import {
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Download,
  ChevronDown,
  ChevronRight,
  FileText,
  Calendar,
  CheckCircle2,
  Search,
  GraduationCap,
  Users,
  Sparkles,
  Filter,
  X,
  Clock,
  User,
  FileCheck,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { Card } from '@/components/ui/card';

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
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'reports'>('all');

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

      // Expand all class accordions by default
      const initialExpanded: Record<string, boolean> = {};
      Object.keys(homeworkData).forEach(cls => { initialExpanded[cls] = true; });

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
            initialExpanded[className] = true;
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
      setExpandedClasses(initialExpanded);
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
      const classHomework = [...(homework[className] || []), ...(reportHomework[className] || [])];
      
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
                    <td class="assigned-by">${hw.teacher?.name || 'Teacher'}</td>
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
      const classHomework = [...(homework[className] || []), ...(reportHomework[className] || [])];
      
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
      
      const currentSchoolName = schoolName || 'School';
      const currentDate = new Date().toLocaleDateString();

      const documentChildren = [
        new Paragraph({
          text: currentSchoolName.toUpperCase(),
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: '',
          border: { bottom: { color: '000000', space: 1, style: 'single', size: 6 } },
          spacing: { after: 200 },
        }),
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
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
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
                      children: [new TextRun({ text: hw.teacher?.name || 'Teacher', size: 20 })],
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

  // Derived statistics for dashboard stat cards
  const totalDirectCount = useMemo(() => {
    return Object.values(homework).reduce((acc, curr) => acc + (curr?.length || 0), 0);
  }, [homework]);

  const totalReportCount = useMemo(() => {
    return Object.values(reportHomework).reduce((acc, curr) => acc + (curr?.length || 0), 0);
  }, [reportHomework]);

  const totalAssignmentsCount = totalDirectCount + totalReportCount;

  const allClassKeys = useMemo(() => {
    const classKeys = Object.keys(homework);
    const reportClassKeys = Object.keys(reportHomework);
    const keys = Array.from(new Set([...classKeys, ...reportClassKeys]));
    
    if (!selectedClassFilter) return keys;
    return keys.filter(k => k.toLowerCase().includes(selectedClassFilter.toLowerCase()));
  }, [homework, reportHomework, selectedClassFilter]);

  const uniqueTeachersCount = useMemo(() => {
    const teacherIds = new Set<string>();
    Object.values(homework).forEach(list => list.forEach(hw => { if (hw.teacherId) teacherIds.add(hw.teacherId); }));
    Object.values(reportHomework).forEach(list => list.forEach(hw => { if (hw.teacher?.email) teacherIds.add(hw.teacher.email); }));
    return teacherIds.size;
  }, [homework, reportHomework]);

  // Filter individual homework list items by search term and teacher filter
  const filterHomeworkList = (list: any[]) => {
    if (!list) return [];
    return list.filter((hw) => {
      const matchesSearch = !searchTerm || 
        hw.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        hw.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hw.subject?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTeacher = !selectedTeacherFilter || 
        hw.teacherId === selectedTeacherFilter || 
        hw.teacher?.id === selectedTeacherFilter ||
        hw.teacher?.email === selectedTeacherFilter ||
        hw.teacher?.name === selectedTeacherFilter;
      
      return matchesSearch && matchesTeacher;
    });
  };

  const hasActiveFilters = Boolean(searchTerm || selectedClassFilter || selectedTeacherFilter);

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedClassFilter('');
    setSelectedTeacherFilter('');
  };

  if (loading) {
    return (
      <div className='max-w-7xl mx-auto'>
        <PageSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto relative space-y-6 pb-12'>
      {/* Page Header */}
      <PageHeader
        title="Homework Management"
        description="Monitor, assign, and export homework assignments across all school classes."
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Academic' },
          { label: 'Homework' },
        ]}
        actions={
          <PlanButton
            onClick={openDialog}
            variant="primary"
            className="gap-2 rounded-xl shadow-md hover:shadow-purple-500/20 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Homework
          </PlanButton>
        }
      />

      {/* TOP-RIGHT POPUP TOAST BOX */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className='fixed top-6 right-6 z-50 max-w-sm p-4 bg-white/95 dark:bg-slate-900/95 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-sm rounded-2xl shadow-xl backdrop-blur-xl flex items-start gap-3'
          >
            <CheckCircle2 className='h-5 w-5 shrink-0 text-emerald-500 mt-0.5' />
            <div>
              <p className='font-bold text-xs uppercase tracking-wider mb-0.5'>Action Successful</p>
              <p className='text-slate-600 dark:text-slate-300 text-xs leading-relaxed'>{successMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProtectedFeature
        featureKey='homework'
        featureName='Homework Management'
        isEnabled={featureEnabled}
        schoolId={user?.schoolId || undefined}
      >
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <GlassCard className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalAssignmentsCount}</p>
              <p className="text-xs text-muted-foreground font-medium">Total Assignments</p>
            </div>
          </GlassCard>

          <GlassCard className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{allClassKeys.length}</p>
              <p className="text-xs text-muted-foreground font-medium">Active Classes</p>
            </div>
          </GlassCard>

          <GlassCard className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{uniqueTeachersCount}</p>
              <p className="text-xs text-muted-foreground font-medium">Teachers Assigning</p>
            </div>
          </GlassCard>

          <GlassCard className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalReportCount}</p>
              <p className="text-xs text-muted-foreground font-medium">From Daily Reports</p>
            </div>
          </GlassCard>
        </div>

        {/* SEARCH & FILTER BAR */}
        <GlassCard className="p-4 md:p-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search homework by title, description, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 rounded-xl bg-background/50 text-xs"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Class Select */}
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="h-10 px-3 py-2 border rounded-xl bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.name}>
                    {cls.name}
                  </option>
                ))}
              </select>

              {/* Teacher Select */}
              <select
                value={selectedTeacherFilter}
                onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                className="h-10 px-3 py-2 border rounded-xl bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="">All Teachers</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <Button
                  onClick={resetFilters}
                  variant="ghost"
                  size="sm"
                  className="h-10 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl gap-1"
                >
                  <X className="h-3.5 w-3.5" /> Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Date Picker & View Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40 text-xs">
            {/* View Mode Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
              <button
                onClick={() => { setShowHistoryView(false); setActiveTab('all'); }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  !showHistoryView && activeTab === 'all'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Assignments ({totalAssignmentsCount})
              </button>
              <button
                onClick={() => { setShowHistoryView(false); setActiveTab('direct'); }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  !showHistoryView && activeTab === 'direct'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Direct ({totalDirectCount})
              </button>
              <button
                onClick={() => { setShowHistoryView(false); setActiveTab('reports'); }}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  !showHistoryView && activeTab === 'reports'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Daily Reports ({totalReportCount})
              </button>
            </div>

            {/* Date Picker History */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-muted-foreground font-medium hidden sm:inline">Date History:</span>
              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-background border px-3 py-1.5 rounded-xl text-xs font-semibold"
              />
              <Button
                onClick={fetchDateHomework}
                disabled={isDateLoading}
                size="sm"
                className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg px-3"
              >
                {isDateLoading ? 'Loading...' : 'View History'}
              </Button>
              {showHistoryView && (
                <Button
                  onClick={() => setShowHistoryView(false)}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs rounded-lg px-3"
                >
                  Close History
                </Button>
              )}
            </div>
          </div>
        </GlassCard>

        {/* DATE-SPECIFIC HISTORY VIEW */}
        {showHistoryView ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Homework History for {selectedDate}</h2>
                <p className="text-xs text-muted-foreground">{dateHomework.length} homework item(s) found for this date</p>
              </div>
              <Button onClick={() => setShowHistoryView(false)} variant="outline" size="sm" className="rounded-xl text-xs">
                Back to Current View
              </Button>
            </div>

            {dateHomework.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-slate-600 dark:text-slate-400 font-medium">No homework assignments found for {selectedDate}.</p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dateHomework.map((hw: any) => (
                  <GlassCard key={hw.id} hover className="p-5 flex flex-col justify-between border-slate-200/80 dark:border-slate-800">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-base text-slate-900 dark:text-white">{hw.title}</h4>
                        <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200">
                          {hw.class?.name || 'Class'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{hw.description}</p>
                    </div>
                    <div className="pt-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                        <User className="h-3.5 w-3.5 text-purple-600" />
                        {hw.teacher?.name || 'Teacher'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(hw.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* CURRENT SUBMISSIONS VIEW BY CLASS */
          allClassKeys.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Homework Assignments Found</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mb-6">
                No homework assignments have been created or submitted yet. Click below to create your first homework assignment.
              </p>
              <PlanButton onClick={openDialog} variant="primary" className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" /> Create Homework
              </PlanButton>
            </GlassCard>
          ) : (
            <div className="space-y-6">
              {allClassKeys.map((className) => {
                const directList = filterHomeworkList(homework[className] || []);
                const reportList = filterHomeworkList(reportHomework[className] || []);

                const displayDirect = activeTab === 'all' || activeTab === 'direct';
                const displayReports = activeTab === 'all' || activeTab === 'reports';

                const totalClassCount = (displayDirect ? directList.length : 0) + (displayReports ? reportList.length : 0);

                if (hasActiveFilters && totalClassCount === 0) return null;

                const isExpanded = expandedClasses[className] ?? true;

                return (
                  <div key={className} className="space-y-3">
                    {/* Class Accordion Header */}
                    <GlassCard
                      hover
                      onClick={() => toggleClass(className)}
                      className="p-4 flex items-center justify-between cursor-pointer border-slate-200/80 dark:border-slate-800/80 transition-all select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{className}</h3>
                            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[11px]">
                              {totalClassCount} {totalClassCount === 1 ? 'assignment' : 'assignments'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-xs border-slate-200 dark:border-slate-800">
                              <Download className="h-3.5 w-3.5 text-purple-600" />
                              <span>Export</span>
                              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem onClick={() => handleDownloadPDF(className)} className="gap-2 text-xs cursor-pointer">
                              <FileText className="h-4 w-4 text-purple-600" />
                              Export as PDF Agenda
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadWord(className)} className="gap-2 text-xs cursor-pointer">
                              <FileCheck className="h-4 w-4 text-blue-600" />
                              Export as Word Document
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <div className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                          {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        </div>
                      </div>
                    </GlassCard>

                    {/* Class Homework Grid */}
                    {isExpanded && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-2 md:pl-4">
                        {/* Direct Homework Assignments */}
                        {displayDirect && directList.map((hw) => (
                          <GlassCard
                            key={hw.id}
                            hover
                            className="p-5 flex flex-col justify-between border-l-4 border-l-purple-500 border-slate-200/80 dark:border-slate-800/80"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 text-[10px]">
                                      Direct Assignment
                                    </Badge>
                                    {hw.subject?.name && (
                                      <Badge variant="outline" className="text-[10px]">
                                        {hw.subject.name}
                                      </Badge>
                                    )}
                                  </div>
                                  <h4 className="font-bold text-base text-slate-900 dark:text-white">{hw.title}</h4>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleEdit(hw)}
                                    className="h-8 w-8 text-slate-600 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDelete(hw.id)}
                                    className="h-8 w-8 text-slate-600 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                                {hw.description}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                <User className="h-3.5 w-3.5 text-purple-600" />
                                {hw.teacher?.name || 'Teacher'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(hw.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </GlassCard>
                        ))}

                        {/* Report-Derived Homework Assignments */}
                        {displayReports && reportList.map((hw) => (
                          <GlassCard
                            key={hw.id}
                            hover
                            className="p-5 flex flex-col justify-between border-l-4 border-l-blue-500 border-slate-200/80 dark:border-slate-800/80"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-[10px]">
                                      From Daily Report
                                    </Badge>
                                    {hw.subject?.name && (
                                      <Badge variant="outline" className="text-[10px]">
                                        {hw.subject.name}
                                      </Badge>
                                    )}
                                  </div>
                                  <h4 className="font-bold text-base text-slate-900 dark:text-white">{hw.title}</h4>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleEditReportHomework(hw)}
                                    className="h-8 w-8 text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                                {hw.description}
                              </p>
                            </div>

                            <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                              <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                                <User className="h-3.5 w-3.5 text-blue-600" />
                                {hw.teacher?.name || 'Teacher'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(hw.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </GlassCard>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* CREATE / EDIT HOMEWORK DIALOG */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                {editingHomework ? 'Edit Homework Assignment' : 'Create New Homework Assignment'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {editingHomework ? 'Update the details for this assignment.' : 'Fill in assignment details to notify students and teachers.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {isEditingReportHomework ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground font-semibold">Class</Label>
                    <div className="px-3 py-2 border rounded-xl bg-muted/50 font-medium text-foreground">
                      {editingHomework?.class?.name || 'N/A'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground font-semibold">Teacher</Label>
                    <div className="px-3 py-2 border rounded-xl bg-muted/50 font-medium text-foreground">
                      {editingHomework?.teacher?.name} ({editingHomework?.teacher?.email})
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground font-semibold">Subject</Label>
                    <div className="px-3 py-2 border rounded-xl bg-muted/50 font-medium text-foreground">
                      {editingHomework?.subject?.name || 'N/A'}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="title" className="font-semibold text-slate-700 dark:text-slate-300">Assignment Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Mathematics Chapter 5 Exercises"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="h-10 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="teacher" className="font-semibold text-slate-700 dark:text-slate-300">Assigned Teacher *</Label>
                    <select
                      id="teacher"
                      value={form.teacherId}
                      onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                      className="w-full h-10 px-3 py-2 border rounded-xl bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="">Select a teacher...</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="class" className="font-semibold text-slate-700 dark:text-slate-300">Target Class *</Label>
                    <select
                      id="class"
                      value={form.classId}
                      onChange={(e) => setForm({ ...form, classId: e.target.value })}
                      className="w-full h-10 px-3 py-2 border rounded-xl bg-background text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="">Select a class...</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <Label htmlFor="description" className="font-semibold text-slate-700 dark:text-slate-300">Homework Instructions & Details *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe homework tasks, due dates, or reference materials..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="rounded-xl text-xs"
                />
              </div>

              <Button
                onClick={editingHomework?.isFromReport ? handleUpdateReportHomework : (editingHomework ? handleUpdate : handleCreate)}
                disabled={submitting}
                className="w-full h-10 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-purple-500/20 transition-all mt-2 cursor-pointer"
              >
                {submitting ? 'Saving Assignment...' : editingHomework?.isFromReport ? 'Update Report Homework' : (editingHomework ? 'Update Homework' : 'Create Homework Assignment')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </ProtectedFeature>
    </div>
  );
}
