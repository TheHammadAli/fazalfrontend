"use client";
import React, { useEffect, useState } from "react";
import { useGetAllProductsFeedQuery } from "@/store/services/feedService";
import { useGetProductDetailQuery } from "@/store/services/homeService";
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

type ProductFeedItem = {
    _id?: string;
    id?: string;
    title?: string;
    price?: number;
    // Backend field is `video` today; `videoUrl`/`videoLink` are kept as fallbacks
    // so this mapper doesn't silently drop items if the column name ever shifts
    // (the native app already guards the same way in feedPrefetch.pickVideoUrl).
    video?: string | null;
    videoUrl?: string | null;
    videoLink?: string | null;
    images?: string[];
    shopId?: string | { _id?: string; id?: string; title?: string; image?: string; images?: string[] };
    ownerId?: string | { _id?: string; id?: string; name?: string; image?: string; images?: string[] };
    category?: unknown;
    likesCount?: number;
    sharesCount?: number;
    isVideoPost?: boolean;
    isLiked?: boolean;
    liked?: boolean;
    isFavorite?: boolean;
    // Only ever populated on a video post — the real listing it promotes.
    // The backend puts either the populated {id,title,images,price} object
    // here, or nothing at all, never a bare id string.
    taggedProductId?: { id?: string; _id?: string; price?: number } | null;
};

type FeedResponseMeta = {
    totalPages?: number | string;
};

type FeedResponse = {
    data?: ProductFeedItem[];
    meta?: FeedResponseMeta;
};

function pickVideoUrl(item: ProductFeedItem): string {
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

function mapProductFeedItem(product: ProductFeedItem): ReelItem {
    const videoUrl = pickVideoUrl(product);
    const shopId = resolveFeedEntityId(product.shopId);
    const ownerId = resolveFeedEntityId(product.ownerId);
    const shopEntity = shopId ? product.shopId : null;
    const ownerEntity = !shopId && ownerId ? product.ownerId : null;
    // A video post's own `price` is a nominal 0, never a real
    // price to show — the tagged product's price (if any) is
    // the only price that ever means anything here.
    const taggedProduct = product.isVideoPost ? product.taggedProductId : null;
    const displayPrice = product.isVideoPost ? taggedProduct?.price : product.price;
    return {
        id: product._id ?? product.id ?? "",
        video: videoUrl,
        title: product.title ?? "",
        price: displayPrice ? String(displayPrice) : "",
        taggedProductId: taggedProduct?.id ?? taggedProduct?._id ?? undefined,
        category: normalizeCategory(product.category),
        shopId: shopId || undefined,
        shopName: shopId
            ? resolveFeedEntityName(shopEntity as any)
            : undefined,
        shopImage: shopId
            ? resolveFeedEntityImage(shopEntity as any)
            : undefined,
        ownerId: !shopId && ownerId ? ownerId : undefined,
        ownerName: !shopId && ownerId
            ? resolveFeedEntityName(ownerEntity as any)
            : undefined,
        ownerImage: !shopId
            ? resolveFeedEntityImage(ownerEntity as any)
            : undefined,
        likesCount: product.likesCount ?? 0,
        sharesCount: product.sharesCount ?? 0,
        isLiked: !!product.isLiked,
        isVideoPost: !!product.isVideoPost,
    };
}

type ProductFeedsProps = {
    // Set when arriving via "My Videos" -> tap a video, so the feed opens
    // pinned to that one post instead of the normal top of the feed.
    focusPostId?: string;
    // Called once the pinned post has actually been fetched and shown, so
    // the parent can forget it — otherwise switching away from this tab and
    // back would remount this component and jump back to the same post again.
    onFocusConsumed?: () => void;
};

function ProductFeeds({ focusPostId, onFocusConsumed }: ProductFeedsProps) {
    const { placeholders } = useDictionary();
    const userId = getUserId() ?? "";
    const LIMIT = 10;
    const [page, setPage] = useState(1);
    const [products, setProducts] = useState<ReelItem[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const { data: productsFeed, isLoading, isFetching } = useGetAllProductsFeedQuery({ page, limit: LIMIT, userId });
    const isInitialLoading = products.length === 0 && (isLoading || isFetching);

    const [focusItem, setFocusItem] = useState<ReelItem | null>(null);
    const { data: focusProductResponse } = useGetProductDetailQuery(
        { id: focusPostId ?? "", userId },
        { skip: !focusPostId },
    );

    useEffect(() => {
        if (!focusPostId) {
            setFocusItem(null);
            return;
        }
        const raw = focusProductResponse?.data as ProductFeedItem | undefined;
        if (!raw) return;
        setFocusItem(mapProductFeedItem(raw));
        onFocusConsumed?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusPostId, focusProductResponse]);

    useEffect(() => {
        const response = (productsFeed as FeedResponse | undefined) ?? undefined;
        const mapped: ReelItem[] =
            response?.data
                ?.map(mapProductFeedItem)
                .filter((item) => !!item.video) ?? [];

        setProducts((prev) => {
            const map = new Map(prev.map((item) => [item.id, item]));
            mapped.forEach((item) => map.set(item.id, item));
            return Array.from(map.values());
        });

        const totalPages = Number(response?.meta?.totalPages ?? 1);
        setHasMore(page < totalPages);
    }, [productsFeed, page]);

    const handleEndReached = () => {
        if (isFetching || !hasMore) return;
        setPage((prev) => prev + 1);
    };

    // The pinned deep-linked post always leads, regardless of whether/when it
    // also shows up in the normal paginated list (dedupe by id either way).
    const reels = focusItem
        ? [focusItem, ...products.filter((item) => item.id !== focusItem.id)]
        : products;

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
                        type="products"
                        reels={reels}
                        onEndReached={handleEndReached}
                        isLoadingMore={isFetching && page > 1}
                    />
                )}
            </div>
        </div>
    );
}

export default ProductFeeds;