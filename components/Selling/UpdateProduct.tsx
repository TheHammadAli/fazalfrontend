"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  mapCategoryParametersToListingParameters,
  hydrateListingParametersFromApi,
} from "../Services/CategoryModal";
import PriceModal, { priceTypes } from "../Services/PriceModal";
import {
  useDeleteProductMediaMutation,
  useUpdateProductMutation,
} from "@/store/services/sellingService";
import toast from "react-hot-toast";
import {
  parameterTypes,
  hasDuplicateParameterNames,
  isParameterSatisfied,
  toApiParameters,
} from "./ParametersModal";
import ParametersModal from "./ParametersModal";
import ParameterTags from "./ParameterTags";
import { useSearchParams } from "next/navigation";
import ProductListed from "./ProductListed";
import { useGetProductDetailQuery } from "@/store/services/homeService";
import { useRouter } from "next/navigation";
import { getUserId } from "@/utils/getUserId";
import { getFeedCategoryLabel } from "@/utils/getFeedCategoryLabel";
import { useCategoriesQuery } from "@/custom-hooks/useCategoriesQuery";

function UpdateProduct() {
  const router = useRouter();
  const categoryRef = useRef<HTMLDivElement | null>(null);
  const { pages, placeholders, info_messages, error_messages, currentLanguage } =
    useDictionary();
    const [setUpdatedData, setSetUpdatedData] = useState<{ id: string }>({ id: "" });
  const userId = getUserId() ?? "";
  const [updateProduct, { data, isLoading, isError, isSuccess, error }] =
    useUpdateProductMutation();
  const id = useSearchParams().get("id") || "";
  const [
    deleteProductMedia,
    { isLoading: isDeleting, error: deleteError, data: deleteData },
  ] = useDeleteProductMediaMutation();
  const [deleteMedia, setDeleteMedia] = useState<string[]>([]);
  const { data: product, isSuccess: productSuccess } = useGetProductDetailQuery(
    { id: id, userId: userId },
    {
      skip: !id,
    }
  );

  const productData = product?.data;
  const { data: categoriesData } = useCategoriesQuery({ type: "product" });
  const [status, setStatus] = useState("form");
  const [createdData, setCreatedData] = useState<{ id: string }>({ id: "" });
  const tabs = ["photos_tab", "video_tab"];
  const [activeTab, setActiveTab] = useState<string>(tabs[0]);

  const [images, setImages] = useState<(File | string)[]>([]);
  const [video, setVideo] = useState<File | null | string>(null);

  const tabsComponents: { [key: string]: React.ReactNode } = {
    photos_tab: (
      <ChooseImagesTab
        images={images}
        setImages={setImages}
        deleteMedia={deleteMedia}
        setDeleteMedia={setDeleteMedia}
      />
    ),
    video_tab: <ChooseVideoTab video={video} setVideo={setVideo} />,
  };

  const [title, setTitle] = useState(productData?.title || "");
  const [titleError, setTitleError] = useState("");
  const [description, setDescription] = useState(
    productData?.description || ""
  );
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
  const loadedCategoryIdRef = useRef<string | null>(null);
  const hasLoadedProductRef = useRef(false);
  const hasHydratedWithCategoryParamsRef = useRef(false);

  // A shop's listing belongs to the shop's category and an edit can't move it
  // out — the same rule the create form applies, and the one the server
  // enforces. A private listing keeps its free choice.
  // `shopId` arrives as the populated shop row on a shop listing, and as
  // nothing at all on a personal one.
  const shopCategoryId: string =
    productData?.shopId?.categoryId ||
    productData?.shopId?.category?._id ||
    productData?.shopId?.category?.id ||
    "";

  const lockedShopCategory = useMemo(() => {
    if (!shopCategoryId) return null;
    // Nothing to lock to when the shop is filed under something that isn't a
    // product category — the server stands aside there too, so the picker
    // stays available rather than leaving the listing uneditable.
    const list = (categoriesData?.data ?? []) as categroyTypes[];
    return (
      list.find(
        (category) =>
          (category._id ?? (category as { id?: string }).id) === shopCategoryId,
      ) ?? null
    );
  }, [shopCategoryId, categoriesData?.data]);

  const lockedCategoryLabel = lockedShopCategory
    ? getFeedCategoryLabel(lockedShopCategory.name, currentLanguage)
    : "";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
    if (images?.length === 0) {
      toast.error(error_messages.image_required);
      return;
    }
    // if (video === null || video === "") {
    //   toast.error(error_messages.video_required);
    //   return;
    // }

    if (
      title !== "" &&
      description !== "" &&
      selectedCategory !== null &&
      selectedPrice.price !== "" &&
      // video !== null &&
      // video !== ""
      //  &&
      images?.length > 0 &&
      parameters.length > 0 &&
      parameters.every((parameter) => isParameterSatisfied(parameter)) &&
      !hasDuplicateParameterNames(parameters)
    ) {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", selectedCategory._id);
      formData.append("price", selectedPrice.price);
      formData.append("type", type);
      if (video && typeof video !== "string") {
        formData.append("video", video);
      }
      // A dependent parameter with nothing configured for the chosen parent
      // value counts as satisfied but has no variant to report — drop it
      // rather than send an empty one.
      const filledParameters = parameters.filter((p) => p.variants.length > 0);
      if (filledParameters.length > 0) {
        formData.append("parameters", JSON.stringify(toApiParameters(filledParameters)));
      }
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          if (typeof images[i] !== "string") {
            formData.append("images", images[i]);
          }
        }
      }
      if (deleteMedia.length > 0) {
        await deleteProductMedia({ id, body: { media: deleteMedia } });
      }
      await updateProduct({ id, formData });
    }
  };
  useEffect(() => {
    if (isSuccess) {
      toast.success(data?.message);
      const timer = setTimeout(() => {
        router.back();
      }, 1500);
      return () => clearTimeout(timer);
    }
    if (isError && error) {
      // FetchBaseQueryError has no "data" key for network/timeout failures
      // (only {status, error}) — checking "data" alone let those fail silently.
      const message =
        "data" in error
          ? (error.data as { message?: string })?.message
          : "error" in error
            ? String(error.error)
            : undefined;
      toast.error(message || "something went wrong!");
    }
  }, [isSuccess, isError, data, error]);

  useEffect(() => {
    if (!product?.data) return;

    const prouductData = product.data;
    const categoryId = prouductData?.category?._id;
    const fullCategoryFromList = categoriesData?.data?.find(
      (category: categroyTypes) => category._id === categoryId,
    ) as categroyTypes | undefined;
    const resolvedCategory =
      fullCategoryFromList ?? prouductData?.category ?? null;
    const hasCategoryParams = Boolean(
      resolvedCategory?.parameters &&
        ((resolvedCategory.parameters.en?.length ?? 0) > 0 ||
          (resolvedCategory.parameters.ur?.length ?? 0) > 0),
    );

    // First hydrate from product detail (and again once full category params arrive)
    if (
      !hasLoadedProductRef.current ||
      (hasCategoryParams && !hasHydratedWithCategoryParamsRef.current)
    ) {
      if (!hasLoadedProductRef.current) {
        setTitle(prouductData?.title ?? "");
        setDescription(prouductData?.description ?? "");
        setSelectedPrice((prev) => ({
          ...prev,
          price: prouductData?.price ?? "",
        }));
        setVideo(prouductData?.video ?? null);
        setImages(prouductData?.images ?? []);
        hasLoadedProductRef.current = true;
      }

      setSelectedCategory(resolvedCategory);
      setParameters(
        hydrateListingParametersFromApi(
          prouductData?.parameters,
          resolvedCategory,
          currentLanguage,
        ),
      );
      loadedCategoryIdRef.current = resolvedCategory?._id ?? null;

      if (hasCategoryParams) {
        hasHydratedWithCategoryParamsRef.current = true;
      }
    }
  }, [product?.data, productSuccess, currentLanguage, categoriesData?.data]);

  // Declared after the hydration effect on purpose: both fire in the same
  // commit once the category list lands, and this one has to be the last word.
  // A listing that predates the rule is moved into its shop's category here,
  // which the row and the note under it show before anything is saved.
  useEffect(() => {
    if (!lockedShopCategory) return;
    setSelectedCategory(lockedShopCategory);
  }, [lockedShopCategory, product?.data, categoriesData?.data]);

  useEffect(() => {
    if (!hasLoadedProductRef.current) return;

    if (!selectedCategory) {
      // Avoid wiping API params while category state catches up after product load
      if (loadedCategoryIdRef.current !== null) return;
      setParameters([]);
      setParameterError("");
      return;
    }

    const categoryId = selectedCategory._id;
    if (categoryId === loadedCategoryIdRef.current) return;

    // User changed category after initial load — reset to that category's params
    loadedCategoryIdRef.current = categoryId;
    setParameters(
      mapCategoryParametersToListingParameters(
        selectedCategory.parameters,
        currentLanguage,
      ),
    );
    setParameterError("");
  }, [selectedCategory, currentLanguage]);

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
            <span className="text-gray-8">{placeholders.private_listing}</span>
            <Image
              src={chevron}
              alt="chevron"
              className="-rotate-90 rtl:rotate-90"
            />
            <span className="text-green-1">{placeholders.edit_product}</span>
          </div>
        </div>
        {status === "success" ? (
          <ProductListed setStatus={setStatus} />
        ) : (
          <div className="md:flex w-full flex-1">
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
            <div className="w-full md:w-[54%] p-4 md:px-6">
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
                  {lockedShopCategory ? (
                    <h4 className="text-[15px] font-normal text-gray-8 leading-none">
                      {lockedCategoryLabel}
                    </h4>
                  ) : (
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
                  )}
                </div>
                {lockedShopCategory ? (
                  <p className="px-4 pt-1 text-[13px] font-normal text-gray-8">
                    {(
                      info_messages.shop_category_locked ??
                      "This shop lists {category} items only"
                    ).replace("{category}", lockedCategoryLabel)}
                  </p>
                ) : null}
                {categoryError && (
                  <p className="text-red-1 text-[14px] font-normal">
                    {categoryError}
                  </p>
                )}
                <ParameterTags
                  label={
                    parameters.length > 0
                      ? placeholders.add_more
                      : placeholders.add_parameter
                  }
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
                      {
                        selectedPrice?.price
                        //  +
                        // "-/" +
                        // placeholders?.[
                        //   selectedPrice?.paymentType as keyof typeof placeholders
                        // ]
                      }
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
                  disabled={isLoading || isDeleting}
                  className="mt-3   h-[46px] w-full rounded-[12px] text-white font-medium text-[16px]  bg-green-1 cursor-pointer"
                >
                  {isLoading || isDeleting ? (
                    <BeatLoader color="white" size={8} />
                  ) : (
                    placeholders.update
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

export default UpdateProduct;
