"use client";

import Image, { type StaticImageData } from "next/image";
import FindProdBannerBg from "@/assets/icons/find_prod_bg.svg";
import SectionImage from "@/assets/icons/home-page-banner-sec.svg";
import { useDictionary } from "@/dictionaries/DictionaryProvider";

function getAssetSrc(asset: string | StaticImageData): string {
    return typeof asset === "string" ? asset : asset.src;
}

function FindProdBanner() {
    const { info_messages } = useDictionary();

    return (
        <div className="relative mt-4 hidden sm:block  overflow-hidden rounded-[24px] bg-green-1 sm:mt-6  sm:rounded-[24px]">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0  "
                style={{ backgroundImage: `url(${getAssetSrc(FindProdBannerBg)})` }}
            />

            <div className="relative z-10 flex  flex-col items-center gap-3 px-3  sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8  py-4 sm:py-0">
                <div className="min-w-0 w-full sm:min-w-0 sm:flex-1">
                    <h2 className="truncate text-[15px] font-semibold rtl:text-right text-center sm:text-left  text-white sm:text-[15px] md:text-[20px] lg:text-[20px] xl:text-[28px] 2xl:text-[34px] leading-tight">
                        {info_messages.find_products_services} {info_messages.near_you}
                    </h2>
                    <p className="mt-1.5 text-[13px] rtl:text-right font-normal text-center sm:text-left leadi text-white sm:mt-2 sm:text-[18px]">
                        {info_messages.buy_sell_connect_local}
                    </p>
                </div>

                <div className=" h-[160px] sm:h-[228px] w-full sm:w-[250px] lg:w-[300px] xl:w-[368px]   relative">
                    <Image
                        src={SectionImage}
                        alt=""
                        fill
                        unoptimized
                        className=" h-full w-full "
                    />
                </div>
            </div>
        </div>
    );
}

export default FindProdBanner;
