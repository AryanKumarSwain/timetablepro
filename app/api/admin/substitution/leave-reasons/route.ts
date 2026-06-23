import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';

// In-memory storage for leave reasons (can be moved to database later)
let leaveReasons: string[] = ['Medical Leave', 'Personal Emergency', 'Family Emergency', 'Official Duty'];

export async function GET(request: NextRequest) {
  try {
    await requireSchoolContext();
    return NextResponse.json({ reasons: leaveReasons });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSchoolContext();
    const body = await request.json();
    const reason = String(body.reason ?? '').trim();

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    if (leaveReasons.includes(reason)) {
      return NextResponse.json({ error: 'Reason already exists' }, { status: 400 });
    }

    leaveReasons.push(reason);
    return NextResponse.json({ success: true, reasons: leaveReasons });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireSchoolContext();
    const body = await request.json();
    const reason = String(body.reason ?? '').trim();

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    leaveReasons = leaveReasons.filter(r => r !== reason);
    return NextResponse.json({ success: true, reasons: leaveReasons });
  } catch (error) {
    return handleApiError(error);
  }
}
