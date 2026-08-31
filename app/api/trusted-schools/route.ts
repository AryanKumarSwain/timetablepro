import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const trustedSchools = await prisma.trustedSchool.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        order: 'asc',
      },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json(trustedSchools);
  } catch (error) {
    console.error('Error fetching trusted schools:', error);
    return NextResponse.json({ error: 'Failed to fetch trusted schools' }, { status: 500 });
  }
}
