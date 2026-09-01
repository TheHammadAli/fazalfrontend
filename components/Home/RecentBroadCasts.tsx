"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { useSentBroadcastMessagesQuery } from "@/store/services/chatService";
import { useCanInteractAsUser } from "@/custom-hooks/useIsGuest";
import { parsePositiveInt } from "@/components/Updates/Notifications";
import AvatarUi from "@/components/Ui/AvatarUi";
import noImageAvatar from "@/assets/images/default-profile-avatar.svg";
import broadcastServiceIcon from "@/assets/icons/broadcast_service.svg";
import recentBroadImagesIcon from "@/assets/icons/recent-broad-images.svg";
import "swiper/css";

type BroadcastResponder = {
    image?: string;
    name?: string;
};

type BroadcastThread = {
    buyer?: BroadcastResponder;
    seller?: BroadcastResponder;
};

type RecentBroadcastItem = {
    _id?: string;
    id?: string;
    threadId?: string;
    message?: string;
    recipients?: number;
    responses?: number;
    responseCount?: number;
    threadCount?: number;
    location?: { description?: string } | string;
    address?: string;
    images?: string[];
    files?: string[];
    image?: string;
    imageUrls?: string[];
    responders?: BroadcastResponder[];
    threads?: BroadcastThread[];
};

const BROADCAST_LIMIT = 12;
const SWIPE_CLICK_SUPPRESS_MS = 120;

const BROADCAST_SWIPER_BREAKPOINTS = {
    0: {
        slidesPerView: 1.15,
        spaceBetween: 12,
    },
    640: {
        slidesPerView: 2.1,
        spaceBetween: 12,
    },
    1024: {
        slidesPerView: 2.6,
        spaceBetween: 16,
        freeMode: false,
    },
    1280: {
        slidesPerView: 3.1,
        spaceBetween: 16,
        freeMode: false,
    },
};

function getBroadcastId(item: RecentBroadcastItem): string {
    return item._id ?? item.id ?? item.threadId ?? "";
}

function getThreadCount(item: RecentBroadcastItem): number {
    return item?.threadCount ?? item.recipients ?? 0;
}

function getResponseCount(item: RecentBroadcastItem): number {
    return item.responses ?? item.responseCount ?? 0;
}

function getBroadcastLocation(item: RecentBroadcastItem): string {
    if (typeof item.location === "string") return item.location;
    return item.location?.description ?? item.address ?? "";
}

function getResponders(item: RecentBroadcastItem): BroadcastResponder[] {
    if (Array.isArray(item.responders) && item.responders.length > 0) {
        return item.responders;
    }

    if (Array.isArray(item.threads) && item.threads.length > 0) {
        return item.threads
            .map((thread) => thread.buyer ?? thread.seller)
            .filter((responder): responder is BroadcastResponder => Boolean(responder));
    }

    return [];
}

function mergeBroadcastItems(
    prev: RecentBroadcastItem[],
    incoming: RecentBroadcastItem[],
    page: number,
): RecentBroadcastItem[] {
    if (page === 1) return incoming;

    const map = new Map<string, RecentBroadcastItem>();
    const addItem = (item: RecentBroadcastItem, index: number) => {
        const key = getBroadcastId(item) || `${item.message ?? "broadcast"}-${index}`;
        map.set(key, item);
    };

    prev.forEach(addItem);
    incoming.forEach(addItem);
    return Array.from(map.values());
}

function BroadcastCardSkeleton() {
    return (
        <div className="flex w-full items-center gap-3 rounded-[14px] border border-[#E5E5E5] bg-white p-3">
            <div className="h-14 w-14 shrink-0 animate-pulse rounded-[10px] bg-gray-200" />
            <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="flex shrink-0">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div
                        key={index}
                        className={`h-7 w-7 animate-pulse rounded-full bg-gray-200 ${index > 0 ? "-ml-2" : ""}`}
                    />
                ))}
            </div>
        </div>
    );
}

function ResponderAvatarStack({
    responders,
    total,
}: {
    responders: BroadcastResponder[];
    total: number;
}) {
    const visibleResponders = responders.slice(0, 3);
    const extraCount = Math.max(0, total - visibleResponders.length);

    if (visibleResponders.length === 0 && total === 0) {
        return null;
    }

    return (
        <div className="flex shrink-0 items-center">
            {visibleResponders.map((responder, index) => (
                <AvatarUi
                    key={`${responder.image ?? responder.name ?? "responder"}-${index}`}
                    image={responder.image ?? noImageAvatar.src}
                    name={responder.name ?? ""}
                    className={`h-7 w-7 rounded-full border-2 border-white bg-[#e7f4f5] !text-[10px] text-green-1 ${index > 0 ? "-ml-2" : ""}`}
                />
            ))}
            {extraCount > 0 ? (
                <span className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#4B514F] text-[10px] font-medium text-white">
                    +{extraCount}
                </span>
            ) : null}
        </div>
    );
}

type BroadcastCardProps = {
    item: RecentBroadcastItem;
    onClick: () => void;
    shouldSuppressClick: () => boolean;
};

function BroadcastCard({ item, onClick, shouldSuppressClick }: BroadcastCardProps) {
    const { info_messages } = useDictionary();
    const responseCount = getResponseCount(item);
    const threadCount = getThreadCount(item);
    const responders = getResponders(item);
    const location = getBroadcastLocation(item);
    const sentToUsersLabel = String(info_messages.sent_to_users ?? "Sent to {count} users").replace(
        "{count}",
        String(threadCount),
    );

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => {
                if (shouldSuppressClick()) return;
                onClick();
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick();
                }
            }}
            className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] border border-[#E5E5E5] bg-white p-3 text-left transition-colors hover:border-[#C9D1D3]"
        >
            <div className="pointer-events-none flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#FBF3EA]">
                <Image
                    src={broadcastServiceIcon}
                    alt={item.message ?? "broadcast"}
                    width={48}
                    height={48}
                    draggable={false}
                    className="h-10 w-10"
                />
            </div>

            <div className="min-w-0 flex-1 rtl:text-right ">
                <p className="truncate-safe text-[12px] text-green-1 font-normal !leading-none text-[#4B514F]">
                    {sentToUsersLabel}
                </p>
                <h1 className="truncate-safe first-letter:uppercase text-[14px] !leading-none font-medium text-[#030303]">
                    {item.message}
                </h1>
                {location ? (
                    <span className="truncate-safe text-[13px] font-normal  !leading-none text-[#4B514F]">
                        {location}
                    </span>
                ) : null}
            </div>

            <div className="pointer-events-none flex shrink-0 items-center gap-2">
                <ResponderAvatarStack responders={responders} total={responseCount} />
                <Image
                    src={recentBroadImagesIcon}
                    alt=""
                    width={40}
                    height={40}
                    draggable={false}
                    className="h-12 w-14 object-contain"
                />
            </div>
        </div>
    );
}

function RecentBroadCasts() {
    const router = useRouter();
    const canInteractAsUser = useCanInteractAsUser();
    const { info_messages } = useDictionary();
    const [hasMounted, setHasMounted] = useState(false);
    const [page, setPage] = useState(1);
    const [broadcastItems, setBroadcastItems] = useState<RecentBroadcastItem[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const maxRequestedPageRef = useRef(1);
    const lastMergedKeyRef = useRef("");
    const isSwipingRef = useRef(false);
    const swipeResetTimeoutRef = useRef<number | null>(null);

    const clearSwipeResetTimeout = useCallback(() => {
        if (swipeResetTimeoutRef.current != null) {
            window.clearTimeout(swipeResetTimeoutRef.current);
            swipeResetTimeoutRef.current = null;
        }
    }, []);

    const handleSwiperTouchStart = useCallback(() => {
        clearSwipeResetTimeout();
        isSwipingRef.current = false;
    }, [clearSwipeResetTimeout]);

    const handleSwiperSliderMove = useCallback(() => {
        isSwipingRef.current = true;
    }, []);

    const handleSwiperTouchEnd = useCallback(() => {
        clearSwipeResetTimeout();
        swipeResetTimeoutRef.current = window.setTimeout(() => {
            isSwipingRef.current = false;
            swipeResetTimeoutRef.current = null;
        }, SWIPE_CLICK_SUPPRESS_MS);
    }, [clearSwipeResetTimeout]);

    const shouldSuppressClick = useCallback(() => isSwipingRef.current, []);

    useEffect(() => clearSwipeResetTimeout, [clearSwipeResetTimeout]);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    const {
        data,
        isLoading,
        isFetching,
        fulfilledTimeStamp,
    } = useSentBroadcastMessagesQuery(
        { page, limit: BROADCAST_LIMIT },
        { skip: !canInteractAsUser, refetchOnMountOrArgChange: true },
    );

    console.log(data, "check the data ");
    useEffect(() => {
        if (!canInteractAsUser || data == null || isFetching) return;

        const incoming = (data?.data as RecentBroadcastItem[] | undefined) ?? [];
        const mergeKey = `${page}-${fulfilledTimeStamp ?? 0}`;
        if (lastMergedKeyRef.current === mergeKey) return;
        lastMergedKeyRef.current = mergeKey;

        setBroadcastItems((prev) => {
            const next = mergeBroadcastItems(prev, incoming, page).filter((item) => item.message);
            const totalPages = parsePositiveInt(data?.meta?.totalPages);
            const total = parsePositiveInt(data?.meta?.total);
            setHasMore(
                totalPages != null
                    ? page < totalPages
                    : total != null
                        ? next.length < total
                        : incoming.length >= BROADCAST_LIMIT,
            );
            return next;
        });
    }, [canInteractAsUser, data, fulfilledTimeStamp, isFetching, page]);
    console.log(broadcastItems, "checking broadcast items");
    const isInitialLoading = broadcastItems.length === 0 && (isLoading || isFetching);
    const isLoadingMore = isFetching && page > 1;

    const loadMore = useCallback(() => {
        if (isFetching || !hasMore || broadcastItems.length === 0) return;

        const nextPage = page + 1;
        if (maxRequestedPageRef.current >= nextPage) return;

        maxRequestedPageRef.current = nextPage;
        setPage(nextPage);
    }, [broadcastItems.length, hasMore, isFetching, page]);

    const handleSelectBroadcast = useCallback((item: RecentBroadcastItem) => {
        const broadcastId = getBroadcastId(item);
        const params = new URLSearchParams({ threadType: "broadcast" });
        if (broadcastId) params.set("chatId", broadcastId);
        router.push(`/chat?${params.toString()}`);
    }, [router]);

    const swiperSlides = useMemo(() => {
        if (isInitialLoading) {
            return Array.from({ length: 4 }).map((_, index) => (
                <SwiperSlide key={`broadcast-skeleton-${index}`} className="!h-auto !overflow-visible">
                    <BroadcastCardSkeleton />
                </SwiperSlide>
            ));
        }

        const slides = broadcastItems.map((item, index) => (
            <SwiperSlide
                key={getBroadcastId(item) || `broadcast-${index}`}
                className="!h-auto !overflow-visible"
            >
                <BroadcastCard
                    item={item}
                    shouldSuppressClick={shouldSuppressClick}
                    onClick={() => handleSelectBroadcast(item)}
                />
            </SwiperSlide>
        ));

        if (isLoadingMore) {
            slides.push(
                <SwiperSlide key="broadcast-loading-more" className="!h-auto !overflow-visible">
                    <BroadcastCardSkeleton />
                </SwiperSlide>,
            );
        }

        return slides;
    }, [broadcastItems, handleSelectBroadcast, isInitialLoading, isLoadingMore, shouldSuppressClick]);

    if (!hasMounted || !canInteractAsUser) {
        return null;
    }

    if (!isInitialLoading && broadcastItems.length === 0) {
        return null;
    }

    return (
        <section className="mt-6 sm:mt-8">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-[18px] font-semibold text-[#001907]">
                    {info_messages.recent_broadcasts}
                </h2>
                <button
                    type="button"
                    onClick={() => router.push("/chat?threadType=broadcast")}
                    className="cursor-pointer text-[14px] font-normal text-green-1 hover:underline"
                >
                    {info_messages.see_all}
                </button>
            </div>

            <div className="mt-4 w-full">
                <Swiper
                    modules={[FreeMode]}
                    className="broadcast-swiper w-full"
                    spaceBetween={12}
                    slidesPerView={1.15}
                    freeMode={{ enabled: true, momentum: true }}
                    grabCursor
                    touchStartPreventDefault={false}
                    observer
                    observeParents
                    watchOverflow={false}
                    breakpoints={BROADCAST_SWIPER_BREAKPOINTS}
                    onTouchStart={handleSwiperTouchStart}
                    onSliderMove={handleSwiperSliderMove}
                    onTouchEnd={handleSwiperTouchEnd}
                    onTransitionEnd={handleSwiperTouchEnd}
                    preventClicks
                    preventClicksPropagation
                    onReachEnd={loadMore}
                >
                    {swiperSlides}
                </Swiper>
            </div>
        </section>
    );
}

export default RecentBroadCasts;
