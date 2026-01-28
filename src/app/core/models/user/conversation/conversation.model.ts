export enum ConversationsStatus{
    Open = 'Open',
    Closed = 'Closed'
}

export interface Conversations{
    id: number;
    subject: string;
    status: ConversationsStatus;
    createdAt: string;
    closedAt?: string | null;
    lastMessage?: string;
    unreadCount?: number;
}