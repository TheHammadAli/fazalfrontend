"use client";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import React, { useEffect, useMemo, useRef, useState } from "react";
import chevron from "@/assets/icons/chev-down-icon.svg";
import Image from "next/image";
import toast from "react-hot-toast";
import { useClickOutside } from "@/custom-hooks/useClickOutside";
import locationIcon from "@/assets/icons/location-icon.svg";
import { useGetLocationsQuery } from "@/store/services/authService";
import { useDebounce } from "use-debounce";
import dummyProfile from "@/assets/images/default-profile-avatar.svg";
import chevDown from "@/assets/icons/chev-down-icon.svg";
import { BeatLoader } from "react-spinners";
import DoodleButton from "@/components/Ui/DoodleButton";
import { useAppSelector } from "@/store/store";

import {
  useGetUserDetailQuery,
  useUpdateProfileMutation,
} from "@/store/services/profileService";
import { withImageCacheBust } from "@/utils/withImageCacheBust";
import dynamic from "next/dynamic";
const ProfileInfoSkeleton = dynamic(
  () => import("@/components/Profile/ProfileInfoSkelton"),
  {
    ssr: false,
  }
);
interface Location {
  description?: string;

  type?: string;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
}
interface ProfileInfoTypes {
  toggle: boolean;
  setToggle: (value: boolean) => void;
}
function ProfileInfo({ toggle, setToggle }: ProfileInfoTypes) {
  const { userId } = useAppSelector((state) => state.authReducer);
  const {
    data: profileData,
    isLoading: profileLoading,
    isError: profileError,
  } = useGetUserDetailQuery(userId, { skip: userId === "" });

  const { placeholders, error_messages } = useDictionary();
  const locationRef = useRef<HTMLDivElement | null>(null);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [location, setLocation] = useState<Location>({});
  const [updateProfile, { isLoading, isSuccess, isError, error, data }] =
    useUpdateProfileMutation();

  const [locationError, setLocationError] = useState("");
  const [localProfileFile, setLocalProfileFile] = useState<File | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [debouncedLocationSearch] = useDebounce(locationSearch, 500);
  const [mounted, setMounted] = useState(false);

  const {
    data: locationsData,
    isLoading: isLocationsLoading,
    isFetching: isLocationsFetching,
  } = useGetLocationsQuery(
    {
      q: debouncedLocationSearch,
    },
    { skip: locationSearch?.trim() == "" || locationSearch == null }
  );

  useClickOutside(locationRef, () => {
    setIsLocationOpen(false);
  });

  useEffect(() => {
    if (profileData?.data) {
      const { email, name, address, location } = profileData?.data;

      setEmail(email ?? "");
      setName(name ?? "");
      setLocation(
        location
          ? {
            coordinates: {
              lat: location?.coordinates?.[0],
              lng: location.coordinates?.[1],
            },
            description: address,
            type: "Point",
          }
          : {}
      );
    }
  }, [profileData]);

  useEffect(() => {
    if (isSuccess) {
      toast.success(data?.message);
      setLocalProfileFile(null);
    }
    if (isError && error && "data" in error) {
      toast.error(
        (error?.data as { message?: string })?.message ||
        "something went wrong!"
      );
    }
  }, [isSuccess, isError, data, error]);
  useEffect(() => {
    setMounted(true);
  }, []);

  const serverImage = profileData?.data?.image as string | undefined;
  const hasServerImage =
    !!serverImage && !String(serverImage).includes("default-avatar");

  const profileSrc = useMemo(() => {
    if (localProfileFile) return URL.createObjectURL(localProfileFile);
    if (!hasServerImage || !serverImage) return "";
    if (serverImage.startsWith("blob:")) return serverImage;
    return withImageCacheBust(
      serverImage,
      (profileData?.data?.imageCacheKey as string | number | undefined) ??
        (profileData?.data?.updatedAt as string | undefined),
    );
  }, [
    localProfileFile,
    hasServerImage,
    serverImage,
    profileData?.data?.imageCacheKey,
    profileData?.data?.updatedAt,
  ]);

  useEffect(() => {
    return () => {
      if (profileSrc.startsWith("blob:")) {
        URL.revokeObjectURL(profileSrc);
      }
    };
  }, [profileSrc]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let isValid: boolean = true;
    const checkField = (
      value: string,
      setter: React.Dispatch<React.SetStateAction<string>>,
      message: string
    ) => {
      if (value?.trim() === "") {
        setter(message);
        isValid = false;
      } else {
        setter("");
      }
    };

    checkField(name, setNameError, error_messages.name_required);
    if (Object.keys(location).length === 0) {
      setLocationError(error_messages.location_required);
      isValid = false;
    } else {
      setLocationError("");
    }

    if (email.trim() === "") {
      setEmailError(error_messages.email_required);
      isValid = false;
    } else if (!regex.test(email)) {
      setEmailError(error_messages.valid_email);
      isValid = false;
    } else {
      setEmailError("");
    }

    if (isValid) {
      const payload = {
        name: name,
        address: location?.description,
        location: {
          type: "Point",
          coordinates: [location?.coordinates?.lng, location?.coordinates?.lat],
        },
      };
      const formData = new FormData();
      (Object.keys(payload) as (keyof typeof payload)[]).forEach((key) => {
        const value = payload[key];
        if (value !== undefined) {
          if (key === "location") {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, String(value));
          }
        }
      });

      if (localProfileFile) {
        formData.append("image", localProfileFile);
      }

      updateProfile({ formData, id: userId });
    }
  };
  if (!mounted) {
    return null;
  }
  // Only block UI on the first load — background refetch must not flash a skeleton
  if (profileLoading && !profileData) {
    return <div className="w-full  h-max">{<ProfileInfoSkeleton />} </div>;
  }
  if (profileError) {
    return (
      <div className="w-full  h-full flex items-center  text-red-1 justify-center">
        Error while loading profile
      </div>
    );
  }

  return (
    <div className="w-full  h-max">
      <div className="px-6 xl:px-0 h-[61px] border-b-[1px] border-gray-9 bg-white w-full  flex justify-center">
        <div className="w-full  max-w-[520px] flex items-center gap-[6px] font-normal text-[14px] mt-5">
          <svg
            onClick={() => {
              setToggle(!toggle);
            }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="3.5"
            stroke="#007781"
            className="size-5 mr-2 md:hidden cursor-pointer rtl:rotate-180"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>

          <span className="text-gray-8">{placeholders.profile}</span>
          <Image
            src={chevron}
            alt="chevron"
            className="-rotate-90 rtl:rotate-90"
          />
          <span className="text-green-1">{mounted ? name : ""}</span>
        </div>
      </div>
      {/*Edit Profile Info */}
      <div className=" px-6 xl:px-0 flex justify-center">
        <form
          onSubmit={handleSubmit}
          className={`w-full  max-w-[520px] ${isLoading && "pointer-events-none"
            }`}
        >
          <div className="mt-5 flex gap-[14px] items-center  w-full ">
            <div className="h-[62px] overflow-hidden  font-medium text-[16px] text-black-2 rounded-[22px] w-[62px] bg-[#E6FBFB] flex items-center justify-center">
              {mounted && profileSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileSrc}
                  alt=""
                  className="object-cover h-full w-full"
                />
              ) : name ? (
                name.slice(0, 2)
              ) : (
                <Image
                  src={dummyProfile}
                  alt="profile"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setLocalProfileFile(e.target.files[0]);
                }
              }}
              id="profile-photo"
            />
            <label
              htmlFor="profile-photo"
              className="text-[14px] font-medium text-green-1 underline cursor-pointer"
            >
              {placeholders.add_photo}
            </label>
          </div>
          {/*  name */}
          <div className="space-y-1 mt-5 w-full">
            <p
              className={`text-[14px] font-normal  ${nameError ? "text-red-1" : "text-gray-8"
                }`}
            >
              {placeholders.name}
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
              <p className="text-red-1 text-[14px] font-normal">{nameError}</p>
            )}
          </div>
          {/* last name */}

          {/* email address */}
          {/* {mounted && type === "phone" && ( */}
          <div className="space-y-1 mt-5 w-full">
            <p
              className={`text-[14px] font-normal  ${emailError ? "text-red-1" : "text-gray-8"
                }`}
            >
              {placeholders.email_address}
            </p>
            <input
              type="email"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
              disabled
              value={email}
              className="h-[28px] text-[15px] text-black-1 disabled:text-gray-6  font-normal focus:outline-none w-full border-gray-9 border-b-[1px] "
            />
            {emailError && (
              <p className="text-red-1 text-[14px] font-normal">{emailError}</p>
            )}
          </div>

          {/* location */}
          <div className="mt-5 w-full">
            <div
              className={`text-[14px] font-normal w-full ${locationError ? "text-red-1" : "text-gray-8"
                }`}
            >
              {placeholders.choose_location}
            </div>
            <div ref={locationRef} className="relative inline-block w-full">
              <div
                className="pb-1 w-full max-w-[350px] flex items-center  justify-between mt-1 cursor-pointer"
                onClick={() => {
                  setIsLocationOpen(!isLocationOpen);
                }}
              >
                <h2 className="text-[15px] font-normal text-black-1">
                  {location?.description
                    ? location.description
                    : placeholders.choose_location}
                </h2>
                <Image
                  src={chevDown}
                  alt="chev-down"
                  className="h-[16px] w-[12px]"
                  height={100}
                  width={100}
                />
              </div>
              <div className="h-[1px]  bg-gray-9"></div>
              {isLocationOpen && (
                <div className="absolute z-20 max-w-[350px] w-full bg-white pt-1   ">
                  <input
                    type="text"
                    placeholder="Search country..."
                    className="w-full px-4 font-light py-2 outline-none  text-sm border border-gray-200 rounded-md  "
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                  />
                  <div className="max-h-[250px] border overflow-scroll border-gray-200 rounded-md shadow-md mt-2">
                    {!isLocationsLoading &&
                      !isLocationsFetching &&
                      locationsData?.data?.length > 0 &&
                      locationsData?.data?.map(
                        (data: Location, index: number) => (
                          <div
                            onClick={() => {
                              setLocation(data);
                              setIsLocationOpen(false);
                            }}
                            className="text-[15px]  text-gray-8 px-4 py-2 text-sm cursor-pointer font-light hover:bg-gray-100"
                            key={index}
                          >
                            <div className="flex items-center gap-2">
                              <Image
                                src={locationIcon}
                                alt=""
                                className="h-[18px] w-[14px]"
                              />
                              <div>
                                <h2>{data?.description}</h2>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    {!isLocationsLoading &&
                      !isLocationsFetching &&
                      locationsData?.data?.length === 0 && (
                        <div className="text-[15px]  text-gray-8 px-4 py-2 text-sm cursor-pointer font-light hover:bg-gray-100">
                          {placeholders.no_locations_found || "No locations found"}
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
                          {placeholders.no_locations_found || "No locations found"}
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
          <div className="flex justify-center sm:justify-start lg:justify-end">
            <DoodleButton
              type="submit"
              disabled={isLoading}
              className="mt-6 flex h-[55px] w-full cursor-pointer items-center justify-center rounded-[12px] bg-green-1 text-[16px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-70 sm:w-[222px]"
            >
              {isLoading ? (
                <BeatLoader color="white" size={8} />
              ) : (
                placeholders.save
              )}
            </DoodleButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileInfo;
