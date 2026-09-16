import { notFound } from 'next/navigation';
import { getPostById } from '@/lib/services/postService';
import { SinglePostClient } from '@/components/post/SinglePostClient';

export const revalidate = 0; // Dynamic rendering for latest post stats

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await params;
  const post = await getPostById(resolvedParams.id);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black pt-20 pb-24 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <SinglePostClient initialPost={post} />
      </div>
    </div>
  );
}
