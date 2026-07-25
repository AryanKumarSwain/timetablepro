import type { DailyReport, ReportEntry, Teacher, ClassRoom, Subject } from '@prisma/client';

export type ReportWithRelations = DailyReport & {
  teacher: Teacher;
  entries: (ReportEntry & { class: ClassRoom; subject: Subject })[];
};

export function formatReportDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseReportDateParam(value: string | null): Date {
  if (!value || value === 'today') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const parsed = new Date(`${value}T00:00:00`);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function mapReportResponse(report: ReportWithRelations) {
  return {
    id: report.id,
    teacherId: report.teacherId,
    teacherName: report.teacher.name,
    teacherEmail: report.teacher.email,
    reportDate: formatReportDate(report.reportDate),
    status: report.status,
    submittedAt: report.submittedAt?.toISOString() ?? null,
    entries: report.entries.map((e) => ({
      id: e.id,
      classId: e.classId,
      className: e.class.name,
      subjectId: e.subjectId,
      subjectName: e.subject.name,
      description: e.description,
      isCompleted: e.isCompleted,
      entryType: e.entryType,
      activityCategory: e.activityCategory,
      activityDescription: e.activityDescription,
      learningOutcome: e.learningOutcome,
      evidenceFiles: e.evidenceFiles,
    })),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}

export function reportToCsv(report: ReportWithRelations): string {
  const header = 'Class,Subject,Description,Completed';
  const rows = report.entries.map((e) => {
    const desc = `"${e.description.replace(/"/g, '""')}"`;
    return `${e.class.name},${e.subject.name},${desc},${e.isCompleted ? 'Yes' : 'No'}`;
  });
  return [header, ...rows].join('\n');
}
