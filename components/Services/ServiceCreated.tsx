"use client";
import Image from "next/image";
import tickIcon from "@/assets/icons/tick-circle.svg";
import listAnotherImage from "@/assets/icons/list-another-icon.svg";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import noImageAvtar from "@/assets/images/no-image-av.png";
import { formatPrice } from "@/utils/formatPrice";

interface Props {
  createData?:any
}

function ServiceCreated({ createData }: Props) {
  const { info_messages, placeholders, currentLanguage } = useDictionary();
  const isUrdu = currentLanguage === "ur";
  
  
  const service = createData?.service ?? createData;
  const serviceImage = service?.image || noImageAvtar;
  console.log(service?.image,"created data");
  const serviceTitle = service?.title || "";
  const servicePrice =
    service?.price != null && service.price !== ""
      ? `Rs ${formatPrice(service.price)}`
      : "";

  return (
    <div
      className="flex w-full flex-col"
      dir={isUrdu ? "rtl" : "ltr"}
    >
      <div className="mx-auto mt-4 flex w-full max-w-[422px] flex-col items-center px-4 pb-10 sm:px-0">
        <div className="relative flex h-max w-full items-center justify-center overflow-hidden rounded-[16px] bg-[#E6FBFB] px-3 py-8 sm:px-5">
          <Image
            src={listAnotherImage}
            alt=""
            className="pointer-events-none absolute start-2 top-1/2 h-[48px] w-auto -translate-y-1/2 sm:start-8 sm:h-[80px]"
            priority
          />
          <Image
            src={listAnotherImage}
            alt=""
            className="pointer-events-none absolute end-2 top-1/2 h-[48px] w-auto -translate-y-1/2 rotate-180 sm:end-8 sm:h-[80px]"
            priority
          />

          <div className="relative z-[1] w-[209px] overflow-hidden rounded-[18px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <div className="relative h-[226px] w-full overflow-hidden rounded-t-[18px] bg-gray-5">
              <Image
                src={typeof serviceImage === "string" ? serviceImage : URL.createObjectURL(serviceImage)}
                alt={serviceTitle || "service"}
                fill
                className="object-cover"
                priority
                unoptimized={typeof serviceImage === "string"}
              />
            </div>
            <div className="px-4 py-3">
              <h2 className="truncate text-[15px] font-semibold leading-tight text-black-1 ltr:text-left rtl:text-right">
                {serviceTitle}
              </h2>
              {servicePrice && (
                <p className="mt-1 text-[14px] font-medium text-green-1 ltr:text-left rtl:text-right">
                  {servicePrice}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex w-full flex-col items-center">
          <Image src={tickIcon} alt="tick-icon" className="rounded-full" />
          <h1 className="mt-3 text-center text-[22px] font-medium text-black-1">
            {info_messages.service_created}
          </h1>
          <h3 className="max-w-[310px] text-center text-[14px] font-normal text-gray-8">
            {info_messages.most_listings}
          </h3>
        </div>

        <div className="mt-6 flex w-full justify-center text-center text-[16px] font-medium text-green-1">
          <button
            type="button"
            className="w-max cursor-pointer hover:underline"
            onClick={() => {
              window.location.reload();
            }}
          >
            {placeholders.list_another_service}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ServiceCreated;
