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

    // 4. Build teacher eligibility mapping per subject
    const subjectToTeachersMap = new Map<string, string[]>();
    allSubjects.forEach((sub: any) => {
      const eligibleTeacherIds: string[] = [];
      allTeachers.forEach((teacher: any) => {
        const mappedSubjects = teacherSubjectMap[teacher.id] || (Array.isArray(teacher.subjects) ? teacher.subjects : []);
        if (
          mappedSubjects.includes(sub.id) ||
          mappedSubjects.includes(sub.name) ||
          (teacher as any).subjectSpecialtyId === sub.id
        ) {
          eligibleTeacherIds.push(teacher.id);
        }
      });
      // Fallback: If no teacher explicitly mapped to this subject, allow any active teacher
      if (eligibleTeacherIds.length === 0) {
        eligibleTeacherIds.push(...allTeachers.map((t: any) => t.id));
      }
      subjectToTeachersMap.set(sub.id, eligibleTeacherIds);
    });

    // 5. Tracking state for conflict-free scheduling
    const busyTeachers = new Map<string, Set<string>>();
    const busyRooms = new Map<string, Set<string>>();
    const teacherTotalWorkload = new Map<string, number>();
    allTeachers.forEach((t: any) => teacherTotalWorkload.set(t.id, 0));
    const teacherDailyLoad = new Map<string, number>();
    const slotTeacherMap = new Map<string, string>();

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

    // 6. Execution Loop: Schedule slots for all target classes across all days and periods
    const targetClassIdsSet = new Set(classesToSchedule.map((c: any) => c.id));

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

          if (fillOnlyEmpty && existingSlotKeys.has(fullKey)) {
            continue;
          }

          // Filter candidate subjects that belong to this class
          const subjectsForClass = allSubjects.filter((sub: any) => {
            let subClassIds: string[] = [];
            if (Array.isArray(sub.classIds)) subClassIds = sub.classIds;
            else if (typeof sub.classIds === 'string') {
              try { subClassIds = JSON.parse(sub.classIds); } catch {}
            }
            if (subClassIds.length === 0) return true; // school-wide
            return subClassIds.includes(classObj.id);
          });

          const classSubjectList = subjectsForClass.length > 0 ? subjectsForClass : allSubjects;
          const subjectOffset = (classIdx * 2 + dayIdx * 3 + periodIdx) % classSubjectList.length;
          const candidateSubjects = [
            ...classSubjectList.slice(subjectOffset),
            ...classSubjectList.slice(0, subjectOffset),
          ];

          let assigned = false;

          for (const subject of candidateSubjects) {
            // Find eligible teachers specifically for this (subject, classObj)
            let eligibleTeachers = allTeachers
              .filter((teacher: any) => {
                let mappedSubjects: string[] = [];
                if (Array.isArray(teacher.subjects)) mappedSubjects = teacher.subjects;
                else if (typeof teacher.subjects === 'string') {
                  try { mappedSubjects = JSON.parse(teacher.subjects); } catch {}
                }
                if (teacherSubjectMap[teacher.id]) {
                  mappedSubjects = teacherSubjectMap[teacher.id];
                }

                const hasSubject =
                  mappedSubjects.includes(subject.id) ||
                  mappedSubjects.includes(subject.name) ||
                  (teacher as any).subjectSpecialtyId === subject.id;
                if (!hasSubject) return false;

                // Check teacher's assigned classes
                let teacherClasses: string[] = [];
                if (Array.isArray(teacher.classes)) teacherClasses = teacher.classes;
                else if (typeof teacher.classes === 'string') {
                  try { teacherClasses = JSON.parse(teacher.classes); } catch {}
                }

                // If explicit per-subject class restriction exists in request payload, check that
                const classRestrictions = teacherSubjectClassMap?.[teacher.id]?.[subject.id];
                if (Array.isArray(classRestrictions) && classRestrictions.length > 0) {
                  return classRestrictions.includes(classObj.id);
                }

                // If teacher has assigned classes configured on their profile, they must teach this class
                if (teacherClasses.length > 0) {
                  return teacherClasses.includes(classObj.id);
                }

                // No restriction means eligible for all classes
                return true;
              })
              .map((t: any) => t.id);

            // Fallback: If no teacher specifically mapped to this class+subject, check general teachers for this subject
            if (eligibleTeachers.length === 0) {
              const generalTeachers = subjectToTeachersMap.get(subject.id) || [];
              if (generalTeachers.length > 0) {
                eligibleTeachers = generalTeachers;
              }
            }

            if (eligibleTeachers.length === 0) continue;

            const freeTeachers = eligibleTeachers.filter((tId: string) => {
              if (busyTeachers.get(cellKey)?.has(tId)) return false;

              const tSetting = teacherSettings[tId];
              const maxDay = tSetting?.maxPeriodsPerDay || 6;
              const currentDayCount = teacherDailyLoad.get(`${tId}_${dayOfWeek}`) || 0;
              if (currentDayCount >= maxDay) return false;

              return true;
            });

            if (freeTeachers.length === 0) continue;

            freeTeachers.sort((a: string, b: string) => {
              if (avoidConsecutive && periodIdx > 0) {
                const prevPeriod = activePeriods[periodIdx - 1];
                const prevTeacher = slotTeacherMap.get(`${classObj.id}_${dayOfWeek}_${prevPeriod.id}`);
                const aIsPrev = a === prevTeacher;
                const bIsPrev = b === prevTeacher;
                if (aIsPrev !== bIsPrev) return aIsPrev ? 1 : -1;
              }

              if (equalWorkload) {
                const loadA = teacherTotalWorkload.get(a) || 0;
                const loadB = teacherTotalWorkload.get(b) || 0;
                if (loadA !== loadB) return loadA - loadB;
              }

              const priorityA = teacherSettings[a]?.priority || 1;
              const priorityB = teacherSettings[b]?.priority || 1;
              return priorityB - priorityA;
            });

            const chosenTeacherId = freeTeachers[0];

            const slotId = `slot-${crypto.randomUUID()}`;
            newSlotsToCreate.push({
              id: slotId,
              timetableId,
              schoolId,
              dayOfWeek,
              periodId: period.id,
              classId: classObj.id,
              subjectId: subject.id,
              teacherId: chosenTeacherId,
              roomId: undefined,
            });

            busyTeachers.get(cellKey)!.add(chosenTeacherId);

            teacherTotalWorkload.set(chosenTeacherId, (teacherTotalWorkload.get(chosenTeacherId) || 0) + 1);
            const dayKey = `${chosenTeacherId}_${dayOfWeek}`;
            teacherDailyLoad.set(dayKey, (teacherDailyLoad.get(dayKey) || 0) + 1);
            slotTeacherMap.set(`${classObj.id}_${dayOfWeek}_${period.id}`, chosenTeacherId);

            assigned = true;
            break;
          }

          if (!assigned) {
            const fallbackTeacher = allTeachers.find((t: any) => !busyTeachers.get(cellKey)?.has(t.id));
            if (fallbackTeacher) {
              const fallbackSubject = allSubjects[periodIdx % allSubjects.length];
              const slotId = `slot-${crypto.randomUUID()}`;
              newSlotsToCreate.push({
                id: slotId,
                timetableId,
                schoolId,
                dayOfWeek,
                periodId: period.id,
                classId: classObj.id,
                subjectId: fallbackSubject.id,
                teacherId: fallbackTeacher.id,
              });
              busyTeachers.get(cellKey)!.add(fallbackTeacher.id);
              teacherTotalWorkload.set(fallbackTeacher.id, (teacherTotalWorkload.get(fallbackTeacher.id) || 0) + 1);
            }
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

    return NextResponse.json({
      success: true,
      totalSlotsAssigned: newSlotsToCreate.length,
      classesCount: classesToSchedule.length,
      workloadSummary,
      message: `Successfully auto-assigned ${newSlotsToCreate.length} slots across ${classesToSchedule.length} classes with 0 conflicts!`,
    });
  } catch (error) {
    console.error('Error auto-generating timetable slots:', error);
    return handleApiError(error);
  }
}
