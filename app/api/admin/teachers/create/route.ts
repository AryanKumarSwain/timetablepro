import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireSchoolContext,
  handleApiError,
  AuthError,
  schoolWhere,
} from '@/lib/auth-server';
import { mapTeacher } from '@/lib/mappers';
import { provisionTeacherUserAccount } from '@/lib/teacher-onboarding';
import { checkTeacherLimit, PlanLimitError } from '@/lib/plan-limits';

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    
    let body: any = null;
    try {
      const rawText = await request.text();
      if (rawText && rawText.trim().length > 0) {
        body = JSON.parse(rawText);
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload received. Please check your form data and try again.' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: 'No teacher details were received. Please ensure all required fields are filled and try again.' },
        { status: 400 }
      );
    }

    const name = String(body.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Teacher name is required.' }, { status: 400 });
    }

    const email = String(body.email ?? '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'Teacher email is required.' }, { status: 400 });
    }

    // 0. PLAN LIMIT CHECK: Enforce teacher limit based on school's plan
    try {
      await checkTeacherLimit(schoolId);
    } catch (limitError) {
      if (limitError instanceof PlanLimitError) {
        return NextResponse.json({ error: limitError.message }, { status: 403 });
      }
      throw limitError;
    }

    // 1. DUPLICATE TEACHER CHECK: Prevent duplicate teacher records across or within schools
    const existingTeacher = await prisma.teacher.findFirst({ where: { email } });
    if (existingTeacher) {
      if (existingTeacher.schoolId && existingTeacher.schoolId !== schoolId) {
        return NextResponse.json(
          { error: 'This teacher already belongs to another school and cannot be created here.' },
          { status: 409 }
        );
      }

      if (existingTeacher.schoolId === schoolId) {
        return NextResponse.json(
          { error: 'A teacher profile with this email address already exists in your school.' },
          { status: 400 }
        );
      }
    }

    // 2. EXISTING USER ACCOUNT VALIDATION: Block Admin/Super-Admin collisions and verify inter-school transfer
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { teacher: true },
    });

    if (existingUser) {
      if (existingUser.role !== 'TEACHER') {
        const roleLabel = existingUser.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin';
        return NextResponse.json(
          {
            error: `This email (${email}) belongs to an existing ${roleLabel} account. An administrator email cannot be registered as a teacher. Please use a distinct email address.`,
          },
          { status: 400 }
        );
      }

      if (existingUser.schoolId && existingUser.schoolId !== schoolId) {
        const eligibleLeave = existingUser.teacher?.leaveRequestStatus === 'APPROVED';
        if (!eligibleLeave) {
          return NextResponse.json(
            {
              error: `The user account "${email}" is currently assigned to another school. The teacher must complete an approved leave request before transferring to this school.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // 3. RESOLVE CLASSES, SUBJECTS & CLASS-SUBJECT MAPPING
    const resolvedClasses = normalizeStringArray(body.classes);
    const requestSubjects = normalizeStringArray(body.subjects);
    const classSubjectMap =
      body.classSubjectMap && typeof body.classSubjectMap === 'object'
        ? (body.classSubjectMap as Record<string, string[]>)
        : undefined;

    const classSubjectPairs: Array<{ cid: string; sid: string }> = [];
    let serializedSubjects: string[] = [];
    const uniqueSubjects = new Set<string>();

    if (classSubjectMap && Object.keys(classSubjectMap).length > 0) {
      for (const [cid, sids] of Object.entries(classSubjectMap)) {
        if (resolvedClasses.length > 0 && !resolvedClasses.includes(cid)) continue;
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
    } else if (requestSubjects.length > 0) {
      for (const cid of resolvedClasses) {
        for (const sid of requestSubjects) {
          if (!sid.includes(':::')) {
            classSubjectPairs.push({ cid, sid });
            uniqueSubjects.add(sid);
          }
        }
      }
      serializedSubjects = [...requestSubjects];
    }

    let subjectSpecialtyId =
      typeof body.subjectSpecialtyId === 'string' && body.subjectSpecialtyId
        ? body.subjectSpecialtyId
        : uniqueSubjects.size > 0
        ? Array.from(uniqueSubjects)[0]
        : requestSubjects[0];

    // Fallback subject strictly in this school context
    let fallbackSubject = await prisma.subject.findFirst({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });

    if (!subjectSpecialtyId && !fallbackSubject) {
      fallbackSubject = await prisma.subject.create({
        data: {
          name: 'Activity',
          code: 'ACT-01',
          schoolId,
        },
      });
    }

    const resolvedSubjectSpecialtyId = subjectSpecialtyId || fallbackSubject?.id || null;

    // 4. DUPLICATE ASSIGNMENT CHECK: Ensure subject is not already assigned to another teacher for this class
    if (resolvedClasses.length > 0 && classSubjectPairs.length > 0) {
      const activeTeachers = await prisma.teacher.findMany({
        where: { ...schoolWhere(schoolId), active: true },
        select: { id: true, name: true, classes: true, subjects: true },
      });

      const [allClasses, allSubjects] = await Promise.all([
        prisma.classRoom.findMany({ where: schoolWhere(schoolId) }),
        prisma.subject.findMany({ where: schoolWhere(schoolId) }),
      ]);

      const classMap = new Map<string, string>();
      allClasses.forEach((c: any) =>
        classMap.set(c.id, c.section ? `${c.name} (${c.section})` : c.name)
      );
      const subjectMap = new Map<string, string>();
      allSubjects.forEach((s: any) => subjectMap.set(s.id, s.name));

      for (const { cid, sid } of classSubjectPairs) {
        const conflictingTeacher = activeTeachers.find((other: any) => {
          const oClasses = normalizeStringArray(other.classes);
          const matchesClass = oClasses.some((oc: string) => {
            if (oc === cid) return true;
            const cls1 = allClasses.find(
              (c: any) =>
                c.id === cid || c.name === cid || (c.section ? `${c.name} (${c.section})` : c.name) === cid
            );
            const cls2 = allClasses.find(
              (c: any) =>
                c.id === oc || c.name === oc || (c.section ? `${c.name} (${c.section})` : c.name) === oc
            );
            return cls1 && cls2 && cls1.id === cls2.id;
          });
          if (!matchesClass) return false;

          const rawOtherSubjects = normalizeStringArray(other.subjects);
          const otherClassPairs = rawOtherSubjects.filter((s: string) => s.includes(':::'));

          if (otherClassPairs.length > 0) {
            return otherClassPairs.some((pair: string) => {
              const [oCid, oSid] = pair.split(':::');
              const clsMatch =
                oCid === cid ||
                (() => {
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
            return rawOtherSubjects.some((os: string) => {
              if (os === sid) return true;
              const s1 = allSubjects.find((s: any) => s.id === sid || s.name === sid);
              const s2 = allSubjects.find((s: any) => s.id === os || s.name === os);
              return s1 && s2 && s1.id === s2.id;
            });
          }
        });

        if (conflictingTeacher) {
          const cls = allClasses.find((c: any) => c.id === cid || c.name === cid);
          const cName = cls
            ? cls.section
              ? `${cls.name} (${cls.section})`
              : cls.name
            : classMap.get(cid) || cid;
          const sub = allSubjects.find((s: any) => s.id === sid || s.name === sid);
          const sName = sub ? sub.name : subjectMap.get(sid) || sid;
          return NextResponse.json(
            {
              error: `"${sName}" in ${cName} is already assigned to ${conflictingTeacher.name}. Only one teacher can be assigned to a subject per class.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // 5. CREATE TEACHER RECORD safely with classes and serialized subjects
    const teacher = await prisma.teacher.create({
      data: {
        name,
        email,
        phone: String(body.phone ?? '').trim(),
        qualifications: normalizeStringArray(body.qualifications),
        classes: resolvedClasses,
        subjects:
          serializedSubjects.length > 0
            ? serializedSubjects
            : resolvedSubjectSpecialtyId
            ? [resolvedSubjectSpecialtyId]
            : [],
        active: typeof body.active === 'boolean' ? body.active : true,
        joinDate: String(body.joinDate ?? new Date().toISOString().split('T')[0]),
        maxPeriodsPerWeek: Number(body.maxPeriodsPerWeek ?? 24),
        subjectSpecialtyId: resolvedSubjectSpecialtyId,
        school: {
          connect: { id: schoolId },
        },
      },
    });

    const school = await prisma.school.findUnique({ where: { id: schoolId } });

    // 6. PROVISION USER ACCOUNT & DISPATCH CREDENTIALS (WITH AUTO-ROLLBACK)
    try {
      await provisionTeacherUserAccount(teacher, school?.name ?? 'Your School');
    } catch (provisionError: any) {
      console.error('[provisionTeacherUserAccount Failed - Rolling back teacher record]:', provisionError);
      try {
        await prisma.teacher.delete({ where: { id: teacher.id } });
      } catch (rollbackErr) {
        console.error('[Teacher deletion rollback failed]:', rollbackErr);
      }
      return NextResponse.json(
        { error: provisionError?.message || 'Failed to setup teacher login credentials.' },
        { status: 400 }
      );
    }

    return NextResponse.json(mapTeacher(teacher));
  } catch (error: any) {
    console.error('[POST /api/admin/teachers/create Execution Failure]:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error?.message) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error);
  }
}