import { baseApi } from "../baseApi";

export const broadcastOfferService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    submitBroadcastOffer: build.mutation({
      query: (body: { broadcastId: string; price: number; message: string }) => ({
        url: `/broadcast/offers`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["BROADCAST_OFFER", "BROADCAST"],
    }),
    getMyOfferedBroadcasts: build.query({
      query: ({ page, limit }: { page: number; limit: number }) => ({
        url: `/broadcast/offers/my?page=${page}&limit=${limit}`,
        method: "GET",
      }),
      providesTags: ["BROADCAST_OFFER"],
    }),
    getOffersForBroadcast: build.query({
      query: ({ broadcastId }: { broadcastId: string }) => ({
        url: `/broadcast/offers/broadcast/${broadcastId}`,
        method: "GET",
      }),
      providesTags: ["BROADCAST_OFFER"],
    }),
    acceptBroadcastOffer: build.mutation({
      query: ({ offerId }: { offerId: string }) => ({
        url: `/broadcast/offers/${offerId}/accept`,
        method: "PATCH",
      }),
      invalidatesTags: ["BROADCAST_OFFER", "BROADCAST"],
    }),
    declineBroadcastOffer: build.mutation({
      query: ({ offerId }: { offerId: string }) => ({
        url: `/broadcast/offers/${offerId}/decline`,
        method: "PATCH",
      }),
      invalidatesTags: ["BROADCAST_OFFER", "BROADCAST"],
    }),
  }),
});

export const {
  useSubmitBroadcastOfferMutation,
  useGetMyOfferedBroadcastsQuery,
  useGetOffersForBroadcastQuery,
  useAcceptBroadcastOfferMutation,
  useDeclineBroadcastOfferMutation,
} = broadcastOfferService;
