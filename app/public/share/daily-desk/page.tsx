import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Lock } from 'lucide-react';
import DailyDeskPublicView from './daily-desk-public-view';

async function getDailyDeskData(date: string, schoolId?: string) {
  const timetable = await prisma.timetable.findFirst({
    where: schoolId ? { status: 'PUBLISHED', schoolId } : { status: 'PUBLISHED' },
    include: {
      periods: {
        orderBy: { startTime: 'asc' },
      },
      slots: {
        include: {
          period: true,
          class: true,
          subject: true,
          teacher: true,
        },
      },
    },
  });

  if (!timetable) {
    return null;
  }

  const actualSchoolId = timetable.schoolId;

  const classes = await prisma.classRoom.findMany({
    where: { schoolId: actualSchoolId },
    orderBy: { name: 'asc' },
  });

  const teachers = await prisma.teacher.findMany({
    where: { schoolId: actualSchoolId },
    orderBy: { name: 'asc' },
  });

  const replacements = await prisma.replacementAssignment.findMany({
    where: { 
      date,
      classId: { in: classes.map(c => c.id) },
    },
    include: {
      originalTeacher: true,
      replacementTeacher: true,
      period: true,
    },
  });

  const attendance = await prisma.teacherAttendance.findMany({
    where: { 
      date,
      teacher: { schoolId: actualSchoolId },
    },
  });

  // Build grid data
  const grid = timetable.periods.map((period) => ({
    periodId: period.id,
    cells: classes.map((cls: any) => {
      const slot = timetable.slots.find(
        (s) => s.periodId === period.id && s.classId === cls.id
      );

      if (!slot) {
        return {
          classId: cls.id,
          className: cls.name,
          empty: true,
          subjectName: '',
          teacherId: '',
          teacherName: '',
          isAbsent: false,
        };
      }

      const attendanceRecord = attendance.find(
        (a: any) => a.teacherId === slot.teacherId && a.date === date
      );
      const isAbsent = attendanceRecord?.status === 'ABSENT';

      const replacement = replacements.find(
        (r: any) =>
          r.classId === cls.id &&
          r.periodId === period.id &&
          r.date === date
      );

      return {
        classId: cls.id,
        className: cls.name,
        empty: false,
        subjectName: slot.subject?.name || '',
        teacherId: slot.teacherId,
        teacherName: slot.teacher?.name || '',
        isAbsent,
        replacement: replacement
          ? {
              id: replacement.id,
              replacementTeacherId: replacement.replacementTeacherId,
              replacementTeacherName: replacement.replacementTeacher?.name || '',
              status: replacement.status,
            }
          : null,
        isReplacementAbsent: replacement?.replacementTeacherId
          ? attendance.find(
              (a: any) =>
                a.teacherId === replacement.replacementTeacherId &&
                a.date === date
            )?.status === 'ABSENT'
          : false,
      };
    }),
  }));

  // Calculate busy teachers by period
  const busyTeachersByPeriod: Record<string, string[]> = {};
  timetable.periods.forEach((period) => {
    const busyTeacherIds = timetable.slots
      .filter((s) => s.periodId === period.id)
      .map((s) => s.teacherId);
    busyTeachersByPeriod[period.id] = busyTeacherIds;
  });

  return {
    date,
    classes,
    periods: timetable.periods,
    grid,
    attendance,
    replacements,
    busyTeachersByPeriod,
  };
}

export default async function PublicShareDailyDeskPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; schoolId?: string }>;
}) {
  const params = await searchParams;
  const date = params.date || new Date().toISOString().split('T')[0];
  const schoolId = params.schoolId;

  const data = await getDailyDeskData(date, schoolId);

  if (!data) {
    notFound();
  }

  return (
    <div className='max-w-[1600px] mx-auto px-4 py-8'>
      <GlassCard className='p-6 mb-6'>
        <div className='flex flex-col gap-3'>
          <div className='flex items-center gap-2'>
            <Lock className='h-5 w-5 text-amber-600' />
            <h1 className='text-xl font-semibold'>Public Daily Desk View</h1>
          </div>
          <p className='text-sm text-muted-foreground'>
            This daily desk is shared publicly and does not require login.
          </p>
        </div>
      </GlassCard>

      <DailyDeskPublicView data={data} />
    </div>
  );
}
