import { baseApi } from "../baseApi";

export const reportsService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createReport: build.mutation({
      query: (body: {
        entityId: string;
        entityType: "shop" | "product" | "service";
        reason: string;
        details: string;
      }) => ({
        url: "/reports",
        method: "POST",
        body,
      }),
      invalidatesTags: ["REPORTS"],
    }),
    getMyReports: build.query({
      query: (params: { page?: number; limit?: number } = {}) => ({
        url: `/reports/mine?${new URLSearchParams(params as Record<string, string>)}`,
        method: "GET",
      }),
      providesTags: ["REPORTS"],
    }),
    updateReport: build.mutation({
      query: ({ id, ...body }: { id: string; reason?: string; details?: string }) => ({
        url: `/reports/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["REPORTS"],
    }),
    deleteReport: build.mutation({
      query: (id: string) => ({
        url: `/reports/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["REPORTS"],
    }),
  }),
});

export const {
  useCreateReportMutation,
  useGetMyReportsQuery,
  useUpdateReportMutation,
  useDeleteReportMutation,
} = reportsService;
