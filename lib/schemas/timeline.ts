import { z } from 'zod';

export const createTimelineStageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  planned_cost: z.number().min(0, 'Cost must be positive'),
  planned_start_date: z.string().optional(),
  planned_end_date: z.string().optional(),
  media_urls: z.array(z.string().url()).optional()
});

export const completeStageSchema = z.object({
  actual_cost: z.number().min(0, 'Cost must be positive').optional(),
  completion_notes: z.string().max(2000, 'Notes too long').optional(),
  completion_media_urls: z.array(z.string().url()).optional(),
  actual_end_date: z.string().optional()
});

export const createTimelineSchema = z.object({
  stages: z.array(createTimelineStageSchema).min(1, 'At least one stage is required')
});

export type CreateTimelineStageInput = z.infer<typeof createTimelineStageSchema>;
export type CompleteStageInput = z.infer<typeof completeStageSchema>;
export type CreateTimelineInput = z.infer<typeof createTimelineSchema>;