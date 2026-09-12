import React from "react";
import Feed from "@/components/Feed/Feed";

// postId/tab: set when arriving via "My Videos" -> tap a video, so the feed
// opens pinned to that one post instead of the normal top of the feed.
async function page({
  searchParams,
}: {
  searchParams: Promise<{ postId?: string; tab?: string }>;
}) {
  const { postId, tab } = await searchParams;
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden sm:px-4 sm:pt-2 sm:px-6">
      <Feed initialPostId={postId} initialTab={tab} />
    </div>
  );
}

export default page;
