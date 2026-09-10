"use client";
import React, { useRef, useState } from "react";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import {
  useGetMyServiceVideoPostsQuery,
  useDeleteServiceVideoPostMutation,
} from "@/store/services/sellingService";
import Modal from "../Ui/Modals/Modal";
import { BeatLoader } from "react-spinners";
import toast from "react-hot-toast";
import { Trash2, Plus } from "lucide-react";
import ProductSkeleton from "../Selling/ProductsSkelton";
import PostServiceVideoModal from "./PostServiceVideoModal";

// Same click-to-toggle play/pause pattern as the shop's video list
// (components/Selling/ShopVideosList.tsx) for a consistent small-grid feel.
function VideoCard({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="relative h-[180px] sm:h-[230px] rounded-[16px] overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={src}
        playsInline
        className="h-full w-full object-cover cursor-pointer"
        onClick={togglePlayPause}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlayPause}
          className="absolute left-1/2 top-1/2 z-10 flex h-[42px] w-[42px] -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-[rgba(0,0,0,0.33)] text-white"
          aria-label="Play"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
            <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}

function MyServiceVideosList() {
  const { placeholders, error_messages } = useDictionary();
  const deleteModalRef = React.useRef<HTMLDivElement>(null);

  const {
    data: videoPostsResponse,
    isLoading,
    isFetching,
  } = useGetMyServiceVideoPostsQuery({});

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteServiceVideoPost, { isLoading: isDeleteLoading }] =
    useDeleteServiceVideoPostMutation();
  const [postVideoModal, setPostVideoModal] = useState(false);

  const loading = isLoading || isFetching;
  const videoPosts = videoPostsResponse?.data ?? [];

  const handleDelete = () => {
    if (!deleteTargetId) return;
    deleteServiceVideoPost(deleteTargetId)
      .unwrap()
      .then(() => {
        toast.success(placeholders.delete_video);
        setDeleteTargetId(null);
      })
      .catch((err) => {
        toast.error(err?.data?.message || error_messages.something_went_wrong);
      });
  };

  return (
    <div className="mt-4 w-full">
      <Modal
        editModalRef={deleteModalRef}
        open={!!deleteTargetId}
        setOpen={(open) => {
          if (!open) setDeleteTargetId(null);
        }}
        centered
      >
        <div className="bg-white rounded-[12px] w-[92vw] max-w-[390px] p-5 shadow-xl">
          <h2 className="text-[16px] font-semibold text-black-1">
            {placeholders.delete_video}
          </h2>
          <p className="text-[14px] text-gray-8 mt-2">
            {placeholders.are_you_sure_you_want_to_delete_this_video}
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setDeleteTargetId(null)}
              className="h-[40px] flex-1 cursor-pointer rounded-[8px] border border-green-1 text-green-1 text-[14px] font-medium"
            >
              {placeholders.cancel}
            </button>
            <button
              disabled={isDeleteLoading}
              onClick={handleDelete}
              className="h-[40px] cursor-pointer flex-1 rounded-[8px] border border-[#E92440] bg-[#E92440] text-white text-[14px] font-medium disabled:opacity-60"
            >
              {isDeleteLoading ? <BeatLoader color="white" size={8} /> : placeholders.confirm}
            </button>
          </div>
        </div>
      </Modal>

      <PostServiceVideoModal open={postVideoModal} setOpen={setPostVideoModal} />

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[15px] font-medium text-black-1">
          {placeholders.my_videos}
        </h3>
        <button
          type="button"
          onClick={() => setPostVideoModal(true)}
          className="flex items-center gap-1 cursor-pointer text-[14px] font-medium text-green-1"
        >
          <Plus className="h-4 w-4" />
          {placeholders.post_video}
        </button>
      </div>

      {loading && <ProductSkeleton />}
      {!loading && videoPosts.length === 0 && (
        <div className="flex h-[20vh] w-full items-center justify-center text-black-1">
          {placeholders.no_videos_posted_yet}
        </div>
      )}
      {!loading && videoPosts.length > 0 && (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-2 md:gap-5">
          {videoPosts.map((post: any) => {
            const postId = post?.id ?? post?._id;
            return (
              <div key={postId}>
                <VideoCard src={post.video} />
                <div className="flex items-center justify-between gap-2 mt-2">
                  <h2 className="text-black-1 font-medium text-[15px] line-clamp-1">
                    {post?.title}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(postId)}
                    aria-label={placeholders.delete_video}
                    title={placeholders.delete_video}
                    className="shrink-0 cursor-pointer text-[#E92440]"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyServiceVideosList;
