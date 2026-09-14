-- ===================================================
-- SPOTI-NGALOG SEED DATA
-- ===================================================

-- Sample Profiles
INSERT INTO public.profiles (id, username, display_name, avatar_url, bio, role, status, followers_count, following_count, posts_count)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'alex.taylor', 'Alex Taylor', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', 'Creating moments, not just content. 🎬✨', 'user', 'active', 12400, 856, 245),
  ('00000000-0000-0000-0000-000000000002', 'travel.lens', 'Travel Lens', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', 'Exploring the globe one short video at a time 🌍📹', 'user', 'active', 48200, 312, 510),
  ('00000000-0000-0000-0000-000000000003', 'music.vibes', 'Ocean Pulse', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80', 'Indie electronic beatmaker & sound designer 🎧🎵', 'user', 'active', 89200, 142, 88),
  ('00000000-0000-0000-0000-000000000004', 'admin.mod', 'System Admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80', 'Spoti-Ngalog Lead Admin & Safety Officer 🛡️', 'admin', 'active', 1500, 10, 5)
ON CONFLICT (id) DO NOTHING;

-- Sample Video Posts (FYP ready)
INSERT INTO public.posts (id, user_id, type, caption, hashtags, visibility, moderation_status, likes_count, comments_count, shares_count, views_count)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 'video', 'Sunset over the coastal cliffs! Magic hour captured in 4K 🌅✨', ARRAY['travel', 'nature', 'sunset', 'adventure'], 'public', 'approved', 12400, 342, 1200, 85400),
  ('11111111-1111-1111-1111-111111111112', '00000000-0000-0000-0000-000000000001', 'video', 'Midnight coding session with lo-fi beats in the background 💻🌌', ARRAY['coding', 'developer', 'lofi', 'nightowl'], 'public', 'approved', 8430, 192, 450, 42100),
  ('11111111-1111-1111-1111-111111111113', '00000000-0000-0000-0000-000000000003', 'video', 'Live synth performance snippet! Synthwave energy 🎹⚡', ARRAY['synthwave', 'livemusic', 'electronic', 'beats'], 'public', 'approved', 19500, 840, 2100, 130200)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.videos (post_id, video_url, thumbnail_url, duration)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80', 15),
  ('11111111-1111-1111-1111-111111111112', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=80', 20),
  ('11111111-1111-1111-1111-111111111113', 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80', 18)
ON CONFLICT (post_id) DO NOTHING;

-- Sample Music Posts
INSERT INTO public.posts (id, user_id, type, caption, hashtags, visibility, moderation_status, likes_count, comments_count, shares_count, views_count)
VALUES
  ('22222222-2222-2222-2222-222222222221', '00000000-0000-0000-0000-000000000003', 'music', 'New single "Neon Horizon" out now on Spoti-Ngalog! 🌌🎵', ARRAY['newmusic', 'synthwave', 'chill'], 'public', 'approved', 3420, 128, 88, 15400)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.music (post_id, audio_url, cover_url, title, artist, album, genre, duration)
VALUES
  ('22222222-2222-2222-2222-222222222221', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80', 'Neon Horizon', 'Ocean Pulse', 'Midnight Echoes', 'Chillwave', 240)
ON CONFLICT (post_id) DO NOTHING;

-- Sample Chat Messages
INSERT INTO public.chat_messages (id, user_id, message)
VALUES
  ('33333333-3333-3333-3333-333333333331', '00000000-0000-0000-0000-000000000003', 'Welcome everyone to the official Spoti-Ngalog global community chat! 🎉'),
  ('33333333-3333-3333-3333-333333333332', '00000000-0000-0000-0000-000000000002', 'Where is that sunset video filmed? Absolutely stunning footage!'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'That synth track Neon Horizon is on repeat for me today 🔥')
ON CONFLICT (id) DO NOTHING;
