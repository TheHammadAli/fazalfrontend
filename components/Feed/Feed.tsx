"use client";
import React, { useRef, useState } from "react";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import ServiceFeeds from "./ServiceFeeds";
import ProductFeeds from "./ProductFeeds";

type FeedProps = {
    // Set when arriving via "My Videos" -> tap a video (see /feed page.tsx,
    // which reads these off the URL's ?postId=&tab= query).
    initialPostId?: string;
    initialTab?: string;
};

function Feed({ initialPostId, initialTab }: FeedProps) {
    const tabs = ["products", "services"] as const;
    const [activeTab, setActiveTab] = useState<string>(
        initialTab === "services" ? "services" : tabs[0],
    );
    const { placeholders } = useDictionary();
    type PlaceholderKey = keyof typeof placeholders;
    // Held in a ref (not state) so consuming it doesn't itself trigger a
    // render; cleared once the target tab's component reports it actually
    // fetched and pinned the post, so switching tabs away and back afterwards
    // doesn't jump back to the same post again.
    const focusPostIdRef = useRef(initialPostId);
    const [, forceRerender] = useState(0);
    const consumeFocusPostId = () => {
        focusPostIdRef.current = undefined;
        forceRerender((n) => n + 1);
    };
    const tabsComponents: { [key: string]: React.ReactNode } = {
        products: (
            <ProductFeeds
                focusPostId={activeTab === "products" ? focusPostIdRef.current : undefined}
                onFocusConsumed={consumeFocusPostId}
            />
        ),
        services: (
            <ServiceFeeds
                focusPostId={activeTab === "services" ? focusPostIdRef.current : undefined}
                onFocusConsumed={consumeFocusPostId}
            />
        ),
    };

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden sm:pt-2 lg:pt-4">
                <div className="absolute left-1/2 top-8 sm:top-15 z-50 flex h-[37px] w-[204px] -translate-x-1/2 -translate-y-1/2 items-center gap-[2px] rounded-lg bg-[#E2E8F080]/50 p-[2px]">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`flex h-full w-[50%] cursor-pointer items-center justify-center rounded-lg text-[14px] font-medium capitalize transition-colors ${activeTab === tab
                                ? "bg-white text-[#0F172A]"
                                : "bg-transparent text-white font-normal"
                                }`}
                        >
                            {placeholders[tab as PlaceholderKey]}
                        </button>
                    ))}
                </div>
                {tabsComponents[activeTab]}
            </div>
        </div>
    );
}

export default Feed;