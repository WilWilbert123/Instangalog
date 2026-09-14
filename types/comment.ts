import { Profile } from './user';

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;

  author?: Profile;
  replies?: Comment[];
  likes_count?: number;
  is_liked?: boolean;
}
