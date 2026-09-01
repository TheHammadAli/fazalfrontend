"use client";

import Image from "next/image";
import MobileTabsImage from "@/assets/icons/mobile-tabs.svg";
import GoogleStoreBadge from "@/assets/icons/google-store.svg";
import AppleStoreBadge from "@/assets/icons/apple-store.svg";
import shoppingBagIcon from "@/assets/icons/total-shops.svg";
import broadcastIcon from "@/assets/icons/broadcast.svg";
import shopIcon from "@/assets/icons/view-shop-icon.svg";
import { useDictionary } from "@/dictionaries/DictionaryProvider";

function DownloadAppBanner() {
    const { info_messages } = useDictionary();

    const features = [
        {
            icon: shoppingBagIcon,
            label: info_messages.find_local_buyers_sellers,
        },
        {
            icon: broadcastIcon,
            label: info_messages.broadcast_in_your_area,
        },
        {
            icon: shopIcon,
            label: info_messages.explore_trusted_services,
        },
    ];

    return (
        <section className="mt-8 overflow-hidden rounded-[16px] bg-[#f2f8f8] sm:mt-14 sm:rounded-[24px]">
            <div className="flex flex-col sm:flex-row 2xl:justify-center  h-full pt-5 sm:pt-0 gap-5 px-5  md:gap-8 md:px-8 lg:gap-12 lg:px-12 xl:gap-16 xl:px-16 2xl:px-20 2xl:gap-20">
                <div className="min-h-max flex items-center justify-center sm:block sm:mt-6 lg:mt-8">
                    <Image
                        src={MobileTabsImage}
                        alt=""
                        unoptimized
                        className="object-contain sm:object-bottom lg:min-w-[320px] xl:min-w-[405px]  2xl:min-w-[500px] h-full  "
                    />
                </div>

                <div className="flex min-w-0 w-full flex-col py-5 text-center sm:max-w-[52%] sm:ml-3 lg:ml-6   sm:text-left rtl:sm:text-right 2xl:w-max  ">
                    <h2 className="text-[32px] font-black leading-tight text-black 2xl:text-[40px]">
                        {info_messages.buy_sell_and_connect}
                    </h2>
                    <h2 className="text-[32px] font-black leading-tight text-green-1 2xl:text-[40px]">
                        {info_messages.on_the_go}
                    </h2>

                    <ul className="mt-5 flex flex-col items-center gap-3 sm:items-start">
                        {features.map((feature) => (
                            <li
                                key={feature.label}
                                className="flex min-w-[280px] items-center gap-1.5  sm:gap-3 sm:w-full sm:max-w-none sm:justify-start"
                            >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-green-1 2xl:h-12 2xl:w-12">
                                    <Image
                                        src={feature.icon}
                                        alt=""
                                        width={16}
                                        height={16}
                                        unoptimized
                                        className="h-4 w-4 brightness-0 invert 2xl:h-8 2xl:w-8"
                                    />
                                </span>
                                <span className="text-center text-[12px] font-normal leading-snug text-black sm:text-start 2xl:text-[16px]">
                                    {feature.label}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <span

                        className="mt-4 text-[15px] font-medium text-green-1 hover:underline sm:self-start 2xl:text-[16px]"
                    >
                        {info_messages.download_fazl_app_now}
                    </span>

                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start rtl:sm:justify-end 2xl:gap-4">
                        <a
                            href="#"
                            aria-label={info_messages.download_on_google_play}
                            className="inline-flex shrink-0 transition-opacity hover:opacity-90"
                        >
                            <Image
                                src={GoogleStoreBadge}
                                alt={info_messages.download_on_google_play}
                                width={910}
                                height={270}
                                unoptimized
                                className="h-[42px] w-[140px] lg:h-[54px] xl:w-[182px] 2xl:h-[58px] 2xl:w-[196px]"
                            />
                        </a>
                        <a
                            href="#"
                            aria-label={info_messages.download_on_app_store}
                            className="inline-flex shrink-0 transition-opacity hover:opacity-90"
                        >
                            <Image
                                src={AppleStoreBadge}
                                alt={info_messages.download_on_app_store}
                                width={910}
                                height={270}
                                unoptimized
                                className="h-[54px] w-[140px] xl:w-[182px] 2xl:h-[58px] 2xl:w-[196px]"
                            />
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default DownloadAppBanner;
