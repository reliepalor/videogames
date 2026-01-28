import { Component, Input, OnChanges, OnDestroy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ConversationSignalRService } from '../../../../core/services/realtime/conversation-signalr.service';
import { ConversationService } from '../../../../core/services/user/conversation.service';
import { ConversationMessage } from '../../../../core/models/user/conversation/conversation-message.model';

@Component({
  selector: 'app-conversation-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversation-detail.html'
})
export class ConversationDetail implements OnInit, OnChanges, OnDestroy {
  @Input() conversationId?: number;

  messages: ConversationMessage[] = [];
  newMessage = '';
  isTyping = false;
  isOnline = false;
  isSeen = false;

  emojis = ['😀','😂','😍','😎','😭','👍','🔥','❤️'];
  showEmoji = false;

  private subscriptions: Subscription[] = [];
  private currentConversationId?: number;

  constructor(
    private convo: ConversationService,
    private signalR: ConversationSignalRService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      await this.signalR.connect();
      this.setupSignalRSubscriptions();
    } catch (error) {
      console.error('Failed to connect to SignalR:', error);
    }
  }

  ngOnChanges(): void {
    if (!this.conversationId || this.conversationId === this.currentConversationId) return;

    this.currentConversationId = this.conversationId;
    this.loadConversation();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.currentConversationId) {
      this.signalR.leaveConversation(this.currentConversationId);
    }
  }

  private setupSignalRSubscriptions(): void {
    // Message subscription
    const messageSub = this.signalR.message$.subscribe(message => {
      if (message && message.conversationId === this.currentConversationId) {
        this.messages.push(message);
        this.cdr.detectChanges();
        this.signalR.seen(this.currentConversationId!);
      }
    });
    this.subscriptions.push(messageSub);

    // Typing subscription
    const typingSub = this.signalR.typing$.subscribe(isTyping => {
      this.isTyping = isTyping;
      this.cdr.detectChanges();
    });
    this.subscriptions.push(typingSub);

    // Seen subscription
    const seenSub = this.signalR.seen$.subscribe(isSeen => {
      this.isSeen = isSeen;
      this.cdr.detectChanges();
    });
    this.subscriptions.push(seenSub);

    // Online users subscription
    const onlineSub = this.signalR.onlineUsers$.subscribe(users => {
      // Check if admin/support is online (assuming admin has specific ID or role)
      this.isOnline = users.has('admin') || users.size > 0;
      this.cdr.detectChanges();
    });
    this.subscriptions.push(onlineSub);
  }

  private loadConversation(): void {
    if (!this.conversationId) return;

    this.convo.getConversation(this.conversationId).subscribe({
      next: (response) => {
        this.messages = response.messages.filter((m): m is ConversationMessage =>
          m !== null && m !== undefined && typeof m.isAdmin === 'boolean'
        );
        this.cdr.detectChanges();
        this.signalR.joinConversation(this.conversationId!);
      },
      error: (error) => {
        console.error('Failed to load conversation:', error);
      }
    });
  }

  send(): void {
    if (!this.newMessage.trim() || !this.conversationId) return;

    this.convo.sendMessage(this.conversationId, { message: this.newMessage }).subscribe({
      next: () => {
        this.newMessage = '';
        this.isSeen = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to send message:', error);
      }
    });
  }

  typing(): void {
    if (this.conversationId) {
      this.signalR.typing(this.conversationId);
    }
  }

  addEmoji(emoji: string): void {
    this.newMessage += emoji;
  }
}
