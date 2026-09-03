"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import {
  getFeedCategoryIcon,
  getFeedCategoryLabel,
} from "@/utils/getFeedCategoryLabel";
import { formatPrice } from "@/utils/formatPrice";
import CategoryImg from "@/assets/icons/category-icon.png";
import penIcon from "@/assets/icons/pen-icon.svg";
import shareNewIcon from "@/assets/icons/share-new-icon.svg";
import noImageAvtar from "@/assets/images/no-image-av.png";
import Modal from "../Ui/Modals/Modal";
import SharePostModal from "../Ui/SharePostModal";
import DoodleButton from "@/components/Ui/DoodleButton";
import type { ServiceDetailType } from "./ServiceDetail";

type Props = {
  serviceData: ServiceDetailType;
};

function MyOfferedServiceCard({ serviceData }: Props) {
  const router = useRouter();
  const { placeholders, currentLanguage, share_post } = useDictionary();
  const sharePostRef = useRef<HTMLDivElement>(null);
  const [shareModal, setShareModal] = useState(false);
  const [mounted] = useState(() => typeof window !== "undefined");

  const serviceId = serviceData?.id ?? serviceData?._id;
  const categoryLabel = getFeedCategoryLabel(
    serviceData?.category,
    currentLanguage,
  );
  const categoryIcon = getFeedCategoryIcon(serviceData?.category) ?? CategoryImg;
  const imageSrc =
    serviceData?.images?.length > 0
      ? serviceData.images[0]
      : noImageAvtar;
  const imageCacheKey =
    typeof imageSrc === "string" && serviceData?.updatedAt
      ? `${imageSrc}${imageSrc.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(serviceData.updatedAt))}`
      : imageSrc;

  const createdOn = serviceData?.updatedAt
    ? new Date(serviceData.updatedAt).toLocaleDateString(
      currentLanguage === "ur" ? "ur-PK" : "en-GB",
      { day: "2-digit", month: "short", year: "numeric" },
    )
    : "";

  const shareUrl =
    mounted && serviceId
      ? `${window.location.origin}/book-service?id=${serviceId}`
      : "";

  return (
    <>
      <Modal
        editModalRef={sharePostRef}
        open={shareModal}
        setOpen={setShareModal}
        centered={true}
      >
        <SharePostModal
          setShareModal={setShareModal}
          shareUrl={shareUrl}
          shareService
          type="service"
        />
      </Modal>

      <div className="flex w-full flex-col overflow-hidden rounded-[16px] border border-gray-9 bg-white md:flex-row">
        <div className="relative h-[180px] w-full shrink-0 sm:h-[220px] md:h-auto md:min-h-full md:w-[35%]">
          <Image
            key={typeof imageCacheKey === "string" ? imageCacheKey : "local"}
            src={imageCacheKey}
            alt={serviceData?.title || "service"}
            fill
            className="object-cover"

            unoptimized={typeof imageCacheKey === "string"}
          />
          <div className="absolute start-3 top-3 flex items-center gap-1.5 rounded-full bg-[#2C2C2C]/85 px-2.5 py-1">
            <span className="h-2 w-2 rounded-full bg-green-1" aria-hidden />
            <span className="text-[12px] font-medium text-white">
              {placeholders.active ?? "Active"}
            </span>
          </div>
        </div>

        <div className="px-4 pb-4 pt-4 sm:px-5 md:w-[65%]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Image
                src={categoryIcon}
                alt=""
                width={44}
                height={44}
                className="h-[36px] w-[36px] object-cover"
                unoptimized={typeof categoryIcon === "string"}
              />
              <div className="min-w-0">
                <h3 className="truncate text-[16px] font-semibold text-black-1">
                  {serviceData?.title}
                </h3>
                <p className="mt-0.5 truncate text-[13px] font-normal text-gray-8">
                  {categoryLabel}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-end">
              <p className="text-[12px] font-normal text-gray-8">
                {placeholders.starting_from ?? "Starting from"}
              </p>
              {serviceData?.price ? <p className="text-[18px] font-semibold text-green-1">
                {placeholders.Rs} {formatPrice(serviceData?.price)}
              </p> : <p className="text-[18px] font-semibold text-green-1">{placeholders.call_for_price}</p>}
            </div>
          </div>

          <div className="mt-4 w-full border-t border-gray-9 pt-3">
            <h4 className="text-[15px] font-medium text-black-1">
              {serviceData?.description
                ? serviceData.description.slice(0, 80) +
                (serviceData.description.length > 80 ? "…" : "")
                : serviceData?.title}
            </h4>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[12px] text-gray-8">
                  {placeholders.category}
                </p>
                <p className="mt-0.5 text-[13px] font-medium text-black-1">
                  {categoryLabel}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-gray-8">
                  {placeholders.created_on ?? "Created on"}
                </p>
                <p className="mt-0.5 text-[13px] font-medium text-black-1">
                  {createdOn}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() =>
                router.push(`/services/update-service/${serviceId}`)
              }
              className="flex h-[42px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-green-1 text-[14px] font-medium text-green-1"
            >
              <Image src={penIcon} alt="" className="h-4 w-4" />
              {placeholders.edit_service}
            </button>
            <button
              type="button"
              onClick={() => setShareModal(true)}
              className="flex h-[42px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-green-1 text-[14px] font-medium text-green-1"
            >
              <Image src={shareNewIcon} alt="" className="h-4 w-4" />
              {share_post?.share_service ?? "Share service"}
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-[12px] bg-green-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-green-1">
                {placeholders.your_service_is_live}
              </p>
              <p className="mt-0.5 text-[13px] font-normal leading-snug text-gray-8">
                {placeholders.share_service_get_requests}
              </p>
            </div>
            <DoodleButton
              type="button"
              onClick={() => router.push(`/book-service?id=${serviceId}`)}
              className="h-[40px] shrink-0 cursor-pointer rounded-[6px] bg-green-1 px-4 text-[14px] font-normal text-white hover:opacity-90"
            >
              {placeholders.view_public_service}
            </DoodleButton>
          </div>
        </div>
      </div>
    </>
  );
}

export default MyOfferedServiceCard;
