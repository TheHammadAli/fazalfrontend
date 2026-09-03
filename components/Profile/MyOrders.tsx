"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import chevron from "@/assets/icons/chev-down-icon.svg";
import chevronIcon from "@/assets/icons/chevron.svg";
import chevronRight from "@/assets/icons/chevron-right-icon.svg";
import noImageAvtar from "@/assets/images/no-image-av.png";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import {
  useGetOrdersByBuyerQuery,
  useGetOrdersByOwnerQuery,
  useUpdateOrderStatusMutation,
} from "@/store/services/sellingService";
import { getUserId } from "@/utils/getUserId";
import { formatPrice } from "@/utils/formatPrice";
import Tabs from "../Ui/Tabs";
import { parsePositiveInt } from "../Updates/Notifications";
import { useRouter } from "next/navigation";
import { useClickOutside } from "@/custom-hooks/useClickOutside";
import { toast } from "react-hot-toast";
import { BeatLoader } from "react-spinners";
import DoodleButton from "@/components/Ui/DoodleButton";

const PAGE_LIMIT = 15;

const ORDER_STATUS_KEYS = [
  "all",
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  // "cancelled",
] as const;

const MANAGE_STATUS_KEYS = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  // "cancelled",
] as const;

type OrderStatusKey = (typeof ORDER_STATUS_KEYS)[number];
type OrderTypeKey = "sold" | "bought";
type ManageStatusKey = (typeof MANAGE_STATUS_KEYS)[number];

type CustomerOrder = {
  _id?: string;
  id?: string;
  amount?: number;
  paymentType?: string;
  status?: string;
  product: {
    id?: string;
    _id?: string;
    title: string;
    price: number | string;
    images: string[];
  } | null;
};

function getProductId(order: CustomerOrder): string | undefined {
  return order.product?.id ?? order.product?._id;
}

function getOrderId(order: CustomerOrder, index: number): string {
  return String(order._id ?? order.id ?? index);
}

function getOrderStatusColorClass(status?: string): string {
  if (status === "pending" || status === "cancelled") return "text-[#E92440]";
  if (status === "shipped") return "text-green-1";
  return "text-[#030303]";
}

function mergeOrders(
  prev: CustomerOrder[],
  incoming: CustomerOrder[],
  page: number,
): CustomerOrder[] {
  if (page === 1) return incoming;
  const seen = new Set(prev.map((order) => order._id ?? order.id));
  const next = [...prev];
  for (const order of incoming) {
    const key = order._id ?? order.id;
    if (key && !seen.has(key)) {
      seen.add(key);
      next.push(order);
    }
  }
  return next;
}

type OrderStatusDropdownProps = {
  orderId: string;
  currentStatus: string;
  selectedStatus: ManageStatusKey | "";
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (status: ManageStatusKey) => void;
  onClose: () => void;
  chooseLabel: string;
  statusLabel: (key: ManageStatusKey) => string;
};

function OrderStatusDropdown({
  orderId,
  currentStatus,
  selectedStatus,
  isOpen,
  onToggle,
  onSelect,
  onClose,
  chooseLabel,
  statusLabel,
}: OrderStatusDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  useClickOutside(dropdownRef, onClose);

  const displayLabel = selectedStatus
    ? statusLabel(selectedStatus)
    : chooseLabel;

  return (
    <div ref={dropdownRef} className="relative mt-2">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex h-[42px] w-full cursor-pointer items-center justify-between rounded-[6px] border border-[#D3D3D3] bg-white px-3 text-[14px] font-normal text-[#030303]"
      >
        <span className={selectedStatus ? "text-[#030303]" : "text-[#4B514F]"}>
          {displayLabel}
        </span>
        <Image
          src={chevron}
          alt=""
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen ? (
        <div className="mt-1 w-full overflow-hidden rounded-[6px] border border-[#D3D3D3] bg-white shadow-md">
          {MANAGE_STATUS_KEYS.map((statusKey) => {
            const isSelected =
              selectedStatus === statusKey ||
              (!selectedStatus && currentStatus === statusKey);
            return (
              <button
                key={`${orderId}-${statusKey}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(statusKey);
                }}
                className={`w-full cursor-pointer px-3 py-3 text-left text-[14px] font-normal leading-none hover:bg-[#E6FBFB] ${isSelected ? "bg-[#E6FBFB] text-green-1" : "text-[#030303]"
                  }`}
              >
                {statusLabel(statusKey)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function MyOrders() {
  const userId = getUserId() ?? "";
  const { tabs, placeholders, error_messages } = useDictionary();
  const listRef = useRef<HTMLDivElement>(null);
  const lastMergedKeyRef = useRef("");
  const isLoadingNextPageRef = useRef(false);
  const router = useRouter();
  const orderTypes = useMemo(
    () => [
      { title: placeholders.sold, key: "sold" as const },
      { title: placeholders.bought, key: "bought" as const },
    ],
    [placeholders.sold, placeholders.bought],
  );

  const [activeOrderType, setActiveOrderType] = useState<OrderTypeKey>("sold");
  const [activeStatus, setActiveStatus] = useState<OrderStatusKey>("all");
  const [page, setPage] = useState(1);
  const [orderItems, setOrderItems] = useState<CustomerOrder[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [selectedStatusByOrder, setSelectedStatusByOrder] = useState<
    Record<string, ManageStatusKey | "">
  >({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const isBought = activeOrderType === "bought";

  const {
    data: buyerOrders,
    isLoading: isBuyerLoading,
    isFetching: isBuyerFetching,
    fulfilledTimeStamp: buyerFulfilledTimeStamp,
  } = useGetOrdersByBuyerQuery(
    {
      buyerId: userId,
      page,
      limit: PAGE_LIMIT,
      ...(activeStatus !== "all" && { status: activeStatus }),
    },
    { skip: !userId || !isBought, refetchOnMountOrArgChange: true },
  );

  const {
    data: ownerOrders,
    isLoading: isOwnerLoading,
    isFetching: isOwnerFetching,
    fulfilledTimeStamp: ownerFulfilledTimeStamp,
  } = useGetOrdersByOwnerQuery(
    {
      ownerId: userId,
      ownerModel: "User",
      page,
      limit: PAGE_LIMIT,
      ...(activeStatus !== "all" && { status: activeStatus }),
    },
    { skip: !userId || isBought, refetchOnMountOrArgChange: true },
  );

  const [updateOrderStatus, { isLoading: isUpdatingStatus }] =
    useUpdateOrderStatusMutation();

  const activeResponse = isBought ? buyerOrders : ownerOrders;
  const isLoading = isBought ? isBuyerLoading : isOwnerLoading;
  const isFetching = isBought ? isBuyerFetching : isOwnerFetching;
  const fulfilledTimeStamp = isBought
    ? buyerFulfilledTimeStamp
    : ownerFulfilledTimeStamp;
  const count = isBought
    ? buyerOrders?.meta?.total ?? 0
    : ownerOrders?.meta?.total ?? 0;

  const statusLabel = (key: ManageStatusKey) =>
    tabs?.[key as keyof typeof tabs] ??
    placeholders[key as keyof typeof placeholders] ??
    key;

  useEffect(() => {
    setPage(1);
    setOrderItems([]);
    setHasMore(true);
    setActiveStatus("all");
    setExpandedOrderId(null);
    setOpenDropdownId(null);
    setSelectedStatusByOrder({});
    lastMergedKeyRef.current = "";
    isLoadingNextPageRef.current = false;
  }, [activeOrderType]);

  useEffect(() => {
    setPage(1);
    setOrderItems([]);
    setHasMore(true);
    setExpandedOrderId(null);
    setOpenDropdownId(null);
    setSelectedStatusByOrder({});
    lastMergedKeyRef.current = "";
    isLoadingNextPageRef.current = false;
  }, [activeStatus]);

  useEffect(() => {
    if (activeResponse == null || isFetching) return;

    const incoming = (activeResponse?.data as CustomerOrder[] | undefined) ?? [];
    const mergeKey = `${activeOrderType}-${page}-${fulfilledTimeStamp ?? 0}`;
    if (lastMergedKeyRef.current === mergeKey) return;
    lastMergedKeyRef.current = mergeKey;

    setOrderItems((prev) => mergeOrders(prev, incoming, page));
    const totalPages = parsePositiveInt(activeResponse?.meta?.totalPages);
    setHasMore(
      totalPages != null ? page < totalPages : incoming.length >= PAGE_LIMIT,
    );
  }, [activeResponse, page, isFetching, fulfilledTimeStamp, activeOrderType]);

  useEffect(() => {
    if (!isFetching) {
      isLoadingNextPageRef.current = false;
    }
  }, [isFetching]);

  function handleScrollNearBottom(e: React.UIEvent<HTMLDivElement>) {
    if (!userId || isFetching || !hasMore || orderItems.length === 0) return;
    if (isLoadingNextPageRef.current) return;

    const el = e.currentTarget;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
    if (!nearBottom) return;

    isLoadingNextPageRef.current = true;
    setPage((p) => p + 1);
  }

  function openManageOrder(orderId: string) {
    setExpandedOrderId((prev) => {
      if (prev === orderId) {
        setOpenDropdownId(null);
        return null;
      }
      setOpenDropdownId(orderId);
      return orderId;
    });
  }

  function goToProductDetail(order: CustomerOrder, type: OrderTypeKey) {
    const productId = getProductId(order);
    if (!productId) return;
    if (type === "sold") {
      router.push(`/selling/product-detail?id=${productId}`);
    } else {
      router.push(`/buy-product?id=${productId}`);
    }
  }

  async function handleUpdateStatus(order: CustomerOrder, orderId: string) {
    const nextStatus = selectedStatusByOrder[orderId];
    if (!nextStatus || nextStatus === order.status) return;

    setUpdatingOrderId(orderId);
    try {
      const res = await updateOrderStatus({
        orderId,
        status: nextStatus,
        amount: order.amount,
        paymentType: order.paymentType,
      }).unwrap();
      toast.success(
        (res as { message?: string })?.message ?? placeholders.update,
      );
      setSelectedStatusByOrder((prev) => ({ ...prev, [orderId]: "" }));
      setOpenDropdownId(null);
      setOrderItems((prev) =>
        prev.map((item, i) =>
          getOrderId(item, i) === orderId
            ? { ...item, status: nextStatus }
            : item,
        ),
      );
    } catch (err) {
      const errorData = err as { data?: { message?: string } };
      toast.error(
        errorData?.data?.message ?? error_messages.something_went_wrong,
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  const ph = (key: keyof typeof placeholders) => placeholders[key];
  const isInitialLoading = orderItems.length === 0 && (isLoading || isFetching);
  const isLoadingMore = isFetching && page > 1;
  const showEmpty = !isInitialLoading && count === 0;

  return (
    <div className=" h-full min-h-0 flex-col space-y-2">
      <div className="shrink-0 border-b border-gray-9 flex items-center justify-center">
        <div className="h-[72px] w-full max-w-[522px] flex items-center gap-2 px-4 text-[14px] sm:px-0">
          <span className="text-gray-11">{ph("profile")}</span>
          <Image src={chevronIcon} alt="" className="ltr:rotate-180" />
          <span className="text-green-2">{ph("my_orders")}</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 justify-center px-4 sm:px-0">
        <div className="flex w-full max-w-[522px] min-h-0 flex-1 flex-col">
          <Tabs
            paddingX="px-5 md:px-8"
            tabs={orderTypes}
            activeTab={activeOrderType}
            setActiveTab={(value) => setActiveOrderType(value as OrderTypeKey)}
          />

          <div className="mt-4 flex gap-2 overflow-x-auto hide-scrollbar">
            {ORDER_STATUS_KEYS.map((statusKey) => {
              const isActive = activeStatus === statusKey;
              return (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => setActiveStatus(statusKey)}
                  className={`min-w-max cursor-pointer rounded-full border px-3 py-2 text-[14px] font-normal leading-[14px] text-[#030303] ${isActive
                    ? "border-green-1 bg-[#E6FBFB]"
                    : "border-[#D3D3D3] bg-transparent"
                    }`}
                >
                  {tabs?.[statusKey as keyof typeof tabs]}
                </button>
              );
            })}
          </div>

          <div
            ref={listRef}
            onScroll={handleScrollNearBottom}
            className="mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar pb-6"
          >
            {isInitialLoading ? (
              <div className="space-y-7">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex animate-pulse items-center justify-between rounded-lg p-2"
                  >
                    <div className="flex gap-3">
                      <div className="h-[66px] w-[66px] rounded-xl bg-gray-200" />
                      <div className="space-y-2">
                        <div className="h-4 w-40 rounded bg-gray-200" />
                        <div className="h-3 w-24 rounded bg-gray-200" />
                        <div className="h-3 w-20 rounded bg-gray-200" />
                      </div>
                    </div>
                    <div className="h-3.5 w-3.5 rounded bg-gray-200" />
                  </div>
                ))}
              </div>
            ) : count > 0 ? (
              <>
                <div className={isBought ? "space-y-7" : "space-y-4"}>
                  {orderItems.map((order, index) => {
                    const orderId = getOrderId(order, index);
                    const productId = getProductId(order);

                    if (isBought) {
                      return (
                        <div
                          key={orderId}
                          onClick={() => goToProductDetail(order, "bought")}
                          className="flex cursor-pointer items-center justify-between rounded-lg p-2 hover:bg-[#E6FBFB]"
                        >
                          <div className="flex min-w-0 flex-1 gap-3">
                            <Image
                              src={
                                (order?.product?.images?.length ?? 0) > 0
                                  ? order.product!.images[0]
                                  : noImageAvtar
                              }
                              height={100}
                              width={100}
                              unoptimized
                              alt="product"
                              className="h-[66px] w-[66px] shrink-0 rounded-xl object-cover"
                            />
                            <div className="min-w-0">
                              <h3 className="truncate text-[16px] font-medium text-[#030303]">
                                {order?.product?.title ?? ""}
                              </h3>
                              <p className="text-[14px] font-medium text-green-1">
                                {placeholders.Rs} {formatPrice(order?.product?.price)}
                              </p>
                              <p className={`text-[14px] font-normal ${getOrderStatusColorClass(order?.status)}`}>
                                {
                                  placeholders?.[
                                  order?.status as keyof typeof placeholders
                                  ]
                                }
                              </p>
                            </div>
                          </div>
                          <Image
                            src={chevron}
                            alt=""
                            className="w-3.5 shrink-0 ltr:-rotate-90 rtl:rotate-90"
                          />
                        </div>
                      );
                    }

                    const isExpanded = expandedOrderId === orderId;
                    const selectedStatus = selectedStatusByOrder[orderId] ?? "";
                    const isUpdatingThis =
                      isUpdatingStatus && updatingOrderId === orderId;
                    const canUpdate =
                      !!selectedStatus && selectedStatus !== order.status;

                    return (
                      <div
                        key={orderId}
                        className="rounded-lg border border-transparent"
                      >
                        <div className="flex items-stretch gap-2">
                          <button
                            type="button"
                            onClick={() => goToProductDetail(order, "sold")}
                            disabled={!productId}
                            className="flex min-w-0 flex-1 cursor-pointer items-center justify-between rounded-lg p-2 text-left hover:bg-[#E6FBFB] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <div className="flex min-w-0 flex-1 gap-3">
                              <Image
                                src={
                                  (order?.product?.images?.length ?? 0) > 0
                                    ? order.product!.images[0]
                                    : noImageAvtar
                                }
                                height={100}
                                width={100}
                                unoptimized
                                alt="product"
                                className="h-[66px] w-[66px] shrink-0 rounded-xl object-cover"
                              />
                              <div className="min-w-0">
                                <h3 className="truncate text-[16px] font-medium text-[#030303]">
                                  {order?.product?.title ?? ""}
                                </h3>
                                <p className="text-[14px] font-medium text-green-1">
                                  {placeholders.Rs} {formatPrice(order?.product?.price)}
                                </p>
                                <p
                                  className={`text-[14px] font-normal ${getOrderStatusColorClass(order?.status)}`}
                                >
                                  {
                                    placeholders?.[
                                    order?.status as keyof typeof placeholders
                                    ]
                                  }
                                </p>
                              </div>
                            </div>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                openManageOrder(orderId);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openManageOrder(orderId);
                                }
                              }}
                              className={`flex shrink-0 cursor-pointer items-center gap-2 text-[13px] font-medium whitespace-nowrap ${isExpanded
                                ? "text-green-1"
                                : "text-[#030303] hover:text-green-1"
                                }`}
                            >
                              <span>{placeholders.manage_order}</span>
                              <Image
                                src={chevronRight}
                                alt=""
                                className={`h-[12px] w-[12px] shrink-0 transition-transform ${isExpanded ? "rotate-90" : "rtl:rotate-180"}`}
                              />
                            </div>
                          </button>
                        </div>

                        {isExpanded ? (
                          <div className="mt-4 border-t border-[#E6E6E6] pt-4">
                            <h4 className="text-[15px] font-medium text-[#030303]">
                              {placeholders.manage_order}
                            </h4>
                            <OrderStatusDropdown
                              orderId={orderId}
                              currentStatus={order.status ?? ""}
                              selectedStatus={selectedStatus}
                              isOpen={openDropdownId === orderId}
                              onToggle={() =>
                                setOpenDropdownId((prev) =>
                                  prev === orderId ? null : orderId,
                                )
                              }
                              onClose={() => setOpenDropdownId(null)}
                              onSelect={(statusKey) => {
                                setSelectedStatusByOrder((prev) => ({
                                  ...prev,
                                  [orderId]: statusKey,
                                }));
                                setOpenDropdownId(null);
                              }}
                              chooseLabel={placeholders.choose}
                              statusLabel={statusLabel}
                            />
                            <DoodleButton
                              type="button"
                              disabled={!canUpdate || isUpdatingThis}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleUpdateStatus(order, orderId);
                              }}
                              className="mt-3 flex h-[42px] w-full cursor-pointer items-center justify-center rounded-[6px] bg-green-1 text-[14px] font-normal text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isUpdatingThis ? (
                                <BeatLoader color="white" size={8} />
                              ) : (
                                placeholders.update
                              )}
                            </DoodleButton>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {isLoadingMore ? (
                  <div className="flex justify-center py-6">
                    <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-4 border-t-green-1" />
                  </div>
                ) : null}
              </>
            ) : showEmpty ? (
              <div className="flex h-[300px] w-full items-center justify-center text-center text-[14px] text-[#4B514F]">
                {error_messages.no_orders_data}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyOrders;
