import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sendTeacherCredentials } from '@/lib/mailer';
import type { Teacher as DbTeacher } from '@prisma/client';

const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function generateTempPassword(length = 8): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
  }
  return result;
}

export async function provisionTeacherUserAccount(
  teacher: DbTeacher,
  schoolName: string
): Promise<void> {
  const existingUser = await prisma.user.findUnique({
    where: { email: teacher.email },
    include: { teacher: true },
  });

  let plainPassword: string;

  if (existingUser) {
    // SECURITY CHECK: Ensure the existing user belongs to the same school as the teacher unless they have an approved leave request
    if (existingUser.schoolId && existingUser.schoolId !== teacher.schoolId) {
      const eligibleLeave = existingUser.teacher?.leaveRequestStatus === 'APPROVED';
      if (!eligibleLeave) {
        throw new Error(
          `Security violation: Cannot provision user account. Teacher with email "${teacher.email}" has an active school assignment and must complete an approved leave request before joining a different school.`
        );
      }
    }

    // Check if the existing user is already linked to this teacher
    if (!teacher.userId) {
      // Check if the userId is already linked to another teacher in the same school
      const teacherWithSameUserId = await prisma.teacher.findFirst({
        where: {
          userId: existingUser.id,
          schoolId: teacher.schoolId,
          id: { not: teacher.id },
        },
      });

      if (!teacherWithSameUserId) {
        // Only link if no other teacher in the same school has this userId
        try {
          await prisma.teacher.update({
            where: { id: teacher.id },
            data: { userId: existingUser.id },
          });
        } catch (error) {
          // If update fails due to constraint, skip it
          console.warn('[provisionTeacherUserAccount] Failed to link user to teacher:', error);
        }
      }
    }
    // Generate a new password and update the existing user
    plainPassword = generateTempPassword();
    const hashed = await bcrypt.hash(plainPassword, 10);
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { password: hashed },
    });
  } else {
    plainPassword = generateTempPassword();
    const hashed = await bcrypt.hash(plainPassword, 10);

    const user = await prisma.user.create({
      data: {
        email: teacher.email,
        password: hashed,
        role: 'TEACHER',
        schoolId: teacher.schoolId,
      },
    });

    await prisma.teacher.update({
      where: { id: teacher.id },
      data: { userId: user.id },
    });
  }

  const loginUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000/login';

  // Log send result to help debug SMTP issues during teacher provisioning
  try {
    const result = await sendTeacherCredentials(
      teacher.email,
      teacher.name,
      schoolName,
      plainPassword,
      loginUrl.endsWith('/login') ? loginUrl : `${loginUrl.replace(/\/$/, '')}/login`
    );
    if (!result.sent) {
      console.warn('[provisionTeacherUserAccount] Credentials email not sent:', result.error ?? 'unknown');
    }
  } catch (err) {
    console.error('[provisionTeacherUserAccount] sendTeacherCredentials threw error:', err);
  }
}
