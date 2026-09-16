import CompleteInfo from "@/components/Auth/CompleteInfo";
import { createSlice } from "@reduxjs/toolkit";
import { setCookie, getCookie, deleteCookie } from "cookies-next";
import {
  clearAuthCookies,
  setAuthTokens,
  setProfileCompletedCookie,
  setUserIdCookie,
} from "@/utils/authCookies";
// import { deleteCookie } from "cookies-next";

type otpInfoTypes = {
  type: string;
  phone: string;
  email: string;
  password: string;
};
let otpInfo: otpInfoTypes = {
  type: "",
  phone: "",
  email: "",
  password: "",
};
let confirmedPwd: boolean = false;
let token: string = "";
let userId: string = "";
let refToken: string = "";
let profileCompleted: boolean = false;
let isGuest: boolean = false;

if (typeof window !== "undefined") {
  const otpData = localStorage.getItem("otpInfo");
  const confirmedPwdData = localStorage.getItem("confirmedPwd");
  const cookieToken = getCookie("token");
  const refreshToken = getCookie("refreshToken");
  const id = getCookie("userId");
  const completeProfile = getCookie("profileCompleted");
  const guestCookie = getCookie("isGuest");
  token = typeof cookieToken === "string" ? cookieToken : "";
  userId = typeof id === "string" ? id : "";
  refToken = typeof refreshToken === "string" ? refreshToken : "";
  if (otpData) {
    otpInfo = JSON.parse(otpData);
  }
  if (confirmedPwdData === "true") {
    confirmedPwd = true;
  } else {
    confirmedPwd = false;
  }
  if (completeProfile === "true") {
    profileCompleted = true;
  } else {
    profileCompleted = false;
  }
  isGuest = guestCookie === "true";
}
const authSlice = createSlice({
  name: "authSlice",
  initialState: {
    otpInfo: otpInfo,
    confirmedPwd: confirmedPwd,
    token: token,
    refreshToken: refToken,
    userId: userId,
    profileCompleted: profileCompleted,
    isGuest: isGuest,
  },
  reducers: {
    setOtpInfo: (state, action) => {
      state.otpInfo = action.payload;
      localStorage.setItem("otpInfo", JSON.stringify(action.payload));
    },
    setConfirmPwd: (state, action) => {
      state.confirmedPwd = action.payload;
      localStorage.setItem("confirmedPwd", action.payload);
    },

    setToken: (state, action) => {
      const accessToken = action.payload.accessToken;
      const refreshToken =
        action.payload.refreshToken ?? state.refreshToken ?? "";
      // Undefined (every caller except Signin) keeps the previous
      // always-persist behavior — only Signin's unchecked "Remember me"
      // actually passes false.
      const rememberMe = action.payload.rememberMe ?? true;

      state.token = accessToken;
      if (refreshToken) {
        state.refreshToken = refreshToken;
      }
      state.isGuest = false;

      // Update access + refresh cookies together.
      setAuthTokens(
        {
          accessToken,
          refreshToken: refreshToken || undefined,
        },
        rememberMe,
      );
      deleteCookie("isGuest", { path: "/" });
    },

    setGuest: (state, action) => {
      state.isGuest = action.payload;
      if (action.payload) {
        setCookie("isGuest", "true", { path: "/" });
        localStorage.removeItem("user");
      } else {
        deleteCookie("isGuest", { path: "/" });
      }
    },

    setUserId: (state, action) => {
      state.userId = action.payload;
      setUserIdCookie(action.payload);
    },
    setProfileCompleted: (state, action) => {
      state.profileCompleted = action.payload;
      setProfileCompletedCookie(action.payload);
    },
    logout: (state) => {
      state.token = "";
      state.refreshToken = "";
      state.userId = "";
      state.profileCompleted = false;
      state.isGuest = false;
      state.otpInfo = { type: "", phone: "", email: "", password: "" };
      state.confirmedPwd = false;

      localStorage.removeItem("otpInfo");
      localStorage.removeItem("confirmedPwd");
      localStorage.removeItem("user");

      clearAuthCookies();
    },
  },
});

export const {
  setOtpInfo,
  setConfirmPwd,
  setToken,
  setUserId,
  logout,
  setProfileCompleted,
  setGuest,
} = authSlice.actions;

export default authSlice.reducer;
