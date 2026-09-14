import { NextRequest, NextResponse } from 'next/server';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';
import { resendTeacherCredentials } from '@/lib/teacher-onboarding';
import { resendLimiter, getClientIp } from '@/lib/rate-limit';

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

    const clientIp = getClientIp(request);
    const rateLimit = resendLimiter.check(`resend:${clientIp}:${id}`);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many resend requests for this teacher. Please wait ${rateLimit.retryAfter} seconds.` },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.reset),
          },
        }
      );
    }

    const result = await resendTeacherCredentials(id, schoolId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[POST /api/admin/teachers/[id]/resend-credentials Error]:', error);
    return handleApiError(error);
  }
}
