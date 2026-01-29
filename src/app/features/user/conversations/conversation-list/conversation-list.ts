import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnDestroy,
  Output,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { ConversationService } from '../../../../core/services/user/conversation.service';
import { ConversationSignalRService } from '../../../../core/services/realtime/conversation-signalr.service';
import { Conversations, ConversationsStatus } from '../../../../core/models/user/conversation/conversation.model';
import { ConversationMessage } from '../../../../core/models/user/conversation/conversation-message.model';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversation-list.html'
})
export class ConversationListComponent implements OnInit, OnDestroy {

  @Input() activeConversationId?: number;
  @Output() selectConversation = new EventEmitter<number>();

  conversations: Conversations[] = [];
  conversation: Conversations | null = null;

  private subs: Subscription[] = [];

  constructor(
    private convoService: ConversationService,
    private signalR: ConversationSignalRService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.fetchConversation();

    await this.signalR.connect();

    const msgSub = this.signalR.message$.subscribe(msg => {
      if (!msg) return;
      const convo = this.conversations.find(c => c.id === msg.conversationId);
      if (!convo) return;

      const newUnreadCount = this.activeConversationId !== convo.id
        ? (convo.unreadCount || 0) + 1
        : convo.unreadCount || 0;

      convo.lastMessage = msg.message;
      convo.unreadCount = newUnreadCount;

      this.cdr.markForCheck();
    });
    this.subs.push(msgSub);

    // Subscribe to conversation list updates
    const listUpdateSub = this.signalR.conversationListUpdated$.subscribe(() => {
      console.log('[ConversationList] Conversation list updated, reloading...');
      this.fetchConversation();
    });
    this.subs.push(listUpdateSub);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private fetchConversation(): void {
    this.convoService.getMyConversations().subscribe({
      next: (res: any) => {
        console.log('Fetched conversations:', res);
        this.conversation = Array.isArray(res) ? res[0] : res;
        if (!this.conversation) {
          console.log('No conversation found, will create on click');
        }
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('Failed to fetch conversation:', err);
        // If fetch fails, allow creating a new conversation
        this.conversation = null;
      }
    });
  }

  async open(): Promise<void> {
    console.log('open() called, conversation:', this.conversation);
    if (!this.conversation) {
      console.log('No conversation exists, creating one...');
      // Create a new conversation with admin - send a more meaningful initial message
      this.convoService.createConversation({ 
        Message: 'I would like to start a conversation with support' 
      }).subscribe({
        next: async (res) => {
          console.log('Conversation created:', res);
          this.conversation = {
            id: res.conversationId,
            subject: 'Support',
            status: ConversationsStatus.Open,
            createdAt: new Date().toISOString(),
            lastMessage: '',
            unreadCount: 0
          };
          // Join the conversation via SignalR for realtime updates
          await this.signalR.joinConversation(res.conversationId);
          this.selectConversation.emit(res.conversationId);
        },
        error: (err) => {
          console.error('Failed to create conversation:', err);
          // Log the error details to help debug
          if (err.error) {
            console.error('Error response:', err.error);
          }
          // If API fails, still try to emit a special signal for new conversation
          // This will trigger the conversation detail to show an empty state for a new chat
          this.selectConversation.emit(-1);
        }
      });
      return;
    }

    console.log('Emitting conversation id:', this.conversation.id);
    this.selectConversation.emit(this.conversation.id);
    this.conversation.unreadCount = 0;

    // JOIN conversation so realtime works
    await this.signalR.joinConversation(this.conversation.id);

    this.cdr.markForCheck();
  }

  updateLastMessage(message: ConversationMessage): void {
    if (!this.conversation || message.conversationId !== this.conversation.id) return;

    this.conversation = {
      ...this.conversation,
      lastMessage: message.message
    };

    this.cdr.markForCheck();
  }
}
