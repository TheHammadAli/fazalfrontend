"use client";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import React from "react";
import Image from "next/image";
import filterIcon from "@/assets/icons/filter-icon.svg";
import { useGetShopDetailQuery, useGetShopProductsQuery } from "@/store/services/sellingService";
import noImageAvtar from "@/assets/images/no-image-av.png";
import ratingIcons from "@/assets/icons/rating-icons.svg";
import { useSearchParams } from "next/navigation";
import ProductSkeleton from "./ProductsSkelton";
import { useRouter } from "next/navigation";
import { getUserId } from "@/utils/getUserId";
import { AvgRatingStars } from "../Ui/Reviews";
import { formatPrice } from "@/utils/formatPrice";

function resolveEntityId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as { id?: string; _id?: string };
    return record.id ?? record._id ?? null;
  }
  return null;
}

interface productTypes {
  id: string;
  title: string;
  images: string[];
  price: number | string;
  averageRating: number;
  reviewCount: number;
}

function ShopProductsList() {
  const router = useRouter();
  const { placeholders, error_messages } = useDictionary();
  const id = useSearchParams().get("id");
  const userId = getUserId() ?? "";
  const { data: shop } = useGetShopDetailQuery(id, { skip: !id });
  const shopOwnerId = resolveEntityId(shop?.data?.ownerId);
  const isShopOwner = Boolean(userId && shopOwnerId && userId === shopOwnerId);
  const {
    data: products,
    isLoading: isProductsLoading,
    isFetching: isProductsFetching,
  } = useGetShopProductsQuery(id, { skip: !id });

  const loading = isProductsLoading || isProductsFetching;
  return (
    <div className="sm:px-2">
      <div className="flex justify-between items-center md:px-3.5 mt-4">
        <div>
          <h1 className="text-black-1 font-medium text-[16px]">
            {placeholders.total}
          </h1>
          {isProductsLoading || isProductsFetching ? (
            <div className="h-[14px] rounded-full w-[50px] bg-gray-200 animate-pulses"></div>
          ) : (
            <h4 className="text-[14px] text-gray-8">
              {products?.data.length ?? 0}{" "}
              {products?.data.length > 1
                ? placeholders.products
                : placeholders.product}
            </h4>
          )}
        </div>
        {/* <div className="px-[12px] h-[38px] text-[14px] rounded-full border-[1px] border-gray-9 flex items-center gap-2">
          <Image src={filterIcon} alt="filter_icon" />
          {placeholders.filter}
        </div> */}
      </div>

      {/* listing  */}
      {!loading && products?.data?.length > 0 && (
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-2 md:gap-5 mt-4">
          {products?.data?.map((product: productTypes, index: number) => {
            return (
              <div
                key={index}
                className=" cursor-pointer"
                onClick={() =>
                  isShopOwner
                    ? router.push(`/selling/product-detail?id=${product?.id}`)
                    : router.push(`/buy-product?id=${product?.id}`)
                }
              >
                <div className="h-[180px] sm:h-[230px] rounded-[16px] overflow-hidden">
                  <Image
                    src={product?.images?.[0] ?? noImageAvtar}
                    alt={"product_img"}
                    height={100}
                    width={100}
                    unoptimized
                    className="h-full w-full object-cover bg-gray-12"
                  />
                </div>
                <h2 className="text-black-1 font-medium text-[16px] mt-3 line-clamp-1 first-letter:capitalize ">
                  {product?.title}{" "}
                </h2>
                {/* <div className="flex gap-2">
                  <Image src={ratingIcons} alt="rating_icon" />
                  <span className="text-gray-8 text-[14px] font-normal">
                    (8)
                  </span>
                </div> */}
                {/* <div className="flex gap-2">
                  <AvgRatingStars
                    rating={product?.averageRating}
                    isLoading={false}
                    size={22}
                  />
                  <span className="text-gray-8 text-[14px] font-normal">
                    ({product?.reviewCount ?? 0})
                  </span>
                </div> */}
                <h2 className="text-green-1 font-normal text-[16px]  ">
                  {placeholders.Rs} {formatPrice(product?.price)}
                </h2>
              </div>
            );
          })}
        </div>
      )}
      {!loading && products?.data?.length === 0 && (
        <div className="flex h-[30vh] w-full items-center justify-center text-black-1">
          {error_messages.no_product_data}
        </div>
      )}
      {loading && <ProductSkeleton />}
    </div>
  );
}

export default ShopProductsList;
