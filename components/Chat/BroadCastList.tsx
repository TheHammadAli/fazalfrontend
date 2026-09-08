import React from 'react'
import Image from 'next/image'
import chevron from '@/assets/icons/chev-down-icon.svg'
import formatFromNowShort from '@/utils/formatFromNowShort';
import { useDictionary } from '@/dictionaries/DictionaryProvider';
import { getFeedCategoryLabel } from '@/utils/getFeedCategoryLabel';

type BroadcastItem = {
    type: "Product" | "Service";
    category: { name: { en: string; ur: string } };
    message: string;
    threadCount: number;
    radius: number;
    createdAt: string;
    threadId?: string;
    unreadCount?: number;
    unread?: number | boolean;
};

type BroadCastListProps = {
    items: BroadcastItem[];
    onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
    onSelectItem?: (item: BroadcastItem) => void;
    chatId: string;
    activeTab?: string;
};

function BroadCastList({ items, onScroll, onSelectItem, chatId, activeTab }: BroadCastListProps) {
    const { currentLanguage, placeholders } = useDictionary();
    type PlaceholderKey = keyof typeof placeholders;
    const ph = (key: PlaceholderKey) => placeholders[key];
    return (
        <div onScroll={onScroll} className="hide-scrollbar flex-1 overflow-y-auto divide-y divide-gray-9 bg-white">
            {items?.map((item: any, index) => {
                const isReceivedSelected =
                    activeTab === "received" && !!item?.threadId && chatId === item.threadId;
                const unreadCount =
                    typeof item.unreadCount === "number"
                        ? item.unreadCount
                        : typeof item.unread === "number"
                            ? item.unread
                            : item.unread
                                ? 1
                                : 0;

                return (
                    <button
                        key={index}
                        type="button"
                        onClick={() => onSelectItem?.(item)}
                        className={`w-full cursor-pointer px-5 py-3 text-left  ${isReceivedSelected ? "bg-[#E7f4f5] hover:bg-[#e7f4f5]" : "hover:bg-gray-50"}`}
                    >
                        <div className="flex items-start justify-between gap-2  text-[13px]">
                            <p className="first-letter:uppercase leading-[22px] font-normal text-[#3C9197]">
                                {item.type ?? ph("product")} &#8226; {getFeedCategoryLabel(item?.category, currentLanguage)}
                            </p>
                            <span className="shrink-0   font-normal text-gray-8">{formatFromNowShort(item?.latestMessage?.createdAt ?? item?.createdAt ?? '', currentLanguage as "en" | "ur")}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                            <p className="min-w-0 truncate text-[15px] font-medium text-black-1">{item.message}</p>
                            {unreadCount > 0 ? (
                                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#3C9197] px-1.5 text-[11px] font-medium leading-none text-white">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            ) : (
                                <Image src={chevron} alt="chevron" className="w-3 h-3 ltr:-rotate-90 rtl:rotate-90 shrink-0" />
                            )}
                        </div>

                        <p className="mt-1 text-[14px] rtl:text-right ltr:text-left  font-normal text-black-1">
                            {/* How many sellers a broadcast reached only means something to
                                the person who sent it. A received broadcast carries no
                                threadCount at all, so this rendered a bare "0 recipients". */}
                            {activeTab !== "received" ? (
                                <>
                                    {item?.threadCount || 0} {ph("recipients")}
                                    <span className="mx-3 text-gray-2">|</span>{" "}
                                </>
                            ) : null}
                            <span className="text-[#FF8A00]">
                                {item?.radius ?? ""}{" "}
                                {placeholders["km" as keyof typeof placeholders] ?? "km"}
                            </span>
                        </p>
                    </button>
                );
            })}
        </div>
    )

}

export default BroadCastList