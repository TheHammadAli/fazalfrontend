import { useDictionary } from "@/dictionaries/DictionaryProvider";
import React from "react";
import Image from "next/image";
import crossIcon from "@/assets/icons/cross-icon.svg";
import { useCategoriesQuery } from "@/custom-hooks/useCategoriesQuery";
import chevron from "@/assets/icons/chev-down-icon.svg";
import CategoriesSkeleton from "./CategoriesSkeleton";
import { getFeedCategoryLabel } from "@/utils/getFeedCategoryLabel";
import type { parameterTypes } from "@/components/Selling/ParametersModal";

export type CategoryParameterEntry = {
  name: string;
  values: string[];
  /** Name of an earlier entry in the SAME locale array whose chosen value
   *  narrows this one's options. */
  dependsOn?: string;
  /** Stable ids parallel to `values` — what a later, dependent entry
   *  addresses this one's values by. */
  valueKeys?: string[];
  /** Present when `dependsOn` is set: parent value key -> this entry's
   *  values under that parent value. `values` is always the flattened union
   *  of these, kept for a client that has never heard of `dependsOn`. */
  valuesByParent?: Record<string, string[]>;
  /** Same shape as `valuesByParent`, but holding THIS entry's own value keys
   *  instead of display text — what a further, grandchild entry resolves
   *  against once a cascade has narrowed this one down to a single bucket
   *  (see `cascadeParameterDependents` in ParametersModal.tsx for why the
   *  flat `valueKeys` alone isn't enough for that). */
  valueKeysByParent?: Record<string, string[]>;
};

export type CategoryParameters = {
  en: CategoryParameterEntry[];
  ur: CategoryParameterEntry[];
};

export interface categroyTypes {
  _id: string;
  name: string | { en: string; ur: string };
  type?: string;
  parameters?: CategoryParameters;
}

interface CategoryModalRef {
  setIsCatOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedCategory: categroyTypes | null;
  setSelectedCategory: React.Dispatch<
    React.SetStateAction<categroyTypes | null>
  >;
  type?: string;
}

export function getCategoryParameterEntries(
  parameters: CategoryParameters | undefined,
  lang: string,
): CategoryParameterEntry[] {
  if (!parameters) return [];

  const entries =
    ((lang === "ur" ? parameters.ur : parameters.en) ??
      parameters.en ??
      parameters.ur ??
      []) as Array<CategoryParameterEntry | string>;

  return entries
    .map((entry) => {
      if (typeof entry === "string") {
        const name = entry.trim();
        return name ? { name, values: [] as string[] } : null;
      }

      const name = entry?.name?.trim() ?? "";
      if (!name) return null;

      const values = Array.isArray(entry?.values)
        ? entry.values.map((value) => String(value).trim()).filter(Boolean)
        : [];

      const dependsOn =
        typeof entry?.dependsOn === "string" && entry.dependsOn.trim()
          ? entry.dependsOn.trim()
          : undefined;
      const valueKeys =
        Array.isArray(entry?.valueKeys) &&
        entry.valueKeys.every((key) => typeof key === "string")
          ? entry.valueKeys
          : undefined;
      const valuesByParent =
        entry?.valuesByParent &&
        typeof entry.valuesByParent === "object" &&
        !Array.isArray(entry.valuesByParent)
          ? entry.valuesByParent
          : undefined;
      const valueKeysByParent =
        entry?.valueKeysByParent &&
        typeof entry.valueKeysByParent === "object" &&
        !Array.isArray(entry.valueKeysByParent)
          ? entry.valueKeysByParent
          : undefined;

      return {
        name,
        values,
        ...(dependsOn ? { dependsOn } : {}),
        ...(valueKeys ? { valueKeys } : {}),
        ...(valuesByParent ? { valuesByParent } : {}),
        ...(valueKeysByParent ? { valueKeysByParent } : {}),
      };
    })
    .filter((entry): entry is CategoryParameterEntry => entry != null);
}

export function mapCategoryParametersToListingParameters(
  parameters: CategoryParameters | undefined,
  lang: string,
): parameterTypes[] {
  const entries = getCategoryParameterEntries(parameters, lang);
  const nameToIndex = new Map(entries.map((entry, index) => [entry.name, index]));

  return entries.map((entry) => {
    const dependsOnIndex = entry.dependsOn ? nameToIndex.get(entry.dependsOn) : undefined;
    const isDependent = dependsOnIndex !== undefined;

    return {
      name: entry.name,
      variants: [],
      // A dependent parameter starts with nothing to pick until its parent
      // is chosen — the locked-row UI is what keeps it from being opened
      // before then.
      options: isDependent ? [] : [...entry.values],
      isCustom: false,
      ...(isDependent ? { dependsOnIndex } : {}),
      ...(entry.valueKeys ? { valueKeys: entry.valueKeys } : {}),
      ...(entry.valuesByParent ? { valuesByParent: entry.valuesByParent } : {}),
      ...(entry.valueKeysByParent ? { valueKeysByParent: entry.valueKeysByParent } : {}),
    };
  });
}

/**
 * Rebuilds a saved listing's parameter list against its category's CURRENT
 * definition — for editing an existing product/service.
 *
 * Walks the category's own entries in order (parent before child, always —
 * `dependsOn` can only name an earlier entry), resolving each dependent
 * entry's options from its parent's SAVED value rather than seeding empty.
 * A saved value that no longer fits (the category changed since, or the
 * parent's value it depended on is now something else) is kept, not cleared —
 * opening a listing must never silently mutate it. Any saved parameter with
 * no match in the category at all (renamed, removed, or added by hand before
 * categories carried this shape) is still shown, exactly as before.
 */
export function hydrateListingParametersFromApi(
  apiParameters:
    | Array<{ name?: string; variants?: string[] }>
    | undefined,
  category: categroyTypes | null | undefined,
  lang: string,
): parameterTypes[] {
  const api = (apiParameters ?? [])
    .map((p) => ({
      name: (p.name ?? "").trim(),
      variants: Array.isArray(p.variants)
        ? p.variants.map((v) => String(v).trim()).filter(Boolean)
        : [],
    }))
    .filter((p) => p.name !== "");

  if (api.length === 0) return [];

  const sameLangEntries = getCategoryParameterEntries(category?.parameters, lang);
  const otherLang = lang === "ur" ? "en" : "ur";
  const entries =
    sameLangEntries.length > 0
      ? sameLangEntries
      : getCategoryParameterEntries(category?.parameters, otherLang);

  const nameToIndex = new Map(entries.map((entry, index) => [entry.name.toLowerCase(), index]));
  const savedByName = new Map(api.map((p) => [p.name.toLowerCase(), p]));
  const savedValueByIndex = new Map<number, string | undefined>();

  const results: parameterTypes[] = entries.map((entry, index) => {
    const saved = savedByName.get(entry.name.toLowerCase());
    const selected = saved?.variants.slice(0, 1) ?? [];
    savedValueByIndex.set(index, selected[0]);

    const dependsOnIndex = entry.dependsOn
      ? nameToIndex.get(entry.dependsOn.toLowerCase())
      : undefined;

    let options: string[];
    let activeParentKey: string | undefined;
    if (dependsOnIndex === undefined) {
      options = [...entry.values];
    } else {
      // `entries` are the category's own, unfiltered arrays — not a
      // cascaded, narrowed-down runtime list — so the parent's flat
      // `values`/`valueKeys` pair is exactly what indexing here needs: the
      // backend keeps those two arrays aligned index-for-index no matter how
      // many buckets or branches the parent itself has.
      const parentEntry = entries[dependsOnIndex];
      const parentValue = savedValueByIndex.get(dependsOnIndex);
      const parentOptionIndex = parentValue ? parentEntry.values.indexOf(parentValue) : -1;
      const parentKey =
        parentOptionIndex >= 0 ? parentEntry.valueKeys?.[parentOptionIndex] : undefined;
      options = parentKey ? entry.valuesByParent?.[parentKey] ?? [] : [];
      activeParentKey = parentKey;
    }

    const otherValue =
      selected[0] && !options.includes(selected[0]) ? selected[0] : undefined;

    return {
      name: entry.name,
      variants: selected,
      options,
      isCustom: false,
      ...(otherValue ? { otherValue } : {}),
      ...(dependsOnIndex !== undefined ? { dependsOnIndex } : {}),
      ...(entry.valueKeys ? { valueKeys: entry.valueKeys } : {}),
      ...(entry.valuesByParent ? { valuesByParent: entry.valuesByParent } : {}),
      ...(entry.valueKeysByParent ? { valueKeysByParent: entry.valueKeysByParent } : {}),
      // Remembers which of THIS entry's own buckets is currently active, so
      // that if the seller picks a new value here after opening the listing,
      // cascadeParameterDependents can resolve a further, grandchild
      // parameter's bucket correctly — see the comment there for why the
      // flat valueKeys can't be used for that once options is a narrowed
      // subset rather than the full list.
      ...(activeParentKey ? { activeParentKey } : {}),
    };
  });

  const matchedNames = new Set(entries.map((entry) => entry.name.toLowerCase()));
  for (const p of api) {
    if (matchedNames.has(p.name.toLowerCase())) continue;
    const selected = p.variants.slice(0, 1);
    results.push({
      name: p.name,
      variants: selected,
      options: [],
      isCustom: false,
      ...(selected[0] ? { otherValue: selected[0] } : {}),
    });
  }

  return results;
}

function CategoryModal({
  setIsCatOpen,
  selectedCategory,
  setSelectedCategory,
  type,
}: CategoryModalRef) {
  const { placeholders, error_messages, currentLanguage } = useDictionary();
  const {
    data: categories,
    isLoading: isCategoriesLoading,
    isFetching: isCategoriesFetching,
  } = useCategoriesQuery({
    ...(type ? { type: type, lang: currentLanguage } : {}),
  });

  return (
    <div className="h-[470px] w-[456px] overflow-scroll rounded-[10px] bg-[white] hide-scrollbar">
      <div className="sticky top-0 z-50 flex items-center justify-between border-b-[1px] border-gray-9 bg-white px-[15px] py-[16px]">
        <h1 className="text-[16px] font-medium leading-none text-black-3">
          {selectedCategory
            ? getFeedCategoryLabel(selectedCategory.name, currentLanguage)
            : placeholders.choose_category}
        </h1>
        <Image
          src={crossIcon}
          className="w-3 cursor-pointer"
          alt="cross-icon"
          onClick={() => setIsCatOpen(false)}
        />
      </div>
      <div className="z-20 w-full">
        {isCategoriesLoading || isCategoriesFetching ? (
          <CategoriesSkeleton />
        ) : categories?.data?.length > 0 ? (
          <>
            {categories?.data?.map((category: categroyTypes, index: number) => (
              <div
                onClick={() => {
                  setSelectedCategory(category);
                  setIsCatOpen(false);
                }}
                key={category._id || index}
                className="flex cursor-pointer items-center justify-between border-b-[1px] border-gray-9 px-[15px] py-[16px]"
              >
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="#007781"
                    className="h-[24px] w-[24px]"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z"
                    />
                  </svg>
                  <h2 className="text-[15px] font-medium text-black-1">
                    {getFeedCategoryLabel(category?.name, currentLanguage)}
                  </h2>
                </div>
                <Image
                  src={chevron}
                  alt="chevron"
                  className="-rotate-90 rtl:rotate-90"
                />
              </div>
            ))}
          </>
        ) : (
          <div className="flex h-[410px] w-full items-center justify-center">
            <h1 className="text-[16px] font-medium text-black-3">
              {error_messages.no_categories}
            </h1>
          </div>
        )}
      </div>
    </div>
  );
}

export default CategoryModal;
