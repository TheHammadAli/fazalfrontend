"use client";
import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import tickIcon from "@/assets/icons/tick-circle.svg";
import listAnotherImage from "@/assets/icons/list-another-icon.svg";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import noImageAvtar from "@/assets/images/no-image-av.png";
import { formatPrice } from "@/utils/formatPrice";

interface Props {
  setStatus: (val: string) => void;
  createdData?: {
    id?: string;
    title?: string;
    price?: string | number;
    images?: string[];
  };
}

function ProductListed({ setStatus, createdData }: Props) {
  const id = useSearchParams().get("id") as string;
  const type = useSearchParams().get("type") as string;
  const router = useRouter();
  const { info_messages, placeholders, currentLanguage } = useDictionary();
  const isUrdu = currentLanguage === "ur";

  const productImage = createdData?.images?.[0] || noImageAvtar;
  const productTitle = createdData?.title || "";
  const productPrice =
    createdData?.price != null && createdData.price !== ""
      ? `Rs ${formatPrice(createdData.price)}`
      : "";

  return (
    <div
      className="flex w-full flex-col"
      dir={isUrdu ? "rtl" : "ltr"}
    >
      <div className="mx-auto mt-4 flex w-full max-w-[422px] flex-col items-center px-4 pb-10 sm:px-0">
        <div className="relative flex h-max w-full items-center justify-center overflow-hidden rounded-[16px] bg-[#E6FBFB] px-3 py-8 sm:px-5">
          <Image
            src={listAnotherImage}
            alt=""
            className="pointer-events-none absolute start-2 top-1/2 h-[48px] sm:h-[80px] w-auto -translate-y-1/2 sm:start-8"
            priority
          />
          <Image
            src={listAnotherImage}
            alt=""
            className="pointer-events-none absolute end-2 top-1/2 h-[48px] sm:h-[80px] w-auto -translate-y-1/2 rotate-180 sm:end-8"
            priority
          />

          <div className="relative z-[1] w-[209px] overflow-hidden rounded-[18px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <div className="relative h-[226px] w-full overflow-hidden rounded-t-[18px] bg-gray-5">
              <Image
                src={productImage}
                alt={productTitle || "product"}
                fill
                className="object-cover"
                priority
                unoptimized={typeof productImage === "string"}
              />
            </div>
            <div className="px-4 py-3">
              <h2 className="truncate text-[15px] font-semibold leading-tight text-black-1 ltr:text-left rtl:text-right">
                {productTitle}
              </h2>
              {productPrice && (
                <p className="mt-1 text-[14px] font-medium text-green-1 ltr:text-left rtl:text-right">
                  {productPrice}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex w-full flex-col items-center">
          <Image src={tickIcon} alt="tick-icon" className="rounded-full" />
          <h1 className="mt-3 text-center text-[22px] font-medium text-black-1">
            {info_messages.product_listed}
          </h1>
          <h3 className="max-w-[310px] text-center text-[14px] font-normal text-gray-8">
            {info_messages.most_listings}
          </h3>
        </div>

        <div className="w-full">
          <button
            type="button"
            onClick={() => {
              setStatus("form");
              window.location.reload();
            }}
            className="mt-6 h-[50px] w-full cursor-pointer rounded-[12px] border border-green-1 text-[16px] font-medium text-green-1 hover:bg-green-1 hover:text-white"
          >
            {placeholders.list_another}
          </button>

          <div className="mt-6 flex w-full justify-center text-center text-[16px] font-medium text-green-1">
            <button
              type="button"
              className="w-max cursor-pointer hover:underline"
              onClick={() => {
                if (type && type === "personal") {
                  router.push("/selling");
                } else {
                  router.push(`/selling/shop-detail?id=${id}`);
                }
              }}
            >
              {placeholders.later}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductListed;
