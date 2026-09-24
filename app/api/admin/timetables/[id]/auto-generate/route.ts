import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError, schoolWhere } from '@/lib/auth-server';
import { checkTimetableLimit } from '@/lib/plan-limits';
import crypto from 'crypto';

type RouteContext = { params: Promise<{ id: string }> };

interface AutoGenerateRequestBody {
  teacherSubjectMap?: Record<string, string[]>;
  teacherSubjectClassMap?: Record<string, Record<string, string[]>>;
  teacherSettings?: Record<string, { maxPeriodsPerDay?: number; priority?: number }>;
  targetClassIds?: string[];
  options?: {
    equalWorkload?: boolean;
    fillOnlyEmpty?: boolean;
    avoidConsecutive?: boolean;
    assignRooms?: boolean;
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    await checkTimetableLimit(schoolId);
    const { id: timetableId } = await context.params;

    const body = (await request.json()) as AutoGenerateRequestBody;
    const {
      teacherSubjectMap = {},
      teacherSubjectClassMap = {},
      teacherSettings = {},
      targetClassIds = [],
      options = {},
    } = body;

    const equalWorkload = options.equalWorkload ?? true;
    const fillOnlyEmpty = options.fillOnlyEmpty ?? false;
    const avoidConsecutive = options.avoidConsecutive ?? true;
    const assignRooms = false;

    // 1. Fetch timetable and ensure it belongs to the school
    const timetable = await prisma.timetable.findFirst({
      where: { id: timetableId, ...schoolWhere(schoolId) },
    });

    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }

    // 2. Persist teacher-subject mappings into database if provided
    for (const [teacherId, subjectIds] of Object.entries(teacherSubjectMap)) {
      if (Array.isArray(subjectIds)) {
        await prisma.teacher.updateMany({
          where: { id: teacherId, ...schoolWhere(schoolId) },
          data: { subjects: subjectIds },
        });
      }
    }

    // 3. Fetch all timetable entities
    const [allPeriods, allClasses, allSubjects, allTeachers, allRooms, existingSlots] = await Promise.all([
      prisma.period.findMany({
        where: { schoolId, timetableId },
        orderBy: { startTime: 'asc' },
      }),
      prisma.classRoom.findMany({
        where: schoolWhere(schoolId),
        orderBy: { name: 'asc' },
      }),
      prisma.subject.findMany({
        where: schoolWhere(schoolId),
        orderBy: { name: 'asc' },
      }),
      prisma.teacher.findMany({
        where: { ...schoolWhere(schoolId), active: true },
        orderBy: { name: 'asc' },
      }),
      prisma.room.findMany({
        where: schoolWhere(schoolId),
        orderBy: { roomNumber: 'asc' },
      }),
      prisma.timetableSlot.findMany({
        where: { timetableId },
      }),
    ]);

    // Filter teaching periods only (ignore break rows like Lunch Break)
    const activePeriods = allPeriods.filter((p: any) => !p.isBreak);
    if (activePeriods.length === 0) {
      return NextResponse.json(
        { error: 'No active teaching periods found. Please add periods before generating.' },
        { status: 400 }
      );
    }

    // Determine working days
    let workingDays: number[] = [1, 2, 3, 4, 5];
    if (timetable.workingDays) {
      try {
        workingDays =
          typeof timetable.workingDays === 'string'
            ? JSON.parse(timetable.workingDays)
            : (timetable.workingDays as number[]);
      } catch {
        workingDays = [1, 2, 3, 4, 5];
      }
    }

    // Filter target classes
    const classesToSchedule = targetClassIds.length > 0
      ? allClasses.filter((c: any) => targetClassIds.includes(c.id))
      : allClasses;

    if (classesToSchedule.length === 0) {
      return NextResponse.json({ error: 'No classes found to schedule.' }, { status: 400 });
    }

    if (allTeachers.length === 0) {
      return NextResponse.json({ error: 'No active teachers available.' }, { status: 400 });
    }

    if (allSubjects.length === 0) {
      return NextResponse.json({ error: 'No subjects available.' }, { status: 400 });
    }

    // Helper to safely extract string array from Json/string field
    const parseArray = (val: any): string[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    // Check if any subject in the entire school has class assignments
    const anySubjectConfiguredInSchool = allSubjects.some(
      (s: any) => parseArray(s.classIds).length > 0
    );

    // Build map: classId -> Subject[] strictly assigned to this class
    const classToSubjectsMap = new Map<string, any[]>();
    for (const classObj of classesToSchedule) {
      const assigned = allSubjects.filter((sub: any) => {
        const cIds = parseArray(sub.classIds);
        return (
          cIds.includes(classObj.id) ||
          (classObj.name && cIds.includes(classObj.name))
        );
      });

      if (assigned.length > 0) {
        classToSubjectsMap.set(classObj.id, assigned);
      } else if (!anySubjectConfiguredInSchool) {
        // Fallback only if no subjects in the school have any class associations
        classToSubjectsMap.set(classObj.id, allSubjects);
      } else {
        classToSubjectsMap.set(classObj.id, []);
      }
    }

    // Check if any teacher in the school has classes assigned
    const anyTeacherHasClasses = allTeachers.some(
      (t: any) => parseArray(t.classes).length > 0
    );

    // Cache of qualified active teachers for a specific (class, subject)
    const qualifiedTeacherCache = new Map<string, any[]>();

    const getQualifiedTeachers = (classObj: any, subject: any): any[] => {
      const key = `${classObj.id}_${subject.id}`;
      if (qualifiedTeacherCache.has(key)) return qualifiedTeacherCache.get(key)!;

      const qualified = allTeachers.filter((teacher: any) => {
        // 1. Must teach this class
        const teacherClasses = parseArray(teacher.classes);
        if (teacherClasses.length === 0) {
          // If teacher has NO classes assigned in Faculty Directory, they cannot teach ANY class
          if (anyTeacherHasClasses) return false;
        } else {
          const teachesClass =
            teacherClasses.includes(classObj.id) ||
            (classObj.name && teacherClasses.includes(classObj.name));

          if (!teachesClass) return false;
        }

        // 2. Must teach this subject (with per-class mapping support)
        const rawSubjects = parseArray(teacher.subjects);
        const baseSubjects = rawSubjects.map((s: string) => s.includes(':::') ? s.split(':::')[1] : s);

        const classSpecificMappings = rawSubjects.filter((s: string) => s.includes(':::'));
        if (classSpecificMappings.length > 0) {
          const teachesSubjectInThisClass = classSpecificMappings.some((entry: string) => {
            const [mCid, mSid] = entry.split(':::');
            const classMatches = mCid === classObj.id || (classObj.name && mCid === classObj.name);
            const subjectMatches = mSid === subject.id || (subject.name && mSid === subject.name);
            return classMatches && subjectMatches;
          });
          if (!teachesSubjectInThisClass) return false;
        } else {
          if (baseSubjects.length === 0 && !(teacher as any).subjectSpecialtyId) {
            return false;
          }
          const teachesSubject =
            baseSubjects.includes(subject.id) ||
            baseSubjects.includes(subject.name) ||
            (teacher as any).subjectSpecialtyId === subject.id;

          if (!teachesSubject) return false;
        }

        return true;
      });

      qualifiedTeacherCache.set(key, qualified);
      return qualified;
    };

    // 5. Tracking state for conflict-free scheduling
    const busyTeachers = new Map<string, Set<string>>();
    const busyRooms = new Map<string, Set<string>>();
    const teacherTotalWorkload = new Map<string, number>();
    allTeachers.forEach((t: any) => teacherTotalWorkload.set(t.id, 0));
    const teacherDailyLoad = new Map<string, number>();
    const slotTeacherMap = new Map<string, string>();
    const slotSubjectMap = new Map<string, string>();
    const classSubjectPeriodCount = new Map<string, number>();

    const existingSlotKeys = new Set<string>();

    existingSlots.forEach((slot: any) => {
      const cellKey = `${slot.dayOfWeek}_${slot.periodId}`;
      const fullKey = `${slot.timetableId}_${slot.dayOfWeek}_${slot.periodId}_${slot.classId}`;
      existingSlotKeys.add(fullKey);

      if (fillOnlyEmpty) {
        if (!busyTeachers.has(cellKey)) busyTeachers.set(cellKey, new Set());
        busyTeachers.get(cellKey)!.add(slot.teacherId);

        if (slot.roomId) {
          if (!busyRooms.has(cellKey)) busyRooms.set(cellKey, new Set());
          busyRooms.get(cellKey)!.add(slot.roomId);
        }

        teacherTotalWorkload.set(slot.teacherId, (teacherTotalWorkload.get(slot.teacherId) || 0) + 1);
        const dayKey = `${slot.teacherId}_${slot.dayOfWeek}`;
        teacherDailyLoad.set(dayKey, (teacherDailyLoad.get(dayKey) || 0) + 1);
        slotTeacherMap.set(`${slot.classId}_${slot.dayOfWeek}_${slot.periodId}`, slot.teacherId);
        slotSubjectMap.set(`${slot.classId}_${slot.dayOfWeek}_${slot.periodId}`, slot.subjectId);
        classSubjectPeriodCount.set(
          `${slot.classId}_${slot.subjectId}`,
          (classSubjectPeriodCount.get(`${slot.classId}_${slot.subjectId}`) || 0) + 1
        );
      }
    });

    const newSlotsToCreate: {
      id: string;
      timetableId: string;
      schoolId: string;
      dayOfWeek: number;
      periodId: string;
      classId: string;
      subjectId: string;
      teacherId: string;
      roomId?: string;
    }[] = [];

    const roomByNumber = new Map<string, string>();
    allRooms.forEach((r: any) => roomByNumber.set(r.roomNumber, r.id));

    // 5.5 Map to enforce: EXACTLY ONE teacher per (class, subject)
    // Key: `${classId}_${subjectId}` -> teacherId
    const classSubjectTeacherLock = new Map<string, string>();

    if (fillOnlyEmpty) {
      existingSlots.forEach((slot: any) => {
        if (slot.classId && slot.subjectId && slot.teacherId) {
          const key = `${slot.classId}_${slot.subjectId}`;
          if (!classSubjectTeacherLock.has(key)) {
            classSubjectTeacherLock.set(key, slot.teacherId);
          }
        }
      });
    }

    // Pre-designate ONE teacher per (class, subject) to balance teaching loads across faculty
    const teacherAssignedSubjectCount = new Map<string, number>();
    allTeachers.forEach((t: any) => teacherAssignedSubjectCount.set(t.id, 0));

    classSubjectTeacherLock.forEach((tId) => {
      teacherAssignedSubjectCount.set(
        tId,
        (teacherAssignedSubjectCount.get(tId) || 0) + 1
      );
    });

    for (const classObj of classesToSchedule) {
      const candidateSubjects = classToSubjectsMap.get(classObj.id) || [];
      for (const subject of candidateSubjects) {
        const lockKey = `${classObj.id}_${subject.id}`;
        if (!classSubjectTeacherLock.has(lockKey)) {
          const qualified = getQualifiedTeachers(classObj, subject);
          if (qualified.length > 0) {
            const sortedTeachers = [...qualified].sort((a, b) => {
              if (equalWorkload) {
                const countA = teacherAssignedSubjectCount.get(a.id) || 0;
                const countB = teacherAssignedSubjectCount.get(b.id) || 0;
                if (countA !== countB) return countA - countB;
              }
              const priorityA = teacherSettings[a.id]?.priority || 1;
              const priorityB = teacherSettings[b.id]?.priority || 1;
              if (priorityA !== priorityB) return priorityB - priorityA;
              return (a.name || '').localeCompare(b.name || '');
            });

            const designated = sortedTeachers[0];
            classSubjectTeacherLock.set(lockKey, designated.id);
            teacherAssignedSubjectCount.set(
              designated.id,
              (teacherAssignedSubjectCount.get(designated.id) || 0) + 1
            );
          }
        }
      }
    }

    // 6. Execution Loop: Schedule slots for all target classes across all days and periods
    const targetClassIdsSet = new Set(classesToSchedule.map((c: any) => c.id));
    const scheduledSlotCellMap = new Set<string>();

    for (let dayIdx = 0; dayIdx < workingDays.length; dayIdx++) {
      const dayOfWeek = workingDays[dayIdx];

      for (let periodIdx = 0; periodIdx < activePeriods.length; periodIdx++) {
        const period = activePeriods[periodIdx];
        const cellKey = `${dayOfWeek}_${period.id}`;

        if (!busyTeachers.has(cellKey)) busyTeachers.set(cellKey, new Set());
        if (!busyRooms.has(cellKey)) busyRooms.set(cellKey, new Set());

        for (let classIdx = 0; classIdx < classesToSchedule.length; classIdx++) {
          const classObj = classesToSchedule[classIdx];
          const fullKey = `${timetableId}_${dayOfWeek}_${period.id}_${classObj.id}`;
          const cellSlotKey = `${classObj.id}_${dayOfWeek}_${period.id}`;

          if (fillOnlyEmpty && existingSlotKeys.has(fullKey)) {
            scheduledSlotCellMap.add(cellSlotKey);
            continue;
          }

          // Candidate subjects strictly assigned to this class
          const candidateSubjects = classToSubjectsMap.get(classObj.id) || [];
          if (candidateSubjects.length === 0) {
            continue; // No subjects assigned to this class
          }

          // Only keep subjects that have a qualified/designated teacher
          const subjectsWithTeachers = candidateSubjects.filter((sub) => {
            const lockKey = `${classObj.id}_${sub.id}`;
            const lockedTeacherId = classSubjectTeacherLock.get(lockKey);
            if (lockedTeacherId) {
              return allTeachers.some((t: any) => t.id === lockedTeacherId);
            }
            return getQualifiedTeachers(classObj, sub).length > 0;
          });

          if (subjectsWithTeachers.length === 0) {
            continue; // No qualified teachers for this class's subjects
          }

          // Sort subjects to balance course distribution and avoid back-to-back same subject
          const prevPeriodId = periodIdx > 0 ? activePeriods[periodIdx - 1]?.id : null;
          const prevSubjectId = prevPeriodId
            ? slotSubjectMap.get(`${classObj.id}_${dayOfWeek}_${prevPeriodId}`)
            : null;

          const sortedSubjects = [...subjectsWithTeachers].sort((a, b) => {
            if (avoidConsecutive && prevSubjectId) {
              const aIsPrev = a.id === prevSubjectId;
              const bIsPrev = b.id === prevSubjectId;
              if (aIsPrev !== bIsPrev) return aIsPrev ? 1 : -1;
            }

            const countA = classSubjectPeriodCount.get(`${classObj.id}_${a.id}`) || 0;
            const countB = classSubjectPeriodCount.get(`${classObj.id}_${b.id}`) || 0;
            if (countA !== countB) return countA - countB;

            // Offset rotation across classes to minimize simultaneous collisions
            return (a.name || '').localeCompare(b.name || '');
          });

          // Rotate starting point by class and period to distribute teacher demand
          const rotationOffset = (classIdx * 2 + dayIdx + periodIdx) % sortedSubjects.length;
          const rotatedCandidateSubjects = [
            ...sortedSubjects.slice(rotationOffset),
            ...sortedSubjects.slice(0, rotationOffset),
          ];

          for (const subject of rotatedCandidateSubjects) {
            const lockKey = `${classObj.id}_${subject.id}`;
            const lockedTeacherId = classSubjectTeacherLock.get(lockKey);

            // STRICT SINGLE TEACHER PER (CLASS, SUBJECT):
            // Only allow the designated teacher who is locked for this class & subject!
            const qualifiedTeachers = lockedTeacherId
              ? allTeachers.filter((t: any) => t.id === lockedTeacherId)
              : getQualifiedTeachers(classObj, subject);

            if (qualifiedTeachers.length === 0) continue;

            // Filter to teachers free at this time and under max daily load
            const freeTeachers = qualifiedTeachers.filter((t: any) => {
              if (busyTeachers.get(cellKey)?.has(t.id)) return false;

              const tSetting = teacherSettings[t.id];
              const maxDay =
                tSetting?.maxPeriodsPerDay ||
                (t.maxPeriodsPerWeek
                  ? Math.ceil(t.maxPeriodsPerWeek / workingDays.length) + 1
                  : 6);
              const currentDayCount = teacherDailyLoad.get(`${t.id}_${dayOfWeek}`) || 0;
              if (currentDayCount >= maxDay) return false;

              return true;
            });

            if (freeTeachers.length === 0) continue;

            const prevTeacherId = prevPeriodId
              ? slotTeacherMap.get(`${classObj.id}_${dayOfWeek}_${prevPeriodId}`)
              : null;

            freeTeachers.sort((a: any, b: any) => {
              if (avoidConsecutive && prevTeacherId) {
                const aIsPrev = a.id === prevTeacherId;
                const bIsPrev = b.id === prevTeacherId;
                if (aIsPrev !== bIsPrev) return aIsPrev ? 1 : -1;
              }

              if (equalWorkload) {
                const loadA = teacherTotalWorkload.get(a.id) || 0;
                const loadB = teacherTotalWorkload.get(b.id) || 0;
                if (loadA !== loadB) return loadA - loadB;
              }

              const priorityA = teacherSettings[a.id]?.priority || 1;
              const priorityB = teacherSettings[b.id]?.priority || 1;
              return priorityB - priorityA;
            });

            const chosenTeacher = freeTeachers[0];

            if (!classSubjectTeacherLock.has(lockKey)) {
              classSubjectTeacherLock.set(lockKey, chosenTeacher.id);
            }

            const slotId = `slot-${crypto.randomUUID()}`;
            newSlotsToCreate.push({
              id: slotId,
              timetableId,
              schoolId,
              dayOfWeek,
              periodId: period.id,
              classId: classObj.id,
              subjectId: subject.id,
              teacherId: chosenTeacher.id,
              roomId: undefined,
            });

            busyTeachers.get(cellKey)!.add(chosenTeacher.id);
            scheduledSlotCellMap.add(cellSlotKey);

            teacherTotalWorkload.set(
              chosenTeacher.id,
              (teacherTotalWorkload.get(chosenTeacher.id) || 0) + 1
            );
            const dayKey = `${chosenTeacher.id}_${dayOfWeek}`;
            teacherDailyLoad.set(dayKey, (teacherDailyLoad.get(dayKey) || 0) + 1);

            slotTeacherMap.set(`${classObj.id}_${dayOfWeek}_${period.id}`, chosenTeacher.id);
            slotSubjectMap.set(`${classObj.id}_${dayOfWeek}_${period.id}`, subject.id);
            classSubjectPeriodCount.set(
              `${classObj.id}_${subject.id}`,
              (classSubjectPeriodCount.get(`${classObj.id}_${subject.id}`) || 0) + 1
            );

            break;
          }
        }
      }
    }

    // Pass 2: Backfill any remaining vacant slots for target classes using their designated subject teachers
    for (let dayIdx = 0; dayIdx < workingDays.length; dayIdx++) {
      const dayOfWeek = workingDays[dayIdx];
      for (let periodIdx = 0; periodIdx < activePeriods.length; periodIdx++) {
        const period = activePeriods[periodIdx];
        const cellKey = `${dayOfWeek}_${period.id}`;

        for (const classObj of classesToSchedule) {
          const cellSlotKey = `${classObj.id}_${dayOfWeek}_${period.id}`;
          if (scheduledSlotCellMap.has(cellSlotKey)) continue;

          const candidateSubjects = classToSubjectsMap.get(classObj.id) || [];
          for (const subject of candidateSubjects) {
            const lockKey = `${classObj.id}_${subject.id}`;
            const lockedTeacherId = classSubjectTeacherLock.get(lockKey);
            if (!lockedTeacherId) continue;

            if (busyTeachers.get(cellKey)?.has(lockedTeacherId)) continue;

            const chosenTeacher = allTeachers.find((t: any) => t.id === lockedTeacherId);
            if (!chosenTeacher) continue;

            const slotId = `slot-${crypto.randomUUID()}`;
            newSlotsToCreate.push({
              id: slotId,
              timetableId,
              schoolId,
              dayOfWeek,
              periodId: period.id,
              classId: classObj.id,
              subjectId: subject.id,
              teacherId: chosenTeacher.id,
              roomId: undefined,
            });

            busyTeachers.get(cellKey)!.add(chosenTeacher.id);
            scheduledSlotCellMap.add(cellSlotKey);

            teacherTotalWorkload.set(
              chosenTeacher.id,
              (teacherTotalWorkload.get(chosenTeacher.id) || 0) + 1
            );
            const dayKey = `${chosenTeacher.id}_${dayOfWeek}`;
            teacherDailyLoad.set(dayKey, (teacherDailyLoad.get(dayKey) || 0) + 1);

            slotTeacherMap.set(`${classObj.id}_${dayOfWeek}_${period.id}`, chosenTeacher.id);
            slotSubjectMap.set(`${classObj.id}_${dayOfWeek}_${period.id}`, subject.id);
            classSubjectPeriodCount.set(
              `${classObj.id}_${subject.id}`,
              (classSubjectPeriodCount.get(`${classObj.id}_${subject.id}`) || 0) + 1
            );
            break;
          }
        }
      }
    }

    // 7. Database Transaction
    await prisma.$transaction(async (tx: any) => {
      if (!fillOnlyEmpty) {
        await tx.timetableSlot.deleteMany({
          where: {
            timetableId,
            classId: { in: Array.from(targetClassIdsSet) },
          },
        });
      } else {
        for (const slot of newSlotsToCreate) {
          await tx.timetableSlot.deleteMany({
            where: {
              timetableId,
              dayOfWeek: slot.dayOfWeek,
              periodId: slot.periodId,
              classId: slot.classId,
            },
          });
        }
      }

      if (newSlotsToCreate.length > 0) {
        await tx.timetableSlot.createMany({
          data: newSlotsToCreate,
        });
      }
    });

    // 8. Prepare workload summary response
    const workloadSummary = allTeachers.map((t: any) => ({
      teacherId: t.id,
      teacherName: t.name,
      assignedCount: teacherTotalWorkload.get(t.id) || 0,
    }));

    const unscheduledClasses = classesToSchedule
      .filter((c: any) => !newSlotsToCreate.some((s) => s.classId === c.id))
      .map((c: any) => c.name);

    let message = `Successfully auto-assigned ${newSlotsToCreate.length} slots across ${classesToSchedule.length} classes with 0 conflicts!`;
    if (unscheduledClasses.length > 0) {
      message = `Auto-assigned ${newSlotsToCreate.length} slots. Note: ${unscheduledClasses.join(', ')} had no qualified faculty assigned to their subjects.`;
    }

    return NextResponse.json({
      success: true,
      totalSlotsAssigned: newSlotsToCreate.length,
      classesCount: classesToSchedule.length,
      workloadSummary,
      unscheduledClasses,
      message,
    });
  } catch (error) {
    console.error('Error auto-generating timetable slots:', error);
    return handleApiError(error);
  }
}
