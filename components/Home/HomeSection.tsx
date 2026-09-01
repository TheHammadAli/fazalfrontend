"use client";
import React, { useMemo, useRef, useState } from "react";
import searchIcon from "@/assets/icons/searchIcon.svg";
import Image from "next/image";
import Tabs from "../Ui/Tabs";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { useClickOutside } from "@/custom-hooks/useClickOutside";
import { useRouter } from "next/navigation";
import {
  useSearchProductsQuery,
  useSearchServicesQuery,
} from "@/store/services/homeService";
import linkIcon from "@/assets/icons/link.png";
import broadcastServiceIcon from "@/assets/icons/broadcast_service.svg";
import postAnAdIcon from "@/assets/icons/post_an_ad.svg";
import createShopIcon from "@/assets/icons/create_shop.svg";
import { useDebounce } from "use-debounce";
import BroadCastModal from "../Ui/BroadCastModal";
import Modal from "../Ui/Modals/Modal";
import AllProductsAndServices from "./AllProductsAndServices";
import { useCanInteractAsUser, useIsGuest } from "@/custom-hooks/useIsGuest";
import { useLogout } from "@/custom-hooks/useLogout";
import { getCatalogItemsFromSearchResponse } from "@/utils/catalogSearch";
import type { StaticImageData } from "next/image";
import FindProdBanner from "./FindProdBanner";
import DownloadAppBanner from "./DownloadAppBanner";
import HomeFooter from "./HomeFooter";
import ProductCategories from "./ProductCategories";
import ServicesCategories from "./ServicesCategories";
import RecentBroadCasts from "./RecentBroadCasts";
import { useCategoriesQuery } from "@/custom-hooks/useCategoriesQuery";
import { getFeedCategoryLabel } from "@/utils/getFeedCategoryLabel";
import DoodleButton from "../Ui/DoodleButton";
import locationGrayIcon from "@/assets/icons/location-gray.svg";
import chevronRightIcon from "@/assets/icons/chevron-right-icon.svg";
import { useAppSelector } from "@/store/store";
import { useGetUserDetailQuery } from "@/store/services/profileService";

type HomeActionCardProps = {
  bgClass: string;
  icon: StaticImageData;
  title: string;
  description: string;
  buttonLabel: string;
  buttonClass: string;
  onClick: () => void;
  className?: string;
  /** Mobile-only layout: featured tall card vs compact chevron row */
  mobileVariant?: "featured" | "compact";
};

function renderDescription(text: string) {
  return text.split("\n").map((line, index) => (
    <span key={index} className="block">
      {line}
    </span>
  ));
}

function HomeActionCard({
  bgClass,
  icon,
  title,
  description,
  buttonLabel,
  buttonClass,
  onClick,
  className = "",
  mobileVariant = "compact",
}: HomeActionCardProps) {
  return (
    <div className={`h-full ${className}`}>
      {/* Mobile: featured tall card (Broadcast) */}
      {mobileVariant === "featured" ? (
        <div
          className={`flex h-full flex-col gap-[14px] justify-between rounded-[16px] py-[12px] px-[12px] sm:hidden ${bgClass}`}
        >
          <div className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-full bg-white">
            <Image src={icon} alt="" className="max-h-[70%] max-w-[70%]" />
          </div>
          <p className=" flex-1 text-[14px] font-medium leading-snug text-[#001907]">
            {renderDescription(description)}
          </p>
          <button
            type="button"
            onClick={onClick}
            className=" flex h-[40px] w-full cursor-pointer items-center justify-center rounded-[8px] bg-white text-[13px] font-semibold text-[#001907]"
          >
            {buttonLabel}
          </button>
        </div>
      ) : (
        /* Mobile: compact row with chevron */
        <button
          type="button"
          onClick={onClick}
          className={`h-full w-full items-center space-y-[14px] rounded-[16px] px-[12px] py-[12px] text-start sm:hidden ${bgClass}`}
        >
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-white">
            <Image src={icon} alt="" className="max-h-[70%] max-w-[70%] h-[18px] w-[18px]" />
          </div>
          <div className="flex items-center justify-between w-full">
            <h3 className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-[#001907]">
              {title}
            </h3>
            <Image
              src={chevronRightIcon}
              alt=""
              aria-hidden
              className="h-3.5 w-2.5 shrink-0 rtl:rotate-180"
            />
          </div>

        </button>
      )}

      {/* sm+: full card with description + CTA */}
      <div
        className={`hidden h-full w-full flex-col rounded-[16px] p-2.5 sm:flex sm:p-3 lg:p-4 ${bgClass}`}
      >
        <div className="flex items-start gap-2 sm:gap-2.5 lg:gap-3">
          <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-white sm:h-[52px] sm:w-[52px] lg:h-[62px] lg:w-[62px]">
            <Image
              src={icon}
              alt=""
              className="max-h-[70%] max-w-[70%] lg:max-h-none lg:max-w-none"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold leading-snug text-[#001907]">
              {title}
            </h3>
            <p className="mt-1 text-[14px] font-normal leading-snug text-[#001907]">
              {renderDescription(description)}
            </p>
          </div>
        </div>
        <DoodleButton
          type="button"
          onClick={onClick}
          className={`mt-auto flex h-[36px] w-full cursor-pointer items-center justify-center rounded-[8px] px-3 text-center text-[13px] font-medium text-white sm:mt-3.5 lg:mt-4 lg:h-[40px] lg:px-4 ${buttonClass}`}
        >
          {buttonLabel}
        </DoodleButton>
      </div>
    </div>
  );
}

type ProductCategoryItem = {
  _id: string;
  name?: string | { en?: string; ur?: string };
};

const FEATURED_PRODUCT_CATEGORY_IDS = [
  "6a3bb9aa72c2912ed05247f2",
  "68b40b33401f4ee662f12a6d",
  "6a4bbc2da60825502cafe903"
] as const;

function UserLocationBadge({ locationName }: { locationName: string }) {
  return (
    <div className="flex h-[40px] min-w-0 flex-1 items-center gap-1.5 rounded-[8px] bg-[#EEF2F3] px-2.5 sm:h-[46px] sm:flex-none sm:w-[180px] sm:gap-2 sm:px-3">
      <Image
        src={locationGrayIcon}
        alt=""
        aria-hidden
        className="h-4 w-4 shrink-0 sm:h-5 sm:w-5"
      />
      <div className="min-w-0 flex-1 overflow-x-auto hide-scrollbar">
        <p className="whitespace-nowrap text-[13px] font-normal text-[#4B514F] sm:text-[14px]">
          {locationName}
        </p>
      </div>
    </div>
  );
}

function HomeSection() {
  const isGuest = useIsGuest();
  const isLoggedIn = useCanInteractAsUser();
  const signOut = useLogout();
  const { userId } = useAppSelector((state) => state.authReducer);
  const { data: profileData } = useGetUserDetailQuery(userId, {
    skip: !userId || isGuest,
  });
  const locationName = profileData?.data?.address?.trim() ?? "";
  const [openBroadcast, setOpenBroadcast] = useState(false);
  const broadcastRef = useRef<HTMLDivElement>(null);
  const tabsComponents: { [key: string]: React.ReactNode } = {
    products: <></>,
    services: <></>,
  };
  const [search, setSearch] = useState<string>("");
  const [debounceSearch] = useDebounce(search, 500);
  const router = useRouter();
  const catRef = useRef<HTMLDivElement>(null);
  const tabs = ["products", "services"];
  const [activeTab, setActiveTab] = useState<string>(tabs[0]);
  const { placeholders, info_messages, error_messages, currentLanguage } = useDictionary();
  const [openCat, setOpenCat] = useState(false);
  const { data: productsData, isLoading: isProductsLoading, isFetching: isProductsFetching } = useSearchProductsQuery(
    {
      // category: categoryId,
      name: debounceSearch,
    },
    {
      skip:
        //  !categoryId ||
        activeTab !== "products" ||
        !debounceSearch
    }
  );
  const { data: servicesData, isLoading: isServicesLoading, isFetching: isServicesFetching } = useSearchServicesQuery(
    {
      // category: categoryId,
      name: debounceSearch,
    },
    {
      skip:
        // !categoryId ||
        activeTab !== "services" || !debounceSearch
    }
  );
  const {
    data: categories,
  } = useCategoriesQuery({ type: "product" });

  const featuredProductCategories = useMemo(() => {
    const categoryList = (categories?.data ?? []) as ProductCategoryItem[];

    return FEATURED_PRODUCT_CATEGORY_IDS.map((categoryId) =>
      categoryList.find((category) => category._id === categoryId),
    ).filter((category): category is ProductCategoryItem => Boolean(category));
  }, [categories?.data]);

  useClickOutside(catRef, () => {
    setOpenCat(false);
  });
  const isSearchLoading =
    !!debounceSearch &&
    (activeTab === "products"
      ? isProductsLoading || isProductsFetching
      : isServicesLoading || isServicesFetching);

  return (
    <div className="p-4 pb-0 sm:p-5 sm:pb-0">
      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div
          className="relative min-w-0 w-full sm:flex-1"
          onClick={() => setOpenCat(true)}
        >
          <Image
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 sm:h-auto sm:w-auto"
            src={searchIcon}
            alt="search_icon"
          />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`${placeholders.search_for} ${placeholders?.[activeTab as keyof typeof placeholders]
              }`}
            className="h-[40px] w-full rounded-[8px] bg-[#EEF2F3] pl-8 text-[13px] font-normal text-[#727272] placeholder:text-[13px] placeholder:text-[#727272] focus:outline-0 sm:h-[46px] sm:text-[14px] sm:placeholder:text-[14px]"
          />
        </div>

        <div
          className={`flex w-full min-w-0 items-center gap-2 sm:contents ${isLoggedIn && locationName ? "justify-between" : "justify-end"
            }`}
        >
          {isLoggedIn && locationName ? (
            <UserLocationBadge locationName={locationName} />
          ) : null}
          {isGuest ? (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => router.push("/signin")}
                className="cursor-pointer text-[14px] font-semibold text-[#001907] underline sm:text-[15px]"
              >
                {placeholders.login}
              </button>
              <button
                type="button"
                onClick={() => router.push("/signup")}
                className="cursor-pointer text-[14px] font-semibold text-[#001907] underline sm:text-[15px]"
              >
                {placeholders.sign_up}
              </button>
            </div>
          ) : isLoggedIn ? (
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => router.push("/signin"));
              }}
              className="shrink-0 cursor-pointer text-[14px] font-semibold text-[#001907] underline sm:text-[15px]"
            >
              {placeholders.logout}
            </button>
          ) : null}
        </div>
      </div>
      <div ref={catRef}>
        {openCat && (
          <>
            <div className="pt-3">
              <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
              <div className="h-[1px] bg-[#E5E5E5] -mt-[0.5px]"></div>
            </div>

            <div className="max-h-[340px] overflow-scroll hide-scrollbar">
              {isSearchLoading ? (
                <div className="overflow-scroll hide-scrollbar">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`search-skeleton-${index}`}
                      className="px-[15px] h-[56px] flex justify-between items-center border-b-[1px] border-b-[#E5E5E5] animate-pulse"
                    >
                      <div className="h-4 w-3/5 rounded bg-gray-200" />
                      <div className="h-4 w-4 rounded bg-gray-200" />
                    </div>
                  ))}
                </div>
              ) : getCatalogItemsFromSearchResponse(
                activeTab === "products" ? productsData : servicesData,
              ).length > 0 ? (
                <div className=" overflow-scroll  hide-scrollbar">
                  {getCatalogItemsFromSearchResponse(
                    activeTab === "products" ? productsData : servicesData,
                  ).map((item: { title: string }, index: number) => (
                    <div
                      key={index}
                      onClick={() => {
                        const params = new URLSearchParams({
                          tab: activeTab,
                          search: item?.title,
                        });
                        router.push(`/home/search-list?${params.toString()}`);
                      }}
                      className="px-[15px] cursor-pointer h-[56px] flex justify-between items-center border-b-[1px] border-b-[#E5E5E5]"
                    >
                      <span>{item?.title}</span>
                      <Image src={linkIcon} alt="link" className="rtl:rotate-90" />
                    </div>
                  ))}
                </div>
              ) : debounceSearch ? (
                <div className="h-[410px] w-full flex items-center justify-center">
                  <h1 className="text-black-3 text-[16px] font-medium">
                    {activeTab === "products" ? error_messages.no_product_data : error_messages.no_service_data}
                  </h1>
                </div>
              ) : null}
              {/* <CategoriesList
              categoryId={categoryId}
              setCategoryId={setCategoryId}
            /> */}
            </div>
          </>
        )}
      </div>
      <FindProdBanner />



      {!isGuest && (
        <>
          <div className="mt-4 sm:mt-8 grid grid-cols-2 grid-rows-2 gap-2.5 sm:grid-cols-2 sm:grid-rows-none sm:gap-3 md:grid-cols-3 lg:gap-6">
            <HomeActionCard
              className="row-span-2 sm:row-span-1"
              mobileVariant="featured"
              bgClass="bg-[#DFF4F4]"
              icon={broadcastServiceIcon}
              title={info_messages.broadcast_request}
              description={info_messages.send_request_nearby}
              buttonLabel={info_messages.broadcast_now}
              buttonClass="bg-[#007781]"
              onClick={() => setOpenBroadcast(true)}
            />
            <HomeActionCard
              mobileVariant="compact"
              bgClass="bg-[#EAF1FB]"
              icon={postAnAdIcon}
              title={info_messages.post_an_ad}
              description={info_messages.sell_products_fast}
              buttonLabel={info_messages.create_an_ad}
              buttonClass="bg-[#3A46FF]"
              onClick={() => router.push("/selling/list-product?type=personal")}
            />
            <HomeActionCard
              mobileVariant="compact"
              bgClass="bg-[#FBF3EA]"
              icon={createShopIcon}
              title={placeholders.create_shop}
              description={info_messages.start_online_store}
              buttonLabel={placeholders.create_shop}
              buttonClass="bg-[#E1990D]"
              onClick={() => router.push("/selling/create-shop")}
            />
          </div>

          <Modal
            editModalRef={broadcastRef}
            open={openBroadcast}
            setOpen={setOpenBroadcast}
            centered={false}
          >
            <div className="flex h-full w-full justify-center p-2 sm:pt-12">
              <BroadCastModal setOpenBroadcast={setOpenBroadcast} />
            </div>
          </Modal>
        </>
      )}

      <ProductCategories />
      <RecentBroadCasts />
      <ServicesCategories />
      {/* Recent Ads */}
      <AllProductsAndServices
        tab="products"
      />
      {/* Featured product categories */}
      {featuredProductCategories.map((category) => (
        <AllProductsAndServices
          key={category._id}
          tab="products"
          categoryId={category._id}
          title={getFeedCategoryLabel(category.name, currentLanguage)}
        />
      ))}
      <AllProductsAndServices
        tab="services"
      />
      <DownloadAppBanner />
      <HomeFooter />

    </div>
  );
}

export default HomeSection;
