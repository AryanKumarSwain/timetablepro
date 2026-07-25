"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getDraftReportToday,
  getReportClassesToday,
  submitReport,
  type DailyReportData,
  getTeacherHomework,
  createHomework,
  updateHomework,
  deleteHomework,
  type Homework,
  getClasses,
  getSchoolDetails,
} from '@/lib/api-services';
import { PageHeader } from '@/components/enterprise/page-header';
import { PageSkeleton } from '@/components/enterprise/page-skeleton';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BookOpen, Send, Trash2, Edit, AlertCircle, CheckCircle2, X, Upload } from 'lucide-react';

// Helper to separate text from comma-separated items
function splitDescription(desc = '') {
  const marker = '\n\nTLM:';
  const idx = desc.indexOf(marker);
  if (idx === -1) {
    return { description: desc, tlm: '' };
  }
  return {
    description: desc.slice(0, idx),
    tlm: desc.slice(idx + marker.length).trim(),
  };
}

// Helper to separate homework from description
function splitHomeworkDescription(desc = '') {
  const homeworkMarker = '\n\nHomework:';
  const tlmMarker = '\n\nTLM:';
  
  let description = desc;
  let tlm = '';
  let homework = '';
  
  // Extract TLM first
  const tlmIdx = desc.indexOf(tlmMarker);
  if (tlmIdx !== -1) {
    const homeworkIdx = desc.indexOf(homeworkMarker);
    if (homeworkIdx !== -1 && homeworkIdx > tlmIdx) {
      // Both exist, homework comes after TLM
      tlm = desc.slice(tlmIdx + tlmMarker.length, homeworkIdx).trim();
      homework = desc.slice(homeworkIdx + homeworkMarker.length).trim();
      description = desc.slice(0, tlmIdx);
    } else if (homeworkIdx !== -1 && homeworkIdx < tlmIdx) {
      // Both exist, TLM comes after homework
      homework = desc.slice(homeworkIdx + homeworkMarker.length, tlmIdx).trim();
      tlm = desc.slice(tlmIdx + tlmMarker.length).trim();
      description = desc.slice(0, homeworkIdx);
    } else {
      // Only TLM exists
      tlm = desc.slice(tlmIdx + tlmMarker.length).trim();
      description = desc.slice(0, tlmIdx);
    }
  } else {
    // No TLM, check for homework
    const homeworkIdx = desc.indexOf(homeworkMarker);
    if (homeworkIdx !== -1) {
      homework = desc.slice(homeworkIdx + homeworkMarker.length).trim();
      description = desc.slice(0, homeworkIdx);
    }
  }
  
  return { description, tlm, homework };
}

// Color palette for teachers/subjects
const TEACHER_COLORS = [
  'bg-[#6366f1]', // indigo
  'bg-[#8b5cf6]', // violet
  'bg-[#ec4899]', // pink
  'bg-[#f43f5e]', // rose
  'bg-[#f97316]', // orange
  'bg-[#eab308]', // yellow
  'bg-[#22c55e]', // green
  'bg-[#14b8a6]', // teal
  'bg-[#06b6d4]', // cyan
  'bg-[#3b82f6]', // blue
];

// Activity categories
const ACTIVITY_CATEGORIES = [
  'Smart Class',
  'Group Discussion',
  'Quiz',
  'Debate',
  'Practical',
  'Experiment',
  'Project Work',
  'Role Play',
  'Storytelling',
  'Art & Craft',
  'Reading Activity',
  'Writing Activity',
  'Lab Activity',
  'Sports',
  'Yoga',
  'Music',
  'Dance',
  'Educational Tour',
  'Assembly Activity',
  'Club Activity',
  'Life Skills',
  'AI & Coding Activity',
] as const;

// Generate consistent color based on string
function getColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TEACHER_COLORS.length;
  return TEACHER_COLORS[index];
}

// Tag/Pill Input UI Component matching layout requirements
interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  readOnly?: boolean;
  placeholder?: string;
}

function TagInput({ tags = [], onChange, readOnly, placeholder = "Add item..." }: TagInputProps) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim().replace(/,+/g, '');
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, i) => i !== indexToRemove));
  };

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border rounded-xl bg-background/50 min-h-[95px] content-start items-center focus-within:ring-1 focus-within:ring-ring">
      {(tags || []).map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 bg-[#f3f4f6] text-[#374151] text-xs font-medium px-2 py-1 rounded-md border border-gray-200"
        >
          {tag}
          {!readOnly && (
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="text-gray-400 hover:text-gray-600 font-bold text-[9px] w-3.5 h-3.5 flex items-center justify-center rounded-full bg-gray-200/40"
            >
              ✕
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 bg-transparent border-0 outline-none p-0 text-xs min-w-[60px] focus:ring-0 focus:outline-none text-foreground"
        />
      )}
    </div>
  );
}

export default function TeacherReportsPage() {
  const auth = useRequireAuth('teacher');
  const [loading, setLoading] = useState(true);
  const [hasSchoolAssignment, setHasSchoolAssignment] = useState(true);
  const [homeworkEnabled, setHomeworkEnabled] = useState(true);
  const [report, setReport] = useState<DailyReportData | null>(null);
  const [rows, setRows] = useState<Array<{
    entryId?: string;
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    teacherName?: string;
    description: string;
    tlm: string[];
    homework: string;
    periodId?: string;
    periodNumber: string | number;
    startTime: string;
    endTime: string;
    isCompleted: boolean;
    isProxy?: boolean;
    entryType: 'lesson' | 'activity';
    activityCategory?: string;
    activityDescription?: string;
    learningOutcome?: string;
    evidenceFiles: Array<{ name: string; url: string; type: string }>;
  }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [todos, setTodos] = useState<Array<{ id: string; title: string; completed: boolean; periodId?: string; classId?: string }>>([]);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      // Check if teacher has school assignment
      if (!auth.user.schoolId) {
        setHasSchoolAssignment(false);
        setLoading(false);
        return;
      }
      void load();
    }
  }, [auth.loading, auth.user]);

  // Check for stored success message from today's submission
  useEffect(() => {
    const storedTimestamp = localStorage.getItem('reportSubmitSuccess');
    const storedMessage = localStorage.getItem('reportSubmitMessage');
    
    if (storedTimestamp && storedMessage) {
      const submitDate = new Date(storedTimestamp);
      const today = new Date();
      
      // Check if submission was today
      if (submitDate.toDateString() === today.toDateString()) {
        setSubmitSuccess(storedMessage);
      } else {
        // Clear old storage if from previous day
        localStorage.removeItem('reportSubmitSuccess');
        localStorage.removeItem('reportSubmitMessage');
      }
    }
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      setLoadMessage(null);
      setAttemptedSubmit(false);

      // Check if homework is enabled in the plan
      try {
        const schoolData = await getSchoolDetails();
        const plan = schoolData.plan;
        setHomeworkEnabled(plan?.homeworkEnabled || false);
      } catch (error) {
        console.warn('Failed to fetch school plan details', error);
        setHomeworkEnabled(true); // Default to enabled if fetch fails
      }

      const classData = await getReportClassesToday();
      const slots = classData.scheduleSlots ?? [];

      let existingReport: DailyReportData | null = null;
      try {
        existingReport = await getDraftReportToday();
      } catch (error) {
        console.warn('Draft report record not found, checking for submitted report.', error);
        // Try to get submitted report if draft doesn't exist
        try {
          existingReport = await getSubmittedReportToday();
        } catch (submitError) {
          console.warn('Submitted report record not found either.', submitError);
        }
      }

      const savedEntries = existingReport?.entries ?? [];

      // Load todos for today
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      console.log('Fetching TODOs for date:', todayStr, 'Full date:', today);
      try {
        const todosResponse = await fetch('/api/teacher/todos?date=' + todayStr);
        if (todosResponse.ok) {
          const todosData = await todosResponse.json();
          console.log('Loaded todos:', todosData);
          console.log('Todos array:', todosData.todos);
          console.log('Todos length:', todosData.todos?.length);
          setTodos(todosData.todos || []);
        } else {
          console.error('Failed to load todos:', todosResponse.status, await todosResponse.text());
        }
      } catch (error) {
        console.error('Failed to load todos', error);
      }

      const integratedRows = slots.map((slot) => {
        const matchingEntry = savedEntries.find(
          (e) => String(e.classId) === String(slot.classId) &&
            String(e.subjectId) === String(slot.subjectId) &&
            String(e.periodNumber) === String(slot.periodNumber)
        );

        const { description, tlm, homework } = splitHomeworkDescription(matchingEntry?.description ?? '');
        const isProxy = (slot as any).isProxy === true;

        console.log('Slot data for TODO matching:', {
          periodNumber: slot.periodNumber,
          classId: slot.classId,
          subjectId: slot.subjectId
        });

        return {
          entryId: matchingEntry?.id,
          classId: slot.classId,
          className: slot.className || 'N/A',
          subjectId: slot.subjectId,
          subjectName: slot.subjectName || 'N/A',
          teacherName: auth.user?.name || 'Teacher',
          periodId: slot.periodId,
          periodNumber: slot.periodNumber ?? 'N/A',
          startTime: slot.startTime ?? '',
          endTime: slot.endTime ?? '',
          description,
          tlm: tlm ? tlm.split(',').map(t => t.trim()).filter(Boolean) : [],
          homework,
          isCompleted: matchingEntry?.isCompleted ?? false,
          isProxy,
          entryType: (matchingEntry?.entryType as 'lesson' | 'activity') || 'lesson',
          activityCategory: matchingEntry?.activityCategory || undefined,
          activityDescription: matchingEntry?.activityDescription || undefined,
          learningOutcome: matchingEntry?.learningOutcome || undefined,
          evidenceFiles: (matchingEntry?.evidenceFiles as Array<{ name: string; url: string; type: string }>) || [],
        };
      }).sort((a, b) => String(a.periodNumber).localeCompare(String(b.periodNumber), undefined, { numeric: true }));

      setReport(existingReport);
      setRows(integratedRows);

      if (slots.length === 0) {
        setLoadMessage('No scheduled classes were found for today. Please verify your published timetable layout.');
      }
    } catch (e) {
      console.error(e);
      setLoadMessage('Unable to load today\'s scheduled classes. Please refresh or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const readOnly = useMemo(() => report?.status === 'SUBMITTED' && !report?.isEditing, [report]);

  const updateRow = (idx: number, patch: Partial<{
    description: string;
    tlm: string[];
    homework: string;
    isCompleted: boolean;
    entryType: 'lesson' | 'activity';
    activityCategory?: string;
    activityDescription?: string;
    learningOutcome?: string;
    evidenceFiles: Array<{ name: string; url: string; type: string }>;
  }>) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
    setValidationError(null);
    setSubmitSuccess(null);
  };

  const handleToggleTodo = async (todoId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/teacher/todos/${todoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });

      if (response.ok) {
        const updatedTodos = todos.map(t =>
          t.id === todoId ? { ...t, completed: !completed } : t
        );
        setTodos(updatedTodos);

        if (!completed) {
          const completedTodo = updatedTodos.find(t => t.id === todoId);
          if (completedTodo) {
            setRows((prevRows) => {
              const normalizedTitle = completedTodo.title.trim();
              if (!normalizedTitle) return prevRows;

              return prevRows.map((row) => {
                const sameClass = String(row.classId) === String(completedTodo.classId);
                const samePeriod = row.periodId
                  ? String(row.periodId) === String(completedTodo.periodId) || String(row.periodNumber) === String(completedTodo.periodId)
                  : String(row.periodNumber) === String(completedTodo.periodId);

                if (!sameClass || !samePeriod) {
                  return row;
                }

                const currentDescription = row.description || '';
                const descriptionLines = currentDescription
                  .split('\n')
                  .map((line) => line.trim());

                if (descriptionLines.some((line) => line === normalizedTitle)) {
                  return row;
                }

                const newDescription = currentDescription.trim()
                  ? `${currentDescription.trim()}\n${normalizedTitle}`
                  : normalizedTitle;

                return { ...row, description: newDescription };
              });
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to toggle TODO:', error);
    }
  };

  const handleCheckAllTodos = async (
    periodId: string | undefined,
    periodNumber: string | number,
    classId: string
  ) => {
    const periodTodos = getTodosForPeriod(periodId, periodNumber, classId);
    const incompleteTodos = periodTodos.filter((todo) => !todo.completed);
    if (incompleteTodos.length === 0) return;

    try {
      const responses = await Promise.all(
        incompleteTodos.map((todo) =>
          fetch(`/api/teacher/todos/${todo.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: true }),
          })
        )
      );

      if (!responses.every((res) => res.ok)) {
        console.error('Failed to check all TODOs:', responses);
        return;
      }

      setTodos((prevTodos) =>
        prevTodos.map((todo) =>
          incompleteTodos.some((incomplete) => incomplete.id === todo.id)
            ? { ...todo, completed: true }
            : todo
        )
      );

      setRows((prevRows) => {
        return prevRows.map((row) => {
          const sameClass = String(row.classId) === String(classId);
          const samePeriod = row.periodId
            ? String(row.periodId) === String(periodId) || String(row.periodNumber) === String(periodId)
            : String(row.periodNumber) === String(periodId);

          if (!sameClass || !samePeriod) {
            return row;
          }

          const existingLines = (row.description || '')
            .split('\n')
            .map((line) => line.trim());

          const linesToAppend = incompleteTodos
            .map((todo) => todo.title.trim())
            .filter((title) => title && !existingLines.includes(title));

          if (linesToAppend.length === 0) {
            return row;
          }

          const newDescription = row.description?.trim()
            ? `${row.description.trim()}\n${linesToAppend.join('\n')}`
            : linesToAppend.join('\n');

          return { ...row, description: newDescription };
        });
      });
    } catch (error) {
      console.error('Failed to check all TODOs:', error);
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    try {
      const response = await fetch(`/api/teacher/todos/${todoId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTodos(todos.filter(t => t.id !== todoId));
      }
    } catch (error) {
      console.error('Failed to delete TODO:', error);
    }
  };

  const getTodosForPeriod = (periodId: string | undefined, periodNumber: string | number, classId: string) => {
    console.log('getTodosForPeriod - Input:', { periodId, periodNumber, classId, typePeriodId: typeof periodId, typePeriod: typeof periodNumber, typeClass: typeof classId });
    console.log('getTodosForPeriod - All todos:', todos);
    const filtered = todos.filter(t => {
      const periodMatch = periodId
        ? String(t.periodId) === String(periodId)
        : String(t.periodId) === String(periodNumber);
      const classMatch = String(t.classId) === String(classId);
      console.log('TODO item check:', { 
        todoId: t.id, 
        todoPeriodId: t.periodId, 
        todoClassId: t.classId, 
        targetPeriodId: periodId,
        targetPeriodNumber: periodNumber,
        targetClass: classId,
        periodMatch, 
        classMatch 
      });
      return periodMatch && classMatch;
    });
    console.log('getTodosForPeriod - Result:', { totalTodos: todos.length, filteredCount: filtered.length, filtered });
    return filtered;
  };

  const handleSubmit = async () => {
    if (rows.length === 0) return;
    setSubmitSuccess(null);

    // Validation based on entry type
    for (const r of rows) {
      if (r.entryType === 'lesson') {
        // Lesson mode: require description and homework
        if (!r.description || !r.description.trim()) {
          setValidationError(`Please fill out 'What did you cover today?' for Period ${r.periodNumber} before submitting.`);
          setAttemptedSubmit(true);
          return;
        }
      } else if (r.entryType === 'activity') {
        // Activity mode: require category, description, learning outcome, and homework
        if (!r.activityCategory || !r.activityCategory.trim()) {
          setValidationError(`Please select 'Activity Category' for Period ${r.periodNumber} before submitting.`);
          setAttemptedSubmit(true);
          return;
        }
        if (!r.activityDescription || !r.activityDescription.trim()) {
          setValidationError(`Please fill out 'Activity Description' for Period ${r.periodNumber} before submitting.`);
          setAttemptedSubmit(true);
          return;
        }
        if (!r.learningOutcome || !r.learningOutcome.trim()) {
          setValidationError(`Please fill out 'Learning Outcome' for Period ${r.periodNumber} before submitting.`);
          setAttemptedSubmit(true);
          return;
        }
      }

      // Homework is required for both modes if enabled
      if (homeworkEnabled && (!r.homework || !r.homework.trim())) {
        setValidationError(`Please fill out 'Homework' for Period ${r.periodNumber} before submitting.`);
        setAttemptedSubmit(true);
        return;
      }
    }

    setValidationError(null);
    setSubmitting(true);
    try {
      const entriesPayload = rows.map((r) => {
        if (r.entryType === 'lesson') {
          // Lesson mode: use existing format
          const tlmString = (r.tlm || []).join(', ');
          return {
            id: r.entryId,
            classId: r.classId,
            className: r.className,
            subjectId: r.subjectId,
            subjectName: r.subjectName,
            periodNumber: Number(r.periodNumber) || r.periodNumber,
            startTime: r.startTime,
            endTime: r.endTime,
            description: `${r.description.trim()}${tlmString ? `\n\nTLM: ${tlmString}` : ''}${r.homework ? `\n\nHomework: ${r.homework}` : ''}`,
            isCompleted: true,
            entryType: 'LESSON',
          };
        } else {
          // Activity mode: use new format
          return {
            id: r.entryId,
            classId: r.classId,
            className: r.className,
            subjectId: r.subjectId,
            subjectName: r.subjectName,
            periodNumber: Number(r.periodNumber) || r.periodNumber,
            startTime: r.startTime,
            endTime: r.endTime,
            description: r.homework || '',
            isCompleted: true,
            entryType: 'ACTIVITY',
            activityCategory: r.activityCategory,
            activityDescription: r.activityDescription,
            learningOutcome: r.learningOutcome,
            evidenceFiles: r.evidenceFiles,
          };
        }
      });

      const todayObj = new Date();
      const yyyy = todayObj.getFullYear();
      const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
      const dd = String(todayObj.getDate()).padStart(2, '0');

      const explicitLocalDate = `${yyyy}-${mm}-${dd}`;
      await submitReport({
        reportId: report?.id,
        date: explicitLocalDate,
        status: 'SUBMITTED',
        entries: entriesPayload,
      });

      const isResubmission = report?.status === 'SUBMITTED';
      setSubmitSuccess(isResubmission ? "Report resubmitted successfully!" : "Report submitted successfully!");
      setReport(prev => prev ? { ...prev, status: 'SUBMITTED', isEditing: false } : null);
      
      // Store submission timestamp to show success message for the full day
      localStorage.setItem('reportSubmitSuccess', new Date().toISOString());
      localStorage.setItem('reportSubmitMessage', isResubmission ? "Report resubmitted successfully!" : "Report submitted successfully!");
    } catch (e) {
      console.error(e);
      setValidationError("Failed to submit the report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (rows.length === 0) return;
    setValidationError(null);
    setSubmitSuccess(null);
    setSubmitting(true);

    try {
      const entriesPayload = rows.map((r) => {
        if (r.entryType === 'lesson') {
          const tlmString = (r.tlm || []).join(', ');
          return {
            id: r.entryId,
            classId: r.classId,
            className: r.className,
            subjectId: r.subjectId,
            subjectName: r.subjectName,
            periodNumber: Number(r.periodNumber) || r.periodNumber,
            startTime: r.startTime,
            endTime: r.endTime,
            description: `${r.description.trim()}${tlmString ? `\n\nTLM: ${tlmString}` : ''}${r.homework ? `\n\nHomework: ${r.homework}` : ''}`,
            isCompleted: true,
            entryType: 'LESSON',
          };
        } else {
          return {
            id: r.entryId,
            classId: r.classId,
            className: r.className,
            subjectId: r.subjectId,
            subjectName: r.subjectName,
            periodNumber: Number(r.periodNumber) || r.periodNumber,
            startTime: r.startTime,
            endTime: r.endTime,
            description: r.homework || '',
            isCompleted: true,
            entryType: 'ACTIVITY',
            activityCategory: r.activityCategory,
            activityDescription: r.activityDescription,
            learningOutcome: r.learningOutcome,
            evidenceFiles: r.evidenceFiles,
          };
        }
      });

      const todayObj = new Date();
      const yyyy = todayObj.getFullYear();
      const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
      const dd = String(todayObj.getDate()).padStart(2, '0');
      const explicitLocalDate = `${yyyy}-${mm}-${dd}`;

      const savedReport = await submitReport({
        reportId: report?.id,
        date: explicitLocalDate,
        status: 'DRAFT',
        entries: entriesPayload,
      });

      setSubmitSuccess('Draft saved successfully!');
      setReport(savedReport);
    } catch (e) {
      console.error(e);
      setValidationError('Failed to save draft. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className='max-w-4xl mx-auto px-4 mt-6'>
        <PageSkeleton rows={4} />
      </div>
    );
  }

  if (!hasSchoolAssignment) {
    return (
      <div className='max-w-4xl mx-auto px-4 mt-6'>
        <PageHeader 
          title="Today's Report" 
          description={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        />
        <GlassCard className='p-12 text-center'>
          <AlertCircle className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
          <h3 className='text-lg font-semibold mb-2'>No School Assignment</h3>
          <p className='text-muted-foreground'>
            You are not currently assigned to any school. Please wait for an administrator to add you or input an invitation code.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className='max-w-5xl mx-auto px-6 py-6 space-y-6'>
      <PageHeader 
        title="Today's Report" 
        description={new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      />

      {/* Interactive Form Guard Alert Element */}
      {validationError && (
        <div className="p-4 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl animate-in fade-in duration-200">
          ⚠️ {validationError}
        </div>
      )}

      {/* Success Alert Banner Element */}
      {submitSuccess && (
        <div className="p-4 text-sm font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl animate-in fade-in duration-200">
          ✓ {submitSuccess}
        </div>
      )}

      {rows.length === 0 ? (
        <GlassCard className='p-12 text-center text-muted-foreground'>
          {loadMessage ?? 'No scheduled classes for today.'}
        </GlassCard>
      ) : (
        <div className='space-y-5'>
          {rows.map((r, i) => {
            const periodTodos = getTodosForPeriod(r.periodId, r.periodNumber, r.classId);
            const incompleteTodos = periodTodos.filter((todo) => !todo.completed);
            return (
              <GlassCard key={`${r.classId}-${r.subjectId}-${r.periodNumber}-${i}`} className='p-5 shadow-sm border border-muted/60'>

              {/* Dynamic Badge Row Info Section */}
              <div className='flex flex-wrap items-center gap-2 mb-4 text-sm font-semibold text-foreground'>
                <span>
                  Period {r.periodNumber}
                  {r.startTime && r.endTime ? ` · ${r.startTime}–${r.endTime}` : ''}
                </span>
                {r.isProxy && (
                  <span className='px-2 py-0.5 text-xs bg-indigo-500/15 text-indigo-600 border border-indigo-500/30 rounded-md font-medium'>
                    Proxy/Substitution
                  </span>
                )}
                <span className='px-2 py-0.5 text-xs bg-secondary text-secondary-foreground border rounded-md font-medium ml-1'>
                  {r.className}
                </span>
                <span className={`px-2.5 py-0.5 text-xs text-white rounded-full font-medium ml-0.5 ${getColorFromString(r.teacherName || r.subjectName)}`}>
                  {r.subjectName}
                </span>
              </div>

              {/* Lesson/Activity Toggle */}
              {!readOnly && (
                <div className='mb-4 flex items-center gap-4'>
                  <span className='text-xs font-semibold text-muted-foreground'>Entry Type:</span>
                  <div className='flex gap-2'>
                    <button
                      type='button'
                      onClick={() => updateRow(i, { entryType: 'lesson' })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        r.entryType === 'lesson'
                          ? 'bg-[#6366f1] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Classroom
                    </button>
                    <button
                      type='button'
                      onClick={() => updateRow(i, { entryType: 'activity' })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                        r.entryType === 'activity'
                          ? 'bg-[#6366f1] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Activity
                    </button>
                  </div>
                </div>
              )}

              {/* Input Workspace Interface Layout */}
              {r.entryType === 'lesson' ? (
                <div className='grid grid-cols-1 md:grid-cols-4 gap-4 items-start'>

                  <div className='md:col-span-2 space-y-1.5'>
                    <label className='text-xs font-semibold text-muted-foreground'>
                      What did you cover today? <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      value={r.description}
                      onChange={(e) => updateRow(i, { description: e.target.value })}
                      readOnly={readOnly}
                      placeholder="Enter what you covered in class (Required)"
                      className='min-h-[95px] resize-none focus-visible:ring-1'
                    />
                  </div>

                  <div className='md:col-span-1 space-y-1.5'>
                    <div className='flex items-start justify-between gap-2'>
                      <label className='text-xs font-semibold text-muted-foreground flex items-center gap-1.5'>
                        <CheckCircle2 className="h-3 w-3" /> TODOs
                        {periodTodos.length > 0 && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                            {periodTodos.length}
                          </span>
                        )}
                      </label>
                      {!readOnly && incompleteTodos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => void handleCheckAllTodos(r.periodId, r.periodNumber, r.classId)}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          Check all
                        </button>
                      )}
                    </div>
                    <div className="border rounded-xl bg-background/50 min-h-[95px] p-2 space-y-1.5 overflow-y-auto max-h-[160px]">
                      {getTodosForPeriod(r.periodId, r.periodNumber, r.classId).length === 0 ? (
                        <p className="text-xs text-muted-foreground/70 flex items-center justify-center h-full min-h-[75px]">
                          No TODOs
                        </p>
                      ) : (
                        getTodosForPeriod(r.periodId, r.periodNumber, r.classId).map((todo) => (
                          <div
                            key={todo.id}
                            className="flex items-center gap-2 p-1.5 rounded-lg bg-muted/50 border border-border/60 text-xs"
                          >
                            <button
                              onClick={() => handleToggleTodo(todo.id, todo.completed)}
                              disabled={readOnly}
                              className={`flex-shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                                todo.completed
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-gray-300 hover:border-emerald-500'
                              }`}
                            >
                              {todo.completed && <CheckCircle2 className="h-2.5 w-2.5" />}
                            </button>
                            <span className={`flex-1 ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {todo.title}
                            </span>
                            {!readOnly && (
                              <button
                                onClick={() => handleDeleteTodo(todo.id)}
                                className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className='md:col-span-1 space-y-1.5'>
                    <label className='text-xs font-semibold text-muted-foreground'>
                      TLM Materials Used <span className="text-xs font-normal text-muted-foreground/70">(Optional)</span>
                    </label>
                    <TagInput
                      tags={r.tlm || []}
                      onChange={(tags) => updateRow(i, { tlm: tags })}
                      readOnly={readOnly}
                      placeholder="Type item & press Enter"
                    />
                  </div>
                </div>
              ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 items-start'>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-muted-foreground'>
                      Activity Category <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={r.activityCategory || ''}
                      onValueChange={(value) => updateRow(i, { activityCategory: value })}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select activity category" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-muted-foreground'>
                      Activity Description <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      value={r.activityDescription || ''}
                      onChange={(e) => updateRow(i, { activityDescription: e.target.value })}
                      readOnly={readOnly}
                      placeholder="Describe the activity conducted (Required)"
                      className='min-h-[95px] resize-none focus-visible:ring-1'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-muted-foreground'>
                      Learning Outcome <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      value={r.learningOutcome || ''}
                      onChange={(e) => updateRow(i, { learningOutcome: e.target.value })}
                      readOnly={readOnly}
                      placeholder="What students learned from this activity (Required)"
                      className='min-h-[95px] resize-none focus-visible:ring-1'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-muted-foreground'>
                      Evidence Upload <span className="text-xs font-normal text-muted-foreground/70">(Optional)</span>
                    </label>
                    <div className="border rounded-xl bg-background/50 min-h-[95px] p-3">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Upload images, videos, PDFs, worksheets, or audio files
                        </span>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf,audio/*,.xlsx,.xls,.doc,.docx"
                        disabled={readOnly}
                        className="mt-2 text-xs"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;

                          try {
                            const uploadPromises = files.map(async (file) => {
                              const formData = new FormData();
                              formData.append('file', file);
                              const response = await fetch('/api/reports/upload', {
                                method: 'POST',
                                body: formData,
                              });
                              if (!response.ok) throw new Error('Upload failed');
                              return response.json();
                            });

                            const uploadedFiles = await Promise.all(uploadPromises);
                            updateRow(i, { evidenceFiles: [...(r.evidenceFiles || []), ...uploadedFiles] });
                          } catch (error) {
                            console.error('File upload error:', error);
                            alert('Failed to upload evidence files. Please try again.');
                          }
                        }}
                      />
                      {r.evidenceFiles && r.evidenceFiles.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {r.evidenceFiles.some(f => typeof f === 'string' && f.startsWith('blob:')) && (
                            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                              ⚠️ Some evidence files are not accessible. Please re-upload them.
                            </div>
                          )}
                          {r.evidenceFiles.map((file, idx) => {
                            const isBlob = typeof file === 'string' && file.startsWith('blob:');
                            return (
                              <div key={idx} className={`flex items-center justify-between text-xs bg-muted/50 p-2 rounded ${isBlob ? 'border border-amber-300' : ''}`}>
                                <span className="truncate">{typeof file === 'string' ? `File ${idx + 1}` : file.name}</span>
                                <div className="flex items-center gap-2">
                                  {isBlob && <span className="text-amber-600 text-[10px]">(needs re-upload)</span>}
                                  {!readOnly && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = r.evidenceFiles?.filter((_, fIdx) => fIdx !== idx) || [];
                                        updateRow(i, { evidenceFiles: updated });
                                      }}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Homework Input - only shown if homework is enabled in plan */}
              {homeworkEnabled && (
                <div className='mt-4 space-y-1.5'>
                  <label className='text-xs font-semibold text-muted-foreground'>
                    Homework <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={r.homework}
                    onChange={(e) => updateRow(i, { homework: e.target.value })}
                    readOnly={readOnly}
                    placeholder="Enter homework assignment (Required)"
                    className='min-h-[60px] resize-none focus-visible:ring-1'
                  />
                </div>
              )}

            </GlassCard>
            );
          })}

          {!readOnly && (
            <div className='flex justify-end pt-2 gap-3'>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSaveDraft()}
                className='rounded-xl px-5 py-3 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {submitting ? 'Saving…' : 'Save Draft'}
              </button>
              {report?.status === 'SUBMITTED' ? (
                <Button
                  size='lg'
                  onClick={() => setReport(prev => prev ? { ...prev, isEditing: true } : null)}
                  disabled={submitting}
                  className='rounded-xl px-10 bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-sm'
                >
                  Resubmit Report
                </Button>
              ) : (
                <Button
                  size='lg'
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className='rounded-xl px-10 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium shadow-sm'
                >
                  {submitting ? 'Submitting…' : 'Submit Report'}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}