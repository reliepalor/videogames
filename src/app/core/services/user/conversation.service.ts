import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { Conversations, ConversationsStatus } from '../../models/user/conversation/conversation.model';
import { ConversationMessage } from '../../models/user/conversation/conversation-message.model';
import { CreateConversationDto } from '../../models/user/dto/conversation.dto';
import { CreateConversationMessageDto, AddReactionDto } from '../../models/user/dto/conversation-message.dto';

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

  // 📂 My conversation (single)
  getMyConversations(): Observable<Conversations | null> {
    return this.http.get<Conversations | null>(`${this.apiUrl}/my`);
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

  // 😃 Add/Update reaction to message
  addReaction(
    conversationId: number,
    messageId: number,
    dto: AddReactionDto
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${conversationId}/messages/${messageId}/reactions`,
      dto
    );
  }
}
