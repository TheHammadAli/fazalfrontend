"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Heart, Share2, Flag } from "lucide-react";
import chevron from "@/assets/icons/chev-down-icon.svg";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import noImageAvtar from "@/assets/images/no-image-av.png";
import defaultProfileAvatar from "@/assets/images/default-profile-avatar.svg";
import { getUserId } from "@/utils/getUserId";
import { formatPrice } from "@/utils/formatPrice";
import useInitiateChat from "@/custom-hooks/useInitiateChat";
import Reviews from "../Ui/Reviews";
import { useGetAvgReviewsQuery } from "@/store/services/reviewService";
import { getFeedCategoryLabel } from "@/utils/getFeedCategoryLabel";
import { hasRealProfileImage } from "@/utils/hasRealProfileImage";
import { useRequireSignIn } from "@/custom-hooks/useRequireSignIn";
import Modal from "../Ui/Modals/Modal";
import SharePostModal from "../Ui/SharePostModal";
import ReportModal, { type ReportReason } from "../Ui/ReportModal";
import { useCreateReportMutation } from "@/store/services/reportsService";
import DoodleButton from "@/components/Ui/DoodleButton";
import verifiedIcon from "@/assets/icons/verified.svg";
import verifiedBlackIcon from "@/assets/icons/verified-black.svg";
import completedTickGrayIcon from "@/assets/icons/completed-tick-gray.svg";
import toast from "react-hot-toast";
import { formatJoinedDate } from "@/utils/formatJoinedDate";
import {
  useLikeVideoMutation,
  useUnlikeVideoMutation,
} from "@/store/services/feedService";
import { useGetProductOwnerDetailQuery } from "@/store/services/authService";
import {
  useTrackServiceViewMutation,
  useTrackServiceContactClickMutation,
  useTrackServiceWhatsappClickMutation,
} from "@/store/services/sellingService";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { buildListingUrl } from "@/utils/getPublicAppOrigin";

function buildWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // api.whatsapp.com preserves links in prefilled text more reliably than wa.me
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ChatProviderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
      />
    </svg>
  );
}

function TrustSafetyIcon() {
  return (
    <div className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-[#EAF1FB]">
      <Image src={verifiedIcon} alt="" aria-hidden className="h-[18px] w-[18px]" />
    </div>
  );
}

function BuyServiceDetail({
  service,
  setOpenPciker,
  checkReview,
}: any) {
  const userId = getUserId() ?? "";
  const { requireSignIn } = useRequireSignIn();
  const { pages, placeholders, currentLanguage, error_messages, info_messages } =
    useDictionary();
  const sharePostRef = useRef<HTMLDivElement>(null);
  const reportModalRef = useRef<HTMLDivElement>(null);
  const [type, setType] = useState("image");
  const [typeIndex, setTypeIndex] = useState(0);
  const [shareModal, setShareModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [createReport, { isLoading: isSubmittingReport }] = useCreateReportMutation();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);
  const [providerAvatarFailed, setProviderAvatarFailed] = useState(false);
  const isLikePendingRef = useRef(false);
  const ownerData = service?.data?.ownerId;
  const providerUserId = ownerData?.id || ownerData?._id || "";
  const sellerPhoneFromService = ownerData?.phone;
  const { data: sellerDetail } = useGetProductOwnerDetailQuery(providerUserId, {
    skip: !providerUserId || Boolean(sellerPhoneFromService),
  });
  const sellerPhone = sellerPhoneFromService ?? sellerDetail?.data?.phone;
  const providerAvatarSrc =
    service?.data?.ownerId && hasRealProfileImage(ownerData?.image) && !providerAvatarFailed
      ? ownerData.image
      : defaultProfileAvatar;
  const serviceId = service?.data?.id ?? service?.data?._id ?? "";
  const isOwner =
    Boolean(userId) && userId === providerUserId;
  const allowedToBuy = !isOwner;
  const allowMessageAndReview = !isOwner;

  const { data: avgReview } = useGetAvgReviewsQuery(
    { type: "service", id: service?.data?.id ?? "" },
    { skip: !service?.data?.id },
  );
  const reviewCount = avgReview?.data?.count ?? 0;
  const { onInitiateChat, isLoading } = useInitiateChat();
  const [trackServiceView] = useTrackServiceViewMutation();
  const [trackServiceContactClick] = useTrackServiceContactClickMutation();
  const [trackServiceWhatsappClick] = useTrackServiceWhatsappClickMutation();
  const [likeVideo, { isLoading: isLikeLoading }] = useLikeVideoMutation();
  const [unlikeVideo, { isLoading: isUnlikeLoading }] = useUnlikeVideoMutation();
  const [mounted, setMounted] = useState(false);
  const showLikeAndShare = mounted && Boolean(userId);

  const videoSrc =
    typeof service?.data?.video === "string" &&
      service.data.video.trim() !== ""
      ? service.data.video.trim()
      : null;

  const imageCount = service?.data?.images?.length ?? 0;
  const imageSlides =
    (service?.data?.images as string[] | undefined)?.map((src: string) => ({
      src,
    })) ?? [];

  const openImageLightbox = (index: number) => {
    if (!imageSlides.length) return;
    setType("image");
    setTypeIndex(index);
    setImageLightboxOpen(true);
  };

  const showImageCounter =
    (type === "image" || !videoSrc) && imageCount > 0;

  const paymentTypeLabel =
    placeholders?.[
      service?.data?.paymentType as keyof typeof placeholders
    ]?.toString().toLowerCase() ?? service?.data?.paymentType ?? "";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Server dedupes per (service, user, day); this ref just stops a re-render from firing it
  // again for the same service within this mount.
  const trackedViewForServiceId = useRef<string | null>(null);
  useEffect(() => {
    if (!serviceId || !userId || isOwner) return;
    if (trackedViewForServiceId.current === serviceId) return;
    trackedViewForServiceId.current = serviceId;
    trackServiceView(serviceId);
  }, [serviceId, userId, isOwner, trackServiceView]);

  useEffect(() => {
    if (type === "video" && !videoSrc) {
      setType("image");
    }
  }, [type, videoSrc]);

  useEffect(() => {
    if (isLikePendingRef.current) return;
    setIsLiked(Boolean(service?.data?.isLiked));
    setLikesCount(Number(service?.data?.likesCount) || 0);
  }, [service?.data?.isLiked, service?.data?.likesCount, serviceId]);

  const onLikeClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!serviceId || isLikeLoading || isUnlikeLoading) return;

    const prevIsLiked = isLiked;
    const nextIsLiked = !prevIsLiked;
    isLikePendingRef.current = true;
    setIsLiked(nextIsLiked);
    setLikesCount((count) => Math.max(0, count + (nextIsLiked ? 1 : -1)));

    const req = prevIsLiked
      ? unlikeVideo({ itemId: serviceId, itemType: "service" }).unwrap()
      : likeVideo({
        itemId: serviceId,
        itemType: "service",
        ownerModel: "User",
      }).unwrap();

    req
      .catch(() => {
        setIsLiked(prevIsLiked);
        setLikesCount((count) => Math.max(0, count + (nextIsLiked ? -1 : 1)));
        toast.error(error_messages.something_went_wrong);
      })
      .finally(() => {
        isLikePendingRef.current = false;
      });
  };

  const onShareClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setShareModal(true);
  };

  const onReportClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    requireSignIn(() => setReportModal(true));
  };

  const handleSubmitReport = async (payload: { reason: ReportReason; details: string }) => {
    if (!serviceId) return;
    try {
      await createReport({
        entityId: serviceId,
        entityType: "service",
        reason: payload.reason,
        details: payload.details,
      }).unwrap();
      toast.success(placeholders.report_submitted_success);
      setReportModal(false);
    } catch (err) {
      const errorData = err as { data?: { message?: string } };
      toast.error(errorData?.data?.message ?? error_messages.something_went_wrong);
    }
  };

  const shareUrl =
    mounted && serviceId
      ? `${window.location.origin}/book-service?id=${serviceId}`
      : "";

  const handleMessageProvider = () => {
    requireSignIn(() => {
      const title = service?.data?.title ?? "";
      const listingUrl = serviceId
        ? buildListingUrl(`/${currentLanguage}/book-service?id=${serviceId}`)
        : "";
      const initialMessage = [
        info_messages.interested_in_this_service,
        title,
        listingUrl,
      ]
        .filter(Boolean)
        .join("\n");

      onInitiateChat(userId, providerUserId, initialMessage);

      if (serviceId) {
        trackServiceContactClick(serviceId);
      }
    });
  };

  const handleWhatsAppContact = () => {
    if (!sellerPhone) {
      toast.error(error_messages.seller_phone_unavailable);
      return;
    }

    const title = service?.data?.title ?? "";
    const listingUrl = serviceId
      ? buildListingUrl(`/${currentLanguage}/book-service?id=${serviceId}`)
      : "";

    // Blank line before URL helps WhatsApp auto-detect it as a tappable link.
    const message = [
      info_messages.interested_in_this_service,
      title,
      listingUrl ? `\n${listingUrl}` : "",
    ]
      .filter(Boolean)
      .join("\n")
      .trim();

    const url = buildWhatsAppUrl(sellerPhone, message);
    if (!url) {
      toast.error(error_messages.seller_phone_unavailable);
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");

    if (serviceId) {
      trackServiceWhatsappClick(serviceId);
    }
  };

  const parameters = service?.data?.parameters ?? [];

  const joinedDateLabel = formatJoinedDate(ownerData?.createdAt, currentLanguage);

  return (
    <div>
      <Modal
        editModalRef={sharePostRef}
        open={shareModal}
        setOpen={setShareModal}
        centered={true}
      >
        <SharePostModal
          type={placeholders.service}
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

      <div className="flex min-h-screen flex-col items-center">
        <div className="flex h-[61px] w-full justify-center border-b border-gray-9 bg-white px-5 sm:px-10">
          <div className="mt-5 flex w-full items-center gap-[6px] text-[14px] font-normal">
            <span className="text-gray-8">{pages.home}</span>
            <Image
              src={chevron}
              alt="chevron"
              className="-rotate-90 rtl:rotate-90"
            />
            <span className="text-green-1">{service?.data?.title}</span>
          </div>
        </div>

        <div className="w-full px-5 py-6 sm:px-10">
          <div className="flex flex-col gap-8 sm:flex-row">
            <div className="w-full space-y-2 md:w-[52%]">
              <div className="relative h-[220px] overflow-hidden rounded-[10px] sm:h-[320px] md:h-[500px]">
                {type === "image" || !videoSrc ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (service?.data?.images?.length > 0) {
                        openImageLightbox(typeIndex);
                      }
                    }}
                    className="h-full w-full cursor-zoom-in border-0 bg-transparent p-0"
                    aria-label="View image fullscreen"
                  >
                    <Image
                      src={
                        service?.data?.images?.length > 0
                          ? service?.data?.images?.[typeIndex]
                          : noImageAvtar
                      }
                      height={100}
                      width={100}
                      unoptimized
                      alt="service"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <video
                    src={`${videoSrc}?t=${Date.now()}`}
                    controls
                    autoPlay={false}
                    className="h-full w-full object-contain"
                  />
                )}
                {showImageCounter && (
                  <div className="absolute bottom-4 z-10 rounded-md bg-[#2C2C2C]/80 px-2.5 py-[3px] text-[12px] font-normal text-white ltr:right-4 rtl:left-4">
                    {typeIndex + 1}/{imageCount}
                  </div>
                )}
                {showLikeAndShare && (
                  <div className="absolute top-4 z-10 flex items-center gap-3 ltr:right-4 rtl:left-4">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={onLikeClick}
                        className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-white text-white shadow-menu"
                        aria-label="Like"
                      >
                        <Heart
                          className="h-5 w-5"
                          stroke={isLiked ? undefined : "black"}
                          strokeWidth={isLiked ? undefined : 2.25}
                          fill={isLiked ? "green" : "none"}
                        />
                      </button>
                      {likesCount > 0 && (
                        <span className="rounded-full bg-[#2C2C2C]/80 px-1.5 py-[3px] text-[11px] font-medium text-white">
                          {likesCount}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={onShareClick}
                      className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-menu"
                      aria-label="Share"
                    >
                      <Share2 className="h-5 w-5" strokeWidth={2.25} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex w-full flex-wrap gap-2">
                {service?.data?.images?.map((image: string, index: number) => (
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
                      src={image}
                      height={100}
                      width={100}
                      alt="service"
                      unoptimized
                      className="h-[96px] w-[96px] object-cover md:w-[154px]"
                    />
                  </div>
                ))}
                {videoSrc ? (
                  <video
                    onClick={() => setType("video")}
                    src={videoSrc}
                    controls={false}
                    className={`h-[96px] w-[96px] cursor-pointer rounded-[10px] border object-cover md:w-[154px] ${type === "video" ? "border-green-1" : "border-transparent"
                      }`}
                  />
                ) : null}
              </div>

              <div className="mt-10 text-[14px] font-medium text-[#4B514F]">
                {placeholders.description}
              </div>
              <div className="text-[15px] text-[#030303]">
                {service?.data?.description ?? ""}
              </div>
              <div className="mt-8">
                <Reviews
                  type="service"
                  id={service?.data?.id || service?.data?._id}
                  allowAddReview={checkReview?.canReview}
                  requestId={checkReview?.requestId}
                />
              </div>
            </div>

            <div className="w-full md:w-[48%]">
              <h3 className="text-[24px] font-medium capitalize text-[#030303]">
                {service?.data?.title ?? ""}
              </h3>
              {service?.data?.price && Number(service?.data?.price) > 0 ? <div className="mt-2 text-[28px] font-medium text-[#3C9197]">
                {placeholders.Rs} {formatPrice(service?.data?.price)}
                {paymentTypeLabel ? `/${paymentTypeLabel}` : ""}
              </div> : <div className="mt-2 text-[28px] font-medium text-[#3C9197]">{placeholders.call_for_price}</div>}

              {allowMessageAndReview && (
                <div className="mt-8 flex gap-3">
                  <DoodleButton
                    type="button"
                    disabled={isLoading}
                    onClick={handleMessageProvider}
                    className="flex h-[46px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-1 text-[16px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isLoading ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <ChatProviderIcon className="h-5 w-5 shrink-0" />
                    )}
                    {placeholders.message_provider}
                  </DoodleButton>
                  <button
                    type="button"
                    onClick={handleWhatsAppContact}
                    className="flex h-[46px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-green-1 bg-white text-[16px] font-medium text-green-1"
                  >
                    <WhatsAppIcon className="h-5 w-5 shrink-0 text-[#25D366]" />
                    {placeholders.whatsapp}
                  </button>
                </div>
              )}

              {mounted &&
                allowedToBuy &&
                (
                  <DoodleButton
                    type="button"
                    onClick={() => requireSignIn(() => setOpenPciker?.(true))}
                    className="mt-4 flex h-[46px] w-full cursor-pointer items-center justify-center rounded-xl border border-green-1 bg-green-1 text-[16px] font-medium text-white hover:bg-white hover:text-green-1 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {placeholders.book_now}
                  </DoodleButton>
                )}

              {allowMessageAndReview && (
                <button
                  type="button"
                  onClick={onReportClick}
                  className="mt-3 flex h-[42px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#E5E5E5] text-[14px] font-medium text-[#4B514F] hover:border-red-1 hover:text-red-1"
                >
                  <Flag className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {placeholders["report" as keyof typeof placeholders] ?? "Report"}
                </button>
              )}

              {allowedToBuy && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <Image
                    src={verifiedBlackIcon}
                    alt=""
                    aria-hidden
                    className="h-[18px] w-[18px] shrink-0"
                  />
                  <p className="text-[14px] font-normal text-[#4B514F]">
                    {placeholders.secure_transactions}
                  </p>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Image
                  className="h-[44px] w-[44px] rounded-full object-cover"
                  src={providerAvatarSrc}
                  alt="profile"
                  height={100}
                  width={100}
                  unoptimized
                  onError={() => setProviderAvatarFailed(true)}
                />
                <div>
                  <h4 className="text-[14px] text-[#030303]">
                    {service?.data?.ownerId ? ownerData?.name : ""}
                  </h4>
                  <h4 className="text-[14px] font-light text-[#4B514F]">
                    {service?.data?.ownerId ? ownerData?.email : ""}
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
                  {getFeedCategoryLabel(service?.data?.category, currentLanguage)}
                </span>
              </div>

              {mounted &&
                parameters.map(
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

              {allowedToBuy && (
                <>
                  <div className="mt-8 border-t border-[#E5E5E5] pt-6">
                    <h4 className="text-[15px] font-medium text-[#030303]">
                      {placeholders.service_provider_information}
                    </h4>
                    <div className="mt-4 space-y-5">
                      <div className="mt-4 flex items-center gap-2">
                        <Image
                          className="h-[44px] w-[44px] rounded-full object-cover"
                          src={providerAvatarSrc}
                          alt="profile"
                          height={100}
                          width={100}
                          unoptimized
                          onError={() => setProviderAvatarFailed(true)}
                        />
                        <div>
                          <h4 className="text-[14px] text-[#030303]">
                            {service?.data?.ownerId ? ownerData?.name : ""}
                          </h4>
                          <h4 className="text-[14px] font-light text-[#4B514F]">
                            {service?.data?.ownerId ? ownerData?.email : ""}
                          </h4>
                        </div>
                      </div>
                      {joinedDateLabel ? (
                        <div className="mt-3 flex items-center gap-2">
                          <Image
                            src={completedTickGrayIcon}
                            alt=""
                            aria-hidden
                            className="h-5 w-5 shrink-0"
                          />
                          <p className="text-[14px] font-normal text-[#4B514F]">
                            {placeholders.joined} {joinedDateLabel}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-8 border-t border-[#E5E5E5] pt-6">
                    <h4 className="text-[15px] font-medium text-[#030303]">
                      {placeholders.trust_and_safety}
                    </h4>
                    <div className="mt-4 space-y-5">
                      {[
                        {
                          title: placeholders.verified_provider,
                          description: placeholders.identity_verified,
                        },
                        {
                          title: placeholders.safe_payments,
                          description: placeholders.safe_payments_description,
                        },
                        {
                          title: placeholders.buyers_protection,
                          description: placeholders.buyers_protection_service_description,
                        },
                      ].map((item) => (
                        <div key={item.title} className="flex items-center gap-3">
                          <TrustSafetyIcon />
                          <div>
                            <p className="text-[15px] font-medium text-[#030303]">
                              {item.title}
                            </p>
                            <p className="mt-0.5 text-[13px] font-light text-[#4B514F]">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {imageSlides.length > 0 ? (
        <Lightbox
          open={imageLightboxOpen}
          close={() => setImageLightboxOpen(false)}
          index={typeIndex}
          slides={imageSlides}
          on={{
            view: ({ index: nextIndex }) => setTypeIndex(nextIndex),
          }}
        />
      ) : null}
    </div>
  );
}

export default BuyServiceDetail;
