import { NextRequest, NextResponse } from 'next/server';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';
import { resendTeacherCredentials } from '@/lib/teacher-onboarding';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { schoolId } = await requireSchoolContext();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'Teacher ID required' }, { status: 400 });
    }

    const result = await resendTeacherCredentials(id, schoolId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[POST /api/admin/teachers/[id]/resend-credentials Error]:', error);
    return handleApiError(error);
  }
}
