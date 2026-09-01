"use client";
import React from "react";
import Image from "next/image";
import AuthImagePanel from "./AuthImagePanel";
import Arrow from "@/assets/icons/right-gray-arrow-icon.svg";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { useRouter } from "next/navigation";
import LangSwitcher from "../Ui/LangSwitcher";
import Footer from "./Footer";

function Wellcome() {
  const router = useRouter();
  const { info_messages, placeholders } = useDictionary();

  return (
    <div className="flex min-h-dvh w-full max-w-full flex-col overflow-x-hidden lg:h-screen lg:flex-row">
      <AuthImagePanel
        className="relative w-full shrink-0 overflow-hidden lg:h-full lg:w-1/2 ltr:lg:pl-8 ltr:xl:pl-24 rtl:lg:pr-8 rtl:xl:pr-24"
        imageClassName="h-[220px] sm:h-[300px] lg:h-full w-full object-cover object-top"
      />
      <div className="flex w-full min-w-0 flex-1 flex-col justify-between px-5 pb-6 pt-5 sm:px-[50px] lg:w-1/2 lg:overflow-y-auto lg:pb-14 lg:pt-[80px] xl:px-[150px]">
        <div className="flex w-full flex-col">
          <div className="mb-5 flex w-full items-center justify-between">
            <LangSwitcher />
            <button
              type="button"
              onClick={() => router.push("/home")}
              className="cursor-pointer text-[14px] font-normal text-black-1 hover:underline"
            >
              {placeholders["skip" as keyof typeof placeholders] ?? "Skip"}
            </button>
          </div>

          <h1 className="w-full text-[22px] font-bold leading-[30px] text-black-1 ltr:text-left rtl:text-right">
            {info_messages.welcome_market}
          </h1>
          <p className="text-[16px] font-light text-gray-8 ltr:text-left rtl:text-right">
            {info_messages.discover_market}
          </p>
          <p className="w-full text-[16px] font-light text-gray-8 ltr:text-left rtl:text-right">
            {info_messages.locally_globally}
          </p>

          <button
            type="button"
            onClick={() => router.push("/selling")}
            className="mt-8 flex w-full cursor-pointer items-start justify-between gap-[10px] rounded-[12px] bg-[#C7F1EE80] p-5 rtl:flex-row-reverse lg:mt-12 lg:h-[102px]"
          >
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-medium leading-tight text-black-1 ltr:text-left rtl:text-right">
                {info_messages.list_product}
              </h2>
              <p className="mt-1 text-[14px] font-light leading-[20px] text-[#4B514F] ltr:text-left rtl:text-right">
                {info_messages.sell_physical}
              </p>
            </div>
            <Image src={Arrow} alt="arrow" className="mt-1 shrink-0 rtl:-rotate-90" />
          </button>

          <button
            type="button"
            onClick={() => router.push("/services")}
            className="mt-3 flex w-full cursor-pointer items-start justify-between gap-[10px] rounded-[12px] bg-[#C7F1EE80] p-5 rtl:flex-row-reverse lg:h-[102px]"
          >
            <div className="min-w-0 flex-1">
              <h2 className="text-[16px] font-medium leading-tight text-black-1 ltr:text-left rtl:text-right">
                {info_messages.list_service}
              </h2>
              <p className="mt-1 text-[14px] font-light leading-[20px] text-[#4B514F] ltr:text-left rtl:text-right">
                {info_messages.offer_expertise}
              </p>
            </div>
            <Image src={Arrow} alt="arrow" className="mt-1 shrink-0 rtl:-rotate-90" />
          </button>
        </div>

        <div className="mt-10 w-full lg:mt-8">
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default Wellcome;
