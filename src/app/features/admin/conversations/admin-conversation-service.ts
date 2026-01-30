import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConversationMessage } from 'src/app/core/models/user/conversation/conversation-message.model';

@Injectable({
  providedIn: 'root'
})
export class AdminConversationService {
  private adminUrl = 'http://localhost:5019/api/admin/conversations';
  private convoUrl = 'http://localhost:5019/api/conversations';

  constructor(private http: HttpClient) {}

  // 📂 Admin inbox
  getAllConversations(): Observable<any[]> {
    return this.http.get<any[]>(this.adminUrl);
  }

  // 💬 Conversation detail
  getConversation(id: number): Observable<any> {
    return this.http.get<any>(`${this.convoUrl}/${id}`);
  }

  // ✉️ Admin reply
  sendMessage(conversationId: number, message: string): Observable<any> {
    return this.http.post(`${this.convoUrl}/${conversationId}/messages`, {
      message
    });
  }

  // 🔒 Close conversation
  closeConversation(id: number): Observable<any> {
    return this.http.post(`${this.adminUrl}/${id}/close`, {});
  }

  // 😃 Add/Update reaction to message
  addReaction(conversationId: number, messageId: number, reaction: string): Observable<any> {
    return this.http.post(`${this.convoUrl}/${conversationId}/messages/${messageId}/reactions`, {
      reaction
    });
  }
}
