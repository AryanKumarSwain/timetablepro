'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRequireAuth } from '@/lib/auth-context';
import {
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  resendTeacherCredentials,
  getSchoolDetails,
  getClasses,
  getSubjects,
} from '@/lib/api-services';
import { Teacher, Class, Subject } from '@/lib/types';
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
  KeyRound,
  Copy,
  Check,
  Loader2,
  BookOpen,
  Layers,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatClassName } from '@/lib/utils';

type TeacherFormState = Omit<Teacher, 'id'> & {
  classSubjectMap?: Record<string, string[]>;
};

const createEmptyTeacherForm = (): TeacherFormState => ({
  name: '',
  email: '',
  phone: '',
  qualifications: [],
  subjects: [],
  classes: [],
  classSubjectMap: {},
  active: true,
  joinDate: new Date().toISOString().split('T')[0],
});

export default function TeachersPage() {
  useRequireAuth('admin');

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TeacherFormState>(createEmptyTeacherForm);
  const [activeClassTab, setActiveClassTab] = useState<string>('');
  const [importOpen, setImportOpen] = useState(false);
  const [selectedTeacherForView, setSelectedTeacherForView] = useState<Teacher | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [credentialsModal, setCredentialsModal] = useState<{
    open: boolean;
    teacherName: string;
    email: string;
    phone?: string;
    password?: string;
    sent: boolean;
    whatsappSent?: boolean;
    whatsappSkipped?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [schoolPlan, setSchoolPlan] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvingConflicts, setResolvingConflicts] = useState(false);

  // 1. Core Initial Data Fetch
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

  // 2. Separate Self-Dismissing Toast Timer
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
      const [teachersData, classesData, subjectsData] = await Promise.all([
        getTeachers(),
        getClasses(),
        getSubjects(),
      ]);
      setTeachers(teachersData);
      setClasses(classesData);
      setAllSubjects(subjectsData);
    } catch (error) {
      console.error('Failed to load faculty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const data = await getTeachers();
      setTeachers(data);
    } catch (error) {
      console.error('Failed to reload teachers:', error);
    }
  };

  // Lookup maps
  const classMap = useMemo(() => {
    const map = new Map<string, Class>();
    classes.forEach((c) => map.set(c.id, c));
    return map;
  }, [classes]);

  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    allSubjects.forEach((s) => map.set(s.id, s));
    return map;
  }, [allSubjects]);

  const isClassEqual = (c1: string, c2: string) => {
    if (!c1 || !c2) return false;
    if (c1 === c2) return true;
    const cls1 = classMap.get(c1) || classes.find((c) => c.id === c1 || c.name === c1 || formatClassName(c) === c1 || (c.section ? `${c.name} (${c.section})` : c.name) === c1);
    const cls2 = classMap.get(c2) || classes.find((c) => c.id === c2 || c.name === c2 || formatClassName(c) === c2 || (c.section ? `${c.name} (${c.section})` : c.name) === c2);
    if (cls1 && cls2) return cls1.id === cls2.id;
    return false;
  };

  const isSubjectEqual = (s1: string, s2: string) => {
    if (!s1 || !s2) return false;
    if (s1.toLowerCase() === s2.toLowerCase()) return true;
    const sub1 = subjectMap.get(s1) || allSubjects.find((s) => s.id === s1 || s.name.toLowerCase() === s1.toLowerCase());
    const sub2 = subjectMap.get(s2) || allSubjects.find((s) => s.id === s2 || s.name.toLowerCase() === s2.toLowerCase());
    if (sub1 && sub2) return sub1.id === sub2.id;
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null); 
    setSuccessMsg(null);
    
    try {
      const selectedClasses = formData.classes || [];
      const classSubjectMap = formData.classSubjectMap || {};

      // Build specific (cid, sid) pairs to validate
      const classSubjectPairs: Array<{ cid: string; sid: string }> = [];
      const allUniqueSubs = new Set<string>();

      if (Object.keys(classSubjectMap).length > 0) {
        for (const [cid, sids] of Object.entries(classSubjectMap)) {
          if (!selectedClasses.includes(cid)) continue;
          (sids || []).forEach((sid) => {
            classSubjectPairs.push({ cid, sid });
            allUniqueSubs.add(sid);
          });
        }
      } else {
        const selectedSubjects = selectedClasses.length > 0 ? (formData.subjects || []) : [];
        for (const cid of selectedClasses) {
          for (const sid of selectedSubjects) {
            classSubjectPairs.push({ cid, sid });
            allUniqueSubs.add(sid);
          }
        }
      }

      // Validate: Prevent assigning a subject that is already assigned to another teacher for that specific class
      for (const { cid, sid } of classSubjectPairs) {
        const conflicting = teachers.find((other) => {
          if (editingId && other.id === editingId) return false;
          const oClasses = Array.isArray(other.classes) ? other.classes : [];
          const teachesClass = oClasses.some((oc) => isClassEqual(oc, cid));
          if (!teachesClass) return false;

          let otherSubsInThisClass: string[] = [];
          if (other.classSubjectMap && Object.keys(other.classSubjectMap).length > 0) {
            const matchCid = Object.keys(other.classSubjectMap).find((k) => isClassEqual(k, cid));
            otherSubsInThisClass = matchCid ? other.classSubjectMap[matchCid] || [] : [];
          } else {
            otherSubsInThisClass = Array.isArray(other.subjects) ? other.subjects : [];
          }

          const teachesSub = otherSubsInThisClass.some((os) => isSubjectEqual(os, sid));
          return teachesSub;
        });

        if (conflicting) {
          const cls = classMap.get(cid) || classes.find((c) => isClassEqual(c.id, cid));
          const cName = cls ? (cls.section ? `${cls.name} (${cls.section})` : cls.name) : cid;
          const sub = subjectMap.get(sid) || allSubjects.find((s) => isSubjectEqual(s.id, sid) || isSubjectEqual(s.name, sid));
          const sName = sub ? sub.name : sid;
          setErrorMsg(`"${sName}" in ${cName} is already assigned to ${conflicting.name}. Only one teacher can be assigned to a subject per class.`);
          return;
        }
      }

      const payload = {
        ...formData,
        classes: selectedClasses,
        subjects: Array.from(allUniqueSubs),
        classSubjectMap,
      };

      if (editingId) {
        await updateTeacher(editingId, payload);
        setSuccessMsg(`Profile updated successfully for ${formData.name}.`);
      } else {
        await createTeacher(payload);
        setSuccessMsg(`Teacher profile created and credentials sent to ${formData.email}.`);
      }
      await loadTeachers();
      
      setFormData(createEmptyTeacherForm());
      setEditingId(null);
      setActiveClassTab('');
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
    await loadData();
  };

  const handleEdit = (teacher: Teacher) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const teacherClasses = Array.isArray(teacher.classes) ? teacher.classes : [];
    const teacherClassSubjectMap: Record<string, string[]> = {};
    if (teacher.classSubjectMap && Object.keys(teacher.classSubjectMap).length > 0) {
      Object.assign(teacherClassSubjectMap, teacher.classSubjectMap);
    } else if (teacherClasses.length > 0 && Array.isArray(teacher.subjects)) {
      teacherClasses.forEach((cid) => {
        teacherClassSubjectMap[cid] = [...teacher.subjects];
      });
    }

    setFormData({
      name: teacher.name ?? '',
      email: teacher.email ?? '',
      phone: teacher.phone ?? '',
      qualifications: Array.isArray(teacher.qualifications) ? teacher.qualifications : [],
      subjects: teacherClasses.length > 0 && Array.isArray(teacher.subjects) ? teacher.subjects : [],
      classes: teacherClasses,
      classSubjectMap: teacherClassSubjectMap,
      active: teacher.active ?? true,
      joinDate: teacher.joinDate ?? new Date().toISOString().split('T')[0],
    });
    setEditingId(teacher.id);
    setActiveClassTab(teacherClasses[0] || '');
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
        phone: res.phone || teacher.phone,
        password: res.tempPassword,
        sent: res.sent,
        whatsappSent: res.whatsappSent,
        whatsappSkipped: res.whatsappSkipped,
      });

      const channels: string[] = [];
      if (res.sent) channels.push('Email');
      if (res.whatsappSent) channels.push('WhatsApp');

      if (channels.length > 0) {
        setSuccessMsg(`Login credentials dispatched via ${channels.join(' and ')} for ${teacher.name}`);
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

  // Keep activeClassTab aligned with selected classes
  useEffect(() => {
    const currentClasses = formData.classes || [];
    if (currentClasses.length === 0) {
      if (activeClassTab !== '') setActiveClassTab('');
    } else if (!currentClasses.includes(activeClassTab)) {
      setActiveClassTab(currentClasses[0]);
    }
  }, [formData.classes, activeClassTab]);

  // Subjects available for the active class tab (or school-wide subjects)
  const availableSubjects = useMemo(() => {
    if (!activeClassTab) return [];
    const cls = classMap.get(activeClassTab) || classes.find((c) => isClassEqual(c.id, activeClassTab));
    const activeCid = cls ? cls.id : activeClassTab;

    return allSubjects.filter((s) => {
      // School-wide subjects (no specific classes attached) are available to any class
      if (!s.classIds || s.classIds.length === 0) return true;
      // Subjects linked to the currently active class
      return s.classIds.some((cid) => isClassEqual(cid, activeCid));
    });
  }, [allSubjects, activeClassTab, classMap, classes, isClassEqual]);

  // Map of subject conflicts for the active class: subjectId/name -> { teacherName: string; className: string }
  const subjectConflicts = useMemo(() => {
    const map = new Map<string, { teacherName: string; className: string }>();
    if (!activeClassTab) return map;

    const cls = classMap.get(activeClassTab) || classes.find((c) => isClassEqual(c.id, activeClassTab));
    const activeCid = cls ? cls.id : activeClassTab;
    const className = cls ? (cls.section ? `${cls.name} (${cls.section})` : cls.name) : activeClassTab;

    teachers.forEach((other) => {
      if (editingId && other.id === editingId) return;

      const otherClasses = Array.isArray(other.classes) ? other.classes : [];
      if (!otherClasses.some((oc) => isClassEqual(oc, activeCid))) return;

      let otherSubsInThisClass: string[] = [];
      if (other.classSubjectMap && Object.keys(other.classSubjectMap).length > 0) {
        const matchCid = Object.keys(other.classSubjectMap).find((k) => isClassEqual(k, activeCid));
        otherSubsInThisClass = matchCid ? other.classSubjectMap[matchCid] || [] : [];
      } else {
        otherSubsInThisClass = Array.isArray(other.subjects) ? other.subjects : [];
      }

      allSubjects.forEach((sub) => {
        if (otherSubsInThisClass.some((os) => isSubjectEqual(os, sub.id) || isSubjectEqual(os, sub.name))) {
          if (!map.has(sub.id)) {
            map.set(sub.id, { teacherName: other.name, className });
          }
          if (!map.has(sub.name)) {
            map.set(sub.name, { teacherName: other.name, className });
          }
        }
      });
    });

    return map;
  }, [activeClassTab, teachers, editingId, classMap, classes, allSubjects, isClassEqual, isSubjectEqual]);

  // School-wide duplicate assignments detection: subjects assigned to >1 teacher for the same class
  const duplicateSubjectAssignments = useMemo(() => {
    const assignmentMap = new Map<
      string,
      {
        classId: string;
        className: string;
        subjectId: string;
        subjectName: string;
        teachers: Array<{ id: string; name: string }>;
      }
    >();

    teachers.forEach((t) => {
      const tClasses = Array.isArray(t.classes) ? t.classes : [];
      const tSubjects = Array.isArray(t.subjects) ? t.subjects : [];
      if (tClasses.length === 0 || tSubjects.length === 0) return;

      tClasses.forEach((cid) => {
        const cls = classMap.get(cid) || classes.find((c) => isClassEqual(c.id, cid));
        const cId = cls ? cls.id : cid;
        const cName = cls ? (cls.section ? `${cls.name} (${cls.section})` : cls.name) : cid;

        let subjectsInClass = tSubjects;
        if (t.classSubjectMap && Object.keys(t.classSubjectMap).length > 0) {
          const matchCid = Object.keys(t.classSubjectMap).find((k) => isClassEqual(k, cid));
          subjectsInClass = matchCid ? t.classSubjectMap[matchCid] || [] : [];
        }

        subjectsInClass.forEach((sid) => {
          const sub = subjectMap.get(sid) || allSubjects.find((s) => isSubjectEqual(s.id, sid) || isSubjectEqual(s.name, sid));
          const sId = sub ? sub.id : sid;
          const sName = sub ? sub.name : sid;

          const key = `${cId}::${sId}`;
          const existing = assignmentMap.get(key) || {
            classId: cId,
            className: cName,
            subjectId: sId,
            subjectName: sName,
            teachers: [],
          };

          if (!existing.teachers.some((et) => et.id === t.id)) {
            existing.teachers.push({ id: t.id, name: t.name });
          }
          assignmentMap.set(key, existing);
        });
      });
    });

    const conflicts: Array<{
      key: string;
      classId: string;
      className: string;
      subjectId: string;
      subjectName: string;
      teachers: Array<{ id: string; name: string }>;
    }> = [];

    assignmentMap.forEach((val, key) => {
      if (val.teachers.length > 1) {
        conflicts.push({ key, ...val });
      }
    });

    return conflicts;
  }, [teachers, classes, allSubjects, classMap, subjectMap, isClassEqual, isSubjectEqual]);

  const handleAutoResolveConflicts = async () => {
    if (duplicateSubjectAssignments.length === 0) return;
    try {
      setResolvingConflicts(true);
      const teacherUpdates = new Map<string, string[]>();

      duplicateSubjectAssignments.forEach((c) => {
        // First teacher keeps it, subsequent teachers have this subject removed
        for (let i = 1; i < c.teachers.length; i++) {
          const tId = c.teachers[i].id;
          const teacherObj = teachers.find((t) => t.id === tId);
          if (!teacherObj) continue;

          const currentSubs = teacherUpdates.has(tId)
            ? teacherUpdates.get(tId)!
            : Array.isArray(teacherObj.subjects)
            ? [...teacherObj.subjects]
            : [];

          const filteredSubs = currentSubs.filter(
            (s) => !isSubjectEqual(s, c.subjectId) && !isSubjectEqual(s, c.subjectName)
          );
          teacherUpdates.set(tId, filteredSubs);
        }
      });

      for (const [tId, updatedSubs] of teacherUpdates.entries()) {
        const teacherObj = teachers.find((t) => t.id === tId);
        if (!teacherObj) continue;
        await updateTeacher(tId, {
          ...teacherObj,
          subjects: updatedSubs,
        });
      }

      toast.success('Duplicate assignments auto-resolved! Each subject is now exclusively assigned to one teacher.');
      await loadTeachers();
    } catch (err: any) {
      console.error('Failed to resolve duplicate conflicts:', err);
      toast.error(err?.message || 'Failed to auto-resolve conflicts.');
    } finally {
      setResolvingConflicts(false);
    }
  };

  // Filtered teachers list based on search query
  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return teachers;

    return teachers.filter((teacher) => {
      // 1. Name match
      if (teacher.name?.toLowerCase().includes(q)) return true;
      // 2. Email match
      if (teacher.email?.toLowerCase().includes(q)) return true;
      // 3. Phone match
      if (teacher.phone?.toLowerCase().includes(q)) return true;

      // 4. Assigned classes match (e.g. "Class 10", "10A", section)
      const teacherClasses = Array.isArray(teacher.classes) ? teacher.classes : [];
      const matchesClass = teacherClasses.some((cid) => {
        const cls = classMap.get(cid) || classes.find((c) => isClassEqual(c.id, cid));
        if (!cls) return cid.toLowerCase().includes(q);
        const nameMatch = cls.name?.toLowerCase().includes(q);
        const secMatch = cls.section?.toLowerCase().includes(q);
        const combined = `${cls.name} ${cls.section}`.toLowerCase();
        return nameMatch || secMatch || combined.includes(q);
      });
      if (matchesClass) return true;

      // 5. Assigned subjects match
      const teacherSubjects = Array.isArray(teacher.subjects) ? teacher.subjects : [];
      const matchesSubject = teacherSubjects.some((sid) => {
        const sub = subjectMap.get(sid) || allSubjects.find((s) => isSubjectEqual(s.id, sid) || isSubjectEqual(s.name, sid));
        const name = sub?.name || sid;
        return name.toLowerCase().includes(q);
      });
      if (matchesSubject) return true;

      return false;
    });
  }, [teachers, searchQuery, classMap, classes, subjectMap, allSubjects, isClassEqual, isSubjectEqual]);

  const toggleClassSelection = (classId: string) => {
    setFormData((prev) => {
      const current = prev.classes || [];
      const exists = current.includes(classId);
      const nextClasses = exists
        ? current.filter((id) => id !== classId)
        : [...current, classId];

      const nextMap = { ...(prev.classSubjectMap || {}) };
      if (exists) {
        delete nextMap[classId];
      } else {
        if (!nextMap[classId]) {
          nextMap[classId] = [];
        }
      }

      // Recompute flat subjects from nextMap
      const allSubs = new Set<string>();
      Object.values(nextMap).forEach((sids) => (sids || []).forEach((s) => allSubs.add(s)));

      return {
        ...prev,
        classes: nextClasses,
        classSubjectMap: nextMap,
        subjects: Array.from(allSubs),
      };
    });
  };

  const selectAllClasses = () => {
    setFormData((prev) => {
      const nextClasses = classes.map((c) => c.id);
      const nextMap = { ...(prev.classSubjectMap || {}) };
      nextClasses.forEach((cid) => {
        if (!nextMap[cid]) nextMap[cid] = [];
      });
      return {
        ...prev,
        classes: nextClasses,
        classSubjectMap: nextMap,
      };
    });
  };

  const clearAllClasses = () => {
    setFormData((prev) => ({
      ...prev,
      classes: [],
      subjects: [],
      classSubjectMap: {},
    }));
  };

  const toggleSubjectSelection = (subjectId: string) => {
    if (!activeClassTab) {
      toast.error('Please select a class first.');
      return;
    }

    setFormData((prev) => {
      const nextMap = { ...(prev.classSubjectMap || {}) };
      const currentForClass = nextMap[activeClassTab] || [];
      const exists = currentForClass.some((s) => isSubjectEqual(s, subjectId));

      if (!exists) {
        const conflict = subjectConflicts.get(subjectId) || subjectConflicts.get(
          subjectMap.get(subjectId)?.name || ''
        );
        if (conflict) {
          const sub = subjectMap.get(subjectId) || allSubjects.find((s) => isSubjectEqual(s.id, subjectId) || isSubjectEqual(s.name, subjectId));
          const sName = sub ? sub.name : subjectId;
          toast.error(`"${sName}" in ${conflict.className} is already assigned to ${conflict.teacherName}. Only one teacher can be assigned to a subject per class.`);
          return prev;
        }
      }

      const nextForClass = exists
        ? currentForClass.filter((id) => !isSubjectEqual(id, subjectId))
        : [...currentForClass, subjectId];

      nextMap[activeClassTab] = nextForClass;

      // Recalculate overall unique subjects
      const allSubs = new Set<string>();
      Object.values(nextMap).forEach((sids) => (sids || []).forEach((s) => allSubs.add(s)));

      return {
        ...prev,
        classSubjectMap: nextMap,
        subjects: Array.from(allSubs),
      };
    });
  };

  const selectAllAvailableSubjects = () => {
    if (!activeClassTab) return;
    const unconflicted = availableSubjects
      .filter((s) => !subjectConflicts.has(s.id) && !subjectConflicts.has(s.name))
      .map((s) => s.id);

    setFormData((prev) => {
      const nextMap = { ...(prev.classSubjectMap || {}) };
      nextMap[activeClassTab] = Array.from(new Set([...(nextMap[activeClassTab] || []), ...unconflicted]));

      const allSubs = new Set<string>();
      Object.values(nextMap).forEach((sids) => (sids || []).forEach((s) => allSubs.add(s)));

      return {
        ...prev,
        classSubjectMap: nextMap,
        subjects: Array.from(allSubs),
      };
    });
  };

  const clearAllSubjects = () => {
    if (!activeClassTab) return;
    setFormData((prev) => {
      const nextMap = { ...(prev.classSubjectMap || {}) };
      nextMap[activeClassTab] = [];

      const allSubs = new Set<string>();
      Object.values(nextMap).forEach((sids) => (sids || []).forEach((s) => allSubs.add(s)));

      return {
        ...prev,
        classSubjectMap: nextMap,
        subjects: Array.from(allSubs),
      };
    });
  };

  const copySubjectsToAllClasses = () => {
    if (!activeClassTab) return;
    const currentSubs = (formData.classSubjectMap || {})[activeClassTab] || [];
    if (currentSubs.length === 0) {
      toast.error('No subjects assigned in the active class to copy.');
      return;
    }

    const selectedClasses = formData.classes || [];
    let skippedDueToConflict = 0;

    setFormData((prev) => {
      const nextMap = { ...(prev.classSubjectMap || {}) };

      selectedClasses.forEach((cid) => {
        if (cid === activeClassTab) return;
        const targetExisting = nextMap[cid] || [];
        const updatedForCid = [...targetExisting];

        currentSubs.forEach((sid) => {
          // Check if conflict in this target cid
          const isConflicting = teachers.some((other) => {
            if (editingId && other.id === editingId) return false;
            const otherClasses = Array.isArray(other.classes) ? other.classes : [];
            if (!otherClasses.some((oc) => isClassEqual(oc, cid))) return false;

            let otherSubsInThisClass: string[] = [];
            if (other.classSubjectMap && Object.keys(other.classSubjectMap).length > 0) {
              const matchCid = Object.keys(other.classSubjectMap).find((k) => isClassEqual(k, cid));
              otherSubsInThisClass = matchCid ? other.classSubjectMap[matchCid] || [] : [];
            } else {
              otherSubsInThisClass = Array.isArray(other.subjects) ? other.subjects : [];
            }
            return otherSubsInThisClass.some((os) => isSubjectEqual(os, sid));
          });

          if (isConflicting) {
            skippedDueToConflict++;
          } else {
            if (!updatedForCid.some((s) => isSubjectEqual(s, sid))) {
              updatedForCid.push(sid);
            }
          }
        });

        nextMap[cid] = updatedForCid;
      });

      const allSubs = new Set<string>();
      Object.values(nextMap).forEach((sids) => (sids || []).forEach((s) => allSubs.add(s)));

      return {
        ...prev,
        classSubjectMap: nextMap,
        subjects: Array.from(allSubs),
      };
    });

    if (skippedDueToConflict > 0) {
      toast.success(`Subjects copied to classes (${skippedDueToConflict} skipped due to existing teacher assignments in those classes).`);
    } else {
      toast.success('Subjects copied to all selected classes successfully!');
    }
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

            {/* 1. ASSIGNED CLASSES (MULTI-SELECT) */}
            <div className='pt-3 border-t border-border/50'>
              <div className='flex items-center justify-between mb-2'>
                <div>
                  <label className='block text-sm font-semibold text-foreground'>
                    1. Assign Classes
                  </label>
                  <p className='text-xs text-muted-foreground'>
                    Select which classes this teacher is responsible for
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
                  No classes created yet. Please create classes first under the Classes tab.
                </div>
              ) : (
                <div className='flex flex-wrap gap-2 pt-1 max-h-40 overflow-y-auto p-1'>
                  {classes.map((cls) => {
                    const isSelected = (formData.classes || []).includes(cls.id);
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
                {(formData.classes || []).length === 0 ? (
                  <span>No specific classes selected (Select classes to enable subject filtering)</span>
                ) : (
                  <span>Selected for <strong>{(formData.classes || []).length}</strong> of {classes.length} classes</span>
                )}
              </div>
            </div>

            {/* 2. ASSIGNED SUBJECTS (FILTERED BY SELECTED CLASSES) */}
            <div className='pt-3 border-t border-border/50'>
              <div className='flex items-center justify-between mb-2'>
                <div>
                  <label className='block text-sm font-semibold text-foreground'>
                    2. Assign Subjects
                  </label>
                  <p className='text-xs text-muted-foreground'>
                    Available subjects taught in the selected classes
                  </p>
                </div>
                {availableSubjects.length > 0 && (
                  <div className='flex items-center gap-2'>
                    <button
                      type='button'
                      onClick={selectAllAvailableSubjects}
                      className='text-xs font-medium text-primary hover:underline'
                    >
                      Select All
                    </button>
                    <span className='text-xs text-muted-foreground'>•</span>
                    <button
                      type='button'
                      onClick={clearAllSubjects}
                      className='text-xs font-medium text-muted-foreground hover:text-foreground'
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Class Tabs when multiple classes are selected */}
              {(formData.classes || []).length > 1 && (
                <div className='flex items-center justify-between gap-2 overflow-x-auto pb-1 mb-3 pt-1'>
                  <div className='flex items-center gap-1.5 flex-wrap'>
                    <span className='text-xs font-semibold text-muted-foreground mr-1'>Configuring Class:</span>
                    {(formData.classes || []).map((cid) => {
                      const cls = classMap.get(cid) || classes.find((c) => isClassEqual(c.id, cid));
                      const label = cls ? (cls.section ? `${cls.name} (${cls.section})` : cls.name) : cid;
                      const isActive = isClassEqual(activeClassTab, cid);
                      const subCount = ((formData.classSubjectMap || {})[cid] || []).length;

                      return (
                        <button
                          key={cid}
                          type='button'
                          onClick={() => setActiveClassTab(cid)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                            isActive
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20'
                              : 'bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                          }`}
                        >
                          <span>{label}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                              isActive
                                ? 'bg-primary-foreground/20 text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {subCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type='button'
                    onClick={copySubjectsToAllClasses}
                    className='text-xs font-medium text-primary hover:underline flex items-center gap-1 shrink-0 bg-primary/5 hover:bg-primary/10 px-2.5 py-1.5 rounded-lg border border-primary/20'
                    title='Copy subjects from active class to all other selected classes'
                  >
                    <Copy className='h-3.5 w-3.5' />
                    <span>Apply to all classes</span>
                  </button>
                </div>
              )}

              {(formData.classes || []).length === 0 ? (
                <div className='p-4 bg-muted/30 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5'>
                  <Layers className='h-4 w-4 text-muted-foreground' />
                  <span>Please select one or more classes above to unlock available subjects for this teacher.</span>
                </div>
              ) : availableSubjects.length === 0 ? (
                <div className='p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 text-center text-xs text-amber-600 dark:text-amber-400'>
                  No subjects are currently linked to the selected class. You can link subjects under the Subjects tab.
                </div>
              ) : (
                <div className='flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto p-1'>
                  {availableSubjects.map((sub) => {
                    const isSelected = ((formData.classSubjectMap || {})[activeClassTab] || []).some(
                      (sid) => isSubjectEqual(sid, sub.id) || isSubjectEqual(sid, sub.name)
                    );
                    const conflict = subjectConflicts.get(sub.id) || subjectConflicts.get(sub.name);
                    const isConflicted = Boolean(conflict && !isSelected);
                    const isConflictExisting = Boolean(conflict && isSelected);

                    return (
                      <button
                        key={sub.id}
                        type='button'
                        disabled={isConflicted}
                        onClick={() => toggleSubjectSelection(sub.id)}
                        title={
                          conflict
                            ? `Assigned to ${conflict.teacherName} in ${conflict.className}`
                            : undefined
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          isConflicted
                            ? 'bg-muted/40 text-muted-foreground/60 border-dashed border-border/80 cursor-not-allowed opacity-60'
                            : isConflictExisting
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
                            : isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                        }`}
                      >
                        {isConflicted ? (
                          <Lock className='w-3.5 h-3.5 text-muted-foreground' />
                        ) : isConflictExisting ? (
                          <AlertTriangle className='w-3.5 h-3.5 text-rose-500' />
                        ) : (
                          <span
                            className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[10px] border ${
                              isSelected
                                ? 'bg-white text-emerald-600 border-white'
                                : 'border-muted-foreground/40'
                            }`}
                          >
                            {isSelected && '✓'}
                          </span>
                        )}
                        <span>{sub.name}</span>
                        <span
                          className={`text-[10px] font-mono px-1 rounded ${
                            isSelected && !isConflictExisting
                              ? 'bg-emerald-700/50 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {sub.code}
                        </span>
                        {conflict && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              isConflictExisting
                                ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {isConflictExisting ? `Conflict with ${conflict.teacherName}` : conflict.teacherName}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {(formData.classes || []).length > 0 && activeClassTab && (
                <div className='mt-2 flex items-center justify-between text-xs text-muted-foreground'>
                  <div className='flex items-center gap-2'>
                    <span className='inline-block w-2 h-2 rounded-full bg-emerald-500' />
                    <span>
                      Assigned <strong>{((formData.classSubjectMap || {})[activeClassTab] || []).length}</strong> subjects for {(() => {
                        const cls = classMap.get(activeClassTab) || classes.find((c) => isClassEqual(c.id, activeClassTab));
                        return cls ? (cls.section ? `${cls.name} (${cls.section})` : cls.name) : activeClassTab;
                      })()}
                    </span>
                    {(formData.classes || []).length > 1 && (
                      <span className='text-muted-foreground/70'>
                        (<strong>{(formData.subjects || []).length}</strong> unique across all {(formData.classes || []).length} classes)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className='flex gap-2 pt-3 border-t border-border/50'>
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

      {duplicateSubjectAssignments.length > 0 && (
        <div className='mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm'>
          <div className='flex items-start gap-3'>
            <AlertTriangle className='h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0' />
            <div>
              <h4 className='text-sm font-semibold text-amber-900 dark:text-amber-200'>
                {duplicateSubjectAssignments.length} Duplicate Subject Assignment{duplicateSubjectAssignments.length > 1 ? 's' : ''} Detected
              </h4>
              <p className='text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed'>
                Each subject in a class can only be assigned to <strong>one</strong> teacher. Currently: {duplicateSubjectAssignments.map((c) => `"${c.subjectName}" in ${c.className} (${c.teachers.map((t) => t.name).join(' & ')})`).join('; ')}.
              </p>
            </div>
          </div>
          <Button
            size='sm'
            onClick={handleAutoResolveConflicts}
            disabled={resolvingConflicts}
            className='bg-amber-600 hover:bg-amber-700 text-white shrink-0 text-xs font-semibold shadow-sm rounded-lg px-4 py-2'
          >
            {resolvingConflicts ? (
              <>
                <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
                Resolving...
              </>
            ) : (
              'Auto-Resolve Conflicts'
            )}
          </Button>
        </div>
      )}

      <DataGrid
        title='Faculty directory'
        searchPlaceholder='Search teachers by name, email, subject, class...'
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        empty={filteredTeachers.length === 0}
        emptyMessage={
          searchQuery.trim()
            ? `No teachers found matching "${searchQuery}"`
            : 'No faculty records found'
        }
      >
        {/* DESKTOP TABLE VIEW */}
        <div className='hidden md:block'>
          <DataGridTable>
            <DataGridHead>
              <tr>
                <DataGridTh className='w-[18%] min-w-[150px]'>Name</DataGridTh>
                <DataGridTh className='w-[20%] min-w-[170px]'>Contact</DataGridTh>
                <DataGridTh className='w-[22%] min-w-[170px]'>Assigned Classes</DataGridTh>
                <DataGridTh className='w-[22%] min-w-[170px]'>Assigned Subjects</DataGridTh>
                <DataGridTh className='w-[8%] min-w-[80px] text-center'>Status</DataGridTh>
                <DataGridTh className='w-[10%] min-w-[150px] text-right pr-6'>Actions</DataGridTh>
              </tr>
            </DataGridHead>
            <tbody>
              {filteredTeachers.map((teacher) => {
                const teacherClasses = Array.isArray(teacher.classes) ? teacher.classes : [];
                const teacherSubjects = Array.isArray(teacher.subjects) ? teacher.subjects : [];

                return (
                  <DataGridRow key={teacher.id}>
                    <DataGridTd className='font-medium'>{teacher.name}</DataGridTd>
                    <DataGridTd className='text-muted-foreground text-xs'>
                      <div className='flex flex-col'>
                        <span className='truncate'>{teacher.email}</span>
                        {teacher.phone && <span className='text-muted-foreground/70'>{teacher.phone}</span>}
                      </div>
                    </DataGridTd>
                    <DataGridTd>
                      {teacherClasses.length > 0 ? (
                        <div className='flex flex-wrap items-center gap-1 max-w-[240px]'>
                          {teacherClasses.slice(0, 2).map((cid) => {
                            const cls = classMap.get(cid);
                            const label = cls ? formatClassName(cls) : cid;
                            return (
                              <span
                                key={cid}
                                className='inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary border border-primary/20'
                              >
                                {label}
                              </span>
                            );
                          })}
                          {teacherClasses.length > 2 && (
                            <span
                              title={teacherClasses
                                .slice(2)
                                .map((cid) => {
                                  const cls = classMap.get(cid);
                                  return cls ? formatClassName(cls) : cid;
                                })
                                .join(', ')}
                              className='inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-primary/15 text-primary border border-primary/30 cursor-help'
                            >
                              +{teacherClasses.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className='text-xs text-muted-foreground italic'>None assigned</span>
                      )}
                    </DataGridTd>
                    <DataGridTd>
                      {(() => {
                        const validSubjects = (teacherClasses.length > 0 ? teacherSubjects : []).filter(
                          (sid) => subjectMap.has(sid) || allSubjects.some((s) => s.id === sid || s.name === sid)
                        );
                        if (validSubjects.length === 0) {
                          return <span className='text-xs text-muted-foreground italic'>None assigned</span>;
                        }

                        return (
                          <div className='flex flex-wrap items-center gap-1 max-w-[240px]'>
                            {validSubjects.slice(0, 2).map((sid) => {
                              const sub = subjectMap.get(sid) || allSubjects.find((s) => isSubjectEqual(s.id, sid) || isSubjectEqual(s.name, sid));
                              const label = sub ? sub.name : sid;
                              const conflictInfo = duplicateSubjectAssignments.find((c) =>
                                c.teachers.some((t) => t.id === teacher.id) &&
                                (isSubjectEqual(c.subjectId, sid) || isSubjectEqual(c.subjectName, sid)) &&
                                teacherClasses.some((tc) => isClassEqual(tc, c.classId))
                              );

                              return (
                                <span
                                  key={sid}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${
                                    conflictInfo
                                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                  }`}
                                  title={
                                    conflictInfo
                                      ? `Conflict: Also assigned to ${conflictInfo.teachers.filter((t) => t.id !== teacher.id).map((t) => t.name).join(', ')} in ${conflictInfo.className}`
                                      : undefined
                                  }
                                >
                                  {conflictInfo && <AlertTriangle className='w-3 h-3 text-rose-500 shrink-0' />}
                                  {label}
                                </span>
                              );
                            })}
                            {validSubjects.length > 2 && (
                              <span
                                title={validSubjects
                                  .slice(2)
                                  .map((sid) => {
                                    const sub = subjectMap.get(sid) || allSubjects.find((s) => s.name === sid || s.id === sid);
                                    return sub ? sub.name : sid;
                                  })
                                  .join(', ')}
                                className='inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 cursor-help'
                              >
                                +{validSubjects.length - 2}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </DataGridTd>
                    <DataGridTd className='text-center'>
                      {teacher.active ? (
                        <span className='inline-flex items-center px-2 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs rounded-full font-medium'>
                          Active
                        </span>
                      ) : (
                        <span className='inline-flex items-center px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full'>
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
                );
              })}
            </tbody>
          </DataGridTable>
        </div>

        {/* MOBILE COMPACT LIST VIEW - NO HORIZONTAL SCROLL NEEDED */}
        <div className='block md:hidden divide-y divide-border/40'>
          {filteredTeachers.map((teacher) => {
            const teacherClasses = Array.isArray(teacher.classes) ? teacher.classes : [];
            const teacherSubjects = Array.isArray(teacher.subjects) ? teacher.subjects : [];

            return (
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
                  <div className='flex flex-wrap gap-1 mt-1 text-[11px]'>
                    {teacherClasses.length > 0 && (
                      <span className='px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium'>
                        {teacherClasses.length} {teacherClasses.length === 1 ? 'class' : 'classes'}
                      </span>
                    )}
                    {teacherSubjects.length > 0 && (
                      <span className='px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium'>
                        {teacherSubjects.length} {teacherSubjects.length === 1 ? 'subject' : 'subjects'}
                      </span>
                    )}
                    {duplicateSubjectAssignments.some((c) =>
                      c.teachers.some((t) => t.id === teacher.id) &&
                      teacherClasses.some((tc) => isClassEqual(tc, c.classId))
                    ) && (
                      <span className='px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 font-medium inline-flex items-center gap-1'>
                        <AlertTriangle className='w-3 h-3 text-rose-500' />
                        Conflict
                      </span>
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
            );
          })}
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

            <div className='space-y-3.5 py-2 text-sm'>
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

              {/* ASSIGNED CLASSES */}
              <div className='p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1.5'>
                <div className='flex items-center gap-2 text-xs text-muted-foreground font-medium'>
                  <Layers className='h-4 w-4 text-primary' />
                  <span>Assigned Classes</span>
                </div>
                {Array.isArray(selectedTeacherForView.classes) && selectedTeacherForView.classes.length > 0 ? (
                  <div className='flex flex-wrap gap-1.5 pt-1'>
                    {selectedTeacherForView.classes.map((cid) => {
                      const cls = classMap.get(cid);
                      const label = cls ? (cls.section ? `${cls.name} (${cls.section})` : cls.name) : cid;
                      return (
                        <span key={cid} className='px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-md border border-primary/20 font-medium'>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className='text-xs text-muted-foreground italic'>No classes assigned</p>
                )}
              </div>

              {/* ASSIGNED SUBJECTS */}
              <div className='p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1.5'>
                <div className='flex items-center gap-2 text-xs text-muted-foreground font-medium'>
                  <BookOpen className='h-4 w-4 text-emerald-500' />
                  <span>Assigned Subjects</span>
                </div>
                {(() => {
                  const teacherClasses = Array.isArray(selectedTeacherForView.classes) ? selectedTeacherForView.classes : [];
                  if (teacherClasses.length === 0) {
                    return <p className='text-xs text-muted-foreground italic'>No classes assigned</p>;
                  }

                  const classSubMap = selectedTeacherForView.classSubjectMap;
                  if (classSubMap && Object.keys(classSubMap).length > 0) {
                    return (
                      <div className='space-y-2 pt-1'>
                        {teacherClasses.map((cid) => {
                          const cls = classMap.get(cid) || classes.find((c) => isClassEqual(c.id, cid));
                          const cName = cls ? formatClassName(cls) : cid;
                          const matchCid = Object.keys(classSubMap).find((k) => isClassEqual(k, cid));
                          const subs = matchCid ? classSubMap[matchCid] || [] : [];

                          return (
                            <div key={cid} className='p-2 rounded-lg bg-background border border-border/60'>
                              <p className='text-xs font-semibold text-foreground mb-1'>{cName}:</p>
                              {subs.length === 0 ? (
                                <span className='text-[11px] text-muted-foreground italic'>No subjects assigned</span>
                              ) : (
                                <div className='flex flex-wrap gap-1'>
                                  {subs.map((sid) => {
                                    const sub = subjectMap.get(sid) || allSubjects.find((s) => isSubjectEqual(s.id, sid) || isSubjectEqual(s.name, sid));
                                    const label = sub ? sub.name : sid;
                                    return (
                                      <span key={sid} className='px-2 py-0.5 text-[11px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/20 font-medium'>
                                        {label}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  const validSubs = Array.isArray(selectedTeacherForView.subjects)
                    ? selectedTeacherForView.subjects.filter((sid) => subjectMap.has(sid) || allSubjects.some((s) => s.id === sid || s.name === sid))
                    : [];

                  if (validSubs.length === 0) {
                    return <p className='text-xs text-muted-foreground italic'>No subjects assigned</p>;
                  }

                  return (
                    <div className='flex flex-wrap gap-1.5 pt-1'>
                      {validSubs.map((sid) => {
                        const sub = subjectMap.get(sid) || allSubjects.find((s) => s.name === sid || s.id === sid);
                        const label = sub ? sub.name : sid;
                        return (
                          <span key={sid} className='px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/20 font-medium'>
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  );
                })()}
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
                    {credentialsModal.sent || credentialsModal.whatsappSent
                      ? `Credentials dispatched for ${credentialsModal.teacherName}`
                      : `New login password generated for ${credentialsModal.teacherName}`}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className='space-y-3 py-2 text-sm'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {credentialsModal.sent ? (
                  <div className='p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-600' />
                    <span>Email sent successfully</span>
                  </div>
                ) : (
                  <div className='p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2'>
                    <AlertCircle className='h-4 w-4 shrink-0 text-amber-600 mt-0.5' />
                    <span>Email delivery failed / skipped</span>
                  </div>
                )}

                {credentialsModal.whatsappSent ? (
                  <div className='p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-600' />
                    <span>WhatsApp sent successfully</span>
                  </div>
                ) : credentialsModal.whatsappSkipped ? (
                  <div className='p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2'>
                    <CheckCircle2 className='h-4 w-4 shrink-0 text-blue-600' />
                    <span>WhatsApp skipped (1st resend only)</span>
                  </div>
                ) : (
                  <div className='p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2'>
                    <AlertCircle className='h-4 w-4 shrink-0 text-amber-600 mt-0.5' />
                    <span>WhatsApp not sent</span>
                  </div>
                )}
              </div>

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
                            const baseOrigin = window.location.origin.includes('localhost')
                              ? 'https://timetablepro.webncode.in'
                              : window.location.origin;
                            navigator.clipboard.writeText(
                              `Welcome to Teacher Portal - TimeTablePro\nTeacher: ${credentialsModal.teacherName}\nEmail: ${credentialsModal.email}\nPassword: ${credentialsModal.password}\nLogin at: ${baseOrigin}/login`
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