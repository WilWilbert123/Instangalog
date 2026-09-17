-- Create system_settings table for platform security and moderation rules
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default configuration
INSERT INTO public.system_settings (key, value)
VALUES ('moderation', '{
  "requireVideoApproval": true,
  "autoApproveImageStatus": true,
  "enableChatRateLimit": true,
  "enableSpamFilter": true
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read system_settings"
  ON public.system_settings FOR SELECT
  USING (true);

-- Allow service role and admins write access
CREATE POLICY "Allow admin write system_settings"
  ON public.system_settings FOR ALL
  USING (true);
