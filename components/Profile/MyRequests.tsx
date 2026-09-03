"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import DoodleButton from "@/components/Ui/DoodleButton";
import chevronIcon from "@/assets/icons/chevron.svg";
import {
  useGetBookedServicesQuery,
  useUpdateServiceRequestMutation,
} from "@/store/services/sellingService";
import { getUserId } from "@/utils/getUserId";
import noImageAvtar from "@/assets/images/no-image-av.png";
import { formatRequestedDateTime } from "@/utils/formatRequestedDateTime";
import { formatPrice } from "@/utils/formatPrice";
import ServiceRequestSkeleton from "@/components/Services/ServiceRequestSkeleton";
import { BeatLoader } from "react-spinners";
import toast from "react-hot-toast";
import { parsePositiveInt } from "../Updates/Notifications";
import useInitiateChat from "@/custom-hooks/useInitiateChat";

function MessageIcon({ className }: { className?: string }) {
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

const PAGE_LIMIT = 10;
const SCROLL_LOAD_MARGIN_PX = 200;

const REQUEST_FILTER_KEYS = ["sent", "new_offer", "accepted", "rejected"] as const;
type RequestFilterKey = (typeof REQUEST_FILTER_KEYS)[number];

const REQUEST_FILTER_QUERY: Record<
  RequestFilterKey,
  { status: string; jobStatus?: string }
> = {
  sent: { status: "pending", jobStatus: "not_started" },
  new_offer: { status: "proposed", jobStatus: "not_started" },
  accepted: { status: "accepted" },
  rejected: { status: "rejected" },
};

type CustomerServiceRequest = {
  _id?: string;
  id?: string;
  status?: string;
  requestedDateTime?: string;
  proposedDateTime?: string;
  service?: {
    title?: string;
    price?: string | number;
    paymentType?: string;
    images?: string[];
  };
  provider?: {
    id?: string;
    _id?: string;
    name?: string;
  };
};

type ServiceAction = "accept" | "reject";

function getRequestId(request: CustomerServiceRequest, index: number): string {
  return String(request._id ?? request.id ?? index);
}

function getRequestApiId(request: CustomerServiceRequest): string | undefined {
  return request._id ?? request.id;
}

function mergeRequests(
  prev: CustomerServiceRequest[],
  incoming: CustomerServiceRequest[],
  page: number,
): CustomerServiceRequest[] {
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

function getOfferDateTime(item: CustomerServiceRequest): string | undefined {
  return item.proposedDateTime ?? item.requestedDateTime;
}

function isNewOfferExpired(item: CustomerServiceRequest): boolean {
  const dateStr = getOfferDateTime(item);
  if (!dateStr) return false;
  const ts = new Date(dateStr).getTime();
  return Number.isFinite(ts) && ts < Date.now();
}

function MyRequests() {
  const { placeholders, currentLanguage, error_messages } = useDictionary();
  type PlaceholderKey = keyof typeof placeholders;
  const userId = getUserId();
  const [activeFilter, setActiveFilter] = useState<RequestFilterKey>("sent");
  const [page, setPage] = useState(1);
  const [requestItems, setRequestItems] = useState<CustomerServiceRequest[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [spinnerIndex, setSpinnerIndex] = useState(-1);
  const [spinnerAction, setSpinnerAction] = useState<ServiceAction | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const [sentinelReady, setSentinelReady] = useState(false);
  const lastMergedKeyRef = useRef("");
  const maxRequestedPageRef = useRef(1);

  const [updateServiceRequest, { isLoading: isUpdating }] =
    useUpdateServiceRequestMutation();
  const { onInitiateChat } = useInitiateChat();
  const [chattingRequestId, setChattingRequestId] = useState<string>("");

  const requestQueryParams = useMemo(() => {
    const { status, jobStatus } = REQUEST_FILTER_QUERY[activeFilter];
    return {
      status,
      ...(jobStatus ? { jobStatus } : {}),
    };
  }, [activeFilter]);

  const {
    data: servicesRequests,
    isLoading,
    isFetching,
    fulfilledTimeStamp,
    refetch,
  } = useGetBookedServicesQuery(
    {
      customerId: userId,
      page,
      limit: PAGE_LIMIT,
      ...requestQueryParams,
    },
    { skip: !userId, refetchOnMountOrArgChange: true },
  );

  const ph = (key: PlaceholderKey) => placeholders[key];
  const isInitialLoading =
    requestItems.length === 0 && (isLoading || isFetching);
  const isLoadingMore = isFetching && page > 1;
  const showEmpty = !isInitialLoading && requestItems.length === 0;

  const resetPagination = useCallback(() => {
    setPage(1);
    setRequestItems([]);
    setHasMore(true);
    lastMergedKeyRef.current = "";
    maxRequestedPageRef.current = 1;
  }, []);

  useEffect(() => {
    resetPagination();
  }, [activeFilter, resetPagination]);

  useEffect(() => {
    if (servicesRequests == null || isFetching) return;

    const incoming =
      (servicesRequests?.data as CustomerServiceRequest[] | undefined) ?? [];
    const mergeKey = `${activeFilter}-${page}-${fulfilledTimeStamp ?? 0}`;
    if (lastMergedKeyRef.current === mergeKey) return;
    lastMergedKeyRef.current = mergeKey;

    setRequestItems((prev) => {
      const next = mergeRequests(prev, incoming, page);
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
  }, [servicesRequests, page, isFetching, activeFilter, fulfilledTimeStamp]);

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

  const handleUpdateServiceRequest = async (
    requestId: string,
    action: ServiceAction,
    index: number,
  ) => {
    setSpinnerIndex(index);
    setSpinnerAction(action);
    try {
      const res = await updateServiceRequest({ requestId, action }).unwrap();
      toast.success(
        (res as { message?: string })?.message ?? placeholders.update,
      );
      resetPagination();
      await refetch();
    } catch (err) {
      const errorData = err as { data?: { message?: string } };
      toast.error(
        errorData?.data?.message ?? error_messages.something_went_wrong,
      );
    } finally {
      setSpinnerIndex(-1);
      setSpinnerAction(null);
    }
  };

  const handleChatProvider = async (providerId: string, requestId: string) => {
    if (!userId || !providerId || !requestId) return;
    setChattingRequestId(requestId);
    try {
      await onInitiateChat(userId, providerId);
    } finally {
      setChattingRequestId("");
    }
  };

  const getStatusClass = (status?: string) => {
    if (status === "accepted") return "text-green-1";
    if (status === "rejected") return "text-red-1";
    if (status === "proposed") return "text-[#3C9197]";
    if (status === "pending") return "text-red-1";
    return "text-gray-8";
  };

  const getStatusLabel = (status?: string) => {
    if (status === "accepted") return ph("accepted");
    if (status === "rejected") return ph("rejected");
    if (status === "proposed") return ph("proposed" as PlaceholderKey);
    return ph("pending");
  };

  return (
    <div className="h-full">
      <div>
        <div className="border-b px-4 border-gray-9 flex items-center justify-center">
          <div className="h-[72px] w-[522px] flex items-center gap-2 text-[14px]">
            <span className="text-gray-11">{ph("profile")}</span>
            <Image src={chevronIcon} alt="chevron" className="ltr:rotate-180" />
            <span className="text-green-2">{ph("my_requests")}</span>
          </div>
        </div>
        <div className="flex justify-center px-4">
          <div className="w-[522px] pt-5">
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
              {REQUEST_FILTER_KEYS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`h-[34px] px-3 rounded-full border text-[14px] font-normal whitespace-nowrap cursor-pointer ${activeFilter === filter
                    ? "border-green-1 bg-green-4 text-black-1"
                    : "border-gray-2 bg-white text-black-1"
                    }`}
                >
                  {ph(filter)}
                </button>
              ))}
            </div>

            <div className="mt-4 max-w-[760px] bg-white">
              {isInitialLoading ? (
                <ServiceRequestSkeleton count={3} />
              ) : showEmpty ? (
                <p className="py-8 text-center text-[15px] font-medium text-gray-8">
                  {ph("no_data_available")}
                </p>
              ) : (
                <>
                  {requestItems.map((item, index) => {
                    const requestId = getRequestApiId(item);
                    const providerName = item.provider?.name ?? "";
                    const providerId =
                      item.provider?.id ?? item.provider?._id ?? "";
                    const priceLabel = item.service?.price
                      ? `${formatPrice(item.service.price)}/${item.service.paymentType === "hourly" ? ph("fixed") : ph("fixed")}`
                      : "";
                    const offerExpired =
                      activeFilter === "new_offer" && isNewOfferExpired(item);
                    const offerDateTime = getOfferDateTime(item);
                    const showOfferActions =
                      activeFilter === "new_offer" &&
                      Boolean(requestId) &&
                      !offerExpired;
                    const showChatAction =
                      activeFilter === "accepted" && Boolean(providerId);
                    const isThisChatLoading =
                      Boolean(requestId) && chattingRequestId === requestId;

                    return (
                      <div
                        key={getRequestId(item, index)}
                        className="py-4 border-b border-gray-9"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-3">
                              <Image
                                src={
                                  item.service?.images?.[0] ||
                                  item.service?.images?.[1] ||
                                  noImageAvtar
                                }
                                alt={item.service?.title ?? ""}
                                width={60}
                                height={60}
                                className="w-[60px] h-[60px] rounded-[8px] object-cover shrink-0 bg-gray-5"
                                unoptimized
                              />
                              <div className="min-w-0 flex-1">
                                <h3 className="text-[15px] font-medium leading-none text-black-1">
                                  {item.service?.title}
                                </h3>
                                <p className="text-[15px] font-normal mt-1 leading-none text-gray-8">
                                  {ph("to_label")}: {providerName}
                                </p>
                                {priceLabel ? (
                                  <p className="text-[14px] font-medium mt-1 leading-none text-green-1">
                                    {priceLabel}
                                  </p>
                                ) : null}
                              </div>

                            </div>
                            {activeFilter === "new_offer" && providerName ? (
                              <p className="text-[15px] text-green-1 font-medium mt-4 leading-none">
                                {ph("proposed_new_time").replace(
                                  "{name}",
                                  providerName,
                                )}
                              </p>
                            ) : null}
                            {offerDateTime ? (
                              <p className="text-[15px] font-medium mt-2 leading-none text-black-1">
                                {formatRequestedDateTime(
                                  offerDateTime,
                                  currentLanguage,
                                )}
                              </p>
                            ) : null}
                            <p
                              className={`text-[14px] font-normal mt-2 leading-none ${offerExpired ? "text-red-1" : getStatusClass(item.status)}`}
                            >
                              {offerExpired ? ph("expired") : getStatusLabel(item.status)}
                            </p>
                          </div>


                          {showChatAction ? (
                            <DoodleButton
                              type="button"
                              disabled={Boolean(chattingRequestId)}
                              onClick={() => {
                                if (!requestId) return;
                                void handleChatProvider(providerId, requestId);
                              }}
                              className="flex h-[38px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-green-1 px-3 text-[14px] font-normal text-white disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
                            >
                              {isThisChatLoading ? (
                                <BeatLoader color="white" size={8} />
                              ) : (
                                <>
                                  <MessageIcon className="h-5 w-5 shrink-0" />
                                  {ph("message")}
                                </>
                              )}
                            </DoodleButton>
                          ) : null}
                        </div>

                        {showOfferActions ? (
                          <div className="mt-4 flex items-center gap-2">
                            <DoodleButton
                              type="button"
                              disabled={isUpdating}
                              onClick={() => {
                                if (!requestId) return;
                                void handleUpdateServiceRequest(
                                  requestId,
                                  "accept",
                                  index,
                                );
                              }}
                              className="flex-1 h-[42px] rounded-[6px] bg-green-1 text-white text-[14px] font-normal cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                            >
                              {isUpdating &&
                                spinnerAction === "accept" &&
                                spinnerIndex === index ? (
                                <BeatLoader color="white" size={8} />
                              ) : (
                                ph("accept")
                              )}
                            </DoodleButton>
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => {
                                if (!requestId) return;
                                void handleUpdateServiceRequest(
                                  requestId,
                                  "reject",
                                  index,
                                );
                              }}
                              className="flex-1 h-[42px] rounded-[6px] border border-green-2 text-green-2 text-[14px] font-normal cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                            >
                              {isUpdating &&
                                spinnerAction === "reject" &&
                                spinnerIndex === index ? (
                                <BeatLoader color="#25A1A1" size={8} />
                              ) : (
                                ph("decline")
                              )}
                            </button>
                          </div>
                        ) : null}
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
    </div>
  );
}

export default MyRequests;
