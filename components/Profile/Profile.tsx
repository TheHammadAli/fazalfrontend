"use client";

import React, { useEffect, useMemo, useState } from "react";
import Navigations from "./Navigations";
import cartIcon from "@/assets/icons/my-cart.svg";
import ordersIcon from "@/assets/icons/my-orders.svg";
import requestsIcon from "@/assets/icons/my-requests.svg";
import jobsIcon from "@/assets/icons/my-jobs.svg";
import broadcastMessagesIcon from "@/assets/icons/broadcast.svg";
import favouritesIcon from "@/assets/icons/favourites.svg";
import myReportsIcon from "@/assets/icons/my-reports.svg";
import MyCart from "./MyCart";
import MyOrders from "./MyOrders";
import MyRequests from "./MyRequests";
import MyJobs from "./MyJobs";
import Favourites from "./Favourites";
import MyReports from "./MyReports";
import Settings from "./Settings";
import ProfileInfo from "./ProfileInfo";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { useSearchParams } from "next/navigation";

type tabsComponentsTypes = {
  my_cart: React.JSX.Element;
  my_orders: React.JSX.Element;
  my_requests: React.JSX.Element;
  my_jobs: React.JSX.Element;
  favourites: React.JSX.Element;
  my_reports: React.JSX.Element;
  settings: React.JSX.Element;
  profile_info: React.JSX.Element;
};

type TabKeys = keyof tabsComponentsTypes;

function Profile() {
  const { placeholders } = useDictionary();
  const [toggle, setToggle] = useState(false);

  const tabs = useMemo(
    () => [
      // { title: "my_cart", icon: cartIcon },
      // { title: "my_orders", icon: ordersIcon },
      { title: "my_requests", icon: requestsIcon },
      { title: "my_jobs", icon: jobsIcon },
      { title: "favourites", icon: favouritesIcon },
      { title: "broadcast_messages", icon: broadcastMessagesIcon },
      { title: "my_reports", icon: myReportsIcon },
    ],
    [],
  );

  const tabsComponents: tabsComponentsTypes = useMemo(
    () => ({
      my_cart: <MyCart />,
      my_orders: <MyOrders />,
      my_requests: <MyRequests />,
      my_jobs: <MyJobs />,
      favourites: <Favourites />,
      my_reports: <MyReports />,
      settings: <Settings />,
      profile_info: <ProfileInfo toggle={toggle} setToggle={setToggle} />,
    }),
    [toggle],
  );
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  useEffect(() => {
    if (tab) {
      setSelectedTab(tab as TabKeys);
    }
  }, [tab]);

  const [selectedTab, setSelectedTab] = useState<TabKeys>("profile_info");
  const showMobileContent = toggle;
  const showMobileBackHeader =
    showMobileContent && selectedTab !== "profile_info";

  const ph = (key: keyof typeof placeholders) => placeholders[key];

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] w-full max-w-full flex-1 flex-col md:min-h-0 md:flex-row lg:h-full">
      {/* Mobile: menu list. Desktop: left sidebar */}
      <div
        className={`w-full shrink-0 overflow-y-auto md:w-auto md:max-w-none md:overflow-visible lg:w-[322px] ${showMobileContent ? "hidden md:block" : "block"
          }`}
      >
        <Navigations
          toggle={toggle}
          setToggle={setToggle}
          tabs={tabs}
          selectedTab={selectedTab}
          setSelectedTab={(value) => setSelectedTab(value as TabKeys)}
        />
      </div>

      {/* Mobile: full-screen content when a section is open. Desktop: right panel */}
      <div
        className={`min-h-0 min-w-0 flex-1 flex-col bg-white md:flex ${showMobileContent
          ? "flex max-md:fixed max-md:inset-x-0 max-md:top-20 max-md:bottom-0 max-md:z-20 max-md:overflow-hidden"
          : "max-md:hidden"
          }`}
      >
        {showMobileBackHeader && (
          <div className="flex py-2 shrink-0 items-center gap-1 border-b border-gray-9 bg-white  px-1 md:hidden">
            <button
              type="button"
              onClick={() => setToggle(false)}
              className="flex h-9 cursor-pointer w-9 shrink-0 items-center justify-center rounded-full text-green-1"
              aria-label={ph("profile")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="size-5 rtl:rotate-180"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                />
              </svg>
            </button>
            <span className="truncate text-[15px] font-medium text-black-1">
              {ph(selectedTab as keyof typeof placeholders)}
            </span>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          {tabsComponents[selectedTab]}
        </div>
      </div>
    </div>
  );
}

export default Profile;
