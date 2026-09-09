"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import AuthImagePanel from "./AuthImagePanel";
import chevDown from "@/assets/icons/chev-down-icon.svg";
import countries from "country-list-with-dial-code-and-flag";
import { useClickOutside } from "@/custom-hooks/useClickOutside";
import GoogleIcon from "@/assets/icons/google-icon.svg";
import mailIcon from "@/assets/icons/email-icon.svg";
import { BeatLoader } from "react-spinners";
import {
  useGetLocationsQuery,
  useSendOtpMutation,
} from "@/store/services/authService";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { setOtpInfo, setProfileCompleted } from "@/store/reducers/authReducer";
import { useRouter } from "next/navigation";
import { BASE_URL } from "@/assets/content/constants";
import { useDebounce } from "use-debounce";
import locationIcon from "@/assets/icons/location-icon.svg";
import { useUpdateProfileMutation } from "@/store/services/profileService";
import Footer from "./Footer";
import DoodleButton from "@/components/Ui/DoodleButton";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import {
  clampNationalDigits,
  describeExpectedLength,
  getPhoneLengthRule,
  isCompleteMobileNumber,
} from "@/utils/phoneRules";

export type Body = {
  email?: string;
  phoneNumber?: string;
};

interface Location {
  description?: string;

  type?: string;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
}

function CompleteInfo() {
  const { currentLanguage, placeholders } = useDictionary();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement | null>(null);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const allCountries = countries.getAll();
  const [phoneError, setPhoneError] = useState("");
  const [countryCodeError, setCountryCodeError] = useState("");
  const [countryCode, setCountryCode] = useState("");
  // National digits only — the dial code is shown as a fixed prefix beside the
  // input, so it can no longer be edited or deleted by mistake.
  const [phone, setPhone] = useState("");
  const [countryName, setCountryName] = useState("");
  const [countryIso, setCountryIso] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [location, setLocation] = useState<Location>({});
  const [debouncedLocationSearch] = useDebounce(locationSearch, 500);
  const { userId } = useAppSelector((state) => state.authReducer);

  const {
    data: locationsData,
    isLoading: isLocationsLoading,
    isSuccess: isLocationsSuccess,
    isFetching: isLocationsFetching,
  } = useGetLocationsQuery(
    {
      q: debouncedLocationSearch,
    },
    { skip: locationSearch.trim() == "" || locationSearch == null }
  );
  const simplified = allCountries.map(({ name, dial_code, code }) => ({
    name,
    dial_code,
    code,
  }));

  // How many digits this country's mobile numbers take after the dial code —
  // 10 for +92, 9 for +971, and so on.
  const phoneRule = getPhoneLengthRule(countryIso);
  const expectedLength = describeExpectedLength(phoneRule);
  const [updateProfile, { isLoading, isSuccess, isError, data, error }] =
    useUpdateProfileMutation();

  useClickOutside(optionsRef, () => {
    setIsOpen(false);
  });

  useClickOutside(locationRef, () => {
    setIsLocationOpen(false);
  });

  const handleCompleteInfo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let isValid: boolean = true;

    if (countryCode.trim().length === 0) {
      setCountryCodeError("Country code is required*");
      isValid = false;
    } else {
      isValid = true;
      setCountryCodeError("");
    }
    if (phone.trim().length === 0) {
      setPhoneError("Phone number is required*");
      isValid = false;
    } else if (phoneRule.known && !phoneRule.allowed.includes(phone.length)) {
      // Length is checked before validity so the message can say what is
      // actually wrong — "enter 10 digits" rather than a blanket "invalid".
      setPhoneError(`Enter ${expectedLength} after ${countryCode}`);
      isValid = false;
    } else if (!isCompleteMobileNumber(countryCode, phone)) {
      setPhoneError("Please enter valid phone number");
      isValid = false;
    } else {
      setPhoneError("");
    }
    if (Object.keys(location).length === 0) {
      setLocationError("Location is required*");
      isValid = false;
    } else {
      setLocationError("");
    }

    if (isValid) {
      const locationData = {
        type: "Point",
        coordinates: location?.coordinates && [
          location.coordinates.lng,
          location.coordinates.lat,
        ],
      };
      const formData = new FormData();
      // The field holds national digits; the backend has always been sent the
      // full E.164 number, so the dial code is put back on here.
      formData.append("phone", `${countryCode}${phone}`);
      formData.append("location", JSON.stringify(locationData));
      formData.append("address", location?.description || "");

      updateProfile({ formData, id: userId });
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success(data?.message);
      dispatch(setProfileCompleted(true));
      const timer = setTimeout(() => {
        router.push("/");
      }, 500);
      return () => clearTimeout(timer);
    }
    if (isError && "data" in error) {
      toast.error(
        (error?.data as { message?: string })?.message ||
        "something went wrong!"
      );
    }
  }, [isSuccess, isError, data, error]);

  return (
    <div className="flex h-screen min-h-[818px] w-full max-w-full overflow-x-hidden pt-[50px] hide-scrollbar lg:flex lg:pt-0">
      {/* Left section */}
      <AuthImagePanel className="relative hidden h-full shrink-0 overflow-hidden lg:block lg:w-1/2 ltr:lg:pl-8 ltr:xl:pl-16 rtl:lg:pr-8 rtl:xl:pr-16" />
      {/* Right section */}
      <form
        onSubmit={handleCompleteInfo}
        className="flex w-full min-w-0 justify-center px-5 sm:px-[50px] lg:w-1/2 lg:justify-start lg:pt-[80px] xl:px-[140px]"
      >
        <div className=" w-full flex flex-col  items-center  lg:items-start max-w-[500px] lg:max-w-full">
          <h1 className="text-black-1   font-medium text-[22px] text-center lg:text-start w-full max-w-[334px]  leading-[30px] ">
            Complete Your Information
          </h1>
          <p className="font-normal text-[16px] text-gray-8">
            Let’s get started
          </p>

          <div className="w-full">
            <div className="mt-5">
              <div className="text-[14px] font-normal text-gray-8">
                Country code
              </div>
              <div ref={optionsRef} className="relative inline-block w-full">
                <div
                  className="pb-1 w-full flex items-center border-b-[1px] border-gray-9 justify-between mt-1 cursor-pointer"
                  onClick={() => {
                    setIsOpen(!isOpen);
                  }}
                >
                  <h2 className="text-[15px] font-normal text-gray-8">
                    {countryCode && countryName
                      ? `${countryName} (${countryCode})`
                      : "Select country code"}
                  </h2>
                  <Image
                    src={chevDown}
                    alt="chev-down"
                    className="h-[16px] w-[12px]"
                    height={100}
                    width={100}
                  />
                </div>
                {isOpen && (
                  <div className="mt-1">
                    <input
                      type="text"
                      placeholder="Search country..."
                      className="w-full px-4 font-light py-2 outline-none  text-sm border border-gray-200 rounded-md  "
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />

                    <div className="absolute z-20  text-gray-8 w-full text-[14px] bg-white border   max-h-[450px] overflow-scroll hide-scrollbar  border-gray-200 rounded-md shadow-md mt-2">
                      {simplified
                        ?.filter((c) =>
                          c.name.toLowerCase().includes(search.toLowerCase())
                        )
                        ?.map((data, index) => (
                          <div
                            onClick={() => {
                              setCountryName(data?.name);
                              setCountryCode(data?.dial_code);
                              setCountryIso(data?.code);
                              // Keep what was typed but re-cut it to the new
                              // country's maximum, so switching countries after
                              // typing can't leave an over-long number behind.
                              setPhone((current) =>
                                clampNationalDigits(
                                  current,
                                  getPhoneLengthRule(data?.code),
                                ),
                              );
                              setPhoneError("");
                              setIsOpen(false);
                            }}
                            className="text-[14px]  text-gray-8 px-4 py-2 text-sm cursor-pointer font-light hover:bg-gray-100"
                            key={index}
                          >{`(${data.dial_code}) ${data.name}`}</div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {countryCodeError && (
              <p className="text-red-1 text-[14px] font-normal">
                {countryCodeError}
              </p>
            )}
            <div className="space-y-2 mt-5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[14px] font-normal text-gray-8">
                  Phone number
                </p>
                {expectedLength && (
                  <p className="text-[12px] font-normal text-gray-8">
                    {expectedLength}
                  </p>
                )}
              </div>
              <div
                className={`flex items-center gap-2 border-b-[1px] ${phoneError ? "border-red-1" : "border-gray-9"
                  }`}
              >
                {countryCode && (
                  <span
                    dir="ltr"
                    className="shrink-0 text-[14px] font-normal text-black-1"
                  >
                    {countryCode}
                  </span>
                )}
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  dir="ltr"
                  disabled={!countryCode}
                  // Backstop for anything that sets the value without firing a
                  // change we can clamp — the onChange below is the real guard.
                  maxLength={phoneRule.max}
                  placeholder={countryCode ? "" : "Select a country code first"}
                  value={phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    // Non-digits are dropped rather than rejected, so pasting
                    // "0300 123 4567" or "+92-300-1234567" still works.
                    const digits = clampNationalDigits(e.target.value, phoneRule);
                    setPhone(digits);
                    if (phoneError) setPhoneError("");
                  }}
                  className="h-[28px] w-full text-[14px] font-normal text-gray-8 focus:outline-none disabled:bg-transparent disabled:cursor-not-allowed"
                />
              </div>
              {phoneError && (
                <p className="text-red-1 text-[14px] font-normal">
                  {phoneError}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 w-full">
            <div
              className={`text-[14px] font-normal w-full ${locationError ? "text-red-1" : "text-gray-8"
                }`}
            >
              Choose location
            </div>
            <div ref={locationRef} className="relative inline-block w-full">
              <div
                className="pb-1 w-full flex items-center border-b-[1px] border-gray-9 justify-between mt-1 cursor-pointer"
                onClick={() => {
                  setIsLocationOpen(!isLocationOpen);
                }}
              >
                <h2 className="text-[15px] font-normal text-gray-8">
                  {location?.description
                    ? location.description
                    : "Choose location"}
                </h2>
                <Image
                  src={chevDown}
                  alt="chev-down"
                  className="h-[16px] w-[12px]"
                  height={100}
                  width={100}
                />
              </div>
              {isLocationOpen && (
                <div className="absolute z-20  w-full bg-white pt-1   ">
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
              Choose location on map
            </p>
          </div>

          <DoodleButton
            type="submit"
            disabled={isLoading}
            className="mt-6 h-[52px] w-full rounded-[12px] text-white font-medium text-[16px]  bg-green-1 cursor-pointer"
          >
            {isLoading ? <BeatLoader color="white" size={8} /> : "Continue"}
          </DoodleButton>

          <div className="mt-14 w-full">
            <Footer />
          </div>
        </div>
      </form>
    </div>
  );
}

export default CompleteInfo;
