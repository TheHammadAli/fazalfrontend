"use client";
import React, { useState } from "react";
import Tabs from "../Ui/Tabs";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { useRouter, useSearchParams } from "next/navigation";
import ShopProductsList from "./ShopProductsList";
import ShopVideosList from "./ShopVideosList";
import { useGetShopDetailQuery } from "@/store/services/sellingService";
import { getUserId } from "@/utils/getUserId";

function resolveEntityId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as { id?: string; _id?: string };
    return record.id ?? record._id ?? null;
  }
  return null;
}

function ShopProducts() {
  const { placeholders } = useDictionary();
  const [activeTab, setActiveTab] = useState<string>("shop");
  const router = useRouter();
  const id = useSearchParams().get("id");
  const userId = getUserId() ?? "";

  const { data: shop } = useGetShopDetailQuery(id, { skip: !id });
  const shopOwnerId = resolveEntityId(shop?.data?.ownerId);
  const isShopOwner = Boolean(userId && shopOwnerId && userId === shopOwnerId);

  // "My videos" only makes sense to the owner; a visitor is looking at the
  // shop's videos, not their own. Same ownership check ShopVideosList already
  // uses to gate the per-video delete button.
  const tabs = [
    { key: "shop", title: placeholders.shop },
    {
      key: "my_videos",
      title: isShopOwner ? placeholders.my_videos : placeholders.shop_videos,
    },
    // { key: "orders", title: placeholders.orders },
  ];

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
