'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/enterprise/glass-card';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  CalendarX 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.4;
const ZOOM_STEP = 0.1;

interface DailyDeskPublicViewProps {
  data: {
    date: string;
    classes: any[];
    periods: any[];
    grid: any[];
    attendance: any[];
    replacements: any[];
    busyTeachersByPeriod: Record<string, string[]>;
  };
}

export default function DailyDeskPublicView({ data }: DailyDeskPublicViewProps) {
  const [zoomLevel, setZoomLevel] = React.useState(1);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(ZOOM_MAX, Math.round((prev + ZOOM_STEP) * 100) / 100));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(ZOOM_MIN, Math.round((prev - ZOOM_STEP) * 100) / 100));
  const handleZoomReset = () => setZoomLevel(1);

  const handlePrintPDF = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const getSubjectClass = (subjectName: string): string => {
    if (!subjectName) return '';
    const name = subjectName.toLowerCase();
    if (name.includes('biology') || name.includes('bio')) return 'sub-biology';
    if (name.includes('chemistry') || name.includes('chem')) return 'sub-chemistry';
    if (name.includes('geography') || name.includes('geo')) return 'sub-geography';
    if (name.includes('economics') || name.includes('eco')) return 'sub-economics';
    if (name.includes('physical education') || name.includes('p.e') || name.includes('pe')) return 'sub-physical-education';
    if (name.includes('math') || name.includes('mathematics')) return 'sub-mathematics';
    if (name.includes('history')) return 'sub-history';
    if (name.includes('computer') || name.includes('cs') || name.includes('it')) return 'sub-computer-science';
    if (name.includes('physics') || name.includes('phy')) return 'sub-physics';
    return '';
  };

  const totalRealSlotsScheduled = data.grid?.reduce((total, row) => {
    if (!row || !row.cells) return total;
    const filledCellsInRow = row.cells.filter((cell: any) => cell && (cell.empty === false || !!cell.subjectName || !!cell.teacherId)).length;
    return total + filledCellsInRow;
  }, 0) || 0;

  const isTimetableEmpty =
    !data.classes || data.classes.length === 0 ||
    !data.periods || data.periods.length === 0 ||
    (!data.grid || data.grid.length === 0 && totalRealSlotsScheduled === 0);

  return (
    <GlassCard className='p-5 print:bg-transparent print:border-none print:p-0 print:shadow-none'>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 print:mb-8">
        <div>
          <h2 className='text-base font-bold uppercase tracking-wide text-foreground print:text-xl print:text-black'>
            Daily Operations Layout Matrix
          </h2>
          <p className='text-xs text-muted-foreground mt-0.5 print:text-sm print:text-gray-600'>
            Live scheduling run verified for calendar timeline: <strong>{data.date}</strong>.
          </p>
        </div>

        {/* CONTROLS BAR */}
        <div className="flex items-center gap-2 self-start sm:self-center print:hidden">
          <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleZoomOut}
              disabled={zoomLevel <= ZOOM_MIN || isTimetableEmpty}
              className="h-7 w-7 p-0 rounded-lg hover:bg-background"
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <button
              onClick={handleZoomReset}
              className="text-[11px] font-bold text-muted-foreground px-1.5 min-w-[42px] text-center hover:text-foreground transition-colors"
              title="Reset zoom"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleZoomIn}
              disabled={zoomLevel >= ZOOM_MAX || isTimetableEmpty}
              className="h-7 w-7 p-0 rounded-lg hover:bg-background"
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={handlePrintPDF}
            disabled={isTimetableEmpty}
            className="rounded-xl text-xs font-semibold h-9 border-border/80 hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* GRID DATA RENDER ENGINE */}
      {isTimetableEmpty ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 border border-dashed border-border/60 bg-muted/10 rounded-2xl">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-full mb-3 dark:bg-rose-500/20">
            <CalendarX className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">No timetable is active now</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            There are no scheduled periods or designated classes configured for this operational date block.
          </p>
        </div>
      ) : (
        <div
          id="timetable-capture"
          className='timetable-matrix-scroll w-full overflow-x-auto rounded-xl border border-border/60 bg-background p-4 scrollbar-thin scrollbar-thumb-accent print:overflow-visible print:border-none print:bg-transparent'
        >
          <div
            className='timetable-inner-container print:min-w-full origin-top-left transition-transform duration-150 ease-out'
            style={{ transform: `scale(${zoomLevel})`, width: zoomLevel !== 1 ? `${100 / zoomLevel}%` : undefined }}
          >
            <table className='w-full border-collapse text-left min-w-[800px] print:min-w-full print:table-layout-fixed'>
              <thead>
                <tr className='bg-muted/80 backdrop-blur border-b border-border/40 print:bg-gray-100 print:border-b-2 print:border-gray-300'>
                  <th className='p-4 text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 w-[140px] sticky left-0 bg-muted z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-border/40 print:static print:bg-gray-100 print:text-black print:shadow-none'>
                    Timetable
                  </th>
                  {data.periods.map((p) => (
                    <th key={p.id} className='p-3 border-l border-border/40 text-center min-w-[180px] w-[200px] print:border-gray-300 print:p-2'>
                      <div className='text-xs font-bold text-foreground uppercase tracking-wider print:text-black print:text-[11px]'>
                        {p.isBreak ? (p.label || 'BREAK') : `P${p.periodNumber}`}
                      </div>
                      <div className='text-[10px] text-muted-foreground font-medium mt-0.5 print:text-gray-600 print:text-[9px]'>
                        {p.startTime}–{p.endTime}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className='divide-y divide-border/40 bg-background/40 print:bg-transparent print:divide-gray-300'>
                {data.classes.map((cls) => (
                  <tr key={cls.id} className='hover:bg-muted/10 transition-colors print:hover:bg-transparent print:break-inside-avoid'>
                    <td className='p-4 font-bold text-sm text-foreground bg-background/90 sticky left-0 z-10 border-r border-border/40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] print:static print:bg-transparent print:text-black print:shadow-none print:p-2 print:border-r print:border-gray-300'>
                      {cls.name}
                    </td>

                    {data.periods.map((period) => {
                      const periodRow = data.grid.find((row: any) => row.periodId === period.id);
                      const cell = periodRow?.cells.find((c: any) => c.classId === cls.id);

                      if (!cell || cell.empty) {
                        return (
                          <td key={`${cls.id}-${period.id}`} className='p-3 border-l border-border/40 text-center text-muted-foreground/20 bg-background/5 min-h-[115px] print:border-gray-300 print:p-1'>
                            <span className="text-xs font-semibold tracking-widest print:text-gray-300">—</span>
                          </td>
                        );
                      }

                      const hasServerReplacement = !!cell.replacement;
                      const isCovered = hasServerReplacement && (cell.replacement?.status === 'CONFIRMED' || cell.replacement?.status === 'confirmed');
                      const isCoverMissing = cell.isReplacementAbsent === true;
                      const subjectColorClass = getSubjectClass(cell.subjectName);

                      return (
                        <td
                          key={`${cls.id}-${period.id}`}
                          className={cn(
                            'p-2 border-l border-border/40 h-full min-h-[115px] align-top transition-colors print:border-gray-300 print:p-1',
                            cell.isAbsent
                              ? (isCovered && !isCoverMissing ? 'bg-emerald-50 dark:bg-emerald-950/30 print:bg-green-50' : 'bg-rose-50 dark:bg-rose-950/30 print:bg-red-50')
                              : 'bg-background/10'
                          )}
                        >
                          <Card
                            className={cn(
                              'p-3 rounded-lg h-full text-xs flex flex-col justify-between shadow-none transition-all border print:p-1.5 print:border-gray-300 print:bg-white',
                              cell.isAbsent
                                ? (isCovered && !isCoverMissing)
                                  ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20'
                                  : 'border-rose-500/40 bg-rose-500/5 ring-1 ring-rose-500/10'
                                : cn('border-border/60 bg-background hover:border-indigo-500/40', subjectColorClass)
                            )}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <p className='font-bold text-foreground truncate flex-1 print:text-black print:text-[11px]'>{cell.subjectName}</p>
                              </div>
                              <p className={cn(
                                'font-medium truncate mb-2 print:text-[10px] print:mb-1',
                                cell.isAbsent ? 'text-muted-foreground/60 line-through print:text-gray-400' : 'text-muted-foreground print:text-gray-700'
                              )}>
                                {cell.teacherName}
                              </p>
                            </div>

                            <div className='flex flex-col gap-1 mt-auto print:mt-0'>
                              {cell.isAbsent ? (
                                <>
                                  {isCovered && !isCoverMissing && (
                                    <div className="space-y-1.5 print:space-y-0.5">
                                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm print:bg-transparent print:border-none print:p-0 print:text-green-700">
                                        <CheckCircle2 className='h-3 w-3 shrink-0 text-emerald-500 print:hidden' />
                                        <span className="text-[10px] font-bold uppercase tracking-wider print:text-[8px]">Cover Active</span>
                                      </div>
                                      <p className="text-[11px] font-medium text-foreground bg-muted/60 px-1.5 py-1 rounded border border-border/40 truncate print:text-[9px] print:bg-gray-50 print:p-0.5">
                                        <span className="text-muted-foreground font-normal print:text-gray-600">Sub:</span> {cell.replacement?.replacementTeacherName}
                                      </p>
                                    </div>
                                  )}

                                  {isCovered && isCoverMissing && (
                                    <div className="space-y-1.5 print:space-y-0.5">
                                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                        <AlertTriangle className='h-3 w-3 shrink-0' />
                                        <span className="text-[10px] font-bold uppercase">Sub Absent!</span>
                                      </div>
                                      <p className="text-[11px] font-medium text-muted-foreground bg-rose-500/5 px-1.5 py-1 rounded border border-rose-500/20 line-through truncate">
                                        Sub: {cell.replacement?.replacementTeacherName}
                                      </p>
                                    </div>
                                  )}

                                  {!isCovered && (
                                    <div className="space-y-1.5 print:space-y-0.5">
                                      <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mb-1 print:bg-transparent print:border-none print:p-0 print:text-red-700 print:mb-0">
                                        <AlertTriangle className='h-3 w-3 shrink-0 text-rose-500 print:hidden' />
                                        <span className="text-[9px] font-bold uppercase tracking-wide print:text-[8px]">ABSENT</span>
                                      </div>
                                    </div>
                                  )}
                                </>
                              ) : null}
                            </div>
                          </Card>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
