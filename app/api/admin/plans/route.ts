import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';

export async function GET() {
  try {
    const plans = await prisma.saaSPlan.findMany({
      orderBy: { priceMonthly: 'asc' },
    });

    return NextResponse.json(plans);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, teacherMin, teacherMax, priceMonthly, reportEnabled, attendanceEnabled, homeworkEnabled, exportFormats, watermarkRequired } = body;

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const updatedPlan = await prisma.saaSPlan.update({
      where: { id },
      data: {
        name,
        teacherMin,
        teacherMax,
        priceMonthly,
        reportEnabled,
        attendanceEnabled,
        homeworkEnabled,
        exportFormats,
        watermarkRequired,
      },
    });

    return NextResponse.json(updatedPlan);
  } catch (error) {
    return handleApiError(error);
  }
}
