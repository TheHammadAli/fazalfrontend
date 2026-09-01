"use client";

import React, { useRef } from "react";
import Image, { type StaticImageData } from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Modal from "@/components/Ui/Modals/Modal";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { getFeedCategoryLabel } from "@/utils/getFeedCategoryLabel";
import noImageIcon from "@/assets/images/new-no-image-placeholder.png";

export type ModalCategoryItem = {
  _id: string;
  name?: string | { en?: string; ur?: string };
  icon?: string;
};

type CategoryTheme = {
  bgClass: string;
};

type AllCategoriesModalProps = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  title: string;
  categories: ModalCategoryItem[];
  themes: CategoryTheme[];
  onSelect: (categoryId: string) => void;
};

function hasCategoryIcon(icon?: string): boolean {
  return typeof icon === "string" && icon.trim().length > 0;
}

function AllCategoriesModal({
  open,
  setOpen,
  title,
  categories,
  themes,
  onSelect,
}: AllCategoriesModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { currentLanguage } = useDictionary();

  const getTheme = (index: number): CategoryTheme =>
    themes[index % themes.length];

  return (
    <Modal editModalRef={modalRef} open={open} setOpen={setOpen} centered={true}>
      <div className="flex max-h-[80vh] w-[92vw] max-w-[520px] flex-col overflow-hidden rounded-[16px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-9 px-5 py-4">
          <h2 className="text-[16px] font-semibold text-black-1">{title}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-gray-8 hover:bg-gray-5"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="hide-scrollbar grid grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3">
          {categories.map((category, index) => {
            const theme = getTheme(index);
            const name = getFeedCategoryLabel(category.name, currentLanguage);
            return (
              <button
                key={category._id}
                type="button"
                onClick={() => {
                  onSelect(category._id);
                  setOpen(false);
                }}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-[14px] border border-[#E5E5E5] bg-white p-3 text-center transition-colors hover:border-[#C9D1D3]"
              >
                <div
                  className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] ${theme.bgClass}`}
                >
                  <Image
                    src={
                      hasCategoryIcon(category.icon)
                        ? (category.icon as string)
                        : (noImageIcon as StaticImageData)
                    }
                    alt={name}
                    width={26}
                    height={26}
                    unoptimized={hasCategoryIcon(category.icon)}
                    className="h-[26px] w-[26px] object-contain"
                  />
                </div>
                <p className="truncate-safe w-full min-w-0 text-[13px] font-semibold text-[#333333]">
                  {name}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

export default AllCategoriesModal;
