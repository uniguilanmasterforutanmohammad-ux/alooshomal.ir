export type SupportChatStatus = 'OPEN' | 'CLOSED';
export type SupportChatSenderRole = 'USER' | 'STAFF' | 'SYSTEM';

export interface SupportChatMessage {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderRole: SupportChatSenderRole;
  body: string;
  readAt: string | null;
  createdAt: string;
  sender?: {
    id: string;
    fullName: string | null;
    email: string | null;
    role?: string;
  } | null;
}

export interface SupportChatUser {
  id: string;
  email: string | null;
  phone?: string | null;
  fullName: string | null;
  role?: string;
}

export interface SupportConversation {
  id: string;
  userId: string;
  status: SupportChatStatus;
  assignedToId: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  userUnread: number;
  staffUnread: number;
  createdAt: string;
  updatedAt: string;
  user?: SupportChatUser | null;
  assignedTo?: { id: string; fullName: string | null; email: string | null } | null;
  messages?: SupportChatMessage[];
  _count?: { messages: number };
}

/** One frame pushed over the chat SSE stream. */
export interface SupportChatEvent {
  type: 'ready' | 'message' | 'read' | 'status' | 'created';
  conversationId?: string;
  message?: SupportChatMessage;
  userUnread?: number;
  staffUnread?: number;
}
