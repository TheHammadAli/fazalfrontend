import { useInitiateChatMutation } from "@/store/services/chatService";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const useInitiateChat = () => {
  const [initiateChat, { isLoading }] = useInitiateChatMutation();
  const router = useRouter();

  const onInitiateChat = async (
    buyerId: string,
    sellerId: string,
    initialMessage?: string,
  ) => {
    try {
      const result = await initiateChat({ buyerId, sellerId }).unwrap();
      const conversationId = result?.data?._id ?? result?.data?.id;
      const params = new URLSearchParams();
      if (conversationId) params.set("chatId", String(conversationId));
      if (initialMessage?.trim()) {
        params.set("draft", initialMessage.trim());
      }
      router.push(`/chat?${params.toString()}`);
    } catch (error) {
      toast.error(
        (error as { data?: { message?: string } })?.data?.message ||
          "Something went wrong",
      );
    }
  };

  return {
    onInitiateChat,
    isLoading,
  };
};

export default useInitiateChat;
