"use client";

import {
    useSearchProductsQuery,
    useSearchServicesQuery,
} from "@/store/services/homeService";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import noImageAvtar from "@/assets/images/no-image-av.png";
import { AvgRatingStars } from "../Ui/Reviews";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { parsePositiveInt } from "../Updates/Notifications";
import { getCatalogItemsFromSearchResponse } from "@/utils/catalogSearch";
import "swiper/css";

const PRODUCTS_LIMIT = 12;
const SERVICES_LIMIT = 12;
const SWIPE_CLICK_SUPPRESS_MS = 120;

type TabKey = "products" | "services";

type CatalogItem = {
    id: string;
    _id: string;
    title: string;
    price: string | number;
    paymentType?: string;
    images: string[];
    reviewCount: number;
    averageRating: number;
};

const CATALOG_SWIPER_BREAKPOINTS = {
    0: {
        slidesPerView: 2,
        spaceBetween: 8,
    },
    640: {
        slidesPerView: 3,
        spaceBetween: 12,
        slidesOffsetBefore: 0,
        slidesOffsetAfter: 0,
    },
    768: {
        slidesPerView: 4,
        spaceBetween: 14,
        slidesOffsetBefore: 0,
        slidesOffsetAfter: 0,
        freeMode: false,
    },
};

function mergeCatalogItems(
    prev: CatalogItem[],
    incoming: CatalogItem[],
    page: number,
): CatalogItem[] {
    if (page === 1) return incoming;
    const seen = new Set(prev.map((item) => item.id || item._id));
    const next = [...prev];
    for (const item of incoming) {
        const key = item.id || item._id;
        if (!seen.has(key)) {
            seen.add(key);
            next.push(item);
        }
    }
    return next;
}

function CatalogCardSkeleton() {
    return (
        <div className="animate-pulse overflow-hidden rounded-[16px] border border-gray-9 bg-white">
            <div className="h-[145px] w-full bg-gray-200 sm:h-[195px]" />
            <div className="space-y-3 p-2">
                <div className="h-4 w-16 rounded bg-gray-200" />
                <div className="h-4 w-2/3 rounded bg-gray-200" />
            </div>
        </div>
    );
}

type CatalogCardProps = {
    item: CatalogItem;
    currencyLabel: string;
    onSelect: (itemId: string) => void;
    shouldSuppressClick: () => boolean;
};

function CatalogCard({
    item,
    currencyLabel,
    onSelect,
    shouldSuppressClick,
}: CatalogCardProps) {
    const { placeholders } = useDictionary();
    const itemId = item.id || item._id;
    const isCallForPrice = item.paymentType === "call_for_price";
    return (
        <div
            role="button"
            tabIndex={0}
            className="group h-full w-full cursor-pointer overflow-hidden rounded-[16px] border border-gray-9 bg-white transition-all duration-200 ease-out hover:-translate-y-1 hover:border-green-3 hover:shadow-menu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-1"
            onClick={() => {
                if (shouldSuppressClick() || !itemId) return;
                onSelect(itemId);
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (itemId) onSelect(itemId);
                }
            }}
        >
            <div className="h-[145px] overflow-hidden sm:h-[195px]">
                <Image
                    src={item.images?.length > 0 ? item.images[0] : noImageAvtar}
                    alt={item.title || "catalog_item"}
                    height={100}
                    width={100}
                    draggable={false}
                    className="pointer-events-none h-full w-full select-none bg-gray-12 object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                    unoptimized
                />
            </div>
            <div className="p-2">
                <h2 className="text-[16px] font-normal text-green-1">
                    {isCallForPrice
                        ? placeholders.call_for_price
                        : `${currencyLabel} ${Number(item.price).toLocaleString("en-US")}`}
                </h2>
                {/* <div className="flex gap-2">
                    <AvgRatingStars
                        rating={item.averageRating}
                        isLoading={false}
                        size={22}
                    />
                    <span className="text-[14px] font-normal text-gray-8">
                        ({item.reviewCount ?? 0})
                    </span>
                </div> */}
                <h2 className="line-clamp-1 text-[16px] font-medium text-black-1 transition-colors first-letter:capitalize group-hover:text-green-1">
                    {item.title}
                </h2>
            </div>
        </div>
    );
}

function AllProductsAndServices({
    tab,
    categoryId = "",
    title,
}: {
    tab: string;
    categoryId?: string;
    title?: string;
}) {
    const router = useRouter();
    const { placeholders, error_messages, info_messages } = useDictionary();
    const activeTab = tab as TabKey;
    const lastMergedProductsKeyRef = useRef("");
    const lastMergedServicesKeyRef = useRef("");
    const maxRequestedPageRef = useRef({ products: 1, services: 1 });
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

    const [productPage, setProductPage] = useState(1);
    const [servicePage, setServicePage] = useState(1);
    const [productItems, setProductItems] = useState<CatalogItem[]>([]);
    const [serviceItems, setServiceItems] = useState<CatalogItem[]>([]);
    const [hasMoreProducts, setHasMoreProducts] = useState(true);
    const [hasMoreServices, setHasMoreServices] = useState(true);

    const {
        data: productsData,
        isLoading: productsLoading,
        isFetching: productsFetching,
        fulfilledTimeStamp: productsFulfilledTimeStamp,
    } = useSearchProductsQuery(
        {
            page: productPage,
            limit: PRODUCTS_LIMIT,
            ...(categoryId ? { category: categoryId } : {}),
        },
        { skip: activeTab !== "products", refetchOnMountOrArgChange: true },
    );

    const {
        data: servicesData,
        isLoading: servicesLoading,
        isFetching: servicesFetching,
        fulfilledTimeStamp: servicesFulfilledTimeStamp,
    } = useSearchServicesQuery(
        {
            page: servicePage,
            limit: SERVICES_LIMIT,
            ...(categoryId ? { category: categoryId } : {}),
        },
        { skip: activeTab !== "services", refetchOnMountOrArgChange: true },
    );

    const items = activeTab === "products" ? productItems : serviceItems;
    const isFetching =
        activeTab === "products" ? productsFetching : servicesFetching;
    const isLoading =
        activeTab === "products" ? productsLoading : servicesLoading;
    const activePage = activeTab === "products" ? productPage : servicePage;
    const isInitialLoading = items.length === 0 && (isLoading || isFetching);
    const isLoadingMore = isFetching && activePage > 1;

    const requestNextPage = useCallback(
        (targetTab: TabKey) => {
            if (activeTab !== targetTab || isFetching) return;

            const currentPage =
                targetTab === "products" ? productPage : servicePage;
            const tabHasMore =
                targetTab === "products" ? hasMoreProducts : hasMoreServices;
            const tabItems =
                targetTab === "products" ? productItems : serviceItems;

            if (!tabHasMore || tabItems.length === 0) return;

            const nextPage = currentPage + 1;
            if (maxRequestedPageRef.current[targetTab] >= nextPage) return;

            maxRequestedPageRef.current[targetTab] = nextPage;
            if (targetTab === "products") {
                setProductPage(nextPage);
            } else {
                setServicePage(nextPage);
            }
        },
        [
            activeTab,
            isFetching,
            productPage,
            servicePage,
            hasMoreProducts,
            hasMoreServices,
            productItems,
            serviceItems,
        ],
    );

    const loadMore = useCallback(() => {
        requestNextPage(activeTab);
    }, [activeTab, requestNextPage]);

    useEffect(() => {
        setProductPage(1);
        setProductItems([]);
        setHasMoreProducts(true);
        setServicePage(1);
        setServiceItems([]);
        setHasMoreServices(true);
        lastMergedProductsKeyRef.current = "";
        lastMergedServicesKeyRef.current = "";
        maxRequestedPageRef.current = { products: 1, services: 1 };
    }, [tab, categoryId]);

    useEffect(() => {
        if (activeTab !== "products" || productsData == null || productsFetching) {
            return;
        }

        const incoming = getCatalogItemsFromSearchResponse(
            productsData,
        ) as CatalogItem[];
        const mergeKey = `${productPage}-${productsFulfilledTimeStamp ?? 0}`;
        if (lastMergedProductsKeyRef.current === mergeKey) return;
        lastMergedProductsKeyRef.current = mergeKey;

        setProductItems((prev) => {
            const next = mergeCatalogItems(prev, incoming, productPage);
            const totalPages = parsePositiveInt(productsData?.meta?.totalPages);
            const total = parsePositiveInt(productsData?.meta?.total);
            setHasMoreProducts(
                totalPages != null
                    ? productPage < totalPages
                    : total != null
                        ? next.length < total
                        : incoming.length >= PRODUCTS_LIMIT,
            );
            return next;
        });
    }, [
        productsData,
        productPage,
        activeTab,
        productsFetching,
        productsFulfilledTimeStamp,
    ]);

    useEffect(() => {
        if (activeTab !== "services" || servicesData == null || servicesFetching) {
            return;
        }

        const incoming = getCatalogItemsFromSearchResponse(
            servicesData,
        ) as CatalogItem[];
        const mergeKey = `${servicePage}-${servicesFulfilledTimeStamp ?? 0}`;
        if (lastMergedServicesKeyRef.current === mergeKey) return;
        lastMergedServicesKeyRef.current = mergeKey;

        setServiceItems((prev) => {
            const next = mergeCatalogItems(prev, incoming, servicePage);
            const totalPages = parsePositiveInt(servicesData?.meta?.totalPages);
            const total = parsePositiveInt(servicesData?.meta?.total);
            setHasMoreServices(
                totalPages != null
                    ? servicePage < totalPages
                    : total != null
                        ? next.length < total
                        : incoming.length >= SERVICES_LIMIT,
            );
            return next;
        });
    }, [
        servicesData,
        servicePage,
        activeTab,
        servicesFetching,
        servicesFulfilledTimeStamp,
    ]);

    const totalCount =
        activeTab === "products"
            ? productsData?.meta?.total
            : servicesData?.meta?.total;

    const handleSelectItem = useCallback(
        (itemId: string) => {
            if (activeTab === "services") {
                router.push(`/book-service?id=${itemId}`);
            } else {
                router.push(`/buy-product?id=${itemId}`);
            }
        },
        [activeTab, router],
    );

    const swiperSlides = useMemo(() => {
        if (isInitialLoading) {
            return Array.from({ length: 4 }).map((_, index) => (
                <SwiperSlide key={`catalog-skeleton-${index}`} className="!h-auto">
                    <CatalogCardSkeleton />
                </SwiperSlide>
            ));
        }

        const slides = items.map((item) => {
            const itemId = item.id || item._id;
            return (
                <SwiperSlide key={itemId} className="!h-auto bg-none">
                    <CatalogCard
                        item={item}
                        currencyLabel={placeholders.Rs}
                        onSelect={handleSelectItem}
                        shouldSuppressClick={shouldSuppressClick}
                    />
                </SwiperSlide>
            );
        });

        if (isLoadingMore) {
            slides.push(
                <SwiperSlide key="catalog-loading-more" className="!h-auto">
                    <CatalogCardSkeleton />
                </SwiperSlide>,
            );
        }

        return slides;
    }, [
        handleSelectItem,
        isInitialLoading,
        isLoadingMore,
        items,
        placeholders.Rs,
        shouldSuppressClick,
    ]);

    if (!isInitialLoading && !(totalCount > 0 || items.length > 0)) {
        const sectionTitle =
            title ??
            (activeTab === "products"
                ? info_messages.recent_product_ads
                : info_messages.recent_service_ads);
        const emptyMessage =
            activeTab === "products"
                ? error_messages.no_product_data
                : error_messages.no_service_data;

        return (
            <section className="mt-6 sm:mt-8">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[18px] font-semibold text-[#001907]">
                        {sectionTitle}
                    </h2>
                    {categoryId ? (
                        <button
                            onClick={() => {
                                const params = new URLSearchParams({ tab: activeTab });
                                params.set("categoryId", categoryId);
                                router.push(`/home/search-list?${params.toString()}`);
                            }}
                            className="cursor-pointer text-[14px] font-normal text-green-1 hover:underline"
                        >
                            {info_messages.see_all}
                        </button>
                    ) : null}
                </div>
                <div className="mt-4 flex h-[240px] w-full items-center justify-center text-black-1">
                    {emptyMessage}
                </div>
            </section>
        );
    }

    return (
        <section className="mt-6 sm:mt-8">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-[18px] font-medium text-[#001907]">
                    {title ??
                        (activeTab === "products"
                            ? info_messages.recent_product_ads
                            : info_messages.recent_service_ads)}
                </h2>
                <button
                    onClick={() => {
                        const params = new URLSearchParams({ tab: activeTab });
                        if (categoryId) params.set("categoryId", categoryId);
                        router.push(`/home/search-list?${params.toString()}`);
                    }}
                    className="cursor-pointer text-[14px] font-normal text-green-1 hover:underline"
                >
                    {info_messages.see_all}
                </button>
            </div>

            <div className="mt-4 w-full ">
                <Swiper
                    key={activeTab}
                    modules={[FreeMode]}
                    className="catalog-swiper w-full bg-none"
                    spaceBetween={8}
                    slidesPerView={1.35}
                    freeMode={{ enabled: true, momentum: true }}
                    grabCursor
                    touchStartPreventDefault={false}
                    observer
                    observeParents
                    watchOverflow={false}
                    breakpoints={CATALOG_SWIPER_BREAKPOINTS}
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

export default AllProductsAndServices;
