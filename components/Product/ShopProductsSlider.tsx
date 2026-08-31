"use client";

import React, { useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import noImageAvtar from "@/assets/images/no-image-av.png";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { useGetShopProductsQuery } from "@/store/services/sellingService";
import "swiper/css";

const SWIPE_CLICK_SUPPRESS_MS = 120;

const CATALOG_SWIPER_BREAKPOINTS = {
  0: {
    slidesPerView: 1.35,
    spaceBetween: 8,
  },
  640: {
    slidesPerView: 2,
    spaceBetween: 12,
    slidesOffsetBefore: 0,
    slidesOffsetAfter: 0,
  },
  1024: {
    slidesPerView: 3,
    spaceBetween: 20,
    slidesOffsetBefore: 0,
    slidesOffsetAfter: 0,
    freeMode: false,
  },
  1280: {
    slidesPerView: 4,
    spaceBetween: 20,
    slidesOffsetBefore: 0,
    slidesOffsetAfter: 0,
    freeMode: false,
  },
};

type ShopProduct = {
  id: string;
  _id?: string;
  title: string;
  price: string | number;
  images: string[];
};

type ShopProductsSliderProps = {
  shopId: string;
  currentProductId?: string;
  shopTitle?: string;
};

function CatalogCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[16px] border border-gray-9 bg-white p-2">
      <div className="h-[180px] w-full rounded-[12px] bg-gray-200 sm:h-[276px]" />
      <div className="mt-3 h-4 w-2/3 rounded bg-gray-200" />
      <div className="mt-3 h-4 w-16 rounded bg-gray-200" />
    </div>
  );
}

export default function ShopProductsSlider({
  shopId,
  currentProductId,
  shopTitle,
}: ShopProductsSliderProps) {
  const router = useRouter();
  const { placeholders, info_messages } = useDictionary();
  const isSwipingRef = useRef(false);
  const swipeResetTimeoutRef = useRef<number | null>(null);

  const {
    data: products,
    isLoading,
    isFetching,
  } = useGetShopProductsQuery(shopId, { skip: !shopId });

  const loading = isLoading || isFetching;

  const items = useMemo(() => {
    const list = (products?.data ?? []) as ShopProduct[];
    if (!currentProductId) return list;
    return list.filter(
      (item) => (item.id || item._id) !== currentProductId,
    );
  }, [products?.data, currentProductId]);

  const clearSwipeResetTimeout = useCallback(() => {
    if (swipeResetTimeoutRef.current != null) {
      window.clearTimeout(swipeResetTimeoutRef.current);
      swipeResetTimeoutRef.current = null;
    }
  }, []);

  const handleSwiperTouchStart = useCallback(() => {
    clearSwipeResetTimeout();
    isSwipingRef.current = false;
  }, [clearSwipeResetTimeout]);

  const handleSwiperSliderMove = useCallback(() => {
    isSwipingRef.current = true;
  }, []);

  const handleSwiperTouchEnd = useCallback(() => {
    clearSwipeResetTimeout();
    swipeResetTimeoutRef.current = window.setTimeout(() => {
      isSwipingRef.current = false;
      swipeResetTimeoutRef.current = null;
    }, SWIPE_CLICK_SUPPRESS_MS);
  }, [clearSwipeResetTimeout]);

  const shouldSuppressClick = useCallback(() => isSwipingRef.current, []);

  const handleSelectItem = useCallback(
    (itemId: string) => {
      router.push(`/buy-product?id=${itemId}`);
    },
    [router],
  );

  if (!shopId) return null;
  if (!loading && items.length === 0) return null;

  const sectionTitle = shopTitle
    ? `${placeholders.more_from} ${shopTitle}`
    : placeholders.more_from_this_shop;

  return (
    <section className="mt-8 w-full">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[18px] font-medium text-[#001907]">
          {sectionTitle}
        </h2>
        <button
          type="button"
          onClick={() => router.push(`/selling/shop-detail?id=${shopId}`)}
          className="cursor-pointer text-[14px] font-normal text-green-1 hover:underline"
        >
          {info_messages.see_all}
        </button>
      </div>

      <div className="mt-4 w-full">
        <Swiper
          modules={[FreeMode]}
          className="catalog-swiper w-full bg-none"
          spaceBetween={8}
          slidesPerView={1.35}
          freeMode={{ enabled: true, momentum: true }}
          grabCursor
          touchStartPreventDefault={false}
          observer
          observeParents
          watchOverflow={false}
          breakpoints={CATALOG_SWIPER_BREAKPOINTS}
          onTouchStart={handleSwiperTouchStart}
          onSliderMove={handleSwiperSliderMove}
          onTouchEnd={handleSwiperTouchEnd}
          onTransitionEnd={handleSwiperTouchEnd}
          preventClicks
          preventClicksPropagation
        >
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <SwiperSlide
                  key={`shop-product-skeleton-${index}`}
                  className="!h-auto"
                >
                  <CatalogCardSkeleton />
                </SwiperSlide>
              ))
            : items.map((item) => {
                const itemId = item.id || item._id || "";
                return (
                  <SwiperSlide key={itemId} className="!h-auto bg-none">
                    <div
                      role="button"
                      tabIndex={0}
                      className="group h-full w-full cursor-pointer rounded-[16px] border border-gray-9 bg-white p-2 transition-all duration-200 ease-out hover:-translate-y-1 hover:border-green-3 hover:shadow-menu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-1"
                      onClick={() => {
                        if (shouldSuppressClick() || !itemId) return;
                        handleSelectItem(itemId);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          if (itemId) handleSelectItem(itemId);
                        }
                      }}
                    >
                      <div className="h-[180px] overflow-hidden rounded-[12px] sm:h-[276px]">
                        <Image
                          src={
                            item.images?.length > 0
                              ? item.images[0]
                              : noImageAvtar
                          }
                          alt={item.title || "product"}
                          height={100}
                          width={100}
                          draggable={false}
                          className="pointer-events-none h-full w-full select-none bg-gray-12 object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                          unoptimized
                        />
                      </div>
                      <h2 className="mt-3 text-[16px] font-normal text-green-1">
                        {placeholders.Rs} {item.price}
                      </h2>
                      <h2 className="line-clamp-1 text-[16px] font-medium text-black-1 transition-colors first-letter:capitalize group-hover:text-green-1">
                        {item.title}
                      </h2>
                    </div>
                  </SwiperSlide>
                );
              })}
        </Swiper>
      </div>
    </section>
  );
}
