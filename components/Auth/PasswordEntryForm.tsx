"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import AuthImagePanel from "./AuthImagePanel";
import { BeatLoader } from "react-spinners";
import greenTick from "@/assets/icons/green-tick-icon.svg";
import redCross from "@/assets/icons/red-cross-icon.svg";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import DoodleButton from "@/components/Ui/DoodleButton";
import Footer from "./Footer";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export type PasswordEntryFormVariant = "change" | "reset";

export type PasswordEntryFormProps = {
  variant?: PasswordEntryFormVariant;
  submitLabel?: string;
  isLoading?: boolean;
  onSubmit: (password: string) => void;
};

function PasswordEntryForm({
  variant = "change",
  submitLabel,
  isLoading = false,
  onSubmit,
}: PasswordEntryFormProps) {
  const { placeholders, error_messages } = useDictionary();

  const title =
    variant === "reset"
      ? placeholders.reset_password
      : placeholders.change_password;
  const subtitle = placeholders.enter_new_password;
  const buttonLabel = submitLabel ?? placeholders.continue;

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

  useEffect(() => {
    const hasLength = password.length >= 8;
    const hasSpecialCharacter = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(
      password,
    );
    const hasNoSpaces = !password.includes(" ");
    if (password !== "") {
      setValidationStatus({
        length: hasLength,
        specialCharacter: hasSpecialCharacter,
        noSpaces: hasNoSpaces,
      });
      if (!hasLength || !hasSpecialCharacter || !hasNoSpaces) {
        setPasswordError(error_messages.password_must_meet_requirements);
      } else {
        setPasswordError("");
      }
    } else {
      setPasswordError("");
    }
  }, [password, confirmPassword, error_messages]);

  useEffect(() => {
    if (confirmPassword !== "" && password !== confirmPassword) {
      setConfirmPasswordError(error_messages.passwords_do_not_match);
    } else {
      setConfirmPasswordError("");
    }
  }, [password, confirmPassword, error_messages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let valid = true;

    if (password === "") {
      setPasswordError(error_messages.password_required);
      valid = false;
    }
    if (confirmPassword === "") {
      setConfirmPasswordError(error_messages.confirm_password_required);
      valid = false;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError(error_messages.passwords_do_not_match);
      valid = false;
    }

    if (
      !validationStatus.length ||
      !validationStatus.specialCharacter ||
      !validationStatus.noSpaces
    ) {
      setPasswordError(error_messages.password_must_meet_requirements);
      valid = false;
    }

    if (valid) {
      onSubmit(password);
    }
  };

  return (
    <div className="flex h-screen min-h-[818px] w-full max-w-full overflow-x-hidden pt-[50px] hide-scrollbar lg:flex lg:pt-0">
      <AuthImagePanel />
      <form
        onSubmit={handleSubmit}
        className="flex w-full min-w-0 flex-col px-5 pt-[80px] sm:px-[50px] lg:w-1/2 lg:justify-between xl:px-[150px]"
      >
        <div className="w-full flex flex-col items-center lg:ltr:items-start lg:rtl:items-end">
          <h1 className="text-black-1 font-medium text-[22px] w-full leading-[30px] text-center lg:ltr:text-left lg:rtl:text-right">
            {title}
          </h1>
          <p className="font-normal w-full text-[16px] text-gray-8 text-center lg:ltr:text-left lg:rtl:text-right">
            {subtitle}
          </p>

          <div className="space-y-2 mt-5 w-full max-w-[500px] lg:max-w-full">
            <div
              className={`flex gap-1 items-center ${passwordError ? "border-red-1" : "border-gray-9"
                } border-b-[1px]`}
            >
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                placeholder={placeholders.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                className="h-[28px] text-[14px] text-gray-8 font-normal focus:outline-none w-full rtl:text-right ltr:text-left placeholder:text-gray-8"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? placeholders.hide : placeholders.show}
                className="cursor-pointer text-gray-8"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-red-1 text-[14px] font-normal -mt-1 rtl:text-right ltr:text-left">
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
                  {placeholders.password_min_8_chars}
                </p>
              </div>
              <div className="flex items-center gap-[4px] ">
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
                  {placeholders.password_special_char}
                </p>
              </div>
              <div className="flex items-center gap-[4px] ">
                <Image
                  src={validationStatus.noSpaces ? greenTick : redCross}
                  alt="validation status"
                  className="inline-block "
                />
                <p
                  className={`text-[14px] font-normal ${validationStatus.noSpaces ? "text-green-1" : "text-red-500"
                    }`}
                >
                  {placeholders.password_no_spaces}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2 mt-5 w-full  max-w-[500px] lg:max-w-full">
            <div
              className={`flex gap-1 items-center ${confirmPasswordError ? "border-red-1" : "border-gray-9"
                } border-b-[1px]`}
            >
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                placeholder={placeholders.confirm_password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfirmPassword(e.target.value)
                }
                className="h-[28px] text-[14px] text-gray-8 font-normal focus:outline-none w-full rtl:text-right ltr:text-left placeholder:text-gray-8"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? placeholders.hide : placeholders.show}
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
              <p className="text-red-1 text-[14px] font-normal rtl:text-right ltr:text-left">
                {confirmPasswordError}
              </p>
            )}
          </div>

          <DoodleButton
            type="submit"
            disabled={isLoading}
            className="mt-6  max-w-[500px] lg:max-w-full h-[52px] w-full rounded-[12px] text-white font-medium text-[16px]  bg-green-1 cursor-pointer"
          >
            {isLoading ? <BeatLoader color="white" size={8} /> : buttonLabel}
          </DoodleButton>
        </div>
        <div className="mb-14 w-full">
          <Footer />
        </div>
      </form>
    </div>
  );
}

export default PasswordEntryForm;
