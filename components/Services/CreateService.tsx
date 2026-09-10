"use client";
import React, { useEffect, useRef, useState } from "react";
import chevron from "@/assets/icons/chev-down-icon.svg";
import Image from "next/image";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import Tabs from "../Ui/Tabs";
import ChooseImagesTab from "./ChooseImagesTab";
import ChooseVideoTab from "./ChooseVideoTab";
import cameraIcon from "@/assets/icons/camera-icon.svg";
import reachMoreCustomerIcon from "@/assets/icons/reach-more-customer.svg";
import secureReliableIcon from "@/assets/icons/secure-reliable.svg";
import growBusinessImage from "@/assets/icons/grow-business.svg";
import { BeatLoader } from "react-spinners";
import Modal from "../Ui/Modals/Modal";
import DoodleButton from "@/components/Ui/DoodleButton";
import CategoryModal, {
  categroyTypes,
  mapCategoryParametersToListingParameters,
} from "./CategoryModal";
import PriceModal, { priceTypes } from "./PriceModal";
import {
  parameterTypes,
  hasDuplicateParameterNames,
  isParameterSatisfied,
  toApiParameters,
} from "../Selling/ParametersModal";
import ParametersModal from "../Selling/ParametersModal";
import ParameterTags from "../Selling/ParameterTags";
import {
  useAddServiceMutation,
  useGetUserServiceQuery,
} from "@/store/services/sellingService";
import toast from "react-hot-toast";
import ServiceCreated from "./ServiceCreated";
import { getCookie } from "cookies-next";
import { getFeedCategoryLabel } from "@/utils/getFeedCategoryLabel";

function CreateService() {
  const categoryRef = useRef<HTMLDivElement | null>(null);
  const isInitialCategoryRender = useRef(true);

  const { pages, placeholders, info_messages, error_messages, currentLanguage } =
    useDictionary();

  const [addService, { data, isLoading, isError, isSuccess, error }] =
    useAddServiceMutation();

  const [status, setStatus] = useState("form");
  const [createdData, setCreatedData] = useState<any>(null);
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
      mapCategoryParametersToListingParameters(
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
    if (parameters.length === 0) {
      setParameterError(error_messages.parameter_required);
    }
    if (parameters.some((parameter) => !isParameterSatisfied(parameter))) {
      setParameterError(error_messages.parameter_value_required);
    }
    if (hasDuplicateParameterNames(parameters)) {
      setParameterError(error_messages.parameter_name_duplicate);
    }
    // if (video === null || video === "") {
    //   toast.error(error_messages.video_required);
    //   return;
    // }
    if (images?.length === 0) {
      toast.error(error_messages.image_required);
      return;
    }

    if (
      title !== "" &&
      description !== "" &&
      selectedCategory !== null &&
      selectedPrice.price !== "" &&
      images.length > 0 &&
      parameters.length > 0 &&
      parameters.some((parameter) => parameter.variants.length > 0) &&
      !hasDuplicateParameterNames(parameters)
      //  &&
      // video !== null &&
      // video !== ""
    ) {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", selectedCategory._id);
      formData.append("price", selectedPrice.price);
      formData.append("paymentType", selectedPrice.paymentType);
      // A dependent parameter with nothing configured for the chosen parent
      // value counts as satisfied but has no variant to report — drop it
      // rather than send an empty one.
      const filledParameters = parameters.filter((p) => p.variants.length > 0);
      if (filledParameters.length > 0) {
        formData.append("parameters", JSON.stringify(toApiParameters(filledParameters)));
      }
      if (video !== null) {
        formData.append("video", video);
      }
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          formData.append("images", images[i]);
        }
      }
      addService(formData);
    }
  };
  useEffect(() => {
    if (isSuccess) {
      toast.success(data?.message);
      const timer = setTimeout(() => {
        setStatus("success");
        console.log(data, "data");
        setCreatedData({ title: title, price: selectedPrice.price, image: images[0] });
      }, 500);

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
      toast.error(
        (error?.data as { message?: string })?.message ||
        "something went wrong!"
      );
    }
  }, [isSuccess, isError, data, error]);
  console.log(selectedPrice, "selectedPrice");
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
            type="service"
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
            type="service"

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
            <span className="text-gray-8">{pages.services}</span>
            <Image
              src={chevron}
              alt="chevron"
              className="-rotate-90 rtl:rotate-90"
            />
            <span className="text-green-1">{placeholders.create_service}</span>
          </div>
        </div>
        {status === "success" ? (
          <ServiceCreated createData={createdData} />
        ) : (
          <div className="md:flex w-full flex-1">
            <div className="md:w-[46%] p-4 md:p-6 border-b md:border-r border-gray-9 ">
              {/* target */}
              <div className="mb-4 overflow-hidden rounded-[10px] bg-[rgb(245,249,248)] sm:mb-5 sm:rounded-[12px] xl:mb-6">
                <div className="flex items-end justify-between gap-2 pr-2 sm:gap-3 sm:pr-3 xl:gap-4 xl:pr-4 rtl:pl-2 sm:rtl:pl-3 xl:rtl:pl-4">
                  <div className="min-w-0 flex-1 space-y-2 pb-2 pl-3 pt-3 sm:space-y-2.5 sm:pl-4 sm:pt-4 xl:space-y-3 rtl:pr-3 sm:rtl:pr-4">
                    <div>
                      <h3 className="text-[13px] font-medium text-[#030303] sm:text-[14px] xl:text-[14px]">
                        {info_messages.grow_your_business}
                      </h3>
                      <p className="mt-0.5 max-w-full text-[10px] leading-tight text-[#4B514F] sm:mt-1 sm:max-w-[180px] sm:text-[11px] md:max-w-[195px] xl:mt-0 xl:w-[206px] xl:text-[11px]">
                        {info_messages.list_services_sell_customers}
                      </p>
                    </div>
                    <ul className="space-y-1 sm:space-y-1.5 xl:space-y-1.5">
                      <li className="flex items-center gap-2 sm:gap-2.5 xl:gap-2.5">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#DFF2EC] sm:h-5 sm:w-5 xl:h-5 xl:w-5">
                          <Image
                            src={reachMoreCustomerIcon}
                            alt=""
                            className="h-[10px] w-[10px] sm:h-3 sm:w-3 xl:h-3 xl:w-3"
                          />
                        </span>
                        <span className="text-[10px] text-[#001907] sm:text-[11px] xl:text-[11px]">
                          {info_messages.reach_more_customers}
                        </span>
                      </li>
                      <li className="flex items-center gap-2 sm:gap-2.5 xl:gap-2.5">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#DFF2EC] sm:h-5 sm:w-5 xl:h-5 xl:w-5">
                          <Image
                            src={secureReliableIcon}
                            alt=""
                            className="h-[10px] w-[10px] sm:h-3 sm:w-3 xl:h-3 xl:w-3"
                          />
                        </span>
                        <span className="text-[10px] text-[#001907] sm:text-[11px] xl:text-[11px]">
                          {info_messages.secure_and_reliable}
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="relative h-[88px] w-[108px] shrink-0 sm:h-[110px] sm:w-[150px] md:h-[120px] md:w-[170px] xl:h-[130px] xl:w-[195px]">
                    <Image
                      src={growBusinessImage}
                      alt=""
                      fill
                      unoptimized
                      className="object-contain object-bottom object-right"
                    />
                  </div>
                </div>
              </div>
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
            <div className="md:w-[54%] p-4 md:px-6">
              <form
                onSubmit={handleSubmit}
                className={`w-full  max-w-[390px] 
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
                    {placeholders.describe_service}
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
                <div className="bg-gray-12 border-t-[1px] border-gray-9 mt-2  h-[27px] "></div>
                {/* category */}
                <div className="bg-white h-[50px] flex items-center justify-between px-4">
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
                  lockedHint={placeholders.choose_parameter_first}
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
                <div className="bg-gray-12 border-t-[1px] border-gray-9   h-[27px] "></div>
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
                      {selectedPrice?.paymentType === "call_for_price"
                        ? placeholders.call_for_price
                        : selectedPrice?.price}
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

export default CreateService;
