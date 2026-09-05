"use client";
import Image from "next/image";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import DoodleButton from "@/components/Ui/DoodleButton";
import chevron from "@/assets/icons/chev-down-icon.svg";
import profileImg from "@/assets/images/dummy-profile-image.jpg";
import tickGray from "@/assets/icons/completed-tick-gray.svg";
import locationIcon from "@/assets/icons/location-gray.svg";
import ShopProducts from "./ShopProducts";
import {
  useGetShopDetailQuery,
  useTrackShopViewMutation,
} from "@/store/services/sellingService";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ShopInfoSkelton from "./ShopInfoSkelton";
import { useGetUserDetailQuery } from "@/store/services/profileService";
import noImageAvtar from "@/assets/images/no-image-av.png";
import noImageIcon from "@/assets/images/new-no-image-placeholder.png";
import Modal from "../Ui/Modals/Modal";
import SharePostModal from "../Ui/SharePostModal";
import ReportModal, { type ReportReason } from "../Ui/ReportModal";
import { getUserId } from "@/utils/getUserId";
import { useCreateReportMutation } from "@/store/services/reportsService";
import { useRequireSignIn } from "@/custom-hooks/useRequireSignIn";
import toast from "react-hot-toast";

function resolveEntityId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as { id?: string; _id?: string };
    return record.id ?? record._id ?? null;
  }
  return null;
}

function getShopMapUrl(shop: {
  address?: string;
  location?: {
    coordinates?: number[] | { lat?: number; lng?: number };
  };
}): string | null {
  const coordinates = shop?.location?.coordinates;

  // Shops store GeoJSON Point coords as [lng, lat]; Google Maps expects lat,lng
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const [lng, lat] = coordinates;
    if (lat != null && lng != null) {
      return `https://www.google.com/maps?q=${lat},${lng}&z=17`;
    }
  }

  if (
    coordinates &&
    !Array.isArray(coordinates) &&
    coordinates.lat != null &&
    coordinates.lng != null
  ) {
    return `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}&z=17`;
  }

  const address = shop?.address?.trim();
  if (!address) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-9 py-2.5 last:border-b-0">
      <span className="shrink-0 text-[14px] font-normal text-[#4B514F]">
        {label}
      </span>
      <span className="min-w-0 break-words text-right text-[14px] font-normal text-[#030303]">
        {value}
      </span>
    </div>
  );
}

export default function ShopDetail() {
  const router = useRouter();
  const { pages, placeholders, info_messages, error_messages } = useDictionary();
  const id = useSearchParams().get("id");
  const userId = getUserId() ?? "";
  const [shareModal, setShareModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sharePostRef = useRef<HTMLDivElement>(null);
  const reportModalRef = useRef<HTMLDivElement>(null);
  const { requireSignIn } = useRequireSignIn();
  const [createReport, { isLoading: isSubmittingReport }] = useCreateReportMutation();
  const {
    data: shop,
    isLoading: isShopLoading,
    isSuccess: isShopSuccess,
    isFetching: isShopFetching,
  } = useGetShopDetailQuery(id, {
    skip: !id,
  });
  const shopOwnerId = resolveEntityId(shop?.data?.ownerId);
  const isShopOwner = Boolean(userId && shopOwnerId && userId === shopOwnerId);
  const shopData = shop?.data;

  const [trackShopView] = useTrackShopViewMutation();
  const trackedViewForId = useRef<string | null>(null);

  useEffect(() => {
    if (!id) {
      router.back();
    }
  }, []);

  useEffect(() => {
    if (!isShopSuccess || !id || !userId || isShopOwner) return;
    if (trackedViewForId.current === id) return;
    trackedViewForId.current = id;
    trackShopView(id);
  }, [isShopSuccess, id, userId, isShopOwner, trackShopView]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shareUrl =
    mounted && id
      ? `${window.location.origin}/selling/shop-detail?id=${id}`
      : "";

  async function handleSubmitReport(payload: { reason: ReportReason; details: string }) {
    if (!shopData?.id) return;
    try {
      await createReport({
        entityId: shopData.id,
        entityType: "shop",
        reason: payload.reason,
        details: payload.details,
      }).unwrap();
      toast.success(placeholders.report_submitted_success);
      setReportModal(false);
    } catch (err) {
      const errorData = err as { data?: { message?: string } };
      toast.error(errorData?.data?.message ?? error_messages.something_went_wrong);
    }
  }

  return (
    <div className="w-full ">
      <Modal
        editModalRef={sharePostRef}
        open={shareModal}
        setOpen={setShareModal}
        centered={true}
      >
        <SharePostModal
          type={placeholders.shop}
          setShareModal={setShareModal}
          shareUrl={shareUrl}
          shareService={true}
        />
      </Modal>
      <Modal
        editModalRef={reportModalRef}
        open={reportModal}
        setOpen={setReportModal}
        centered={true}
      >
        <ReportModal setOpen={setReportModal} onSubmit={handleSubmitReport} loading={isSubmittingReport} />
      </Modal>
      <div className=" px-5 md:px-6 h-[61px] border-b-[1px] border-gray-9 bg-[white] hide-scrollbar w-full  flex justify-center ">
        <div className="w-full min-w-max hide-scrollbar overflow-scroll flex items-center gap-[6px] font-normal text-[14px] mt-5">
          <span className="text-gray-8">{pages.selling}</span>
          <Image
            src={chevron}
            alt="chevron"
            className="-rotate-90 rtl:rotate-90"
          />
          <span className="text-gray-8">{placeholders.my_shops}</span>
          <Image
            src={chevron}
            alt="chevron"
            className="-rotate-90 rtl:rotate-90"
          />
          <span className="text-green-1">{shop?.data?.title ?? ""}</span>
        </div>
      </div>
      <div className=" min-h-screen  pt-4 px-5">
        {/* Sidebar */}
        <div
          className={`w-full h-[200px] sm:h-[240px] rounded-[24px] overflow-hidden ${isShopLoading || isShopFetching
            ? "bg-gray-200 animate-pulse"
            : shop?.data?.banner
              ? ""
              : "bg-gray-12 flex items-center justify-center"
            }`}
        >
          {!isShopLoading && !isShopFetching && shop?.data?.banner ? (
            <Image
              src={`${shop.data.banner}?t=${Date.now()}`}
              alt="banner"
              width={100}
              height={100}
              unoptimized
              className="w-full h-full object-cover"
            />
          ) : !isShopLoading && !isShopFetching ? (
            <Image
              src={noImageIcon}
              alt="no banner"

              unoptimized
              className="object-contain h-full w-full"
            />
          ) : null}
        </div>

        <div className="w-full   space-y-[16px] md:space-y-[20px]">

          <div>
            {isShopLoading || isShopFetching ? (
              <ShopInfoSkelton />
            ) : (
              <div className="space-y-[16px] md:space-y-[20px]">
                <div className="flex items-center sm:items-end justify-between gap-3 sm:pl-6 sm:rtl:pr-6 mt-5 sm:-mt-5">
                  <div className="flex items-center sm:items-end gap-[14px] min-w-0">
                    <div className="h-[80px] w-[80px] min-w-[80px] bg-white rounded-full sm:border-[white] sm:border-[5px] shadow-menu overflow-hidden">
                      <Image
                        src={
                          shop?.data?.image
                            ? `${shop.data.image}?t=${Date.now()}`
                            : noImageAvtar
                        }
                        alt="profile"
                        width={100}
                        height={100}
                        unoptimized
                        className="rounded-full h-full w-full object-cover"
                      />
                    </div>
                    <div className="pb-1 min-w-0">
                      <h2 className="text-[#030303] text-[14px] font-medium truncate">
                        {shop?.data?.title}
                      </h2>
                      <p className="text-[14px] font-normal text-[#4B514F] truncate">
                        {shopData?.ownerId?.email ?? ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShareModal(true)}
                      className="shrink-0 border border-green-1 text-green-1 bg-white rounded-xl px-6 h-[36px] text-[14px] font-medium cursor-pointer"
                    >
                      {placeholders.share}
                    </button>
                    {!isShopOwner && (
                      <button
                        type="button"
                        onClick={() => requireSignIn(() => setReportModal(true))}
                        className="shrink-0 border border-red-1 text-red-1 bg-white rounded-xl px-6 h-[36px] text-[14px] font-medium cursor-pointer"
                      >
                        {placeholders.report}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-[14px] font-normal">
                  <h3 className="text-[#4B514F]">{placeholders.about_us}</h3>
                  {isShopOwner ? (
                    <h3
                      className="text-green-1 cursor-pointer underline "
                      onClick={() =>
                        router.push(`/selling/update-shop?id=${shop?.data?.id}`)
                      }
                    >
                      {placeholders.edit}
                    </h3>
                  ) : null}
                </div>

                <div className=" font-light text-[15px] text-black-1 -mt-3">
                  <p className="leading-tight">{shopData?.description}</p>
                  <div className="mt-3 space-y-1">
                    <div className="flex gap-1.5  items-center">
                      <Image src={tickGray} alt="tick" />
                      <span className="text-gray-8 font-light text-[14px]">
                        {shopData?.ownerId?.email ?? ""}
                      </span>
                    </div>
                    {shopData?.address ? (
                      <a
                        href={getShopMapUrl(shopData) ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex gap-1.5 items-start cursor-pointer"
                      >
                        <Image
                          src={locationIcon}
                          alt="location"
                          className="mt-0.5 shrink-0"
                        />
                        <span className="break-words text-green-1 font-light text-[14px] hover:underline">
                          {shopData.address}
                        </span>
                      </a>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-[12px] border border-gray-9 px-3">
                    <DetailRow
                      label={
                        info_messages["market_name" as keyof typeof info_messages] ??
                        "Market name"
                      }
                      value={shopData?.marketName}
                    />
                    <DetailRow
                      label={info_messages.area ?? "Area"}
                      value={shopData?.area}
                    />
                    <DetailRow
                      label={info_messages.city ?? "City"}
                      value={shopData?.city}
                    />
                    <DetailRow
                      label={info_messages.contact_no ?? "Contact no"}
                      value={shopData?.contact}
                    />
                    <DetailRow
                      label={info_messages.opening_hours ?? "Opening hours"}
                      value={shopData?.openingHours}
                    />
                  </div>
                </div>

                {/* <div className="flex lg:justify-between gap-2 mt-4">
                  <div className="bg-gray-12 h-[73px] px-4 xl:px-6 w-[168px]  rounded-[14px] flex flex-col justify-center">
                    <p className="text-[14px] text-gray-8  font-normal">
                      {placeholders.total_orders}
                    </p>
                    <p className="font-medium text-[20px] text-black-1">{shop?.data?.ordersCount ?? 0}</p>
                  </div>

                  <div className="bg-gray-12 h-[73px]  px-4 xl:px-6 w-[168px]  rounded-[14px] flex flex-col justify-center">
                    <p className="text-[14px] text-gray-8  font-normal">
                      {placeholders.products_sold}
                    </p>
                    <p className="font-medium text-[20px] text-black-1">{shop?.data?.productsCount ?? 0}</p>
                  </div>
                </div> */}

                {isShopOwner ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <DoodleButton
                      onClick={() =>
                        router.push(`/selling/list-product?id=${shop?.data?.id}`)
                      }
                      className="px-4 w-[180px] bg-green-1 text-[14px] h-[40px] font-medium text-white flex items-center justify-center rounded-xl cursor-pointer"
                    >
                      {placeholders.list_product}
                    </DoodleButton>
                    <DoodleButton
                      onClick={() =>
                        router.push(`/selling/post-video?id=${shop?.data?.id}`)
                      }
                      className="px-4 w-[180px] bg-white border-[1px] border-green-1 text-green-1 text-[14px] h-[40px] font-medium flex items-center justify-center rounded-xl cursor-pointer"
                    >
                      {placeholders.post_video}
                    </DoodleButton>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="mt-4 pb-4">
          <ShopProducts />
        </div>
      </div>
    </div>
  );
}
