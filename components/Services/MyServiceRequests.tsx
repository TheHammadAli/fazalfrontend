"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getCookie } from "cookies-next";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { useGetServicesRequestsQuery } from "@/store/services/sellingService";
import { formatRequestedDateTime } from "@/utils/formatRequestedDateTime";
import { formatPrice } from "@/utils/formatPrice";
import noImageAvtar from "@/assets/images/no-image-av.png";
import ServiceRequestSkeleton from "./ServiceRequestSkeleton";

type ServiceRequest = {
  id?: string;
  _id?: string;
  requestedDateTime?: string;
  status?: string;
  service?: {
    title?: string;
    price?: string;
    paymentType?: string;
    images?: string[];
  };
  customer?: {
    name?: string;
  };
};

function getStatusLabel(
  status: string | undefined,
  ph: (key: "rejected" | "you_offered_a_new_time" | "pending") => string,
) {
  if (status === "rejected") return ph("rejected");
  if (status === "proposed") return ph("you_offered_a_new_time");
  if (status === "pending") return ph("pending");
  return status ?? "";
}

function getStatusClass(status: string | undefined) {
  if (status === "rejected") return "text-red-1";
  if (status === "proposed") return "text-[#3C9197]";
  return "text-[#4B514F]";
}

function MyServiceRequests() {
  const { placeholders, currentLanguage } = useDictionary();
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    const id = getCookie("userId");
    setUserId(typeof id === "string" ? id : undefined);
  }, []);

  const { data: rejectedData, isLoading: rejectedLoading } =
    useGetServicesRequestsQuery(
      {
        id: userId,
        role: "provider",
        page: 1,
        limit: 20,
        status: "rejected",
      },
      { skip: !userId, refetchOnMountOrArgChange: true },
    );

  const { data: proposedData, isLoading: proposedLoading } =
    useGetServicesRequestsQuery(
      {
        id: userId,
        role: "provider",
        page: 1,
        limit: 20,
        status: "proposed",
      },
      { skip: !userId, refetchOnMountOrArgChange: true },
    );

  const rejectedRequests =
    (rejectedData?.data as ServiceRequest[] | undefined) ?? [];
  const proposedRequests =
    (proposedData?.data as ServiceRequest[] | undefined) ?? [];
  const requests = [...rejectedRequests, ...proposedRequests];
  const loading = rejectedLoading || proposedLoading;
  const ph = (key: keyof typeof placeholders) => placeholders[key];

  if (loading) {
    return (
      <div className="mt-10 border-t border-gray-9 pt-6">
        <h2 className="text-[18px] font-medium text-black-1">
          {ph("service_request")}
        </h2>
        <ServiceRequestSkeleton count={2} />
      </div>
    );
  }

  if (requests.length === 0) return null;

  return (
    <div className="mt-10 border-t border-gray-9 pt-6">
      <h2 className="text-[18px] font-medium text-black-1">
        {ph("service_request")}
      </h2>
      <div className="mt-4">
        {requests.map((request, index) => {
          const requestId = request.id ?? request._id ?? String(index);
          return (
            <div
              key={requestId}
              className="flex flex-col gap-3 border-b border-gray-9 py-4 last:border-b-0"
            >
              <div className="flex min-w-0 items-start gap-3">
                <Image
                  src={request?.service?.images?.[0] ?? noImageAvtar}
                  alt=""
                  width={60}
                  height={60}
                  className="h-[60px] w-[60px] shrink-0 rounded-[8px] bg-gray-5 object-cover"
                  unoptimized
                />
                <div className="min-w-0 flex-1">
                  <h3 className="break-words text-[15px] font-medium leading-snug text-black-1">
                    {request?.service?.title}
                  </h3>
                  <p className="mt-1 break-words text-[15px] font-normal leading-snug text-gray-8">
                    {ph("from_label")}: {request?.customer?.name}
                  </p>
                  <p className="mt-1 break-words text-[14px] font-medium leading-snug text-green-2">
                    {formatPrice(request?.service?.price)}/{ph("fixed")}
                  </p>
                </div>
              </div>
              <p className="break-words text-[15px] font-medium leading-snug text-black-1">
                {formatRequestedDateTime(
                  request?.requestedDateTime,
                  currentLanguage,
                )}
              </p>
              <p
                className={`text-[14px] leading-snug ${getStatusClass(request?.status)}`}
              >
                {getStatusLabel(request?.status, ph)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MyServiceRequests;
