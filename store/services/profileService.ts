import { baseApi } from "../baseApi";

type UserDetailResponse = {
  data?: {
    image?: string;
    imageCacheKey?: number;
    imageIsLocalPreview?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export const profileService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    registerFcmToken: build.mutation({
      query: (token: string) => ({
        url: "/users/register-fcm-token",
        method: "POST",
        body: { token },
      }),
    }),

    unregisterFcmToken: build.mutation({
      query: (token: string) => ({
        url: "/users/unregister-fcm-token",
        method: "POST",
        body: { token },
      }),
    }),

    updateProfile: build.mutation({
      query: ({ formData, id }) => ({
        url: "/users/" + id,
        method: "PUT",
        body: formData,
      }),
      async onQueryStarted({ formData, id }, { dispatch, queryFulfilled }) {
        const imageEntry = formData.get("image");
        const hasNewImage = imageEntry instanceof Blob;
        const previewUrl = hasNewImage
          ? URL.createObjectURL(imageEntry)
          : undefined;

        const patch = dispatch(
          profileService.util.updateQueryData(
            "getUserDetail",
            id,
            (draft: UserDetailResponse) => {
              if (!draft?.data) return;
              const name = formData.get("name");
              if (typeof name === "string") draft.data.name = name;
              if (previewUrl) {
                draft.data.image = previewUrl;
                draft.data.imageCacheKey = Date.now();
                draft.data.imageIsLocalPreview = true;
              }
            },
          ),
        );

        try {
          const { data } = await queryFulfilled;
          dispatch(
            profileService.util.updateQueryData(
              "getUserDetail",
              id,
              (draft: UserDetailResponse) => {
                if (!draft?.data) return;
                if (data?.data) {
                  const keepPreview =
                    draft.data.imageIsLocalPreview &&
                    typeof draft.data.image === "string" &&
                    draft.data.image.startsWith("blob:");
                  const localImage = draft.data.image;
                  const localKey = draft.data.imageCacheKey;
                  Object.assign(draft.data, data.data);
                  if (keepPreview && localImage) {
                    // Keep instant local preview; CDN URL often unchanged and loads slowly
                    draft.data.image = localImage;
                    draft.data.imageCacheKey = localKey ?? Date.now();
                    draft.data.imageIsLocalPreview = true;
                  } else if (hasNewImage) {
                    draft.data.imageCacheKey = Date.now();
                    draft.data.imageIsLocalPreview = false;
                  }
                }
              },
            ),
          );
        } catch {
          patch.undo();
          if (previewUrl) URL.revokeObjectURL(previewUrl);
        }
      },
      invalidatesTags: ["profile"],
    }),

    getUserDetail: build.query({
      query: (id) => {
        return {
          url: `/users/detail/${id}`,
          method: "GET",
        };
      },
      providesTags: ["profile"],
      // Preserve optimistic preview / cache-bust key across tag invalidation refetches
      merge: (currentCache, newItems) => {
        if (!currentCache?.data || !newItems?.data) {
          return newItems;
        }

        const curImage = currentCache.data.image;
        const curKey = currentCache.data.imageCacheKey;
        const keepPreview =
          currentCache.data.imageIsLocalPreview &&
          typeof curImage === "string" &&
          curImage.startsWith("blob:");
        const sameRemoteImage =
          !keepPreview &&
          !!curKey &&
          curImage === newItems.data.image;

        Object.assign(currentCache, newItems);
        currentCache.data = { ...newItems.data };

        if (keepPreview && curImage) {
          currentCache.data.image = curImage;
          currentCache.data.imageCacheKey = curKey;
          currentCache.data.imageIsLocalPreview = true;
        } else if (sameRemoteImage) {
          currentCache.data.imageCacheKey = curKey;
        }
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg !== previousArg;
      },
    }),
  }),
});
export const {
  useGetUserDetailQuery,
  useUpdateProfileMutation,
  useLazyGetUserDetailQuery,
  useRegisterFcmTokenMutation,
  useUnregisterFcmTokenMutation,
} = profileService;
