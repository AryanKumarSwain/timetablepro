import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { provisionTeacherUserAccount } from '@/lib/teacher-onboarding';
import { checkTeacherLimit, getTeacherLimit, PlanLimitError } from '@/lib/plan-limits';
import type { CsvImportEntity, CsvImportResult, ParsedCsvRow } from '@/lib/csv-import/types';

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value?.trim()) return defaultValue;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function parseQualifications(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  const client = prisma;

  try {
    const { schoolId } = await requireSchoolContext();
    const body = await request.json();
    const entity = body.entity as CsvImportEntity;
    const rows = (body.rows ?? []) as ParsedCsvRow[];

    if (!['teachers', 'subjects', 'classes'].includes(entity)) {
      return NextResponse.json({ error: 'Invalid import entity.' }, { status: 400 });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { error: 'No rows provided for import.' },
        { status: 400 }
      );
    }

    const result: CsvImportResult = {
      imported: 0,
      failed: 0,
      errors: [],
    };

    if (entity === 'subjects') {
      for (let i = 0; i < rows.length; i++) {
        const rowNumber = i + 2;
        const row = rows[i];
        const name = row.name?.trim();
        const code = row.code?.trim().toUpperCase();

        if (!name || !code) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            message: 'name and code are required.',
          });
          continue;
        }

        try {
          const existing = await client.subject.findFirst({
            where: { schoolId, code },
          });
          if (existing) {
            result.failed++;
            result.errors.push({
              row: rowNumber,
              field: 'code',
              message: `Subject code "${code}" already exists.`,
            });
            continue;
          }

          await client.subject.create({
            data: {
              id: `subject-${crypto.randomUUID()}`,
              schoolId,
              name,
              code,
            },
          });
          result.imported++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            message:
              error instanceof Error ? error.message : 'Failed to create subject.',
          });
        }
      }

      return NextResponse.json(result);
    }

    if (entity === 'classes') {
      for (let i = 0; i < rows.length; i++) {
        const rowNumber = i + 2;
        const row = rows[i];
        const name = row.name?.trim();
        const grade = row.grade?.trim();
        const section = row.section?.trim();
        const roomNumber = row.roomNumber?.trim() ?? '';

        if (!name || !grade || !section) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            message: 'name, grade, and section are required.',
          });
          continue;
        }

        try {
          await client.classRoom.create({
            data: {
              id: `class-${crypto.randomUUID()}`,
              schoolId,
              name,
              grade,
              section,
              roomNumber,
            },
          });
          result.imported++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            message:
              error instanceof Error ? error.message : 'Failed to create class.',
          });
        }
      }

      return NextResponse.json(result);
    }

    const subjects = await client.subject.findMany({
      where: schoolWhere(schoolId),
    });
    const subjectByCode = new Map(
      subjects.map((subject) => [subject.code.toUpperCase(), subject])
    );
    const fallbackSubject = subjects[0];

    if (!fallbackSubject) {
      return NextResponse.json(
        {
          error:
            'Import at least one subject before importing teachers.',
        },
        { status: 400 }
      );
    }

    const school = await client.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });
    const schoolName = school?.name ?? 'Your School';

    // Check plan limit before starting import
    const teacherLimit = await getTeacherLimit(schoolId);
    const currentTeacherCount = await client.teacher.count({
      where: { schoolId },
    });
    const availableSlots = teacherLimit - currentTeacherCount;

    if (availableSlots <= 0) {
      return NextResponse.json(
        {
          error: `Teacher limit reached. Your current plan allows a maximum of ${teacherLimit} teachers. Please upgrade your plan to add more teachers.`,
        },
        { status: 403 }
      );
    }

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2;
      const row = rows[i];
      const name = row.name?.trim();
      const email = row.email?.trim().toLowerCase();
      const phone = row.phone?.trim();

      if (!name || !email || !phone) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          message: 'name, email, and phone are required.',
        });
        continue;
      }

      // Check if we've reached the limit during import
      if (result.imported >= availableSlots) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          message: `Teacher limit reached. Your current plan allows a maximum of ${teacherLimit} teachers. Please upgrade your plan to add more teachers.`,
        });
        continue;
      }

      const subjectCode = row.subjectCode?.trim().toUpperCase();
      const matchedSubject = subjectCode
        ? subjectByCode.get(subjectCode)
        : undefined;

      if (subjectCode && !matchedSubject) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          field: 'subjectCode',
          message: `Subject code "${subjectCode}" not found.`,
        });
        continue;
      }

      const subjectSpecialtyId = matchedSubject?.id ?? fallbackSubject.id;
      const subjectIds = matchedSubject
        ? [matchedSubject.id]
        : [fallbackSubject.id];

      try {
        const duplicate = await client.teacher.findFirst({
          where: { schoolId, email },
        });
        if (duplicate) {
          result.failed++;
          result.errors.push({
            row: rowNumber,
            field: 'email',
            message: `Teacher with email "${email}" already exists.`,
          });
          continue;
        }

        const teacher = await client.teacher.create({
          data: {
            schoolId,
            name,
            email,
            phone,
            joinDate:
              row.joinDate?.trim() ||
              new Date().toISOString().split('T')[0],
            maxPeriodsPerWeek: Number(row.maxPeriodsPerWeek?.trim() || 24),
            active: parseBoolean(row.active, true),
            qualifications: parseQualifications(row.qualifications),
            subjects: subjectIds,
            subjectSpecialtyId,
          },
        });

        await provisionTeacherUserAccount(teacher, schoolName);
        result.imported++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          message:
            error instanceof Error ? error.message : 'Failed to create teacher.',
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
