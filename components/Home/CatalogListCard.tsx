"use client";

import Image from "next/image";
import noImageAvtar from "@/assets/images/no-image-av.png";
import {
  getFeedCategoryLabel,
  type ReelCategory,
} from "@/utils/getFeedCategoryLabel";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { formatPrice } from "@/utils/formatPrice";

export type CatalogCategory = ReelCategory & {
  parent?: ReelCategory;
};

export type CatalogListCardItem = {
  id?: string;
  _id?: string;
  title: string;
  price: string | number;
  images: string[];
  description?: string;
  category?: CatalogCategory;
};

type CatalogListCardProps = {
  item: CatalogListCardItem;
  buttonLabel: string;
  currencyLabel: string;
  currentLanguage: string;
  onButtonClick: () => void;
};

export function CatalogListCardSkeleton() {
  return (
    <div className="mt-4 flex flex-col gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse flex-row items-center gap-2 rounded-[18px] border border-[#E5E5E5] bg-white py-2 pl-2 pr-7 rtl:pl-7 rtl:pr-2 sm:gap-4"
        >
          <div className="h-[88px] w-[88px] shrink-0 rounded-[12px] bg-gray-200 sm:h-[174px] sm:w-[174px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-16 rounded bg-gray-200" />
            <div className="h-3 w-24 rounded bg-gray-200 sm:h-4 sm:w-32" />
            <div className="hidden h-4 w-full rounded bg-gray-200 sm:block" />
          </div>
          <div className="h-[34px] w-[90px] shrink-0 rounded-lg bg-gray-200 sm:w-[142px]" />
        </div>
      ))}
    </div>
  );
}

export default function CatalogListCard({
  item,
  buttonLabel,
  currencyLabel,
  currentLanguage,
  onButtonClick,
}: CatalogListCardProps) {
  const { placeholders } = useDictionary()
  const imageCount = item?.images?.length ?? 0;
  const categoryLabel = getFeedCategoryLabel(item?.category, currentLanguage);
  const parentCategoryLabel = getFeedCategoryLabel(
    item?.category?.parent,
    currentLanguage,
  );

  return (
    <div className="flex flex-row items-center gap-2 rounded-[18px] border border-[#E5E5E5] bg-white py-2 pl-2 pr-2 rtl:pl2 md:pr-7 md:rtl:pl-7 rtl:pr-2 sm:gap-4">
      <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[12px] sm:h-[174px] sm:w-[174px]">
        <Image
          src={imageCount > 0 ? item.images[0] : noImageAvtar}
          alt="product_img"
          height={174}
          width={174}
          className="h-full w-full object-cover bg-gray-12"
          unoptimized
        />
        {imageCount > 1 ? (
          <div className="absolute bottom-1.5 ltr:left-1.5 rtl:right-1.5 rounded-md bg-[#2C2C2C]/80 px-1.5 py-0.5 text-[10px] font-normal text-white sm:bottom-2 sm:ltr:left-2 sm:rtl:right-2 sm:px-2 sm:text-[12px]">
            1/{imageCount}
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-1">
        {categoryLabel ? (
          <p className="text-[11px] font-normal text-gray-8 line-clamp-1 sm:text-[12px]">
            {categoryLabel}
          </p>
        ) : null}
        <h2 className="text-black-1 text-[13px] font-semibold line-clamp-1 first-letter:capitalize sm:text-[16px]">
          {item?.title}
        </h2>
        {item?.price && Number(item?.price) > 0 ? <p className="text-green-1 text-[15px] font-medium sm:text-[18px]">
          {currencyLabel} {formatPrice(item?.price)}
        </p> : <p className="text-green-1 text-[15px] font-medium sm:text-[18px]">{placeholders.call_for_price}</p>}
        {parentCategoryLabel ? (
          <p className="text-[12px] font-normal text-black-1 line-clamp-1 sm:hidden">
            {parentCategoryLabel}
          </p>
        ) : null}
        {item?.description ? (
          <p className="max-sm:hidden text-[14px] font-normal text-gray-8 line-clamp-1">
            {item.description}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onButtonClick}
        className="h-[34px] w-[90px] shrink-0 cursor-pointer rounded-lg border border-[1px] border-green-1 text-[12px] font-normal text-green-1 transition-colors hover:bg-green-3 sm:w-[142px] sm:text-[14px]"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
