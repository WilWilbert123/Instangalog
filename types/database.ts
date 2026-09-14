export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          role: 'user' | 'moderator' | 'admin';
          status: 'active' | 'suspended' | 'banned';
          followers_count: number;
          following_count: number;
          posts_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          role?: 'user' | 'moderator' | 'admin';
          status?: 'active' | 'suspended' | 'banned';
          followers_count?: number;
          following_count?: number;
          posts_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          type: 'video' | 'image' | 'music' | 'status';
          caption: string;
          hashtags: string[];
          location: string | null;
          visibility: 'public' | 'followers' | 'private';
          moderation_status: 'pending' | 'approved' | 'rejected';
          approved_by: string | null;
          approved_at: string | null;
          rejected_by: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          likes_count: number;
          comments_count: number;
          shares_count: number;
          views_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['posts']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['posts']['Insert']>;
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          message: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          message: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
      };
      // additional tables typed dynamically when querying Supabase client
    };
  };
}
