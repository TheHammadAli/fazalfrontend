"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
    Laptop,
    MoreHorizontal,
    Shirt,
    Smartphone,
    type LucideIcon,
} from "lucide-react";
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

type CategoryItem = {
    _id: string;
    name?: string | { en?: string; ur?: string };
    icon?: string;
    productsCount?: number;
    listingsCount?: number;
};

type CategoryTheme = {
    bgClass: string;
    iconColor: string;
    Icon: LucideIcon;
};

const INITIAL_CATEGORY_COUNT = 5;

const CATEGORY_STYLES: CategoryTheme[] = [
    { bgClass: "bg-[#EAF1FB]", iconColor: "#3A46FF", Icon: Smartphone },
    { bgClass: "bg-[#FEECEC]", iconColor: "#E92440", Icon: Laptop },
    { bgClass: "bg-[#DFF4F4]", iconColor: "#007781", Icon: Shirt },
];

function getCategoryTheme(index: number): CategoryTheme {
    return CATEGORY_STYLES[index % CATEGORY_STYLES.length];
}

const CATEGORY_SWIPER_BREAKPOINTS = {
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

const MORE_THEME: CategoryTheme = {
    bgClass: "bg-[#EEF2F3]",
    iconColor: "#4B514F",
    Icon: MoreHorizontal,
};

function getCategoryListingsCount(category: CategoryItem): number | null {
    const count = category.productsCount ?? category.listingsCount;
    return typeof count === "number" && count >= 0 ? count : null;
}

function CategoryCardSkeleton() {
    return (
        <div className="h-full w-full rounded-[12px] border border-[#E5E5E5] bg-white p-3">
            <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-[8px] bg-gray-200" />
                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="h-3.5 w-16 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                </div>
            </div>
        </div>
    );
}

type CategoryCardProps = {
    name: string;
    theme: CategoryTheme;
    onClick: () => void;
    subtitle?: number | string;
    icon?: string;
    showThemeIcon?: boolean;
};

function hasCategoryIcon(icon?: string): boolean {
    return typeof icon === "string" && icon.trim().length > 0;
}

function CategoryCard({
    name,
    subtitle,
    theme,
    onClick,
    icon,
    showThemeIcon = false,
}: CategoryCardProps) {
    const { Icon, bgClass, iconColor } = theme;
    const { info_messages } = useDictionary();

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
            className="w-full cursor-pointer rounded-[16px] border border-[#E5E5E5] bg-white p-2.5 text-left transition-colors hover:border-[#C9D1D3]"
        >
            <div className="flex items-center gap-2.5">
                <div
                    className={`flex h-15 w-15 shrink-0 items-center justify-center rounded-[14px] ${bgClass}`}
                >
                    {hasCategoryIcon(icon) ? (
                        <Image
                            src={icon}
                            alt={name}
                            width={26}
                            height={26}
                            unoptimized
                            className="h-[26px] w-[26px] min-h-[26px] min-w-[26px] object-contain"
                        />
                    ) : showThemeIcon ? (
                        <Icon
                            className="h-[26px] w-[26px]"
                            style={{ color: iconColor }}
                            strokeWidth={1.75}
                        />
                    ) : (
                        <Image
                            src={noImageIcon}
                            alt={name}
                            width={26}
                            height={26}
                            className="h-[26px] w-[26px] min-h-[26px] min-w-[26px] object-contain"
                        />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate-safe w-full min-w-0 text-[14px] font-semibold text-[#333333] rtl:text-right">
                        {name}
                    </p>
                    <p className=" text-[13px] font-normal leading-[1.6] py-0.5 text-[#333333] rtl:text-right">
                        {subtitle != null
                            ? typeof subtitle === "number"
                                ? `${subtitle.toLocaleString()} ${info_messages.listings}`
                                : subtitle
                            : null}
                    </p>
                </div>
            </div>
        </div>
    );
}

function ProductCategories() {
    const router = useRouter();
    const { info_messages, placeholders, currentLanguage } = useDictionary();
    const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
    const {
        data: categories,
        isLoading,
        isFetching,
    } = useCategoriesQuery({ type: "product" });

    const isLoadingCategories = isLoading || isFetching;
    const categoryList = useMemo(
        () => (categories?.data ?? []) as CategoryItem[],
        [categories?.data],
    );
    const visibleCategories = useMemo(
        () => categoryList.slice(0, INITIAL_CATEGORY_COUNT),
        [categoryList],
    );
    const hasMoreCategories = categoryList.length > INITIAL_CATEGORY_COUNT;

    const handleCategorySelect = useCallback(
        (categoryId: string) => {
            const params = new URLSearchParams({ tab: "products", categoryId });
            router.push(`/home/search-list?${params.toString()}`);
        },
        [router],
    );

    const swiperSlides = useMemo(() => {
        if (isLoadingCategories) {
            return Array.from({ length: INITIAL_CATEGORY_COUNT + 1 }).map((_, index) => (
                <SwiperSlide key={`category-skeleton-${index}`} className="!h-auto !overflow-visible">
                    <CategoryCardSkeleton />
                </SwiperSlide>
            ));
        }

        const slides = visibleCategories.map((category, index) => {
            const theme = getCategoryTheme(index);
            const listingsCount = getCategoryListingsCount(category);

            return (
                <SwiperSlide key={category._id} className="!h-auto !overflow-visible">
                    <CategoryCard
                        name={getFeedCategoryLabel(category.name, currentLanguage)}
                        //subtitle={listingsCount ?? info_messages.explore_more}
                        theme={theme}
                        icon={category.icon}
                        onClick={() => handleCategorySelect(category._id)}
                    />
                </SwiperSlide>
            );
        });

        if (hasMoreCategories) {
            slides.push(
                <SwiperSlide key="category-see-more" className="!h-auto !overflow-visible">
                    <CategoryCard
                        name={placeholders.show_more}
                        theme={MORE_THEME}
                        subtitle={info_messages.explore_more}
                        showThemeIcon
                        onClick={() => setIsCategoriesModalOpen(true)}
                    />
                </SwiperSlide>,
            );
        }

        return slides;
    }, [
        currentLanguage,
        handleCategorySelect,
        hasMoreCategories,
        info_messages.explore_more,
        placeholders.show_more,
        isLoadingCategories,
        visibleCategories,
    ]);

    if (!isLoadingCategories && categoryList.length === 0) {
        return null;
    }

    return (
        <section className="mt-6 sm:mt-8">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-[18px] font-semibold text-[#001907] ">
                    {info_messages.product_categories}
                </h2>
            </div>

            <div className="mt-4 w-full">
                <Swiper
                    modules={[FreeMode]}
                    className="category-swiper w-full"
                    spaceBetween={12}
                    slidesPerView={1.5}
                    freeMode={{ enabled: true, momentum: true }}
                    grabCursor
                    touchStartPreventDefault={false}
                    observer
                    observeParents
                    watchOverflow={false}
                    breakpoints={CATEGORY_SWIPER_BREAKPOINTS}
                >
                    {swiperSlides}
                </Swiper>
            </div>

            <AllCategoriesModal
                open={isCategoriesModalOpen}
                setOpen={setIsCategoriesModalOpen}
                title={info_messages.product_categories}
                categories={categoryList}
                themes={CATEGORY_STYLES}
                onSelect={handleCategorySelect}
            />
        </section>
    );
}

export default ProductCategories;
