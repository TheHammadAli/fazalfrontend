"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { type ChatMessage } from "./types";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import camIcon from "@/assets/icons/cam-icon.svg";
import whiteArrowIcon from "@/assets/icons/white-arrow.svg";
import { getUserId } from "@/utils/getUserId";
import { usePresence } from "@/custom-hooks/usePresence";
import formatLastSeen from "@/utils/formatLastSeen";
import { useGetBroadcastThreadMessagesQuery, useGetConversationMessagesQuery, useMarkBroadcastMessagesAsReadMutation, useMarkMessagesAsReadMutation, useSendBroadcastMessageMutation, useSendMessageMutation } from "@/store/services/chatService";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { parsePositiveInt } from "../Updates/Notifications";
import moment from "moment";
import { initializeSocket } from "@/utils/socket";
import baseApi from "@/store/baseApi";
import { useAppDispatch } from "@/store/store";
import { XMarkIcon } from "@heroicons/react/24/outline";
import noImageAvtar from "@/assets/images/default-profile-avatar.svg";
import chatDoodleBackground from "@/assets/images/new-chat-doodle.svg";
import noMessagesIcon from "@/assets/icons/no-message.svg";
import AvatarUi from "../Ui/AvatarUi";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

type ChatWindowProps = {
  thread: any;
  onBack?: () => void;
  threadType: string;
  draftMessage?: string;
};

function getMessageImageUrls(message: {
  imageUrl?: unknown;
  imageUrls?: unknown;
  images?: unknown;
}): string[] {
  const raw = message?.imageUrls ?? message?.imageUrl ?? message?.images;
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      .map((u) => u.trim());
  }
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
}

export default function ChatWindow({ thread, onBack, threadType, draftMessage = "" }: ChatWindowProps) {
  const { placeholders, currentLanguage } = useDictionary();
  type PlaceholderKey = keyof typeof placeholders;
  const ph = (key: PlaceholderKey) => placeholders[key];
  const PAGE_LIMIT = 15;
  const [page, setPage] = useState(1);
  const dispatch = useAppDispatch();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const prevScrollHeightRef = useRef(0);
  const shouldStickToBottomRef = useRef(true);
  const userId = getUserId() ?? "";

  const getDateLabel = useCallback(
    (createdAt?: string) => {
      if (!createdAt) return "";
      const date = moment(createdAt);
      if (!date.isValid()) return "";
      if (date.isSame(moment(), "day")) return String(placeholders.today ?? "");
      if (date.isSame(moment().subtract(1, "day"), "day"))
        return String(placeholders.yesterday ?? "");
      return date.format("MM/DD/YYYY");
    },
    [placeholders],
  );

  const getMessageTime = useCallback((createdAt?: string) => {
    if (!createdAt) return "";
    const date = moment(createdAt);
    if (!date.isValid()) return "";
    return date.format("h:mm A");
  }, []);

  const {
    conversationId,
    isBroadcastReceived,
    broadcastRequestId,
    broadcastThreadId,
    headerUserId,
    headerName,
    headerLastSeenAt,
    headerIsOnline,
    headerAvatar,
  } = useMemo(() => {
    const convId = thread?._id ?? thread?.id ?? "";
    const broadcastReceived = thread?.type === "broadcast_received";
    const bRequestId = broadcastReceived
      ? thread?.buyer
      : thread?.seller?.id || thread?.seller?._id;
    const bThreadId = broadcastReceived ? (thread?.threadId ?? "") : convId;
    // `??` before the comparison, and the comparison before the ternary: written
    // as `buyer?.id || buyer?._id !== userId` this parsed as
    // `(buyer.id) || (buyer._id !== userId)`, which is truthy whenever the buyer
    // has an id — so a seller viewing their own thread was shown as the other
    // party, and would have been given their own presence in the header.
    const buyerId = thread?.buyer?.id ?? thread?.buyer?._id;
    const hUser = String(buyerId ?? "") !== userId ? thread?.buyer : thread?.seller;
    return {
      conversationId: convId,
      isBroadcastReceived: broadcastReceived,
      broadcastRequestId: bRequestId,
      broadcastThreadId: bThreadId,
      headerUserId: String(hUser?.id ?? hUser?._id ?? ""),
      headerName: hUser?.name ?? thread?.name ?? "",
      headerLastSeenAt: hUser?.lastSeenAt ?? null,
      headerIsOnline: Boolean(hUser?.isOnline),
      headerAvatar: hUser?.image ?? thread?.avatar ?? "https://i.pravatar.cc/80?img=11",
    };
  }, [thread, userId]);

  // Live presence for the person on the other end of this conversation, seeded
  // with whatever the conversation list already told us.
  const presenceSeed = useMemo(
    () =>
      headerUserId
        ? { [headerUserId]: { isOnline: headerIsOnline, lastSeenAt: headerLastSeenAt } }
        : {},
    [headerUserId, headerIsOnline, headerLastSeenAt],
  );
  const presenceIds = useMemo(
    () => (headerUserId ? [headerUserId] : []),
    [headerUserId],
  );
  const presence = usePresence(presenceIds, presenceSeed);
  const headerPresence = headerUserId ? presence[headerUserId] : undefined;

  // The line under the name is presence only. It stays empty when the peer has
  // never been seen, rather than falling back to their email address — an email
  // in the header is noise, and showing someone's address to the other party is
  // not the point of this line.
  const headerStatus = headerPresence?.isOnline
    ? String(placeholders.online ?? "Online")
    : headerPresence?.lastSeenAt
      ? `${placeholders.last_seen ?? "last seen"} ${formatLastSeen(headerPresence.lastSeenAt, currentLanguage)}`
      : "";
  const [messageText, setMessageText] = useState("");
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);
  const [imageLightboxIndex, setImageLightboxIndex] = useState(0);
  const [imageLightboxSlides, setImageLightboxSlides] = useState<{ src: string }[]>([]);
  const [markMessagesAsRead] = useMarkMessagesAsReadMutation();
  const [markBroadcastMessagesAsRead] = useMarkBroadcastMessagesAsReadMutation();
  const [sendMessage, { isLoading: isSendingMessage }] = useSendMessageMutation();
  const [sendBroadcastMessage, { isLoading: isSendingBroadcastMessage }] = useSendBroadcastMessageMutation();

  const messagesQueryArgs = useMemo(
    () => ({
      conversationId,
      page,
      limit: PAGE_LIMIT,
    }),
    [conversationId, page],
  );

  const { data: messages, isFetching, refetch } = useGetConversationMessagesQuery(messagesQueryArgs, {
    skip: !conversationId || threadType === "broadcast_messages",
    refetchOnMountOrArgChange: true,
  });

  const broadcastQueryArgs = useMemo(
    () => ({
      id: broadcastRequestId,
      threadId: broadcastThreadId,
    }),
    [broadcastRequestId, broadcastThreadId],
  );

  const {
    data: broadcastMessages,
    isFetching: isFetchingBroadcastMessages,
    refetch: refetchBroadcastMessages,
  } = useGetBroadcastThreadMessagesQuery(broadcastQueryArgs, {
    skip: threadType !== "broadcast_messages" || !broadcastRequestId || !broadcastThreadId,
    refetchOnMountOrArgChange: true,
  });
  const totalPages = useMemo(
    () => parsePositiveInt(messages?.meta?.totalPages),
    [messages?.meta?.totalPages],
  );

  const incomingMessages = useMemo(
    () => (messages?.data as ChatMessage[] | undefined) ?? undefined,
    [messages?.data],
  );

  const canLoadMore = useMemo(
    () =>
      totalPages != null ? page < totalPages : (messages?.meta?.total ?? 0) >= PAGE_LIMIT,
    [totalPages, page, messages?.meta?.total],
  );

  const isMessagesLoading = useMemo(
    () =>
      threadType === "broadcast_messages"
        ? isFetchingBroadcastMessages && filteredMessages.length === 0
        : isFetching && page === 1 && filteredMessages.length === 0,
    [
      threadType,
      isFetchingBroadcastMessages,
      isFetching,
      page,
      filteredMessages.length,
    ],
  );

  const scrollToBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const handleScrollNearBottom = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      if (threadType === "broadcast_messages") return;
      const el = e.currentTarget;
      shouldStickToBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight <= 120;
      if (!userId || isFetching || !canLoadMore) return;
      const nearTop = el.scrollTop <= 80;
      if (!nearTop) return;
      prevScrollHeightRef.current = el.scrollHeight;
      setPage((p) => p + 1);
    },
    [threadType, userId, isFetching, canLoadMore],
  );

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) {
      e.currentTarget.value = "";
      return;
    }
    const first = Array.from(list).find((f) => f.type.startsWith("image/"));
    setSelectedFile(first ?? null);
    e.currentTarget.value = "";
  }, []);

  const attachmentPreviewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  useEffect(() => {
    if (!attachmentPreviewUrl) return;
    return () => {
      URL.revokeObjectURL(attachmentPreviewUrl);
    };
  }, [attachmentPreviewUrl]);

  const openMessageImageLightbox = useCallback((urls: string[], startIndex: number) => {
    if (!urls.length) return;
    setImageLightboxSlides(urls.map((src) => ({ src })));
    setImageLightboxIndex(Math.min(Math.max(0, startIndex), urls.length - 1));
    setImageLightboxOpen(true);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (messageText.trim() === "" && !selectedFile) {
      return;
    }
    try {

      if (threadType === "broadcast_messages") {
        const broadcastMessageId = isBroadcastReceived ? thread?._id : thread?.broadcastId;

        if (!broadcastMessageId || !broadcastThreadId || !broadcastRequestId) {
          toast.error("Unable to send message");
          return;
        }
        const socket = initializeSocket("broadcast");
        if (!socket) {
          toast.error("Unable to send message");
          return;
        }

        const messageData = {
          broadcastId: broadcastMessageId,
          threadId: broadcastThreadId,
          senderId: userId,
          receiverId: broadcastRequestId,
          message: messageText.trim(),
        };
        const body =
          selectedFile
            ? (() => {
              const formData = new FormData();
              Object.entries(messageData).forEach(([key, value]) => {
                if (value != null && value !== "") {
                  formData.append(key, String(value));
                }
              });
              formData.append("file", selectedFile);
              return formData;
            })()
            : messageData;

        sendBroadcastMessage({
          id: broadcastMessageId,
          body,
        })
          .unwrap()
          .then(() => {
            setMessageText("");
            setSelectedFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
            shouldStickToBottomRef.current = true;
            prevScrollHeightRef.current = 0;
            refetchBroadcastMessages();
            requestAnimationFrame(() => {
              scrollToBottom();
            });
          })
          .catch((err) => {
            toast.error(err?.data?.message ?? "Unable to send message");
          });
        return;
      }

      if (!conversationId) {
        return;
      }

      const buyerId = thread?.buyer?.id ?? thread?.buyer?._id ?? "";
      const sellerId = thread?.seller?.id ?? thread?.seller?._id ?? "";
      const receiverId = buyerId !== userId ? buyerId : sellerId;
      if (!receiverId) {
        toast.error("Unable to send message");
        return;
      }

      const messageData = {
        conversationId,
        text: messageText.trim(),
        senderId: userId,
        receiverId,
      };
      const singleFile = selectedFile;
      const messageWithFile = {
        ...messageData,
        file: singleFile,
      };
      const formData = new FormData();
      Object.entries(messageWithFile).forEach(([key, value]) => {
        if (value) {
          formData.append(key, value instanceof File ? value : String(value));
        }
      });
      try {
        const socket = initializeSocket("chat");
        if (!socket) {
          toast.error("Unable to send message");
          return;
        }
        // socket.emit('sendMessage', selectedFile ? formData : messageData);
        await sendMessage(singleFile ? formData : messageData).unwrap();
        setMessageText("");
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        shouldStickToBottomRef.current = true;
        prevScrollHeightRef.current = 0;
        setPage(1);
        refetch();
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "data" in err
            ? (err as { data?: { message?: string } }).data?.message
            : undefined;
        toast.error(message ?? "Unable to send message");
      }
    } catch {
      toast.error("Unable to send message");
    }
  }, [
    messageText,
    selectedFile,
    threadType,
    isBroadcastReceived,
    thread,
    broadcastThreadId,
    broadcastRequestId,
    userId,
    conversationId,
    sendBroadcastMessage,
    sendMessage,
    refetchBroadcastMessages,
    refetch,
    scrollToBottom,
  ]);

  useEffect(() => {
    if (threadType !== "broadcast_messages" || !broadcastRequestId || !broadcastThreadId) return;
    refetchBroadcastMessages();
  }, [threadType, broadcastRequestId, broadcastThreadId, refetchBroadcastMessages]);

  useEffect(() => {
    if (threadType === "broadcast_messages") {
      const incomingBroadcastMessages = (broadcastMessages?.data as ChatMessage[] | undefined) ?? [];
      setFilteredMessages(incomingBroadcastMessages);
    }
  }, [threadType, conversationId, broadcastMessages?.data]);

  useEffect(() => {
    if (threadType === "direct_messages") {
      if (!incomingMessages) return;
      if (page === 1) {
        setFilteredMessages(incomingMessages);
      } else {
        setFilteredMessages((prev) => [...prev, ...incomingMessages]);
      }
    }
  }, [threadType, incomingMessages, page]);

  useEffect(() => {
    const chatSocket = initializeSocket("chat");
    const broadcastSocket = initializeSocket("broadcast");
    setPage(1);
    setSelectedFile(null);
    setMessageText(draftMessage.trim());
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (threadType === "broadcast_messages") {
      const incomingBroadcastMessages = (broadcastMessages?.data as ChatMessage[] | undefined) ?? [];
      setFilteredMessages(incomingBroadcastMessages);
    } else {
      setFilteredMessages([]);
    }
    shouldStickToBottomRef.current = true;
    prevScrollHeightRef.current = 0;
    chatSocket?.emit('joinConversation', { conversationId });
    broadcastSocket?.emit('joinBroadcast', {
      threadId: broadcastThreadId,
      broadcastId: isBroadcastReceived ? thread?._id : thread?.broadcastId,
    });

    if (conversationId && userId && threadType === "direct_messages") {
      markMessagesAsRead({ conversationId, userId }).unwrap().catch(() => {
        // Keep chat usable even if marking read fails.
      });
    }
    if (broadcastRequestId && userId && threadType === "broadcast_messages") {
      markBroadcastMessagesAsRead({ id: broadcastRequestId, threadId: broadcastThreadId }).unwrap().catch(() => {
        // Keep chat usable even if marking read fails.
      });
    }
  }, [conversationId, markMessagesAsRead, userId, threadType, broadcastMessages?.data, broadcastThreadId, isBroadcastReceived, thread?._id, thread?.broadcastId, draftMessage]);

  const sortedFilteredMessages = useMemo(
    () =>
      [...filteredMessages].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      }),
    [filteredMessages],
  );

  const emptyConversationCopy = useMemo(
    () => ({
      title:
        placeholders["start_conversation" as keyof typeof placeholders] ??
        "Start conversation",
      subtitle:
        placeholders["say_hi_to_begin_conversation" as keyof typeof placeholders] ??
        "Say hi to begin a conversation",
    }),
    [placeholders],
  );
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    if (page > 1 && prevScrollHeightRef.current > 0) {
      const heightDiff = el.scrollHeight - prevScrollHeightRef.current;
      el.scrollTop = el.scrollTop + heightDiff;
      prevScrollHeightRef.current = 0;
      return;
    }
    if (shouldStickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [page, sortedFilteredMessages]);
  useEffect(() => {
    const chatSocket = initializeSocket("chat");
    const broadcastSocket = initializeSocket("broadcast");
    const onReceiveMessage = () => {
      dispatch(baseApi.util.invalidateTags(["Chat"]));
    };
    const onReceiveBroadcastMessage = () => {
      dispatch(baseApi.util.invalidateTags(["BROADCAST"]));
    };
    chatSocket?.on("receiveMessage", onReceiveMessage);
    broadcastSocket?.on("receiveBroadcastMessage", onReceiveBroadcastMessage);
    return () => {
      chatSocket?.off("receiveMessage", onReceiveMessage);
      broadcastSocket?.off("receiveBroadcastMessage", onReceiveBroadcastMessage);
    };
  }, [dispatch]);
  return (
    <section
      className="flex h-full min-h-0 flex-1 flex-col bg-no-repeat bg-cover md:bg-contain bg-center"
      style={{ backgroundImage: `url(${chatDoodleBackground.src})` }}
    >
      <header className="flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:px-8">
        {onBack ? (
          <button type="button" onClick={onBack} className="rounded-md p-1 text-gray-700 lg:hidden">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
        ) : null}
        {!(threadType === "broadcast_messages" && isBroadcastReceived) ? (
          <>
            <AvatarUi
              image={headerAvatar || noImageAvtar.src}
              name={headerName}
              className="h-11 w-11 rounded-full bg-[#e7f4f5] !text-green-1"
            />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-gray-900 first-letter:uppercase">{headerName}</p>
              {headerStatus ? (
                <p
                  className={`truncate text-xs ${headerPresence?.isOnline ? "text-green-1" : "text-gray-500"}`}
                >
                  {headerStatus}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-gray-900">
              {placeholders.broadcast_messages}
            </p>
          </div>
        )}
      </header>

      <div ref={messagesContainerRef} onScroll={handleScrollNearBottom} className="flex-1 overflow-y-auto px-4 py-4 lg:px-8 lg:py-6">
        {isMessagesLoading ? (
          <div className="flex min-h-full flex-col justify-end gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={`msg-skeleton-${idx}`} className={`flex gap-2 items-end ${idx % 2 === 0 ? "justify-start" : "justify-end"}`}>
                {idx % 2 === 0 && !(threadType === "broadcast_messages" && isBroadcastReceived) && (
                  <div className="h-[32px] w-[32px] rounded-full bg-gray-200 animate-pulse" />
                )}
                <div className="max-w-[85%] lg:max-w-[60%]">
                  <div className="h-10 w-[180px] rounded-2xl bg-gray-200 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedFilteredMessages?.length === 0 ?
          <div className="flex flex-col justify-center items-center h-full ">
            <Image src={noMessagesIcon} alt="no-messages-icon" />
            <h1 className="text-black-1 text-[22px] font-medium">
              {emptyConversationCopy.title}
            </h1>
            <p className="text-[#4B514F] text-[14px] font-normal">
              {emptyConversationCopy.subtitle}
            </p>
          </div>
          :
          <div className="flex min-h-full flex-col justify-end gap-6">
            {sortedFilteredMessages?.map((message: any, index: number) => {
              const mine = (threadType === "broadcast_messages" ? message?.sender?.id : message?.sender) === userId;
              const currentDateLabel = getDateLabel(message.createdAt);
              const previousDateLabel = getDateLabel(sortedFilteredMessages[index - 1]?.createdAt);
              const showDateSeparator = currentDateLabel && currentDateLabel !== previousDateLabel;
              const MAX_CHAT_IMAGES = 5;
              const textContent =
                threadType === "broadcast_messages" ? message?.message : message?.text;
              const allImageUrls = getMessageImageUrls(message).slice(0, MAX_CHAT_IMAGES);
              const imageCount = allImageUrls.length;
              const hasFiveImages = imageCount === 5;
              const imageUrls = hasFiveImages ? allImageUrls.slice(0, 4) : allImageUrls;
              const hasImages = imageUrls.length > 0;
              const showText = Boolean(textContent != null && String(textContent).trim());
              const messageTime = getMessageTime(message.createdAt);
              return (
                <div key={index}>
                  {showDateSeparator ? (
                    <p className="mb-2 text-center text-xs text-gray-400">{currentDateLabel}</p>
                  ) : null}
                  <div className={`flex gap-2 items-end ${mine ? "justify-end" : "justify-start"}`}>
                    {!mine && !(threadType === "broadcast_messages" && isBroadcastReceived) ? (
                      <AvatarUi
                        image={headerAvatar ?? noImageAvtar.src}
                        name={headerName}
                        className="h-8 w-8 rounded-full bg-[#e7f4f5] !text-green-1"
                      />
                    ) : null}
                    {(hasImages || showText) ? (
                      <div
                        className={`w-fit max-w-[85%] overflow-hidden rounded-xl lg:max-w-[60%] ${mine ? "bg-[#EAF1FB]" : "bg-[#DFF4F4]"}`}
                      >
                        {hasImages ? (
                          <div
                            className={
                              imageUrls.length === 1 && !hasFiveImages
                                ? "flex justify-center bg-black/[0.03] p-1"
                                : "grid grid-cols-2 gap-1 bg-black/[0.03] p-1"
                            }
                          >
                            {imageUrls.map((url, imgIndex) => {
                              const isSingleLayout = imageUrls.length === 1 && !hasFiveImages;
                              const showMoreOverlay =
                                hasFiveImages && imgIndex === imageUrls.length - 1;
                              return (
                                <button
                                  type="button"
                                  key={`${index}-${imgIndex}`}
                                  className={
                                    isSingleLayout
                                      ? "flex max-w-full justify-center border-0 bg-transparent p-0 text-left cursor-pointer "
                                      : "relative aspect-square min-h-[100px] min-w-0 overflow-hidden rounded-lg border-0 bg-transparent p-0 text-left cursor-pointer sm:min-h-[120px]"
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openMessageImageLightbox(allImageUrls, imgIndex);
                                  }}
                                >
                                  <Image
                                    src={url}
                                    alt=""
                                    width={isSingleLayout ? 320 : 160}
                                    height={isSingleLayout ? 320 : 160}
                                    className={
                                      isSingleLayout
                                        ? "max-h-[min(50vh,360px)] w-auto max-w-full object-contain rounded-lg"
                                        : "h-full w-full object-cover"
                                    }
                                    unoptimized
                                  />
                                  {showMoreOverlay ? (
                                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/55">
                                      <span className="px-2 text-center text-[24px] font-medium text-white">
                                        +1
                                      </span>
                                    </div>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                        {showText ? (
                          <div
                            className={`break-words text-sm leading-relaxed ${mine ? "text-[#030303]" : "text-gray-900"} ${hasImages ? "px-3 pt-2" : "px-4 pt-2.5"} whitespace-pre-wrap`}
                          >
                            {String(textContent)
                              .split(/(https?:\/\/[^\s]+)/g)
                              .map((part, partIndex) =>
                                /^https?:\/\//.test(part) ? (
                                  <a
                                    key={`link-${partIndex}`}
                                    href={part}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="break-all text-green-1 hover:underline"
                                  >
                                    {part}
                                  </a>
                                ) : (
                                  <span key={`text-${partIndex}`}>{part}</span>
                                ),
                              )}
                          </div>
                        ) : null}
                        {messageTime ? (
                          <div
                            className={`flex justify-end ${showText || hasImages ? "px-3 pb-1.5 pt-0.5" : "px-3 py-1"}`}
                          >
                            <span className="select-none text-[11px] leading-none text-[#667781]">
                              {messageTime}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        }
      </div>


      <div className="border-t  border-gray-200 bg-[white] px-3 py-2.5 lg:px-7">
        {selectedFile && attachmentPreviewUrl ? (
          <div className="relative mb-2 h-[80px] w-[80px]">
            <button
              type="button"
              className="absolute -right-2 -top-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-[red]"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              aria-label="Remove attachment"
            >
              <XMarkIcon className="h-4 w-4 text-white" />
            </button>
            <Image
              className="h-full w-full rounded-md object-cover"
              src={attachmentPreviewUrl}
              alt={selectedFile.name}
              width={100}
              height={100}
              unoptimized
            />
          </div>
        ) : null}
        <input
          id="file-input"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          type="file"
          accept="image/*"
          className="hidden"
        />
        <div className=" mt-3 flex items-center gap-2">
          <label htmlFor="file-input" className="cursor-pointer rounded-md p-1 text-gray-500">
            <Image src={camIcon} alt="cam-icon" />
          </label>
          <div className="relative w-full">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !isSendingMessage &&
                  !isSendingBroadcastMessage
                ) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={ph("write_a_message")}
              rows={Math.min(4, Math.max(1, messageText.split("\n").length))}
              className="max-h-[120px] min-h-10 w-full resize-none rounded-[10px] bg-[#EEF2F3] px-4 py-2.5 pr-10 text-sm text-[#030303] outline-none placeholder:text-[#949494] rtl:pl-10"
            />
            <div className="absolute ltr:right-3 rtl:left-3 rtl:rotate-180 bottom-2.5 p-1 hover:bg-green-1/10 rounded-full">
              {isSendingMessage || isSendingBroadcastMessage ? (
                <span className="">
                  <span className="block h-4 w-4 animate-spin rounded-full border-2 border-[#3C9197] border-t-transparent" />
                </span>
              ) : (
                <Image
                  onClick={() => handleSendMessage()}
                  src={whiteArrowIcon}
                  alt="white-arrow-icon"
                  className="cursor-pointer"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {imageLightboxSlides.length > 0 ? (
        <Lightbox
          open={imageLightboxOpen}
          close={() => {
            setImageLightboxOpen(false);
            setImageLightboxSlides([]);
          }}
          index={imageLightboxIndex}
          slides={imageLightboxSlides}
          on={{
            view: ({ index: nextIndex }) => setImageLightboxIndex(nextIndex),
          }}
        />
      ) : null}
    </section>
  );
}
