import { getFYPVideos } from '@/lib/services/postService';
import { VerticalFeed } from '@/components/fyp/VerticalFeed';

export const revalidate = 0;

export default async function FYPPage() {
  const posts = await getFYPVideos();

  return (
    <div className="w-full h-full flex flex-col items-center">
      <VerticalFeed posts={posts} />
    </div>
  );
}
