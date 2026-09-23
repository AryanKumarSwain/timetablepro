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
    const state = String(body.state ?? '').trim();
    const city = String(body.city ?? '').trim();
    const country = String(body.country ?? '').trim();
    const studentsRange = String(body.studentsRange ?? '').trim();
    const facultyRange = String(body.facultyRange ?? '').trim();

    if (!instituteName) errors.instituteName = 'Institute name is required';
    if (!instituteType) errors.instituteType = 'Institute type is required';
    else if (!INSTITUTE_TYPES.includes(instituteType as (typeof INSTITUTE_TYPES)[number])) {
      errors.instituteType = 'Select a valid institute type';
    }
    if (!state) errors.state = 'State is required';
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

    // Find free plan reliably without blocking transactions
    let freePlan = await prisma.saaSPlan.findFirst({
      where: {
        OR: [
          { id: 'plan-free' },
          { name: 'Free' },
        ],
      },
    });

    if (!freePlan) {
      freePlan = await prisma.saaSPlan.findFirst({
        orderBy: { orderIndex: 'asc' },
      });
    }

    const school = await prisma.school.create({
      data: {
        name: instituteName,
        type: instituteType,
        state,
        city,
        country,
        studentsRange,
        facultyRange,
        licenseStatus: 'ACTIVE',
        planId: freePlan ? freePlan.id : null,
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        schoolId: school.id,
        onboardingDone: true,
        role: 'ADMIN',
      },
    });

    session.user = {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      schoolId: updatedUser.schoolId,
      onboardingDone: true,
      name: updatedUser.name,
      phone: updatedUser.phone,
      countryCode: updatedUser.countryCode,
    };
    await session.save();

    return NextResponse.json({ success: true, schoolId: school.id });
  } catch (error: any) {
    console.error('[auth/signup/onboarding]', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}