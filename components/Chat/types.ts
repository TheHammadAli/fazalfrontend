export type ChatThreadParticipant = {
  id: string;
  name: string;
  email?: string;
  image?: string;
  role: string;
};

export type ChatThread = {
  threadId?: string;
  type?: string;
  id?: string;
  _id?: string;
  broadcastId?: string;
  name?: string;
  email?: string;
  preview: string;
  previewKey?: string;
  timeLabel: string;
  avatar: string;
  unread?: boolean | number;
  unreadCount?: number;
  createdAt?: string;
  buyer?: ChatThreadParticipant | string;
  seller?: ChatThreadParticipant;
  total?: number;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  text?: string;
  textKey?: string;
  sentAtLabel?: string;
  createdAt?: string;
  sender: string;
  senderId?: string;
  receiverId?: string;
  mine: boolean;
  message?: string;
  senderText?: string;
  status?: "sent" | "delivered" | "read";
  deliveredAt?: string;
  readAt?: string;
};
