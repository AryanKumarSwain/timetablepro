import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapTeacher } from '@/lib/mappers';

type Params = { params: Promise<{ id: string }> };

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.teacher.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // SECURITY CHECK: Prevent changing schoolId if teacher has a non-APPROVED leave status
    if (body.schoolId && body.schoolId !== existing.schoolId) {
      if (existing.leaveRequestStatus !== 'APPROVED' && existing.leaveRequestStatus !== 'NONE') {
        return NextResponse.json(
          { error: 'Cannot change school while leave request is pending or rejected.' },
          { status: 400 }
        );
      }
    }

    const nextSubjects = body.subjects !== undefined ? normalizeStringArray(body.subjects) : undefined;
    const nextClasses = body.classes !== undefined ? normalizeStringArray(body.classes) : undefined;
    const nextQualifications = normalizeStringArray(body.qualifications);
    const classSubjectMap: Record<string, string[]> | undefined =
      typeof body.classSubjectMap === 'object' && body.classSubjectMap !== null
        ? body.classSubjectMap
        : undefined;

    const resolvedClasses = nextClasses !== undefined ? nextClasses : normalizeStringArray((existing as any).classes);

    // Build specific (classId, subjectId) pairs
    const classSubjectPairs: Array<{ cid: string; sid: string }> = [];
    let serializedSubjects: string[] = [];
    const uniqueSubjects = new Set<string>();

    if (classSubjectMap && Object.keys(classSubjectMap).length > 0) {
      for (const [cid, sids] of Object.entries(classSubjectMap)) {
        if (!resolvedClasses.includes(cid)) continue;
        const sList = normalizeStringArray(sids);
        for (const sid of sList) {
          classSubjectPairs.push({ cid, sid });
          uniqueSubjects.add(sid);
          serializedSubjects.push(`${cid}:::${sid}`);
        }
      }
      for (const sid of uniqueSubjects) {
        serializedSubjects.push(sid);
      }
    } else if (nextSubjects !== undefined) {
      for (const cid of resolvedClasses) {
        for (const sid of nextSubjects) {
          if (!sid.includes(':::')) {
            classSubjectPairs.push({ cid, sid });
            uniqueSubjects.add(sid);
          }
        }
      }
      serializedSubjects = [...nextSubjects];
    } else {
      serializedSubjects = normalizeStringArray(existing.subjects);
      serializedSubjects.forEach((s) => {
        if (s.includes(':::')) {
          const [cid, sid] = s.split(':::');
          if (resolvedClasses.includes(cid)) {
            classSubjectPairs.push({ cid, sid });
            uniqueSubjects.add(sid);
          }
        } else {
          uniqueSubjects.add(s);
        }
      });
    }

    let resolvedSubjects = resolvedClasses.length > 0 ? serializedSubjects : [];

    const nextSubjectSpecialtyId =
      uniqueSubjects.size > 0
        ? (typeof body.subjectSpecialtyId === 'string' && body.subjectSpecialtyId ? body.subjectSpecialtyId : Array.from(uniqueSubjects)[0])
        : null;

    // Prevent duplicate assignment: each (class, subject) can only have ONE teacher
    if (resolvedClasses.length > 0 && classSubjectPairs.length > 0) {
      const existingTeachers = await prisma.teacher.findMany({
        where: { ...schoolWhere(schoolId), active: true, id: { not: id } },
        select: { id: true, name: true, classes: true, subjects: true },
      });

      const [allClasses, allSubjects] = await Promise.all([
        prisma.classRoom.findMany({ where: schoolWhere(schoolId) }),
        prisma.subject.findMany({ where: schoolWhere(schoolId) }),
      ]);

      const classMap = new Map<string, string>();
      allClasses.forEach((c: any) => classMap.set(c.id, c.section ? `${c.name} (${c.section})` : c.name));
      const subjectMap = new Map<string, string>();
      allSubjects.forEach((s: any) => subjectMap.set(s.id, s.name));

      for (const { cid, sid } of classSubjectPairs) {
        const conflictingTeacher = existingTeachers.find((other: any) => {
          const oClasses = normalizeStringArray(other.classes);
          const matchesClass = oClasses.some((oc: string) => {
            if (oc === cid) return true;
            const cls1 = allClasses.find((c: any) => c.id === cid || c.name === cid || (c.section ? `${c.name} (${c.section})` : c.name) === cid);
            const cls2 = allClasses.find((c: any) => c.id === oc || c.name === oc || (c.section ? `${c.name} (${c.section})` : c.name) === oc);
            return cls1 && cls2 && cls1.id === cls2.id;
          });
          if (!matchesClass) return false;

          const rawOtherSubjects = normalizeStringArray(other.subjects);
          const otherClassPairs = rawOtherSubjects.filter((s: string) => s.includes(':::'));

          if (otherClassPairs.length > 0) {
            return otherClassPairs.some((pair: string) => {
              const [oCid, oSid] = pair.split(':::');
              const clsMatch = oCid === cid || (() => {
                const cls1 = allClasses.find((c: any) => c.id === cid || c.name === cid);
                const cls2 = allClasses.find((c: any) => c.id === oCid || c.name === oCid);
                return cls1 && cls2 && cls1.id === cls2.id;
              })();
              if (!clsMatch) return false;

              const s1 = allSubjects.find((s: any) => s.id === sid || s.name === sid);
              const s2 = allSubjects.find((s: any) => s.id === oSid || s.name === oSid);
              return oSid === sid || (s1 && s2 && s1.id === s2.id);
            });
          } else {
            const oSubjects = rawOtherSubjects;
            return oSubjects.some((os: string) => {
              if (os === sid) return true;
              const s1 = allSubjects.find((s: any) => s.id === sid || s.name === sid);
              const s2 = allSubjects.find((s: any) => s.id === os || s.name === os);
              return s1 && s2 && s1.id === s2.id;
            });
          }
        });

        if (conflictingTeacher) {
          const cls = allClasses.find((c: any) => c.id === cid || c.name === cid);
          const cName = cls ? (cls.section ? `${cls.name} (${cls.section})` : cls.name) : (classMap.get(cid) || cid);
          const sub = allSubjects.find((s: any) => s.id === sid || s.name === sid);
          const sName = sub ? sub.name : (subjectMap.get(sid) || sid);
          return NextResponse.json(
            {
              error: `"${sName}" in ${cName} is already assigned to ${conflictingTeacher.name}. Only one teacher can be assigned to a subject per class.`,
            },
            { status: 400 }
          );
        }
      }
    }

    const row = await prisma.teacher.update({
      where: { id },
      data: {
        name: typeof body.name === 'string' ? body.name.trim() : existing.name,
        email:
          typeof body.email === 'string'
            ? body.email.trim().toLowerCase()
            : existing.email,
        phone:
          typeof body.phone === 'string' ? body.phone.trim() : existing.phone,
        qualifications:
          nextQualifications.length > 0
            ? (nextQualifications as any)
            : existing.qualifications,
        subjects: resolvedSubjects as any,
        classes: resolvedClasses as any,
        active: typeof body.active === 'boolean' ? body.active : existing.active,
        joinDate:
          typeof body.joinDate === 'string' && body.joinDate
            ? body.joinDate
            : existing.joinDate,
        maxPeriodsPerWeek:
          typeof body.maxPeriodsPerWeek === 'number'
            ? body.maxPeriodsPerWeek
            : existing.maxPeriodsPerWeek,
        subjectSpecialtyId: nextSubjectSpecialtyId,
      },
    });

    return NextResponse.json(mapTeacher(row));
  } catch (error) {
    console.error('[PATCH /api/teachers/[id]]', error);
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await params;

    const existing = await prisma.teacher.findFirst({
      where: { id, ...schoolWhere(schoolId) },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Delete all related records first to avoid FK constraint errors

    await prisma.dailyReport.deleteMany({
      where: { teacherId: id },
    });

    await prisma.timetableSlot.deleteMany({
      where: { schoolId, teacherId: id },
    });

    await prisma.weeklyTimetableSlot.deleteMany({
      where: { schoolId, teacherId: id },
    });

    await prisma.teacherAttendance.deleteMany({
      where: { schoolId, teacherId: id },
    });

    await prisma.replacementAssignment.deleteMany({
      where: {
        schoolId,
        OR: [{ originalTeacherId: id }, { replacementTeacherId: id }],
      },
    });


    // Delete teacher first, then linked User
    const linkedUserId = existing.userId ?? null;

    await prisma.teacher.delete({
      where: { id },
    });

    if (linkedUserId) {
      await prisma.user.delete({
        where: { id: linkedUserId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/teachers/[id]]', error);
    return handleApiError(error);
  }
}