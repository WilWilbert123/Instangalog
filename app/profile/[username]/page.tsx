import { getProfileByUsername, getUserPosts } from '@/lib/services/profileService';
import { notFound } from 'next/navigation';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileContentGrid } from '@/components/profile/ProfileContentGrid';

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
      <ProfileHeader initialProfile={profile} actualPostsCount={posts.length} />

      {/* User Uploaded Content Grid */}
      <ProfileContentGrid posts={posts} username={profile.username} />
    </div>
  );
}
