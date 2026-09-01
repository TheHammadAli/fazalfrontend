"use client";

import { links } from "@/assets/content/links";

import { useDictionary } from "@/dictionaries/DictionaryProvider";

import React, { type Dispatch, type SetStateAction } from "react";

import Image from "next/image";

import dynamic from "next/dynamic";

import { usePathname, useRouter } from "next/navigation";

import dummyProfile from "@/assets/images/default-profile-avatar.svg";

import copyRight from "@/assets/icons/copyright.svg";

import LangSwitcher from "../Ui/LangSwitcher";

import { useAppSelector } from "@/store/store";

import { useGetUserDetailQuery } from "@/store/services/profileService";

import { withImageCacheBust } from "@/utils/withImageCacheBust";

import { getLinksForGuest } from "@/utils/guestAccess";

import { useIsGuest } from "@/custom-hooks/useIsGuest";

import GuestAuthNav from "./GuestAuthNav";

import { Dialog, DialogPanel } from "@headlessui/react";

import logo from "@/assets/icons/fazal-logo.svg";

import Link from "next/link";
import WhatsAppIcon from "@/assets/icons/whatsapp-icon.svg";
import {
  PRIVACY_POLICY_URL,
  TERMS_AND_CONDITIONS_URL,
  getSupportWhatsAppUrl,
} from "@/assets/content/constants";

// Avoid SSR + hydration issues with cookies, sockets, and Headless UI Dialog.

const Notifications = dynamic(() => import("../Updates/Notifications"), {

  ssr: false,

});



function Sidebar({

  unreadMessages,

  setUnreadMessages,

  unreadCount,

  setReadCount,

  openSidebar,

  setOpenSidebar,

}: {

  unreadMessages: number;

  setUnreadMessages: Dispatch<SetStateAction<number>>;

  unreadCount: number;

  setReadCount: Dispatch<SetStateAction<number>>;

  openSidebar: boolean;

  setOpenSidebar: (open: boolean) => void;

}) {

  const { userId } = useAppSelector((state) => state.authReducer);

  const isGuest = useIsGuest();



  const { placeholders, pages, info_messages } = useDictionary();

  const navLinks = isGuest ? getLinksForGuest(links) : links;

  const { data: profileData } = useGetUserDetailQuery(userId, {

    skip: userId === "" || isGuest,

  });

  const path = usePathname();

  const router = useRouter();

  return (

    <div

      className="bg-white hidden lg:flex flex-col justify-between w-[228px] min-w-[228px] h-screen min-h-screen overflow-y-auto hide-scrollbar
    pt-[30px] px-[10px] gap-10"

    >

      <Dialog

        open={openSidebar}

        onClose={setOpenSidebar}

        className=""

      ><div className="fixed inset-0 z-50" />

        <DialogPanel className="fixed inset-y-0  z-50 w-full ltr:right-0  overflow-y-auto bg-white w-full lg:max-w-[340px] shadow-menu">

          <Notifications

            setOpenSidebar={setOpenSidebar}

            setReadCount={setReadCount}

            unreadCount={unreadCount}

          />

        </DialogPanel>

      </Dialog >

      <div className="space-y-[22px]">

        <Link href="/home" className="px-[14px] block">

          <Image src={logo} alt="logo" />

        </Link>

        <div className="group/nav-links space-y-5 ">
          {navLinks.map((link, index) => {

            const active: boolean = path.includes(link?.href);

            const isUpdatesLink = link.href === "/updates";

            const isChatLink = link.href === "/chat";

            const isLinkActive = isUpdatesLink ? openSidebar || active : active;

            return (

              <div

                key={index}

                onClick={() => { if (link.href !== "/updates") { router.push(link.href) } else { setOpenSidebar(true) } }}

                className="px-[14px] flex items-center gap-3 py-3 hover:bg-green-3 cursor-pointer"
              >
                <Image
                  src={isLinkActive ? link.icon?.active : link.icon?.inactive}
                  alt="icon"
                  className="shrink-0"
                />

                <span className="max-w-0 overflow-hidden transition-[max-width] duration-200 ease-out group-hover/nav-links:max-w-[140px]">
                  <h2
                    className={`inline-block font-semibold text-[14px]  leading-none whitespace-nowrap opacity-0 -translate-x-3 transition-all duration-200 ease-out group-hover/nav-links:translate-x-0 group-hover/nav-links:opacity-100 rtl:translate-x-3 ${isLinkActive ? "text-green-1" : "text-gray-8"
                      }`}
                  >
                    {
                      pages?.[
                      link?.title?.toLocaleLowerCase() as keyof typeof pages
                      ]
                    }
                  </h2>
                </span>

                {isUpdatesLink && unreadCount > 0 && (
                  <span className="max-w-0 overflow-hidden opacity-0 -translate-x-3 transition-all duration-200 ease-out group-hover/nav-links:max-w-[2rem] group-hover/nav-links:translate-x-0 group-hover/nav-links:opacity-100 rtl:translate-x-3">
                    <div className="min-w-[1.25rem] shrink-0 rounded-full bg-green-1 px-1 py-0.5 text-center text-[10px] font-medium leading-none text-white">
                      {unreadCount || 0}
                    </div>
                  </span>
                )}

                {isChatLink && unreadMessages > 0 && (
                  <span className="max-w-0 overflow-hidden opacity-0 -translate-x-3 transition-all duration-200 ease-out group-hover/nav-links:max-w-[2rem] group-hover/nav-links:translate-x-0 group-hover/nav-links:opacity-100 rtl:translate-x-3">
                    <div className="min-w-[1.25rem] shrink-0 rounded-full bg-green-1 px-1 py-0.5 text-center text-[10px] font-medium leading-none text-white">
                      {unreadMessages || 0}
                    </div>
                  </span>
                )}

              </div>

            );

          })}

          {isGuest ? (

            <div className="px-[14px]">

              <GuestAuthNav />

            </div>

          ) : (

            <div

              onClick={() => router.push("/profile")}

              className="px-[14px] flex items-center gap-3 py-3 hover:bg-green-3 cursor-pointer"

            >

              <Image

                src={

                  profileData?.data?.image &&

                    !profileData?.data?.image.includes("default-avatar")

                    ? withImageCacheBust(

                      profileData.data.image,

                      profileData.data.imageCacheKey ??

                      profileData.data.updatedAt,

                    )

                    : dummyProfile

                }

                height={100}

                width={100}

                alt="icon"

                unoptimized

                loading="lazy"

                className={`h-[26px] w-[26px] rounded-full object-cover ${path.includes("/profile") && "border-[2px] border-green-1"

                  }`}

              />

              <span className="max-w-0 overflow-hidden transition-[max-width] duration-200 ease-out group-hover/nav-links:max-w-[140px]">
                <h2
                  className={`inline-block font-semibold text-[14px] leading-none whitespace-nowrap opacity-0 -translate-x-3 transition-all duration-200 ease-out group-hover/nav-links:translate-x-0 group-hover/nav-links:opacity-100 rtl:translate-x-3 ${path.includes("/profile") ? "text-green-1" : "text-gray-8"
                    }`}
                >
                  {pages.profile}
                </h2>
              </span>

            </div>

          )}

        </div>

        {!isGuest && (

          <button

            type="button"

            onClick={() => router.push("/selling/list-product?type=personal")}

            className="border-green-1 mx-4 cursor-pointer border-[3px] bg-[#DFF4F4] text-[13px] font-semibold text-green-1 px-4 py-2 rounded-xl h-[42px] w-[176px]"

          >

            {info_messages.post_an_ad}

          </button>

        )}

      </div>



      <div className=" px-[14px] pb-20 ">

        <div className="flex items-center gap-[6px] text-[14px] font-normal">



          <span
            onClick={() =>
              window.open(getSupportWhatsAppUrl(), "_blank", "noopener,noreferrer")
            }
            className="inline-flex items-center gap-2 text-green-1 underline cursor-pointer"
          >
            <Image
              src={WhatsAppIcon}
              alt=""
              className="h-4 w-4 shrink-0"
            />
            {placeholders.report_a_problem}
          </span>



        </div>



        <div className="flex items-center gap-2">

          <div className="flex gap-[3px] pt-1 min-w-max">

            <Image src={copyRight} alt="icon" />

            <span className="text-gray-6 text-[12px] font-light">

              2026 Fazl App

            </span>

          </div>

          <div className="pt-2">

            <LangSwitcher />

          </div>

        </div>

      </div>



    </div >

  );

}



export default Sidebar;

