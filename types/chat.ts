import { Profile } from './user';

export interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  deleted_at?: string | null;

  author?: Profile;
}
