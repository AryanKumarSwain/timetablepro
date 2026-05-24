import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError, schoolWhere } from '@/lib/auth-server';
import { mapPeriod } from '@/lib/mappers';

export async function GET() {
  try {
    const { schoolId } = await requireSchoolContext();
    const rows = await prisma.period.findMany({
      where: schoolWhere(schoolId),
      orderBy: { periodNumber: 'asc' },
    });
    return NextResponse.json(rows.map(mapPeriod));
  } catch (error) {
    return handleApiError(error);
  }
}
