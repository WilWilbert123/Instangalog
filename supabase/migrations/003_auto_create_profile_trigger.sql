-- Migration 003: Automatic Profile Creation Trigger for auth.users signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_username TEXT;
  clean_email TEXT;
BEGIN
  clean_email := LOWER(COALESCE(NEW.email, ''));
  
  -- Extract base username from email or metadata
  new_username := LOWER(SPLIT_PART(clean_email, '@', 1));
  new_username := REGEXP_REPLACE(new_username, '[^a-z0-9_]', '_', 'g');
  
  IF new_username IS NULL OR new_username = '' THEN
    new_username := 'user_' || SUBSTRING(NEW.id::text FROM 1 FOR 6);
  END IF;

  -- Ensure username uniqueness
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username AND id <> NEW.id) THEN
    new_username := new_username || '_' || SUBSTRING(NEW.id::text FROM 1 FOR 4);
  END IF;

  INSERT INTO public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    role,
    status
  )
  VALUES (
    NEW.id,
    new_username,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'preferred_username',
      SPLIT_PART(clean_email, '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      ''
    ),
    CASE WHEN clean_email = 'johnwilbertgamis2022@gmail.com' THEN 'admin' ELSE 'user' END,
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
