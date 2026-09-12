"use client";
import { useEffect, useState } from "react";
import { useGetAllServicesFeedQuery } from "@/store/services/feedService";
import { useGetServiceDetailQuery } from "@/store/services/sellingService";
import { getUserId } from "@/utils/getUserId";
import ReelsFeed, { type ReelItem } from "./ReelsFeed";
import {
    resolveFeedEntityId,
    resolveFeedEntityImage,
    resolveFeedEntityName,
} from "@/utils/feedEntity";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import noFeedIcon from "@/assets/icons/no-products-or-shop.svg";
import Image from "next/image";

type ServiceFeedItem = {
    _id?: string;
    id?: string;
    title?: string;
    price?: number;
    video?: string | null;
    videoUrl?: string | null;
    videoLink?: string | null;
    images?: string[];
    ownerId?: string | { _id?: string; id?: string; name?: string; image?: string; images?: string[] };
    category?: unknown;
    likesCount?: number;
    sharesCount?: number;
    isLiked?: boolean;
    isVideoPost?: boolean;
    // Only ever populated on a video post — the real listing it promotes.
    taggedProductId?: { id?: string; _id?: string; price?: number } | null;
};

type FeedResponseMeta = {
    totalPages?: number | string;
};

type FeedResponse = {
    data?: ServiceFeedItem[];
    meta?: FeedResponseMeta;
};

function pickVideoUrl(item: ServiceFeedItem): string {
    return item.videoUrl ?? item.video ?? item.videoLink ?? "";
}

function normalizeCategory(category: unknown): ReelItem["category"] {
    if (!category) return "";
    if (typeof category === "string") return category;
    if (typeof category !== "object") return "";
    const c = category as { name?: unknown; icon?: unknown; en?: unknown; ur?: unknown };
    if (typeof c.name === "string") return { name: c.name, icon: typeof c.icon === "string" ? c.icon : undefined };
    if (c.name && typeof c.name === "object") {
        return { name: c.name as { en?: string; ur?: string }, icon: typeof c.icon === "string" ? c.icon : undefined };
    }
    if (typeof c.en === "string" || typeof c.ur === "string") {
        return { en: c.en as string | undefined, ur: c.ur as string | undefined };
    }
    return "";
}

function mapServiceFeedItem(service: ServiceFeedItem): ReelItem {
    const videoUrl = pickVideoUrl(service);
    const ownerId = resolveFeedEntityId(service.ownerId);
    const ownerEntity = ownerId ? service.ownerId : null;
    // Same "no real price" rule as products: a video post's
    // own price is nominal, and a real service can genuinely
    // have no price at all ("call for price").
    const taggedProduct = service.isVideoPost ? service.taggedProductId : null;
    const displayPrice = service.isVideoPost ? taggedProduct?.price : service.price;
    return {
        id: service._id ?? service.id ?? "",
        video: videoUrl,
        title: service.title ?? "",
        price: displayPrice ? String(displayPrice) : "",
        taggedProductId: taggedProduct?.id ?? taggedProduct?._id ?? undefined,
        category: normalizeCategory(service.category),
        ownerId: ownerId || undefined,
        ownerName: ownerId
            ? resolveFeedEntityName(ownerEntity as any)
            : undefined,
        ownerImage: resolveFeedEntityImage(ownerEntity as any),
        likesCount: service.likesCount ?? 0,
        sharesCount: service.sharesCount ?? 0,
        isLiked: !!service.isLiked,
        isVideoPost: !!service.isVideoPost,
    };
}

type ServiceFeedsProps = {
    // Set when arriving via "My Videos" -> tap a video, so the feed opens
    // pinned to that one post instead of the normal top of the feed.
    focusPostId?: string;
    // Called once the pinned post has actually been fetched and shown, so
    // the parent can forget it — otherwise switching away from this tab and
    // back would remount this component and jump back to the same post again.
    onFocusConsumed?: () => void;
};

function ServiceFeeds({ focusPostId, onFocusConsumed }: ServiceFeedsProps) {
    const { placeholders } = useDictionary();
    const userId = getUserId() ?? "";
    const LIMIT = 10;
    const [page, setPage] = useState(1);
    const [services, setServices] = useState<ReelItem[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const { data: servicesFeed, isLoading, isFetching } = useGetAllServicesFeedQuery({ page, limit: LIMIT, userId });
    const isInitialLoading = services.length === 0 && (isLoading || isFetching);

    const [focusItem, setFocusItem] = useState<ReelItem | null>(null);
    const { data: focusServiceResponse } = useGetServiceDetailQuery(focusPostId ?? "", {
        skip: !focusPostId,
    });

    useEffect(() => {
        if (!focusPostId) {
            setFocusItem(null);
            return;
        }
        const raw = focusServiceResponse?.data as ServiceFeedItem | undefined;
        if (!raw) return;
        setFocusItem(mapServiceFeedItem(raw));
        onFocusConsumed?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusPostId, focusServiceResponse]);

    useEffect(() => {
        const response = (servicesFeed as FeedResponse | undefined) ?? undefined;
        const mapped: ReelItem[] =
            response?.data
                ?.map(mapServiceFeedItem)
                .filter((item) => !!item.video) ?? [];

        setServices((prev) => {
            const map = new Map(prev.map((item) => [item.id, item]));
            mapped.forEach((item) => map.set(item.id, item));
            return Array.from(map.values());
        });

        const totalPages = Number(response?.meta?.totalPages ?? 1);
        setHasMore(page < totalPages);
    }, [servicesFeed, page]);

    const handleEndReached = () => {
        if (isFetching || !hasMore) return;
        setPage((prev) => prev + 1);
    };

    // The pinned deep-linked post always leads, regardless of whether/when it
    // also shows up in the normal paginated list (dedupe by id either way).
    const reels = focusItem
        ? [focusItem, ...services.filter((item) => item.id !== focusItem.id)]
        : services;

    return (
        <div className="flex h-full min-h-0 w-full justify-center">
            <div className="h-full min-h-0 w-full max-w-full lg:max-w-[456px]">
                {isInitialLoading ? (
                    Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className="h-[620px] w-full animate-pulse rounded-[8px] bg-gray-200" />
                    ))
                ) : reels.length === 0 ? (
                    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center px-6 text-center">
                        <Image src={noFeedIcon} alt="no-feed" />
                        <h3 className="mt-3 text-[22px] font-medium text-black-1">
                            {placeholders.no_feed_yet ?? "No feed yet"}
                        </h3>
                        <p className="mt-1 max-w-[420px] text-[14px] font-normal text-gray-8">
                            {placeholders.feed_appears_here ??
                                "When products or services with videos are added, they will appear here."}
                        </p>
                    </div>
                ) : (
                    <ReelsFeed
                        type="services"
                        reels={reels}
                        onEndReached={handleEndReached}
                        isLoadingMore={isFetching && page > 1}
                    />
                )}
            </div>
        </div>
    );
}

export default ServiceFeeds;