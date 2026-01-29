import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationListComponent } from '../conversation-list/conversation-list';
import { ConversationDetail } from '../conversation-detail/conversation-detail';
import { ConversationMessage } from 'src/app/core/models/user/conversation/conversation-message.model';

@Component({
  selector: 'app-conversations-page',
  standalone: true,
  imports: [
    CommonModule,
    ConversationListComponent,
    ConversationDetail
  ],
  templateUrl: './conversations-page.html'
})
export class ConversationsPageComponent {

  activeConversationId?: number;

  onConversationSelected(conversationId: number): void {
    this.activeConversationId = conversationId;
  }

  onMessageSent(message: ConversationMessage): void {
    // Update the conversation list with the new message
    // Assuming conversation-list has a method to update
  }
}
