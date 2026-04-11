export interface TimelineStage {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  planned_cost: number;
  actual_cost: number | null;
  stage_order: number;
  status: Status;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  completion_notes: string | null;
  media_urls: string[];
  completion_media_urls: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  completed_by: string | null;
}

export type Status = 'pending' | 'in_progress' | 'completed';

export interface CreateTimelineStageData {
  title: string;
  description?: string;
  planned_cost: number;
  planned_start_date?: string;
  planned_end_date?: string;
  media_urls?: string[];
}

export interface CompleteStageData {
  actual_cost?: number;
  completion_notes?: string;
  completion_media_urls?: string[];
  actual_end_date?: string;
}

export interface TimelineStats {
  total_stages: number;
  completed_stages: number;
  total_planned_cost: number;
  total_actual_cost: number;
  completion_percentage: number;
}