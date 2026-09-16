"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import chevDown from "@/assets/icons/chev-down-icon.svg";
import countries from "country-list-with-dial-code-and-flag";
import { useClickOutside } from "@/custom-hooks/useClickOutside";
import locationIcon from "@/assets/icons/location-icon.svg";
import { BeatLoader } from "react-spinners";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { validatePhone } from "./SendOtp";
import {
  useGetLocationsQuery,
  useSignupMutation,
  useSigninMutation,
} from "@/store/services/authService";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import dummyProfile from "@/assets/images/default-profile-avatar.svg";
import { useDebounce } from "use-debounce";
import Footer from "./Footer";
import DoodleButton from "@/components/Ui/DoodleButton";
import AuthField from "./AuthField";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { setProfileCompleted, setToken, setUserId } from "@/store/reducers/authReducer";
import { baseApi } from "@/store/baseApi";

interface Location {
  description?: string;

  type?: string;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
}

function FinishSignup() {
  const { currentLanguage, placeholders } = useDictionary();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    email: emailData,
    phone: phoneData,
    password,
    type,
  } = useAppSelector((state) => state?.authReducer?.otpInfo);
  const [signin] = useSigninMutation();
  const submittedEmailRef = useRef("");
  const countryRef = useRef<HTMLDivElement | null>(null);
  const locationRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const allCountries = countries.getAll();
  const [countryCode, setCountryCode] = useState("");
  const [countryFlag, setCountryFlag] = useState("");
  const [location, setLocation] = useState<Location>({});
  const [signup, { isLoading, isSuccess, isError, error, data }] =
    useSignupMutation();
  const [locationError, setLocationError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [profile, setProfile] = useState<File | null>(null);
  const [countryCodeError, setCountryCodeError] = useState("");
  const [search, setSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstNameError, setFirstNameError] = useState("");
  const [lastNameError, setLastNameError] = useState("");
  const [mounted, setMounted] = useState(false);
  const simplified = allCountries.map(({ name, dial_code, flag }) => ({
    name,
    dial_code,
    flag,
  }));

  const [debouncedLocationSearch] = useDebounce(locationSearch, 500);

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

  const filteredCountryCodes =
    search === ""
      ? simplified
      : simplified?.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      );

  useClickOutside(countryRef, () => {
    setIsOpen(false);
  });
  useClickOutside(locationRef, () => {
    setIsLocationOpen(false);
  });
  useEffect(() => {
    if (type === "" || password === "") {
      router.push("/send-otp");
    } else {
      setMounted(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let isValid: boolean = true;
    const checkField = (
      value: string,
      setter: React.Dispatch<React.SetStateAction<string>>,
      message: string
    ) => {
      if (value.trim() === "") {
        setter(message);
        isValid = false;
      } else {
        setter("");
      }
    };

    checkField(firstName, setFirstNameError, "First name is required*");
    checkField(lastName, setLastNameError, "Last name is required*");
    if (Object.keys(location).length === 0) {
      setLocationError("Location is required*");
      isValid = false;
    } else {
      setLocationError("");
    }

    if (type === "phone") {
      if (email.trim() === "") {
        setEmailError("Email is required*");
        isValid = false;
      } else if (!regex.test(email)) {
        setEmailError("Please enter a valid email");
        isValid = false;
      } else {
        setEmailError("");
      }
    }

    // `phone` only ever holds the national number now — the dial code lives
    // in `countryCode` (shown separately via the field's leftElement) — so
    // both validation and the submitted value need the two joined back
    // together into one international-format number.
    const fullPhone = `${countryCode}${phone}`;
    if (type === "email") {
      checkField(countryCode, setCountryCodeError, "Country code is required*");

      if (phone.trim() === "") {
        setPhoneError("Phone number is required*");
        isValid = false;
      } else if (validatePhone(fullPhone) === false) {
        setPhoneError("Please enter valid phone number");
        isValid = false;
      } else {
        setPhoneError("");
      }
    }
    if (isValid) {
      const finalEmail = type === "email" ? emailData : email;
      submittedEmailRef.current = finalEmail;
      const payload = {
        email: finalEmail,
        password: password,
        name: firstName + " " + lastName,
        phone: type === "phone" ? phoneData : fullPhone,
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

      if (profile && profile !== null) {
        formData.append("image", profile);
      }
      signup(formData);
    }
  };

  const hasAutoLoggedInRef = useRef(false);
  useEffect(() => {
    if (!isSuccess || hasAutoLoggedInRef.current) return;
    hasAutoLoggedInRef.current = true;

    toast.success(data?.message);
    localStorage.removeItem("otpInfo");
    localStorage.removeItem("confirmedPwd");

    // Signup only creates the account — it doesn't return a session, so log
    // the new account in immediately instead of bouncing back to /signin.
    signin({ email: submittedEmailRef.current, password, loginContext: "web" })
      .unwrap()
      .then((res) => {
        dispatch(baseApi.util.resetApiState());
        dispatch(
          setToken({
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken,
          }),
        );
        localStorage.setItem("user", JSON.stringify({ user: res.data.user }));
        dispatch(setUserId(res.data.user.id));
        dispatch(setProfileCompleted(true));
        router.replace("/welcome");
        router.refresh();
      })
      .catch(() => {
        // Account was created but auto-login failed — fall back to asking
        // the user to sign in manually rather than leaving them stuck here.
        router.push("/signin");
      });
  }, [isSuccess, data, router, signin, password, dispatch]);

  useEffect(() => {
    if (isError && "data" in error) {
      toast.error(
        (error?.data as { message?: string })?.message ||
        "something went wrong!"
      );
    }
  }, [isError, error]);

  if (mounted) {
    return (
      <div className="w-full min-w-0 px-5 pt-[70px] sm:px-[50px] lg:w-1/2 xl:px-[140px]">
        <form
          onSubmit={handleSubmit}
          className="max-w-[500px] flex flex-col items-center lg:items-start lg:max-w-full"
        >
          <h1 className="text-black-1 font-bold text-[22px] lg:w-[334px]  leading-[30px] ">
            Finish Signing up{" "}
          </h1>
          {mounted && (
            <p className=" text-[16px] font-light text-gray-8">
              {type === "email" ? emailData : phoneData}
            </p>
          )}
          <div className="mt-5 flex gap-[14px] items-center  w-full ">
            <div className="h-[62px] overflow-hidden  font-medium text-[16px] text-black-2 rounded-[22px] w-[62px] bg-[#E6FBFB] flex items-center justify-center">
              {profile !== null ? (
                <img
                  src={profile !== null ? URL.createObjectURL(profile) : ""}
                  alt=""
                  className="object-cover h-full w-full"
                />
              ) : firstName && lastName ? (
                firstName.slice(0, 1) + lastName.slice(0, 1)
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
                  setProfile(e.target.files[0]);
                }
              }}
              id="profile-photo"
            />
            <label
              htmlFor="profile-photo"
              className="text-[14px] font-medium text-green-1 underline cursor-pointer"
            >
              Add photo
            </label>
          </div>
          {/* first + last name, side by side */}
          <div className="mt-6 flex w-full gap-4">
            <AuthField
              className="flex-1"
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={firstNameError}
              placeholder="Enter your first name"
            />
            <AuthField
              className="flex-1"
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={lastNameError}
              placeholder="Enter your last name"
            />
          </div>
          {/* email address */}
          {mounted && type === "phone" && (
            <AuthField
              className="mt-6"
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              placeholder="you@example.com"
            />
          )}
          {/* phone number — country code lives inside this field now
              (leftElement), no separate selector row above it anymore */}
          {mounted && type === "email" && (
            <AuthField
              className="mt-6"
              label="Phone number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={countryCodeError || phoneError}
              placeholder="3XX XXXXXXX"
              leftElement={
                <div ref={countryRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1 pr-2 border-r border-gray-9 text-[14px] text-black-1"
                  >
                    {countryFlag && <span>{countryFlag}</span>}
                    <span>{countryCode || "+--"}</span>
                  </button>
                  {isOpen && (
                    <div className="absolute z-20 mt-2 w-[280px] text-gray-8 text-[14px] bg-white">
                      <input
                        type="text"
                        placeholder="Search country..."
                        className="w-full px-4 font-light py-2 outline-none  text-sm border border-gray-200 rounded-md  "
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                        }}
                      />
                      <div className=" border   max-h-[250px] overflow-scroll hide-scrollbar  border-gray-200 rounded-md shadow-md mt-2">
                        {filteredCountryCodes.length > 0 ? (
                          filteredCountryCodes?.map((data, index) => (
                            <div
                              onClick={() => {
                                setCountryCode(data?.dial_code);
                                setCountryFlag(data?.flag);
                                setIsOpen(false);
                              }}
                              className="text-[14px]  text-gray-8 px-4 py-2 text-sm cursor-pointer font-light hover:bg-gray-100"
                              key={index}
                            >{`(${data.dial_code}) ${data.name}`}</div>
                          ))
                        ) : (
                          <div className="text-[14px]  text-gray-8 px-4 py-2 text-sm cursor-pointer font-light">
                            No country found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              }
            />
          )}
          {/* location */}
          <div className="group relative mt-6 w-full">
            <label
              className={`absolute -top-2 left-3 z-10 bg-white px-1.5 text-[12px] ${locationError ? "text-red-1" : "text-gray-8"
                }`}
            >
              Choose location
            </label>
            <div ref={locationRef} className="relative w-full">
              <div
                className={`flex w-full cursor-pointer items-center justify-between rounded-[14px] border px-4 py-3.5 ${locationError ? "border-red-1" : "border-gray-9"
                  }`}
                onClick={() => {
                  setIsLocationOpen(!isLocationOpen);
                }}
              >
                <h2 className="text-[14px] font-normal text-black-1">
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
                <div className="absolute z-20 mt-2 w-full bg-white">
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
          <div className="w-full font-light text-[14px] text-gray-11 mt-5 lg:max-w-[306px]">
            By selecting Agree and continue, I agree to market’s{" "}
            <span className="hover:underline text-green-1 font-medium ">
              Terms of Service
            </span>{" "}
            and acknowledge the{" "}
            <span className="hover:underline text-green-1 font-medium ">
              Privacy Policy
            </span>{" "}
          </div>
          <DoodleButton
            type="submit"
            disabled={isLoading}
            className="mt-4 flex h-[52px] w-full cursor-pointer items-center justify-center rounded-[12px] bg-green-1 text-[16px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? <BeatLoader color="white" size={8} /> : "Continue"}
          </DoodleButton>

        </form>
        <div className="mt-14 w-full">
          <Footer />
        </div>
      </div>
    );
  } else {
    return null;
  }
}

export default FinishSignup;
