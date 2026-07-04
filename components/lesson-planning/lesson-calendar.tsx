'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, eachDayOfInterval, isSameMonth } from 'date-fns';

interface LessonCalendarProps {
  view: 'day' | 'week' | 'month' | 'year';
  onDateSelect: (date: string) => void;
  selectedDate: string;
  lessonDates?: string[];
}

export function LessonCalendar({ view, onDateSelect, selectedDate, lessonDates = [] }: LessonCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const generateCalendarDays = () => {
    let start: Date;
    let end: Date;

    switch (view) {
      case 'day':
        start = currentDate;
        end = currentDate;
        break;
      case 'week':
        start = startOfWeek(currentDate);
        end = endOfWeek(currentDate);
        break;
      case 'month':
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        const weekStart = startOfWeek(start);
        const weekEnd = endOfWeek(end);
        start = weekStart;
        end = weekEnd;
        break;
      case 'year':
        start = new Date(currentDate.getFullYear(), 0, 1);
        end = new Date(currentDate.getFullYear(), 11, 31);
        break;
      default:
        start = currentDate;
        end = currentDate;
    }

    return eachDayOfInterval({ start, end });
  };

  const days = generateCalendarDays();

  const handlePrevious = () => {
    if (view === 'year') {
      setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1));
    } else if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (view === 'week') {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addDays(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (view === 'year') {
      setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1));
    } else if (view === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (view === 'week') {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const hasLesson = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return lessonDates.includes(dateStr);
  };

  const isSelected = (date: Date) => {
    return selectedDate === format(date, 'yyyy-MM-dd');
  };

  if (view === 'day') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold">{format(currentDate, 'MMMM d, yyyy')}</span>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={() => onDateSelect(format(currentDate, 'yyyy-MM-dd'))}
          className="w-full"
          variant={isSelected(currentDate) ? 'default' : 'outline'}
        >
          {format(currentDate, 'EEEE, MMMM d')}
        </Button>
      </div>
    );
  }

  if (view === 'week') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">
            {format(days[0], 'MMM d')} - {format(days[days.length - 1], 'MMM d, yyyy')}
          </span>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(format(day, 'yyyy-MM-dd'))}
              className={cn(
                'p-2 text-xs rounded-lg border transition-all',
                isSelected(day) ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-200',
                hasLesson(day) && !isSelected(day) ? 'border-orange-400 bg-orange-50' : '',
                !isSameMonth(day, currentDate) ? 'text-gray-400' : ''
              )}
            >
              <div>{format(day, 'd')}</div>
              {hasLesson(day) && <div className="text-xs text-orange-600">●</div>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'month') {
    const monthDays = days.slice(0, 42); // Calendar grid is usually 6x7

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold">{format(currentDate, 'MMMM yyyy')}</span>
          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center font-semibold text-gray-600">
              {day}
            </div>
          ))}
          {monthDays.map((day) => (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect(format(day, 'yyyy-MM-dd'))}
              className={cn(
                'p-2 rounded-lg border transition-all text-xs',
                isSelected(day) ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-200',
                hasLesson(day) && !isSelected(day) ? 'border-orange-400 bg-orange-50' : '',
                !isSameMonth(day, currentDate) ? 'text-gray-400 bg-gray-50' : ''
              )}
            >
              <div>{format(day, 'd')}</div>
              {hasLesson(day) && <div className="text-orange-600">●</div>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
