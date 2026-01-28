export interface ConversationMessage{
    id: number;
    conversationId: number;
    message: string;
    createdAt: string;
    isAdmin: boolean;

    senderUsername: string;
    senderEmail?: string;
}