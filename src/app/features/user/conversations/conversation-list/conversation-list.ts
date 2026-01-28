import { Component, EventEmitter, OnInit, Output, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ConversationService } from '../../../../core/services/user/conversation.service';
import { Conversations } from '../../../../core/models/user/conversation/conversation.model';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversation-list.html'
})
export class ConversationListComponent implements OnInit, OnDestroy {
  @Output() selectConversation = new EventEmitter<number>();

  conversations: Conversations[] = [];
  filteredConversations: Conversations[] = [];
  search = '';
  private subscriptions: Subscription[] = [];

  constructor(
    private convoService: ConversationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadConversations();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadConversations(): void {
    const sub = this.convoService.getMyConversations().subscribe({
      next: (conversations) => {
        this.conversations = conversations || [];
        this.filteredConversations = [...this.conversations];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load conversations:', error);
        this.conversations = [];
        this.filteredConversations = [];
        this.cdr.detectChanges();
      }
    });
    this.subscriptions.push(sub);
  }

  get filtered() {
    if (!this.search.trim()) {
      return this.filteredConversations;
    }
    return this.filteredConversations.filter(convo =>
      convo.subject?.toLowerCase().includes(this.search.toLowerCase()) ||
      convo.lastMessage?.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  trackByConversationId(index: number, convo: Conversations): number {
    return convo.id;
  }

  open(conversation: Conversations): void {
    if (!conversation?.id) return;

    // Mark as read locally
    conversation.unreadCount = 0;
    this.selectConversation.emit(conversation.id);
    this.cdr.detectChanges();
  }

  onConversationClick(conversation: Conversations): void {
    this.open(conversation);
  }

  getLastMessage(conversation: Conversations): string {
    return conversation.lastMessage || 'Start a conversation';
  }

  getUnreadCount(conversation: Conversations): number {
    return conversation.unreadCount || 0;
  }
}
