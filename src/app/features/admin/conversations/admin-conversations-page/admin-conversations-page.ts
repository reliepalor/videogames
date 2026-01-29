import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminConversationListComponent } from '../admin-conversation-list/admin-conversation-list';
import { AdminConversationDetailComponent } from '../admin-conversation-details/admin-conversation-detail';

@Component({
  selector: 'app-admin-conversations-page',
  standalone: true,
  imports: [
    CommonModule,
    AdminConversationListComponent,
    AdminConversationDetailComponent
  ],
  templateUrl: './admin-conversations-page.html'
})
export class AdminConversationsPageComponent {
  @ViewChild(AdminConversationDetailComponent) detailComponent?: AdminConversationDetailComponent;

  activeConversationId?: number;

  onConversationSelected(conversationId: number): void {
    this.activeConversationId = conversationId;
  }

  onRefreshConversation(): void {
    // Call the detail component's refresh method
    this.detailComponent?.refreshConversation();
  }
}
