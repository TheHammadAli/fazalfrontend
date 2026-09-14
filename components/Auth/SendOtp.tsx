"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import AuthImagePanel from "./AuthImagePanel";
import chevDown from "@/assets/icons/chev-down-icon.svg";
import countries from "country-list-with-dial-code-and-flag";
import { useClickOutside } from "@/custom-hooks/useClickOutside";
import GoogleIcon from "@/assets/icons/google-icon.svg";
import mailIcon from "@/assets/icons/email-icon.svg";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { BeatLoader } from "react-spinners";
import { useSendEmailVerificationLinkMutation, useSendOtpMutation } from "@/store/services/authService";
import toast from "react-hot-toast";
import { useAppDispatch } from "@/store/store";
import { setOtpInfo } from "@/store/reducers/authReducer";
import { useRouter } from "next/navigation";
import { BASE_URL } from "@/assets/content/constants";
import Footer from "./Footer";
import DoodleButton from "@/components/Ui/DoodleButton";
import AuthField from "./AuthField";

export type Body = {
  email?: string;
  phoneNumber?: string;
};

export const validatePhone = (phone: string): boolean => {
  const phoneNumber = parsePhoneNumberFromString(phone);
  return phoneNumber ? phoneNumber.isValid() : false;
};

function Signup() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = useState("");
  const [withEmail, setWithEmail] = useState(true);
  const [withPhone, setWithPhone] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const allCountries = countries.getAll();
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [countryCodeError, setCountryCodeError] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [phone, setPhone] = useState("");
  const [countryName, setCountryName] = useState("");
  const simplified = allCountries.map(({ name, dial_code }) => ({
    name,
    dial_code,
  }));
  const [sendEmailVerificationLink, { isLoading, isSuccess, isError, data, error }] =
    useSendEmailVerificationLinkMutation();
  useClickOutside(optionsRef, () => {
    setIsOpen(false);
  });
  const handleSendOtp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let isValid: boolean = true;
    let body: Body = {};
    if (withEmail) {
      if (email.trim().length === 0) {
        setEmailError("Email is required*");
        isValid = false;
      } else if (regex.test(email) === false) {
        setEmailError("Please enter a valid email");
        isValid = false;
      } else {
        setEmailError("");
        body = { ...body, email };
      }
    }
    if (withPhone) {
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
      } else if (validatePhone(phone) === false) {
        setPhoneError("Please enter valid phone number");
        isValid = false;
      } else {
        isValid = true;
        setPhoneError("");
        body = { ...body, phoneNumber: phone };
      }
    }
    if (isValid) {
      sendEmailVerificationLink(body);
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success(data?.message);
      dispatch(
        setOtpInfo({
          type: withEmail ? "email" : "phone",
          phone,
          email,
        })
      );
      const timer = setTimeout(() => {
        router.push("/verify-otp?type=register");
      }, 1500);

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
        onSubmit={handleSendOtp}
        className="flex w-full min-w-0 justify-center px-5 sm:px-[50px] lg:w-1/2 lg:justify-start lg:pt-[80px] xl:px-[140px]"
      >
        <div className=" w-full flex flex-col  items-center  lg:items-start max-w-[500px] lg:max-w-full">
          <h1 className="text-black-1   font-medium text-[22px] text-center lg:text-start w-full max-w-[334px]  leading-[30px] ">
            Your local marketplace for Products and Services
          </h1>
          <p className="font-normal text-[16px] text-gray-8">
            Let’s get started
          </p>

          {/* email */}
          {withEmail && (
            <AuthField
              className="mt-6 w-full"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
            />
          )}

          {/* phone */}
          {withPhone && (
            <div className="w-full">
              <div className="group relative mt-6 w-full">
                <label
                  className={`absolute -top-2 left-3 z-10 bg-white px-1.5 text-[12px] ${countryCodeError ? "text-red-1" : "text-gray-8"
                    }`}
                >
                  Country code
                </label>
                <div ref={optionsRef} className="relative w-full">
                  <div
                    className={`flex w-full cursor-pointer items-center justify-between rounded-[14px] border px-4 py-3.5 ${countryCodeError ? "border-red-1" : "border-gray-9"
                      }`}
                    onClick={() => {
                      setIsOpen(!isOpen);
                    }}
                  >
                    <h2 className="text-[14px] font-normal text-black-1">
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
                                setPhone(data?.dial_code);
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
              <AuthField
                className="mt-6"
                label="Phone number"
                type="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={phoneError}
              />
            </div>
          )}

          <DoodleButton
            type="submit"
            disabled={isLoading}
            className="mt-6 flex h-[52px] w-full cursor-pointer items-center justify-center rounded-[12px] bg-green-1 text-[16px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? <BeatLoader color="white" size={8} /> : "Continue"}
          </DoodleButton>
          <div className=" w-full flex gap-[10px] items-center text-[#19191999] text-[16px] font-normal mt-5">
            <div className="w-full h-[1px] bg-gray-2"></div>
            or
            <div className="w-full h-[1px] bg-gray-2"></div>
          </div>

          <button
            type="button"
            onClick={() => {
              // Cross-origin redirect to the backend's OAuth flow — a real
              // navigation (router.push can't leave the app for an external
              // URL), same as Signin's own Google button.
              window.location.href = `${BASE_URL}/auth/google`;
            }}
            className="mt-6 flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-gray-5 text-[16px] font-medium text-black-1"
          >
            <Image src={GoogleIcon} alt="google_icon" className="h-[22px] w-[22px]" />
            Continue with Google
          </button>

          {/* <button
            disabled={isLoading}
            onClick={() => {
              setWithEmail(!withEmail);
              setWithPhone(!withPhone);
            }}
            className="mt-6 h-[52px] w-full rounded-[12px] text-black    bg-gray-10 flex items-center justify-center gap-2 text-[15px] font-normal cursor-pointer"
          >
            <Image src={mailIcon} alt="mail_icon" />{" "}
            <h3>Continue with {withEmail ? "Phone" : "Email"}</h3>
          </button> */}

          <div className="w-full text-center font-normal text-[12px] text-gray-8 mt-5">
            Already have an account?{" "}
            <span
              onClick={() => {
                router.push("/signin");
              }}
              className="text-green-1 cursor-pointer hover:underline"
            >
              Sign in
            </span>
          </div>
          <div className="mt-14 w-full">
            <Footer />
          </div>
        </div>
      </form>
    </div>
  );
}

export default Signup;
