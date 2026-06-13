import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const adminData = await requireSchoolAdmin();
    const { schoolId } = adminData;

    const body = await request.json();
    const { reason, instituteName, contactNo, email, noOfTeachers } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }
    if (!instituteName || !contactNo || !email || !noOfTeachers) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const existingRequest = await prisma.trialRequest.findFirst({
      where: {
        schoolId: schoolId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending trial request' }, { status: 409 });
    }

    const trialRequest = await prisma.trialRequest.create({
      data: {
        schoolId: schoolId,
        schoolName: instituteName || school.name,
        contactName: adminData.name || 'Admin',
        phone: contactNo,
        expectedFaculty: Number(noOfTeachers),
        status: 'PENDING',
      },
    });

    return NextResponse.json(trialRequest, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
