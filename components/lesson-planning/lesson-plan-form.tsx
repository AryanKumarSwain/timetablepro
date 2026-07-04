'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export interface LessonPlanFormData {
  slotId: string;
  planDate: string;
  lessonTitle: string;
  topic?: string;
  chapter?: string;
  subtopic?: string;
  learningObjectives?: string;
  teachingMethod?: string;
  teachingAids?: string;
  activities?: string;
  homework?: string;
  assessmentMethod?: string;
  learningOutcomes?: string;
  notes?: string;
  estimatedDuration?: number;
  status: 'DRAFT' | 'PLANNED' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
}

interface LessonPlanFormProps {
  onSubmit: (data: LessonPlanFormData) => Promise<void>;
  initialData?: Partial<LessonPlanFormData>;
  slotInfo?: {
    className: string;
    subjectName: string;
    periodTime: string;
  };
  isLoading?: boolean;
}

export function LessonPlanForm({
  onSubmit,
  initialData,
  slotInfo,
  isLoading = false,
}: LessonPlanFormProps) {
  const { register, handleSubmit, setValue, watch } = useForm<LessonPlanFormData>({
    defaultValues: initialData || {
      status: 'DRAFT',
      estimatedDuration: 45,
    },
  });

  const status = watch('status');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onFormSubmit = async (data: LessonPlanFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      toast.success('Lesson plan saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save lesson plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Slot Information Display */}
      {slotInfo && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900">Class Information</h3>
          <div className="mt-2 grid grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <span className="font-medium">Class:</span> {slotInfo.className}
            </div>
            <div>
              <span className="font-medium">Subject:</span> {slotInfo.subjectName}
            </div>
            <div>
              <span className="font-medium">Time:</span> {slotInfo.periodTime}
            </div>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-semibold">Lesson Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="lessonTitle">Lesson Title *</Label>
            <Input
              id="lessonTitle"
              {...register('lessonTitle', { required: true })}
              placeholder="e.g., Introduction to Quadratic Equations"
            />
          </div>
          <div>
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              {...register('topic')}
              placeholder="e.g., Algebra"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="chapter">Chapter</Label>
            <Input
              id="chapter"
              {...register('chapter')}
              placeholder="e.g., Chapter 4"
            />
          </div>
          <div>
            <Label htmlFor="subtopic">Subtopic</Label>
            <Input
              id="subtopic"
              {...register('subtopic')}
              placeholder="e.g., Solving by Factorization"
            />
          </div>
        </div>
      </div>

      {/* Learning Details */}
      <div className="space-y-4">
        <h3 className="font-semibold">Learning Details</h3>

        <div>
          <Label htmlFor="learningObjectives">Learning Objectives</Label>
          <Textarea
            id="learningObjectives"
            {...register('learningObjectives')}
            placeholder="What do students need to learn?
- Objective 1
- Objective 2"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="teachingMethod">Teaching Method</Label>
          <Textarea
            id="teachingMethod"
            {...register('teachingMethod')}
            placeholder="e.g., Interactive lecture, Group discussion, Hands-on practice"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="teachingAids">Teaching Aids / Resources</Label>
          <Textarea
            id="teachingAids"
            {...register('teachingAids')}
            placeholder="e.g., PowerPoint slides, Worksheets, Calculator, Video"
            rows={2}
          />
        </div>
      </div>

      {/* Activities & Assessment */}
      <div className="space-y-4">
        <h3 className="font-semibold">Activities & Assessment</h3>

        <div>
          <Label htmlFor="activities">Activities</Label>
          <Textarea
            id="activities"
            {...register('activities')}
            placeholder="Describe classroom activities:
- Activity 1
- Activity 2"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="homework">Homework</Label>
          <Textarea
            id="homework"
            {...register('homework')}
            placeholder="e.g., Problems 1-10 from Exercise 4.2, Complete the worksheet"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="assessmentMethod">Assessment Method</Label>
          <Textarea
            id="assessmentMethod"
            {...register('assessmentMethod')}
            placeholder="e.g., Quiz, Group presentation, Individual worksheet"
            rows={2}
          />
        </div>
      </div>

      {/* Learning Outcomes & Notes */}
      <div className="space-y-4">
        <h3 className="font-semibold">Outcomes & Notes</h3>

        <div>
          <Label htmlFor="learningOutcomes">Learning Outcomes</Label>
          <Textarea
            id="learningOutcomes"
            {...register('learningOutcomes')}
            placeholder="What students should be able to do after this lesson:
- Outcome 1
- Outcome 2"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="notes">Additional Notes</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="Any additional notes or observations"
            rows={2}
          />
        </div>
      </div>

      {/* Duration & Status */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="estimatedDuration">Estimated Duration (minutes)</Label>
          <Input
            id="estimatedDuration"
            type="number"
            {...register('estimatedDuration', { valueAsNumber: true })}
            placeholder="45"
          />
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(value) => setValue('status', value as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PLANNED">Planned</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="SKIPPED">Skipped</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="flex-1"
        >
          {isSubmitting || isLoading ? 'Saving...' : 'Save Lesson Plan'}
        </Button>
        <Button type="button" variant="outline" className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}
