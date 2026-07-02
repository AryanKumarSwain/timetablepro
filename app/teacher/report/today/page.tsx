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
import { BookOpen, Send, Trash2, Edit, AlertCircle, CheckCircle2, X } from 'lucide-react';

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
    periodNumber: string | number;
    startTime: string;
    endTime: string;
    isCompleted: boolean;
    isProxy?: boolean;
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
        console.warn('Draft report record not found.', error);
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
            String(e.subjectId) === String(slot.subjectId)
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
          periodNumber: slot.periodNumber ?? 'N/A',
          startTime: slot.startTime ?? '',
          endTime: slot.endTime ?? '',
          description,
          tlm: tlm ? tlm.split(',').map(t => t.trim()).filter(Boolean) : [],
          homework,
          isCompleted: matchingEntry?.isCompleted ?? false,
          isProxy,
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

  const readOnly = useMemo(() => report?.status === 'SUBMITTED', [report]);

  const updateRow = (idx: number, patch: Partial<{ description: string; tlm: string[]; homework: string; isCompleted: boolean }>) => {
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
        setTodos(todos.map(t => t.id === todoId ? { ...t, completed: !completed } : t));
      }
    } catch (error) {
      console.error('Failed to toggle TODO:', error);
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

  const getTodosForPeriod = (periodNumber: string | number, classId: string) => {
    console.log('getTodosForPeriod - Input:', { periodNumber, classId, typePeriod: typeof periodNumber, typeClass: typeof classId });
    console.log('getTodosForPeriod - All todos:', todos);
    const filtered = todos.filter(t => {
      const periodMatch = String(t.periodId) === String(periodNumber);
      const classMatch = String(t.classId) === String(classId);
      console.log('TODO item check:', { 
        todoId: t.id, 
        todoPeriodId: t.periodId, 
        todoClassId: t.classId, 
        targetPeriod: periodNumber, 
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

    // MANDATORY DESCRIPTION VALIDATION: Ensure every row has text in descriptions
    const missingDescriptions = rows.filter(r => !r.description || !r.description.trim());
    if (missingDescriptions.length > 0) {
      setValidationError("Please fill out 'What did you cover today?' for all listed periods before submitting.");
      setAttemptedSubmit(true);
      return;
    }

    // MANDATORY HOMEWORK VALIDATION: Ensure every row has homework filled (only if homework is enabled)
    if (homeworkEnabled) {
      const missingHomework = rows.filter(r => !r.homework || !r.homework.trim());
      if (missingHomework.length > 0) {
        setValidationError("Please fill out 'Homework' for all listed periods before submitting.");
        setAttemptedSubmit(true);
        return;
      }
    }

    setValidationError(null);
    setSubmitting(true);
    try {
      const entriesPayload = rows.map((r) => {
        // TLM is optional: if empty, it falls back to blank string notation safely
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
          isCompleted: true, // Always mark as completed since we removed the checkbox
        };
      });

      // 🔥 EXPLICIT DATE STRING INSTEAD OF "today" VALUE
      // This prevents runtime offset shifts from saving the report to June 4th
      const todayObj = new Date();
      const yyyy = todayObj.getFullYear();
      const mm = String(todayObj.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
      const dd = String(todayObj.getDate()).padStart(2, '0');

      const explicitLocalDate = `${yyyy}-${mm}-${dd}`;
      await submitReport({
        reportId: report?.id,
        date: explicitLocalDate,
        status: 'SUBMITTED',
        entries: entriesPayload,
      });

      setSubmitSuccess("Report submitted successfully!");
      // Update report status locally to SUBMITTED without reloading data
      // This keeps the entered text visible in readOnly mode
      setReport(prev => prev ? { ...prev, status: 'SUBMITTED' } : null);
    } catch (e) {
      console.error(e);
      setValidationError("Failed to submit the report. Please try again.");
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
          {rows.map((r, i) => (
            <GlassCard key={`${r.classId}-${r.subjectId}-${i}`} className='p-5 shadow-sm border border-muted/60'>

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

              {/* Input Workspace Interface Layout */}
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
                  <label className='text-xs font-semibold text-muted-foreground flex items-center gap-1.5'>
                    <CheckCircle2 className="h-3 w-3" /> TODOs
                    {getTodosForPeriod(r.periodNumber, r.classId).length > 0 && (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                        {getTodosForPeriod(r.periodNumber, r.classId).length}
                      </span>
                    )}
                  </label>
                  <div className="border rounded-xl bg-background/50 min-h-[95px] p-2 space-y-1.5 overflow-y-auto max-h-[160px]">
                    {getTodosForPeriod(r.periodNumber, r.classId).length === 0 ? (
                      <p className="text-xs text-muted-foreground/70 flex items-center justify-center h-full min-h-[75px]">
                        No TODOs
                      </p>
                    ) : (
                      getTodosForPeriod(r.periodNumber, r.classId).map((todo) => (
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
          ))}

          {!readOnly && (
            <div className='flex justify-end pt-2'>
              <Button
                size='lg'
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className='rounded-xl px-10 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-medium shadow-sm'
              >
                {submitting ? 'Submitting…' : 'Submit Report'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}