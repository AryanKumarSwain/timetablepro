import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { TimetableGrid } from '@/components/timetable-builder/timetable-grid';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Lock } from 'lucide-react';

async function getTimetable(id: string) {
  return prisma.timetable.findUnique({
    where: { id },
    include: {
      periods: true,
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
}

export default async function PublicShareTimetablePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;

  const timetable = await getTimetable(id);

  if (!timetable) {
    notFound();
  }

  const workingDays = Array.isArray(timetable.workingDays)
    ? timetable.workingDays.filter((day): day is number => typeof day === 'number')
    : [1, 2, 3, 4, 5];

  const periods = timetable.periods.map((period) => ({
    id: period.id,
    name: period.label || `Period ${period.periodNumber}`,
    label: period.label || `Period ${period.periodNumber}`,
    periodNumber: period.periodNumber,
    startTime: period.startTime,
    endTime: period.endTime,
    isBreak: period.isBreak,
    breakLabel: period.isBreak ? period.label || 'BREAK' : undefined,
  })) as Array<{
    id: string;
    name: string;
    label: string;
    periodNumber: number;
    startTime: string;
    endTime: string;
    isBreak: boolean;
    breakLabel?: string;
  }>;

  const slots = timetable.slots.map((slot) => ({
    id: slot.id,
    dayOfWeek: slot.dayOfWeek,
    periodId: slot.periodId,
    classId: slot.classId,
    subjectId: slot.subjectId,
    teacherId: slot.teacherId,
    periodNumber: slot.period.periodNumber,
    className: slot.class?.name || '',
    subjectName: slot.subject?.name || '',
    teacherName: slot.teacher?.name || '',
  }));

  return (
    <div className='max-w-6xl mx-auto px-4 py-8'>
      <GlassCard className='p-6 mb-6'>
        <div className='flex flex-col gap-3'>
          <div className='flex items-center gap-2'>
            <Lock className='h-5 w-5 text-amber-600' />
            <h1 className='text-xl font-semibold'>Public Timetable View</h1>
          </div>
          <p className='text-sm text-muted-foreground'>This timetable is shared publicly and does not require login.</p>
        </div>
      </GlassCard>

      <GlassCard className='p-5'>
        <div className='space-y-5'>
          <div>
            <h2 className='text-lg font-bold'>{timetable.name}</h2>
            <p className='text-sm text-muted-foreground'>Anyone with this link can view the timetable.</p>
          </div>

          <TimetableGrid
            periods={periods}
            slots={slots}
            workingDays={workingDays}
            baseStartTime={timetable.baseStartTime || '08:00'}
            periodDuration={timetable.periodDuration || 45}
          />
        </div>
      </GlassCard>
    </div>
  );
}
