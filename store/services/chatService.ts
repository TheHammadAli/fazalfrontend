import { baseApi } from "../baseApi";
export const chatService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAllConversationsForUser: build.query({
      query: ({
        id,
        page,
        limit,
      }: {
        id: string;
        page: number;
        limit: number;
      }) => {
        return {
          url: `/chat/conversations/${id}?page=${page}&limit=${limit}`,
          method: "GET",
        };
      },
      providesTags: ["Chat"],
    }),
    initiateChat: build.mutation({
      query: ({ buyerId, sellerId }: { buyerId: string; sellerId: string }) => {
        return {
          url: `/chat/conversation`,
          method: "POST",
          body: { buyerId, sellerId },
        };
      },
      invalidatesTags: ["Chat"],
    }),
    getConversationMessages: build.query({
      query: ({
        conversationId,
        page,
        limit,
      }: {
        conversationId: string;
        page: number;
        limit: number;
      }) => {
        return {
          url: `/chat/messages/${conversationId}?page=${page}&limit=${limit}`,
          method: "GET",
        };
      },
      providesTags: ["Chat"],
    }),
    sendMessage: build.mutation({
      query: (body: any) => {
        return {
          url: `/chat/message`,
          method: "POST",
          body: body,
        };
      },
      invalidatesTags: ["Chat"],
    }),
    unreadMessagesCount: build.query({
      query: ({ userId }: { userId: string }) => {
        return {
          url: `/chat/messages/unread/${userId}`,
          method: "GET",
        };
      },
      providesTags: ["Chat"],
    }),
    markMessagesAsRead: build.mutation({
      query: ({
        conversationId,
        userId,
      }: {
        conversationId: string;
        userId: string;
      }) => {
        return {
          url: `/chat/messages/mark-read`,
          method: "PATCH",
          body: { conversationId, userId },
        };
      },
      invalidatesTags: ["Chat"],
    }),
    markBroadcastMessagesAsRead: build.mutation({
      query: ({
        id,
        threadId
      }: {
        id: string;
        threadId: string;
      }) => {
        return {
          url: `/broadcast/${id}/threads/${threadId}/read`,
          method: "PATCH",
        };
      },
      invalidatesTags: ["BROADCAST"],
    }),
    broadcastMessage: build.mutation({
      query: (body) => {
        return {
          url: `/broadcast/create`,
          method: "POST",
          body: body,
        };
      },
      invalidatesTags: ["BROADCAST"],
    }),
    receivedBroadcastMessages: build.query({
      query: ({ page, limit }: { page: number; limit: number }) => {
        return {
          url: `/broadcast/my/received?page=${page}&limit=${limit}`,
          method: "GET",
        };
      },
      providesTags: ["BROADCAST"],
    }),
    sentBroadcastMessages: build.query({
      query: ({ page, limit }: { page: number; limit: number }) => {
        return {
          url: `/broadcast/my/broadcasts?page=${page}&limit=${limit}`,
          method: "GET",
        };
      },
      providesTags: ["BROADCAST"],
    }),
    getAllThreadsForBroadcast: build.query({
      query: ({
        id,
        // page,
        // limit,
      }: {
        id: string;
        // page: number;
        // limit: number;
      }) => {
        return {
          url: `/broadcast/threads/${id}`,
          // ?page=${page}&limit=${limit}`,
          method: "GET",
        };
      },
      providesTags: ["BROADCAST"],
    }),
    getBroadcastThreadMessages: build.query({
      query: ({ id, threadId }: { id: string; threadId: string }) => {
        return {
          url: `/broadcast/${id}/threads/${threadId}`,
          method: "GET",
        };
      },
      providesTags: ["BROADCAST"],
    }),
    sendBroadcastMessage: build.mutation({
      query: ({ id, body }) => ({
        url: `/broadcast/message/${id}`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["BROADCAST"],
    }),
  }),
});

export const {
  useSendBroadcastMessageMutation,
  useGetBroadcastThreadMessagesQuery,
  useReceivedBroadcastMessagesQuery,
  useSentBroadcastMessagesQuery,
  useMarkMessagesAsReadMutation,
  useMarkBroadcastMessagesAsReadMutation,
  useUnreadMessagesCountQuery,
  useSendMessageMutation,
  useGetAllConversationsForUserQuery,
  useInitiateChatMutation,
  useGetConversationMessagesQuery,
  useBroadcastMessageMutation,
  useGetAllThreadsForBroadcastQuery,
} = chatService;
