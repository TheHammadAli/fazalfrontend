"use client";
import React, { useState } from "react";
import Tabs from "../Ui/Tabs";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { useRouter, useSearchParams } from "next/navigation";
import ShopProductsList from "./ShopProductsList";
import ShopVideosList from "./ShopVideosList";


function ShopProducts() {
  const tabs = ["shop", "my_videos",
    // "orders"
  ];
  const [activeTab, setActiveTab] = useState<string>(tabs[0]);
  const router = useRouter();
  const id = useSearchParams().get("id");

  const tabsComponents: { [key: string]: React.ReactNode } = {
    shop: <ShopProductsList />,
    my_videos: <ShopVideosList />,
    // orders: <ShopOrders />,
  };

  return (
    <div className="">
      <div className="border-b-[1px] border-gray-9 flex justify-between items-center  w-full">
        <Tabs
          paddingX="px-5 md:px-8"
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>
      <div>{tabsComponents[activeTab]}</div>
    </div>
  );
}

export default ShopProducts;
