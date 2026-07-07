'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface LessonDetailViewProps {
  lesson: any;
  onClose: () => void;
  onCommentAdded?: () => void;
}

const CUSTOM_FIELD_PREFIX = '__CUSTOM_FIELD__';

function parseCustomFields(value?: string) {
  if (!value) return { baseActivities: '', customFields: [] as Array<{ id: string; name: string; type: string; value: string }> };

  const lines = value.split('\n');
  const baseLines: string[] = [];
  const customFields: Array<{ id: string; name: string; type: string; value: string }> = [];

  lines.forEach((line) => {
    if (!line.startsWith(CUSTOM_FIELD_PREFIX)) {
      baseLines.push(line);
      return;
    }

    const payload = line.replace(CUSTOM_FIELD_PREFIX, '').trim();
    if (!payload) return;

    const [rawName, rawType, rawValue] = payload.split('|');
    const name = decodeURIComponent(rawName || '').trim();
    const type = (rawType || 'text').trim();
    const fieldValue = decodeURIComponent(rawValue || '').trim();

    if (name) {
      customFields.push({
        id: `${name}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        type,
        value: fieldValue,
      });
    }
  });

  return {
    baseActivities: baseLines.join('\n').trim(),
    customFields,
  };
}

export function LessonDetailView({ lesson, onClose, onCommentAdded }: LessonDetailViewProps) {
  const [comment, setComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const { baseActivities, customFields } = parseCustomFields(lesson.activities);

  const handleAddComment = async () => {
    if (!comment.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      setIsSubmittingComment(true);
      const res = await fetch(`/api/admin/lesson-plans/${lesson.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment }),
      });

      if (!res.ok) throw new Error('Failed to add comment');

      toast.success('Comment added');
      setComment('');
      onCommentAdded?.();
    } catch (error) {
      toast.error('Failed to add comment');
      console.error(error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-800',
    PLANNED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    SKIPPED: 'bg-yellow-100 text-yellow-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-2xl font-bold">{lesson.lessonTitle}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {lesson.class.name} • {lesson.subject.name}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Meta Information */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Teacher</p>
              <p className="font-semibold">{lesson.teacher.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-semibold">{lesson.planDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Time</p>
              <p className="font-semibold">
                {lesson.period.startTime} - {lesson.period.endTime}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Duration</p>
              <p className="font-semibold">{lesson.estimatedDuration || 'N/A'} minutes</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <Badge className={statusColors[lesson.status as keyof typeof statusColors]}>
                {lesson.status}
              </Badge>
            </div>
          </div>

          {/* Basic Information */}
          {(lesson.topic || lesson.chapter || lesson.subtopic) && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-3">Topic Information</h3>
              <div className="space-y-2 text-sm">
                {lesson.topic && <p><span className="font-medium">Topic:</span> {lesson.topic}</p>}
                {lesson.chapter && <p><span className="font-medium">Chapter:</span> {lesson.chapter}</p>}
                {lesson.subtopic && <p><span className="font-medium">Subtopic:</span> {lesson.subtopic}</p>}
              </div>
            </div>
          )}

          {/* Learning Details */}
          {(lesson.learningObjectives || lesson.learningOutcomes) && (
            <div className="space-y-3">
              {lesson.learningObjectives && (
                <div>
                  <h3 className="font-semibold mb-2">Learning Objectives</h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{lesson.learningObjectives}</p>
                </div>
              )}
              {lesson.learningOutcomes && (
                <div>
                  <h3 className="font-semibold mb-2">Learning Outcomes</h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{lesson.learningOutcomes}</p>
                </div>
              )}
            </div>
          )}

          {/* Teaching Details */}
          {(lesson.teachingMethod || lesson.teachingAids) && (
            <div className="space-y-3">
              {lesson.teachingMethod && (
                <div>
                  <h3 className="font-semibold mb-2">Teaching Method</h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{lesson.teachingMethod}</p>
                </div>
              )}
              {lesson.teachingAids && (
                <div>
                  <h3 className="font-semibold mb-2">Teaching Aids & Resources</h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{lesson.teachingAids}</p>
                </div>
              )}
            </div>
          )}

          {/* Activities & Assessment */}
          {(baseActivities || lesson.homework || lesson.assessmentMethod) && (
            <div className="space-y-3">
              {baseActivities && (
                <div>
                  <h3 className="font-semibold mb-2">Activities</h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{baseActivities}</p>
                </div>
              )}
              {lesson.homework && (
                <div>
                  <h3 className="font-semibold mb-2">Homework</h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{lesson.homework}</p>
                </div>
              )}
              {lesson.assessmentMethod && (
                <div>
                  <h3 className="font-semibold mb-2">Assessment Method</h3>
                  <p className="whitespace-pre-wrap text-sm text-gray-700">{lesson.assessmentMethod}</p>
                </div>
              )}
            </div>
          )}

          {customFields.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold mb-2">Custom Fields</h3>
              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                {customFields.map((field) => (
                  <div key={field.id}>
                    <p className="text-sm font-semibold text-gray-800">{field.name}</p>
                    <p className="whitespace-pre-wrap text-sm text-gray-700 mt-1">
                      {field.value || '—'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {lesson.notes && (
            <div>
              <h3 className="font-semibold mb-2">Additional Notes</h3>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{lesson.notes}</p>
            </div>
          )}

          {/* Comments Section */}
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Comments</h3>
            <div className="space-y-4 mb-6 max-h-40 overflow-y-auto">
              {lesson.comments && lesson.comments.length > 0 ? (
                lesson.comments.map((c: any) => (
                  <div key={c.id} className="bg-gray-50 p-3 rounded">
                    <p className="text-sm font-medium">{c.user.name || c.user.email}</p>
                    <p className="text-sm text-gray-600 mt-1">{c.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(c.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No comments yet</p>
              )}
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleAddComment}
                disabled={isSubmittingComment}
                className="w-full"
              >
                {isSubmittingComment ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
