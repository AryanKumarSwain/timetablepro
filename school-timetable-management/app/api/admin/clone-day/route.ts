import { NextRequest, NextResponse } from 'next/server';
import { requireSchoolAdmin, handleApiError } from '@/lib/auth-server';
import { cloneOperationalDay } from '@/lib/clone-day';

export async function POST(request: NextRequest) {
  try {
    const { schoolId } = await requireSchoolAdmin();
    const body = await request.json().catch(() => ({}));
    const sourceDate =
      String(body.date ?? '') || new Date().toISOString().split('T')[0];

    const result = await cloneOperationalDay(schoolId, sourceDate);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
