import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/platform-settings - Fetch public platform settings (UPI ID)
export async function GET(request: NextRequest) {
  try {
    let settings = await prisma.platformSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.platformSettings.create({
        data: { upiId: 'example@upi' }
      });
    }
    
    return NextResponse.json({ upiId: settings.upiId });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}
