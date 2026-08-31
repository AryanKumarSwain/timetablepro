import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

export async function GET() {
  try {
    await requireSuperAdmin();

    const trustedSchools = await prisma.trustedSchool.findMany({
      orderBy: {
        order: 'asc',
      },
    });

    return NextResponse.json(trustedSchools);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const { name, order } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const trustedSchool = await prisma.trustedSchool.create({
      data: {
        name,
        order: order || 0,
      },
    });

    return NextResponse.json(trustedSchool);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireSuperAdmin();

    const body = await request.json();
    const { id, name, isActive, order } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const trustedSchool = await prisma.trustedSchool.update({
      where: { id },
      data: {
        name,
        isActive,
        order,
      },
    });

    return NextResponse.json(trustedSchool);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await prisma.trustedSchool.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
