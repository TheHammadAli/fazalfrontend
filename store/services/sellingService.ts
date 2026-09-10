import type { FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { baseApi } from "../baseApi";

type PaginatedListResponse = {
  data: unknown[];
  meta?: { total?: number; totalPages?: number };
};

const EMPTY_PAGINATED_LIST: PaginatedListResponse = {
  data: [],
  meta: { total: 0, totalPages: 0 },
};

function isNotFoundError(error: FetchBaseQueryError | undefined): boolean {
  if (!error) return false;
  if (error.status === 404) return true;
  const withOriginal = error as FetchBaseQueryError & {
    originalStatus?: number;
  };
  return withOriginal.originalStatus === 404;
}

function toSearchParams(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") search.set(key, String(value));
  }
  return search;
}

export type GetAllCategoriesParams =
  | string
  | { type?: string; lang?: string; page?: number; limit?: number };

function normalizeCategoriesParams(params: GetAllCategoriesParams = ""): {
  type?: string;
  lang?: string;
  page?: number;
  limit?: number;
} {
  if (typeof params === "string") {
    return params ? { type: params } : {};
  }
  return params ?? {};
}

export const profileService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createShop: build.mutation({
      query: (body) => ({
        url: "/shops/create",
        method: "POST",
        body,
      }),
      invalidatesTags: [],
    }),
    getUsersShops: build.query({
      query: (_userId: string) => {
        return {
          url: `/shops/userShops`,
          method: "GET",
        };
      },
      providesTags: ["SHOP_DETAIL"],
    }),
    getAllCategories: build.query({
      query: (params: GetAllCategoriesParams = "") => {
        const { lang: _lang, ...apiParams } = normalizeCategoriesParams(params);
        return {
          url: `/categories?${toSearchParams(apiParams)}`,
          method: "GET",
        };
      },
      providesTags: ["CATEGORIES"],
    }),
    addService: build.mutation({
      query: (body) => ({
        url: "/services/create",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SERVICES"],
    }),
    getShopDetail: build.query({
      query: (id) => {
        return {
          url: `/shops/detail/${id}`,
          method: "GET",
        };
      },
      providesTags: ["SHOP_DETAIL"],
    }),
    trackShopView: build.mutation({
      query: (id: string) => ({
        url: `/shops/${id}/track-view`,
        method: "POST",
      }),
    }),
    trackShopProductView: build.mutation({
      query: (shopId: string) => ({
        url: `/shops/${shopId}/track-product-view`,
        method: "POST",
      }),
    }),
    trackShopContactClick: build.mutation({
      query: (id: string) => ({
        url: `/shops/${id}/track-contact-click`,
        method: "POST",
      }),
    }),
    trackShopWhatsappClick: build.mutation({
      query: (id: string) => ({
        url: `/shops/${id}/track-whatsapp-click`,
        method: "POST",
      }),
    }),

    getShopProducts: build.query({
      query: (id) => {
        return {
          url: `/products/shop/${id}`,
          method: "GET",
        };
      },
      providesTags: ["PRODUCT"],
    }),
    getUserProducts: build.query({
      query: (id) => {
        return {
          url: `/products/user/${id}`,
          method: "GET",
        };
      },
      providesTags: ["PRODUCT"],
    }),

    listProduct: build.mutation({
      query: ({ id, formData, type }) => ({
        url: `/products/${id}/${type}`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["PRODUCT"],
    }),

    // A shop video post isn't a real product listing — its own routes, not /products.
    postVideo: build.mutation({
      query: ({ shopId, formData }) => ({
        url: `/video-posts/${shopId}`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["PRODUCT"],
    }),
    getShopVideoPosts: build.query({
      query: (shopId) => ({
        url: `/video-posts/shop/${shopId}`,
        method: "GET",
      }),
      providesTags: ["PRODUCT"],
    }),
    deleteVideoPost: build.mutation({
      query: (id: string) => ({
        url: `/video-posts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PRODUCT"],
    }),

    // A service provider's video post — its own routes, not /services.
    postServiceVideo: build.mutation({
      query: (formData: FormData) => ({
        url: `/service-video-posts`,
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["SERVICES"],
    }),
    getMyServiceVideoPosts: build.query({
      query: () => ({
        url: `/service-video-posts/mine`,
        method: "GET",
      }),
      providesTags: ["SERVICES"],
    }),
    deleteServiceVideoPost: build.mutation({
      query: (id: string) => ({
        url: `/service-video-posts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SERVICES"],
    }),

    orderProduct: build.mutation({
      query: (body) => ({
        url: "/orders",
        method: "POST",
        body,
      }),
    }),
    updateProduct: build.mutation({
      query: ({ id, formData }) => ({
        url: `/products/${id}`,
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: ["PRODUCT"],
    }),
    updateService: build.mutation({
      query: ({ id, formData }) => ({
        url: `/services/update/${id}`,
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: ["SERVICES"],
    }),
    serviceBookRequest: build.mutation({
      query: (body) => ({
        url: "/services/create-request",
        method: "POST",
        body,
      }),
    }),
    deleteProductMedia: build.mutation({
      query: ({ id, body }) => ({
        url: `/products/${id}/media`,
        method: "DELETE",
        body: body,
      }),
    }),
    deleteServiceMedia: build.mutation({
      query: ({ id, body }) => ({
        url: `/services/${id}/media`,
        method: "DELETE",
        body: body,
      }),
      invalidatesTags: ["SERVICES"],
    }),
    updateShop: build.mutation({
      query: ({ id, formData }) => ({
        url: `/shops/${id}`,
        method: "PUT",
        body: formData,
      }),
      invalidatesTags: ["SHOP_DETAIL"],
    }),

    getCustomerOrders: build.query({
      query: ({
        id,
        page = 1,
        limit = 50,
      }: {
        id: string;
        page?: number;
        limit?: number;
      }) => {
        return {
          url: `/orders/owner/${id}?ownerModel=User&page=${page}&limit=${limit}`,
          method: "GET",
        };
      },
    }),
    getUserService: build.query({
      query: (id) => {
        return {
          url: `/services/user/${id}`,
          method: "GET",
        };
      },
      providesTags: ["SERVICES"],
    }),
    getServiceDetail: build.query({
      query: (id) => {
        return {
          url: `/services/${id}`,
          method: "GET",
        };
      },
      providesTags: ["SERVICES"],
    }),
    trackServiceView: build.mutation({
      query: (id: string) => ({
        url: `/services/${id}/track-view`,
        method: "POST",
      }),
    }),
    trackServiceContactClick: build.mutation({
      query: (id: string) => ({
        url: `/services/${id}/track-contact-click`,
        method: "POST",
      }),
    }),
    trackServiceWhatsappClick: build.mutation({
      query: (id: string) => ({
        url: `/services/${id}/track-whatsapp-click`,
        method: "POST",
      }),
    }),
    getServicesRequests: build.query<
      PaginatedListResponse,
      {
        id: string;
        role?: string;
        page?: number;
        limit?: number;
        status?: string;
        jobStatus?: string;
      }
    >({
      async queryFn(arg, _queryApi, _extraOptions, baseQuery) {
        const { id, ...params } = arg;
        const result = await baseQuery({
          url: `/services/requests/${id}?${toSearchParams(params)}`,
          method: "GET",
        });

        if (isNotFoundError(result.error as FetchBaseQueryError | undefined)) {
          return { data: EMPTY_PAGINATED_LIST };
        }
        if (result.error) {
          return { error: result.error as FetchBaseQueryError };
        }
        return { data: result.data as PaginatedListResponse };
      },
      providesTags: ["SERVICES_REQUESTS"],
    }),
    updateServiceRequest: build.mutation({
      query: (body) => ({
        url: `/services/status`,
        method: "PATCH",
        body: body,
      }),
      invalidatesTags: ["SERVICES_REQUESTS"],
    }),

    startJob: build.mutation({
      query: (body) => ({
        url: `/services/job-status`,
        method: "PATCH",
        body: body,
      }),
      invalidatesTags: ["SERVICES_REQUESTS"],
    }),
    deleteProduct: build.mutation({
      query: (id) => ({
        url: `/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["PRODUCT"],
    }),
    deleteService: build.mutation({
      query: (id) => ({
        url: `/services/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SERVICES"],
    }),
    getBookedServices: build.query({
      query: ({ customerId, ...params }: any) => {
        return {
          url: `/services/customer/${customerId}?${new URLSearchParams(params)}`,
          method: "GET",
        };
      },
      providesTags: ["SERVICES"],
    }),
    getOrdersByOwner: build.query({
      query: ({ ownerId, ...params }: any) => {
        return {
          url: `/orders/owner/${ownerId}?${new URLSearchParams(params)}`,
          method: "GET",
        };
      },
      providesTags: ["ORDERS"],
    }),
    updateOrderStatus: build.mutation({
      query: ({ orderId, status, amount, paymentType }: any) => ({
        url: `/orders/${orderId}`,
        method: "PATCH",
        body: { status, amount, paymentType },
      }),
      invalidatesTags: ["ORDERS"],
    }),
    getOrdersByBuyer: build.query({
      query: ({ buyerId, ...params }: any) => {
        return {
          url: `/orders/buyer/${buyerId}?${new URLSearchParams(params)}`,
          method: "GET",
        };
      },
    }),
  }),
});
export const {
  useGetOrdersByOwnerQuery,
  useUpdateOrderStatusMutation,
  useGetOrdersByBuyerQuery,
  useGetBookedServicesQuery,
  useDeleteProductMutation,
  useStartJobMutation,
  useUpdateServiceRequestMutation,
  useGetServicesRequestsQuery,
  useDeleteServiceMediaMutation,
  useGetServiceDetailQuery,
  useTrackServiceViewMutation,
  useTrackServiceContactClickMutation,
  useTrackServiceWhatsappClickMutation,
  useGetUserServiceQuery,
  useGetCustomerOrdersQuery,
  useUpdateShopMutation,
  useDeleteProductMediaMutation,
  useUpdateProductMutation,
  useOrderProductMutation,
  useGetShopProductsQuery,
  useListProductMutation,
  usePostVideoMutation,
  useGetShopVideoPostsQuery,
  useDeleteVideoPostMutation,
  usePostServiceVideoMutation,
  useGetMyServiceVideoPostsQuery,
  useDeleteServiceVideoPostMutation,
  useGetShopDetailQuery,
  useTrackShopViewMutation,
  useTrackShopProductViewMutation,
  useTrackShopContactClickMutation,
  useTrackShopWhatsappClickMutation,
  useAddServiceMutation,
  useCreateShopMutation,
  useGetUsersShopsQuery,
  useGetAllCategoriesQuery,
  useUpdateServiceMutation,
  useGetUserProductsQuery,
  useServiceBookRequestMutation,
  useDeleteServiceMutation,
} = profileService;
