"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import chevronIcon from "@/assets/icons/chevron.svg";
import backIcon from "@/assets/icons/back-arrow.svg";
import noImageAvtar from "@/assets/images/no-image-av.png";
import DoodleButton from "@/components/Ui/DoodleButton";
import AvatarUi from "@/components/Ui/AvatarUi";
import { BeatLoader } from "react-spinners";
import toast from "react-hot-toast";
import formatFromNowShort from "@/utils/formatFromNowShort";
import { formatPrice } from "@/utils/formatPrice";
import { getUserId } from "@/utils/getUserId";
import useInitiateChat from "@/custom-hooks/useInitiateChat";
import {
  useGetMyOfferedBroadcastsQuery,
  useGetMySentBroadcastOffersQuery,
  useGetOffersForBroadcastQuery,
  useAcceptBroadcastOfferMutation,
  useDeclineBroadcastOfferMutation,
} from "@/store/services/broadcastOfferService";
import {
  useGetMyReceivedProductOffersQuery,
  useGetMySentProductOffersQuery,
  useGetOffersForProductQuery,
  useAcceptProductOfferMutation,
  useDeclineProductOfferMutation,
} from "@/store/services/productOfferService";
import { initializeSocket } from "@/utils/socket";
import { useAppDispatch } from "@/store/store";
import baseApi from "@/store/baseApi";

const PAGE_LIMIT = 10;

type TopTab = "received" | "sent";
type ReceivedType = "broadcast" | "product";

type OfferedBroadcastItem = {
  broadcastId: string;
  offerCount: number;
  latestOfferAt: string;
  broadcast: { _id: string; message: string; type: "product" | "service" };
};

type OfferedProductItem = {
  productId: string;
  offerCount: number;
  latestOfferAt: string;
  product: { _id: string; title: string; price: number; images?: string[] };
};

type BroadcastOfferItem = {
  _id: string;
  price?: number | null;
  message: string;
  status: "pending" | "accepted" | "declined";
  thread: string;
  createdAt: string;
  offerer?: { _id: string; name?: string; image?: string };
};

type ProductOfferItem = {
  _id: string;
  price?: number | null;
  message: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  offerer?: { _id: string; name?: string; image?: string };
};

function StatusBadge({
  status,
  ph,
}: {
  status: "pending" | "accepted" | "declined";
  ph: (key: string) => string;
}) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium ${status === "accepted"
          ? "bg-green-4 text-green-1"
          : status === "declined"
            ? "bg-red-50 text-red-1"
            : "bg-gray-100 text-gray-8"
        }`}
    >
      {status === "accepted" ? ph("accepted") : status === "declined" ? ph("rejected") : ph("proposed")}
    </span>
  );
}

function ReceivedBroadcastPanel({
  selected,
  setSelected,
}: {
  selected: OfferedBroadcastItem | null;
  setSelected: (v: OfferedBroadcastItem | null) => void;
}) {
  const { placeholders, currentLanguage } = useDictionary();
  const ph = (key: string) => String((placeholders as any)[key] ?? key);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<OfferedBroadcastItem[]>([]);
  const [respondingOfferId, setRespondingOfferId] = useState("");
  const [respondingAction, setRespondingAction] = useState<"accept" | "decline" | null>(null);

  const { data, isLoading, isFetching } = useGetMyOfferedBroadcastsQuery({ page, limit: PAGE_LIMIT });

  useEffect(() => {
    const incoming = (data?.data as OfferedBroadcastItem[] | undefined) ?? [];
    setItems((prev) => (page === 1 ? incoming : [...prev, ...incoming]));
  }, [data, page]);

  const totalPages = Number(data?.meta?.totalPages) || 1;
  const hasMore = page < totalPages;
  const isInitialLoading = items.length === 0 && (isLoading || isFetching) && page === 1;
  const showEmpty = !isInitialLoading && items.length === 0 && !selected;

  const { data: offersData, isFetching: isOffersFetching } = useGetOffersForBroadcastQuery(
    { broadcastId: selected?.broadcastId ?? "" },
    { skip: !selected?.broadcastId },
  );
  const offers = (offersData?.data?.offers as BroadcastOfferItem[] | undefined) ?? [];
  const isOffersLoading = isOffersFetching && offers.length === 0;

  const [acceptOffer] = useAcceptBroadcastOfferMutation();
  const [declineOffer] = useDeclineBroadcastOfferMutation();

  useEffect(() => {
    const socket = initializeSocket("broadcast");
    const onReceive = () => dispatch(baseApi.util.invalidateTags(["BROADCAST_OFFER"]));
    socket?.on("receiveBroadcastMessage", onReceive);
    return () => {
      socket?.off("receiveBroadcastMessage", onReceive);
    };
  }, [dispatch]);

  const handleRespond = useCallback(
    async (offer: BroadcastOfferItem, action: "accept" | "decline") => {
      setRespondingOfferId(offer._id);
      setRespondingAction(action);
      try {
        const mutate = action === "accept" ? acceptOffer : declineOffer;
        const res = await mutate({ offerId: offer._id }).unwrap();
        toast.success(action === "accept" ? ph("offer_accepted_success") : ph("offer_declined_success"));
        if (action === "accept") {
          const threadId = (res as any)?.data?.threadId;
          if (threadId) router.push(`/chat?threadType=broadcast&chatId=${threadId}`);
        }
      } catch (err: any) {
        toast.error(err?.data?.message ?? "Unable to update offer");
      } finally {
        setRespondingOfferId("");
        setRespondingAction(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [acceptOffer, declineOffer, router],
  );

  if (selected) {
    return (
      <>
        <p className="mb-3 truncate text-[15px] font-medium text-black-1">
          {selected.broadcast?.message}
        </p>
        {isOffersLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-[12px] bg-gray-200" />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <p className="py-8 text-center text-[15px] font-medium text-gray-8">{ph("no_offers_yet")}</p>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => {
              const isThisResponding = respondingOfferId === offer._id;
              return (
                <div key={offer._id} className="rounded-[12px] border border-gray-9 p-4">
                  <div className="flex items-center gap-2">
                    <AvatarUi
                      image={offer.offerer?.image ?? ""}
                      name={offer.offerer?.name ?? ""}
                      className="h-9 w-9 rounded-full bg-[#e7f4f5] !text-green-1"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-black-1">{offer.offerer?.name}</p>
                      {offer.price != null && (
                        <p className="text-[15px] font-medium text-green-1">
                          {ph("Rs")} {formatPrice(offer.price)}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={offer.status} ph={ph} />
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[14px] text-black-1">{offer.message}</p>
                  <p className="mt-1 text-[12px] text-gray-8">
                    {formatFromNowShort(offer.createdAt, currentLanguage as "en" | "ur")}
                  </p>
                  {offer.status === "pending" ? (
                    <div className="mt-3 flex items-center gap-2">
                      <DoodleButton
                        type="button"
                        disabled={Boolean(respondingOfferId)}
                        onClick={() => handleRespond(offer, "accept")}
                        className="flex-1 h-[38px] rounded-[6px] bg-green-1 text-white text-[14px] font-normal cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                      >
                        {isThisResponding && respondingAction === "accept" ? (
                          <BeatLoader color="white" size={8} />
                        ) : (
                          ph("accept")
                        )}
                      </DoodleButton>
                      <button
                        type="button"
                        disabled={Boolean(respondingOfferId)}
                        onClick={() => handleRespond(offer, "decline")}
                        className="flex-1 h-[38px] rounded-[6px] border border-green-2 text-green-2 text-[14px] font-normal cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                      >
                        {isThisResponding && respondingAction === "decline" ? (
                          <BeatLoader color="#25A1A1" size={8} />
                        ) : (
                          ph("decline")
                        )}
                      </button>
                    </div>
                  ) : offer.status === "accepted" ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/chat?threadType=broadcast&chatId=${offer.thread}`)}
                      className="mt-3 cursor-pointer text-[14px] font-medium text-green-1 hover:underline"
                    >
                      {ph("message")}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-[12px] bg-gray-200" />
        ))}
      </div>
    );
  }

  if (showEmpty) {
    return <p className="py-8 text-center text-[15px] font-medium text-gray-8">{ph("no_offers_yet")}</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.broadcastId}
            type="button"
            onClick={() => setSelected(item)}
            className="w-full cursor-pointer rounded-[12px] border border-gray-9 p-4 text-left hover:bg-gray-50"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-green-1">
                {item.broadcast?.type === "product" ? ph("product") : ph("service")}
              </span>
              <span className="shrink-0 rounded-full bg-[#3C9197] px-2 py-0.5 text-[12px] font-medium text-white">
                {ph("offers_count").replace("{count}", String(item.offerCount))}
              </span>
            </div>
            <p className="mt-1.5 truncate text-[15px] font-medium text-black-1">{item.broadcast?.message}</p>
            <p className="mt-1 text-[13px] text-gray-8">
              {formatFromNowShort(item.latestOfferAt, currentLanguage as "en" | "ur")}
            </p>
          </button>
        ))}
      </div>
      {hasMore ? (
        <div className="flex justify-center py-4">
          <button
            type="button"
            disabled={isFetching}
            onClick={() => setPage((p) => p + 1)}
            className="cursor-pointer rounded-full border border-green-1 px-4 py-1.5 text-[14px] text-green-1 disabled:opacity-50"
          >
            {isFetching ? "..." : ph("show_more")}
          </button>
        </div>
      ) : null}
    </>
  );
}

function ReceivedProductPanel({
  selected,
  setSelected,
}: {
  selected: OfferedProductItem | null;
  setSelected: (v: OfferedProductItem | null) => void;
}) {
  const { placeholders, currentLanguage } = useDictionary();
  const ph = (key: string) => String((placeholders as any)[key] ?? key);
  const userId = getUserId() ?? "";
  const { onInitiateChat } = useInitiateChat();

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<OfferedProductItem[]>([]);
  const [respondingOfferId, setRespondingOfferId] = useState("");
  const [respondingAction, setRespondingAction] = useState<"accept" | "decline" | null>(null);

  const { data, isLoading, isFetching } = useGetMyReceivedProductOffersQuery({ page, limit: PAGE_LIMIT });

  useEffect(() => {
    const incoming = (data?.data as OfferedProductItem[] | undefined) ?? [];
    setItems((prev) => (page === 1 ? incoming : [...prev, ...incoming]));
  }, [data, page]);

  const totalPages = Number(data?.meta?.totalPages) || 1;
  const hasMore = page < totalPages;
  const isInitialLoading = items.length === 0 && (isLoading || isFetching) && page === 1;
  const showEmpty = !isInitialLoading && items.length === 0 && !selected;

  const { data: offersData, isFetching: isOffersFetching } = useGetOffersForProductQuery(
    { productId: selected?.productId ?? "" },
    { skip: !selected?.productId },
  );
  const offers = (offersData?.data?.offers as ProductOfferItem[] | undefined) ?? [];
  const isOffersLoading = isOffersFetching && offers.length === 0;

  const [acceptOffer] = useAcceptProductOfferMutation();
  const [declineOffer] = useDeclineProductOfferMutation();

  const handleRespond = useCallback(
    async (offer: ProductOfferItem, action: "accept" | "decline") => {
      setRespondingOfferId(offer._id);
      setRespondingAction(action);
      try {
        const mutate = action === "accept" ? acceptOffer : declineOffer;
        await mutate({ offerId: offer._id }).unwrap();
        toast.success(action === "accept" ? ph("offer_accepted_success") : ph("offer_declined_success"));
      } catch (err: any) {
        toast.error(err?.data?.message ?? "Unable to update offer");
      } finally {
        setRespondingOfferId("");
        setRespondingAction(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [acceptOffer, declineOffer],
  );

  if (selected) {
    return (
      <>
        <p className="mb-3 truncate text-[15px] font-medium text-black-1">{selected.product?.title}</p>
        {isOffersLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-[12px] bg-gray-200" />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <p className="py-8 text-center text-[15px] font-medium text-gray-8">{ph("no_offers_yet")}</p>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => {
              const isThisResponding = respondingOfferId === offer._id;
              return (
                <div key={offer._id} className="rounded-[12px] border border-gray-9 p-4">
                  <div className="flex items-center gap-2">
                    <AvatarUi
                      image={offer.offerer?.image ?? ""}
                      name={offer.offerer?.name ?? ""}
                      className="h-9 w-9 rounded-full bg-[#e7f4f5] !text-green-1"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-black-1">{offer.offerer?.name}</p>
                      {offer.price != null && (
                        <p className="text-[15px] font-medium text-green-1">
                          {ph("Rs")} {formatPrice(offer.price)}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={offer.status} ph={ph} />
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[14px] text-black-1">{offer.message}</p>
                  <p className="mt-1 text-[12px] text-gray-8">
                    {formatFromNowShort(offer.createdAt, currentLanguage as "en" | "ur")}
                  </p>
                  {offer.status === "pending" ? (
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => offer.offerer?._id && onInitiateChat(offer.offerer._id, userId)}
                        className="flex-1 h-[38px] rounded-[6px] border border-gray-9 text-black-1 text-[14px] font-normal cursor-pointer flex items-center justify-center"
                      >
                        {ph("message")}
                      </button>
                      <DoodleButton
                        type="button"
                        disabled={Boolean(respondingOfferId)}
                        onClick={() => handleRespond(offer, "accept")}
                        className="flex-1 h-[38px] rounded-[6px] bg-green-1 text-white text-[14px] font-normal cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                      >
                        {isThisResponding && respondingAction === "accept" ? (
                          <BeatLoader color="white" size={8} />
                        ) : (
                          ph("accept")
                        )}
                      </DoodleButton>
                      <button
                        type="button"
                        disabled={Boolean(respondingOfferId)}
                        onClick={() => handleRespond(offer, "decline")}
                        className="flex-1 h-[38px] rounded-[6px] border border-green-2 text-green-2 text-[14px] font-normal cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
                      >
                        {isThisResponding && respondingAction === "decline" ? (
                          <BeatLoader color="#25A1A1" size={8} />
                        ) : (
                          ph("decline")
                        )}
                      </button>
                    </div>
                  ) : offer.status === "accepted" ? (
                    <button
                      type="button"
                      onClick={() => offer.offerer?._id && onInitiateChat(offer.offerer._id, userId)}
                      className="mt-3 cursor-pointer text-[14px] font-medium text-green-1 hover:underline"
                    >
                      {ph("message")}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-[12px] bg-gray-200" />
        ))}
      </div>
    );
  }

  if (showEmpty) {
    return <p className="py-8 text-center text-[15px] font-medium text-gray-8">{ph("no_offers_yet")}</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.productId}
            type="button"
            onClick={() => setSelected(item)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-[12px] border border-gray-9 p-3 text-left hover:bg-gray-50"
          >
            <Image
              src={item.product?.images?.[0] || noImageAvtar}
              alt={item.product?.title ?? ""}
              width={44}
              height={44}
              unoptimized
              className="h-[44px] w-[44px] shrink-0 rounded-[8px] object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[15px] font-medium text-black-1">{item.product?.title}</p>
                <span className="shrink-0 rounded-full bg-[#3C9197] px-2 py-0.5 text-[12px] font-medium text-white">
                  {ph("offers_count").replace("{count}", String(item.offerCount))}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] font-medium text-green-1">{item.product?.price ? `${ph("Rs")} ${formatPrice(item.product.price)}` : ""}</p>
              <p className="mt-0.5 text-[12px] text-gray-8">
                {formatFromNowShort(item.latestOfferAt, currentLanguage as "en" | "ur")}
              </p>
            </div>
          </button>
        ))}
      </div>
      {hasMore ? (
        <div className="flex justify-center py-4">
          <button
            type="button"
            disabled={isFetching}
            onClick={() => setPage((p) => p + 1)}
            className="cursor-pointer rounded-full border border-green-1 px-4 py-1.5 text-[14px] text-green-1 disabled:opacity-50"
          >
            {isFetching ? "..." : ph("show_more")}
          </button>
        </div>
      ) : null}
    </>
  );
}

type SentOfferItem = {
  id: string;
  kind: "broadcast" | "product";
  title: string;
  message: string;
  price?: number | null;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  image?: string;
  navigate: () => void;
};

function SentOffersPanel() {
  const { placeholders, currentLanguage } = useDictionary();
  const ph = (key: string) => String((placeholders as any)[key] ?? key);
  const router = useRouter();
  const userId = getUserId() ?? "";
  const { onInitiateChat } = useInitiateChat();

  const { data: broadcastData, isLoading: isBroadcastLoading } = useGetMySentBroadcastOffersQuery({
    page: 1,
    limit: 50,
  });
  const { data: productData, isLoading: isProductLoading } = useGetMySentProductOffersQuery({
    page: 1,
    limit: 50,
  });

  const isLoading = isBroadcastLoading || isProductLoading;

  const broadcastItems: SentOfferItem[] = ((broadcastData?.data as any[]) ?? []).map((offer) => ({
    id: offer._id,
    kind: "broadcast",
    title: offer.broadcast?.message ?? "",
    message: offer.message ?? "",
    price: offer.price,
    status: offer.status,
    createdAt: offer.createdAt,
    navigate: () => {
      if (offer.status === "accepted") {
        router.push(`/chat?threadType=broadcast&chatId=${offer.thread}`);
      }
    },
  }));

  const productItems: SentOfferItem[] = ((productData?.data as any[]) ?? []).map((offer) => ({
    id: offer._id,
    kind: "product",
    title: offer.product?.title ?? "",
    message: offer.message ?? "",
    price: offer.price,
    status: offer.status,
    createdAt: offer.createdAt,
    image: offer.product?.images?.[0],
    navigate: () => {
      if (offer.status === "accepted" && offer.seller?._id) {
        onInitiateChat(userId, offer.seller._id);
      } else if (offer.product?._id) {
        router.push(`/buy-product?id=${offer.product._id}`);
      }
    },
  }));

  const items = [...broadcastItems, ...productItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-[12px] bg-gray-200" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="py-8 text-center text-[15px] font-medium text-gray-8">{ph("no_offers_yet")}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <button
          key={`${item.kind}-${item.id}`}
          type="button"
          onClick={item.navigate}
          className="flex w-full cursor-pointer items-start gap-3 rounded-[12px] border border-gray-9 p-4 text-left hover:bg-gray-50"
        >
          {item.kind === "product" ? (
            <Image
              src={item.image || noImageAvtar}
              alt={item.title}
              width={44}
              height={44}
              unoptimized
              className="h-[44px] w-[44px] shrink-0 rounded-[8px] object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="shrink-0 rounded-full bg-[#EEF2F3] px-2 py-0.5 text-[11px] font-medium text-[#4B514F]">
                {item.kind === "broadcast" ? ph("offer_type_broadcast") : ph("offer_type_product")}
              </span>
              <StatusBadge status={item.status} ph={ph} />
            </div>
            <p className="mt-2 truncate text-[15px] font-medium text-black-1">{item.title}</p>
            {item.price != null && (
              <p className="mt-0.5 text-[14px] font-medium text-green-1">
                {ph("Rs")} {formatPrice(item.price)}
              </p>
            )}
            {item.message ? (
              <p className="mt-1 whitespace-pre-wrap text-[13px] text-black-1">{item.message}</p>
            ) : null}
            <p className="mt-1 text-[12px] text-gray-8">
              {formatFromNowShort(item.createdAt, currentLanguage as "en" | "ur")}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

function MyOffers() {
  const { placeholders } = useDictionary();
  const ph = (key: string) => String((placeholders as any)[key] ?? key);

  const [topTab, setTopTab] = useState<TopTab>("received");
  const [receivedType, setReceivedType] = useState<ReceivedType>("broadcast");
  const [selectedBroadcast, setSelectedBroadcast] = useState<OfferedBroadcastItem | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<OfferedProductItem | null>(null);

  const isDrilledIn =
    (receivedType === "broadcast" && Boolean(selectedBroadcast)) ||
    (receivedType === "product" && Boolean(selectedProduct));

  const handleBack = () => {
    setSelectedBroadcast(null);
    setSelectedProduct(null);
  };

  const handleTopTabChange = (tab: TopTab) => {
    setTopTab(tab);
    handleBack();
  };

  const handleReceivedTypeChange = (type: ReceivedType) => {
    setReceivedType(type);
    handleBack();
  };

  return (
    <div className="h-full">
      <div className="border-b px-4 border-gray-9 flex items-center justify-center">
        <div className="h-[72px] w-[522px] flex items-center gap-2 text-[14px]">
          {isDrilledIn ? (
            <button type="button" className="flex cursor-pointer items-center gap-1" onClick={handleBack}>
              <Image src={backIcon} alt="back" className="ltr:rotate-0 rtl:rotate-180" />
              <span className="text-[15px] text-[#030303]">{ph("back")}</span>
            </button>
          ) : (
            <>
              <span className="text-gray-11">{ph("profile")}</span>
              <Image src={chevronIcon} alt="chevron" className="ltr:rotate-180" />
              <span className="text-green-2">{ph("broadcast_offers")}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-center px-4">
        <div className="w-[522px] pt-5">
          {!isDrilledIn && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTopTabChange("received")}
                className={`h-[34px] rounded-full border px-3 text-[14px] cursor-pointer ${topTab === "received" ? "border-green-1 bg-green-4 text-black-1" : "border-gray-2 bg-white text-black-1"
                  }`}
              >
                {ph("received_offers")}
              </button>
              <button
                type="button"
                onClick={() => handleTopTabChange("sent")}
                className={`h-[34px] rounded-full border px-3 text-[14px] cursor-pointer ${topTab === "sent" ? "border-green-1 bg-green-4 text-black-1" : "border-gray-2 bg-white text-black-1"
                  }`}
              >
                {ph("sent_offers")}
              </button>
            </div>
          )}

          {!isDrilledIn && topTab === "received" && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleReceivedTypeChange("broadcast")}
                className={`h-[30px] rounded-full border px-3 text-[13px] cursor-pointer ${receivedType === "broadcast" ? "border-green-1 text-green-1" : "border-gray-2 text-gray-8"
                  }`}
              >
                {ph("offer_type_broadcast")}
              </button>
              <button
                type="button"
                onClick={() => handleReceivedTypeChange("product")}
                className={`h-[30px] rounded-full border px-3 text-[13px] cursor-pointer ${receivedType === "product" ? "border-green-1 text-green-1" : "border-gray-2 text-gray-8"
                  }`}
              >
                {ph("offer_type_product")}
              </button>
            </div>
          )}

          <div className="mt-4">
            {topTab === "received" ? (
              receivedType === "broadcast" ? (
                <ReceivedBroadcastPanel selected={selectedBroadcast} setSelected={setSelectedBroadcast} />
              ) : (
                <ReceivedProductPanel selected={selectedProduct} setSelected={setSelectedProduct} />
              )
            ) : (
              <SentOffersPanel />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MyOffers;
