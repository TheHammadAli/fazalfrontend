"use client";

import React, { useState } from "react";
import Image from "next/image";
import crossIcon from "@/assets/icons/cross-icon.svg";
import noImageAvtar from "@/assets/images/no-image-av.png";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { BeatLoader } from "react-spinners";
import DoodleButton from "@/components/Ui/DoodleButton";
import { formatPrice } from "@/utils/formatPrice";

export type MakeOfferModalProps = {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  productImage?: string;
  productTitle: string;
  productPrice: string | number;
  onSubmit: (payload: { price: number; message: string }) => void | Promise<void>;
  loading?: boolean;
};

function MakeOfferModal({
  setOpen,
  productImage,
  productTitle,
  productPrice,
  onSubmit,
  loading,
}: MakeOfferModalProps) {
  const { placeholders } = useDictionary();
  type PlaceholderKey = keyof typeof placeholders;
  const ph = (key: PlaceholderKey) => placeholders[key];

  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");

  const priceNum = Number(price);
  const isValid = Number.isFinite(priceNum) && priceNum > 0 && message.trim().length > 0;

  const handleClose = () => setOpen(false);

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      await onSubmit({ price: priceNum, message: message.trim() });
    } catch {
      // Caller handles errors (e.g. toast); keep modal open
    }
  };

  return (
    <div className="hide-scrollbar w-screen max-w-[496px] overflow-hidden rounded-[18px] bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-[#E3EDF3] px-5 pb-4 pt-5 sm:px-6">
        <h2 className="text-[18px] font-semibold text-[#0F172A]">
          {ph("make_an_offer")}
        </h2>
        <button
          type="button"
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A]"
          onClick={handleClose}
          aria-label={ph("cancel")}
        >
          <Image src={crossIcon} alt="" className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-6">
        <div className="flex items-center gap-3 rounded-[12px] border border-[#E3EDF3] p-3">
          <Image
            src={productImage || noImageAvtar}
            alt={productTitle}
            width={56}
            height={56}
            unoptimized
            className="h-[56px] w-[56px] shrink-0 rounded-[8px] object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-[#0F172A]">{productTitle}</p>
            <p className="text-[14px] font-medium text-green-1">
              {ph("Rs")} {formatPrice(productPrice)}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="offer-price" className="mb-2 block text-[14px] font-medium text-[#0F172A]">
            {ph("your_offer_price")}
          </label>
          <input
            id="offer-price"
            type="number"
            min={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={String(ph("Rs"))}
            className="h-[46px] w-full rounded-[10px] border border-[#E3EDF3] px-4 text-[15px] text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-green-1"
          />
        </div>

        <div>
          <label htmlFor="offer-message" className="mb-2 block text-[14px] font-medium text-[#0F172A]">
            {ph("offer_message_placeholder")}
          </label>
          <textarea
            id="offer-message"
            rows={4}
            value={message}
            maxLength={1000}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={String(ph("offer_message_placeholder"))}
            className="min-h-[100px] w-full resize-none rounded-[12px] border border-[#E3EDF3] p-3 text-[14px] text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-green-1"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[#E3EDF3] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
        <button
          type="button"
          disabled={loading}
          onClick={handleClose}
          className="h-[46px] cursor-pointer rounded-[8px] border border-green-1 text-[15px] font-medium text-green-1 transition-colors hover:bg-green-1/10 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[110px]"
        >
          {ph("cancel")}
        </button>
        <DoodleButton
          type="button"
          disabled={!isValid || loading}
          onClick={() => void handleSubmit()}
          className="h-[46px] cursor-pointer rounded-[8px] border border-green-1 bg-green-1 text-[15px] font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[110px]"
        >
          {loading ? <BeatLoader color="white" size={8} /> : ph("submit_offer")}
        </DoodleButton>
      </div>
    </div>
  );
}

export default MakeOfferModal;
