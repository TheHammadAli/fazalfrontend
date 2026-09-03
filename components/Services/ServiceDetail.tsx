"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import chevron from "@/assets/icons/chev-down-icon.svg";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import noImageAvtar from "@/assets/images/no-image-av.png";
import { useClickOutside } from "@/custom-hooks/useClickOutside";
import { formatPrice } from "@/utils/formatPrice";
import { useDeleteServiceMutation } from "@/store/services/sellingService";
import threeDots from "@/assets/icons/three-dots.svg";
import { useRouter } from "next/navigation";
import Reviews from "../Ui/Reviews";
import { getUserId } from "@/utils/getUserId";
import { useGetAvgReviewsQuery } from "@/store/services/reviewService";
import Modal from "../Ui/Modals/Modal";
import toast from "react-hot-toast";
import { BeatLoader } from "react-spinners";
import { getFeedCategoryLabel } from "@/utils/getFeedCategoryLabel";
import MyServiceRequests from "./MyServiceRequests";

export type ServiceDetailType = {
  id: string;
  _id: string;
  ownerId: string;
  title: string;
  name: string;
  price: number;
  paymentType?: string;
  images: string[];
  video: string;
  description: string;
  parameters: { name: string; variants: string[] }[];
  category: { name: string; icon?: string };
  updatedAt: string;
};

function ServiceDetail({ serviceData }: { serviceData: ServiceDetailType }) {
  const router = useRouter();
  const { user } =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : null;
  const serviceId = serviceData?.id ?? serviceData?._id;
  const userId = getUserId() ?? "";
  const { data: avgReview } = useGetAvgReviewsQuery(
    { type: "service", id: serviceId },
    { skip: !serviceId },
  );
  const reviewCount = avgReview?.data?.count ?? 0;
  const { placeholders, currentLanguage, error_messages } = useDictionary();
  const menuRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);
  const [isEdit, setIsEdit] = useState(false);
  const [type, setType] = useState("image");
  const [typeIndex, setTypeIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteService, { isLoading: isDeleteLoading }] =
    useDeleteServiceMutation();

  const allowedToBuy = userId !== serviceData?.ownerId;
  const videoSrc =
    typeof serviceData?.video === "string" && serviceData.video.trim() !== ""
      ? serviceData.video.trim()
      : null;

  const imageCount = serviceData?.images?.length ?? 0;
  const showImageCounter =
    (type === "image" || !videoSrc) && imageCount > 0;

  const paymentTypeLabel =
    placeholders?.[
      serviceData?.paymentType as keyof typeof placeholders
    ]?.toString().toLowerCase() ?? serviceData?.paymentType ?? "";

  useClickOutside(menuRef, () => {
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

  const handleDeleteService = () => {
    if (!serviceId) return;
    deleteService(serviceId)
      .unwrap()
      .then((res) => {
        toast.success(res?.message || placeholders.delete_service);
        setIsDeleteModalOpen(false);
        setIsEdit(false);
        router.push("/services");
      })
      .catch((err) => {
        toast.error(err?.data?.message || error_messages.something_went_wrong);
      });
  };

  return (
    <div>
      <Modal
        editModalRef={deleteModalRef}
        open={isDeleteModalOpen}
        setOpen={setIsDeleteModalOpen}
        centered={true}
      >
        <div className="hide-scrollbar w-[92vw] max-w-[390px] rounded-[12px] bg-white p-5 shadow-xl">
          <h2 className="text-[16px] font-semibold text-black-1">
            {placeholders.delete_service}
          </h2>
          <p className="mt-2 text-[14px] text-gray-8">
            {placeholders[
              "are_you_sure_you_want_to_delete_this_product" as keyof typeof placeholders
            ] ?? "Are you sure you want to delete this service?"}
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="h-[40px] flex-1 cursor-pointer rounded-[8px] border border-green-1 text-[14px] font-medium text-green-1"
            >
              {placeholders.cancel}
            </button>
            <button
              disabled={isDeleteLoading}
              onClick={handleDeleteService}
              className="h-[40px] flex-1 cursor-pointer rounded-[8px] border border-[#E92440] bg-[#E92440] text-[14px] font-medium text-white disabled:opacity-60"
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

      <div className="flex min-h-screen flex-col items-center">
        <div className="flex min-h-[61px] w-full justify-center border-b border-gray-9 bg-white px-5 sm:px-10">
          <div className="mt-5 flex w-full flex-wrap items-center gap-[6px] text-[14px] font-normal">
            <span className="capitalize text-gray-8">{placeholders.service}</span>
            <Image
              src={chevron}
              alt="chevron"
              className="-rotate-90 rtl:rotate-90"
            />
            <span className="text-green-1">{serviceData?.title}</span>
          </div>
        </div>

        <div className="w-full px-5 py-6 sm:px-10">
          <div className="flex flex-col gap-8 sm:flex-row">
            <div className="w-full space-y-2 md:w-[52%]">
              <div className="relative h-[220px] overflow-hidden rounded-[10px] sm:h-[320px] md:h-[500px]">
                {type === "image" || !videoSrc ? (
                  <Image
                    src={
                      serviceData?.images?.length > 0
                        ? `${serviceData?.images?.[typeIndex]}?t=${Date.now()}`
                        : noImageAvtar
                    }
                    height={100}
                    width={100}
                    unoptimized
                    alt="service"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  mounted && (
                    <video
                      key={`${videoSrc}?v=${serviceData?.updatedAt}`}
                      src={`${videoSrc}?v=${serviceData?.updatedAt}`}
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

              <div className="flex w-full flex-wrap gap-2">
                {serviceData?.images?.map((image: string, index: number) => (
                  <div
                    key={index}
                    onClick={() => {
                      setTypeIndex(index);
                      setType("image");
                    }}
                    className={`h-[96px] w-[96px] cursor-pointer overflow-hidden rounded-[10px] border md:w-[154px] ${typeIndex === index && type === "image"
                        ? "border-green-1"
                        : "border-transparent"
                      }`}
                  >
                    <Image
                      src={`${image}?t=${Date.now()}`}
                      height={100}
                      width={100}
                      alt="service"
                      unoptimized
                      className="h-[96px] w-[96px] object-cover md:w-[154px]"
                    />
                  </div>
                ))}
                {videoSrc && mounted ? (
                  <video
                    onClick={() => setType("video")}
                    key={`${videoSrc}?v=${serviceData?.updatedAt}`}
                    src={`${videoSrc}?v=${serviceData?.updatedAt}`}
                    controls={false}
                    className={`h-[96px] w-[96px] cursor-pointer rounded-[10px] border object-cover md:w-[154px] ${type === "video" ? "border-green-1" : "border-transparent"
                      }`}
                  />
                ) : null}
              </div>

              <div className="mt-10 text-[14px] font-medium text-[#4B514F]">
                {placeholders.description}
              </div>
              <div className="break-all text-[15px] text-[#030303]">
                {serviceData?.description ?? ""}
              </div>
              <div className="mt-8">
                <Reviews
                  type="service"
                  id={serviceData?.id || serviceData?._id}
                  allowAddReview={allowedToBuy}
                />
              </div>
            </div>

            <div className="w-full md:w-[48%]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[24px] font-medium capitalize text-[#030303]">
                    {serviceData?.title ?? ""}
                  </h3>
                  <div className="mt-2 text-[28px] font-medium text-[#3C9197]">
                    {placeholders.Rs} {formatPrice(serviceData?.price)}
                    {paymentTypeLabel ? `/${paymentTypeLabel}` : ""}
                  </div>
                </div>
                <div className="relative cursor-pointer" ref={menuRef}>
                  <div className="p-2" onClick={() => setIsEdit(true)}>
                    <Image src={threeDots} alt="threeDots" />
                  </div>
                  {isEdit && (
                    <div className="absolute right-0 top-6 w-[136px] rounded-[6px] border-[0.5px] border-[#00000033] bg-white p-1 shadow-xl">
                      <div
                        onClick={() => {
                          setIsEdit(false);
                          router.push(
                            `/services/update-service/${serviceData?.id}`,
                          );
                        }}
                        className="p-[10px] text-[12px] leading-none hover:bg-green-3"
                      >
                        {placeholders.edit_service}
                      </div>
                      <button
                        onClick={() => {
                          setIsEdit(false);
                          setIsDeleteModalOpen(true);
                        }}
                        className="w-full p-[8px] text-start text-[12px] leading-none hover:bg-green-3"
                      >
                        {placeholders.delete_service}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Image
                  className="h-[44px] w-[44px] rounded-full bg-gray-12 object-cover"
                  src={user?.image ?? noImageAvtar}
                  alt="profile"
                  height={100}
                  width={100}
                  unoptimized
                />
                <div>
                  <h4 className="text-[14px] text-[#030303]">{user?.name ?? ""}</h4>
                  <h4 className="text-[14px] font-light text-[#4B514F]">
                    {user?.email ?? ""}
                  </h4>
                </div>
              </div>

              <h3 className="mt-2 text-[14px] font-light text-[#4B514F]">
                {reviewCount}{" "}
                {reviewCount === 1 ? placeholders.review : placeholders.reviews}
              </h3>

              <div className="mt-4 flex justify-between border-t border-[#E5E5E5] px-1.5 py-4">
                <span className="text-[15px] font-medium">
                  {placeholders.category}
                </span>
                <span className="text-[15px] font-light leading-none">
                  {getFeedCategoryLabel(serviceData?.category, currentLanguage)}
                </span>
              </div>

              {serviceData?.parameters?.map(
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

          <MyServiceRequests />
        </div>
      </div>
    </div>
  );
}

export default ServiceDetail;
