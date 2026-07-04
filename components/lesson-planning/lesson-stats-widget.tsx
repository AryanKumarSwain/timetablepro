'use client';

import { BookOpen, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface StatWidgetProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'red';
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  red: 'bg-red-50 text-red-700 border-red-200',
};

function StatWidget({ title, value, icon, color }: StatWidgetProps) {
  return (
    <Card className={`p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

interface LessonStatsWidgetProps {
  todaysLessons: number;
  thisWeeksLessons: number;
  completedLessons: number;
  pendingLessons: number;
}

export function LessonStatsWidget({
  todaysLessons,
  thisWeeksLessons,
  completedLessons,
  pendingLessons,
}: LessonStatsWidgetProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatWidget
        title="Today's Lessons"
        value={todaysLessons}
        icon={<BookOpen className="h-6 w-6" />}
        color="blue"
      />
      <StatWidget
        title="This Week's Planned"
        value={thisWeeksLessons}
        icon={<Clock className="h-6 w-6" />}
        color="orange"
      />
      <StatWidget
        title="Completed"
        value={completedLessons}
        icon={<CheckCircle className="h-6 w-6" />}
        color="green"
      />
      <StatWidget
        title="Pending"
        value={pendingLessons}
        icon={<AlertCircle className="h-6 w-6" />}
        color="red"
      />
    </div>
  );
}
