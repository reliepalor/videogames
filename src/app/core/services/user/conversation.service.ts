import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Conversations, ConversationsStatus } from '../../models/user/conversation/conversation.model';
import { ConversationMessage } from '../../models/user/conversation/conversation-message.model';
import { CreateConversationDto } from '../../models/user/dto/conversation.dto';
import { CreateConversationMessageDto } from '../../models/user/dto/conversation-message.dto';

@Injectable({
  providedIn: 'root'
})
export class ConversationService {
  private readonly apiUrl = 'http://localhost:5019/api/conversations';

  constructor(private http: HttpClient) {}

  // 🆕 Create conversation
  createConversation(
    dto: CreateConversationDto
  ): Observable<{ message: string; conversationId: number }> {
    return this.http.post<{ message: string; conversationId: number }>(
      this.apiUrl,
      dto
    );
  }

  // 📂 My conversations
  getMyConversations(): Observable<Conversations[]> {
    return this.http.get<Conversations[]>(`${this.apiUrl}/my`);
  }

  // 💬 Get single conversation with messages
  getConversation(id: number): Observable<{
    id: number;
    subject: string;
    status: ConversationsStatus;
    messages: ConversationMessage[];
  }> {
    return this.http.get<{
      id: number;
      subject: string;
      status: ConversationsStatus;
      messages: ConversationMessage[];
    }>(`${this.apiUrl}/${id}`);
  }

  // ✉️ Send message
  sendMessage(
    conversationId: number,
    dto: CreateConversationMessageDto
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${conversationId}/messages`,
      dto
    );
  }
}
