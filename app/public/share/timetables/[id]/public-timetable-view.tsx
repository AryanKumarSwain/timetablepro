'use client';

import React, { useState, useMemo } from 'react';
import { TimetableGrid } from '@/components/timetable-builder/timetable-grid';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const ZOOM_MIN = 0.6;
const ZOOM_MAX = 1.4;
const ZOOM_STEP = 0.1;

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
  const [zoomLevel, setZoomLevel] = useState(1);

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

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(ZOOM_MAX, Math.round((prev + ZOOM_STEP) * 100) / 100));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(ZOOM_MIN, Math.round((prev - ZOOM_STEP) * 100) / 100));
  const handleZoomReset = () => setZoomLevel(1);

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
            <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-muted/40 p-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleZoomOut}
                disabled={zoomLevel <= ZOOM_MIN}
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
                disabled={zoomLevel >= ZOOM_MAX}
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
              className="rounded-xl text-xs font-semibold h-9 border-border/80 hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* CLASS SELECTOR */}
        <div className='space-y-2'>
          <label className='block text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
            Select Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className='w-full sm:w-72 px-4 py-2.5 bg-muted/30 border border-border/60 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>

        {/* TIMETABLE GRID */}
        <div
          className='timetable-matrix-scroll w-full overflow-x-auto rounded-xl border border-border/60 bg-background p-4 scrollbar-thin scrollbar-thumb-accent print:overflow-visible print:border-none print:bg-transparent'
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', width: zoomLevel !== 1 ? `${100 / zoomLevel}%` : undefined }}
        >
          <TimetableGrid
            periods={periods}
            slots={filteredSlots}
            workingDays={workingDays}
            baseStartTime={baseStartTime}
            periodDuration={periodDuration}
            renderCell={(dayOfWeek, periodId, slot) => {
              if (!slot) {
                return null;
              }
              return (
                <div className='h-full w-full p-2 rounded-xl border border-dashed border-indigo-500/20 bg-indigo-500/[0.02] flex flex-col justify-center gap-1'>
                  <span className='text-sm font-semibold text-foreground truncate'>{slot.subjectName || 'Untitled'}</span>
                  <span className='text-xs text-muted-foreground truncate'>{slot.teacherName || 'Staff'}</span>
                </div>
              );
            }}
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
