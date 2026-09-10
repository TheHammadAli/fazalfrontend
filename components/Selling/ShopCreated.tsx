"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import tickIcon from "@/assets/icons/tick-circle.svg";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import DoodleButton from "@/components/Ui/DoodleButton";
interface Props {
  id: string;
  image?: string | null;
}
function ShopCreated({ id, image }: Props) {
  const router = useRouter();
  const { info_messages, placeholders } = useDictionary();
  return (
    <div className="w-full max-w-[422px]">
      <div className="flex flex-col items-center mt-[80px]">
        {image ? (
          <div className="relative h-[72px] w-[72px]">
            <Image
              src={image}
              alt="shop-icon"
              fill
              unoptimized
              className="rounded-full object-cover"
            />
          </div>
        ) : (
          <Image src={tickIcon} alt="tick-icon" className=" rounded-full" />
        )}
        <h1 className="font-medium text-[22px] text-black-1 mt-3">
          {info_messages.shop_created}
        </h1>
        <h3 className="text-center text-[13px] font-normal text-gray-8 max-w-[310px]">
          {info_messages.created_description}
        </h3>
      </div>

      <div className="mt-42">
        <DoodleButton
          onClick={() => {
            router.push(`/selling/shop-detail?id=${id}`);
          }}
          className="mt-6  h-[55px] w-full rounded-[12px] text-white font-medium text-[16px]  bg-green-1 cursor-pointer">
          {info_messages.sell_product}
        </DoodleButton>
        {/* <button className="mt-6 border-[1px] border-green-1 text-green-1   h-[55px] w-full rounded-[12px] hover:text-white font-medium text-[16px] hover:bg-green-1 cursor-pointer">
          {placeholders.promote_shop}
        </button> */}
        <div className="text-center flex justify-center w-full text-green-1 font-medium text-[16px] mt-6 ">
          <p
            className="w-max cursor-pointer hover:underline"
            onClick={() => {
              router.push(`/selling`);
            }}
          >
            {" "}
            {placeholders.later}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ShopCreated;
