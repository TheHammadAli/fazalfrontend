"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import chevronIcon from "@/assets/icons/chevron.svg";
import backIcon from "@/assets/icons/back-arrow.svg";
import DoodleButton from "@/components/Ui/DoodleButton";
import AvatarUi from "@/components/Ui/AvatarUi";
import { BeatLoader } from "react-spinners";
import toast from "react-hot-toast";
import formatFromNowShort from "@/utils/formatFromNowShort";
import {
  useGetMyOfferedBroadcastsQuery,
  useGetOffersForBroadcastQuery,
  useAcceptBroadcastOfferMutation,
  useDeclineBroadcastOfferMutation,
} from "@/store/services/broadcastOfferService";
import { initializeSocket } from "@/utils/socket";
import { useAppDispatch } from "@/store/store";
import baseApi from "@/store/baseApi";

const PAGE_LIMIT = 10;

type OfferedBroadcastItem = {
  broadcastId: string;
  offerCount: number;
  latestOfferAt: string;
  broadcast: { _id: string; message: string; type: "product" | "service" };
};

type OfferItem = {
  _id: string;
  price: number;
  message: string;
  status: "pending" | "accepted" | "declined";
  thread: string;
  createdAt: string;
  offerer?: { _id: string; name?: string; image?: string };
};

function MyBroadcastOffers() {
  const { placeholders, currentLanguage } = useDictionary();
  type PlaceholderKey = keyof typeof placeholders;
  const ph = (key: PlaceholderKey) => placeholders[key];
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<OfferedBroadcastItem[]>([]);
  const [selectedBroadcast, setSelectedBroadcast] = useState<OfferedBroadcastItem | null>(null);
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
  const showEmpty = !isInitialLoading && items.length === 0 && !selectedBroadcast;

  const {
    data: offersData,
    isFetching: isOffersFetching,
  } = useGetOffersForBroadcastQuery(
    { broadcastId: selectedBroadcast?.broadcastId ?? "" },
    { skip: !selectedBroadcast?.broadcastId },
  );
  const offers = (offersData?.data?.offers as OfferItem[] | undefined) ?? [];
  const isOffersLoading = isOffersFetching && offers.length === 0;

  const [acceptOffer] = useAcceptBroadcastOfferMutation();
  const [declineOffer] = useDeclineBroadcastOfferMutation();

  useEffect(() => {
    const socket = initializeSocket("broadcast");
    const onReceive = () => {
      dispatch(baseApi.util.invalidateTags(["BROADCAST_OFFER"]));
    };
    socket?.on("receiveBroadcastMessage", onReceive);
    return () => {
      socket?.off("receiveBroadcastMessage", onReceive);
    };
  }, [dispatch]);

  const handleRespond = useCallback(
    async (offer: OfferItem, action: "accept" | "decline") => {
      setRespondingOfferId(offer._id);
      setRespondingAction(action);
      try {
        const mutate = action === "accept" ? acceptOffer : declineOffer;
        const res = await mutate({ offerId: offer._id }).unwrap();
        toast.success(
          action === "accept"
            ? String(placeholders.offer_accepted_success ?? "Offer accepted")
            : String(placeholders.offer_declined_success ?? "Offer declined"),
        );
        if (action === "accept") {
          const threadId = (res as any)?.data?.threadId;
          if (threadId) {
            router.push(`/chat?threadType=broadcast&chatId=${threadId}`);
          }
        }
      } catch (err: any) {
        toast.error(err?.data?.message ?? "Unable to update offer");
      } finally {
        setRespondingOfferId("");
        setRespondingAction(null);
      }
    },
    [acceptOffer, declineOffer, placeholders, router],
  );

  return (
    <div className="h-full">
      <div className="border-b px-4 border-gray-9 flex items-center justify-center">
        <div className="h-[72px] w-[522px] flex items-center gap-2 text-[14px]">
          {selectedBroadcast ? (
            <button
              type="button"
              className="flex cursor-pointer items-center gap-1"
              onClick={() => setSelectedBroadcast(null)}
            >
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
          {selectedBroadcast ? (
            <>
              <p className="mb-3 truncate text-[15px] font-medium text-black-1">
                {selectedBroadcast.broadcast?.message}
              </p>
              {isOffersLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-[12px] bg-gray-200" />
                  ))}
                </div>
              ) : offers.length === 0 ? (
                <p className="py-8 text-center text-[15px] font-medium text-gray-8">
                  {ph("no_offers_yet")}
                </p>
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
                            <p className="truncate text-[14px] font-medium text-black-1">
                              {offer.offerer?.name}
                            </p>
                            <p className="text-[15px] font-medium text-green-1">
                              {ph("Rs")} {offer.price}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-medium ${offer.status === "accepted"
                                ? "bg-green-4 text-green-1"
                                : offer.status === "declined"
                                  ? "bg-red-50 text-red-1"
                                  : "bg-gray-100 text-gray-8"
                              }`}
                          >
                            {offer.status === "accepted"
                              ? ph("accepted")
                              : offer.status === "declined"
                                ? ph("rejected")
                                : ph("proposed" as PlaceholderKey)}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-[14px] text-black-1">
                          {offer.message}
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
                            onClick={() =>
                              router.push(`/chat?threadType=broadcast&chatId=${offer.thread}`)
                            }
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
          ) : isInitialLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-[12px] bg-gray-200" />
              ))}
            </div>
          ) : showEmpty ? (
            <p className="py-8 text-center text-[15px] font-medium text-gray-8">
              {ph("no_offers_yet")}
            </p>
          ) : (
            <>
              <div className="divide-y divide-gray-9">
                {items.map((item) => (
                  <button
                    key={item.broadcastId}
                    type="button"
                    onClick={() => setSelectedBroadcast(item)}
                    className="w-full cursor-pointer py-4 text-left hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-[15px] font-medium text-black-1">
                        {item.broadcast?.message}
                      </p>
                      <span className="shrink-0 rounded-full bg-[#3C9197] px-2 py-0.5 text-[12px] font-medium text-white">
                        {String(ph("offers_count")).replace("{count}", String(item.offerCount))}
                      </span>
                    </div>
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
          )}
        </div>
      </div>
    </div>
  );
}

export default MyBroadcastOffers;
