import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSchoolContext } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const context = await requireSchoolContext();
    const schoolId = context.schoolId;
    if (!schoolId) throw new Error("School runtime context mapped as null.");

    const body = await request.json().catch(() => ({}));
    const { teacherId, date, status } = body; // status: 'PRESENT' | 'ABSENT'

    if (!teacherId || !date || !status) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const formattedDate = date.split('T')[0];

    // पुराने रिकॉर्ड्स साफ करें
    await prisma.teacherAttendance.deleteMany({
      where: { schoolId, teacherId, date: formattedDate }
    });

    await prisma.replacementAssignment.deleteMany({
      where: { schoolId, originalTeacherId: teacherId, date: formattedDate, status: 'PENDING' }
    });

    // अगर ABSENT है, तो ही नया रिकॉर्ड और रिप्लेसमेंट बनाएँगे
    if (status === 'ABSENT') {
      await prisma.teacherAttendance.create({
        data: {
          schoolId,
          teacherId,
          date: formattedDate,
          status: 'ABSENT'
        }
      });

      const dateObj = new Date(formattedDate);
      const dayOfWeek = dateObj.getDay(); 

      const assignedSlots = await prisma.weeklyTimetableSlot.findMany({
        where: { schoolId, teacherId, dayOfWeek }
      });

      if (assignedSlots.length > 0) {
        const replacementPromises = assignedSlots.map((slot) => {
          return prisma.replacementAssignment.create({
            data: {
              schoolId,
              date: formattedDate,
              periodId: slot.periodId,
              classId: slot.classId,
              originalTeacherId: teacherId,
              replacementTeacherId: teacherId, 
              reason: 'CASUAL_LEAVE',           
              status: 'PENDING'                 
            }
          });
        });

        await Promise.all(replacementPromises);
      }
    }

    return NextResponse.json({ success: true, message: `Status updated to ${status}` });
  } catch (error: any) {
    console.error('[ATTENDANCE_MUTATION_CRASH]', error);
    return NextResponse.json({ 
      error: 'Database pipeline failure.',
      details: error?.message || String(error)
    }, { status: 500 });
  }
}