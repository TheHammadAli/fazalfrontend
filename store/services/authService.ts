import { baseApi } from "../baseApi";

// Define or import these interfaces from the correct location

export const authService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    sendOtp: build.mutation({
      query: (body) => ({
        url: "/auth/send-otp",
        method: "POST",
        body,
      }),
    }),
    verifyResetToken: build.query({
      query: ({token}) => ({
        url: "/auth/verify-reset-token?token=" + token,
        method: "GET",
      }),
    }),
    // this is for resed
    verifyEmail: build.query({
      query: ({token}) => ({
        url: "/auth/verify-email?token=" + token,
        method: "GET",
    
      }),
    }),
    signup: build.mutation({
      query: (body) => ({
        url: "/users/createUser",
        method: "POST",
        body,
      }),
    }),
    signin: build.mutation({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
      }),
    }),
    forgotPassword: build.mutation({
      query: (body) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body,
      }),
    }),
    resetPassword: build.mutation({
      query: (body) => ({
        url: "/auth/reset-password",
        method: "PUT",
        body,
      }),
    }),
    getLocations: build.query({
      query: (params) => {
        return {
          url: `/search/autocomplete-locations?${new URLSearchParams(params)}`,
          method: "GET",
        };
      },
    }),
    getCityAreas: build.query({
      query: (params) => ({
        url: `/search/city-areas?${new URLSearchParams(params)}`,
        method: "GET",
      }),
    }),
    reverseGeocode: build.query({
      query: (params: { lat: string; lng: string }) => ({
        url: `/search/reverse-geocode?${new URLSearchParams(params)}`,
        method: "GET",
      }),
    }),
    getUserWithProvidedToken: build.query({
      query: ({ token }) => {
        return {
          url: `/auth/getCurrentUser`,
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };
      },
    }),
    getProductOwnerDetail: build.query({
      query: (id) => {
        return {
          url: `/users/detail/${id}`,
          method: "GET",
        };
      },
    }),
    deleteAccount: build.mutation({
      query: ({ id }) => ({
        url: `/users/${id}/deactivate`,
        method: "DELETE",
      }),
    }),
    sendEmailVerificationLink: build.mutation({
      query: (body) => ({
        url: "/auth/send-email-verification",
        method: "POST",
        body,
      }),
    }),
  }),
});
export const {
  useSendEmailVerificationLinkMutation,
  useDeleteAccountMutation,
  useGetProductOwnerDetailQuery,
  useGetUserWithProvidedTokenQuery,
  useGetLocationsQuery,
  useGetCityAreasQuery,
  useLazyReverseGeocodeQuery,
  useResetPasswordMutation,
  useLazyVerifyEmailQuery,
  useForgotPasswordMutation,
  useSendOtpMutation,
  useVerifyResetTokenQuery,
  useLazyVerifyResetTokenQuery,
  useSignupMutation,
  useSigninMutation,
} = authService;
