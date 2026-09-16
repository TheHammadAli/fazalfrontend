"use client";
import React, { useState, useEffect } from "react";
import AuthImagePanel from "./AuthImagePanel";
import InputForOtp from "../Ui/InputForOtp";
import {
  useForgotPasswordMutation,
  useLazyVerifyResetTokenQuery,
  useSendEmailVerificationLinkMutation,
  useLazyVerifyEmailQuery,
} from "@/store/services/authService";
import { Body } from "./SendOtp";
import { useAppDispatch, useAppSelector } from "@/store/store";
import toast from "react-hot-toast";
import { BeatLoader } from "react-spinners";
import { useRouter, useSearchParams } from "next/navigation";
import Footer from "./Footer";
import DoodleButton from "@/components/Ui/DoodleButton";
import { setOtpInfo } from "@/store/reducers/authReducer";

function VerifyOtp() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(12);
  const otpInfo = useAppSelector((state) => state.authReducer.otpInfo);
  const canResend = timer <= 0;

  // Ticks the resend cooldown down to 0. `timer` was previously declared but
  // never actually counted down anywhere, so "Click to resend" was always
  // clickable regardless of how recently a code had been sent.
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTimer = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };
  const emailFromQuery = searchParams.get("email")?.trim() ?? "";
  const flowType = searchParams.get("type")?.trim() ?? "";
  const isRegisterFlow = flowType === "register";
  const email = otpInfo?.email || emailFromQuery;
  const contactType = otpInfo?.type || (emailFromQuery ? "email" : "");
  const [mounted, setMounted] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [
    forgotPassword,
    {
      isLoading: isForgotLoading,
      isSuccess: isForgotSuccess,
      isError: isForgotError,
      data: forgotData,
      error: forgotError,
    },
  ] = useForgotPasswordMutation();

  const [
    sendEmailVerificationLink,
    {
      isLoading: isResendRegisterLoading,
      isSuccess: isResendRegisterSuccess,
      isError: isResendRegisterError,
      data: resendRegisterData,
      error: resendRegisterError,
    },
  ] = useSendEmailVerificationLinkMutation();

  const [verifyResetToken, { isFetching: isVerifyResetLoading }] =
    useLazyVerifyResetTokenQuery();
  const [verifyEmail, { isLoading: isVerifyEmailLoading }] =
    useLazyVerifyEmailQuery();

  const isResendLoading = isForgotLoading || isResendRegisterLoading;
  const isVerifyLoading = isVerifyResetLoading || isVerifyEmailLoading;

  useEffect(() => {
    // Allow forgot-password flow that lands with ?email= even if otpInfo was empty
    if (emailFromQuery && (!otpInfo?.type || !otpInfo?.email)) {
      dispatch(
        setOtpInfo({
          type: "email",
          email: emailFromQuery,
          phone: otpInfo?.phone ?? "",
          password: otpInfo?.password ?? "",
        }),
      );
    }
  }, [emailFromQuery, otpInfo, dispatch]);

  useEffect(() => {
    if (contactType || emailFromQuery || (isRegisterFlow && email)) {
      setMounted(true);
      return;
    }
    window.location.href = "/send-otp";
  }, [contactType, emailFromQuery, isRegisterFlow, email]);

  const handleSendOtp = () => {
    if (isResendLoading || !canResend) return;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let isValid = true;
    let body: Body = {};
    if (email.trim().length === 0) {
      setEmailError("Invalid email address*");
      isValid = false;
    } else if (regex.test(email) === false) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    } else {
      setEmailError("");
      body = { email };
    }
    if (!isValid) return;

    if (isRegisterFlow) {
      sendEmailVerificationLink(body);
    } else {
      forgotPassword(body);
    }
  };

  useEffect(() => {
    if (isForgotSuccess) {
      setOtp("");
      toast.success(forgotData?.message);
      setTimer(12);
    }
    if (isForgotError && forgotError && "data" in forgotError) {
      toast.error(
        (forgotError?.data as { message?: string })?.message ||
        "something went wrong!",
      );
    }
  }, [isForgotSuccess, isForgotError, forgotData, forgotError]);

  useEffect(() => {
    if (isResendRegisterSuccess) {
      setOtp("");
      toast.success(resendRegisterData?.message);
      setTimer(12);
    }
    if (
      isResendRegisterError &&
      resendRegisterError &&
      "data" in resendRegisterError
    ) {
      toast.error(
        (resendRegisterError?.data as { message?: string })?.message ||
        "something went wrong!",
      );
    }
  }, [
    isResendRegisterSuccess,
    isResendRegisterError,
    resendRegisterData,
    resendRegisterError,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otp.trim();
    if (!token) return;

    try {
      if (isRegisterFlow) {
        const result = await verifyEmail({ token: token }).unwrap();
        toast.success(result?.message);
        router.push("/set-password");
        return;
      }
      const result = await verifyResetToken({ token }).unwrap();
      toast.success(result?.message);
      const resetToken = result?.data?.token ?? result?.token ?? token;
      router.push(`/reset-password?token=${encodeURIComponent(resetToken)}`);
    } catch (err) {
      const message =
        err && typeof err === "object" && "data" in err
          ? ((err as { data?: { message?: string } }).data?.message ??
            "something went wrong!")
          : "something went wrong!";
      toast.error(message);
    }
  };

  if (mounted) {
    return (
      <div className="flex h-screen min-h-[100vh] w-full max-w-full overflow-x-hidden">
        {/* Left section */}
        <AuthImagePanel />
        {/* Right section */}
        <form
          onSubmit={handleSubmit}
          className="flex w-full min-w-0 flex-col justify-between px-5 pt-[80px] sm:px-[50px] lg:w-1/2 xl:px-[150px]"
        >
          <div className="w-full flex flex-col items-center lg:items-start">
            {" "}
            <h1 className="text-black-1 text-center lg:text-left font-bold text-[22px] w-full max-w-[334px]  leading-[30px] ">
              OTP Verification{" "}
            </h1>
            <p className="text-[14px] text-gray-8 text-center lg:text-left">
              Enter the verification code we just sent to{" "}
              <span className="font-medium text-black-1">{email}</span>
            </p>
            <div className="flex justify-center  gap-2 mt-8 w-full max-w-[500px] lg:max-w-full">
              <InputForOtp otp={otp} setOtp={setOtp} />
            </div>
            {emailError ? (
              <p className="mt-2 text-[14px] font-normal text-red-1">
                {emailError}
              </p>
            ) : null}
            <div className="mt-6 flex w-full items-center justify-center gap-1.5 text-[13px] text-gray-8 lg:justify-start">
              <span>Didn&apos;t get the code?</span>
              {isResendLoading ? (
                <span className="inline-flex items-center align-middle">
                  <BeatLoader color="#3C9197" size={6} />
                </span>
              ) : canResend ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="cursor-pointer font-medium text-green-1 hover:underline"
                >
                  Resend code
                </button>
              ) : (
                <span className="font-medium tabular-nums text-gray-6">
                  Resend in {formatTimer(timer)}
                </span>
              )}
            </div>
            <DoodleButton
              type="submit"
              disabled={otp.length < 6 || isResendLoading || isVerifyLoading}
              className="mt-6 flex h-[52px] w-full max-w-[500px] cursor-pointer items-center justify-center rounded-[12px] bg-green-1 text-[16px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 lg:max-w-full"
            >
              {isVerifyLoading ? (
                <BeatLoader color="white" size={8} />
              ) : (
                "Continue"
              )}
            </DoodleButton>
          </div>
          <div className="mt-14 w-full">
            <Footer />
          </div>
        </form>
      </div>
    );
  }

  return null;
}

export default VerifyOtp;
