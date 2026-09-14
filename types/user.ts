import { UserRole, AccountStatus } from './auth';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  role: UserRole;
  status: AccountStatus;
  followers_count: number;
  following_count: number;
  posts_count: number;
  created_at: string;
  updated_at: string;
  is_following?: boolean;
}
