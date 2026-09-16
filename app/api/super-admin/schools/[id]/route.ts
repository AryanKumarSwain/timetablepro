import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireSuperAdmin();
    const { id } = await context.params;

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        plan: true,
        _count: {
          select: { teachers: true },
        },
        users: {
          where: { role: 'ADMIN' },
          select: { email: true },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: school.id,
      name: school.name,
      type: school.type || '',
      state: school.state || '',
      city: school.city || '',
      country: school.country || '',
      studentsRange: school.studentsRange || '',
      facultyRange: school.facultyRange || '',
      teacherCount: school._count?.teachers ?? 0,
      address: school.address || '',
      phone: school.phone || '',
      email: school.email || '',
      website: school.website || '',
      instagram: school.instagram || '',
      facebook: school.facebook || '',
      linkedin: school.linkedin || '',
      twitter: school.twitter || '',
      licenseStatus: school.licenseStatus,
      planName: school.plan?.name || 'No Plan',
      adminEmails: school.users.map((u) => u.email),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    await requireSuperAdmin();
    const { id } = await context.params;
    const body = await request.json();

    const name = body.name ? String(body.name).trim() : undefined;
    const type = body.type !== undefined ? String(body.type).trim() : undefined;
    const state = body.state !== undefined ? String(body.state).trim() : undefined;
    const city = body.city !== undefined ? String(body.city).trim() : undefined;
    const country = body.country !== undefined ? String(body.country).trim() : undefined;
    const studentsRange = body.studentsRange !== undefined ? String(body.studentsRange).trim() : undefined;
    const facultyRange = body.facultyRange !== undefined ? String(body.facultyRange).trim() : undefined;
    const address = body.address !== undefined ? String(body.address).trim() : undefined;
    const phone = body.phone !== undefined ? String(body.phone).trim() : undefined;
    const email = body.email !== undefined ? String(body.email).trim() : undefined;
    const website = body.website !== undefined ? String(body.website).trim() : undefined;
    const instagram = body.instagram !== undefined ? String(body.instagram).trim() : undefined;
    const facebook = body.facebook !== undefined ? String(body.facebook).trim() : undefined;
    const linkedin = body.linkedin !== undefined ? String(body.linkedin).trim() : undefined;
    const twitter = body.twitter !== undefined ? String(body.twitter).trim() : undefined;

    if (name !== undefined && !name) {
      return NextResponse.json({ error: 'Institute name is required' }, { status: 400 });
    }

    const updated = await prisma.school.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(state !== undefined && { state }),
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
        ...(studentsRange !== undefined && { studentsRange }),
        ...(facultyRange !== undefined && { facultyRange }),
        ...(address !== undefined && { address }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(website !== undefined && { website }),
        ...(instagram !== undefined && { instagram }),
        ...(facebook !== undefined && { facebook }),
        ...(linkedin !== undefined && { linkedin }),
        ...(twitter !== undefined && { twitter }),
      },
    });

    return NextResponse.json({
      success: true,
      school: {
        id: updated.id,
        name: updated.name,
        type: updated.type || '',
        state: updated.state || '',
        city: updated.city || '',
        country: updated.country || '',
        studentsRange: updated.studentsRange || '',
        facultyRange: updated.facultyRange || '',
        address: updated.address || '',
        phone: updated.phone || '',
        email: updated.email || '',
        website: updated.website || '',
        instagram: updated.instagram || '',
        facebook: updated.facebook || '',
        linkedin: updated.linkedin || '',
        twitter: updated.twitter || '',
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
