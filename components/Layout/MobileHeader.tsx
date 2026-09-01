"use client";

import { useState } from "react";
import { Dialog, DialogPanel } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import logo from "@/assets/icons/fazal-logo.svg";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import dummyProfile from "@/assets/images/default-profile-avatar.svg";
import { links } from "@/assets/content/links";
import { usePathname, useRouter } from "next/navigation";
import copyRight from "@/assets/icons/copyright.svg";
import LangSwitcher from "../Ui/LangSwitcher";
import { useGetUserDetailQuery } from "@/store/services/profileService";
import { useAppSelector } from "@/store/store";
import { withImageCacheBust } from "@/utils/withImageCacheBust";
import { getLinksForGuest } from "@/utils/guestAccess";
import { useIsGuest } from "@/custom-hooks/useIsGuest";
import GuestAuthNav from "./GuestAuthNav";
import notificationMobileIcon from "@/assets/icons/notification-mobile-icon.svg";
import messageMobileIcon from "@/assets/icons/message-mobile icon.svg";
import WhatsAppIcon from "@/assets/icons/whatsapp-icon.svg";
import {
  PRIVACY_POLICY_URL,
  TERMS_AND_CONDITIONS_URL,
  getSupportWhatsAppUrl,
} from "@/assets/content/constants";

function formatBadgeCount(count: number) {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

export default function MobileHeader({
  unreadMessages,
  unreadCount,
  openSidebar,
  setOpenSidebar,
}: {
  unreadMessages: number;
  unreadCount: number;
  openSidebar: boolean;
  setOpenSidebar: (open: boolean) => void;
}) {
  const { userId } = useAppSelector((state) => state.authReducer);
  const isGuest = useIsGuest();
  const navLinks = isGuest ? getLinksForGuest(links) : links;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const { pages, placeholders, info_messages } = useDictionary();
  const { data: profileData } = useGetUserDetailQuery(userId, {
    skip: userId === "" || isGuest,
  });

  const chatBadge = formatBadgeCount(unreadMessages);
  const notificationBadge = formatBadgeCount(unreadCount);

  return (
    <header className="bg-white h-[60px] flex items-center lg:hidden border-b-[1px] border-gray-9">
      <div className="px-5 w-full max-w-7xl mx-auto">
        <nav
          aria-label="Global"
          className="flex items-center gap-3 justify-between w-full"
        >
          <div onClick={() => router.push("/home")} className="cursor-pointer">
            <Image src={logo} alt="logo" />
          </div>

          <div className="flex items-center gap-3">
            {!isGuest && (
              <>
                <button
                  type="button"
                  onClick={() => router.push("/chat")}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-full"
                  aria-label="Messages"
                >
                  <Image src={messageMobileIcon} alt="messages" width={20} height={19} />
                  {chatBadge ? (
                    <span className="absolute -right-1 -top-0.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#E53935] px-1 text-[9px] font-medium leading-none text-white">
                      {chatBadge}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => setOpenSidebar(true)}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-full"
                  aria-label="Notifications"
                >
                  <Image
                    src={notificationMobileIcon}
                    alt="notifications"
                    width={20}
                    height={20}
                  />
                  {notificationBadge ? (
                    <span className="absolute -right-1 -top-0.5 flex min-h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#E53935] px-1 text-[9px] font-medium leading-none text-white">
                      {notificationBadge}
                    </span>
                  ) : null}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-700"
            >
              <Bars3Icon aria-hidden="true" className="size-6" />
            </button>
          </div>
        </nav>

        <Dialog
          open={mobileMenuOpen}
          onClose={setMobileMenuOpen}
          className="lg:hidden"
        >
          <div className="fixed inset-0 z-50" />
          <DialogPanel className="fixed inset-y-0 z-50 w-full ltr:right-0 overflow-y-auto bg-white p-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <a href="#" className="-m-1.5 p-1.5">
                <span className="sr-only">Your Company</span>
              </a>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon aria-hidden="true" className="size-6" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div>
                  {navLinks.map((link, index) => {
                    const active: boolean = path.includes(link?.href);
                    const isUpdatesLink = link.href === "/updates";
                    const isLinkActive = isUpdatesLink ? openSidebar || active : active;
                    const isChatLink = link.href === "/chat";
                    return (
                      <div
                        key={index}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          if (link.href !== "/updates") {
                            router.push(link.href);
                          } else {
                            setOpenSidebar(true);
                          }
                        }}
                        className="flex items-center gap-3 py-3 cursor-pointer"
                      >
                        <Image
                          src={isLinkActive ? link.icon?.active : link.icon?.inactive}
                          alt="icon"
                        />
                        <h2
                          className={`font-semibold text-[14px] ${active ? "text-green-1" : "text-gray-8"
                            } leading-none`}
                        >
                          {
                            pages?.[
                            link?.title?.toLocaleLowerCase() as keyof typeof pages
                            ]
                          }
                        </h2>
                        {isUpdatesLink && notificationBadge ? (
                          <div className="min-w-[1.25rem] shrink-0 rounded-full bg-[#E53935] px-1 py-0.5 text-center text-[10px] font-medium leading-none text-white">
                            {notificationBadge}
                          </div>
                        ) : null}
                        {isChatLink && chatBadge ? (
                          <div className="min-w-[1.25rem] shrink-0 rounded-full bg-[#E53935] px-1 py-0.5 text-center text-[10px] font-medium leading-none text-white">
                            {chatBadge}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {isGuest ? (
                    <GuestAuthNav onNavigate={() => setMobileMenuOpen(false)} />
                  ) : (
                    <div
                      onClick={() => {
                        setMobileMenuOpen(false);
                        router.push("/profile");
                      }}
                      className="flex items-center gap-3 py-3 hover:bg-green-3 cursor-pointer"
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
                        className={`h-[26px] w-[26px] rounded-full object-cover ${path.includes("/profile") && "border-[2px] border-green-1"
                          }`}
                      />
                      <h2
                        className={`font-semibold text-[14px] ${path.includes("/profile") ? "text-green-1" : "text-gray-8"
                          } leading-none`}
                      >
                        {pages.profile}
                      </h2>
                    </div>
                  )}
                  {!isGuest && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        router.push("/selling/list-product?type=personal");
                      }}
                      className="border-green-1 mt-4 cursor-pointer border-[3px] bg-[#DFF4F4] text-[13px] font-semibold text-green-1 px-4 py-2 rounded-xl h-[42px] w-full"
                    >
                      {info_messages.post_an_ad}
                    </button>
                  )}
                  <div className="flex flex-col items-center mt-20">
                    <div className="flex items-center gap-[6px] text-[12px] font-normal">

                      <span
                        onClick={() =>
                          window.open(getSupportWhatsAppUrl(), "_blank", "noopener,noreferrer")
                        }
                        className="inline-flex items-center gap-1 text-green-1 underline cursor-pointer"
                      >
                        <Image
                          src={WhatsAppIcon}
                          alt=""
                          className="h-3.5 w-3.5 shrink-0"
                        />
                        {placeholders.report_a_problem}
                      </span>


                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex gap-[3px] pt-1 min-w-max">
                        <Image src={copyRight} alt="icon" />
                        <span className="text-gray-6 text-[12px] font-light">
                          2025 {placeholders.market}
                        </span>
                      </div>
                      <div className="pt-2">
                        <LangSwitcher />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogPanel>
        </Dialog>
      </div>
    </header>
  );
}
