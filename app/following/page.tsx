import { Suspense } from 'react';
import { getApprovedPosts } from '@/lib/services/postService';
import { FollowingFeedClient } from '@/components/following/FollowingFeedClient';

export const revalidate = 0;

export default async function FollowingPage() {
  const posts = await getApprovedPosts();

  return (
    <Suspense fallback={<div className="py-12 text-center text-xs text-slate-500">Loading feed...</div>}>
      <FollowingFeedClient initialPosts={posts} />
    </Suspense>
  );
}

