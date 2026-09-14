import { getProfileByUsername, getUserPosts } from '@/lib/services/profileService';
import { notFound } from 'next/navigation';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { MusicCard } from '@/components/music/MusicCard';
import { Grid } from 'lucide-react';

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  const posts = await getUserPosts(profile.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header Banner with Edit Capabilities */}
      <ProfileHeader initialProfile={profile} />

      {/* User Posts Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Grid className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          <span>Uploaded Content</span>
        </h3>

        {posts.length === 0 ? (
          <div className="p-8 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No uploaded content yet.</p>
            <p className="text-xs text-slate-400">Posts uploaded by @{profile.username} will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {posts.map((post) => {
              if (post.type === 'music') {
                return <MusicCard key={post.id} post={post} />;
              }

              return (
                <div
                  key={post.id}
                  className="p-4 rounded-2xl glass-card border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 space-y-3 shadow-sm text-slate-900 dark:text-white"
                >
                  <p className="text-xs text-slate-800 dark:text-slate-200">{post.caption}</p>
                  {post.type === 'video' && post.video && (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.video.thumbnail_url} alt={post.caption} className="w-full h-full object-cover" />
                    </div>
                  )}
                  {post.type === 'image' && post.image && (
                    <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.image.image_url} alt={post.caption} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
