import { Profile } from './user';

export type PostType = 'video' | 'image' | 'music' | 'status';
export type ModerationStatus = 'pending' | 'approved' | 'rejected';
export type Visibility = 'public' | 'followers' | 'private';

export interface VideoMetadata {
  id?: string;
  post_id?: string;
  video_url: string;
  thumbnail_url: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface ImageMetadata {
  id?: string;
  post_id?: string;
  image_url: string;
  width?: number;
  height?: number;
}

export interface MusicMetadata {
  id?: string;
  post_id?: string;
  audio_url: string;
  cover_url: string;
  title: string;
  artist: string;
  album?: string;
  description?: string;
  genre?: string;
  duration?: number;
}

export interface StatusMetadata {
  id?: string;
  post_id?: string;
  text: string;
  image_url?: string;
  audio_url?: string;
}

export interface Post {
  id: string;
  user_id: string;
  type: PostType;
  caption: string;
  hashtags: string[];
  location?: string;
  visibility: Visibility;
  moderation_status: ModerationStatus;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;

  // Author details
  author?: Profile;

  // Media payload
  video?: VideoMetadata;
  image?: ImageMetadata;
  music?: MusicMetadata;
  status?: StatusMetadata;

  // Aggregates & User Interactions
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  plays_count?: number;
  is_liked?: boolean;
}
