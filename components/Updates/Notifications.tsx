"use client";

import Image from "next/image";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import demoThumb from "@/assets/images/product-image.jpg";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
    ChatBubbleLeftRightIcon,
    SignalIcon,
    HeartIcon,
    MegaphoneIcon,
    ArchiveBoxIcon,
    TagIcon,
    BriefcaseIcon,
    FlagIcon,
    BellIcon,
} from "@heroicons/react/24/solid";
import { useGetAllNotificationsQuery, useMarkAsReadMutation } from "@/store/services/notificationService";
import { getUserId } from "@/utils/getUserId";
import moment from "moment";
import { NEW_NOTIFICATION_WINDOW_EVENT } from "@/utils/notificationRealtime";
import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import noNotificationIcon from "@/assets/icons/no-notification.svg";
import { useRouter } from "next/navigation";
import { formatRequestedDateTime } from "@/utils/formatRequestedDateTime";
import AnnouncementModal from "./AnnouncementModal";
/** Must match what the notifications API expects (see `data.limit` in the response). */
const PAGE_LIMIT = 15;

export function parsePositiveInt(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        return Math.floor(value);
    }
    if (typeof value === "string" && value.trim() !== "") {
        const n = parseInt(value, 10);
        if (Number.isFinite(n) && n >= 0) return n;
    }
    return undefined;
}

export type NotificationListItem = {
    id: string;
    imageSrc: string | typeof demoThumb;
    message: string;
    timeLabel: string;
    unread: boolean;
};

type NotificationsProps = {
    setOpenSidebar?: (open: boolean) => void;
    /** Sidebar badge count (same as Layout state). */
    unreadCount?: number;
    setReadCount?: Dispatch<SetStateAction<number>>;
};

type NotificationPayload = {
    action?: string;
    serviceId?: string;
    productId?: string;
    id?: string;
    _id?: string;
    request?: {
        service?: string;
    };
    title?: string;
    image?: string;
    video?: string;
    ctaLabel?: string;
    ctaDestination?: string;
    announcementId?: string;
};

type NotificationApiItem = {
    _id?: string;
    id?: string;
    type?: string;
    payload?: NotificationPayload | any;
    message?: string;
    createdAt?: string;
    read?: boolean;
    image?: string;
};

function getNotificationPayload(item: NotificationApiItem): NotificationPayload | null {
    const raw = item.payload;
    if (raw == null) return null;
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw) as unknown;
            return typeof parsed === "object" && parsed !== null
                ? (parsed as NotificationPayload)
                : null;
        } catch {
            return null;
        }
    }
    return raw;
}

function getNotificationId(item: NotificationApiItem): string | undefined {
    return item._id ?? item.id;
}

function mergeNotificationPages(
    previous: NotificationApiItem[],
    incoming: NotificationApiItem[],
    replace: boolean,
) {
    const rows = replace ? incoming : [...previous, ...incoming];
    const seen = new Set<string>();
    const unique: NotificationApiItem[] = [];

    for (const item of rows) {
        const id = getNotificationId(item);
        if (id) {
            if (seen.has(id)) continue;
            seen.add(id);
        }
        unique.push(item);
    }

    return unique;
}

function getPayloadTargetId(payload: NotificationPayload | null): string | undefined {
    if (!payload) return undefined;
    return payload.serviceId ?? payload.productId ?? payload.id ?? payload._id ?? payload?.request?.service;
}

// One look per notification type — a colored icon badge so the list reads
// at a glance instead of every row carrying the same generic bell PNG.
const NOTIFICATION_VISUALS: Record<string, { Icon: typeof BellIcon; bg: string; text: string }> = {
    MESSAGE: { Icon: ChatBubbleLeftRightIcon, bg: "bg-teal-50", text: "text-[#007781]" },
    BROADCAST: { Icon: SignalIcon, bg: "bg-blue-50", text: "text-blue-500" },
    PROMOTION: { Icon: SignalIcon, bg: "bg-blue-50", text: "text-blue-500" },
    LIKE: { Icon: HeartIcon, bg: "bg-pink-50", text: "text-pink-500" },
    ANNOUNCEMENT: { Icon: MegaphoneIcon, bg: "bg-orange-50", text: "text-orange-500" },
    ORDER: { Icon: ArchiveBoxIcon, bg: "bg-green-50", text: "text-green-600" },
    PRODUCT_OFFER: { Icon: TagIcon, bg: "bg-amber-50", text: "text-amber-600" },
    SERVICE_REQUEST: { Icon: BriefcaseIcon, bg: "bg-violet-50", text: "text-violet-600" },
    REPORT: { Icon: FlagIcon, bg: "bg-rose-50", text: "text-rose-600" },
};

function getNotificationVisual(type?: string) {
    return (
        NOTIFICATION_VISUALS[(type ?? "").toUpperCase()] ?? {
            Icon: BellIcon,
            bg: "bg-gray-100",
            text: "text-gray-500",
        }
    );
}

function Notifications({ setOpenSidebar, unreadCount = 0, setReadCount }: NotificationsProps) {
    const { placeholders, currentLanguage } = useDictionary();
    type PlaceholderKey = keyof typeof placeholders;
    const ph = (key: PlaceholderKey) => placeholders[key];
    const router = useRouter();

    const [hasMounted, setHasMounted] = useState(false);
    useEffect(() => {
        setHasMounted(true);
    }, []);

    const userId = getUserId();
    const [markAsRead] = useMarkAsReadMutation();

    // Page 1, 2, 3… for ?page= — scroll loads the next page until we reach totalPages from the API.
    const [page, setPage] = useState(1);
    const [notificationItems, setNotificationItems] = useState<NotificationApiItem[]>([]);
    const [announcementItem, setAnnouncementItem] = useState<NotificationApiItem | null>(null);
    const lastMergedKeyRef = useRef<string>("");

    const { data, isLoading, isFetching, isUninitialized, fulfilledTimeStamp } =
        useGetAllNotificationsQuery(
            {
                id: userId ?? "",
                page,
                limit: PAGE_LIMIT,
            },
            {
                skip: !hasMounted || !userId,
                refetchOnMountOrArgChange: true,
            },
        );
    function handleNavigation(item: any) {
        console.log(item, "thred item");
        if (item.type === "ANNOUNCEMENT") {
            setAnnouncementItem(item);
            return;
        }
        setOpenSidebar?.(false);
        if (item.type === "PROMOTION") {
            router.push(`/chat?tab=broadcast_messages&type=received&chatId=${item.payload.threadId}`);
            return;
        }
        if (item.type === "MESSAGE") {
            router.push(`/chat?chatId=${item.payload?.conversation?.id}`);
            return;
        }
        if (item.type === "BROADCAST") {
            const subTab = item.payload?.broadcastSubTab === "sent" ? "sent" : "received";
            router.push(`/chat?tab=broadcast_messages&type=${subTab}&chatId=${item.payload?.thread?.id}`);
            return;
        }
        // Someone liked this user's listing or service — open the item itself.
        // Handled before the targetId lookup below, which expects an order or
        // request shape this payload doesn't have.
        if (item.type === "LIKE") {
            const likedId = item.payload?.itemId;
            if (!likedId) return;
            router.push(
                item.payload?.itemType === "product"
                    ? `/buy-product?id=${likedId}`
                    : `/book-service?id=${likedId}`,
            );
            return;
        }
        const targetId = getPayloadTargetId(getNotificationPayload(item));
        if (!targetId) return;
        switch (item.type) {
            case "SERVICE_REQUEST":
                if (item.payload.action === "accept" || item.payload.action === "reject" || item.payload.action === "propose") {
                    router.push(`/profile?tab=my_requests`);
                }
                else {
                    router.push(`/services`);
                }
                break;
            case "ORDER":
                router.push(`/profile?tab=my_orders`);
                break;
            case "REPORT":
                router.push(`/profile?tab=my_reports`);
                break;
            case "PRODUCT_OFFER":
                router.push(`/profile?tab=broadcast_offers`);
                break;

            default:
                break;
        }
    }

    async function handleNotificationClick(item: NotificationApiItem) {
        const id = item._id ?? item.id;
        if (!id) return;

        if (!item.read && setReadCount) {
            const countBeforeClick = unreadCount;
            setReadCount((c) => Math.max(0, c - 1));

            try {
                await markAsRead({ id }).unwrap();
                setNotificationItems((prev) =>
                    prev.map((n) => ((n._id ?? n.id) === id ? { ...n, read: true } : n)),
                );
            } catch {
                setReadCount(countBeforeClick);
                return;
            }
        }
        handleNavigation(item);
    }

    const totalPages = parsePositiveInt(data?.data?.totalPages);
    const lastBatch =
        (data?.data?.notifications as NotificationApiItem[] | undefined) ?? [];

    useEffect(() => {
        if (!userId) {
            setNotificationItems([]);
            setPage(1);
            lastMergedKeyRef.current = "";
            return;
        }
        setNotificationItems([]);
        setPage(1);
        lastMergedKeyRef.current = "";
    }, [userId]);
    useLayoutEffect(() => {
        if (!userId || data == null || isFetching) return;
        const rows =
            (data?.data?.notifications as NotificationApiItem[] | undefined) ?? [];
        const mergeKey = `${page} -${fulfilledTimeStamp ?? 0} `;
        if (lastMergedKeyRef.current === mergeKey) return;
        lastMergedKeyRef.current = mergeKey;

        if (page === 1) {
            setNotificationItems(mergeNotificationPages([], rows, true));
        } else {
            setNotificationItems((prev) => mergeNotificationPages(prev, rows, false));
        }
    }, [data, page, userId, isFetching, fulfilledTimeStamp]);

    const canLoadMore =
        totalPages != null ? page < totalPages : lastBatch.length >= PAGE_LIMIT;

    function handleScrollNearBottom(e: React.UIEvent<HTMLUListElement>) {
        if (!hasMounted || !userId || isFetching || !canLoadMore) return;
        const el = e.currentTarget;
        const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
        if (!nearBottom) return;
        setPage((p) => p + 1);
    }
    const loadingInitial =
        !hasMounted ||
        (!!userId &&
            notificationItems.length === 0 &&
            (isUninitialized || isLoading || isFetching));

    const showEmpty =
        hasMounted && !loadingInitial && notificationItems.length === 0;

    const announcementPayload = announcementItem ? getNotificationPayload(announcementItem) : null;

    useEffect(() => {
        if (!hasMounted) return;
        const onNewNotification = () => {
            setNotificationItems([]);
            setPage(1);
            lastMergedKeyRef.current = "";
        };
        window.addEventListener(NEW_NOTIFICATION_WINDOW_EVENT, onNewNotification);
        return () => {
            window.removeEventListener(NEW_NOTIFICATION_WINDOW_EVENT, onNewNotification);
        };
    }, [hasMounted]);

    return (
        <div
            className="h-screen w-full bg-white  py-6 flex flex-col"
            dir={currentLanguage === "ur" ? "rtl" : "ltr"}
            suppressHydrationWarning
        >
            <div className="px-5">
                <div className="flex justify-between items-center">
                    <h1 className="text-[22px] font-bold leading-tight text-black-1 ">
                        {ph("notifications_title")}
                    </h1>
                    <XMarkIcon
                        className="lg:hidden w-6 h-6 cursor-pointer"
                        onClick={() => setOpenSidebar?.(false)}
                    />
                </div>

                <p className="mt-1 text-[15px] font-medium text-gray-8">
                    {ph("today")}
                </p>
            </div>

            <div className="mt-3 flex min-h-0 flex-1 flex-col">
                {loadingInitial ? (
                    <ul className="min-h-0 px-5 flex-1 overflow-y-auto">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <li
                                key={index}
                                className="flex items-center gap-3 py-2 first:pt-2 animate-pulse"
                            >
                                <div className="h-[42px] w-[42px] shrink-0 rounded-[10px] bg-gray-4" />
                                <div className="min-w-0 flex-1">
                                    <div className="h-3 w-full rounded bg-gray-4" />
                                    <div className="mt-2 h-3 w-1/3 rounded bg-gray-4" />
                                </div>
                                <div className="h-2.5 w-2.5 rounded-full bg-gray-4" />
                            </li>
                        ))}
                    </ul>
                ) : showEmpty ? (
                    <div
                        className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-center"
                        role="status"
                    >
                        <Image
                            src={noNotificationIcon}
                            alt=""
                            width={44}
                            height={47}
                            unoptimized
                        />
                        <h2 className="mt-4 text-[22px] font-medium text-black-1">
                            {ph("no_notifications_yet")}
                        </h2>
                        <p className="mt-2 text-[14px] font-normal text-gray-8">
                            {ph("notifications_empty_subtitle")}
                        </p>
                    </div>
                ) : (
                    <ul
                        className="min-h-0 flex-1 overflow-y-auto"
                        onScroll={handleScrollNearBottom}
                    >
                        {notificationItems.map((item, index) => {
                            const itemId = getNotificationId(item);
                            const { Icon, bg, text } = getNotificationVisual(item.type);
                            return (
                                <li
                                    key={itemId ? `${itemId}-${index}` : `notification-${index}`}
                                    onClick={() => {
                                        void handleNotificationClick(item);
                                    }}
                                    className="flex px-5 items-center gap-3 py-2 first:pt-2 hover:bg-green-4 cursor-pointer"
                                >
                                    <div
                                        className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] ${bg}`}
                                    >
                                        <Icon className={`h-5 w-5 ${text}`} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] font-normal leading-snug text-[#727272]">
                                            {item?.payload?.action === "propose" ? item.message + " " +
                                                formatRequestedDateTime(
                                                    item?.payload?.proposedDateTime,
                                                    currentLanguage,
                                                )
                                                : item.message ?? ""}
                                        </p>
                                        <p
                                            className="mt-1 text-[12px] font-normal text-[#414E51]"
                                            suppressHydrationWarning
                                        >
                                            {moment().diff(moment(item.createdAt), "seconds") < 60
                                                ? ph("just_now")
                                                : moment(item.createdAt).locale(currentLanguage).fromNow()}
                                        </p>
                                    </div>

                                    {!item.read && (
                                        <div className="flex shrink-0 items-center">
                                            <span
                                                className="h-2.5 w-2.5 rounded-full bg-green-1"
                                                aria-hidden
                                            />
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                        {isFetching && notificationItems.length > 0 && (
                            <li className="flex justify-center py-3" aria-hidden>
                                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-4 border-t-green-1" />
                            </li>
                        )}
                    </ul>
                )
                }
            </div >

            <AnnouncementModal
                open={announcementItem != null}
                onClose={() => setAnnouncementItem(null)}
                announcementId={announcementPayload?.announcementId}
                title={announcementPayload?.title}
                message={announcementItem?.message}
                image={announcementPayload?.image}
                video={announcementPayload?.video}
                ctaLabel={announcementPayload?.ctaLabel}
                ctaDestination={announcementPayload?.ctaDestination}
            />
        </div >
    );
}

export default Notifications;
