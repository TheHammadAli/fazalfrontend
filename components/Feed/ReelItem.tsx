import { useRef, useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { ReelItem as ReelItemType } from "./ReelsFeed";
import noImageIcon from "@/assets/images/new-no-image-placeholder.png";
import Image from "next/image";
import { User } from "lucide-react";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { getFeedCategoryIcon, getFeedCategoryLabel } from "@/utils/getFeedCategoryLabel";
import { useRouter } from "next/navigation";
import Modal from "../Ui/Modals/Modal";
import SharePostModal from "../Ui/SharePostModal";
import { useLikedVideoByUserQuery, useLikeVideoMutation, useUnlikeVideoMutation } from "@/store/services/feedService";
import { useTrackProductViewMutation } from "@/store/services/homeService";
import { useTrackServiceViewMutation } from "@/store/services/sellingService";
import { getUserId } from "@/utils/getUserId";
import shareSimpleIcon from "@/assets/icons/share-white-icon.svg";
import DoodleButton from "@/components/Ui/DoodleButton";
import { useRequireSignIn } from "@/custom-hooks/useRequireSignIn";
export default function ReelItem({
    type,
    item,
    activeReel,
    onVisible,
}: {
    type: string;
    item: ReelItemType;
    activeReel: any;
    onVisible: (reel: any) => void;
}) {
    const { requireSignIn } = useRequireSignIn();
    const sharePostRef = useRef<HTMLDivElement>(null)
    const [shareModal, setShareModal] = useState(false)
    const userId = getUserId() ?? "";
    const router = useRouter();
    const { placeholders, currentLanguage } = useDictionary();
    type PlaceholderKey = keyof typeof placeholders;
    const ph = (key: PlaceholderKey) => placeholders[key];
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const progressRef = useRef<HTMLDivElement | null>(null);
    const playRequestIdRef = useRef(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(item.likesCount ?? 0);
    const [sharesCount, setSharesCount] = useState(item.sharesCount ?? 0);
    const feedType = type === "products" ? "product" : "service";
    const { ref, inView } = useInView({
        threshold: 0.7, // 
    });
    const shouldSkipLikedQuery = !userId || !inView || activeReel?.id !== item.id;
    const { data: likedVideoByUser } = useLikedVideoByUserQuery(
        { userId, type: feedType },
        { skip: shouldSkipLikedQuery },
    );
    const [likeVideo, { isLoading: isLikeLoading }] = useLikeVideoMutation();
    const [unlikeVideo, { isLoading: isUnlikeLoading }] = useUnlikeVideoMutation();
    const [trackProductView] = useTrackProductViewMutation();
    const [trackServiceView] = useTrackServiceViewMutation();
    const trackedViewRef = useRef(false);
    useEffect(() => {
        // Virtuoso keys rows by index, not item id, so a recycled ReelItem
        // instance must re-sync its counts whenever the item it represents changes.
        setLikesCount(item.likesCount ?? 0);
        setSharesCount(item.sharesCount ?? 0);
        trackedViewRef.current = false;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item.id]);
    useEffect(() => {
        if (!likedVideoByUser?.data) return;
        const liked = likedVideoByUser.data.some(
            (like: { itemId?: string }) =>
                like.itemId === activeReel?.id
        );
        setIsLiked(liked);
    }, [likedVideoByUser, item.id]);
    const playSafely = async () => {
        const video = videoRef.current;
        if (!video) return;
        const requestId = ++playRequestIdRef.current;
        try {
            await video.play();
            if (playRequestIdRef.current === requestId) {
                setIsPlaying(true);
            }
        } catch {
            // play() can be interrupted by pause during fast scroll/snap transitions
        }
    };


    const pauseSafely = () => {
        const video = videoRef.current;
        if (!video) return;
        playRequestIdRef.current += 1;
        if (!video.paused) {
            video.pause();
        }
        setIsPlaying(false);
    };

    useEffect(() => {
        if (inView) {
            onVisible(item);
            playSafely();
            if (userId && !trackedViewRef.current) {
                trackedViewRef.current = true;
                if (feedType === "service") {
                    trackServiceView(item.id);
                } else {
                    trackProductView(item.id);
                }
            }
        } else {
            pauseSafely();
        }
    }, [inView, item.id, onVisible]);

    const togglePlayPause = () => {
        if (!videoRef.current) return;
        if (videoRef.current.paused) {
            playSafely();
        } else {
            pauseSafely();
        }
    };

    const handleSeek = (value: number) => {
        if (!videoRef.current || !Number.isFinite(duration)) return;
        videoRef.current.currentTime = value;
        setCurrentTime(value);
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !duration) return;
        const rect = progressRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = Math.min(Math.max(x / rect.width, 0), 1);
        handleSeek(ratio * duration);
    };
    const onLikeClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (!activeReel?.id || isLikeLoading || isUnlikeLoading) return;
        const prevIsLiked = isLiked;
        const nextIsLiked = !prevIsLiked;
        // Optimistic UI update
        setIsLiked(nextIsLiked);
        setLikesCount((count) => Math.max(0, count + (nextIsLiked ? 1 : -1)));

        const req = prevIsLiked
            ? unlikeVideo({ itemId: activeReel?.id, itemType: feedType }).unwrap()
            : likeVideo({
                itemId: activeReel?.id,
                itemType: feedType,
                ownerModel: item?.shopId ? "Shop" : "User",
            }).unwrap();

        req.catch((error) => {
            // Revert if API fails
            setIsLiked(prevIsLiked);
            setLikesCount((count) => Math.max(0, count + (nextIsLiked ? -1 : 1)));
            console.log("error", error);
        });
    }
    const onShareClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();

        setShareModal(true)
    };

    return (
        <div
            ref={ref}
            role="button"
            tabIndex={0}
            onClick={togglePlayPause}
            onKeyDown={(e) => {
                if (e.code === "Space" || e.key === " ") {
                    e.preventDefault();
                    togglePlayPause();
                }
            }}
            style={{
                height: "100%",
                position: "relative",
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
                borderRadius: "8px",
                overflow: "visible",
            }}
        >
            <Modal
                editModalRef={sharePostRef}
                open={shareModal}
                setOpen={setShareModal}
                centered={true}>
                <SharePostModal
                    type={type === "products" ? ph("product") : ph("service")}
                    setShareModal={setShareModal}
                    shareUrl={`${window.location.origin}${type === "products" ? `/buy-product?id=${item.id}` : `/book-service?id=${item.id}`}`}
                    shareService={true}
                    itemId={item.id}
                    itemType={type === "products" ? "product" : "service"}
                    onShared={() => setSharesCount((count) => count + 1)}
                />
            </Modal>
            <video
                ref={videoRef}
                src={item.video}
                loop
                playsInline
                onLoadedMetadata={(e) => {
                    setDuration(e.currentTarget.duration || 0);
                }}
                onTimeUpdate={(e) => {
                    setCurrentTime(e.currentTarget.currentTime || 0);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="rounded-none sm:rounded-[8px]"
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",

                }}
            />

            {!isPlaying && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        togglePlayPause();
                    }}
                    className="absolute left-1/2 top-1/2 z-10 flex h-[50px] w-[50px] -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-none bg-[rgba(0,0,0,0.33)] text-white"
                    aria-label="Play"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
                        <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                    </svg>
                </button>
            )}

            <div className="absolute bottom-6 left-0 right-0 px-2 sm:px-5 w-full items-end flex sm:gap-16 gap-8">
                <div
                    className="text-[14px] flex-1 font-normal text-white "
                >
                    <div className="flex overflow-hidden   bg-[#4A4A4A3D] w-max rounded-md  border-[0.5px] border-[#74747480]">
                        <div className="flex items-center justify-center bg-[#505050C2] px-2 py-1">
                            <Image
                                src={getFeedCategoryIcon(item.category) ?? noImageIcon}
                                alt="category"
                                height={20}
                                width={20}
                                unoptimized
                                className="h-5 w-5 object-cover"
                            />
                        </div>
                        <div className="text-[14px] px-2 py-1 font-light text-white">
                            {getFeedCategoryLabel(item.category, currentLanguage)}
                        </div>
                    </div>
                    <h3 className="text-[16px] font-medium mt-2 ">{item.title}</h3>
                    <p className="mt-1 text-[#00D656] font-semibold">Rs {item.price}</p>

                    <DoodleButton
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (type === "products") {
                                router.push(`/buy-product?id=${item.id}`);
                            } else if (type === "services") {
                                router.push(`/book-service?id=${item.id}`);
                            }
                        }}
                        className="mt-2 flex h-[46px] w-full cursor-pointer items-center justify-center rounded-md bg-green-1 px-4 text-white"
                    >
                        {type === "products" ? ph("shop_now") : ph("book_now")}
                    </DoodleButton>
                </div>
                <div className=" flex flex-col items-center gap-4">
                    <button
                        type="button"
                        aria-label={type === "products" ? ph("shop_now") : ph("book_now")}
                        className="flex h-[54px] w-[54px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#2C2C2C]/80"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (type === "products") {
                                router.push(`/buy-product?id=${item.id}`);
                            } else if (type === "services") {
                                router.push(`/book-service?id=${item.id}`);
                            }
                        }}
                    >
                        <User className="h-7 w-7 text-green-1" strokeWidth={1.75} aria-hidden />
                    </button>

                    <div className="flex flex-col items-center gap-1">
                        <button
                            type="button"
                            onClick={(e) => requireSignIn(() => onLikeClick(e))}
                            className={`flex h-[54px] w-[54px] cursor-pointer items-center justify-center rounded-full  text-white bg-[#2C2C2C]/80`}
                            aria-label="Like"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                stroke={isLiked ? undefined : "white"}
                                strokeWidth={isLiked ? undefined : 1.5}
                                fill={isLiked ? "#E92440" : "none"}
                                className="h-8 w-8"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                            </svg>
                        </button>
                        <span className="text-[12px] font-medium text-white drop-shadow">
                            {likesCount.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <button
                            type="button"
                            onClick={(e) => requireSignIn(() => onShareClick(e))}
                            className="cursor-pointer flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[#2C2C2C]/80 text-white"
                            aria-label="Share"
                        >
                            <Image className="" src={shareSimpleIcon} alt="share-simple-icon" />
                        </button>
                        <span className="text-[12px] font-medium text-white drop-shadow">
                            {sharesCount.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            <div
                className="absolute bottom-0 px-1 w-full pb-0.5 "
                onClick={(e) => e.stopPropagation()}
                style={{ zIndex: 20 }}
            >
                <div
                    ref={progressRef}
                    onClick={handleProgressClick}
                    className="h-[4px] w-full cursor-pointer rounded-full bg-black/40"
                >
                    <div
                        className="h-full rounded-full bg-green-1"
                        style={{
                            width: `${duration ? (Math.min(currentTime, duration) / duration) * 100 : 0}%`,
                        }}
                    />
                </div>
            </div>

        </div >
    );
}