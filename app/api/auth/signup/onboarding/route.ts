import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

const INSTITUTE_TYPES = [
  'School',
  'College',
  'University',
  'Coaching Institute',
  'Other',
] as const;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const errors: Record<string, string> = {};

    const instituteName = String(body.instituteName ?? '').trim();
    const instituteType = String(body.instituteType ?? '').trim();
    const city = String(body.city ?? '').trim();
    const country = String(body.country ?? '').trim();
    const studentsRange = String(body.studentsRange ?? '').trim();
    const facultyRange = String(body.facultyRange ?? '').trim();

    if (!instituteName) errors.instituteName = 'Institute name is required';
    if (!instituteType) errors.instituteType = 'Institute type is required';
    else if (!INSTITUTE_TYPES.includes(instituteType as (typeof INSTITUTE_TYPES)[number])) {
      errors.instituteType = 'Select a valid institute type';
    }
    if (!city) errors.city = 'City is required';
    if (!country) errors.country = 'Country is required';
    if (!studentsRange) errors.studentsRange = 'Select number of students';
    if (!facultyRange) errors.facultyRange = 'Select number of faculty';

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (dbUser.onboardingDone && dbUser.schoolId) {
      return NextResponse.json({ success: true });
    }

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: instituteName,
          type: instituteType,
          city,
          country,
          studentsRange,
          facultyRange,
          licenseStatus: 'ACTIVE',
          plan: {
            connectOrCreate: {
              where: { id: "baseline-free-tier" },
              create: {
                id: "baseline-free-tier",
                name: "Baseline Tier",
                teacherMin: 0,
                teacherMax: 15,
                priceMonthly: 0
              }
            }
          }
        },
      });

      const user = await tx.user.update({
        where: { id: dbUser.id },
        data: {
          schoolId: school.id,
          onboardingDone: true,
          role: 'ADMIN',
        },
      });

      return { school, user };
    });

    session.user = {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      schoolId: result.user.schoolId,
      onboardingDone: true,
    };
    await session.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[auth/signup/onboarding]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}