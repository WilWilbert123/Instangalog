-- Migration 002: Create profile_visits table for visitor history tracking

CREATE TABLE IF NOT EXISTS public.profile_visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_profile_visitor UNIQUE (profile_id, visitor_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_profile_visits_profile_id ON public.profile_visits(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_visits_visitor_id ON public.profile_visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_profile_visits_visited_at ON public.profile_visits(visited_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access to profile visits"
  ON public.profile_visits FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage profile visits"
  ON public.profile_visits FOR ALL USING (true) WITH CHECK (true);

-- Realtime publication for instant UI updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.profile_visits;
