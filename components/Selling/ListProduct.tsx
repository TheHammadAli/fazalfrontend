"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import chevron from "@/assets/icons/chev-down-icon.svg";
import Image from "next/image";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import Tabs from "../Ui/Tabs";
import ChooseImagesTab from "../Services/ChooseImagesTab";
import ChooseVideoTab from "../Services/ChooseVideoTab";
import cameraIcon from "@/assets/icons/camera-icon.svg";
import { BeatLoader } from "react-spinners";
import Modal from "../Ui/Modals/Modal";
import DoodleButton from "@/components/Ui/DoodleButton";
import CategoryModal, {
  categroyTypes,
  type CategoryParameters,
} from "../Services/CategoryModal";
import PriceModal, { priceTypes } from "../Services/PriceModal";
import {
  useGetShopDetailQuery,
  useListProductMutation,
} from "@/store/services/sellingService";
import toast from "react-hot-toast";
import ServiceCreated from "../Services/ServiceCreated";
import { parameterTypes, hasDuplicateParameterNames, toApiParameters } from "./ParametersModal";
import ParametersModal from "./ParametersModal";
import ParameterTags from "./ParameterTags";
import { useSearchParams } from "next/navigation";
import ProductListed from "./ProductListed";
import { getCookie } from "cookies-next";
import { getFeedCategoryLabel } from "@/utils/getFeedCategoryLabel";
import { useClickOutside } from "@/custom-hooks/useClickOutside";
import { useDebounce } from "use-debounce";
import { useGetLocationsQuery } from "@/store/services/authService";
import locationIcon from "@/assets/icons/location-icon.svg";
import LocationSelect, { type LocationCoordinates } from "@/components/Ui/LocationSelect";
import { PAKISTAN_CITY_OPTIONS } from "@/assets/content/locations";
import { useGetCityAreasQuery } from "@/store/services/authService";

type Location = {
  description?: string;
  type?: string;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
};

function toPointLocation(location: Location) {
  const lat = location.coordinates?.lat;
  const lng = location.coordinates?.lng;
  if (lat == null || lng == null) return null;
  return {
    type: "Point" as const,
    coordinates: [lng, lat] as [number, number],
  };
}

function mapCategoryParametersToProductParameters(
  parameters: CategoryParameters | undefined,
  lang: string,
): parameterTypes[] {
  if (!parameters) return [];

  const entries =
    ((lang === "ur" ? parameters.ur : parameters.en) ??
      parameters.en ??
      parameters.ur ??
      []) as Array<{ name?: string; values?: string[] } | string>;

  const mapped: parameterTypes[] = [];

  for (const entry of entries) {
    if (typeof entry === "string") {
      const name = entry.trim();
      if (name) mapped.push({ name, variants: [], options: [], isCustom: false });
      continue;
    }

    const name = entry?.name?.trim() ?? "";
    if (!name) continue;

    const variants = Array.isArray(entry?.values)
      ? entry.values.map((value) => String(value).trim()).filter(Boolean)
      : [];

    mapped.push({
      name,
      variants: [],
      options: [...variants],
      isCustom: false,
    });
  }

  return mapped;
}

function hasMissingParameterValues(parameters: parameterTypes[]): boolean {
  return parameters.some((parameter) => parameter.variants.length === 0);
}

function ListProduct() {
  const categoryRef = useRef<HTMLDivElement | null>(null);
  const locationRef = useRef<HTMLDivElement | null>(null);
  const { pages, placeholders, info_messages, error_messages, currentLanguage } =
    useDictionary();
  const [listProduct, { data, isLoading, isError, isSuccess, error }] =
    useListProductMutation();
  const [status, setStatus] = useState("form");
  const [createdData, setCreatedData] = useState<{ id: string }>({ id: "" });
  const tabs = ["photos_tab", "video_tab"];
  const [activeTab, setActiveTab] = useState<string>(tabs[0]);
  const [images, setImages] = useState<(File | string)[]>([]);
  const [video, setVideo] = useState<File | null | string>(null);

  const tabsComponents: { [key: string]: React.ReactNode } = {
    photos_tab: <ChooseImagesTab images={images} setImages={setImages} />,
    video_tab: <ChooseVideoTab video={video} setVideo={setVideo} />,
  };
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [description, setDescription] = useState("");
  const [type] = useState("classified");
  const [descriptionError, setDescriptionError] = useState("");
  const [isCatOpen, setIsCatOpen] = useState(false);
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const [isParametersModalOpen, setIsParametersModalOpen] = useState(false);
  const [parametersEditIndex, setParametersEditIndex] = useState<number | null>(
    null,
  );
  const [priceError, setPriceError] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<categroyTypes | null>(null);
  const [categoryError, setCategoryError] = useState("");
  const [selectedPrice, setSelectedPrice] = useState<priceTypes>({
    paymentType: "fixed",
    price: "",
  });

  const [parameters, setParameters] = useState<parameterTypes[]>([]);
  const [parameterError, setParameterError] = useState("");
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [location, setLocation] = useState<Location>({});
  const [address, setAddress] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [locationError, setLocationError] = useState("");
  const [city, setCity] = useState("");
  const [cityError, setCityError] = useState("");
  const [cityCoordinates, setCityCoordinates] = useState<LocationCoordinates>(null);
  const [area, setArea] = useState("");
  const [areaError, setAreaError] = useState("");
  const [debouncedLocationSearch] = useDebounce(locationSearch, 500);
  const id = useSearchParams().get("id") || "";
  const productType = useSearchParams().get("type") || "";
  const userId = typeof window !== "undefined" ? getCookie("userId") : "";
  const isShopListing = productType !== "personal";
  const isPersonalListing = productType === "personal";

  const {
    data: locationsData,
    isLoading: isLocationsLoading,
    isFetching: isLocationsFetching,
  } = useGetLocationsQuery(
    { q: debouncedLocationSearch },
    { skip: !isPersonalListing || locationSearch?.trim() === "" },
  );

  const { data: shop } = useGetShopDetailQuery(id, {
    skip: !id || !isShopListing,
  });

  const listingContextLabel = isShopListing
    ? shop?.data?.title || placeholders.shop
    : placeholders.private_listing;

  const isInitialCategoryRender = useRef(true);

  const { data: cityAreasData } = useGetCityAreasQuery(
    {
      city,
      ...(cityCoordinates
        ? { lat: String(cityCoordinates.lat), lng: String(cityCoordinates.lng) }
        : {}),
    },
    { skip: !isPersonalListing || !city },
  );

  const cityAreaOptions = useMemo(() => {
    const rows =
      (
        cityAreasData as
          | { data?: { name?: string; mainText?: string; description?: string }[] }
          | undefined
      )?.data ?? [];
    return rows
      .map((row) => ({
        name: row.name ?? row.mainText ?? row.description ?? "",
        subtitle: row.description,
        coordinates: null,
      }))
      .filter((option) => option.name);
  }, [cityAreasData]);

  useClickOutside(locationRef, () => {
    setIsLocationOpen(false);
  });

  useEffect(() => {
    if (isInitialCategoryRender.current) {
      isInitialCategoryRender.current = false;
      return;
    }

    if (!selectedCategory) {
      setParameters([]);
      setParameterError("");
      return;
    }

    setParameters(
      mapCategoryParametersToProductParameters(
        selectedCategory.parameters,
        currentLanguage,
      ),
    );
    setParameterError("");
  }, [selectedCategory, currentLanguage]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTitleError("");
    setDescriptionError("");
    setCategoryError("");
    setPriceError("");
    setParameterError("");
    setLocationError("");

    if (title === "") {
      setTitleError(error_messages.title_required);
    }
    if (description === "") {
      setDescriptionError(error_messages.description_required);
    }
    if (selectedCategory === null) {
      setCategoryError(error_messages.category_required);
    }
    if (selectedPrice.price === "") {
      setPriceError(error_messages.price_required);
    }
    const pointLocation = isPersonalListing ? toPointLocation(location) : null;
    if (isPersonalListing && !pointLocation) {
      setLocationError(error_messages.location_required);
    }
    if (isPersonalListing && !city.trim()) {
      setCityError(
        error_messages["city_required" as keyof typeof error_messages] ??
          "City is required*",
      );
    }
    if (isPersonalListing && !area.trim()) {
      setAreaError(
        error_messages["area_required" as keyof typeof error_messages] ??
          "Area is required*",
      );
    }
    if (parameters.length === 0) {
      setParameterError(error_messages.parameter_required);
    }
    if (hasMissingParameterValues(parameters)) {
      setParameterError(error_messages.parameter_value_required);
    }
    if (hasDuplicateParameterNames(parameters)) {
      setParameterError(error_messages.parameter_name_duplicate);
    }
    if (images?.length === 0) {
      toast.error(error_messages.image_required);
      return;
    }

    if (
      title !== "" &&
      description !== "" &&
      selectedCategory !== null &&
      selectedPrice.price !== "" &&
      (!isPersonalListing || (pointLocation && city.trim() && area.trim())) &&
      images?.length > 0 &&
      parameters.length > 0 &&
      !hasMissingParameterValues(parameters) &&
      !hasDuplicateParameterNames(parameters)
    ) {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", selectedCategory._id);
      formData.append("price", selectedPrice.price);
      formData.append("type", type);
      formData.append("video", video);
      if (isPersonalListing && pointLocation) {
        formData.append("location", JSON.stringify(pointLocation));
        formData.append("address", address);
        formData.append("city", city.trim());
        formData.append("area", area.trim());
      }
      if (parameters.length > 0) {
        formData.append("parameters", JSON.stringify(toApiParameters(parameters)));
      }

      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          formData.append("images", images[i]);
        }
      }

      listProduct({
        id: isPersonalListing ? userId : id,
        formData,
        type: isPersonalListing ? "personal" : "shop",
      });
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success(data?.message);
      const timer = setTimeout(() => {
        setStatus("success");
        setCreatedData(data?.data?.product);
      }, 800);

      return () => clearTimeout(timer);
    }
    if (isError && "data" in error) {
      setSelectedCategory(null);
      setSelectedPrice({ paymentType: "fixed", price: "" });
      setImages([]);
      setVideo(null);
      setTitle("");
      setDescription("");
      setParameters([]);
      setLocation({});
      setAddress("");
      setLocationSearch("");
      toast.error(
        (error?.data as { message?: string })?.message ||
        "something went wrong!"
      );
    }
  }, [isSuccess, isError, data, error]);
  return (
    <>
      <Modal
        editModalRef={categoryRef}
        open={isCatOpen}
        setOpen={setIsCatOpen}
        centered={false}
      >
        <div className=" h-full w-full flex justify-center pt-[80px]">
          <CategoryModal
            setIsCatOpen={setIsCatOpen}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            type="product"
          />
        </div>
      </Modal>
      <Modal
        editModalRef={categoryRef}
        open={isPriceOpen}
        setOpen={setIsPriceOpen}
        centered={false}
      >
        <div className=" h-full w-full flex justify-center pt-[80px]">
          <PriceModal
            selectedPrice={selectedPrice}
            setSelectedPrice={setSelectedPrice}
            setIsPriceOpen={setIsPriceOpen}

          // setIsCatOpen={setIsCatOpen}
          // selectedCategory={selectedCategory}
          // setSelectedCategory={setSelectedCategory}
          />
        </div>
      </Modal>
      <Modal
        editModalRef={categoryRef}
        open={isParametersModalOpen}
        setOpen={(open) => {
          setIsParametersModalOpen(open);
          if (!open) setParametersEditIndex(null);
        }}
        centered={true}
      >
        <div className="flex justify-center">
          <ParametersModal
            open={isParametersModalOpen}
            parameters={parameters}
            setParameters={setParameters}
            editIndex={parametersEditIndex}
            setEditIndex={setParametersEditIndex}
            setOpen={(open) => {
              setIsParametersModalOpen(open);
              if (!open) setParametersEditIndex(null);
            }}
          />
        </div>
      </Modal>
      <div className="h-full min-h-screen flex flex-col items-center">
        <div className="px-6 h-[61px] border-b-[1px] border-gray-9 bg-white w-full  flex justify-center">
          <div className="w-full   flex items-center gap-[6px] font-normal text-[14px] mt-5">
            <span className="text-gray-8">{pages.selling}</span>
            <Image
              src={chevron}
              alt="chevron"
              className="-rotate-90 rtl:rotate-90"
            />
            <span className="text-gray-8">{listingContextLabel}</span>
            <Image
              src={chevron}
              alt="chevron"
              className="-rotate-90 rtl:rotate-90"
            />
            <span className="text-green-1">{placeholders.sell_product}</span>
          </div>
        </div>
        {status === "success" ? (
          <ProductListed setStatus={setStatus} createdData={createdData} />
        ) : (
          <div className="md:flex w-full flex-1 ">
            <div className="w-full md:w-[46%] p-4 md:p-6 border-b md:border-r border-gray-9 ">
              <div>
                <Tabs
                  tabs={tabs}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
                {tabsComponents[activeTab]}
              </div>
              <div className="px-[6px] mt-[60px] py-2 rounded-[10px] gap-[10px] flex items-start bg-green-4">
                <Image src={cameraIcon} alt="cam_icon" />
                <h4 className="text-black-1 font-light text-[14px] w-[244px] leading-tight">
                  {info_messages.catch_your_buyer}
                </h4>
              </div>
            </div>
            <div className="w-full  md:w-[54%] p-4 md:px-6">
              <form
                onSubmit={handleSubmit}
                className={`w-full  md:max-w-[390px] 
             ${isLoading && "pointer-events-none"}
          `}
              >
                {/*  title */}
                <div className="space-y-1 mt-5 w-full">
                  <p
                    className={`text-[14px] font-normal  ${titleError ? "text-red-1" : "text-gray-8"
                      }`}
                  >
                    {placeholders.title}
                  </p>
                  <input
                    type="text"
                    value={title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTitle(e.target.value)
                    }
                    className="h-[28px] text-[15px] text-black-1 font-normal focus:outline-none w-full border-gray-9 border-b-[1px] "
                  />
                  {titleError && (
                    <p className="text-red-1 text-[14px] font-normal">
                      {titleError}
                    </p>
                  )}
                </div>
                {/* descripton */}
                <div className="space-y-1 mt-5 w-full">
                  <p
                    className={`text-[14px] font-normal  ${descriptionError ? "text-red-1" : "text-gray-8"
                      }`}
                  >
                    {info_messages?.describe_product}
                  </p>
                  <textarea
                    value={description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setDescription(e.target.value)
                    }
                    draggable={false}
                    className="h-[132px] resize-none text-[15px] text-black-1 font-normal focus:outline-none w-full border-gray-9 border-b-[1px] "
                  />
                  {descriptionError && (
                    <p className="text-red-1 text-[14px] font-normal">
                      {descriptionError}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between h-[40px] px-4 border-b-[1px] border-gray-9 opacity-60">
                  <h3 className="text-[15px] leading-none font-medium text-black-1">
                    {placeholders.type}
                  </h3>
                  <div className="flex items-center gap-2 cursor-not-allowed">
                    <h4 className="text-[15px] font-normal text-gray-8 leading-none">
                      {placeholders.classified}
                    </h4>
                    <Image
                      src={chevron}
                      alt="chevron"
                      className="-rotate-90 rtl:rotate-90 w-4 opacity-50"
                    />
                  </div>
                </div>
                <div className="bg-gray-12  mt-2  h-[27px] "></div>
                {/* category */}
                <div className="bg-white h-[50px] flex items-center justify-between border-b-[1px] border-gray-9  px-4">
                  <h3 className="text-[15px] font-medium text-black-1">
                    {placeholders.category}
                  </h3>
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setIsCatOpen(true)}
                  >
                    <h4 className="text-[15px] font-normal text-gray-8 leading-none">
                      {selectedCategory
                        ? getFeedCategoryLabel(selectedCategory.name, currentLanguage)
                        : placeholders.choose_category}
                    </h4>
                    <Image
                      src={chevron}
                      alt="chevron"
                      className="-rotate-90 rtl:rotate-90 w-4"
                    />
                  </div>
                </div>
                {categoryError && (
                  <p className="text-red-1 text-[14px] font-normal">
                    {categoryError}
                  </p>
                )}
                <ParameterTags
                  label={parameters.length > 0 ? placeholders.add_more : placeholders.add_parameter}
                  parameters={parameters}
                  onClick={(parameterIndex) => {
                    setParametersEditIndex(parameterIndex);
                    setIsParametersModalOpen(true);
                  }}
                />
                {parameterError && (
                  <p className="text-red-1 text-[14px] font-normal">
                    {parameterError}
                  </p>
                )}
                {isPersonalListing ? (
                  <>
                    {/* A shop's products take the shop's city and area; a
                        private listing has to say where it is itself. */}
                    <div className="bg-white px-4 pb-4">
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
                        types="(regions)"
                        city={city}
                        initialOptions={cityAreaOptions}
                        near={cityCoordinates}
                        withCoordinates={false}
                        allowCustom
                        onSelect={(option) => {
                          setArea(option.name);
                          setAreaError("");
                        }}
                      />
                    </div>
                    <div className="relative border-b-[1px] border-gray-9 bg-white px-4" ref={locationRef}>
                      <div
                        className="flex min-h-[50px] cursor-pointer items-start justify-between gap-3 py-3"
                        onClick={() => setIsLocationOpen((prev) => !prev)}
                      >
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-medium leading-tight text-black-1">
                            {placeholders.choose_location}
                          </h3>
                          <p className="mt-1 break-words text-[14px] font-normal leading-snug text-gray-8">
                            {location?.description
                              ? location.description
                              : placeholders.select_your_location}
                          </p>
                        </div>
                        <Image
                          src={chevron}
                          alt="chevron"
                          className="mt-1 w-4 shrink-0 -rotate-90 rtl:rotate-90"
                        />
                      </div>
                      {isLocationOpen ? (
                        <div className="absolute left-0 right-0 top-full z-20 bg-white pb-2 pt-1">
                          <input
                            type="text"
                            placeholder={placeholders.search_country}
                            className="w-full rounded-md border border-gray-200 px-4 py-2 text-sm font-light outline-none"
                            value={locationSearch}
                            onChange={(e) => setLocationSearch(e.target.value)}
                          />
                          <div className="mt-2 max-h-[250px] overflow-scroll rounded-md border border-gray-200 shadow-md hide-scrollbar">
                            {!isLocationsLoading &&
                              !isLocationsFetching &&
                              (locationsData?.data?.length ?? 0) > 0 &&
                              locationsData?.data?.map((item: Location, index: number) => (
                                <div
                                  key={`${item.description}-${index}`}
                                  onClick={() => {
                                    setLocation(item);
                                    setAddress(item.description?.trim() ?? "");
                                    setIsLocationOpen(false);
                                    setLocationSearch("");
                                    setLocationError("");
                                  }}
                                  className="cursor-pointer px-4 py-2 text-[15px] font-light text-gray-8 hover:bg-gray-100"
                                >
                                  <div className="flex items-start gap-2">
                                    <Image
                                      src={locationIcon}
                                      alt=""
                                      className="mt-0.5 h-[18px] w-[14px] shrink-0"
                                    />
                                    <h2 className="min-w-0 break-words">{item.description}</h2>
                                  </div>
                                </div>
                              ))}
                            {!isLocationsLoading &&
                              !isLocationsFetching &&
                              locationsData?.data?.length === 0 && (
                                <div className="px-4 py-2 text-[15px] font-light text-gray-8">
                                  {placeholders.no_locations_found}
                                </div>
                              )}
                            {(isLocationsLoading || isLocationsFetching) && (
                              <div className="w-full space-y-1">
                                {Array.from({ length: 5 }).map((_, index) => (
                                  <div
                                    key={index}
                                    className="h-[40px] animate-pulse bg-gray-100"
                                  />
                                ))}
                              </div>
                            )}
                            {!locationsData &&
                              !isLocationsLoading &&
                              !isLocationsFetching && (
                                <div className="px-4 py-2 text-[15px] font-light text-gray-8">
                                  {placeholders.no_locations_found}
                                </div>
                              )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {locationError && (
                      <p className="text-red-1 text-[14px] font-normal">
                        {locationError}
                      </p>
                    )}

                  </>
                ) : null}
                <div className="bg-gray-12   h-[27px] "></div>
                {/* price */}
                <div className="bg-white h-[50px] flex items-center justify-between px-4">
                  <h3 className="text-[15px] font-medium text-black-1">
                    {placeholders.price}
                  </h3>
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setIsPriceOpen(true)}
                  >
                    <h4 className="text-[15px] font-normal text-gray-8 leading-none">
                      {selectedPrice?.price + "-/" + (placeholders?.[selectedPrice?.paymentType as keyof typeof placeholders] ?? "Fixed")}
                    </h4>
                    <Image
                      src={chevron}
                      alt="chevron"
                      className="-rotate-90 rtl:rotate-90 w-4"
                    />
                  </div>
                </div>
                {priceError && (
                  <p className="text-red-1 text-[14px] font-normal">
                    {priceError}
                  </p>
                )}

                <DoodleButton
                  type="submit"
                  disabled={isLoading}
                  className="mt-3   h-[46px] w-full rounded-[12px] text-white font-medium text-[16px]  bg-green-1 cursor-pointer"
                >
                  {isLoading ? (
                    <BeatLoader color="white" size={8} />
                  ) : (
                    placeholders.upload
                  )}
                </DoodleButton>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default ListProduct;
