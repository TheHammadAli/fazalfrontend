import { baseApi } from "../baseApi";
export const feedService = baseApi.injectEndpoints({
  // Next.js dev-mode Fast Refresh re-executes this module (and re-injects the
  // same endpoint names) on every edit; without this it logs a harmless but
  // noisy RTK Query warning. No effect in production, where the module only
  // ever runs once.
  overrideExisting: process.env.NODE_ENV === "development",
  endpoints: (build) => ({
    getAllProductsFeed: build.query({
      // userId is what makes the API return `isLiked` per item. Without it the
      // heart state has to be guessed client-side, which is how it ended up
      // showing on the wrong cards.
      query: ({ page, limit, userId }: { page: number; limit: number; userId?: string }) => {
        return {
          url: `/products/with-videos/all?page=${page}&limit=${limit}${userId ? `&userId=${userId}` : ""}`,
          method: "GET",
        };
      },
      // Shares the "PRODUCT" tag with the product list/detail queries, so any
      // create/update/delete (which already invalidates "PRODUCT") refetches
      // the feed automatically instead of needing a manual page refresh.
      // "FEED" is its own, narrower tag (see likeVideo/unlikeVideo below) so a
      // like/unlike refreshes just this and the sibling feed queries, not
      // every "PRODUCT" consumer (the product detail page included).
      providesTags: ["PRODUCT", "FEED"],
    }),
    getAllServicesFeed: build.query({
      query: ({ page, limit, userId }: { page: number; limit: number; userId?: string }) => {
        return {
          url: `/services/with-videos/all?page=${page}&limit=${limit}${userId ? `&userId=${userId}` : ""}`,
          method: "GET",
        };
      },
      // Same as above: services mutations invalidate "SERVICES", so wiring the
      // feed to provide it makes the feed refresh on its own.
      providesTags: ["SERVICES", "FEED"],
    }),
    likeVideo: build.mutation({
      query: (body: any) => {
        return {
          url: `/likes`,
          method: "POST",
          body,
        };
      },
      // Not "PRODUCT"/"SERVICES" — every screen that shows like state already
      // applies its own optimistic update, so invalidating those just forced a
      // visible refetch/reload of the whole product/service detail page for no
      // reason. "FEED" is the narrow tag that actually needs refreshing: the
      // feed's own isLiked/likesCount (and likedVideoByUser below) come from
      // whatever was cached BEFORE this like/unlike, and neither was being
      // invalidated by anything — so navigating off the Feed screen and back
      // (a fresh mount, same cached query args) kept showing the pre-like
      // state instead of what was just saved.
      invalidatesTags: ["FAVOURITES", "FEED"],
    }),
    unlikeVideo: build.mutation({
      query: (body: any) => {
        return {
          url: `/likes`,
          method: "DELETE",
          body,
        };
      },
      invalidatesTags: ["FAVOURITES", "FEED"],
    }),
    likedVideoByUser: build.query({
      query: ({ userId, type }: any) => {
        return {
          url: `/likes/user/${userId}?itemType=${type}`,
          method: "GET",
        };
      },
      // Without this, liking/unliking never invalidated this query's cache —
      // ReelItem's own isLiked (re-derived from this response for whichever
      // reel is currently active) kept overriding the correct value with
      // whatever this returned before the like happened.
      providesTags: ["FEED"],
    }),
    getUserFavourites: build.query({
      query: (userId: string) => ({
        url: `/likes/user/${userId}`,
        method: "GET",
      }),
      providesTags: ["FAVOURITES"],
    }),
    trackShare: build.mutation({
      query: (body: { itemId: string; itemType: "product" | "service" }) => {
        return {
          url: `/shares`,
          method: "POST",
          body,
        };
      },
    }),
  }),
});
export const {
  useLikedVideoByUserQuery,

  useLikeVideoMutation,
  useUnlikeVideoMutation,
  useTrackShareMutation,
  useGetAllProductsFeedQuery,
  useGetAllServicesFeedQuery,
  useGetUserFavouritesQuery,
} = feedService;
