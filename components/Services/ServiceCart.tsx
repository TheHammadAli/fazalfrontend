import React, { useEffect } from "react";
import Image from "next/image";
import chevron from "@/assets/icons/chev-down-icon.svg";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { Star } from "lucide-react";
import { useServiceBookRequestMutation } from "@/store/services/sellingService";
import { useGetAvgReviewsQuery } from "@/store/services/reviewService";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { BeatLoader } from "react-spinners";
import DoodleButton from "@/components/Ui/DoodleButton";
import addIcon from "@/assets/icons/add.svg";
import noImageAvtar from "@/assets/images/no-image-av.png";
import moment from "moment/min/moment-with-locales";
import { useRequireSignIn } from "@/custom-hooks/useRequireSignIn";
import { formatPrice } from "@/utils/formatPrice";

function ServiceCart({
  service,
  date,
}: {
  service: {
    data: {
      id: string;
      _id: string;
      price: number;
      title: string;
      images: string[];
      paymentType: string;
      category: { name: string };
    };
  };
  date: Date;
}) {
  const { pages, placeholders, currentLanguage } = useDictionary();
  const router = useRouter();
  const { isGuest, requireSignIn } = useRequireSignIn();
  const { data: avgReview, isLoading: isLoadingAvgReview } = useGetAvgReviewsQuery(
    { type: "service", id: service?.data?.id ?? "" },
    { skip: !service?.data?.id || !service?.data?.id }
  );
  const reviewCount = avgReview?.data?.count ?? 0;
  const avgRating = avgReview?.data?.avgRating ?? 0;
  const [serviceBookRequest, { isLoading, isError, isSuccess, error, data }] =
    useServiceBookRequestMutation();

  const { user } =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : "";

  const isCallForPrice = service?.data?.paymentType === "call_for_price";
  const totalAmount = isCallForPrice ? 0 : service?.data?.price;

  useEffect(() => {
    if (isGuest) {
      router.push("/signin");
    }
  }, [isGuest, router]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    requireSignIn(() => {
      const body = {
        serviceId: service?.data?._id || service?.data?.id,
        customerId: user?.id,
        requestedDateTime: date.toISOString(),
        price: isCallForPrice ? 0 : service?.data?.price,
        // message: "string",
      };
      serviceBookRequest(body);
    });
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success(data?.message);
      const timer = setTimeout(() => {
        router.push("/home");
      }, 800);

      return () => clearTimeout(timer);
    }
    if (isError && "data" in error) {
      toast.error(
        (error?.data as { message?: string })?.message ||
        "something went wrong!"
      );
      const timer = setTimeout(() => { }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, isError, data, error]);



  return (
    <div>
      <div className="h-full min-h-screen  flex flex-col items-center">
        <div className="px-5 sm:px-10 h-[61px] border-b-[1px] border-gray-9 bg-white w-full  flex justify-center">
          <div className="w-full   flex items-center gap-[6px] font-normal text-[14px] mt-5">
            <span className="text-gray-8">{pages.home}</span>
            <Image
              src={chevron}
              alt="chevron"
              className="-rotate-90 rtl:rotate-90"
            />
            <span className="text-green-1">{service?.data?.title}</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="md:flex w-full h-full ">
          {/* Left Section */}
          <div className="md:min-h-screen w-full md:w-[50%] md:border-r-[1px] border-[#E5E5E5] p-5 md:p-8 bg-white space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[#4B514F] text-[15px]">
                  {placeholders.date_time}
                </span>
                <span className="text-[#030303] text-[15px]">
                  {moment(date)
                    .locale(currentLanguage)
                    .format("MMM DD, YYYY - h:mm A")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#4B514F] text-[15px]">
                  {placeholders.service_type}
                </span>
                <span className="text-[#030303] text-[15px]">
                  {placeholders.onsite}
                </span>
              </div>
            </div>

            <hr className="border-[#E5E5E5] " />
            <h2 className="text-[14px] text-[#4B514F]">
              {placeholders.your_address}
            </h2>

            <div className="flex justify-between items-center">
              <div>
                {" "}
                <h3 className="text-[#030303]  text-[16px] font-medium">
                  {" "}
                  {user?.name}
                </h3>
                <h3 className="text-[#4B514F] text-[16px] font-normal mb-2">
                  {user?.address}
                </h3>
              </div>
              {/* <Image src={penIcon} alt="pen-icon" /> */}
            </div>

            <DoodleButton
              type="submit"
              disabled={isLoading}
              className="disabled:opacity-50 disabled:cursor-not-allowed  cursor-pointer hidden md:block w-full border-green-1  bg-green-1    text-white font-medium py-3 rounded-lg  mt-5"
            >
              {isLoading ? (
                <BeatLoader color="white" size={8} />
              ) : (
                placeholders.request
              )}
            </DoodleButton>
          </div>
          {/* Right Section */}
          <div className="p-5 md:p-8 ">
            <div className="  md:w-[364px] bg-white  ">
              {/* Product Info */}
              <div className="flex items-start gap-2.5">
                {service?.data?.images?.length > 0 && (
                  <Image
                    src={service?.data?.images?.[0] ?? noImageAvtar}
                    alt="service_image"
                    width={100}
                    height={100}
                    unoptimized
                    className="rounded-[18px] h-[76px] w-[76px] object-cover"
                  />
                )}
                <div>
                  <p className="text-sm text-[#4B514F]  font-normal">
                    {service?.data?.category?.name?.[currentLanguage]}
                  </p>
                  <p className=" text-[#030303] text-[16px] font-medium">
                    {service?.data?.title}
                  </p>
                  <h2 className="font-medium text-[#030303] text-[16px]">
                    {/* {shopData?.title ?? ""} */}
                  </h2>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                    <span className="text-sm text-gray-500">
                      {reviewCount} {reviewCount === 1 ? placeholders.review : placeholders.reviews}
                    </span>
                  </div>
                </div>
              </div>

              <hr className="my-4 border-[#E5E5E5]" />

              {/* Price Breakdown */}
              <div className="space-y-2 text-[#4B514F] text-[15px] font-light">
                <div className="flex justify-between">
                  <span>
                    {service?.data?.paymentType === "hourly"
                      ? `1 ${placeholders?.hour}`
                      : placeholders.price}
                  </span>
                  <span>
                    {isCallForPrice
                      ? placeholders.call_for_price
                      : `${placeholders.Rs} ${formatPrice(service?.data?.price)}`}
                  </span>
                </div>

                {/* {!isCallForPrice && (
                  <div className="flex justify-between">
                    <span> {placeholders.sale_tax}</span>
                    <span>{placeholders.Rs} 90</span>
                  </div>
                )} */}
              </div>

              {/* Total */}
              {!isCallForPrice && (
                <div className="flex justify-between font-medium text-[15px] mt-3">
                  <span>{placeholders.total_pay}</span>
                  <span>
                    {placeholders.Rs} {formatPrice(totalAmount)}
                  </span>
                </div>
              )}
              <DoodleButton
                disabled={isLoading}
                type="submit"
                className="disabled:opacity-50 disabled:cursor-not-allowed  cursor-pointer md:hidden mt-5 w-full bg-green-1  hover:text-green-1  text-white font-medium py-3 rounded-lg transition"
              >
                {isLoading ? (
                  <BeatLoader color="white" size={8} />
                ) : (
                  placeholders.request
                )}
              </DoodleButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ServiceCart;
