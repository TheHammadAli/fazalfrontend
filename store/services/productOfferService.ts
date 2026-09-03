import { baseApi } from "../baseApi";

export const productOfferService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    submitProductOffer: build.mutation({
      query: (body: { productId: string; price?: number; message: string }) => ({
        url: `/products/offers`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["PRODUCT_OFFER"],
    }),
    getMyReceivedProductOffers: build.query({
      query: ({ page, limit }: { page: number; limit: number }) => ({
        url: `/products/offers/my/received?page=${page}&limit=${limit}`,
        method: "GET",
      }),
      providesTags: ["PRODUCT_OFFER"],
    }),
    getMySentProductOffers: build.query({
      query: ({ page, limit }: { page: number; limit: number }) => ({
        url: `/products/offers/my/sent?page=${page}&limit=${limit}`,
        method: "GET",
      }),
      providesTags: ["PRODUCT_OFFER"],
    }),
    getOffersForProduct: build.query({
      query: ({ productId }: { productId: string }) => ({
        url: `/products/offers/product/${productId}`,
        method: "GET",
      }),
      providesTags: ["PRODUCT_OFFER"],
    }),
    acceptProductOffer: build.mutation({
      query: ({ offerId }: { offerId: string }) => ({
        url: `/products/offers/${offerId}/accept`,
        method: "PATCH",
      }),
      invalidatesTags: ["PRODUCT_OFFER"],
    }),
    declineProductOffer: build.mutation({
      query: ({ offerId }: { offerId: string }) => ({
        url: `/products/offers/${offerId}/decline`,
        method: "PATCH",
      }),
      invalidatesTags: ["PRODUCT_OFFER"],
    }),
  }),
});

export const {
  useSubmitProductOfferMutation,
  useGetMyReceivedProductOffersQuery,
  useGetMySentProductOffersQuery,
  useGetOffersForProductQuery,
  useAcceptProductOfferMutation,
  useDeclineProductOfferMutation,
} = productOfferService;
