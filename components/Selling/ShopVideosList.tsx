"use client";
import React, { useState } from "react";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { useSearchParams } from "next/navigation";
import {
  useGetShopDetailQuery,
  useGetShopVideoPostsQuery,
  useDeleteVideoPostMutation,
} from "@/store/services/sellingService";
import { getUserId } from "@/utils/getUserId";
import Modal from "../Ui/Modals/Modal";
import { BeatLoader } from "react-spinners";
import toast from "react-hot-toast";
import ProductSkeleton from "./ProductsSkelton";

function resolveEntityId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as { id?: string; _id?: string };
    return record.id ?? record._id ?? null;
  }
  return null;
}

function ShopVideosList() {
  const { placeholders, error_messages } = useDictionary();
  const id = useSearchParams().get("id") || "";
  const userId = getUserId() ?? "";
  const deleteModalRef = React.useRef<HTMLDivElement>(null);

  const { data: shop } = useGetShopDetailQuery(id, { skip: !id });
  const shopOwnerId = resolveEntityId(shop?.data?.ownerId);
  const isShopOwner = Boolean(userId && shopOwnerId && userId === shopOwnerId);

  const {
    data: videoPostsResponse,
    isLoading,
    isFetching,
  } = useGetShopVideoPostsQuery(id, { skip: !id });

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteVideoPost, { isLoading: isDeleteLoading }] =
    useDeleteVideoPostMutation();

  const loading = isLoading || isFetching;
  const videoPosts = videoPostsResponse?.data ?? [];

  const handleDelete = () => {
    if (!deleteTargetId) return;
    deleteVideoPost(deleteTargetId)
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
    <div className="sm:px-2">
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

      {loading && <ProductSkeleton />}
      {!loading && videoPosts.length === 0 && (
        <div className="flex h-[30vh] w-full items-center justify-center text-black-1">
          {placeholders.no_videos_posted_yet}
        </div>
      )}
      {!loading && videoPosts.length > 0 && (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-2 md:gap-5 mt-4 px-3.5">
          {videoPosts.map((product: any) => {
            const productId = product?.id ?? product?._id;
            return (
              <div key={productId}>
                <div className="h-[180px] sm:h-[230px] rounded-[16px] overflow-hidden bg-black">
                  <video
                    src={product.video}
                    className="h-full w-full object-cover"
                    controls
                  />
                </div>
                <h2 className="text-black-1 font-medium text-[15px] mt-2 line-clamp-1">
                  {product?.title}
                </h2>
                {isShopOwner ? (
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(productId)}
                    className="mt-1 text-[13px] font-medium text-[#E92440] cursor-pointer"
                  >
                    {placeholders.delete_video}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ShopVideosList;
