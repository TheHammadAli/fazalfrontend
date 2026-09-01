"use client";

import React, { useCallback, useMemo, useState } from "react";
import { MoreHorizontal, Plug, Wind, Wrench, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { useCategoriesQuery } from "@/custom-hooks/useCategoriesQuery";
import { getFeedCategoryLabel } from "@/utils/getFeedCategoryLabel";
import "swiper/css";
import Image from "next/image";
import noImageIcon from "@/assets/images/new-no-image-placeholder.png";
import AllCategoriesModal from "./AllCategoriesModal";

const INITIAL_SERVICE_CATEGORY_COUNT = 5;

type CategoryItem = {
    _id: string;
    name?: string | { en?: string; ur?: string };
    icon?: string;
};

type ServiceCategoryStyle = {
    bgClass: string;
    Icon: LucideIcon;
};

const SERVICE_CATEGORY_STYLES: ServiceCategoryStyle[] = [
    { bgClass: "bg-[#EAF1FB]", Icon: Wind },
    { bgClass: "bg-[#FBF3EA]", Icon: Plug },
    { bgClass: "bg-[#DFF4F4]", Icon: Wrench },
];

const SERVICE_MORE_STYLE: ServiceCategoryStyle = {
    bgClass: "bg-[#EEF2F3]",
    Icon: MoreHorizontal,
};

const SERVICE_SWIPER_BREAKPOINTS = {
    0: {
        slidesPerView: 1.5,
        spaceBetween: 12,
    },
    640: {
        slidesPerView: 3,
        spaceBetween: 12,
        slidesOffsetBefore: 0,
        slidesOffsetAfter: 0,
    },
    1024: {
        slidesPerView: 4,
        spaceBetween: 16,
        slidesOffsetBefore: 0,
        slidesOffsetAfter: 0,
        freeMode: false,
    },
    1300: {
        slidesPerView: 6,
        spaceBetween: 16,
        slidesOffsetBefore: 0,
        slidesOffsetAfter: 0,
        freeMode: false,
    },
};

function getServiceCategoryStyle(index: number): ServiceCategoryStyle {
    return SERVICE_CATEGORY_STYLES[index % SERVICE_CATEGORY_STYLES.length];
}

function ServiceCategoryCardSkeleton() {
    return (
        <div className="min-h-[112px] w-full animate-pulse rounded-[16px] bg-gray-200 p-3">
            <div className="h-6 w-6 rounded bg-gray-300" />
            <div className="mt-3 h-4 w-2/3 rounded bg-gray-300" />
        </div>
    );
}

type ServiceCategoryCardProps = {
    name: string;
    style: ServiceCategoryStyle;
    onClick: () => void;
    icon?: string;
    showStyleIcon?: boolean;
};

function hasCategoryIcon(icon?: string): boolean {
    return typeof icon === "string" && icon.trim().length > 0;
}

function ServiceCategoryCard({
    name,
    style,
    onClick,
    icon,
    showStyleIcon = false,
}: ServiceCategoryCardProps) {
    const { bgClass, Icon } = style;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick();
                }
            }}
            className={`flex min-h-[100px] w-full cursor-pointer flex-col justify-between rounded-[14px] border-1 border-transparent px-3 py-[14px] transition-opacity hover:opacity-95 ${bgClass}`}
        >
            {showStyleIcon ? (
                <Icon className="h-6 w-6 shrink-0 text-[#4B514F]" strokeWidth={1.75} />
            ) : (
                <Image
                    src={hasCategoryIcon(icon) ? (icon as string) : noImageIcon}
                    alt={name}
                    width={24}
                    height={24}
                    unoptimized={hasCategoryIcon(icon)}
                    className="h-6 w-6 shrink-0 object-contain"
                />
            )}
            <p className="truncate-safe mt-3 w-full min-w-0 text-[13px] font-semibold text-[#030303] rtl:text-right">
                {name}
            </p>
        </div>
    );
}

export default function ServicesCategories() {
    const router = useRouter();
    const { info_messages, currentLanguage, placeholders } = useDictionary();
    const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
    const {
        data: categories,
        isLoading,
        isFetching,
    } = useCategoriesQuery({ type: "service" });

    const isLoadingCategories = isLoading || isFetching;
    const categoryList = useMemo(
        () => (categories?.data ?? []) as CategoryItem[],
        [categories?.data],
    );
    const visibleCategories = useMemo(
        () => categoryList.slice(0, INITIAL_SERVICE_CATEGORY_COUNT),
        [categoryList],
    );
    const hasMoreCategories =
        categoryList.length > INITIAL_SERVICE_CATEGORY_COUNT;

    const handleCategorySelect = useCallback(
        (categoryId: string) => {
            const params = new URLSearchParams({ tab: "services", categoryId });
            router.push(`/home/search-list?${params.toString()}`);
        },
        [router],
    );

    const swiperSlides = useMemo(() => {
        if (isLoadingCategories) {
            return Array.from({ length: 6 }).map((_, index) => (
                <SwiperSlide
                    key={`service-category-skeleton-${index}`}
                    className="!h-auto !overflow-visible"
                >
                    <ServiceCategoryCardSkeleton />
                </SwiperSlide>
            ));
        }

        const slides = visibleCategories.map((category, index) => {
            const style = getServiceCategoryStyle(index);
            const name = getFeedCategoryLabel(category.name, currentLanguage);

            return (
                <SwiperSlide
                    key={category._id}
                    className="!h-auto !overflow-visible"
                >
                    <ServiceCategoryCard
                        icon={category.icon}
                        name={name}
                        style={style}
                        onClick={() => handleCategorySelect(category._id)}
                    />
                </SwiperSlide>
            );
        });

        if (hasMoreCategories) {
            slides.push(
                <SwiperSlide
                    key="service-category-see-more"
                    className="!h-auto !overflow-visible"
                >
                    <ServiceCategoryCard
                        name={placeholders.show_more}
                        style={SERVICE_MORE_STYLE}
                        showStyleIcon
                        onClick={() => setIsCategoriesModalOpen(true)}
                    />
                </SwiperSlide>,
            );
        }

        return slides;
    }, [
        visibleCategories,
        currentLanguage,
        handleCategorySelect,
        hasMoreCategories,
        info_messages.see_more_categories,
        isLoadingCategories,
    ]);

    if (!isLoadingCategories && categoryList.length === 0) {
        return null;
    }

    return (
        <section className="mt-6 sm:mt-8">
            <h2 className="text-[18px] font-semibold text-[#001907]">
                {info_messages.services_categories}
            </h2>

            <div className="mt-4 w-full">
                <Swiper
                    modules={[FreeMode]}
                    className="service-category-swiper w-full"
                    spaceBetween={12}
                    slidesPerView={2.2}
                    freeMode={{ enabled: true, momentum: true }}
                    grabCursor
                    touchStartPreventDefault={false}
                    observer
                    observeParents
                    watchOverflow={false}
                    breakpoints={SERVICE_SWIPER_BREAKPOINTS}
                >
                    {swiperSlides}
                </Swiper>
            </div>

            <AllCategoriesModal
                open={isCategoriesModalOpen}
                setOpen={setIsCategoriesModalOpen}
                title={info_messages.services_categories}
                categories={categoryList}
                themes={SERVICE_CATEGORY_STYLES}
                onSelect={handleCategorySelect}
            />
        </section>
    );
}
