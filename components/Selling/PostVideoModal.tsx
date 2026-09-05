"use client";
import React, { useEffect, useState } from "react";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import Modal from "../Ui/Modals/Modal";
import ChooseVideoTab from "../Services/ChooseVideoTab";
import DoodleButton from "@/components/Ui/DoodleButton";
import { BeatLoader } from "react-spinners";
import toast from "react-hot-toast";
import { usePostVideoMutation } from "@/store/services/sellingService";

interface Props {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  shopId: string;
  onCreated?: () => void;
}

function PostVideoModal({ open, setOpen, shopId, onCreated }: Props) {
  const { placeholders, error_messages } = useDictionary();
  const modalRef = React.useRef<HTMLDivElement>(null);
  const [video, setVideo] = useState<File | null | string>(null);
  const [caption, setCaption] = useState("");
  const [captionError, setCaptionError] = useState("");
  const [postVideo, { isLoading, isSuccess, isError, data, error }] =
    usePostVideoMutation();

  useEffect(() => {
    if (!open) {
      setVideo(null);
      setCaption("");
      setCaptionError("");
    }
  }, [open]);

  useEffect(() => {
    if (isSuccess) {
      toast.success(data?.message || placeholders.post_video);
      setOpen(false);
      onCreated?.();
    }
    if (isError) {
      toast.error(
        (error as { data?: { message?: string } })?.data?.message ||
          error_messages.something_went_wrong,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, isError, data, error]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCaptionError("");

    if (!video) {
      toast.error(error_messages.video_required);
      return;
    }
    if (caption.trim() === "") {
      setCaptionError(error_messages.title_required);
      return;
    }

    const formData = new FormData();
    formData.append("title", caption.trim());
    formData.append("video", video);

    postVideo({ shopId, formData });
  };

  return (
    <Modal editModalRef={modalRef} open={open} setOpen={setOpen} centered>
      <div className="bg-white rounded-[12px] w-[92vw] max-w-[420px] p-5 shadow-xl">
        <h2 className="text-[16px] font-semibold text-black-1">
          {placeholders.post_video}
        </h2>
        <form onSubmit={handleSubmit} className={isLoading ? "pointer-events-none" : ""}>
          <div className="mt-4">
            <ChooseVideoTab video={video} setVideo={setVideo} />
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-[14px] font-normal text-gray-8">
              {placeholders.caption}
            </p>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              draggable={false}
              className="h-[90px] resize-none text-[15px] text-black-1 font-normal focus:outline-none w-full border-gray-9 border-b-[1px]"
            />
            {captionError && (
              <p className="text-red-1 text-[14px] font-normal">{captionError}</p>
            )}
          </div>
          <DoodleButton
            type="submit"
            disabled={isLoading}
            className="mt-5 h-[46px] w-full rounded-[12px] text-white font-medium text-[16px] bg-green-1 cursor-pointer"
          >
            {isLoading ? <BeatLoader color="white" size={8} /> : placeholders.post_video}
          </DoodleButton>
        </form>
      </div>
    </Modal>
  );
}

export default PostVideoModal;
