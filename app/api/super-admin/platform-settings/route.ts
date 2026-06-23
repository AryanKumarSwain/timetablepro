import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, handleApiError } from '@/lib/auth-server';

// GET /api/super-admin/platform-settings - Fetch platform settings (UPI ID)
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin();
    
    let settings = await prisma.platformSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: { upiId: 'example@upi' }
      });
    }
    
    return NextResponse.json({ upiId: settings.upiId });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/super-admin/platform-settings - Update platform settings (UPI ID)
export async function PATCH(request: NextRequest) {
  try {
    await requireSuperAdmin();
    const { upiId } = await request.json();
    
    if (!upiId || typeof upiId !== 'string') {
      return NextResponse.json({ error: 'Invalid UPI ID' }, { status: 400 });
    }
    
    let settings = await prisma.platformSettings.findFirst();
    
    if (settings) {
      settings = await prisma.platformSettings.update({
        where: { id: settings.id },
        data: { upiId }
      });
    } else {
      settings = await prisma.platformSettings.create({
        data: { upiId }
      });
    }
    
    return NextResponse.json({ upiId: settings.upiId });
  } catch (error) {
    return handleApiError(error);
  }
}
