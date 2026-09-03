"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import chevron from "@/assets/icons/chev-down-icon.svg";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { useGetProductDetailQuery } from "@/store/services/homeService";
import { useSearchParams } from "next/navigation";
import noImageAvtar from "@/assets/images/no-image-av.png";
import defaultProfileAvatar from "@/assets/images/default-profile-avatar.svg";
import { useClickOutside } from "@/custom-hooks/useClickOutside";
import { formatPrice } from "@/utils/formatPrice";
import { useDeleteProductMutation } from "@/store/services/sellingService";
import threeDots from "@/assets/icons/three-dots.svg";
import { useRouter } from "next/navigation";
import Reviews from "../Ui/Reviews";
import { getUserId } from "@/utils/getUserId";
import { useGetAvgReviewsQuery } from "@/store/services/reviewService";
import Modal from "../Ui/Modals/Modal";
import { toast } from "react-hot-toast";
import { BeatLoader } from "react-spinners";
import { getFeedCategoryLabel } from "@/utils/getFeedCategoryLabel";
import { hasRealProfileImage } from "@/utils/hasRealProfileImage";
import BuyProductDetailSkeleton from "../Product/BuyProductDetailSkeleton";
import ShopProductsSlider from "../Product/ShopProductsSlider";

function resolveEntityId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as { id?: string; _id?: string };
    return record.id ?? record._id ?? null;
  }
  return null;
}

function ProductDetail() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const userId = getUserId() ?? "";
  const {
    data: product,
    isLoading,
    isFetching,
  } = useGetProductDetailQuery({ id: id!, userId }, { skip: !id });

  const { data: avgReview } = useGetAvgReviewsQuery(
    { type: "product", id: product?.data?.id ?? "" },
    { skip: !product?.data?.id },
  );
  const reviewCount = avgReview?.data?.count ?? 0;
  const shopData = product?.data?.shopId;
  const ownerData = product?.data?.ownerId;
  const productId = product?.data?.id ?? product?.data?._id ?? "";
  const shopId =
    resolveEntityId(product?.data?.shopId) ?? resolveEntityId(shopData);
  const hasShop = Boolean(shopId) || Boolean(product?.data?.shopId);
  const shopOwnerId = resolveEntityId(shopData?.ownerId);

  const { pages, placeholders, currentLanguage, error_messages } =
    useDictionary();
  const ref = React.useRef<HTMLDivElement>(null);
  const deleteModalRef = React.useRef<HTMLDivElement>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [type, setType] = useState("image");
  const [typeIndex, setTypeIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteProduct, { isLoading: isDeleteLoading }] =
    useDeleteProductMutation();

  const allowedToBuy = hasShop
    ? userId !== shopOwnerId
    : userId !== (ownerData?.id || ownerData?._id);

  const videoSrc =
    typeof product?.data?.video === "string" && product.data.video.trim() !== ""
      ? product.data.video.trim()
      : null;

  const imageCount = product?.data?.images?.length ?? 0;
  const showImageCounter =
    (type === "image" || !videoSrc) && imageCount > 0;

  useClickOutside(ref, () => {
    setIsEdit(false);
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (type === "video" && !videoSrc) {
      setType("image");
    }
  }, [type, videoSrc]);

  const handleDeleteProduct = () => {
    if (!id) return;
    deleteProduct(id)
      .unwrap()
      .then((res) => {
        toast.success(res?.message || placeholders.delete_product);
        setIsDeleteModalOpen(false);
        setIsEdit(false);
        router.push("/selling");
      })
      .catch((err) => {
        toast.error(err?.data?.message || error_messages.something_went_wrong);
      });
  };

  if (isLoading || isFetching) {
    return <BuyProductDetailSkeleton />;
  }

  return (
    <div className="">
      <Modal
        editModalRef={deleteModalRef}
        open={isDeleteModalOpen}
        setOpen={setIsDeleteModalOpen}
        centered={true}
      >
        <div className="bg-white rounded-[12px] w-[92vw] max-w-[390px] p-5 shadow-xl hide-scrollbar">
          <h2 className="text-[16px] font-semibold text-black-1">
            {placeholders.delete_product}
          </h2>
          <p className="text-[14px] text-gray-8 mt-2">
            {placeholders[
              "are_you_sure_you_want_to_delete_this_product" as keyof typeof placeholders
            ] ?? "Are you sure you want to delete this product?"}
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="h-[40px] flex-1 cursor-pointer rounded-[8px] border border-green-1 text-green-1 text-[14px] font-medium"
            >
              {placeholders.cancel}
            </button>
            <button
              disabled={isDeleteLoading}
              onClick={handleDeleteProduct}
              className="h-[40px] cursor-pointer flex-1 rounded-[8px] border border-[#E92440] bg-[#E92440] text-white text-[14px] font-medium disabled:opacity-60"
            >
              {isDeleteLoading ? (
                <BeatLoader color="white" size={8} />
              ) : (
                placeholders.confirm
              )}
            </button>
          </div>
        </div>
      </Modal>

      <div className="h-full min-h-screen flex flex-col items-center">
        <div className="px-5 sm:px-10 min-h-[61px] border-b border-gray-9 bg-white w-full flex justify-center">
          <div className="w-full flex flex-wrap items-center gap-[6px] font-normal text-[14px] mt-5">
            <span className="text-gray-8">{pages.selling}</span>
            <Image
              src={chevron}
              alt="chevron"
              className="-rotate-90 rtl:rotate-90"
            />
            <span className="text-gray-8">
              {product?.data?.shopId ? shopData?.title : pages.private_listing}
            </span>
            <Image
              src={chevron}
              alt="chevron"
              className="-rotate-90 rtl:rotate-90"
            />
            <span className="text-green-1">{product?.data?.title}</span>
          </div>
        </div>

        <div className="px-5 sm:px-10 py-6 w-full">
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="space-y-2 w-full md:w-[52%]">
              <div className="relative h-[220px] sm:h-[320px] md:h-[500px] overflow-hidden rounded-[10px]">
                {type === "image" || !videoSrc ? (
                  <Image
                    src={
                      product?.data?.images?.length > 0
                        ? product?.data?.images?.[typeIndex]
                        : noImageAvtar
                    }
                    height={100}
                    width={100}
                    unoptimized
                    alt="product"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  mounted && (
                    <video
                      key={`${videoSrc}?v=${product?.data?.updatedAt}`}
                      src={`${videoSrc}?v=${product?.data?.updatedAt}`}
                      controls
                      autoPlay={false}
                      className="h-full w-full object-contain"
                    />
                  )
                )}
                {showImageCounter && (
                  <div className="absolute bottom-4 z-10 rounded-md bg-[#2C2C2C]/80 px-2.5 py-[3px] text-[12px] font-normal text-white ltr:right-4 rtl:left-4">
                    {typeIndex + 1}/{imageCount}
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap w-full">
                {product?.data?.images?.map((image: string, index: number) => (
                  <div
                    key={index}
                    onClick={() => {
                      setTypeIndex(index);
                      setType("image");
                    }}
                    className={`h-[96px] w-[96px] md:w-[154px] cursor-pointer overflow-hidden rounded-[10px] border ${typeIndex === index && type === "image"
                      ? "border-green-1"
                      : "border-transparent"
                      }`}
                  >
                    <Image
                      src={image}
                      height={100}
                      width={100}
                      unoptimized
                      alt="product"
                      className="h-[96px] w-[96px] md:w-[154px] object-cover"
                    />
                  </div>
                ))}
                {videoSrc && mounted ? (
                  <video
                    onClick={() => setType("video")}
                    key={`${videoSrc}?v=${product?.data?.updatedAt}`}
                    src={`${videoSrc}?v=${product?.data?.updatedAt}`}
                    controls={false}
                    className={`h-[96px] w-[96px] md:w-[154px] cursor-pointer rounded-[10px] border object-cover ${type === "video" ? "border-green-1" : "border-transparent"
                      }`}
                  />
                ) : null}
              </div>

              <div className="mt-10 text-[14px] font-medium text-[#4B514F]">
                {placeholders.description}
              </div>
              <div className="text-[15px] text-[#030303]">
                {product?.data?.description ?? ""}
              </div>
            </div>

            <div className="w-full md:w-[48%]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[24px] font-medium text-[#030303] first-letter:uppercase">
                    {product?.data?.title ?? ""}
                  </h3>
                  <div className="mt-2 text-[28px] font-medium text-[#3C9197]">
                    {placeholders.Rs} {formatPrice(product?.data?.price)}
                  </div>
                </div>
                <div className="relative cursor-pointer" ref={ref}>
                  <div className="p-2" onClick={() => setIsEdit(true)}>
                    <Image src={threeDots} alt="threeDots" />
                  </div>
                  {isEdit && (
                    <div className="absolute right-0 top-6 w-[136px] rounded-[6px] border-[0.5px] border-[#00000033] bg-white p-1 shadow-xl">
                      <div
                        onClick={() => {
                          setIsEdit(false);
                          router.push("/selling/update-product?id=" + id);
                        }}
                        className="p-[10px] text-[12px] leading-none hover:bg-green-3"
                      >
                        {placeholders.edit_product}
                      </div>
                      <div
                        onClick={() => {
                          setIsEdit(false);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-[8px] text-[12px] leading-none hover:bg-green-3"
                      >
                        {placeholders.delete_product}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Image
                  className="h-[44px] w-[44px] rounded-full object-cover"
                  src={
                    product?.data?.shopId && shopData?.image
                      ? shopData.image
                      : product?.data?.ownerId && hasRealProfileImage(ownerData?.image)
                        ? ownerData.image
                        : defaultProfileAvatar
                  }
                  alt="profile"
                  unoptimized
                  height={100}
                  width={100}
                />
                <div>
                  <h4 className="text-[14px] text-[#030303]">
                    {product?.data?.shopId
                      ? shopData?.title
                      : product?.data?.ownerId
                        ? ownerData?.name
                        : ""}
                  </h4>
                  <h4 className="text-[14px] font-light text-[#4B514F]">
                    {product?.data?.shopId
                      ? shopData?.ownerId?.email
                      : product?.data?.ownerId
                        ? ownerData?.email
                        : ""}
                  </h4>
                </div>
              </div>

              {/* <h3 className="mt-2 text-[14px] font-light text-[#4B514F]">
                {reviewCount}{" "}
                {reviewCount === 1 ? placeholders.review : placeholders.reviews}
              </h3> */}

              <div className="mt-4 flex justify-between border-t border-[#E5E5E5] px-1.5 py-4">
                <span className="text-[15px] font-medium">
                  {placeholders.category}
                </span>
                <span className="text-[15px] font-light leading-none">
                  {getFeedCategoryLabel(
                    product?.data?.category,
                    currentLanguage,
                  )}
                </span>
              </div>

              {product?.data?.parameters?.map(
                (
                  parameter: { name: string; variants: string[] },
                  index: number,
                ) => (
                  <div
                    key={index}
                    className="flex justify-between border-t border-[#E5E5E5] px-1.5 py-4"
                  >
                    <span className="text-[15px] font-medium leading-none">
                      {parameter?.name}
                    </span>
                    <span className="max-w-[55%] text-right text-[15px] font-light leading-none">
                      {parameter?.variants?.join(", ")}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* <Reviews
              type="product"
              id={product?.data?.id || product?.data?._id}
              allowAddReview={allowedToBuy}
            /> */}

          {hasShop && shopId && (
            <ShopProductsSlider
              shopId={shopId}
              currentProductId={productId}
              shopTitle={shopData?.title}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
