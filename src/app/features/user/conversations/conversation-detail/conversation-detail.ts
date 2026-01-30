import { Component, OnChanges, OnInit, OnDestroy, ChangeDetectorRef, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, AfterViewChecked, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { ConversationService } from '../../../../core/services/user/conversation.service';
import { ConversationSignalRService } from '../../../../core/services/realtime/conversation-signalr.service';
import { ConversationMessage } from '../../../../core/models/user/conversation/conversation-message.model';

@Component({
  selector: 'app-conversation-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversation-detail.html'
})
export class ConversationDetail implements OnInit, OnChanges, OnDestroy, AfterViewInit, AfterViewChecked {

  @Output() messageSent = new EventEmitter<ConversationMessage>();

  @ViewChild('chatContainer') chatContainer!: ElementRef;

  messages: ConversationMessage[] = [];
  newMessage = '';
  subject = '';
  isNewConversation = false;
  isTyping = false;
  selectedMessageId?: number;
  conversationId?: number;

  private subs: Subscription[] = [];
  private shouldScroll = true;
  private lastMessageCount = 0;
  private refreshInterval?: Subscription;
  private typingTimeout?: any;

  constructor(
    private convo: ConversationService,
    private signalR: ConversationSignalRService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  reactionEmojis = ['👍', '❤️', '😂', '😮', '😭'];

  toggleReactionPicker(msg: ConversationMessage): void {
    this.messages.forEach(m => {
      if (m !== msg) m.showReactions = false;
    });

    msg.showReactions = !msg.showReactions;
  }
  reactToMessage(msg : ConversationMessage, emoji: string): void{
    // Update locally first for immediate feedback
    msg.reaction = emoji;
    msg.showReactions = false;
    
    // Save to database
    if (this.conversationId && this.conversationId !== -1) {
      this.convo.addReaction(this.conversationId, msg.id, { reaction: emoji }).subscribe({
        error: (err) => console.error('[ConversationDetail] Failed to save reaction:', err)
      });
    }
  }

  // TrackBy function for *ngFor to optimize change detection
  trackByMessageId(index: number, item: ConversationMessage): number {
    return item.id || index;
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.doScroll(), 50);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.chatContainer) {
      this.doScroll();
      this.shouldScroll = false;
    }
  }

  private doScroll(): void {
    if (this.chatContainer) {
      const container = this.chatContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  private addMessage(msg: ConversationMessage): void {
    this.messages = [...this.messages, msg];
    this.lastMessageCount = this.messages.length;
    this.shouldScroll = true;
    this.cdr.detectChanges();
    // Ensure scroll happens after DOM update
    setTimeout(() => this.doScroll(), 50);
  }

  toggleTimestamp(msg: ConversationMessage): void {
    if (this.selectedMessageId === msg.id) {
      this.selectedMessageId = undefined;
    } else {
      this.selectedMessageId = msg.id;
    }
    this.cdr.detectChanges();
  }

  formatTimestamp(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  onTyping(): void {
    if (this.conversationId && this.conversationId !== -1) {
      this.signalR.typing(this.conversationId);
    }
  }

  private setupMessageSubscription(): void {
    // Clean up all old subscriptions
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];

    const msgSub = this.signalR.message$.subscribe({
      next: (msg) => {
        if (!msg) return;
        if (msg.conversationId !== this.conversationId) return;
        this.addMessage(msg);
      },
      error: (err) => console.error('[ConversationDetail] SignalR error:', err)
    });
    this.subs.push(msgSub);

    // Subscribe to typing indicator
    const typingSub = this.signalR.typing$.subscribe(isTyping => {
      this.isTyping = isTyping;
      this.cdr.detectChanges();
    });
    this.subs.push(typingSub);
  }

  private startRefreshInterval(): void {
    // Poll for new messages every 3 seconds as a fallback when SignalR doesn't work
    this.refreshInterval = interval(3000).subscribe(() => {
      if (this.conversationId && this.conversationId !== -1) {
        this.loadConversation();
      }
    });
  }

  private stopRefreshInterval(): void {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
      this.refreshInterval = undefined;
    }
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.signalR.connect();
      this.setupMessageSubscription();
      this.subscribeToRouteParams();
    } catch (err) {
      console.error('[ConversationDetail] SignalR connect failed:', err);
      this.setupMessageSubscription();
      this.subscribeToRouteParams();
    }
  }

  private subscribeToRouteParams(): void {
    this.route.params.subscribe(async params => {
      const id = params['id'];
      if (id) {
        this.conversationId = +id;
        // Stop any existing refresh interval
        this.stopRefreshInterval();
        
        try {
          // Ensure SignalR is connected before joining
          await this.signalR.connect();
          // Join the conversation via SignalR
          await this.signalR.joinConversation(this.conversationId);
          // Re-setup SignalR subscription for the new conversation
          this.setupMessageSubscription();
          // Load the conversation messages
          this.loadConversation();
          // Start polling as fallback
          this.startRefreshInterval();
        } catch (err) {
          console.error('[ConversationDetail] Failed to initialize SignalR:', err);
          // Still try to load messages even if SignalR fails
          this.loadConversation();
          this.startRefreshInterval();
        }
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // No longer using @Input for conversationId, using route params instead
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    this.stopRefreshInterval();
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    // Leave the conversation via SignalR
    if (this.conversationId && this.conversationId !== -1) {
      this.signalR.leaveConversation(this.conversationId);
    }
  }

  private loadConversation(): void {
    if (!this.conversationId || this.conversationId === -1) return;

    this.convo.getConversation(this.conversationId).subscribe({
      next: (res) => {
        const newMessages = (res.messages ?? []).filter(m => m != null);
        
        // Always update UI to show latest messages (remove optimization that was blocking updates)
        this.messages = newMessages;
        this.lastMessageCount = newMessages.length;
        this.shouldScroll = true;
        this.cdr.detectChanges();
        setTimeout(() => this.doScroll(), 50);
      },
      error: (err) => console.error('[ConversationDetail] Failed to load conversation:', err)
    });
  }

  send(): void {
    if (!this.newMessage.trim()) return;

    const messageToSend = this.newMessage;
    this.newMessage = '';

    if (this.isNewConversation || this.conversationId === -1) {
      // Create a new conversation first, then send the message
      this.convo.createConversation({ Subject: this.subject, Message: messageToSend }).subscribe({
        next: async (res) => {
          this.conversationId = res.conversationId;
          this.isNewConversation = false;
          // Join the conversation via SignalR
          await this.signalR.joinConversation(res.conversationId);
          // Reload conversation to get the messages
          this.loadConversation();
          // Start polling as fallback
          this.startRefreshInterval();
        },
        error: (err) => {
          console.error('[ConversationDetail] Failed to create conversation:', err);
          this.newMessage = messageToSend;
        }
      });
      return;
    }

    if (!this.conversationId) return;

    this.convo.sendMessage(this.conversationId, {
      message: messageToSend
    }).subscribe({
      next: () => {
        // Reload conversation to get the updated messages (including the new one)
        this.loadConversation();
      },
      error: (err) => {
        console.error('[ConversationDetail] Failed to send message:', err);
        this.newMessage = messageToSend;
      }
    });
  }
}
