'use client';

import React, { useState, useMemo } from 'react';
import { TimetableGrid } from '@/components/timetable-builder/timetable-grid';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublicTimetableViewProps {
  timetable: any;
  classes: any[];
  periods: any[];
  slots: any[];
  workingDays: number[];
  baseStartTime: string;
  periodDuration: number;
}

export default function PublicTimetableView({
  timetable,
  classes,
  periods,
  slots,
  workingDays,
  baseStartTime,
  periodDuration,
}: PublicTimetableViewProps) {
  const [selectedClassId, setSelectedClassId] = useState('');

  // Auto-select first class on mount
  React.useEffect(() => {
    if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Filter slots by selected class
  const filteredSlots = useMemo(() => {
    if (!selectedClassId) return slots;
    return slots.filter((slot) => slot.classId === selectedClassId);
  }, [slots, selectedClassId]);

  const handlePrintPDF = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <GlassCard className='p-5'>
      <div className='space-y-5'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <h2 className='text-lg font-bold'>{timetable.name}</h2>
            <p className='text-sm text-muted-foreground'>Anyone with this link can view the timetable.</p>
          </div>

          {/* CONTROLS BAR */}
          <div className="flex items-center gap-2 self-start sm:self-center print:hidden">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrintPDF}
              className="rounded-xl text-xs font-semibold h-9 border-border/80 hover:bg-muted shadow-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Dynamic Class Selection List */}
        {classes.length > 0 && (
          <div className="w-full overflow-x-auto pb-2 scrollbar-thin snap-x touch-pan-x">
            <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2 min-w-max">
              {classes.map((cls) => {
                const isActive = selectedClassId === cls.id;
                return (
                  <button
                    key={cls.id}
                    type='button'
                    onClick={() => setSelectedClassId(cls.id)}
                    className={cn(
                      "px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl border transition-all shrink-0 uppercase tracking-wider text-center snap-center min-w-[85px] sm:min-w-[95px] min-h-[34px] sm:min-h-[40px] flex items-center justify-center gap-1 whitespace-nowrap",
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 font-extrabold scale-102"
                        : "bg-muted/40 border-muted text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {cls.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Timetable Engine Grid */}
        <div className="w-full overflow-x-auto rounded-2xl border border-border/60 bg-background p-2 sm:p-4 shadow-xs">
          <TimetableGrid
            periods={periods}
            slots={filteredSlots}
            workingDays={workingDays}
            baseStartTime={baseStartTime}
            periodDuration={periodDuration}
          />
        </div>

        {selectedClass && (
          <p className='text-xs text-muted-foreground text-center'>
            Showing timetable for <span className='font-semibold text-foreground'>{selectedClass.name}</span>
          </p>
        )}
      </div>
    </GlassCard>
  );
}
