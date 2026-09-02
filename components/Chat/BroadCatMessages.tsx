import React, { useEffect, useState } from "react";
import BroadCastList from "./BroadCastList";
import { useReceivedBroadcastMessagesQuery, useSentBroadcastMessagesQuery } from "@/store/services/chatService";
import { parsePositiveInt } from "../Updates/Notifications";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import BroadCastThreadList from "./BroadCastThreadList";
import Image from "next/image";
import backIcon from "@/assets/icons/back-arrow.svg";
import { type ChatThread } from "./types";

type BroadcastTab = "sent" | "received";
type BroadcastItem = {
    _id?: string;
    id?: string;
    type: "Product" | "Service";
    category: { name: { en: string; ur: string } };
    message: string;
    threadCount: number;
    radius: number;
    createdAt: string;
};

function BroadCatMessages({
    chatId,
    onSelectChat,
    activeTab: controlledTab,
    onActiveTabChange,
}: {
    chatId: string;
    onSelectChat: (chat: ChatThread | null) => void;
    activeTab?: BroadcastTab;
    onActiveTabChange?: (tab: BroadcastTab) => void;
}) {
    const { placeholders } = useDictionary();
    type PlaceholderKey = keyof typeof placeholders;
    const ph = (key: PlaceholderKey) => placeholders[key];

    const PAGE_LIMIT = 15;
    const [internalTab, setInternalTab] = useState<BroadcastTab>(controlledTab ?? "sent");
    const activeTab = controlledTab ?? internalTab;
    const [sentPage, setSentPage] = useState(1);
    const [receivedPage, setReceivedPage] = useState(1);
    const [filteredSent, setFilteredSent] = useState<BroadcastItem[]>([]);
    const [filteredReceived, setFilteredReceived] = useState<BroadcastItem[]>([]);

    const [showBroadcastThreadList, setShowBroadcastThreadList] = useState(false);
    const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastItem | null>(null);
    const {
        data: sentItems,
        isLoading: isSentLoading,
        isFetching: isSentFetching,
    } = useSentBroadcastMessagesQuery(
        { page: sentPage, limit: PAGE_LIMIT },
        { skip: activeTab !== "sent" },
    );

    const {
        data: receivedItems,
        isLoading: isReceivedLoading,
        isFetching: isReceivedFetching,
    } = useReceivedBroadcastMessagesQuery(
        { page: receivedPage, limit: PAGE_LIMIT },
        { skip: activeTab !== "received" },
    );

    const isLoadingCurrentTab = activeTab === "sent" ? isSentLoading : isReceivedLoading;
    const isFetchingCurrentTab = activeTab === "sent" ? isSentFetching : isReceivedFetching;
    const currentPage = activeTab === "sent" ? sentPage : receivedPage;
    const items = activeTab === "sent" ? filteredSent : filteredReceived;


    const sentTotalPages = parsePositiveInt(sentItems?.meta?.totalPages);
    const sentLastBatch = (sentItems?.data as BroadcastItem[] | undefined) ?? [];
    const canLoadMoreSent = sentTotalPages != null ? sentPage < sentTotalPages : sentLastBatch.length >= PAGE_LIMIT;

    const receivedTotalPages = parsePositiveInt(receivedItems?.meta?.totalPages);
    const receivedLastBatch = (receivedItems?.data as BroadcastItem[] | undefined) ?? [];
    const canLoadMoreReceived =
        receivedTotalPages != null ? receivedPage < receivedTotalPages : receivedLastBatch.length >= PAGE_LIMIT;

    const mergeUnique = (prev: BroadcastItem[], incoming: BroadcastItem[]) => {
        const map = new Map<string, BroadcastItem>();
        prev.forEach((item, idx) => {
            const key = item._id ?? item.id ?? `${item.createdAt}-${item.message}-${idx}`;
            map.set(key, item);
        });
        incoming.forEach((item, idx) => {
            const key = item._id ?? item.id ?? `${item.createdAt}-${item.message}-${idx}`;
            map.set(key, item);
        });
        return Array.from(map.values());
    };

    function handleScrollNearBottom(e: React.UIEvent<HTMLDivElement>) {
        if (isFetchingCurrentTab) return;
        const canLoadMore = activeTab === "sent" ? canLoadMoreSent : canLoadMoreReceived;
        if (!canLoadMore) return;
        const el = e.currentTarget;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
        if (!nearBottom) return;
        if (activeTab === "sent") {
            setSentPage((p) => p + 1);
        } else {
            setReceivedPage((p) => p + 1);
        }
    }

    useEffect(() => {
        const incoming = (sentItems?.data as BroadcastItem[] | undefined) ?? [];
        if (sentPage === 1) {
            setFilteredSent(incoming);
        } else {
            setFilteredSent((prev) => mergeUnique(prev, incoming));
        }
    }, [sentItems?.data, sentPage]);

    useEffect(() => {
        const incoming = (receivedItems?.data as BroadcastItem[] | undefined) ?? [];
        if (receivedPage === 1) {
            setFilteredReceived(incoming);
        } else {
            setFilteredReceived((prev) => mergeUnique(prev, incoming));
        }
    }, [receivedItems?.data, receivedPage]);

    useEffect(() => {
        if (activeTab !== "received") return;
        if (!filteredReceived.length) return;

        const matched = filteredReceived.find((item: any) => {
            const itemThreadId = item?.threadId ?? item?._id ?? item?.id ?? "";
            return !!chatId && String(itemThreadId) === String(chatId);
        });

        if (matched) {
            onSelectChat({ ...matched, type: "broadcast_received" } as any);
            return;
        }

        // Auto-open first received broadcast on large screens only
        const isLargeScreen =
            typeof window !== "undefined" &&
            window.matchMedia("(min-width: 1024px)").matches;
        if (!isLargeScreen || chatId) return;

        const first = filteredReceived[0] as any;
        onSelectChat({ ...first, type: "broadcast_received" } as any);
    }, [activeTab, filteredReceived, chatId, onSelectChat]);

    const handleTabChange = (tab: BroadcastTab) => {
        if (tab === activeTab) return;
        setShowBroadcastThreadList(false);
        setInternalTab(tab);
        onActiveTabChange?.(tab);
        if (tab === "sent" && filteredSent.length === 0) {
            setSentPage(1);
        }
        if (tab === "received" && filteredReceived.length === 0) {
            setReceivedPage(1);
        }
    };

    const handleSelectBroadcastMessage = (broadcast: BroadcastItem) => {
        if (activeTab !== "sent") {
            onSelectChat({ ...broadcast, type: "broadcast_received" } as any);
            return
        };
        setShowBroadcastThreadList(true);
        setSelectedBroadcast(broadcast);
    };

    return (
        <div className="flex h-[calc(100%-104px)] flex-col ">
            <div className="border-b border-gray-9 bg-white px-5 py-5">
                {!showBroadcastThreadList && <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => handleTabChange("sent")}
                        className={`rounded-full border px-3 py-1.5 text-[14px] cursor-pointer ${activeTab === "sent"
                            ? "border-green-1 bg-[#E6FBFB] text-[#030303]"
                            : "border-gray-2 bg-white text-[#030303]"
                            }`}
                    >
                        {ph("sent")}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange("received")}
                        className={`rounded-full border px-3 py-1.5 text-[14px] cursor-pointer ${activeTab === "received"
                            ? "border-green-1 bg-[#E6FBFB] text-[#030303]"
                            : "border-gray-2 bg-white text-[#030303]"
                            }`}
                    >
                        {ph("received")}
                    </button>
                </div>}
                {
                    showBroadcastThreadList && <div className="flex gap-1 items-center cursor-pointer" onClick={() => { setShowBroadcastThreadList(false); onSelectChat(null) }}>
                        <Image src={backIcon} alt="back" className="ltr:rotate-0 rtl:rotate-180" />
                        <span className="text-[15px] font-normal text-[#030303]">{ph("back")}</span>
                    </div>
                }
            </div>


            {showBroadcastThreadList ? (
                <BroadCastThreadList
                    threadType="broadcast_messages"
                    setThreadType={() => setShowBroadcastThreadList(false)}
                    chatId={chatId}
                    broadcast={selectedBroadcast}
                    onSelectChat={onSelectChat}
                />
            ) : isLoadingCurrentTab && currentPage === 1 ? (
                <div className="flex-1 space-y-1 overflow-y-auto bg-white px-5 py-4">
                    {Array.from({ length: 7 }).map((_, index) => (
                        <div key={index} className="animate-pulse border-b border-gray-9 py-4">
                            <div className="h-4 w-2/3 rounded bg-gray-200" />
                            <div className="mt-2 h-5 w-full rounded bg-gray-200" />
                            <div className="mt-2 h-4 w-1/3 rounded bg-gray-200" />
                        </div>
                    ))}
                </div>
            ) : (
                <BroadCastList
                    activeTab={activeTab}
                    chatId={chatId}
                    key={activeTab}
                    items={items}
                    onScroll={handleScrollNearBottom}
                    onSelectItem={(broadcast) => handleSelectBroadcastMessage(broadcast)}
                />

            )}
        </div>
    );
}

export default BroadCatMessages;
