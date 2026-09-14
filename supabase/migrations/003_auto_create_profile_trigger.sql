-- Migration 003: Automatic Profile Creation Schema & Trigger for auth.users signup

-- 1. Ensure public.profiles table exists with full constraints
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  username text NOT NULL,
  display_name text NOT NULL,
  avatar_url text NULL,
  bio text NULL,
  role text NOT NULL DEFAULT 'user'::text,
  status text NOT NULL DEFAULT 'active'::text,
  followers_count integer NOT NULL DEFAULT 0,
  following_count integer NOT NULL DEFAULT 0,
  posts_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_username_key UNIQUE (username),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT profiles_role_check CHECK (
    (role = ANY (ARRAY['user'::text, 'moderator'::text, 'admin'::text]))
  ),
  CONSTRAINT profiles_status_check CHECK (
    (status = ANY (ARRAY['active'::text, 'suspended'::text, 'banned'::text]))
  )
);

-- 2. Enable Row Level Security (RLS) & default policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone') THEN
    CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
    CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON public.profiles FOR ALL USING (true);
  END IF;
END $$;

-- 3. Automatic Profile Creation Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  clean_email TEXT;
  raw_name TEXT;
  counter INT := 1;
BEGIN
  clean_email := LOWER(COALESCE(NEW.email, ''));
  
  -- Extract base username from metadata or email
  base_username := LOWER(COALESCE(
    NEW.raw_user_meta_data->>'preferred_username',
    NEW.raw_user_meta_data->>'user_name',
    SPLIT_PART(clean_email, '@', 1),
    'user_' || SUBSTRING(NEW.id::text FROM 1 FOR 8)
  ));
  
  -- Sanitize base username (lowercase alphanumeric & underscore)
  base_username := REGEXP_REPLACE(base_username, '[^a-z0-9_]', '_', 'g');
  IF base_username IS NULL OR LENGTH(base_username) = 0 THEN
    base_username := 'user_' || SUBSTRING(NEW.id::text FROM 1 FOR 8);
  END IF;

  final_username := base_username;

  -- Loop to guarantee username uniqueness
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username AND id <> NEW.id) LOOP
    final_username := base_username || '_' || counter::text;
    counter := counter + 1;
    IF counter > 100 THEN
      final_username := base_username || '_' || SUBSTRING(NEW.id::text FROM 1 FOR 6);
      EXIT;
    END IF;
  END LOOP;

  -- Extract display name (must NOT be null/empty)
  raw_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'preferred_username',
    SPLIT_PART(clean_email, '@', 1),
    final_username
  );

  IF raw_name IS NULL OR LENGTH(TRIM(raw_name)) = 0 THEN
    raw_name := final_username;
  END IF;

  -- Insert or update profile row automatically
  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    bio,
    role,
    status,
    followers_count,
    following_count,
    posts_count,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    final_username,
    raw_name,
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      ''
    ),
    '',
    CASE WHEN clean_email = 'johnwilbertgamis2022@gmail.com' THEN 'admin' ELSE 'user' END,
    'active',
    0,
    0,
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block auth user creation on profile trigger error
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Bind trigger to auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Grant permissions to roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;
