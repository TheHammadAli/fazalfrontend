"use client";
import React, { useEffect, useState } from "react";
import Image, { StaticImageData } from "next/image";
import dummyProfile from "@/assets/images/default-profile-avatar.svg";
import chevron from "@/assets/icons/chev-down-icon.svg";
import { useDictionary } from "@/dictionaries/DictionaryProvider";

import privacyIcon from "@/assets/icons/privacy-policy.svg";
import settingIcon from "@/assets/icons/settings.svg";
import aboutIcon from "@/assets/icons/about.svg";
import WhatsAppIcon from "@/assets/icons/whatsapp-icon.svg";
import {
  PRIVACY_POLICY_URL,
  TERMS_AND_CONDITIONS_URL,
  getSupportWhatsAppUrl,
} from "@/assets/content/constants";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/store";
import { useLogout } from "@/custom-hooks/useLogout";
import ConfirmModal from "../Ui/ConfirmModal";
import { useGetUserDetailQuery } from "@/store/services/profileService";
import AvatarUi from "@/components/Ui/AvatarUi";
import { withImageCacheBust } from "@/utils/withImageCacheBust";

interface Tab {
  title: string;
  icon: StaticImageData;
}
interface NavigationsTypes {
  tabs: Tab[];
  selectedTab: string;
  setSelectedTab: (value: string) => void;
  toggle: boolean;
  setToggle: (value: boolean) => void;
}

function Navigations({
  tabs,
  selectedTab,
  setSelectedTab,
  toggle,
  setToggle,
}: NavigationsTypes) {
  const { pages, placeholders } = useDictionary();
  const router = useRouter();
  const signOut = useLogout();
  const { userId } = useAppSelector((state) => state.authReducer);
  const [mounted, setMounted] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const {
    data: profileData,
    isLoading: profileLoading,
  } = useGetUserDetailQuery(userId, { skip: userId === "" });
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prefer optimistic blob from cache (instant); otherwise CDN URL with stable bust key
  const rawImage = profileData?.data?.image;
  const profileImageSrc =
    rawImage && !String(rawImage).includes("default-avatar")
      ? String(rawImage).startsWith("blob:")
        ? String(rawImage)
        : withImageCacheBust(
          String(rawImage),
          profileData?.data?.imageCacheKey ?? profileData?.data?.updatedAt,
        )
      : dummyProfile.src;
  return (
    <div
      className={`w-full md:min-w-[160px] lg:w-[322px] h-full ltr:border-r-[1px] rtl:border-l-[1px] border-gray-9 pt-8 `}
    >
      <h1 className="text-black-1 font-bold text-[22px] mx-6">
        {pages.profile}
      </h1>
      <div
        className={` px-4 xl:px-6 py-4 cursor-pointer 
      
        `}
        onClick={() => {
          setSelectedTab("profile_info");
          setToggle(!toggle);
        }}
      >
        <div
          className={`flex justify-between md:justify-center lg:justify-between  `}
        >
          <div className={`flex  md:flex-col lg:flex-row items-center gap-2 `}>
            {mounted && profileLoading && !profileData ? (
              <div className="rounded-full bg-gray-200 h-12 w-12"></div>
            ) : (
              <AvatarUi
                image={profileImageSrc}
                name={profileData?.data?.name ?? ""}
                className="h-12 w-12 rounded-full object-cover bg-[#e7f4f5] !text-green-1"
              />
            )}
            <div>
              {mounted && profileLoading && !profileData ? (
                <div className="w-[80px] h-[15px] rounded-full bg-gray-200 animate-pulse"></div>
              ) : (
                <h2 className="text-black-1 font-medium text-[15px]">
                  {profileData?.data?.name ?? ""}
                </h2>
              )}
              <h4 className="font-light text-[15px] text-gray-8">
                {placeholders.view_my_profile}
              </h4>
            </div>
          </div>
          <Image
            src={chevron}
            alt="chevron"
            className="-rotate-90 rtl:rotate-90 w-[16px] md:hidden  lg:block"
          />
        </div>
      </div>
      <div className="bg-gray-12 border-t-[1px] border-gray-9 h-[27px]"></div>
      <div>
        {tabs.map((tab: Tab, index) => {
          const active = tab?.title === selectedTab;
          return (
            <div
              key={index}
              className={`px-4 xl:px-6 py-4 flex items-center gap-2 cursor-pointer ${active && "bg-green-4"
                } `}
              onClick={() => {
                if (tab?.title === "broadcast_messages") {
                  router.push("/chat?threadType=broadcast");
                  return;
                }
                setSelectedTab(tab?.title);
                setToggle(!toggle);
              }}
            >
              <Image src={tab.icon} alt="icon" className="block" />
              <h2 className="font-semibold text-black-1 text-[15px]">
                {placeholders[tab.title as keyof typeof placeholders]}
              </h2>
            </div>
          );
        })}
      </div>
      <div className="bg-gray-12 border-t-[1px] border-gray-9 h-[27px]"></div>
      <div
        className={`px-4 xl:px-6 py-4 flex items-center gap-2 cursor-pointer `}
        onClick={() =>
          window.open(PRIVACY_POLICY_URL, "_blank", "noopener,noreferrer")
        }
      >
        <Image src={privacyIcon} alt="icon" className="" />
        <h2 className="font-semibold text-black-1 text-[15px] first-letter:capitalize">
          {placeholders.privacy_policy}
        </h2>
      </div>
      <div
        className={`px-4 xl:px-6 py-4 flex items-center gap-2 cursor-pointer `}
        onClick={() =>
          window.open(TERMS_AND_CONDITIONS_URL, "_blank", "noopener,noreferrer")
        }
      >
        <Image src={privacyIcon} alt="icon" className="" />
        <h2 className="font-semibold text-black-1 text-[15px] first-letter:capitalize">
          {placeholders.terms_condition}
        </h2>
      </div>
      <div
        className={`px-4 xl:px-6 py-4 flex items-center gap-2 cursor-pointer `}
        onClick={() =>
          window.open(getSupportWhatsAppUrl(), "_blank", "noopener,noreferrer")
        }
      >
        <Image src={WhatsAppIcon} alt="icon" className="h-[22px] w-[22px]" />
        <h2 className="font-semibold text-black-1 text-[15px] first-letter:capitalize">
          {placeholders.report_a_problem}
        </h2>
      </div>
      <div className="bg-gray-12 border-t-[1px] border-gray-9 h-[27px]"></div>
      <div
        className={`px-4 xl:px-6 py-4 flex items-center gap-2 cursor-pointer  ${selectedTab === "settings" && "bg-green-4"
          }`}
        onClick={() => {
          setSelectedTab("settings");
          setToggle(!toggle);
        }}
      >
        <Image src={settingIcon} alt="icon" className="" />
        <h2 className="font-semibold text-black-1 text-[15px] first-letter:capitalize">
          {placeholders.settings}
        </h2>
      </div>
      {/* <div
        className={`px-4 xl:px-6 py-4 flex items-center gap-2 cursor-pointer `}
        onClick={() => router.push("/about")}
      >
        <Image src={aboutIcon} alt="icon" className="" />
        <h2 className="font-semibold text-black-1 text-[15px] first-letter:capitalize">
          {placeholders.about_market}
        </h2>
      </div> */}
      <div
        className={`px-4 xl:px-6 py-4 flex items-center gap-2 cursor-pointer `}
        onClick={() => setLogoutModal(true)}
      >
        <Image src={privacyIcon} alt="icon" className="" />
        <h2 className="font-semibold text-black-1 text-[15px] first-letter:capitalize">
          {placeholders.logout}
        </h2>
      </div>

      <ConfirmModal
        open={logoutModal}
        setOpen={setLogoutModal}
        title={placeholders.logout}
        message={
          placeholders[
            "logout_confirm_message" as keyof typeof placeholders
          ] ?? "Are you sure you want to log out?"
        }
        confirmLabel={placeholders.logout}
        loading={isLoggingOut}
        destructive
        onConfirm={() => {
          setIsLoggingOut(true);
          void signOut()
            .then(() => router.push("/en/signin"))
            .finally(() => {
              setIsLoggingOut(false);
              setLogoutModal(false);
            });
        }}
      />
    </div>
  );
}

export default Navigations;
