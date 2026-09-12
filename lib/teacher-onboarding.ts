import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sendTeacherCredentials } from '@/lib/mailer';
import { sendWhatsAppTeacherCredentials } from '@/lib/whatsapp';
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

  const rawLoginUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://timetablepro.webncode.in/login';

  const loginUrl = rawLoginUrl.includes('localhost')
    ? rawLoginUrl.replace(/http:\/\/localhost(:\d+)?/g, 'https://timetablepro.webncode.in')
    : rawLoginUrl;

  const formattedLoginUrl = loginUrl.endsWith('/login')
    ? loginUrl
    : `${loginUrl.replace(/\/$/, '')}/login`;

  // 1. Send credentials via Email
  try {
    const result = await sendTeacherCredentials(
      teacher.email,
      teacher.name,
      schoolName,
      plainPassword,
      formattedLoginUrl
    );
    if (!result.sent) {
      console.warn('[provisionTeacherUserAccount] Credentials email not sent:', result.error ?? 'unknown');
    }
  } catch (err) {
    console.error('[provisionTeacherUserAccount] sendTeacherCredentials email threw error:', err);
  }

  // 2. Send credentials via WhatsApp (if phone number configured)
  if (teacher.phone) {
    try {
      const waResult = await sendWhatsAppTeacherCredentials({
        toPhone: teacher.phone,
        teacherName: teacher.name,
        schoolName,
        email: teacher.email,
        password: plainPassword,
        loginUrl: formattedLoginUrl,
      });
      if (!waResult.sent) {
        console.warn('[provisionTeacherUserAccount] Credentials WhatsApp not sent:', waResult.error ?? 'unknown');
      } else {
        console.log(`[provisionTeacherUserAccount] Credentials WhatsApp sent to ${teacher.phone} via ${waResult.method}`);
      }
    } catch (waErr) {
      console.error('[provisionTeacherUserAccount] sendWhatsAppTeacherCredentials threw error:', waErr);
    }
  }
}

export async function resendTeacherCredentials(
  teacherId: string,
  schoolId: string
): Promise<{
  success: boolean;
  email: string;
  phone?: string;
  sent: boolean;
  whatsappSent?: boolean;
  whatsappError?: string;
  tempPassword: string;
  error?: string;
}> {
  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId },
  });

  if (!teacher) {
    throw new Error('Teacher record not found');
  }

  if (!teacher.email) {
    throw new Error('Teacher does not have an email address configured');
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  const schoolName = school?.name || 'Your School';

  const plainPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const existingUser = await prisma.user.findUnique({
    where: { email: teacher.email.toLowerCase().trim() },
  });

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { password: hashedPassword, role: 'TEACHER', schoolId },
    });

    if (!teacher.userId) {
      await prisma.teacher.update({
        where: { id: teacher.id },
        data: { userId: existingUser.id },
      });
    }
  } else {
    const newUser = await prisma.user.create({
      data: {
        email: teacher.email.toLowerCase().trim(),
        password: hashedPassword,
        role: 'TEACHER',
        schoolId,
      },
    });

    await prisma.teacher.update({
      where: { id: teacher.id },
      data: { userId: newUser.id },
    });
  }

  const rawLoginUrl =
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://timetablepro.webncode.in/login';

  const loginUrl = rawLoginUrl.includes('localhost')
    ? rawLoginUrl.replace(/http:\/\/localhost(:\d+)?/g, 'https://timetablepro.webncode.in')
    : rawLoginUrl;

  const formattedLoginUrl = loginUrl.endsWith('/login')
    ? loginUrl
    : `${loginUrl.replace(/\/$/, '')}/login`;

  let sent = false;
  let sendError: string | undefined;

  // 1. Send via Email
  try {
    const sendResult = await sendTeacherCredentials(
      teacher.email,
      teacher.name,
      schoolName,
      plainPassword,
      formattedLoginUrl
    );
    sent = sendResult.sent;
    sendError = sendResult.error;
  } catch (err: any) {
    sendError = err?.message || 'Failed to dispatch email';
  }

  // 2. Send via WhatsApp
  let whatsappSent = false;
  let whatsappError: string | undefined;

  if (teacher.phone) {
    try {
      const waResult = await sendWhatsAppTeacherCredentials({
        toPhone: teacher.phone,
        teacherName: teacher.name,
        schoolName,
        email: teacher.email,
        password: plainPassword,
        loginUrl: formattedLoginUrl,
      });
      whatsappSent = waResult.sent;
      whatsappError = waResult.error;
    } catch (waErr: any) {
      whatsappError = waErr?.message || 'Failed to dispatch WhatsApp message';
    }
  }

  return {
    success: true,
    email: teacher.email,
    phone: teacher.phone,
    sent,
    whatsappSent,
    whatsappError,
    tempPassword: plainPassword,
    error: sendError,
  };
}


