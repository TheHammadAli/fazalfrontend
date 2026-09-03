"use client";

import Image from "next/image";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { BeatLoader } from "react-spinners";
import DoodleButton from "@/components/Ui/DoodleButton";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { formatPrice } from "@/utils/formatPrice";
import { getCookie } from "cookies-next";
import { useRouter } from "next/navigation";
import {
    useGetServicesRequestsQuery,
    useGetUserServiceQuery,
    useUpdateServiceRequestMutation,
} from "@/store/services/sellingService";
import { formatRequestedDateTime } from "@/utils/formatRequestedDateTime";
import noImageAvtar from "@/assets/images/no-image-av.png";
import Modal from "../Ui/Modals/Modal";
import DateTimePickerModal from "./DateTimePickerModal";
import { toast } from "react-hot-toast";
import ServiceRequestSkeleton, {
    OfferedServicesPageSkeleton,
} from "@/components/Services/ServiceRequestSkeleton";
import { parsePositiveInt } from "../Updates/Notifications";
import MyOfferedServiceCard from "./MyOfferedServiceCard";
import type { ServiceDetailType } from "./ServiceDetail";
import myOffersIcon from "@/assets/icons/my-requests.svg";
import serviceRequestIcon from "@/assets/icons/total-products-icon.svg";
import chevronRightIcon from "@/assets/icons/chevron-right-icon.svg";

const ONE_HOUR_MS = 60 * 60 * 1000;
const PAGE_LIMIT = 10;
const SCROLL_LOAD_MARGIN_PX = 200;

const REQUEST_TAB_KEYS = [
    "my_offers",
    "service_request",
    "service_history",
] as const;
const STATUS_TAB_KEYS = ["pending", "accepted", "rejected"] as const;

type RequestTabKey = (typeof REQUEST_TAB_KEYS)[number];
type StatusTabKey = (typeof STATUS_TAB_KEYS)[number];

const ServiceHistoryIcon = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="2"
        stroke="#007781"
        className="h-6 w-6 text-[#4B514F]"
        aria-hidden
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
    </svg>
);

const REQUEST_TAB_META: Record<
    RequestTabKey,
    {
        icon: React.ReactNode;
        descriptionKey:
            | "my_offers_desc"
            | "service_request_desc"
            | "service_history_desc";
    }
> = {
    my_offers: {
        icon: (
            <Image src={myOffersIcon} alt="" className="h-6 w-6" />
        ),
        descriptionKey: "my_offers_desc",
    },
    service_request: {
        icon: (
            <Image src={serviceRequestIcon} alt="" className="h-6 w-6" />
        ),
        descriptionKey: "service_request_desc",
    },
    service_history: {
        icon: <ServiceHistoryIcon />,
        descriptionKey: "service_history_desc",
    },
};
type ServiceRequestItem = {
    id?: string;
    _id?: string;
    requestedDateTime?: string;
    service?: {
        title?: string;
        price?: string;
        paymentType?: string;
        images?: string[];
    };
    provider?: {
        id?: string;
        name?: string;
    };
    status?: string;
    customer?: {
        id?: string;
        name?: string;
    };
};

type ServiceAction = "accept" | "reject" | "propose";

const REQUEST_FILTER_QUERY: Record<
    StatusTabKey,
    { status: string; jobStatus?: string }
> = {
    pending: { status: "pending" },
    accepted: { status: "accepted" },
    rejected: { status: "rejected" },
};

const EMPTY_REQUEST_QUERY = {} as const;

function getRequestId(request: ServiceRequestItem): string | undefined {
    return request.id ?? request._id;
}

function mergeRequests(
    prev: ServiceRequestItem[],
    incoming: ServiceRequestItem[],
    page: number,
): ServiceRequestItem[] {
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

function getScrollParent(node: HTMLElement): HTMLElement | Window {
    let parent = node.parentElement;
    while (parent) {
        const { overflowY } = window.getComputedStyle(parent);
        if (/(auto|scroll|overlay)/.test(overflowY)) {
            return parent;
        }
        parent = parent.parentElement;
    }
    return window;
}

function isSentinelVisible(sentinel: HTMLDivElement | null): boolean {
    if (!sentinel) return false;
    const rect = sentinel.getBoundingClientRect();
    const viewportBottom =
        window.innerHeight || document.documentElement.clientHeight;
    return rect.top <= viewportBottom + SCROLL_LOAD_MARGIN_PX;
}

function OfferedServices() {
    const router = useRouter();
    const { placeholders, currentLanguage } = useDictionary();
    const modalRef = React.useRef<HTMLDivElement>(null);
    const [date, setDate] = useState<Date>(
        () => new Date(Date.now() + ONE_HOUR_MS),
    );
    type PlaceholderKey = keyof typeof placeholders;
    const [userId, setUserId] = useState<string | undefined>(undefined);
    const [isHydrated, setIsHydrated] = useState(false);
    const [activeRequestTab, setActiveRequestTab] =
        useState<RequestTabKey>("my_offers");
    const [activeStatusTab, setActiveStatusTab] =
        useState<StatusTabKey>("pending");
    const [serviceRequestMenuOpen, setServiceRequestMenuOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [requestItems, setRequestItems] = useState<ServiceRequestItem[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const ph = (key: PlaceholderKey) => placeholders[key];
    const [offerForId, setOfferForId] = useState<string | null>(null);

    const sentinelRef = useRef<HTMLDivElement>(null);
    const resultsPanelRef = useRef<HTMLDivElement>(null);
    const [sentinelReady, setSentinelReady] = useState(false);
    const lastMergedKeyRef = useRef("");
    const maxRequestedPageRef = useRef(1);

    useEffect(() => {
        const id = getCookie("userId");
        setUserId(typeof id === "string" ? id : undefined);
        setIsHydrated(true);
    }, []);

    // Only include status filter when Service request is active — avoids
    // refetch/reset when status state is irrelevant on other left tabs.
    const listFilterKey = useMemo(() => {
        if (activeRequestTab === "service_request") {
            return `service_request:${activeStatusTab}` as const;
        }
        return activeRequestTab;
    }, [activeRequestTab, activeStatusTab]);

    const requestQueryParams = useMemo(() => {
        if (activeRequestTab === "service_history") {
            return EMPTY_REQUEST_QUERY;
        }
        if (activeRequestTab === "my_offers") {
            return REQUEST_FILTER_QUERY.pending;
        }
        return REQUEST_FILTER_QUERY[activeStatusTab];
    }, [activeRequestTab, activeStatusTab]);

    const listKey = listFilterKey;

    const {
        currentData: servicesRequests,
        isLoading,
        isFetching,
        isError,
        error,
        fulfilledTimeStamp,
    } = useGetServicesRequestsQuery(
        {
            id: userId,
            role: "provider",
            page,
            limit: PAGE_LIMIT,
            ...requestQueryParams,
        },
        { skip: !userId, refetchOnMountOrArgChange: true },
    );

    const { data: offersCountData } = useGetServicesRequestsQuery(
        {
            id: userId,
            role: "provider",
            page: 1,
            limit: 1,
            status: "pending",
        },
        { skip: !userId },
    );
    const { data: historyCountData } = useGetServicesRequestsQuery(
        {
            id: userId,
            role: "provider",
            page: 1,
            limit: 1,
        },
        { skip: !userId },
    );

    const tabBadges: Partial<Record<RequestTabKey, number>> = {
        my_offers: parsePositiveInt(offersCountData?.meta?.total) ?? 0,
        service_history: parsePositiveInt(historyCountData?.meta?.total) ?? 0,
    };

    const [spinnerIndex, setSpinnerIndex] = useState<number>(-1);
    const [spinnerAction, setSpinnerAction] = useState<ServiceAction | null>(
        null,
    );
    const [updateServiceRequest, { isLoading: isUpdating }] =
        useUpdateServiceRequestMutation();

    const {
        data: userServiceData,
        isLoading: isUserServiceLoading,
        isFetching: isUserServiceFetching,
    } = useGetUserServiceQuery(userId, {
        skip: !userId,
    });
    const myService = userServiceData?.data?.[0] as
        | ServiceDetailType
        | undefined;
    const hasMyService = Boolean(myService?.id || myService?._id);

    const hasResolvedData = servicesRequests !== undefined;

    const hasLoadedOnceRef = useRef(false);

    const isListInitialLoading =
        Boolean(userId) &&
        requestItems.length === 0 &&
        !hasResolvedData &&
        (isLoading || isFetching);

    const isUserServicePending =
        Boolean(userId) &&
        !userServiceData &&
        (isUserServiceLoading || isUserServiceFetching);

    if (
        userId &&
        !isUserServicePending &&
        !isListInitialLoading &&
        !hasLoadedOnceRef.current
    ) {
        hasLoadedOnceRef.current = true;
    }

    // Full-page skeleton until the first successful load; later filters use list skeleton.
    const isPageLoading =
        !isHydrated ||
        !userId ||
        (!hasLoadedOnceRef.current &&
            (isUserServicePending || isListInitialLoading));

    const isLoadingMore = isFetching && page > 1;
    const showEmpty =
        isHydrated &&
        !isPageLoading &&
        !isListInitialLoading &&
        requestItems.length === 0;

    const resetPagination = useCallback(() => {
        setPage(1);
        setRequestItems([]);
        setHasMore(true);
        lastMergedKeyRef.current = "";
        maxRequestedPageRef.current = 1;
    }, []);

    useEffect(() => {
        resetPagination();
    }, [listFilterKey, resetPagination]);

    useEffect(() => {
        if (!userId || !isError) return;

        const err = error as {
            status?: number | string;
            originalStatus?: number;
        };
        const isNotFound =
            err?.status === 404 ||
            err?.status === "404" ||
            err?.originalStatus === 404;

        if (!isNotFound) return;

        lastMergedKeyRef.current = `${listKey}-empty`;
        setRequestItems([]);
        setHasMore(false);
    }, [userId, isError, error, listKey]);

    useEffect(() => {
        if (!userId || servicesRequests === undefined || isError) return;
        // Page > 1: wait for fetch — currentData may still hold the previous page.
        if (page > 1 && isFetching) return;

        const incoming = (
            (servicesRequests?.data as ServiceRequestItem[] | undefined) ?? []
        );

        const mergeKey = `${listKey}-${page}-${fulfilledTimeStamp ?? 0}`;
        if (lastMergedKeyRef.current === mergeKey) return;
        const isFreshTabData = lastMergedKeyRef.current === "";
        lastMergedKeyRef.current = mergeKey;

        setRequestItems((prev) => {
            const next = mergeRequests(
                prev,
                incoming,
                isFreshTabData ? 1 : page,
            );
            const totalPages = parsePositiveInt(servicesRequests?.meta?.totalPages);
            const total = parsePositiveInt(servicesRequests?.meta?.total);
            setHasMore(
                totalPages != null
                    ? page < totalPages
                    : total != null
                        ? next.length < total
                        : incoming.length >= PAGE_LIMIT,
            );
            return next;
        });
    }, [
        servicesRequests,
        page,
        isFetching,
        isError,
        userId,
        listKey,
        fulfilledTimeStamp,
    ]);

    const requestNextPage = useCallback(() => {
        if (!userId || isFetching || !hasMore || requestItems.length === 0) return;

        const nextPage = page + 1;
        if (maxRequestedPageRef.current >= nextPage) return;

        maxRequestedPageRef.current = nextPage;
        setPage(nextPage);
    }, [userId, isFetching, hasMore, requestItems.length, page]);

    const tryLoadFromScroll = useCallback(() => {
        if (!isSentinelVisible(sentinelRef.current)) return;
        requestNextPage();
    }, [requestNextPage]);

    const setSentinelNode = useCallback((node: HTMLDivElement | null) => {
        sentinelRef.current = node;
        setSentinelReady(!!node);
    }, []);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinelReady || !sentinel || !hasMore) return;

        const scrollRoot = getScrollParent(sentinel);
        let ticking = false;

        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(() => {
                ticking = false;
                tryLoadFromScroll();
            });
        };

        scrollRoot.addEventListener("scroll", onScroll, { passive: true });
        return () => scrollRoot.removeEventListener("scroll", onScroll);
    }, [tryLoadFromScroll, hasMore, sentinelReady]);

    const showRequestActions =
        (activeRequestTab === "service_request" &&
            activeStatusTab === "pending") ||
        activeRequestTab === "my_offers";

    const scrollToResultsOnMobile = useCallback(() => {
        if (typeof window === "undefined") return;
        if (!window.matchMedia("(max-width: 1023px)").matches) return;

        window.requestAnimationFrame(() => {
            resultsPanelRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    }, []);

    const selectRequestTab = useCallback(
        (tab: RequestTabKey) => {
            if (tab === "service_request") {
                if (activeRequestTab === "service_request") {
                    // Toggle Pending/Accepted/Rejected without changing list filter.
                    setServiceRequestMenuOpen((open) => !open);
                    return;
                }
                setActiveRequestTab("service_request");
                setServiceRequestMenuOpen(true);
                return;
            }

            setServiceRequestMenuOpen(false);
            setActiveRequestTab((prev) => (prev === tab ? prev : tab));
            scrollToResultsOnMobile();
        },
        [activeRequestTab, scrollToResultsOnMobile],
    );

    const selectStatusTab = useCallback(
        (tab: StatusTabKey) => {
            setActiveStatusTab((prev) => (prev === tab ? prev : tab));
            scrollToResultsOnMobile();
        },
        [scrollToResultsOnMobile],
    );

    const handleRequestClick = (request: ServiceRequestItem) => {
        if (showRequestActions && request.status === "pending") return;

        if (request.status === "accepted") {
            router.push("/profile?tab=my_jobs");
            return;
        }

        router.push("/services/my-service");
    };

    const handleUpdateServiceRequest = async ({
        requestId,
        date,
        action,
    }: {
        requestId: string;
        date?: Date;
        action: ServiceAction;
    }) => {
        try {
            const res = await updateServiceRequest({
                requestId,
                ...(action === "propose" && { proposedDateTime: date?.toISOString() }),
                action,
            }).unwrap();

            toast.success(res.message);

            setOfferForId(null);
            setSpinnerIndex(-1);
            setSpinnerAction(null);

            if (action === "accept") {
                setActiveRequestTab("service_request");
                setActiveStatusTab("accepted");
                setServiceRequestMenuOpen(true);
                scrollToResultsOnMobile();
                return;
            }

            lastMergedKeyRef.current = "";
            setRequestItems((prev) => {
                const next = prev.filter((item) => getRequestId(item) !== requestId);
                if (next.length === 0) setHasMore(false);
                return next;
            });
        } catch (err) {
            const errorData = err as { data?: { message?: string } };
            toast.error(errorData?.data?.message ?? "Something went wrong");
        }
    };

    return (
        <>
            <Modal
                editModalRef={modalRef}
                open={offerForId !== null}
                setOpen={(v) => {
                    const next = typeof v === "function" ? v(offerForId !== null) : v;
                    if (!next) setOfferForId(null);
                }}
                centered={true}
            >
                <DateTimePickerModal
                    setOpenPciker={() => setOfferForId(null)}
                    date={date}
                    isOfferingTime={true}
                    isLoading={isUpdating && spinnerAction === "propose"}
                    setStep={() => { }}
                    setDate={setDate}
                    onConfirm={() => {
                        handleUpdateServiceRequest({
                            requestId: offerForId ?? "",
                            action: "propose",
                            date,
                        });
                    }}
                />
            </Modal>

            {isPageLoading ? (
                <OfferedServicesPageSkeleton />
            ) : (
            <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
                {hasMyService && myService &&
                    <div className="w-full shrink-0 px-0 pb-4 pt-3 sm:pt-4">
                        <MyOfferedServiceCard serviceData={myService} />
                    </div>
               
                }
                <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col lg:max-h-[calc(115dvh-210px)] lg:flex-row">
                <div className="flex w-full shrink-0 flex-col border-b border-gray-9 bg-white px-3 pb-3 pt-3 sm:px-4 sm:pt-4 lg:min-h-0 lg:w-[min(340px,100%)] lg:max-w-full lg:overflow-y-auto lg:border-b-0 lg:border-r">
                    <div className="flex flex-col gap-3">
                        {REQUEST_TAB_KEYS.map((tab) => {
                            const meta = REQUEST_TAB_META[tab];
                            const badge = tabBadges[tab];
                            const isActive = activeRequestTab === tab;
                            const showStatusTabs =
                                tab === "service_request" &&
                                isActive &&
                                serviceRequestMenuOpen;

                            return (
                                <div key={tab} className="flex flex-col gap-2 ">
                                    <button
                                        type="button"
                                        onClick={() => selectRequestTab(tab)}
                                        className={`flex w-full items-center cursor-pointer gap-3 rounded-[14px] border px-3 py-3 text-start transition-colors ${
                                            isActive
                                                ? "border-green-1 bg-green-4"
                                                : "border-gray-9 bg-white"
                                        }`}
                                    >
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-green-4">
                                            {meta.icon}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[15px] font-semibold text-black-1">
                                                    {ph(tab)}
                                                </span>
                                                {badge != null && badge > 0 ? (
                                                    <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-gray-5 px-1.5 py-0.5 text-[11px] font-medium text-black-1">
                                                        {badge}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="mt-0.5 truncate text-[12px] font-normal text-gray-8">
                                                {ph(meta.descriptionKey)}
                                            </p>
                                        </div>
                                        <Image
                                            src={chevronRightIcon}
                                            alt=""
                                            className={`h-3.5 w-2.5 shrink-0 transition-transform rtl:rotate-180 ${
                                                showStatusTabs
                                                    ? "rotate-90 rtl:-rotate-90"
                                                    : ""
                                            }`}
                                        />
                                    </button>

                                    {showStatusTabs ? (
                                        <div
                                            className=" overflow-hidden rounded-[12px] border border-gray-9"
                                            role="tablist"
                                            aria-label={ph("service_request")}
                                        >
                                            {STATUS_TAB_KEYS.map((statusTab) => {
                                                const isStatusActive =
                                                    activeStatusTab === statusTab;
                                                return (
                                                    <button
                                                        key={statusTab}
                                                        type="button"
                                                        role="tab"
                                                        aria-selected={isStatusActive}
                                                        onClick={() =>
                                                            selectStatusTab(statusTab)
                                                        }
                                                        className={`h-[44px] w-full cursor-pointer border-b border-gray-9 px-4 text-[14px] font-medium leading-none text-black-1 last:border-b-0 ltr:text-left rtl:text-right ${
                                                            isStatusActive
                                                                ? "bg-green-4"
                                                                : "bg-white"
                                                        }`}
                                                    >
                                                        {ph(statusTab)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div
                    ref={resultsPanelRef}
                    className="flex min-w-0 flex-1 flex-col scroll-mt-[72px] bg-white lg:min-h-0"
                >
                    <div className="px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 flex-1 min-h-0 overflow-y-auto">
                        {isListInitialLoading ? (
                            <ServiceRequestSkeleton count={4} />
                        ) : showEmpty ? (
                            <p className="py-8 text-center text-[15px] font-medium text-gray-8">
                                {ph("no_data_available")}
                            </p>
                        ) : (
                            <>
                                {requestItems.map((request: ServiceRequestItem, index: number) => {
                                    const requestId = getRequestId(request) ?? "";
                                    return (
                                        <div
                                            key={requestId || index}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => handleRequestClick(request)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    handleRequestClick(request);
                                                }
                                            }}
                                            className="py-4 cursor-pointer border-b border-gray-9 flex flex-col xl:flex-row lg:items-start lg:justify-between gap-4 lg:gap-4 w-full min-w-0"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <Image
                                                        src={request?.service?.images?.[0] ?? noImageAvtar}
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
                                                        <p className="text-[15px] font-normal leading-snug mt-1 text-gray-8 break-words">
                                                            {ph("from_label")}: {request?.customer?.name}
                                                        </p>
                                                        <p className="text-[14px] font-medium leading-snug mt-1 text-green-2 break-words">
                                                            {formatPrice(request?.service?.price)}/
                                                            {request?.service?.paymentType === "hourly"
                                                                ? ph("fixed")
                                                                : ph("fixed")}
                                                        </p>
                                                    </div>
                                                </div>

                                                <p className="text-[15px] font-medium mt-1 leading-snug text-black-1 break-words">
                                                    {formatRequestedDateTime(
                                                        request?.requestedDateTime,
                                                        currentLanguage,
                                                    )}
                                                </p>
                                                <p
                                                    className={`text-[14px] mt-2 leading-snug ${request?.status === "accepted"
                                                        ? "text-green-1"
                                                        : request?.status === "rejected"
                                                            ? "text-red-1"
                                                            : request?.status === "proposed"
                                                                ? "text-[#3C9197]"
                                                                : "text-[#4B514F]"
                                                        }`}
                                                >
                                                    {request?.status === "accepted"
                                                        ? ph("accepted")
                                                        : request?.status === "rejected"
                                                            ? ph("rejected")
                                                            : request?.status === "proposed"
                                                                ? ph("you_offered_a_new_time")
                                                                : ph("pending")}
                                                </p>
                                            </div>

                                            {showRequestActions && (
                                                <div
                                                    className="w-full shrink-0 xl:w-[297px] lg:max-w-full"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                >
                                                    <DoodleButton
                                                        type="button"
                                                        disabled={isUpdating && spinnerAction === "accept"}
                                                        onClick={() => {
                                                            setSpinnerIndex(index);
                                                            setSpinnerAction("accept");
                                                            handleUpdateServiceRequest({
                                                                requestId,
                                                                action: "accept",
                                                            });
                                                        }}
                                                        className="w-full h-[42px] rounded-[6px] bg-green-1 text-white text-[14px] font-normal cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                                                    >
                                                        {isUpdating &&
                                                            spinnerAction === "accept" &&
                                                            spinnerIndex === index ? (
                                                            <BeatLoader color="white" size={8} />
                                                        ) : (
                                                            ph("accept")
                                                        )}
                                                    </DoodleButton>
                                                    <div className="mt-2 flex items-center gap-[9px]">
                                                        <button
                                                            type="button"
                                                            disabled={isUpdating && spinnerAction === "reject"}
                                                            onClick={() => {
                                                                setSpinnerIndex(index);
                                                                setSpinnerAction("reject");
                                                                handleUpdateServiceRequest({
                                                                    requestId,
                                                                    action: "reject",
                                                                });
                                                            }}
                                                            className="w-1/2  lg:w-1/2 xl:w-[144px] h-[42px] rounded-[6px] border border-green-2 text-green-2 text-[14px] font-normal cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                                                        >
                                                            {isUpdating &&
                                                                spinnerAction === "reject" &&
                                                                spinnerIndex === index ? (
                                                                <BeatLoader color="white" size={8} />
                                                            ) : (
                                                                ph("decline")
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isUpdating && spinnerAction === "propose"}
                                                            onClick={() => {
                                                                setSpinnerIndex(index);
                                                                setSpinnerAction("propose");
                                                                setOfferForId(requestId);
                                                            }}
                                                            className="w-1/2  lg:w-1/2 xl:w-[144px] h-[42px] rounded-[6px] border border-green-2 text-green-2 text-[14px] font-normal cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                                                        >
                                                            {ph("offer_new_time")}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {hasMore ? (
                                    <div
                                        ref={setSentinelNode}
                                        className="h-4 w-full shrink-0"
                                        aria-hidden
                                    />
                                ) : null}
                                {isLoadingMore ? (
                                    <div className="flex justify-center py-6">
                                        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-4 border-t-green-1" />
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>
                </div>
                </div>
            </div>
            )}
        </>
    );
}

export default OfferedServices;
