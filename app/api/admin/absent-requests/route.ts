import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolContext();
    const status = request.nextUrl.searchParams.get('status') || 'PENDING';

   const requests = await prisma.teacherAbsentRequest.findMany({
      where: {
        schoolId,
        status,
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    return handleApiError(error);
  }
}
