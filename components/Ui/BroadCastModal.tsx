import React, { useEffect, useRef, useState } from "react";
import chevDown from "@/assets/icons/chev-down-icon.svg";
import crossIcon from "@/assets/icons/cross-icon.svg";
import chooseLocationIcon from "@/assets/icons/choose-location-icon.svg";
import setRadiusIcon from "@/assets/icons/set-radius-icon.svg";
import selectTypeIcon from "@/assets/icons/select-type-icon.svg";
import chooseCatIcon from "@/assets/icons/choose-cat-icon.svg";
import addPhotoIcon from "@/assets/icons/add-photo-icom.svg";
import broadcastMicSec from "@/assets/icons/mic-section.svg";
import broadcastMembers from "@/assets/icons/broadcast-members.svg";
import safeAndSecureIcon from "@/assets/icons/safe-and-secure.svg";
import messageSentGif from "@/assets/Gif/message-sent.gif";
import Image, { type StaticImageData } from "next/image";
import { Plus } from "lucide-react";
import { useCategoriesQuery } from "@/custom-hooks/useCategoriesQuery";
import { toast } from "react-hot-toast";
import { useBroadcastMessageMutation } from "@/store/services/chatService";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { getFeedCategoryLabel } from "@/utils/getFeedCategoryLabel";
import ChooseImagesTab from "@/components/Services/ChooseImagesTab";
import DoodleButton from "@/components/Ui/DoodleButton";
import LocationSelect, { type LocationCoordinates } from "@/components/Ui/LocationSelect";
import { PAKISTAN_CITY_OPTIONS } from "@/assets/content/locations";
import { createPortal } from "react-dom";

type CategoryItem = {
    _id: string;
    name: string;
};
type BroadcastType = "product" | "service";
type BroadcastPurpose = "buying" | "selling";

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

const FIELD_ROW_LABEL_CLASS = "text-[14px] font-medium text-[#030303] leading-tight";
const FIELD_PLACEHOLDER_CLASS = "text-[14px] font-normal text-[#4B514F] first-letter:uppercase";
const FIELD_VALUE_CLASS = "text-[14px] font-normal text-[#030303] first-letter:uppercase";
const DROPDOWN_PANEL_CLASS =
    "absolute left-0 right-0 top-full z-20 mt-1 max-h-[200px] overflow-y-auto rounded-[8px] border border-gray-9 bg-white shadow-md hide-scrollbar";

const MAX_BROADCAST_PHOTOS = 5;
const PURPOSE_OPTIONS: { value: BroadcastPurpose; labelKey: "selling" | "buying" }[] = [
    { value: "selling", labelKey: "selling" },
    { value: "buying", labelKey: "buying" },
];
const NO_BUYERS_MESSAGES = [
    "دیے گئے دائرے میں کوئی خریدار نہیں ملا",
    "No buyers found in given radius",
];

type BroadcastFieldRowProps = {
    icon?: StaticImageData;
    label: string;
    value?: string | null;
    placeholder: string;
    onClick: () => void;
    disabled?: boolean;
};

function BroadcastFieldRow({
    icon,
    label,
    value,
    placeholder,
    onClick,
    disabled,
}: BroadcastFieldRowProps) {
    const hasValue = Boolean(value);

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex w-full cursor-pointer items-center gap-3 py-2 text-left disabled:cursor-not-allowed"
        >
            {icon ? (
                <Image src={icon} alt="" className="h-5 w-5 shrink-0" />
            ) : (
                <span className="h-5 w-5 shrink-0" aria-hidden />
            )}
            <div className="min-w-0 flex-1 rtl:text-right">
                <p className={FIELD_ROW_LABEL_CLASS}>{label}</p>
                <p className={hasValue ? FIELD_VALUE_CLASS : FIELD_PLACEHOLDER_CLASS}>
                    {hasValue ? value : placeholder}
                </p>
            </div>
            <Image src={chevDown} alt="" className="h-3 w-3 shrink-0" />
        </button>
    );
}

function BroadCastModal({ setOpenBroadcast }: { setOpenBroadcast: (open: boolean) => void }) {
    const { placeholders, error_messages, info_messages, currentLanguage } = useDictionary();
    type PlaceholderKey = keyof typeof placeholders;
    type ErrorKey = keyof typeof error_messages;
    const ph = (key: PlaceholderKey) => placeholders[key];
    const eh = (key: ErrorKey) => error_messages[key];
    const [isRadiusOpen, setIsRadiusOpen] = useState(false);
    const [selectedRadius, setSelectedRadius] = useState<number | null>(null);
    const [isTypeOpen, setIsTypeOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<BroadcastType | null>(null);
    const [isPurposeOpen, setIsPurposeOpen] = useState(false);
    const [selectedPurpose, setSelectedPurpose] = useState<BroadcastPurpose | null>(null);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
    const [location, setLocation] = useState<Location>({});
    const [address, setAddress] = useState("");
    // City narrows the Area search (and biases it via `near`); Area is what
    // actually resolves to the point sent as `location` — same City->Area
    // cascade as CreateShop.tsx, reused here via the same LocationSelect.
    const [city, setCity] = useState("");
    const [area, setArea] = useState("");
    const [cityCoordinates, setCityCoordinates] = useState<LocationCoordinates>(null);
    const { data: categories, isLoading: isCategoriesLoading, isFetching: isCategoriesFetching } =
        useCategoriesQuery(
            { type: selectedType ?? undefined },
            { skip: !selectedType },
        );
    const [message, setMessage] = useState("");
    const [images, setImages] = useState<(File | string)[]>([]);
    const photoInputRef = useRef<HTMLInputElement | null>(null);
    const [broadcastMessage, { isLoading: isBroadcastLoading }] = useBroadcastMessageMutation();
    const [showSentSuccess, setShowSentSuccess] = useState(false);
    const [successDescription, setSuccessDescription] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        setSelectedCategory(null);
        setIsCategoryOpen(false);
    }, [selectedType]);

    // Selling only makes sense for products — a service is something you
    // perform for a buyer, not resell to one. Drop a stale "selling" pick
    // the moment the user switches to Service.
    const purposeOptions =
        selectedType === "service"
            ? PURPOSE_OPTIONS.filter((option) => option.value !== "selling")
            : PURPOSE_OPTIONS;

    // Buying is the only valid purpose for a service, so pick it automatically
    // instead of making the user open that picker too. A product has both
    // options, so it stays a manual choice — clear any value carried over
    // from a previous Service selection.
    useEffect(() => {
        if (selectedType === "service") {
            setSelectedPurpose("buying");
        } else if (selectedType === "product") {
            setSelectedPurpose(null);
        }
    }, [selectedType]);

    const buildSentDescription = () => {
        const categoryName = selectedCategory?.name?.trim() || "";
        const locationName = location?.description?.trim() || "";
        const isBuying = selectedPurpose === "buying";
        const template = isBuying
            ? ph("broadcast_sent_buying")
            : ph("broadcast_sent_selling");

        return template
            .replace("{category}", categoryName)
            .replace("{location}", locationName);
    };

    const handlePhotoUpload = (fileList: FileList | null) => {
        if (!fileList?.length) return;
        const selectedFiles = Array.from(fileList).filter((file) =>
            file.type.startsWith("image/"),
        );
        if (!selectedFiles.length) return;
        setImages((prev) => [...prev, ...selectedFiles].slice(0, MAX_BROADCAST_PHOTOS));
    };

    const handleSendMessage = async () => {
        if (selectedRadius === null) {
            toast.error(eh("radius_required"));
            return;
        }
        const pointLocation = toPointLocation(location);
        if (!pointLocation) {
            toast.error(eh("location_required"));
            return;
        }
        if (selectedType === null) {
            toast.error(eh("type_required"));
            return;
        }
        if (selectedPurpose === null) {
            toast.error(eh("purpose_required"));
            return;
        }
        if (selectedCategory === null) {
            toast.error(eh("category_required"));
            return;
        }

        if (message.trim() === "") {
            toast.error(eh("message_required"));
            return;
        }

        const purposePayload =
            selectedPurpose.charAt(0).toUpperCase() + selectedPurpose.slice(1);

        const imageFiles = images.filter((img): img is File => img instanceof File);

        const payload =
            imageFiles.length > 0
                ? (() => {
                    const fd = new FormData();
                    fd.append("type", selectedType);
                    fd.append("purpose", purposePayload);
                    fd.append("message", message.trim());
                    fd.append("radius", String(selectedRadius));
                    fd.append("categoryId", selectedCategory._id);
                    fd.append("location", JSON.stringify(pointLocation));
                    fd.append("address", address);
                    imageFiles.forEach((file) => fd.append("files", file));
                    return fd;
                })()
                : {
                    type: selectedType,
                    purpose: purposePayload,
                    message: message.trim(),
                    radius: selectedRadius,
                    categoryId: selectedCategory._id,
                    location: pointLocation,
                    address,
                };

        try {
            const res = await broadcastMessage(payload).unwrap();
            const apiMessage =
                typeof res?.message === "string" ? res.message : "";
            const isNoBuyers = NO_BUYERS_MESSAGES.includes(apiMessage);

            if (isNoBuyers) {
                toast.error(apiMessage);
                return;
            }

            setSuccessDescription(buildSentDescription());
            setShowSentSuccess(true);
        } catch (error) {
            toast.error((error as { data?: { message?: string } })?.data?.message || eh("something_went_wrong"));
        }
    };

    return (
        <>
            {mounted &&
                showSentSuccess &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[80] flex items-center justify-center bg-[#1E1E1E]/40 px-4"
                        role="dialog"
                        aria-label={ph("broadcast_sent_title")}
                        onClick={() => {
                            setShowSentSuccess(false);
                            setOpenBroadcast(false);
                        }}
                    >
                        <div
                            className="flex h-[267px] w-full max-w-[360px] flex-col items-center justify-center overflow-hidden rounded-[12px] bg-gradient-to-b from-[#C8EDE8] via-[#E8F7F4] to-white px-6 py-8 text-center shadow-lg xl:w-[360px]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Image
                                src={messageSentGif}
                                alt=""
                                width={66}
                                height={66}
                                unoptimized
                                className="mx-auto h-[66px] w-[66px] object-contain"
                            />
                            <h3 className="mt-1 text-[22px] font-medium text-[#030303]">
                                {ph("broadcast_sent_title")}
                            </h3>
                            <p className="mt-1 text-[14px] font-normal leading-snug text-[#4B514F]">
                                {successDescription || ph("broadcast_sent_description")}
                            </p>
                        </div>
                    </div>,
                    document.body,
                )}

            <div className="w-full max-w-[514px] overflow-hidden rounded-[12px] bg-white">


                <div className="flex items-center justify-between border-b border-gray-9 px-5 py-4">
                    <h2 className="text-[16px] font-semibold text-black-1">{ph("broadcast_message_title")}</h2>
                    <button
                        onClick={() => setOpenBroadcast(false)}
                        disabled={isBroadcastLoading}
                        type="button"
                        className="cursor-pointer text-[#111827] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Image src={crossIcon} alt="cross-icon" className="w-3 h-3" />
                    </button>
                </div>
                <div className=" bg-[#F2F9F3]  px-4">
                    <div className="h-full  flex items-center justify-between gap-3  ">
                        <div className="min-w-0 flex-1">
                            <h3 className="text-[14px] font-medium lg:w-[220px] leading-snug text-[#030303] rtl:text-right ">
                                {info_messages.broadcast_modal_banner}
                            </h3>
                            <Image
                                src={broadcastMembers}
                                alt=""
                                unoptimized
                                className="mt-2 h-[28px] w-auto max-w-[132px] object-contain object-left rtl:object-right"
                            />
                        </div>
                        <Image
                            src={broadcastMicSec}
                            alt=""
                            width={199}
                            height={136}
                            unoptimized
                            className=" h-full w-[150px] sm:w-[200px]"
                        />

                    </div>
                </div>

                <div className={`space-y-2  py-3 ${isBroadcastLoading ? "pointer-events-none opacity-70" : ""}`}>
                    <div className="px-5">
                        <div className="px-2">
                            <div className="flex items-start gap-2">
                                <Image src={chooseLocationIcon} alt="" className="mt-6 h-5 w-5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <LocationSelect
                                        label={info_messages.city ?? "City"}
                                        value={city}
                                        initialOptions={PAKISTAN_CITY_OPTIONS}
                                        types="(cities)"
                                        placeholder={ph("select_your_location")}
                                        disabled={isBroadcastLoading}
                                        onSelect={(option) => {
                                            setCity(option.name);
                                            setCityCoordinates(option.coordinates ?? null);
                                            setArea("");
                                            setLocation({});
                                            setAddress("");
                                        }}
                                    />
                                    <LocationSelect
                                        label={info_messages.area ?? "Area"}
                                        value={area}
                                        disabled={isBroadcastLoading || !city}
                                        disabledHint="Choose a city first"
                                        types="(regions)"
                                        city={city}
                                        near={cityCoordinates}
                                        allowCustom
                                        onSelect={(option) => {
                                            const description = `${option.name}, ${city}`;
                                            setArea(option.name);
                                            setAddress(description);
                                            setLocation({
                                                description,
                                                coordinates: option.coordinates ?? cityCoordinates ?? undefined,
                                            });
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="relative border-b border-gray-9 pt-2">
                                <BroadcastFieldRow
                                    icon={setRadiusIcon}
                                    label={ph("set_radius")}
                                    value={
                                        selectedRadius != null
                                            ? `${selectedRadius} ${placeholders["km" as keyof typeof placeholders] ?? "km"}`
                                            : null
                                    }
                                    placeholder={ph("choose_radius")}
                                    disabled={isBroadcastLoading}
                                    onClick={() => {
                                        setIsRadiusOpen((prev) => !prev);
                                        setIsTypeOpen(false);
                                        setIsPurposeOpen(false);
                                        setIsCategoryOpen(false);
                                    }}
                                />
                                {isRadiusOpen ? (
                                    <div className={DROPDOWN_PANEL_CLASS}>
                                        {[1, 5, 15, 25, 50, 100].map((radius) => (
                                            <button
                                                key={radius}
                                                type="button"
                                                className="w-full cursor-pointer border-b border-gray-9 rtl:text-right ltr:text-left px-3 py-2 text-left text-[14px] text-black-1 last:border-b-0 hover:bg-gray-10"
                                                onClick={() => {
                                                    setSelectedRadius(radius);
                                                    setIsRadiusOpen(false);
                                                }}
                                            >
                                                {radius} {placeholders["km" as keyof typeof placeholders] ?? "km"}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div className="relative border-b border-gray-9 pt-2">
                                <BroadcastFieldRow
                                    icon={selectTypeIcon}
                                    label={ph("select_type")}
                                    value={
                                        selectedType
                                            ? placeholders[selectedType as keyof typeof placeholders] ?? selectedType
                                            : null
                                    }
                                    placeholder={ph("choose_type")}
                                    disabled={isBroadcastLoading}
                                    onClick={() => {
                                        setIsTypeOpen((prev) => !prev);
                                        setIsRadiusOpen(false);
                                        setIsPurposeOpen(false);
                                        setIsCategoryOpen(false);
                                    }}
                                />
                                {isTypeOpen ? (
                                    <div className={DROPDOWN_PANEL_CLASS}>
                                        {([
                                            { value: "product", label: ph("product") },
                                            { value: "service", label: ph("service") },
                                        ] as { value: BroadcastType; label: string }[]).map((type) => (
                                            <button
                                                key={type.value}
                                                type="button"
                                                className="w-full cursor-pointer border-b border-gray-9 px-3 py-2 text-left text-[14px] text-black-1 last:border-b-0 hover:bg-gray-10"
                                                onClick={() => {
                                                    setSelectedType(type.value);
                                                    setSelectedCategory(null);
                                                    setIsCategoryOpen(false);
                                                    setIsTypeOpen(false);
                                                }}
                                            >
                                                <p className="first-letter:uppercase rtl:text-right ltr:text-left">{type.label}</p>
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div className="relative border-b border-gray-9 pt-2">
                                <BroadcastFieldRow
                                    icon={selectTypeIcon}
                                    label={ph("purpose")}
                                    value={
                                        selectedPurpose
                                            ? ph(selectedPurpose)
                                            : null
                                    }
                                    placeholder={ph("choose_purpose")}
                                    disabled={isBroadcastLoading}
                                    onClick={() => {
                                        setIsPurposeOpen((prev) => !prev);
                                        setIsRadiusOpen(false);
                                        setIsTypeOpen(false);
                                        setIsCategoryOpen(false);
                                    }}
                                />
                                {isPurposeOpen ? (
                                    <div className={DROPDOWN_PANEL_CLASS}>
                                        {purposeOptions.map((purpose) => (
                                            <button
                                                key={purpose.value}
                                                type="button"
                                                className="w-full cursor-pointer border-b border-gray-9 px-3 py-2 text-left text-[14px] text-black-1 last:border-b-0 hover:bg-gray-10"
                                                onClick={() => {
                                                    setSelectedPurpose(purpose.value);
                                                    setIsPurposeOpen(false);
                                                }}
                                            >
                                                <p className="first-letter:uppercase rtl:text-right ltr:text-left">
                                                    {ph(purpose.labelKey)}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div className="relative border-b border-gray-9 pt-2">
                                <BroadcastFieldRow
                                    icon={chooseCatIcon}
                                    label={ph("category")}
                                    value={
                                        selectedCategory
                                            ? getFeedCategoryLabel(selectedCategory.name, currentLanguage)
                                            : null
                                    }
                                    placeholder={
                                        selectedType ? ph("choose_category") : ph("choose_type")
                                    }
                                    disabled={isBroadcastLoading || !selectedType}
                                    onClick={() => {
                                        if (!selectedType) {
                                            toast.error(eh("type_required"));
                                            return;
                                        }
                                        setIsCategoryOpen((prev) => !prev);
                                        setIsRadiusOpen(false);
                                        setIsTypeOpen(false);
                                        setIsPurposeOpen(false);
                                    }}
                                />
                                {isCategoryOpen && selectedType ? (
                                    <div className={DROPDOWN_PANEL_CLASS}>
                                        {isCategoriesLoading || isCategoriesFetching ? (
                                            <p className="px-3 py-2 text-[14px] text-gray-8">{ph("loading_categories")}</p>
                                        ) : categories?.data?.length > 0 ? (
                                            categories.data.map((category: CategoryItem) => (
                                                <button
                                                    key={category._id}
                                                    type="button"
                                                    className="w-full cursor-pointer border-b border-gray-9 px-3 py-2 text-left text-[14px] text-black-1 rtl:text-right ltr:text-left last:border-b-0 hover:bg-gray-10"
                                                    onClick={() => {
                                                        setSelectedCategory(category);
                                                        setIsCategoryOpen(false);
                                                    }}
                                                >
                                                    {getFeedCategoryLabel(category.name, currentLanguage)}
                                                </button>
                                            ))
                                        ) : (
                                            <p className="px-3 py-2 text-[14px] text-gray-8">{ph("no_categories_found")}</p>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                            <div className="border-b border-gray-9 pt-2">
                                <button
                                    type="button"
                                    disabled={isBroadcastLoading || images.length >= MAX_BROADCAST_PHOTOS}
                                    onClick={() => photoInputRef.current?.click()}
                                    className="flex w-full cursor-pointer items-center gap-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Image src={addPhotoIcon} alt="" className="h-5 w-5 shrink-0" />
                                    <div className="min-w-0 flex-1 rtl:text-right">
                                        <p className={FIELD_ROW_LABEL_CLASS}>{ph("add_photos")}</p>
                                        <p className={FIELD_PLACEHOLDER_CLASS}>{ph("upload_photos")}</p>
                                    </div>
                                    <Plus className="h-5 w-5 shrink-0 text-[#007781]" strokeWidth={1.75} />
                                </button>
                                <input
                                    ref={photoInputRef}
                                    id="broadcast-modal-photo-upload"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isBroadcastLoading}
                                    onChange={(event) => {
                                        handlePhotoUpload(event.target.files);
                                        event.target.value = "";
                                    }}
                                />
                                {images.length > 0 ? (
                                    <div className="mt-1">
                                        <ChooseImagesTab
                                            images={images}
                                            setImages={setImages}
                                            inputId="broadcast-modal-photo-upload"
                                        />
                                    </div>
                                ) : null}
                            </div>
                        </div>
                        <div className="pt-4 ">
                            <p className={`mb-2 ${FIELD_ROW_LABEL_CLASS}`}>{ph("your_message")}</p>
                            <textarea
                                className="h-20 w-full resize-none border-b border-gray-9 text-[14px] font-normal text-[#030303] outline-none placeholder:font-normal placeholder:text-[#4B514F]"
                                placeholder={ph("type_your_message_here")}
                                value={message}
                                disabled={isBroadcastLoading}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </div>

                    </div>
                    <div className="flex items-center gap-3 px-4 py-2  bg-[#F5F8F5] ">
                        <Image src={safeAndSecureIcon} alt="" className="h-7 w-7 shrink-0" />
                        <div className="min-w-0 rtl:text-right">
                            <p className="text-[14px] font-medium text-[#007781]">
                                {info_messages.safe_and_secure}
                            </p>
                            <p className="mt-1 text-[14px] font-normal leading-snug text-[#4B514F]">
                                {info_messages.safe_and_secure_description}
                            </p>
                        </div>
                    </div>
                    <div className="px-5 pb-4 pt-4">
                        <DoodleButton
                            type="button"
                            disabled={isBroadcastLoading}
                            onClick={handleSendMessage}
                            className="flex h-[48px] md:h-[52px] w-full cursor-pointer flex-col items-center justify-center rounded-[10px] bg-green-1 px-5 text-white shadow-[0_4px_12px_rgba(0,119,129,0.28)] disabled:cursor-not-allowed disabled:opacity-80"
                        >
                            {isBroadcastLoading ? (
                                <span className="flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white [animation-delay:120ms]" />
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white [animation-delay:240ms]" />
                                </span>
                            ) : (
                                <span className="flex flex-col items-center leading-tight">
                                    <span className="text-[14px]  font-semibold">
                                        {ph("send_broadcast")}
                                    </span>
                                    <span className="mt-0.5 text-[12px]  font-normal text-white/90">
                                        {selectedPurpose === "selling"
                                            ? ph("reach_nearby_buyers_now")
                                            : ph("reach_nearby_sellers_now")}
                                    </span>
                                </span>
                            )}
                        </DoodleButton>
                    </div>

                </div>

            </div>
        </>
    );
}

export default BroadCastModal;