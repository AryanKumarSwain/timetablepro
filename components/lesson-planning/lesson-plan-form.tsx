'use client';

import { useEffect, useState } from 'react';
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

interface CustomField {
  id: string;
  fieldName: string;
  fieldType: 'text' | 'number' | 'textarea' | 'date';
  value: string;
}

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
  status: 'DRAFT' | 'PLANNED';
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

const CUSTOM_FIELD_PREFIX = '__CUSTOM_FIELD__';

const parseCustomFields = (activities?: string): { baseActivities: string; customFields: CustomField[] } => {
  if (!activities) return { baseActivities: '', customFields: [] };

  const lines = activities.split('\n');
  const customFields: CustomField[] = [];
  const baseLines: string[] = [];

  lines.forEach((line) => {
    if (!line.startsWith(CUSTOM_FIELD_PREFIX)) {
      baseLines.push(line);
      return;
    }

    const payload = line.replace(CUSTOM_FIELD_PREFIX, '').trim();
    if (!payload) return;

    const [rawName, rawType, rawValue] = payload.split('|');
    const fieldName = decodeURIComponent(rawName || '').trim();
    const fieldType = (rawType || 'text') as CustomField['fieldType'];
    const value = decodeURIComponent(rawValue || '').trim();

    if (fieldName) {
      customFields.push({
        id: `${fieldName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fieldName,
        fieldType,
        value,
      });
    }
  });

  return {
    baseActivities: baseLines.join('\n').trim(),
    customFields,
  };
};

const serializeCustomFields = (customFields: CustomField[]) =>
  customFields
    .filter((field) => field.fieldName.trim())
    .map((field) => {
      const encodedName = encodeURIComponent(field.fieldName.trim());
      const encodedValue = encodeURIComponent(field.value.trim());
      return `${CUSTOM_FIELD_PREFIX}${encodedName}|${field.fieldType}|${encodedValue}`;
    })
    .join('\n');

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
  const [customFields, setCustomFields] = useState<CustomField[]>(() => {
    const parsed = parseCustomFields(initialData?.activities);
    return parsed.customFields;
  });
  const [newCustomFieldName, setNewCustomFieldName] = useState('');
  const [newCustomFieldType, setNewCustomFieldType] = useState<CustomField['fieldType']>('text');

  useEffect(() => {
    const parsed = parseCustomFields(initialData?.activities);
    setCustomFields(parsed.customFields);
    setValue('activities', parsed.baseActivities);
  }, [initialData?.activities, setValue]);

  const onFormSubmit = async (data: LessonPlanFormData) => {
    try {
      setIsSubmitting(true);
      const serializedCustomFields = serializeCustomFields(customFields);
      const mergedActivities = [data.activities?.trim(), serializedCustomFields]
        .filter(Boolean)
        .join('\n\n');

      await onSubmit({
        ...data,
        activities: mergedActivities || undefined,
      });
      toast.success('Lesson plan saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save lesson plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addCustomField = () => {
    const trimmedName = newCustomFieldName.trim();
    if (!trimmedName) {
      toast.error('Please enter a custom field name');
      return;
    }

    setCustomFields((current) => [
      ...current,
      {
        id: `${trimmedName}-${Date.now()}`,
        fieldName: trimmedName,
        fieldType: newCustomFieldType,
        value: '',
      },
    ]);
    setNewCustomFieldName('');
    setNewCustomFieldType('text');
  };

  const updateCustomField = (id: string, value: string) => {
    setCustomFields((current) => current.map((field) => (field.id === id ? { ...field, value } : field)));
  };

  const removeCustomField = (id: string) => {
    setCustomFields((current) => current.filter((field) => field.id !== id));
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
            <Label htmlFor="topic">Topic *</Label>
            <Input
              id="topic"
              {...register('topic', { required: true })}
              placeholder="e.g., Algebra"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="chapter">Chapter *</Label>
            <Input
              id="chapter"
              {...register('chapter', { required: true })}
              placeholder="e.g., Chapter 4"
            />
          </div>
          <div>
            <Label htmlFor="subtopic">Subtopic *</Label>
            <Input
              id="subtopic"
              {...register('subtopic', { required: true })}
              placeholder="e.g., Solving by Factorization"
            />
          </div>
        </div>
      </div>

      {/* Learning Details */}
      <div className="space-y-4">
        <h3 className="font-semibold">Learning Details</h3>

        <div>
          <Label htmlFor="learningObjectives">Learning Objectives *</Label>
          <Textarea
            id="learningObjectives"
            {...register('learningObjectives', { required: true })}
            placeholder="What do students need to learn?
- Objective 1
- Objective 2"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="teachingMethod">Teaching Method *</Label>
          <Textarea
            id="teachingMethod"
            {...register('teachingMethod', { required: true })}
            placeholder="e.g., Interactive lecture, Group discussion, Hands-on practice"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="teachingAids">Teaching Aids / Resources *</Label>
          <Textarea
            id="teachingAids"
            {...register('teachingAids', { required: true })}
            placeholder="e.g., PowerPoint slides, Worksheets, Calculator, Video"
            rows={2}
          />
        </div>
      </div>

      {/* Activities & Assessment */}
      <div className="space-y-4">
        <h3 className="font-semibold">Activities & Assessment</h3>

        <div>
          <Label htmlFor="activities">Activities *</Label>
          <Textarea
            id="activities"
            {...register('activities', { required: true })}
            placeholder="Describe classroom activities:
- Activity 1
- Activity 2"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="homework">Homework *</Label>
          <Textarea
            id="homework"
            {...register('homework', { required: true })}
            placeholder="e.g., Problems 1-10 from Exercise 4.2, Complete the worksheet"
            rows={2}
          />
        </div>

        <div>
          <Label htmlFor="assessmentMethod">Assessment Method *</Label>
          <Textarea
            id="assessmentMethod"
            {...register('assessmentMethod', { required: true })}
            placeholder="e.g., Quiz, Group presentation, Individual worksheet"
            rows={2}
          />
        </div>
      </div>

      {/* Learning Outcomes & Notes */}
      <div className="space-y-4">
        <h3 className="font-semibold">Outcomes & Notes</h3>

        <div>
          <Label htmlFor="learningOutcomes">Learning Outcomes *</Label>
          <Textarea
            id="learningOutcomes"
            {...register('learningOutcomes', { required: true })}
            placeholder="What students should be able to do after this lesson:
- Outcome 1
- Outcome 2"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="notes">Additional Notes *</Label>
          <Textarea
            id="notes"
            {...register('notes', { required: true })}
            placeholder="Any additional notes or observations"
            rows={2}
          />
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-sm font-medium text-slate-700">Custom Fields</div>
          <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_auto]">
            <Input
              value={newCustomFieldName}
              onChange={(e) => setNewCustomFieldName(e.target.value)}
              placeholder="Field name"
            />
            <Select value={newCustomFieldType} onValueChange={(value) => setNewCustomFieldType(value as CustomField['fieldType'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="textarea">Textarea</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" onClick={addCustomField}>
              Add Field
            </Button>
          </div>

          {customFields.length > 0 && (
            <div className="space-y-3">
              {customFields.map((field) => (
                <div key={field.id} className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm font-medium">{field.fieldName}</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeCustomField(field.id)}>
                      Remove
                    </Button>
                  </div>
                  {field.fieldType === 'textarea' ? (
                    <Textarea
                      value={field.value}
                      onChange={(e) => updateCustomField(field.id, e.target.value)}
                      rows={3}
                    />
                  ) : field.fieldType === 'number' ? (
                    <Input
                      type="number"
                      value={field.value}
                      onChange={(e) => updateCustomField(field.id, e.target.value)}
                    />
                  ) : field.fieldType === 'date' ? (
                    <Input
                      type="date"
                      value={field.value}
                      onChange={(e) => updateCustomField(field.id, e.target.value)}
                    />
                  ) : (
                    <Input
                      type="text"
                      value={field.value}
                      onChange={(e) => updateCustomField(field.id, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
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
