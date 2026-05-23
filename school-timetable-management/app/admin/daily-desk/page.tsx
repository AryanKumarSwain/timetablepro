'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/auth-context';

import {
  getClasses,
  getPeriods,
  getTeachers,
  getSubjects,
  getWeeklyTimetableForClass,
  getDailyAttendance,
  markAttendance,
  getReplacements,
  createReplacement,
  updateReplacementStatus,
} from '@/lib/api-services';

import {
  Class,
  Period,
  Teacher,
  Subject,
  DailyAttendance,
  Replacement,
} from '@/lib/types';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DailyDeskPage() {
  useRequireAuth('admin');

  const [classes, setClasses] = useState<Class[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>('');

  const [attendance, setAttendance] = useState<DailyAttendance[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [showReplacementForm, setShowReplacementForm] = useState(false);

  const [replacementForm, setReplacementForm] = useState({
    periodId: '',
    originalTeacherId: '',
    replacementTeacherId: '',
    reason: 'Leave',
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadDailyData();
    }
  }, [selectedClass]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const [
        classesData,
        periodsData,
        teachersData,
        subjectsData,
      ] = await Promise.all([
        getClasses(),
        getPeriods(),
        getTeachers(),
        getSubjects(),
      ]);

      setClasses(classesData);
      setPeriods(periodsData);
      setTeachers(teachersData);
      setSubjects(subjectsData);

      if (classesData.length > 0) {
        setSelectedClass(classesData[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyData = async () => {
    try {
      const today = getTodayDate();

      const [
        attendanceData,
        replacementData,
        timetableData,
      ] = await Promise.all([
        getDailyAttendance(today),
        getReplacements({ date: today }),
        getWeeklyTimetableForClass(selectedClass),
      ]);

      setAttendance(attendanceData);
      setReplacements(replacementData);
      setTimetableEntries(timetableData);
    } catch (error) {
      console.error('Failed to load daily data:', error);
    }
  };

  const handleMarkAttendance = async (
    classId: string,
    periodId: string,
    teacherId: string,
    isAbsent: boolean
  ) => {
    try {
      await markAttendance(
        classId,
        periodId,
        teacherId,
        getTodayDate(),
        isAbsent
      );

      await loadDailyData();
    } catch (error) {
      console.error('Failed to mark attendance:', error);
    }
  };

  const handleAddReplacement = async () => {
    if (
      !replacementForm.periodId ||
      !replacementForm.originalTeacherId ||
      !replacementForm.replacementTeacherId
    ) {
      alert('Please fill all fields');
      return;
    }

    try {
      await createReplacement({
        classId: selectedClass,
        date: getTodayDate(),
        periodId: replacementForm.periodId,
        originalTeacherId: replacementForm.originalTeacherId,
        replacementTeacherId:
          replacementForm.replacementTeacherId,
        subjectId: '',
        reason:
          replacementForm.reason as
            | 'Leave'
            | 'Medical'
            | 'Other',
        status: 'pending',
      });

      setShowReplacementForm(false);

      setReplacementForm({
        periodId: '',
        originalTeacherId: '',
        replacementTeacherId: '',
        reason: 'Leave',
      });

      await loadDailyData();
    } catch (error) {
      console.error('Failed to create replacement:', error);
    }
  };

  const handleConfirmReplacement = async (
    replacementId: string
  ) => {
    try {
      await updateReplacementStatus(
        replacementId,
        'confirmed'
      );

      await loadDailyData();
    } catch (error) {
      console.error(
        'Failed to confirm replacement:',
        error
      );
    }
  };

  const getTodayDate = () =>
    new Date().toISOString().split('T')[0];

  const getTeacherName = (id: string) =>
    teachers.find((t) => t.id === id)?.name || 'Unknown';

  const getSubjectName = (id: string) =>
    subjects.find((s) => s.id === id)?.name || 'Unknown';

  const getPeriodInfo = (id: string) =>
    periods.find((p) => p.id === id) || null;

  if (loading) {
    return (
      <div className='p-6'>
        <p className='text-muted-foreground'>
          Loading daily desk...
        </p>
      </div>
    );
  }

  const lunchPeriodId = 'P005';

  return (
    <div className='max-w-7xl mx-auto p-6'>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-3xl font-bold text-foreground mb-4'>
          Daily Desk Operations
        </h1>

        <p className='text-muted-foreground mb-6'>
          {getTodayDate()} - Mark attendance and manage
          replacements
        </p>

        {/* Class Selector */}
        <div className='mb-6'>
          <label className='block text-sm font-medium text-foreground mb-2'>
            Select Class
          </label>

          <select
            value={selectedClass}
            onChange={(e) =>
              setSelectedClass(e.target.value)
            }
            className='px-4 py-2 bg-input border border-border rounded-md text-foreground'
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
       {/* Attendance Section */}
        <div className='lg:col-span-2'>
          <Card className='p-6 border-border'>
            <h2 className='text-xl font-semibold text-foreground mb-4'>
              Attendance Marking
            </h2>

            <div className='space-y-3'>
              {timetableEntries
                .filter(
                  (entry) =>
                    entry.periodId !== lunchPeriodId
                )
                // 1. ADDED: index parameter here
                .map((entry, index) => {
                  const period = getPeriodInfo(
                    entry.periodId
                  );

                  const attendanceRecord =
                    attendance.find(
                      (a) =>
                        a.periodId === entry.periodId
                    );

                  return (
                    <Card
                      // 2. FIXED: Appended -${index} to ensure absolute uniqueness
                      key={`${entry.periodId}-${entry.classId}-${index}`}
                      className='p-4 bg-card/50 border-border/50'
                    >
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='font-medium text-foreground'>
                            {period?.label} (
                            {period?.startTime} -{' '}
                            {period?.endTime})
                          </p>

                          <p className='text-sm text-muted-foreground'>
                            {getSubjectName(
                              entry.subjectId
                            )}{' '}
                            -{' '}
                            {getTeacherName(
                              entry.teacherId
                            )}
                          </p>
                        </div>

                        <div className='flex gap-2'>
                          <Button
                            variant='outline'
                            onClick={() =>
                              handleMarkAttendance(
                                entry.classId,
                                entry.periodId,
                                entry.teacherId,
                                false
                              )
                            }
                            className={`${
                              attendanceRecord?.isAbsent ===
                              false
                                ? 'bg-green-500/20 border-green-500/30 text-green-600 dark:text-green-400'
                                : 'border-border hover:bg-card'
                            }`}
                          >
                            Present
                          </Button>

                          <Button
                            variant='outline'
                            onClick={() =>
                              handleMarkAttendance(
                                entry.classId,
                                entry.periodId,
                                entry.teacherId,
                                true
                              )
                            }
                            className={`${
                              attendanceRecord?.isAbsent ===
                              true
                                ? 'bg-red-500/20 border-red-500/30 text-red-600 dark:text-red-400'
                                : 'border-border hover:bg-card'
                            }`}
                          >
                            Absent
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </div>
          </Card>
        </div>

        {/* Replacement Sidebar */}

        <div className='lg:col-span-1'>
          <Card className='p-6 border-border'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-xl font-semibold text-foreground'>
                Replacements
              </h2>

              <Button
                size='sm'
                onClick={() =>
                  setShowReplacementForm(
                    !showReplacementForm
                  )
                }
              >
                {showReplacementForm
                  ? 'Cancel'
                  : 'Assign'}
              </Button>
            </div>

            {/* Replacement Form */}
            {showReplacementForm && (
              <div className='space-y-3 mb-6 p-4 bg-muted/50 rounded-lg border border-border/60'>
                {/* Period */}
                <div>
                  <label className='block text-sm mb-1 text-foreground'>
                    Period
                  </label>

                  <select
                    value={replacementForm.periodId}
                    onChange={(e) =>
                      setReplacementForm({
                        ...replacementForm,
                        periodId: e.target.value,
                      })
                    }
                    className='w-full text-sm p-2 rounded bg-input border border-border'
                  >
                    <option value=''>
                      Select Period
                    </option>

                    {periods.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                      >
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Absent Teacher */}
                <div>
                  <label className='block text-sm mb-1 text-foreground'>
                    Absent Teacher
                  </label>

                  <select
                    value={
                      replacementForm.originalTeacherId
                    }
                    onChange={(e) =>
                      setReplacementForm({
                        ...replacementForm,
                        originalTeacherId:
                          e.target.value,
                      })
                    }
                    className='w-full text-sm p-2 rounded bg-input border border-border'
                  >
                    <option value=''>
                      Select Teacher
                    </option>

                    {teachers.map((t) => (
                      <option
                        key={t.id}
                        value={t.id}
                      >
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cover Teacher */}
                <div>
                  <label className='block text-sm mb-1 text-foreground'>
                    Cover Teacher
                  </label>

                  <select
                    value={
                      replacementForm.replacementTeacherId
                    }
                    onChange={(e) =>
                      setReplacementForm({
                        ...replacementForm,
                        replacementTeacherId:
                          e.target.value,
                      })
                    }
                    className='w-full text-sm p-2 rounded bg-input border border-border'
                  >
                    <option value=''>
                      Select Teacher
                    </option>

                    {teachers.map((t) => (
                      <option
                        key={t.id}
                        value={t.id}
                      >
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label className='block text-sm mb-1 text-foreground'>
                    Reason
                  </label>

                  <select
                    value={replacementForm.reason}
                    onChange={(e) =>
                      setReplacementForm({
                        ...replacementForm,
                        reason: e.target.value,
                      })
                    }
                    className='w-full text-sm p-2 rounded bg-input border border-border'
                  >
                    <option value='Leave'>
                      Leave
                    </option>

                    <option value='Medical'>
                      Medical
                    </option>

                    <option value='Other'>
                      Other
                    </option>
                  </select>
                </div>

                <Button
                  className='w-full'
                  onClick={handleAddReplacement}
                >
                  Save Assignment
                </Button>
              </div>
            )}

            {/* Replacement List */}
            {replacements.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                No cover duties assigned today.
              </p>
            ) : (
              <div className='space-y-3'>
                {replacements.map((rep) => (
                  <Card
                    key={rep.id}
                    className='p-3 border-border/50 bg-card/50'
                  >
                    <div className='flex items-center justify-between mb-2'>
                      <p className='font-medium text-sm text-foreground'>
                        {
                          getPeriodInfo(rep.periodId)
                            ?.label
                        }
                      </p>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          rep.status ===
                          'confirmed'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>

                    <div className='space-y-1 text-sm'>
                      <p className='text-muted-foreground'>
                        <span className='font-medium text-foreground'>
                          Absent:
                        </span>{' '}
                        {getTeacherName(
                          rep.originalTeacherId
                        )}
                      </p>

                      <p className='text-muted-foreground'>
                        <span className='font-medium text-foreground'>
                          Cover:
                        </span>{' '}
                        {getTeacherName(
                          rep.replacementTeacherId
                        )}
                      </p>
                    </div>

                    {rep.status === 'pending' && (
                      <Button
                        size='sm'
                        variant='secondary'
                        className='w-full mt-3 h-8 text-xs'
                        onClick={() =>
                          handleConfirmReplacement(
                            rep.id
                          )
                        }
                      >
                        Confirm Assignment
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}