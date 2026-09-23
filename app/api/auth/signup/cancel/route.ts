import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function POST() {
  try {
    const session = await getSession();

    if (session.isLoggedIn && session.user?.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      // If user has not completed onboarding, clean up incomplete registration
      if (dbUser && !dbUser.onboardingDone) {
        const schoolId = dbUser.schoolId;

        // Clean up any pending verification tokens for this user's email
        await prisma.verificationToken
          .deleteMany({ where: { identifier: dbUser.email } })
          .catch(() => {});

        // Delete incomplete user
        await prisma.user
          .delete({ where: { id: dbUser.id } })
          .catch(() => {});

        // If a temporary empty school was created, clean it up
        if (schoolId) {
          const userCount = await prisma.user.count({ where: { schoolId } });
          if (userCount === 0) {
            await prisma.school
              .delete({ where: { id: schoolId } })
              .catch(() => {});
          }
        }
      }

      // Destroy active session
      session.destroy();
    }

    return NextResponse.json({
      success: true,
      message: 'Signup cancelled successfully',
    });
  } catch (error) {
    console.error('[auth/signup/cancel]', error);

    try {
      const session = await getSession();
      session.destroy();
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Signup session cleared',
    });
  }
}
