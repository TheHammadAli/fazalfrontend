"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import Modal from "../Ui/Modals/Modal";
import ChooseVideoTab from "./ChooseVideoTab";
import DoodleButton from "@/components/Ui/DoodleButton";
import { BeatLoader } from "react-spinners";
import toast from "react-hot-toast";
import {
  usePostServiceVideoMutation,
  useGetUserProductsQuery,
} from "@/store/services/sellingService";
import { getUserId } from "@/utils/getUserId";
import noImageAvtar from "@/assets/images/no-image-av.png";

interface Props {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onCreated?: () => void;
}

interface OwnProduct {
  id: string;
  title: string;
  images: string[];
}

function PostServiceVideoModal({ open, setOpen, onCreated }: Props) {
  const { placeholders, error_messages } = useDictionary();
  const modalRef = React.useRef<HTMLDivElement>(null);
  const userId = getUserId() ?? "";
  const [video, setVideo] = useState<File | null | string>(null);
  const [caption, setCaption] = useState("");
  const [captionError, setCaptionError] = useState("");
  const [taggedProductId, setTaggedProductId] = useState("");
  const [postServiceVideo, { isLoading, isSuccess, isError, data, error }] =
    usePostServiceVideoMutation();
  const { data: userProducts } = useGetUserProductsQuery(userId, {
    skip: !open || !userId,
  });
  const products: OwnProduct[] = userProducts?.data ?? [];

  useEffect(() => {
    if (!open) {
      setVideo(null);
      setCaption("");
      setCaptionError("");
      setTaggedProductId("");
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
    if (taggedProductId) {
      formData.append("taggedProductId", taggedProductId);
    }

    postServiceVideo(formData);
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
          {products.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[14px] font-normal text-gray-8">
                {placeholders.tag_product_optional}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setTaggedProductId("")}
                  className={`shrink-0 px-3 h-[36px] rounded-full text-[13px] border-[1px] ${
                    taggedProductId === ""
                      ? "border-green-1 text-green-1 bg-green-1/10"
                      : "border-gray-9 text-gray-8"
                  }`}
                >
                  {placeholders.no_product_tagged}
                </button>
                {products.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => setTaggedProductId(product.id)}
                    className={`shrink-0 flex items-center gap-2 pl-1 pr-3 h-[36px] rounded-full text-[13px] border-[1px] ${
                      taggedProductId === product.id
                        ? "border-green-1 text-green-1 bg-green-1/10"
                        : "border-gray-9 text-gray-8"
                    }`}
                  >
                    <Image
                      src={product.images?.[0] || noImageAvtar}
                      alt={product.title}
                      height={28}
                      width={28}
                      unoptimized
                      className="h-[28px] w-[28px] rounded-full object-cover bg-gray-12"
                    />
                    <span className="line-clamp-1 max-w-[100px]">{product.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
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

export default PostServiceVideoModal;
