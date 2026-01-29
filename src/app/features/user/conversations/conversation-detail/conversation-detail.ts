import { Component, Input, OnChanges, OnInit, OnDestroy, ChangeDetectorRef, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, AfterViewChecked, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

  @Input() conversationId?: number;
  @Output() messageSent = new EventEmitter<ConversationMessage>();

  @ViewChild('chatContainer') chatContainer!: ElementRef;

  messages: ConversationMessage[] = [];
  newMessage = '';
  isNewConversation = false;
  isTyping = false;
  selectedMessageId?: number;

  private subs: Subscription[] = [];
  private shouldScroll = true;
  private lastMessageCount = 0;
  private refreshInterval?: Subscription;
  private typingTimeout?: any;

  constructor(
    private convo: ConversationService,
    private signalR: ConversationSignalRService,
    private cdr: ChangeDetectorRef
  ) {}

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
    // Clean up old subscription if exists
    const oldSub = this.subs.find(s => s instanceof Subscription);
    if (oldSub) {
      oldSub.unsubscribe();
      this.subs = this.subs.filter(s => s !== oldSub);
    }

    const msgSub = this.signalR.message$.subscribe({
      next: (msg) => {
        console.log('[ConversationDetail] SignalR received:', msg);
        if (!msg) return;
        if (msg.conversationId !== this.conversationId) {
          console.log('[ConversationDetail] Message not for this conversation:', msg.conversationId, 'vs', this.conversationId);
          return;
        }
        this.addMessage(msg);
      },
      error: (err) => console.error('[ConversationDetail] SignalR error:', err)
    });
    this.subs.push(msgSub);

    // Subscribe to typing indicator
    const typingSub = this.signalR.typing$.subscribe(isTyping => {
      console.log('[ConversationDetail] Typing indicator changed:', isTyping);
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
    } catch (err) {
      console.error('[ConversationDetail] SignalR connect failed:', err);
      this.setupMessageSubscription();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conversationId']) {
      console.log('[ConversationDetail] Conversation changed to:', this.conversationId);
      this.selectedMessageId = undefined;
      
      // Check if this is a new conversation request
      if (this.conversationId === -1) {
        this.isNewConversation = true;
        this.messages = [];
        this.shouldScroll = true;
        this.stopRefreshInterval();
        return;
      }
      
      if (this.conversationId) {
        this.stopRefreshInterval();
        this.isNewConversation = false;
        this.loadConversation();
        this.signalR.joinConversation(this.conversationId);
        // Reset messages when switching conversations
        this.messages = [];
        this.shouldScroll = true;
        // Re-setup subscription for new conversation
        this.setupMessageSubscription();
        // Start polling as fallback
        this.startRefreshInterval();
      }
    }
  }

  ngOnDestroy(): void {
    console.log('[ConversationDetail] Destroying, cleaning up subscriptions');
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    this.stopRefreshInterval();
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
  }

  private loadConversation(): void {
    if (!this.conversationId || this.conversationId === -1) return;

    this.convo.getConversation(this.conversationId).subscribe({
      next: (res) => {
        console.log('[ConversationDetail] Loaded conversation:', res);
        const newMessages = (res.messages ?? []).filter(m => m != null);
        
        // Only update UI if message count changed (optimization)
        if (newMessages.length !== this.lastMessageCount) {
          this.messages = newMessages;
          this.lastMessageCount = newMessages.length;
          this.shouldScroll = true;
          this.cdr.detectChanges();
          setTimeout(() => this.doScroll(), 50);
        }
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
      this.convo.createConversation({ Message: messageToSend }).subscribe({
        next: async (res) => {
          console.log('[ConversationDetail] New conversation created:', res);
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
