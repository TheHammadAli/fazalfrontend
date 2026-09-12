"use client";
import React, { use, useEffect, useState } from "react";
import Image from "next/image";
import { BeatLoader } from "react-spinners";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { useRouter } from "next/navigation";
import greenTick from "@/assets/icons/green-tick-icon.svg";
import redCross from "@/assets/icons/red-cross-icon.svg";
import { setConfirmPwd, setOtpInfo } from "@/store/reducers/authReducer";
import AuthImagePanel from "./AuthImagePanel";
import Footer from "./Footer";
import DoodleButton from "@/components/Ui/DoodleButton";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
export type Body = {
  email?: string;
  phoneNumber?: string;
};

function SetPassword() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationStatus, setValidationStatus] = useState({
    length: false,
    specialCharacter: false,
    noSpaces: false,
  });
  const otpInfo = useAppSelector((state) => state.authReducer.otpInfo);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    dispatch(setOtpInfo({ ...otpInfo, password: "" }));
    if (typeof window !== "undefined" && otpInfo?.type === "") {
      router.push("/send-otp");
    } else {
      setIsClient(true);
    }
  }, []);

  useEffect(() => {
    const hasLength = password.length >= 8;
    const hasSpecialCharacter = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(
      password
    );
    const hasNoSpaces = !password.includes(" ");
    if (password !== "") {
      setValidationStatus({
        length: hasLength,
        specialCharacter: hasSpecialCharacter,
        noSpaces: hasNoSpaces,
      });
      if (!hasLength || !hasSpecialCharacter || !hasNoSpaces) {
        setPasswordError("Password must meet all requirements.");
      } else {
        setPasswordError("");
      }
    } else {
      setPasswordError("");
    }
  }, [password, confirmPassword]);

  useEffect(() => {
    if (confirmPassword !== "" && password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
    } else {
      setConfirmPasswordError("");
    }
  }, [password, confirmPassword]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let valid = true;

    if (password === "") {
      setPasswordError("Password is required*");
      valid = false;
    }
    if (confirmPassword === "") {
      setConfirmPasswordError("Confirm password is required*");
      valid = false;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      valid = false;
    }

    if (
      !validationStatus.length ||
      !validationStatus.specialCharacter ||
      !validationStatus.noSpaces
    ) {
      setPasswordError("Password must meet all requirements.");
      valid = false;
    }
    if (valid) {
      dispatch(setOtpInfo({ ...otpInfo, password: password }));
      router.push("/signup");
    }
  };
  if (isClient) {
    return (
      <div className="flex min-h-[818px] w-full max-w-full justify-center overflow-x-hidden hide-scrollbar">
        <AuthImagePanel />

        <form
          onSubmit={handleSubmit}
          className="flex w-full min-w-0 flex-col px-5 pt-[80px] sm:px-[50px] lg:w-1/2 lg:justify-between xl:px-[150px]"
        >
          <div className="w-full flex flex-col items-center lg:items-start">
            <h1 className="text-black-1 font-medium text-[22px] w-full max-w-[334px]  leading-[30px] text-center lg:text-left">
              Create password{" "}
            </h1>
            <p className="font-normal text-[16px] text-gray-8 text-center lg:text-left">
              Enter your new password
            </p>

            {/* password */}
            <div className="space-y-2 mt-5 w-full max-w-[500px] lg:max-w-full">
              <p
                className={`text-[14px] font-normal
            ${passwordError ? "text-red-1" : "text-gray-8"}
              `}
              >
                Password
              </p>
              <div
                className={`flex gap-1 items-center ${passwordError ? "border-red-1" : "border-gray-9"
                  } border-b-[1px]`}
              >
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPassword(e.target.value)
                  }
                  className={`h-[28px] text-[14px] text-gray-8  font-normal focus:outline-none w-full  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="cursor-pointer text-gray-8"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="text-red-1 text-[14px] font-normal -mt-1">
                {passwordError}
              </p>
            </div>
            {password !== "" && (
              <div className="mt-3 space-y-2 w-full  max-w-[500px] lg:max-w-full">
                <div className="flex items-center gap-[4px] ">
                  <Image
                    src={validationStatus.length ? greenTick : redCross}
                    alt="validation status"
                    className="inline-block "
                  />
                  <p
                    className={`text-[14px] font-normal ${validationStatus.length ? "text-green-1" : "text-red-500"
                      }`}
                  >
                    Must be at least 8 characters
                  </p>
                </div>
                <div className="flex items-center gap-[4px]">
                  <Image
                    src={
                      validationStatus.specialCharacter ? greenTick : redCross
                    }
                    alt="validation status"
                    className="inline-block "
                  />
                  <p
                    className={`text-[14px] font-normal leading-none ${validationStatus.specialCharacter
                        ? "text-green-1"
                        : "text-red-500"
                      }`}
                  >
                    Must have at least one special character
                  </p>
                </div>
                <div className="flex items-center gap-[4px]">
                  <Image
                    src={validationStatus.noSpaces ? greenTick : redCross}
                    alt="validation status"
                    className="inline-block "
                  />
                  <p
                    className={`text-[14px] font-normal ${validationStatus.noSpaces
                        ? "text-green-1"
                        : "text-red-500"
                      }`}
                  >
                    Can&apos;t contain spaces
                  </p>
                </div>
              </div>
            )}

            {/* confirm password */}
            <div className="space-y-2 mt-5 w-full  max-w-[500px] lg:max-w-full">
              <p
                className={`text-[14px] font-normal
            ${confirmPasswordError ? "text-red-1" : "text-gray-8"}
              `}
              >
                Confirm password
              </p>
              <div
                className={`flex gap-1 items-center ${confirmPasswordError ? "border-red-1" : "border-gray-9"
                  } border-b-[1px]`}
              >
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setConfirmPassword(e.target.value)
                  }
                  className={`h-[28px] text-[14px] text-gray-8  font-normal focus:outline-none w-full  `}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="cursor-pointer text-gray-8"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>

              {confirmPasswordError && (
                <p className="text-red-1 text-[14px] font-normal">
                  {confirmPasswordError}
                </p>
              )}
            </div>

            <DoodleButton
              type="submit"
              disabled={false}
              className="mt-6 flex h-[52px] w-full max-w-[500px] cursor-pointer items-center justify-center rounded-[12px] bg-green-1 text-[16px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-70 lg:max-w-full"
            >
              {false ? <BeatLoader color="white" size={8} /> : "Continue"}
            </DoodleButton>
          </div>
          <div className="mt-14 w-full">
            <Footer />
          </div>
        </form>
      </div>
    );
  }
}

export default SetPassword;
