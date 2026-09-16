-- Migration: Create Party Song Requests Table
CREATE TABLE IF NOT EXISTS public.party_song_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    song_title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying pending song requests
CREATE INDEX IF NOT EXISTS idx_party_song_requests_status 
ON public.party_song_requests (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.party_song_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view song requests"
ON public.party_song_requests
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can submit song requests"
ON public.party_song_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update or delete song requests"
ON public.party_song_requests
FOR ALL
USING (true);

-- Add to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_song_requests;
