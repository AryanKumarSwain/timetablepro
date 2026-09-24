import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapTeacher } from '@/lib/mappers';

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

export async function GET() {
  try {
    const { schoolId } = await requireSchoolContext();

    const teachers = await prisma.teacher.findMany({
      where: schoolWhere(schoolId),
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(teachers.map(mapTeacher));
  } catch (error) {
    console.error('[GET /api/teachers]', error);
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();

    const requestSubjects = normalizeStringArray(body.subjects);
    const requestClasses = normalizeStringArray(body.classes);
    const classSubjectMap: Record<string, string[]> =
      typeof body.classSubjectMap === 'object' && body.classSubjectMap !== null
        ? body.classSubjectMap
        : {};

    // Build specific (classId, subjectId) pairs
    const classSubjectPairs: Array<{ cid: string; sid: string }> = [];
    if (Object.keys(classSubjectMap).length > 0) {
      for (const [cid, sids] of Object.entries(classSubjectMap)) {
        if (!requestClasses.includes(cid)) continue;
        const sList = normalizeStringArray(sids);
        for (const sid of sList) {
          classSubjectPairs.push({ cid, sid });
        }
      }
    } else {
      for (const cid of requestClasses) {
        for (const sid of requestSubjects) {
          if (!sid.includes(':::')) {
            classSubjectPairs.push({ cid, sid });
          }
        }
      }
    }

    // Build the final array to store in DB: pure subject IDs + "cid:::sid" pairs
    const uniqueSubjects = new Set<string>();
    const serializedSubjects: string[] = [];

    if (Object.keys(classSubjectMap).length > 0) {
      for (const { cid, sid } of classSubjectPairs) {
        uniqueSubjects.add(sid);
        serializedSubjects.push(`${cid}:::${sid}`);
      }
      for (const sid of uniqueSubjects) {
        serializedSubjects.push(sid);
      }
    } else {
      for (const s of requestSubjects) {
        serializedSubjects.push(s);
        if (!s.includes(':::')) uniqueSubjects.add(s);
      }
    }

    const finalSubjects = requestClasses.length > 0 ? serializedSubjects : [];
    const subjectSpecialtyId =
      typeof body.subjectSpecialtyId === 'string' && body.subjectSpecialtyId
        ? body.subjectSpecialtyId
        : (uniqueSubjects.size > 0 ? Array.from(uniqueSubjects)[0] : null);

    // Prevent duplicate assignment: each (class, subject) can only have ONE teacher
    if (requestClasses.length > 0 && classSubjectPairs.length > 0) {
      const existingTeachers = await prisma.teacher.findMany({
        where: { ...schoolWhere(schoolId), active: true },
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

    const teacher = await prisma.teacher.create({
      data: {
        name: String(body.name ?? '').trim(),
        email: String(body.email ?? '').trim().toLowerCase(),
        phone: String(body.phone ?? '').trim(),
        qualifications: normalizeStringArray(body.qualifications),
        subjects: finalSubjects,
        classes: requestClasses,
        active: typeof body.active === 'boolean' ? body.active : true,
        joinDate: String(body.joinDate ?? new Date().toISOString().split('T')[0]),
        maxPeriodsPerWeek: Number(body.maxPeriodsPerWeek ?? 24),
        subjectSpecialtyId,
        schoolId,
      },
    });

    return NextResponse.json(mapTeacher(teacher));
  } catch (error) {
    console.error('[POST /api/teachers]', error);
    return handleApiError(error);
  }
}