"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import chevDown from "@/assets/icons/chev-down-icon.svg";
import { BeatLoader } from "react-spinners";
import chevron from "@/assets/icons/chev-down-icon.svg";
import addIcon from "@/assets/icons/add.svg";

import Image from "next/image";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import toast from "react-hot-toast";
import DoodleButton from "@/components/Ui/DoodleButton";
import { useClickOutside } from "@/custom-hooks/useClickOutside";
import { useDebounce } from "use-debounce";
import { useGetCityAreasQuery, useGetLocationsQuery } from "@/store/services/authService";
import LocationSelect, { type LocationCoordinates } from "@/components/Ui/LocationSelect";
import { PAKISTAN_CITY_OPTIONS } from "@/assets/content/locations";
import locationIcon from "@/assets/icons/location-icon.svg";
import { useCreateShopMutation } from "@/store/services/sellingService";
import ShopCreated from "./ShopCreated";
import Modal from "../Ui/Modals/Modal";
import CategoryModal, { categroyTypes } from "../Services/CategoryModal";
import { getFeedCategoryLabel } from "@/utils/getFeedCategoryLabel";
import { useCategoriesQuery } from "@/custom-hooks/useCategoriesQuery";

interface Location {
  description?: string;
  type?: string;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
}

type ShopSubcategory = {
  _id?: string;
  id?: string;
  name?: string | { en?: string; ur?: string };
};

type ShopCategory = categroyTypes & {
  subcategories?: ShopSubcategory[];
  children?: ShopSubcategory[];
};

function getSubcategoryId(item: ShopSubcategory): string {
  return item._id ?? item.id ?? "";
}

function CreateShop() {
  const [status, setStatus] = useState("form");
  const [createdData, setCreatedData] = useState<{ id: string }>({ id: "" });
  const { placeholders, error_messages, pages, info_messages, currentLanguage } =
    useDictionary();
  const categoryRef = useRef<HTMLDivElement | null>(null);
  const locationRef = useRef<HTMLDivElement | null>(null);
  const subcategoryRef = useRef<HTMLDivElement | null>(null);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [isSubcategoryOpen, setIsSubcategoryOpen] = useState(false);
  const [location, setLocation] = useState<Location>({});
  const [address, setAddress] = useState("");
  const [createShop, { isLoading, isSuccess, isError, error, data }] =
    useCreateShopMutation();
  const [locationError, setLocationError] = useState("");
  const [profile, setProfile] = useState<File | null>(null);
  const [banner, setBanner] = useState<File | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [debouncedLocationSearch] = useDebounce(locationSearch, 500);
  const [description, setDescription] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [area, setArea] = useState("");
  const [areaError, setAreaError] = useState("");
  const [city, setCity] = useState("");
  const [cityError, setCityError] = useState("");
  // Kept so the Area search can rank that city's neighbourhoods first.
  const [cityCoordinates, setCityCoordinates] = useState<LocationCoordinates>(null);
  const [marketName, setMarketName] = useState("");
  const [marketNameError, setMarketNameError] = useState("");
  const [contact, setContact] = useState("");
  const [contactError, setContactError] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [openingHoursError, setOpeningHoursError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory | null>(
    null,
  );
  const [categoryError, setCategoryError] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<ShopSubcategory | null>(null);
  const [subcategoryError, setSubcategoryError] = useState("");

  const { data: categoriesData } = useCategoriesQuery({ type: "product" });

  const {
    data: locationsData,
    isLoading: isLocationsLoading,
    isFetching: isLocationsFetching,
  } = useGetLocationsQuery(
    {
      q: debouncedLocationSearch,
    },
    { skip: locationSearch?.trim() == "" || locationSearch == null },
  );


  // The chosen city's areas, so the Area field has something to show before
  // anything is typed. Google will not enumerate a city's neighbourhoods, so
  // the backend assembles this; it is cached per city by the query layer.
  const { data: cityAreasData } = useGetCityAreasQuery(
    {
      city,
      ...(cityCoordinates
        ? { lat: String(cityCoordinates.lat), lng: String(cityCoordinates.lng) }
        : {}),
    },
    { skip: !city },
  );

  const cityAreaOptions = useMemo(() => {
    const rows =
      (cityAreasData as { data?: { mainText?: string; description?: string }[] } | undefined)
        ?.data ?? [];
    return rows.map((row) => ({
      name: row.mainText ?? row.description ?? "",
      subtitle: row.description,
      coordinates: null,
    }));
  }, [cityAreasData]);

  const categoryOptions = (categoriesData?.data as ShopCategory[] | undefined) ?? [];

  const selectedCategoryWithSubs = useMemo(() => {
    if (!selectedCategory) return null;
    const fromList = categoryOptions.find(
      (category) => category._id === selectedCategory._id,
    );
    return fromList ?? selectedCategory;
  }, [categoryOptions, selectedCategory]);

  const subcategoryOptions = useMemo(() => {
    const category = selectedCategoryWithSubs;
    if (!category) return [] as ShopSubcategory[];
    return category.subcategories ?? category.children ?? [];
  }, [selectedCategoryWithSubs]);

  useClickOutside(locationRef, () => {
    setIsLocationOpen(false);
  });

  useClickOutside(subcategoryRef, () => {
    setIsSubcategoryOpen(false);
  });

  useEffect(() => {
    setSelectedSubcategory(null);
    setSubcategoryError("");
    setIsSubcategoryOpen(false);
  }, [selectedCategory?._id]);

  useEffect(() => {
    if (isSuccess) {
      toast.success(data?.message);
      const timer = setTimeout(() => {
        setStatus("success");
        setCreatedData(data?.data);
      }, 500);

      return () => clearTimeout(timer);
    }
    if (isError && "data" in error) {
      toast.error(
        (error?.data as { message?: string })?.message ||
        "something went wrong!",
      );
    }
  }, [isSuccess, isError, data, error]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let isValid: boolean = true;
    const checkField = (
      value: string,
      setter: React.Dispatch<React.SetStateAction<string>>,
      message: string,
    ) => {
      if (value?.trim() === "") {
        setter(message);
        isValid = false;
      } else {
        setter("");
      }
    };

    checkField(name, setNameError, error_messages.shop_name_required);
    checkField(
      description,
      setDescriptionError,
      error_messages.description_required,
    );
    checkField(
      area,
      setAreaError,
      error_messages["area_required" as keyof typeof error_messages] ??
      "Area is required*",
    );
    checkField(
      city,
      setCityError,
      error_messages["city_required" as keyof typeof error_messages] ??
      "City is required*",
    );
    checkField(
      marketName,
      setMarketNameError,
      error_messages["market_name_required" as keyof typeof error_messages] ??
      "Market name is required*",
    );
    checkField(
      contact,
      setContactError,
      error_messages["contact_required" as keyof typeof error_messages] ??
      "Contact no is required*",
    );
    checkField(
      openingHours,
      setOpeningHoursError,
      error_messages["opening_hours_required" as keyof typeof error_messages] ??
      "Opening hours are required*",
    );

    if (Object.keys(location).length === 0 || !address.trim()) {
      setLocationError(error_messages.shop_location_required);
      isValid = false;
    } else {
      setLocationError("");
    }

    if (!selectedCategory) {
      setCategoryError(error_messages.category_required);
      isValid = false;
    } else {
      setCategoryError("");
    }

    if (subcategoryOptions.length > 0 && !selectedSubcategory) {
      setSubcategoryError(
        error_messages["subcategory_required" as keyof typeof error_messages] ??
        "Subcategory is required*",
      );
      isValid = false;
    } else {
      setSubcategoryError("");
    }

    if (isValid && selectedCategory) {
      const subcategoryId = selectedSubcategory
        ? getSubcategoryId(selectedSubcategory)
        : "";
      const subcategoryLabel = selectedSubcategory
        ? getFeedCategoryLabel(selectedSubcategory.name, currentLanguage)
        : "";

      const payload = {
        title: name,
        address,
        area: area.trim(),
        city: city.trim(),
        marketName: marketName.trim(),
        contact: contact.trim(),
        openingHours: openingHours.trim(),
        category: selectedCategory._id,
        subcategory: selectedCategory?._id,
        location: {
          type: "Point",
          coordinates: [location?.coordinates?.lng, location?.coordinates?.lat],
        },
        description: description,
      };

      const formData = new FormData();
      (Object.keys(payload) as (keyof typeof payload)[]).forEach((key) => {
        const value = payload[key];
        if (value !== undefined && value !== "") {
          if (key === "location") {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });

      if (profile && profile !== null) {
        formData.append("image", profile);
      }
      if (banner) {
        formData.append("banner", banner);
      }

      createShop(formData);
    }
  };

  return (
    <div>
      <Modal
        editModalRef={categoryRef}
        open={isCatOpen}
        setOpen={setIsCatOpen}
        centered={false}
      >
        <div className="flex h-full w-full justify-center pt-[80px]">
          <CategoryModal
            setIsCatOpen={setIsCatOpen}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            type="product"
          />
        </div>
      </Modal>

      <div className="px-6 h-[61px] border-b-[1px] border-gray-9 bg-white w-full  flex justify-center">
        <div className="w-full   flex items-center gap-[6px] font-normal text-[14px] mt-5">
          <span className="text-gray-8">{pages.selling}</span>
          <Image
            src={chevron}
            alt="chevron"
            className="-rotate-90 rtl:rotate-90"
          />
          <span className="text-green-1">{placeholders.create_shop}</span>
        </div>
      </div>
      <div className=" px-6 xl:px-0 flex justify-center">
        {status === "success" ? (
          <ShopCreated id={createdData?.id} />
        ) : (
          <form
            onSubmit={handleSubmit}
            className={`w-full  max-w-[422px] pt-4
             ${isLoading && "pointer-events-none"}
          `}
          >
            <h1 className="font-medium text-[18px] text-black-1">
              {info_messages.add_shop_details}
            </h1>
            <h4 className="text-[14px] font-normal text-gray-8">
              {info_messages.fill_details}
            </h4>
            <label
              htmlFor="shop-banner"
              className="relative mt-4 block w-full cursor-pointer overflow-hidden rounded-[16px] bg-[#E6FBFB]  h-[105px]"
            >
              {banner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={URL.createObjectURL(banner)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full flex-col items-center justify-center">
                  <span className="text-[14px] font-medium text-green-1 underline">
                    {info_messages.add_banner}
                  </span>
                  <span className="mt-1 text-[12px] font-normal text-[#4B514F]">
                    {info_messages.banner_resolution}
                  </span>
                </span>
              )}
            </label>
            <input
              id="shop-banner"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setBanner(e.target.files[0]);
                }
              }}
            />
            <div className="mt-5 flex gap-[14px] items-center  w-full ">
              <div className="h-[62px] overflow-hidden  font-medium text-[16px] text-black-2 rounded-[22px] w-[62px] bg-[#E6FBFB] flex items-center justify-center">
                {profile !== null ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={URL.createObjectURL(profile as Blob) ?? ""}
                    alt=""
                    className="object-cover h-full w-full"
                  />
                ) : (
                  <Image src={addIcon} alt="add_icon" className=" " />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setProfile(e.target.files[0]);
                  }
                }}
                id="profile-photo"
              />
              <label htmlFor="profile-photo" className=" flex flex-col ">
                <span className="text-[14px] font-medium text-green-1 underline cursor-pointer">
                  {" "}
                  {info_messages.add_logo}
                </span>
                <span className="mt-1 text-[12px] font-normal text-[#4B514F]">
                  {info_messages.banner_resolution}
                </span>
              </label>
            </div>

            <div className="space-y-1 mt-5 w-full">
              <p
                className={`text-[14px] font-normal  ${nameError ? "text-red-1" : "text-gray-8"
                  }`}
              >
                {info_messages.shop_name}
              </p>
              <input
                type="text"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setName(e.target.value)
                }
                className="h-[28px] text-[15px] text-black-1 font-normal focus:outline-none w-full border-gray-9 border-b-[1px] "
              />
              {nameError && (
                <p className="text-red-1 text-[14px] font-normal">
                  {nameError}
                </p>
              )}
            </div>

            <div className="space-y-1 mt-5 w-full">
              <p
                className={`text-[14px] font-normal  ${descriptionError ? "text-red-1" : "text-gray-8"
                  }`}
              >
                {info_messages.describe_shop}
              </p>
              <textarea
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDescription(e.target.value)
                }
                draggable={false}
                className="h-[70px] resize-none text-[15px] text-black-1 font-normal focus:outline-none w-full border-gray-9 border-b-[1px] "
              />
              {descriptionError && (
                <p className="text-red-1 text-[14px] font-normal">
                  {descriptionError}
                </p>
              )}
            </div>

            <LocationSelect
              label={info_messages.city ?? "City"}
              value={city}
              error={cityError}
              placeholder={placeholders.search_city ?? "Search city..."}
              initialOptions={PAKISTAN_CITY_OPTIONS}
              types="(cities)"
              onSelect={(option) => {
                setCity(option.name);
                setCityCoordinates(option.coordinates ?? null);
                setCityError("");
                // The old area belongs to the old city.
                setArea("");
              }}
            />

            <LocationSelect
              label={info_messages.area ?? "Area"}
              value={area}
              error={areaError}
              disabled={!city}
              disabledHint={placeholders.choose_city_first ?? "Choose a city first"}
              placeholder={placeholders.search_area ?? "Search area..."}
              emptyHint={
                city
                  ? `${placeholders.search_area ?? "Search area..."} (${city})`
                  : undefined
              }
              // Neighbourhoods and sectors rather than every shop and police
              // station that happens to sit in one.
              types="(regions)"
              // Not just biased: without this a search for "model" in
              // Lahore also offers Model Town in Gujranwala and Islamabad.
              city={city}
              // Offered the moment the field opens, so the areas can be
              // browsed rather than only searched.
              initialOptions={cityAreaOptions}
              near={cityCoordinates}
              // Only the name is stored, so the per-result coordinate lookup —
              // one extra Google call each, on every keystroke — is pure cost.
              withCoordinates={false}
              onSelect={(option) => {
                setArea(option.name);
                setAreaError("");
              }}
            />


            <div className="space-y-1 mt-5 w-full">
              <p
                className={`text-[14px] font-normal ${marketNameError ? "text-red-1" : "text-gray-8"
                  }`}
              >
                {info_messages["market_name" as keyof typeof info_messages] ??
                  "Market name"}
              </p>
              <input
                type="text"
                value={marketName}
                onChange={(e) => setMarketName(e.target.value)}
                className="h-[28px] w-full border-b-[1px] border-gray-9 text-[15px] font-normal text-black-1 focus:outline-none"
              />
              {marketNameError && (
                <p className="text-[14px] font-normal text-red-1">
                  {marketNameError}
                </p>
              )}
            </div>

            <div className="space-y-1 mt-5 w-full">
              <p
                className={`text-[14px] font-normal ${contactError ? "text-red-1" : "text-gray-8"
                  }`}
              >
                {info_messages.contact_no ?? "Contact no"}
              </p>
              <input
                type="tel"
                inputMode="tel"
                value={contact}
                onChange={(e) =>
                  setContact(e.target.value.replace(/[^\d+\s-]/g, ""))
                }
                placeholder="e.g. +92 300 1234567"
                className="h-[28px] w-full border-b-[1px] border-gray-9 text-[15px] font-normal text-black-1 focus:outline-none placeholder:text-gray-8"
              />
              {contactError && (
                <p className="text-[14px] font-normal text-red-1">
                  {contactError}
                </p>
              )}
            </div>

            <div className="space-y-1 mt-5 w-full">
              <p
                className={`text-[14px] font-normal ${openingHoursError ? "text-red-1" : "text-gray-8"
                  }`}
              >
                {info_messages.opening_hours ?? "Opening hours"}
              </p>
              <input
                type="text"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                placeholder="e.g. 9:00 AM - 9:00 PM"
                className="h-[28px] w-full border-b-[1px] border-gray-9 text-[15px] font-normal text-black-1 focus:outline-none placeholder:text-gray-8"
              />
              {openingHoursError && (
                <p className="text-[14px] font-normal text-red-1">
                  {openingHoursError}
                </p>
              )}
            </div>

            <div className="mt-5 w-full">
              <div
                className={`text-[14px] font-normal w-full ${categoryError ? "text-red-1" : "text-gray-8"
                  }`}
              >
                {placeholders.category}
              </div>
              <div
                className="mt-1 flex w-full cursor-pointer items-center justify-between border-b border-gray-9 pb-1"
                onClick={() => setIsCatOpen(true)}
              >
                <h2 className="text-[15px] font-normal text-black-1">
                  {selectedCategory
                    ? getFeedCategoryLabel(
                      selectedCategory.name,
                      currentLanguage,
                    )
                    : placeholders.choose_category}
                </h2>
                <Image
                  src={chevDown}
                  alt="chev-down"
                  className="h-[16px] w-[12px]"
                  height={100}
                  width={100}
                />
              </div>
              {categoryError && (
                <p className="text-[14px] font-normal text-red-1">
                  {categoryError}
                </p>
              )}
            </div>

            {subcategoryOptions.length > 0 ? (
              <div className="mt-5 w-full">
                <div
                  className={`text-[14px] font-normal w-full ${subcategoryError ? "text-red-1" : "text-gray-8"
                    }`}
                >
                  {info_messages.subcategory ?? "Subcategory"}
                </div>
                <div ref={subcategoryRef} className="relative w-full">
                  <div
                    className="mt-1 flex w-full cursor-pointer items-center justify-between border-b border-gray-9 pb-1"
                    onClick={() => setIsSubcategoryOpen((prev) => !prev)}
                  >
                    <h2 className="text-[15px] font-normal text-black-1">
                      {selectedSubcategory
                        ? getFeedCategoryLabel(
                          selectedSubcategory.name,
                          currentLanguage,
                        )
                        : info_messages.choose_subcategory ??
                        "Choose subcategory"}
                    </h2>
                    <Image
                      src={chevDown}
                      alt="chev-down"
                      className="h-[16px] w-[12px]"
                      height={100}
                      width={100}
                    />
                  </div>
                  {isSubcategoryOpen ? (
                    <div className="absolute z-20 mt-1 max-h-[220px] w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-md">
                      {subcategoryOptions.map((item, index) => {
                        const id = getSubcategoryId(item) || String(index);
                        return (
                          <button
                            key={id}
                            type="button"
                            className="block w-full cursor-pointer px-4 py-2 text-left text-[15px] font-light text-gray-8 hover:bg-gray-100"
                            onClick={() => {
                              setSelectedSubcategory(item);
                              setIsSubcategoryOpen(false);
                              setSubcategoryError("");
                            }}
                          >
                            {getFeedCategoryLabel(item.name, currentLanguage)}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                {subcategoryError && (
                  <p className="text-[14px] font-normal text-red-1">
                    {subcategoryError}
                  </p>
                )}
              </div>
            ) : null}

            <div className="mt-5 w-full">
              <div
                className={`text-[14px] font-normal w-full ${locationError ? "text-red-1" : "text-gray-8"
                  }`}
              >
                {info_messages.shop_location}
              </div>
              <div ref={locationRef} className="relative inline-block w-full">
                <div
                  className="pb-1 w-full  flex items-start justify-between gap-2 mt-1 cursor-pointer"
                  onClick={() => {
                    setIsLocationOpen(!isLocationOpen);
                  }}
                >
                  <h2 className="min-w-0 flex-1 break-words text-[15px] font-normal text-black-1">
                    {location?.description
                      ? location.description
                      : placeholders.choose_location}
                  </h2>
                  <Image
                    src={chevDown}
                    alt="chev-down"
                    className="mt-1 h-[16px] w-[12px] shrink-0"
                    height={100}
                    width={100}
                  />
                </div>
                <div className="h-[1px]  bg-gray-9"></div>
                {isLocationOpen && (
                  <div className="absolute z-20  w-full bg-white pt-1   ">
                    <input
                      type="text"
                      placeholder={placeholders.search_country}
                      className="w-full px-4 font-light py-2 outline-none  text-sm border border-gray-200 rounded-md  "
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                    />
                    <div className="max-h-[250px] border overflow-scroll hide-scrollbar border-gray-200 rounded-md shadow-md mt-2">
                      {!isLocationsLoading &&
                        !isLocationsFetching &&
                        locationsData?.data?.length > 0 &&
                        locationsData?.data?.map(
                          (data: Location, index: number) => (
                            <div
                              onClick={() => {
                                setLocation(data);
                                setAddress(data.description?.trim() ?? "");
                                setIsLocationOpen(false);
                                setLocationSearch("");
                                setLocationError("");
                              }}
                              className="text-[15px]  text-gray-8 px-4 py-2 text-sm cursor-pointer font-light hover:bg-gray-100"
                              key={index}
                            >
                              <div className="flex items-start gap-2">
                                <Image
                                  src={locationIcon}
                                  alt=""
                                  className="mt-0.5 h-[18px] w-[14px] shrink-0"
                                />
                                <div>
                                  <h2 className="break-words">
                                    {data?.description}
                                  </h2>
                                </div>
                              </div>
                            </div>
                          ),
                        )}
                      {!isLocationsLoading &&
                        !isLocationsFetching &&
                        locationsData?.data?.length === 0 && (
                          <div className="text-[15px]  text-gray-8 px-4 py-2 text-sm cursor-pointer font-light hover:bg-gray-100">
                            {placeholders.no_locations_found}
                          </div>
                        )}
                      {(isLocationsLoading || isLocationsFetching) && (
                        <div className="w-full space-y-1">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <div
                              key={index}
                              className="bg-gray-100 h-[40px] animate-pulse"
                            ></div>
                          ))}
                        </div>
                      )}
                      {!locationsData &&
                        !isLocationsLoading &&
                        !isLocationsFetching && (
                          <div className="text-[15px]  text-gray-8 px-4 py-2 text-sm cursor-pointer font-light hover:bg-gray-100">
                            {placeholders.no_locations_found}
                          </div>
                        )}
                    </div>
                  </div>
                )}
                {locationError && (
                  <p className="text-red-1 text-[14px] font-normal">
                    {locationError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-1 w-full">
              <Image
                src={locationIcon}
                className="h-[13px] w-[11px]"
                alt="Country Flag"
              />
              <p className="text-[#030303] font-medium text-[14px] underline cursor-pointer">
                {placeholders.choose_map_location}
              </p>
            </div>
            <DoodleButton
              type="submit"
              disabled={isLoading}
              className="mt-6 mb-2 h-[55px] w-full rounded-[12px] text-white font-medium text-[16px]  bg-green-1 cursor-pointer"
            >
              {isLoading ? (
                <BeatLoader color="white" size={8} />
              ) : (
                info_messages.enter_shop
              )}
            </DoodleButton>
          </form>
        )}
      </div>
    </div>
  );
}

export default CreateShop;
