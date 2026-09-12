"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Heart, Share2, Flag, Tag } from "lucide-react";
import chevron from "@/assets/icons/chev-down-icon.svg";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import noImageAvtar from "@/assets/images/no-image-av.png";
import defaultProfileAvatar from "@/assets/images/default-profile-avatar.svg";
import useInitiateChat from "@/custom-hooks/useInitiateChat";
import { getUserId } from "@/utils/getUserId";
import { formatPrice } from "@/utils/formatPrice";
import Reviews from "../Ui/Reviews";
import { useGetAvgReviewsQuery } from "@/store/services/reviewService";
import { useGetProductOwnerDetailQuery } from "@/store/services/authService";
import { getFeedCategoryLabel } from "@/utils/getFeedCategoryLabel";
import { hasRealProfileImage } from "@/utils/hasRealProfileImage";
import { useAppDispatch } from "@/store/store";
import { addToCart } from "@/store/reducers/cartReducer";
import toast from "react-hot-toast";
import { useRequireSignIn } from "@/custom-hooks/useRequireSignIn";
import Modal from "../Ui/Modals/Modal";
import SharePostModal from "../Ui/SharePostModal";
import ReportModal, { type ReportReason } from "../Ui/ReportModal";
import { useCreateReportMutation } from "@/store/services/reportsService";
import MakeOfferModal from "../Ui/MakeOfferModal";
import { useSubmitProductOfferMutation } from "@/store/services/productOfferService";
import DoodleButton from "@/components/Ui/DoodleButton";
import { useRouter } from "next/navigation";
import viewShopIcon from "@/assets/icons/view-shop-icon.svg";
import verifiedIcon from "@/assets/icons/verified.svg";
import verifiedBlackIcon from "@/assets/icons/verified-black.svg";
import tickCircleGrayIcon from "@/assets/icons/completed-tick-gray.svg";
import {
  useLikeVideoMutation,
  useUnlikeVideoMutation,
} from "@/store/services/feedService";
import {
  useTrackShopContactClickMutation,
  useTrackShopProductViewMutation,
  useTrackShopWhatsappClickMutation,
} from "@/store/services/sellingService";
import {
  useTrackProductViewMutation,
  useTrackProductContactClickMutation,
  useTrackProductWhatsappClickMutation,
} from "@/store/services/homeService";
import ShopProductsSlider from "./ShopProductsSlider";
import { formatJoinedDate } from "@/utils/formatJoinedDate";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { buildListingUrl } from "@/utils/getPublicAppOrigin";

function buildWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  // api.whatsapp.com preserves links in prefilled text more reliably than wa.me
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`;
}

function getProductMapUrl(product: {
  address?: string;
  location?: {
    coordinates?: number[] | { lat?: number; lng?: number };
  };
}): string | null {
  const coordinates = product?.location?.coordinates;

  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const [first, second] = coordinates;
    if (first != null && second != null) {
      return `https://www.google.com/maps?q=${first},${second}`;
    }
  }

  if (
    coordinates &&
    !Array.isArray(coordinates) &&
    coordinates.lat != null &&
    coordinates.lng != null
  ) {
    return `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;
  }

  const address = product?.address?.trim();
  if (!address) return null;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function resolveEntityId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as { id?: string; _id?: string };
    return record.id ?? record._id ?? null;
  }
  return null;
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

function ChatStoreIcon({ className }: { className?: string }) {
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

function BuyProductDetail({
  setStep,
  product,
  shopData,
  ownerData,
  selectedVariants,
  setSelectedVariants,
}: any) {
  const userId = getUserId() ?? "";
  const router = useRouter();
  const { requireSignIn } = useRequireSignIn();
  const { onInitiateChat, isLoading } = useInitiateChat();
  const [trackShopContactClick] = useTrackShopContactClickMutation();
  const [trackShopProductView] = useTrackShopProductViewMutation();
  const [trackShopWhatsappClick] = useTrackShopWhatsappClickMutation();
  const [trackProductView] = useTrackProductViewMutation();
  const [trackProductContactClick] = useTrackProductContactClickMutation();
  const [trackProductWhatsappClick] = useTrackProductWhatsappClickMutation();
  const dispatch = useAppDispatch();
  const { pages, placeholders, currentLanguage, info_messages, error_messages } = useDictionary();
  const sharePostRef = React.useRef<HTMLDivElement>(null);
  const reportModalRef = React.useRef<HTMLDivElement>(null);
  const offerModalRef = React.useRef<HTMLDivElement>(null);
  const [type, setType] = useState("image");
  const [typeIndex, setTypeIndex] = useState(0);
  const [shareModal, setShareModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [offerModal, setOfferModal] = useState(false);
  const [createReport, { isLoading: isSubmittingReport }] = useCreateReportMutation();
  const [submitProductOffer, { isLoading: isSubmittingOffer }] = useSubmitProductOfferMutation();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);
  const [sellerAvatarFailed, setSellerAvatarFailed] = useState(false);
  const isLikePendingRef = React.useRef(false);
  const productId = product?.data?.id ?? product?.data?._id ?? "";
  const productAddress = product?.data?.address?.trim() || "";
  const productMapUrl = productAddress ? getProductMapUrl(product.data) : null;

  useEffect(() => {
    if (!product?.data?.parameters?.length || !setSelectedVariants) return;

    setSelectedVariants((prev: Record<string, string>) => {
      const next = { ...prev };
      let changed = false;

      for (const parameter of product.data.parameters) {
        const firstVariant = parameter?.variants?.[0];
        if (firstVariant && !next[parameter.name]) {
          next[parameter.name] = firstVariant;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [product?.data?.parameters, setSelectedVariants]);

  const isClassified = product?.data?.type === "classified";
  // const { data: avgReview } = useGetAvgReviewsQuery(
  //   { type: "product", id: product?.data?.id ?? "" },
  //   { skip: !product?.data?.id },
  // );

  // const reviewCount = avgReview?.data?.count ?? 0;
  const shopId =
    resolveEntityId(product?.data?.shopId) ?? resolveEntityId(shopData);
  const hasShop = Boolean(shopId) || Boolean(product?.data?.shopId);
  const shopOwnerId = resolveEntityId(shopData?.ownerId);
  const isOwner = hasShop
    ? Boolean(userId) && userId === shopOwnerId
    : Boolean(userId) && userId === (ownerData?.id || ownerData?._id);
  const allowedToBuy = !isOwner;
  const allowMessage = allowedToBuy;
  const allowAddReview = allowedToBuy;
  const showPurchaseActions = allowedToBuy && !isClassified;
  const showWhatsAppContact = allowedToBuy && isClassified && !hasShop;
  const showShopActions = allowedToBuy;
  const sellerPhoneFromProduct = product?.data?.shopId
    ? shopData?.ownerId?.phone
    : ownerData?.phone;
  const sellerUserId = hasShop
    ? shopOwnerId
    : ownerData?.id || ownerData?._id;
  const { data: sellerDetail } = useGetProductOwnerDetailQuery(sellerUserId ?? "", {
    skip: !sellerUserId || Boolean(sellerPhoneFromProduct),
  });
  const sellerPhone = sellerPhoneFromProduct ?? sellerDetail?.data?.phone;
  const sellerAvatarSrc =
    product?.data?.shopId && hasRealProfileImage(shopData?.image) && !sellerAvatarFailed
      ? shopData.image
      : product?.data?.ownerId && hasRealProfileImage(ownerData?.image) && !sellerAvatarFailed
        ? ownerData.image
        : defaultProfileAvatar;

  const trackedProductViewForShop = React.useRef<string | null>(null);
  useEffect(() => {
    if (!hasShop || !shopId || !userId || isOwner) return;
    if (trackedProductViewForShop.current === shopId) return;
    trackedProductViewForShop.current = shopId;
    trackShopProductView(shopId);
  }, [hasShop, shopId, userId, isOwner, trackShopProductView]);

  // Listing-level view — fires for every product (shop-owned or personal), unlike the
  // shop-scoped tracker above. Server dedupes per (product, user, day); this ref just stops a
  // re-render from firing it again for the same listing within this mount.
  const trackedViewForProductId = React.useRef<string | null>(null);
  useEffect(() => {
    if (!productId || !userId || isOwner) return;
    if (trackedViewForProductId.current === productId) return;
    trackedViewForProductId.current = productId;
    trackProductView(productId);
  }, [productId, userId, isOwner, trackProductView]);

  const joinedDateLabel = formatJoinedDate(
    hasShop ? shopData?.createdAt : ownerData?.createdAt,
    currentLanguage,
  );

  const [likeVideo, { isLoading: isLikeLoading }] = useLikeVideoMutation();
  const [unlikeVideo, { isLoading: isUnlikeLoading }] = useUnlikeVideoMutation();

  const [mounted, setMounted] = useState(false);
  const showLikeAndShare = mounted && Boolean(userId);

  const videoSrc =
    typeof product?.data?.video === "string" && product.data.video.trim() !== ""
      ? product.data.video.trim()
      : null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (type === "video" && !videoSrc) {
      setType("image");
    }
  }, [type, videoSrc]);

  useEffect(() => {
    if (isLikePendingRef.current) return;
    setIsLiked(Boolean(product?.data?.isLiked));
    setLikesCount(Number(product?.data?.likesCount) || 0);
  }, [product?.data?.isLiked, product?.data?.likesCount, productId]);

  const onLikeClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!productId || isLikeLoading || isUnlikeLoading) return;

    const prevIsLiked = isLiked;
    const nextIsLiked = !prevIsLiked;
    isLikePendingRef.current = true;
    setIsLiked(nextIsLiked);
    setLikesCount((count) => Math.max(0, count + (nextIsLiked ? 1 : -1)));

    const req = prevIsLiked
      ? unlikeVideo({ itemId: productId, itemType: "product" }).unwrap()
      : likeVideo({
        itemId: productId,
        itemType: "product",
        ownerModel: product?.data?.shopId ? "Shop" : "User",
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

  const onMakeOfferClick = () => {
    requireSignIn(() => setOfferModal(true));
  };

  const handleSubmitOffer = async (payload: { price?: number; message: string }) => {
    if (!productId) return;
    try {
      await submitProductOffer({
        productId,
        price: payload.price,
        message: payload.message,
      }).unwrap();
      toast.success(String(placeholders.offer_submitted_success ?? "Offer submitted"));
      setOfferModal(false);
    } catch (err) {
      const errorData = err as { data?: { message?: string } };
      toast.error(errorData?.data?.message ?? error_messages.something_went_wrong);
    }
  };

  const handleSubmitReport = async (payload: { reason: ReportReason; details: string }) => {
    if (!productId) return;
    try {
      await createReport({
        entityId: productId,
        entityType: "product",
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
    mounted && productId
      ? `${window.location.origin}/buy-product?id=${productId}`
      : "";

  const imageCount = product?.data?.images?.length ?? 0;
  const imageSlides =
    (product?.data?.images as string[] | undefined)?.map((src: string) => ({
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

  const handleAddToCart = () => {
    if (!product?.data?.id) return;
    requireSignIn(() => {
      const sellerLabel = product.data.shopId
        ? (shopData?.title ?? "")
        : product.data.ownerId
          ? (ownerData?.name ?? "")
          : "";
      const sellerImage =
        product.data.shopId && hasRealProfileImage(shopData?.image)
          ? shopData.image
          : product.data.ownerId && hasRealProfileImage(ownerData?.image)
            ? ownerData.image
            : "";

      dispatch(
        addToCart({
          productId: product.data.id,
          title: product.data.title,
          price: product.data.price,
          image: product.data.images?.[0] ?? "",
          shopId: product.data.shopId,
          ownerId: product.data.ownerId,
          selectedVariants: selectedVariants as Record<string, string>,
          sellerLabel,
          sellerImage,
        }),
      );
      toast.success(info_messages.added_to_cart);
    });
  };

  const handleWhatsAppContact = () => {
    if (!sellerPhone) {
      toast.error(error_messages.seller_phone_unavailable);
      return;
    }

    const title = product?.data?.title ?? "";
    const listingUrl = productId
      ? buildListingUrl(`/${currentLanguage}/buy-product?id=${productId}`)
      : "";

    // Blank line before URL helps WhatsApp auto-detect it as a tappable link.
    const message = [
      info_messages.interested_in_this_product,
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

    if (productId) {
      trackProductWhatsappClick(productId);
    }
    if (hasShop && shopId) {
      trackShopWhatsappClick(shopId);
    }
  };

  const handleChatStore = () => {
    requireSignIn(() => {
      const title = product?.data?.title ?? "";
      const listingUrl = productId
        ? buildListingUrl(`/${currentLanguage}/buy-product?id=${productId}`)
        : "";
      const initialMessage = [
        info_messages.interested_in_this_product,
        title,
        listingUrl,
      ]
        .filter(Boolean)
        .join("\n");

      onInitiateChat(userId, sellerUserId ?? "", initialMessage);

      if (productId) {
        trackProductContactClick(productId);
      }
      if (hasShop && shopId) {
        trackShopContactClick(shopId);
      }
    });
  };

  const handleViewShop = () => {
    const resolvedShopId =
      resolveEntityId(product?.data?.shopId) ?? resolveEntityId(shopData);
    if (!resolvedShopId) {
      toast.error(error_messages.something_went_wrong);
      return;
    }
    router.push(`/selling/shop-detail?id=${resolvedShopId}`);
  };

  return (
    <div className="">
      <Modal
        editModalRef={sharePostRef}
        open={shareModal}
        setOpen={setShareModal}
        centered={true}
      >
        <SharePostModal
          type={placeholders.product}
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
      <Modal
        editModalRef={offerModalRef}
        open={offerModal}
        setOpen={setOfferModal}
        centered={true}
      >
        <MakeOfferModal
          setOpen={setOfferModal}
          productImage={product?.data?.images?.[0]}
          productTitle={product?.data?.title ?? ""}
          productPrice={product?.data?.price ?? ""}
          onSubmit={handleSubmitOffer}
          loading={isSubmittingOffer}
        />
      </Modal>
      <div className="h-full min-h-screen flex flex-col items-center">
        <div className="px-5 sm:px-10 h-[61px] border-b-[1px] border-gray-9 bg-white w-full  flex justify-center">
          <div className="w-full   flex items-center gap-[6px] font-normal text-[14px] mt-5">
            <span className="text-gray-8">{pages.home}</span>
            <Image
              src={chevron}
              alt="chevron"
              className="-rotate-90 rtl:rotate-90"
            />
            <span className="text-green-1">{product?.data?.title}</span>
          </div>
        </div>

        <div className=" px-5 sm:px-10 py-6 w-full">
          <div className="">
            <div className="flex  flex-col sm:flex-row gap-8">
              <div className="space-y-2 w-full md:w-[52%]">
                <div className="relative   h-[220px]  sm:h-[320px] md:h-[500px] overflow-hidden rounded-[10px] bg-gray-12">
                  {type === "image" || !videoSrc ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (product?.data?.images?.length > 0) {
                          openImageLightbox(typeIndex);
                        }
                      }}
                      className="h-full w-full cursor-zoom-in border-0 bg-transparent p-0"
                      aria-label="View image fullscreen"
                    >
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
                        className="h-full w-full object-contain"
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
                    <div className="absolute text-[12px] bottom-4 z-10 rounded-md bg-[#2C2C2C]/80 px-2.5 py-[3px]  font-normal text-white ltr:right-4 rtl:left-4">
                      {typeIndex + 1}/{imageCount}
                    </div>
                  )}
                  {showLikeAndShare && (
                    <div className="absolute top-4 z-10 flex items-center gap-3 ltr:right-4 rtl:left-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={onLikeClick}
                          className={`flex h-[30px] w-[30px] cursor-pointer items-center shadow-menu justify-center rounded-full text-white bg-white`}
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
                        className="flex h-[30px] w-[30px] cursor-pointer items-center shadow-menu justify-center rounded-full bg-white text-black"
                        aria-label="Share"
                      >
                        <Share2 className="h-5 w-5" strokeWidth={2.25} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap w-full ">
                  {product?.data?.images?.map(
                    (image: string, index: number) => (
                      <div
                        key={index}
                        onClick={() => {
                          setTypeIndex(index);
                          setType("image");
                        }}
                        className={`rounded-[10px] border-[1px]  overflow-hidden  cursor-pointer bg-gray-12 ${typeIndex === index && type === "image"
                          ? " border-green-1"
                          : "border-transparent"
                          } h-[96px] w-[96px] md:w-[154px]`}
                      >
                        <Image
                          src={image}
                          height={100}
                          width={100}
                          alt="product"
                          unoptimized
                          className="h-[96px] w-[96px] md:w-[154px] object-contain"
                        />
                      </div>
                    ),
                  )}
                  {videoSrc ? (
                    <video
                      onClick={() => setType("video")}
                      src={videoSrc}
                      controls={false}
                      className={`h-[96px] w-[96px] md:w-[154px] border-[1px] object-cover rounded-[10px] cursor-pointer ${type === "video"
                        ? " border-green-1"
                        : "border-transparent"
                        }`}
                    />
                  ) : null}
                </div>
                <div className="text-[#4B514F] text-[14px] font-medium mt-10">
                  {placeholders.description}
                </div>
                <div className="text-[15px] text-[#030303] ">
                  {product?.data?.description ?? ""}
                </div>
                {productAddress ? (
                  <div className="mt-6">
                    <div className="text-[14px] font-medium text-[#4B514F]">
                      {placeholders["address" as keyof typeof placeholders] ?? "Address"}
                    </div>
                    {productMapUrl ? (
                      <a
                        href={productMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-words text-[15px] font-normal text-green-1 hover:underline"
                      >
                        {productAddress}
                      </a>
                    ) : (
                      <p className="mt-1 break-words text-[15px] font-normal text-[#030303]">
                        {productAddress}
                      </p>
                    )}
                  </div>
                ) : null}
                {/* <div className="mt-8">
                  <Reviews
                    type="product"
                    id={product?.data?.id || product?.data?._id}
                    allowAddReview={allowAddReview}
                  />
                </div> */}
              </div>
              <div className="w-full md:w-[48%] ">
                <h3 className="text-[#030303] first-letter:uppercase text-[24px] font-medium">
                  {product?.data?.title ?? ""}
                </h3>
                <div className="text-[#3C9197] text-[28px] font-medium mt-2 ">
                  {placeholders.Rs} {formatPrice(product?.data?.price)}
                </div>

                {mounted && showPurchaseActions && (
                  <button
                    type="button"
                    disabled={
                      Object.keys(selectedVariants).length !==
                      product?.data?.parameters?.length
                    }
                    onClick={handleAddToCart}
                    className="mt-8 flex h-[46px] w-full cursor-pointer items-center justify-center rounded-xl border border-green-1 bg-white text-[16px] font-medium text-green-1 hover:bg-green-1 hover:text-white disabled:pointer-events-none disabled:opacity-50"
                  >
                    {placeholders.add_cart}
                  </button>
                )}
                {mounted && showPurchaseActions && (
                  <DoodleButton
                    type="button"
                    disabled={
                      Object.keys(selectedVariants).length !==
                      product?.data?.parameters?.length
                    }
                    onClick={() => requireSignIn(() => setStep?.("cart"))}
                    className="mt-4 flex h-[46px] w-full cursor-pointer items-center justify-center rounded-xl border border-green-1 bg-green-1 text-[16px] font-medium text-white hover:bg-white hover:text-green-1 disabled:pointer-events-none disabled:opacity-50"
                  >
                    {placeholders.buy_now}
                  </DoodleButton>
                )}

                {showShopActions && (
                  <div className="mt-8 space-y-3">
                    <div className="flex gap-3">
                      <DoodleButton
                        type="button"
                        disabled={isLoading}
                        onClick={handleChatStore}
                        className="flex h-[46px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-1 text-[16px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isLoading ? (
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                          <ChatStoreIcon className="h-5 w-5 shrink-0" />
                        )}
                        {hasShop ? placeholders.chat_store : placeholders.message_seller}
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
                    {hasShop && (
                      <DoodleButton
                        type="button"
                        onClick={handleViewShop}
                        className="flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-1 text-[16px] font-medium text-white"
                      >
                        <Image src={viewShopIcon} alt="view-shop-icon" className="h-5 w-5 shrink-0" />
                        {placeholders.view_shop}
                      </DoodleButton>
                    )}
                  </div>
                )}
                {!isOwner && (
                  <div className="mt-3 flex gap-3">
                    <DoodleButton
                      type="button"
                      onClick={onMakeOfferClick}
                      className="flex h-[46px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-green-1 text-[16px] font-medium text-white"
                    >
                      <Tag className="h-5 w-5 shrink-0" strokeWidth={2} />
                      {placeholders.make_an_offer}
                    </DoodleButton>
                    <button
                      type="button"
                      onClick={onReportClick}
                      className="flex h-[46px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#E5E5E5] text-[16px] font-medium text-[#4B514F] hover:border-red-1 hover:text-red-1"
                    >
                      <Flag className="h-5 w-5 shrink-0" strokeWidth={2} />
                      {placeholders["report" as keyof typeof placeholders] ?? "Report"}
                    </button>
                  </div>
                )}
                {showShopActions && <div className="mt-2 flex items-center justify-center gap-2">
                  <Image
                    src={verifiedBlackIcon}
                    alt=""
                    aria-hidden
                    className="h-[18px] w-[18px] shrink-0"
                  />
                  <p className="text-[14px] font-normal text-[#4B514F]">
                    {placeholders.secure_transactions}
                  </p>
                </div>}

                <div className="space-y-2 sm:space-y-2 sm:flex sm:flex-wrap sm:justify-between items-center">

                  <div className="flex mt-4 items-center gap-2">
                    <Image
                      className="h-[44px] w-[44px] rounded-full object-cover "
                      src={sellerAvatarSrc}
                      alt="profile"
                      height={100}
                      width={100}
                      unoptimized
                      onError={() => setSellerAvatarFailed(true)}
                    />
                    <div>
                      <h4 className="text-[#030303] text-[14px]">
                        {product?.data?.shopId
                          ? shopData?.title
                          : product?.data?.ownerId
                            ? ownerData?.name
                            : ""}
                      </h4>
                      <h4 className="text-[#4B514F] text-[14px] font-light">
                        {product?.data?.shopId
                          ? shopData?.ownerId?.email
                          : product?.data?.ownerId
                            ? ownerData?.email
                            : ""}
                      </h4>
                    </div>
                  </div>

                  {/* {allowMessage && (
                    <button
                      disabled={isLoading}
                      onClick={() => {
                        requireSignIn(() => {
                          const sellerId = product?.data?.shopId
                            ? shopData?.ownerId
                            : ownerData?.id || ownerData?._id;
                          onInitiateChat(userId, sellerId ?? "");
                        });
                      }}
                      className=" cursor-pointer border-[1px] border-green-1 text-green-1 flex items-center justify-center rounded-lg h-[33px] w-[111px] text-[13px] font-light"
                    >
                      {isLoading ? (
                        <div className="flex  justify-center py-3" aria-hidden>
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-4 border-t-green-1" />
                        </div>
                      ) : (
                        placeholders.message_seller
                      )}
                    </button>
                  )} */}
                </div>

                {/* <h3 className="font-light text-[14px] text-[#4B514F] ">
                  {reviewCount} {reviewCount === 1 ? placeholders.review : placeholders.reviews}
                </h3> */}

                <div className="border-[#E5E5E5]  py-4 px-1.5 border-t-[0.5px] mt-4 flex justify-between">
                  <span className="text-[15px] font-medium">
                    {placeholders.category}
                  </span>
                  <span className="font-light text-[15px] leading-none">
                    {getFeedCategoryLabel(product?.data?.category, currentLanguage)}
                  </span>
                </div>
                {mounted &&
                  // showPurchaseActions &&
                  product?.data?.parameters?.map(
                    (
                      parameter: { name: string; variants: string[] },
                      index: number,
                    ) => (
                      <div
                        key={index}
                        className="border-[#E5E5E5]  py-4 px-1.5 border-t-[0.5px] flex justify-between"
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
                <div className="mt-8 border-t border-[#E5E5E5] pt-6">
                  <h4 className="text-[15px] font-medium text-[#030303]">
                    {placeholders.seller_information}
                  </h4>
                  <div className="mt-4 space-y-5">
                    <div className="flex mt-4 items-center gap-2">
                      <Image
                        className="h-[44px] w-[44px] rounded-full object-cover "
                        src={sellerAvatarSrc}
                        alt="profile"
                        height={100}
                        width={100}
                        unoptimized
                        onError={() => setSellerAvatarFailed(true)}
                      />
                      <div>
                        <h4 className="text-[#030303] text-[14px]">
                          {product?.data?.shopId
                            ? shopData?.title
                            : product?.data?.ownerId
                              ? ownerData?.name
                              : ""}
                        </h4>
                        <h4 className="text-[#4B514F] text-[14px] font-light">
                          {product?.data?.shopId
                            ? shopData?.ownerId?.email
                            : product?.data?.ownerId
                              ? ownerData?.email
                              : ""}
                        </h4>
                      </div>
                    </div>
                    {joinedDateLabel ? (
                      <div className="mt-3 flex items-center gap-2">
                        <Image
                          src={tickCircleGrayIcon}
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
                {showShopActions && <div className="mt-8 border-t border-[#E5E5E5] pt-6">
                  <h4 className="text-[15px] font-medium text-[#030303]">
                    {placeholders.trust_and_safety}
                  </h4>
                  <div className="mt-4 space-y-5">
                    {[
                      {
                        title: placeholders.verified_seller,
                        description: placeholders.identity_verified,
                      },
                      {
                        title: placeholders.safe_payments,
                        description: placeholders.safe_payments_description,
                      },
                      {
                        title: placeholders.buyers_protection,
                        description: placeholders.buyers_protection_description,
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
                </div>}
              </div>
            </div>

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

export default BuyProductDetail;
