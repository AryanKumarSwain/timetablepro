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
  });

  if (existingUser) {
    if (!teacher.userId) {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { userId: existingUser.id },
      });
    }
    return;
  }

  const plainPassword = generateTempPassword();
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

  const loginUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000/login';

  await sendTeacherCredentials(
    teacher.email,
    teacher.name,
    schoolName,
    plainPassword,
    loginUrl.endsWith('/login') ? loginUrl : `${loginUrl.replace(/\/$/, '')}/login`
  );
}
