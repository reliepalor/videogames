import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConversationListComponent } from '../conversation-list/conversation-list';
import { AdminConversationDetailComponent } from 'src/app/features/admin/conversations/admin-conversation-details/admin-conversation-detail';
import { ConversationDetail } from '../conversation-detail/conversation-detail';

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
}
