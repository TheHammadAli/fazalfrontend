"use client";
import React, { useState } from "react";
import Image from "next/image";
import { BeatLoader } from "react-spinners";
import AuthImagePanel from "./AuthImagePanel";
import { useAppDispatch } from "@/store/store";
import { useRouter } from "next/navigation";
import { useSigninMutation } from "@/store/services/authService";
import toast from "react-hot-toast";
import {
  setGuest,
  setProfileCompleted,
  setToken,
  setUserId,
} from "@/store/reducers/authReducer";
import { baseApi } from "@/store/baseApi";
import { BASE_URL } from "@/assets/content/constants";
import GoogleIcon from "@/assets/icons/google-icon.svg";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import DoodleButton from "@/components/Ui/DoodleButton";
import Footer from "./Footer";
import { useDictionary } from "@/dictionaries/DictionaryProvider";
import { requestBrowserNotificationPermission } from "@/utils/showDesktopNotification";
import { isAdminOnlyAccount } from "@/utils/userRoles";

export type Body = {
  email?: string;
  password?: string;
  loginContext?: "web" | "admin";
};

const SIGNIN_ERROR_TOAST_ID = "signin-error";
const SIGNIN_ERROR_TOAST_DURATION_MS = 1000;

function getSigninErrorMessage(
  err: unknown,
  fallback: string,
): string {
  if (!err || typeof err !== "object") return fallback;

  if ("data" in err && err.data && typeof err.data === "object") {
    const data = err.data as { message?: string };
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }

  if ("message" in err && typeof err.message === "string" && err.message.trim()) {
    return err.message;
  }

  return fallback;
}

function Signin() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { placeholders, error_messages } = useDictionary();

  const [emailError, setEmailError] = useState("");
  const [email, setEmail] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [signin, { isLoading }] = useSigninMutation();

  const handleSignin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let isValid = true;

    if (!email.trim()) {
      setEmailError("Email is required*");
      isValid = false;
    } else {
      setEmailError("");
    }

    if (!password.trim()) {
      setPasswordError("Password is required*");
      isValid = false;
    } else {
      setPasswordError("");
    }

    if (!isValid) return;

    try {
      toast.dismiss(SIGNIN_ERROR_TOAST_ID);

      // Chrome native Allow/Block dialog (only appears if permission is still "default").
      await requestBrowserNotificationPermission();

      const body: Body = { email, password, loginContext: "web" };

      const res = await signin(body).unwrap();

      if (isAdminOnlyAccount(res?.data?.user ?? res?.data)) {
        toast.error(error_messages.admin_login_not_allowed, {
          id: SIGNIN_ERROR_TOAST_ID,
          duration: SIGNIN_ERROR_TOAST_DURATION_MS,
        });
        return;
      }

      // Clear cached data from any previous session before storing the new user.
      dispatch(baseApi.util.resetApiState());

      // ✅ Store tokens
      dispatch(
        setToken({
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken,
        })
      );

      // ✅ Store user
      localStorage.setItem("user", JSON.stringify({ user: res.data.user }));

      dispatch(setUserId(res.data.user.id));

      // ✅ Navigation
      if (!res?.data?.user?.phone) {
        dispatch(setProfileCompleted(false));
        router.replace("/complete-info");
      }

      else {
        dispatch(setProfileCompleted(true));
        router.replace("/welcome");
      }
    } catch (err) {
      const message = getSigninErrorMessage(
        err,
        error_messages.something_went_wrong,
      );

      toast.error(message, {
        id: SIGNIN_ERROR_TOAST_ID,
        duration: SIGNIN_ERROR_TOAST_DURATION_MS,
      });
    }
  };

  const handleContinueAsGuest = () => {
    dispatch(setGuest(true));
    router.replace("/home");
  };

  return (
    <div className="flex h-screen min-h-[818px] w-full max-w-full overflow-x-hidden">
      {/* Left section */}
      <AuthImagePanel />

      {/* Right section */}
      <form
        onSubmit={handleSignin}
        className="flex w-full min-w-0 flex-col items-center px-5 pt-[80px] sm:px-[50px] lg:w-1/2 lg:justify-between xl:px-[150px]"
      >
        <div className="max-w-[500px] w-full">
          <h1 className="text-black-1 font-bold text-[22px] text-center">
            Sign in
          </h1>
          <p className="font-light text-[14px] text-center text-gray-8">
            Sign in to your account
          </p>

          {/* Email */}
          <div className="space-y-2 mt-5">
            <p
              className={`text-[14px] ${emailError ? "text-red-1" : "text-gray-8"
                }`}
            >
              Email
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`h-[28px] w-full border-b ${emailError ? "border-red-1" : "border-gray-9"
                } focus:outline-none`}
            />
            {emailError && (
              <p className="text-red-1 text-[14px]">{emailError}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2 mt-5">
            <p
              className={`text-[14px] ${passwordError ? "text-red-1" : "text-gray-8"
                }`}
            >
              Password
            </p>
            <div
              className={`flex items-center border-b ${passwordError ? "border-red-1" : "border-gray-9"
                }`}
            >
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[28px] w-full focus:outline-none"
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
            {passwordError && (
              <p className="text-red-1 text-[14px]">{passwordError}</p>
            )}
          </div>

          <div className="flex justify-end pt-4 text-[14px] text-green-1">
            <p
              className="cursor-pointer hover:underline"
              onClick={() => router.push("/forget-password")}
            >
              Forgot password?
            </p>
          </div>

          <DoodleButton
            type="submit"
            className="mt-6 flex h-[52px] w-full cursor-pointer items-center justify-center rounded-[12px] bg-green-1 text-white disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoading}
          >
            {isLoading ? <BeatLoader color="white" size={8} /> : "Continue"}
          </DoodleButton>

          <DoodleButton
            type="button"
            onClick={() => {
              if (!BASE_URL) {
                toast.error(error_messages.something_went_wrong);
                return;
              }
              // Cross-origin redirect to the backend's OAuth flow — a real
              // navigation, not a client-side route (which wouldn't exist
              // on this app anyway).
              window.location.href = `${BASE_URL}/auth/google`;
            }}
            className="mt-6 flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-blue-1 text-white"
          >
            <Image src={GoogleIcon} alt="google_icon" />
            Continue with Google
          </DoodleButton>
          <div className="text-center text-[12px] text-gray-8 mt-5">
            Don&apos;t have an account?{" "}
            <span
              className="text-green-1 cursor-pointer hover:underline"
              onClick={() => router.push("/send-otp")}
            >
              Sign up
            </span>
          </div>
          <button
            type="button"
            onClick={handleContinueAsGuest}
            className="mt-4 h-[52px] w-full rounded-[12px] cursor-pointer    bg-gray-9 text-[16px] font-medium text-gray-8"
          >
            {placeholders.continue_as_guest}
          </button>


        </div>
        <div className="lg:mb-10 mt-14 lg:mt-0">
          <Footer />
        </div>

      </form>
    </div>
  );
}

export default Signin;
