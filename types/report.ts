import { Profile } from './user';

export type ReportTargetType = 'video' | 'image' | 'music' | 'status' | 'post' | 'comment' | 'chat' | 'user';
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  description?: string;
  status: ReportStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  resolution?: string;
  created_at: string;

  reporter?: Profile;
}
