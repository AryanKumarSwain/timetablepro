import { NextRequest, NextResponse } from 'next/server';
import { requireSchoolContext, handleApiError } from '@/lib/auth-server';
import { resendTeacherCredentials } from '@/lib/teacher-onboarding';
import { resendLimiter, teacherResendCooldownLimiter, getClientIp } from '@/lib/rate-limit';

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

    // Global IP throttle: max 5 requests per 5 minutes
    const ipRateLimit = resendLimiter.check(`resend_ip:${clientIp}`);
    if (!ipRateLimit.success) {
      return NextResponse.json(
        { error: `Too many resend attempts from this IP. Please wait ${ipRateLimit.retryAfter} seconds.` },
        {
          status: 429,
          headers: {
            'Retry-After': String(ipRateLimit.retryAfter),
            'X-RateLimit-Limit': String(ipRateLimit.limit),
            'X-RateLimit-Remaining': String(ipRateLimit.remaining),
            'X-RateLimit-Reset': String(ipRateLimit.reset),
          },
        }
      );
    }

    // Per-teacher cooldown: 1 request every 60 seconds
    const teacherCooldown = teacherResendCooldownLimiter.check(`resend_teacher:${schoolId}:${id}`);
    if (!teacherCooldown.success) {
      return NextResponse.json(
        { error: `Please wait ${teacherCooldown.retryAfter}s before resending credentials to this teacher again.` },
        {
          status: 429,
          headers: {
            'Retry-After': String(teacherCooldown.retryAfter),
            'X-RateLimit-Limit': String(teacherCooldown.limit),
            'X-RateLimit-Remaining': String(teacherCooldown.remaining),
            'X-RateLimit-Reset': String(teacherCooldown.reset),
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
