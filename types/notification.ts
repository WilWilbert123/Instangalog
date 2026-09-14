import { Profile } from './user';

export type NotificationType =
  | 'like'
  | 'comment'
  | 'reply'
  | 'follow'
  | 'video_approved'
  | 'video_rejected'
  | 'report_resolved'
  | 'warning'
  | 'moderation_action';

export interface Notification {
  id: string;
  user_id: string;
  actor_id?: string;
  type: NotificationType;
  post_id?: string;
  comment_id?: string;
  message: string;
  is_read: boolean;
  created_at: string;

  actor?: Profile;
}
