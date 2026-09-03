"use client";
import { getUserId } from "@/utils/getUserId";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useGetBookedServicesQuery } from "@/store/services/sellingService";
import ServiceRequestSkeleton from "./ServiceRequestSkeleton";
import Image from "next/image";
import noImageAvtar from "@/assets/images/no-image-av.png";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import chevronLeft from "@/assets/icons/chevron-right-icon.svg";
import { useRouter } from "next/navigation";
import { parsePositiveInt } from "../Updates/Notifications";
import { useInView } from "react-intersection-observer";
import { formatPrice } from "@/utils/formatPrice";

const PAGE_LIMIT = 10;

type BookedServiceRequest = {
    _id?: string;
    id?: string;
    status?: string;
    jobStatus?: string;
    alreadyReviewed?: boolean;
    createdAt?: string;
    service?: {
        _id?: string;
        title?: string;
        price?: string | number;
        paymentType?: string;
        images?: string[];
    };
};

function getRequestId(request: BookedServiceRequest, index: number): string {
    return String(request._id ?? request.id ?? index);
}

function mergeBookedServices(
    prev: BookedServiceRequest[],
    incoming: BookedServiceRequest[],
    page: number,
): BookedServiceRequest[] {
    if (page === 1) return incoming;
    const seen = new Set(prev.map((item) => item._id ?? item.id));
    const next = [...prev];
    for (const item of incoming) {
        const key = item._id ?? item.id;
        if (key && !seen.has(key)) {
            seen.add(key);
            next.push(item);
        }
    }
    return next;
}

function BookedServices() {
    const { placeholders } = useDictionary();
    const router = useRouter();
    const userId = getUserId();
    const lastMergedKeyRef = useRef("");
    const isLoadingNextPageRef = useRef(false);

    const [page, setPage] = useState(1);
    const [bookedItems, setBookedItems] = useState<BookedServiceRequest[]>([]);
    const [hasMore, setHasMore] = useState(true);

    const {
        data: bookedServices,
        isLoading,
        isFetching,
        fulfilledTimeStamp,
    } = useGetBookedServicesQuery(
        {
            customerId: userId,
            page,
            limit: PAGE_LIMIT,
            status: "accepted,confirmed",
        },
        {
            skip: !userId,
            refetchOnMountOrArgChange: true,
        },
    );

    const ph = (key: keyof typeof placeholders) => placeholders[key];

    useEffect(() => {
        if (bookedServices == null || isFetching) return;

        const incoming =
            (bookedServices?.data as BookedServiceRequest[] | undefined) ?? [];
        const mergeKey = `${page}-${fulfilledTimeStamp ?? 0}`;
        if (lastMergedKeyRef.current === mergeKey) return;
        lastMergedKeyRef.current = mergeKey;

        setBookedItems((prev) => {
            const next = mergeBookedServices(prev, incoming, page);
            const totalPages = parsePositiveInt(bookedServices?.meta?.totalPages);
            const total = parsePositiveInt(bookedServices?.meta?.total);
            setHasMore(
                totalPages != null
                    ? page < totalPages
                    : total != null
                        ? next.length < total
                        : incoming.length >= PAGE_LIMIT,
            );
            return next;
        });
    }, [bookedServices, page, isFetching, fulfilledTimeStamp]);

    useEffect(() => {
        if (!isFetching) {
            isLoadingNextPageRef.current = false;
        }
    }, [isFetching]);

    const loadMore = useCallback(() => {
        if (!userId || isFetching || !hasMore || bookedItems.length === 0) return;
        if (isLoadingNextPageRef.current) return;
        isLoadingNextPageRef.current = true;
        setPage((p) => p + 1);
    }, [userId, isFetching, hasMore, bookedItems.length]);

    const { ref: loadMoreRef, inView } = useInView({
        rootMargin: "200px",
        threshold: 0,
    });

    useEffect(() => {
        if (!inView) return;
        loadMore();
    }, [inView, loadMore]);

    function handleScrollNearBottom(e: React.UIEvent<HTMLDivElement>) {
        if (!userId || isFetching || !hasMore || bookedItems.length === 0) return;
        if (isLoadingNextPageRef.current) return;

        const el = e.currentTarget;
        const nearBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
        if (!nearBottom) return;

        isLoadingNextPageRef.current = true;
        setPage((p) => p + 1);
    }

    const isInitialLoading =
        bookedItems.length === 0 && (isLoading || isFetching);
    const isLoadingMore = isFetching && page > 1;
    const showEmpty = !isInitialLoading && bookedItems.length === 0;

    return (
        <div className="flex flex-1 min-h-0 min-w-0 flex-col bg-white">
            <div
                onScroll={handleScrollNearBottom}
                className="px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 flex-1 min-h-0 overflow-y-auto hide-scrollbar max-h-screen"
            >
                {isInitialLoading ? (
                    <ServiceRequestSkeleton count={4} />
                ) : showEmpty ? (
                    <p className="py-8 text-center text-[15px] font-medium text-gray-8">
                        {ph("no_data_available")}
                    </p>
                ) : (
                    <>
                        {bookedItems.map((request, index) => (
                            <div
                                key={getRequestId(request, index)}
                                onClick={() =>
                                    router.push(`/book-service?id=${request?.service?._id}`)
                                }
                                className="py-4 border-b px-2 hover:bg-[#E6FBFB] cursor-pointer transition-all duration-300 border-gray-9 flex lg:items-center lg:justify-between gap-4 lg:gap-4 w-full min-w-0"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Image
                                            src={
                                                request?.service?.images?.[0] ||
                                                request?.service?.images?.[1] ||
                                                noImageAvtar
                                            }
                                            alt=""
                                            width={60}
                                            height={60}
                                            className="w-[60px] bg-gray-5 h-[60px] shrink-0 rounded-[8px] object-cover"
                                            unoptimized
                                        />
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-[15px] font-medium text-black-1 leading-snug break-words">
                                                {request?.service?.title}
                                            </h3>
                                            <p className="text-[14px] font-medium leading-snug mt-1 text-green-2 break-words">
                                                {placeholders.Rs} {formatPrice(request?.service?.price)}/
                                                {request?.service?.paymentType === "hourly"
                                                    ? ph("fixed")
                                                    : ph("fixed")}
                                            </p>
                                            <p
                                                className={`text-[14px] leading-snug ${request?.jobStatus === "completed" || request?.status === "accepted"
                                                    ? "text-green-1"
                                                    : request?.status === "rejected"
                                                        ? "text-red-1"
                                                        : request?.status === "proposed"
                                                            ? "text-[#3C9197]"
                                                            : "text-[#4B514F]"
                                                    }`}
                                            >
                                                {request?.jobStatus === "completed"
                                                    ? ph("completed")
                                                    : request?.status === "accepted"
                                                        ? ph("accepted")
                                                        : request?.status === "rejected"
                                                            ? ph("rejected")
                                                            : request?.status === "proposed"
                                                                ? ph("you_offered_a_new_time")
                                                                : ph("pending")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <Image src={chevronLeft} alt="" />
                            </div>
                        ))}
                        <div ref={loadMoreRef} className="h-4 w-full shrink-0" aria-hidden />
                        {isLoadingMore ? (
                            <div className="flex justify-center py-6">
                                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-4 border-t-green-1" />
                            </div>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}

export default BookedServices;
