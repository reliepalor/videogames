import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription, interval } from 'rxjs';

import { ConversationService } from '../../../../core/services/user/conversation.service';
import { ConversationSignalRService } from '../../../../core/services/realtime/conversation-signalr.service';
import { Conversations, ConversationsStatus } from '../../../../core/models/user/conversation/conversation.model';
import { ConversationMessage } from '../../../../core/models/user/conversation/conversation-message.model';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './conversation-list.html'
})
export class ConversationListComponent implements OnInit, OnDestroy {

  conversations: Conversations[] = [];
  conversation: Conversations | null = null;

  private subs: Subscription[] = [];
  private refreshInterval?: Subscription;

  constructor(
    private convoService: ConversationService,
    private signalR: ConversationSignalRService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.fetchConversation();
    this.startRefreshInterval();

    this.signalR.connect();

    const msgSub = this.signalR.message$.subscribe(msg => {
      if (!msg) return;
      
      // Update the conversation if the message is for our conversation
      if (this.conversation && this.conversation.id === msg.conversationId) {
        this.conversation.lastMessage = msg.message;
        // Increment unread count if not viewing this conversation
        if (this.conversation.unreadCount !== undefined) {
          this.conversation.unreadCount++;
        }
        this.cdr.detectChanges();
      }
    });
    this.subs.push(msgSub);

    // Subscribe to conversation list updates
    const listUpdateSub = this.signalR.conversationListUpdated$.subscribe(() => {
      this.fetchConversation();
    });
    this.subs.push(listUpdateSub);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.stopRefreshInterval();
  }

  private startRefreshInterval(): void {
    // Poll for updated conversation every 5 seconds
    this.refreshInterval = interval(5000).subscribe(() => {
      this.fetchConversation();
    });
  }

  private stopRefreshInterval(): void {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
      this.refreshInterval = undefined;
    }
  }

  private fetchConversation(): void {
    this.convoService.getMyConversations().subscribe({
      next: (res: any) => {
        const oldConversation = this.conversation;
        this.conversation = Array.isArray(res) ? res[0] : res;
        
        // Update unread count if conversation exists
        if (this.conversation && oldConversation) {
          this.conversation.unreadCount = oldConversation.unreadCount || 0;
        }
        
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Failed to fetch conversation:', err);
        this.conversation = null;
      }
    });
  }

  async open(): Promise<void> {
    console.log('open() called, conversation:', this.conversation);
    if (!this.conversation) {
      console.log('No conversation exists, creating one...');
      this.convoService.createConversation({ 
        Subject: 'Chat with Support',
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
          // Navigate to the detail page
          this.router.navigate(['/conversations', res.conversationId]);
        },
        error: (err) => {
          console.error('Failed to create conversation:', err);
          if (err.error) {
            console.error('Error response:', err.error);
          }
        }
      });
      return;
    }

    console.log('Navigating to conversation id:', this.conversation.id);
    // Navigate to the detail page
    this.router.navigate(['/conversations', this.conversation.id]);
    this.conversation.unreadCount = 0;

    await this.signalR.joinConversation(this.conversation.id);

    this.cdr.detectChanges();
  }

  updateLastMessage(message: ConversationMessage): void {
    if (!this.conversation || message.conversationId !== this.conversation.id) return;

    this.conversation = {
      ...this.conversation,
      lastMessage: message.message
    };

    this.cdr.detectChanges();
  }
}
