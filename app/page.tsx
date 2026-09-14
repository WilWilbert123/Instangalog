import { getFYPVideos } from '@/lib/services/postService';
import { HomeCombinedFeed } from '@/components/home/HomeCombinedFeed';

export const revalidate = 0; // Dynamic feed

export default async function HomePage() {
  const posts = await getFYPVideos();

  return (
    <div className="w-full h-full">
      <HomeCombinedFeed posts={posts} />
    </div>
  );
}

