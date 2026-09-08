import { forwardRef, useLayoutEffect, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import type { ReelCategory } from "@/utils/getFeedCategoryLabel";
import ReelItem from "./ReelItem";

export type ReelItem = {
    id: string;
    shopId?: string;
    shopName?: string;
    shopImage?: string;
    ownerId?: string;
    ownerName?: string;
    ownerImage?: string;
    video: string;
    title: string;
    price: string;
    category: ReelCategory;
    likesCount?: number;
    isLiked?: boolean;
    sharesCount?: number;
    isVideoPost?: boolean;
};

type ReelsFeedProps = {
    type: string;
    reels: ReelItem[];
    onEndReached?: () => void;
    isLoadingMore?: boolean;
};

const SnapScroller = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
    ({ style, ...props }, ref) => (
        <div
            ref={ref}
            {...props}
            className="hide-scrollbar"
            style={{
                ...style,
                scrollSnapType: "y mandatory",
                overscrollBehaviorY: "contain",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
            }}
        />
    )
);
SnapScroller.displayName = "SnapScroller";

export default function ReelsFeed({ reels, onEndReached, isLoadingMore = false, type }: ReelsFeedProps) {
    const reelGap = 12;
    const [activeReel, setActiveReel] = useState<string>("");
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [itemHeight, setItemHeight] = useState(() =>
        typeof window !== "undefined" ? Math.max(320, window.innerHeight - 140) : 600,
    );

    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const measure = () => {
            const h = el.getBoundingClientRect().height;
            if (h > 0) {
                setItemHeight(h);
                return;
            }
            setItemHeight((prev) =>
                prev > 0 ? prev : Math.max(320, window.innerHeight - 140),
            );
        };

        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, [reelGap]);

    return (
        <div
            ref={containerRef}
            className="mx-auto h-full min-h-[320px] w-full max-w-full lg:max-w-[456px]"
        >
            <Virtuoso
                data={reels}
                endReached={onEndReached}
                increaseViewportBy={400}
                defaultItemHeight={itemHeight || 600}
                itemContent={(index, item: ReelItem) => (
                    <div
                        className="box-border"
                        style={{
                            height: itemHeight || undefined,
                            minHeight: itemHeight || undefined,
                            paddingBottom: `${reelGap}px`,
                        }}
                    >
                        <ReelItem
                            type={type}
                            key={index}
                            item={item}
                            activeReel={activeReel}
                            onVisible={(reel) => setActiveReel(reel)}
                        />
                    </div>
                )}
                components={{
                    Scroller: SnapScroller,
                    Footer: () =>
                        isLoadingMore ? (
                            <div className="pb-3 text-center text-xs text-white/75">Loading...</div>
                        ) : null,
                }}
                style={{ height: "100%" }}
            />
        </div>
    );
}