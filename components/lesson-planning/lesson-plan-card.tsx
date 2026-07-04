'use client';

import { BookOpen, Clock, MapPin, FileText, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface LessonPlanCardProps {
  id: string;
  lessonTitle: string;
  className: string;
  subjectName: string;
  periodTime: string;
  date: string;
  status: string;
  topic?: string;
  estimatedDuration?: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (id: string) => void;
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PLANNED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  SKIPPED: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export function LessonPlanCard({
  id,
  lessonTitle,
  className,
  subjectName,
  periodTime,
  date,
  status,
  topic,
  estimatedDuration,
  onEdit,
  onDelete,
  onClick,
}: LessonPlanCardProps) {
  return (
    <div
      onClick={() => onClick?.(id)}
      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer bg-white"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">{lessonTitle}</h3>
          {topic && <p className="text-xs text-gray-600">{topic}</p>}
        </div>
        <Badge className={cn('text-xs', statusColors[status as keyof typeof statusColors])}>
          {status}
        </Badge>
      </div>

      <div className="space-y-2 text-xs text-gray-600 mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3" />
          <span>{className} • {subjectName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          <span>{periodTime}</span>
        </div>
        {estimatedDuration && (
          <div className="flex items-center gap-2">
            <FileText className="h-3 w-3" />
            <span>{estimatedDuration} minutes</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {onEdit && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(id);
            }}
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
