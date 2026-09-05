import React, { useCallback, useRef, useState } from 'react'
import { useDispatch } from 'react-redux';
import { useDictionary } from '@/dictionaries/DictionaryProvider';
import { useGetAllThreadsForBroadcastQuery } from '@/store/services/chatService';
import { getUserId } from '@/utils/getUserId';
import { initializeSocket } from '@/utils/socket';
import { useEffect } from 'react';
import { baseApi } from '@/store/baseApi';
import Image from 'next/image';
import { type ChatThread } from "./types";
import { ChatSidebarProps } from './ChatSidebar';
import moment from 'moment';
import noMessagesIcon from "@/assets/icons/no-message.svg";
import noImageAvtar from "@/assets/images/default-profile-avatar.svg";
import AvatarUi from '../Ui/AvatarUi';
import { MicrophoneIcon } from '@heroicons/react/24/solid';

function BroadCastThreadList({
    chatId,
    broadcast,
    onSelectChat,
}: ChatSidebarProps) {
    const { currentLanguage } = useDictionary();
    const dispatch = useDispatch();
    // const PAGE_LIMIT = 1;
    // const [page, setPage] = useState(1);
    const [isMounted, setIsMounted] = useState(false);
    const { placeholders } = useDictionary();
    type PlaceholderKey = keyof typeof placeholders;
    const ph = (key: PlaceholderKey) => placeholders[key];
    // const [filteredThreads, setFilteredThreads] = useState<ChatThread[]>([]);
    const userId = getUserId() ?? "";
    const broadcastId = broadcast?._id ?? broadcast?.id ?? "";
    const lastBroadcastIdRef = useRef<string>("");
    const withBroadcastId = useCallback((thread: ChatThread): ChatThread => ({
        ...thread,
        broadcastId,
    }), [broadcastId]);
    const { data: conversations, isLoading } = useGetAllThreadsForBroadcastQuery({
        id: broadcastId,
        // page,
        // limit: PAGE_LIMIT,
    },
    );
    // const totalPages = parsePositiveInt(conversations?.data?.totalPages);
    // const lastBatch =
    //     (conversations?.data?.conversations as ChatThread[] | undefined) ?? [];
    // const canLoadMore =
    //     totalPages != null ? page < totalPages : lastBatch.length >= PAGE_LIMIT;

    // function handleScrollNearBottom(e: React.UIEvent<HTMLUListElement>) {
    //     if (!userId || isFetching || !canLoadMore) return;
    //     const el = e.currentTarget;
    //     const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
    //     if (!nearBottom) return;
    //     setPage((p) => p + 1);
    // }
    useEffect(() => {
        setIsMounted(true);
    }, []);
    useEffect(() => {
        const socket = initializeSocket("broadcast");
        if (!socket) return;
        socket.on("receiveBroadcastMessage", (message) => {
            console.log(message, "check the message ");
            dispatch(baseApi.util.invalidateTags(["BROADCAST"]));
        });
    }, [dispatch]);

    useEffect(() => {
        const threadList = (conversations?.data as ChatThread[] | undefined) ?? [];
        const firstConversation = threadList[0];
        const isLargeScreen =
            typeof window !== "undefined" &&
            window.matchMedia("(min-width: 1024px)").matches;

        // When user opens a different broadcast from sent list,
        // always activate the first thread for that broadcast (desktop only).
        if (broadcastId && lastBroadcastIdRef.current !== broadcastId) {
            lastBroadcastIdRef.current = broadcastId;
            if (firstConversation && isLargeScreen) {
                onSelectChat(withBroadcastId(firstConversation));
            }
            return;
        }

        const matchedConversation = threadList.find(
            (conversation) => (conversation?._id ?? conversation?.id) === chatId,
        );
        if (matchedConversation) {
            onSelectChat(withBroadcastId(matchedConversation));
            return;
        }
        if (firstConversation && isLargeScreen) {
            onSelectChat(withBroadcastId(firstConversation));
        }
    }, [broadcastId, chatId, conversations?.data, onSelectChat, withBroadcastId]);

    return (
        <ul
            // onScroll={handleScrollNearBottom} 
            className="h-[calc(100%-104px)] overflow-y-auto">
            {isMounted && isLoading
                // && page === 1
                ? Array.from({ length: 6 }).map((_, index) => (
                    <li key={index} className="px-4 py-4">
                        <div className="flex animate-pulse items-start gap-3">
                            <div className="h-11 w-11 rounded-full bg-gray-200" />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="h-4 w-32 rounded bg-gray-200" />
                                    <div className="h-3 w-10 rounded bg-gray-200" />
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <div className="h-3 w-44 rounded bg-gray-200" />
                                    <div className="h-2 w-2 rounded-full bg-gray-200" />
                                </div>
                            </div>
                        </div>
                    </li>
                ))
                : conversations?.data?.length === 0 ? (
                    <li className="flex h-full flex-col items-center justify-center px-6 text-center">
                        <Image src={noMessagesIcon} alt="no-messages" />
                        <h3 className="mt-1 text-[22px] font-medium  text-black-1">{ph("no_messages_yet")}</h3>
                        <p className="mt-1 max-w-[560px] text-[14px] font-normal  text-gray-8">
                            {ph("messages_appear_here")}
                        </p>
                    </li>
                ) : conversations?.data?.map((thread: any, index: number) => {
                    const isActive = (thread?._id ?? thread?.id) === chatId;
                    // Same parsing fix as DirectMessages — see the comment there.
        const buyerId = thread?.buyer?.id ?? thread?.buyer?._id;
        const thread_user = String(buyerId ?? "") !== userId ? thread?.buyer : thread?.seller;
                    const unreadCount =
                        typeof thread.unreadCount === "number"
                            ? thread.unreadCount
                            : 0;
                    console.log(thread, "check the d ");

                    return (
                        <li key={index}>
                            <button
                                type="button"
                                onClick={() => {
                                    onSelectChat(withBroadcastId(thread));
                                }}
                                className={`flex w-full cursor-pointer items-start gap-3 px-4 py-4 text-left ${isActive ? "bg-[#E7F4F5]" : "hover:bg-gray-50"}`}
                            >
                                <AvatarUi
                                    image={thread_user?.image ?? noImageAvtar.src}
                                    name={thread_user?.name ?? ""}

                                    className="h-11 w-11 rounded-full object-cover bg-[#e7f4f5] !text-green-1"

                                />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="truncate text-[15px] font-medium text-[#030303] first-letter:capitalize">{thread_user?.name ?? ""}</p>
                                        <span className="shrink-0 text-[13px] font-normal text-[#4B514F]">{moment(thread?.latestMessage?.createdAt).locale(currentLanguage).fromNow()}</span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                        {thread.latestMessage?.audioUrl ? (
                                            <p className="flex min-w-0 items-center gap-1 truncate text-sm text-gray-600">
                                                <MicrophoneIcon className="h-3.5 w-3.5 shrink-0" />
                                                <span className="truncate">{ph("voice_message")}</span>
                                            </p>
                                        ) : (
                                            <p className="truncate text-sm text-gray-600">{thread.latestMessage?.message ?? ""}</p>
                                        )}

                                        {unreadCount > 0 ? (
                                            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#3C9197] px-1.5 text-[11px] font-medium leading-none text-white">
                                                {unreadCount > 99 ? "99+" : unreadCount}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </button>
                        </li>
                    );
                })}
        </ul>
    )
}

export default BroadCastThreadList