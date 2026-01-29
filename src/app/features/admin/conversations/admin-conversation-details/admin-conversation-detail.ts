import { Component, OnDestroy, OnInit, ChangeDetectorRef, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, AfterViewChecked } from '@angular/core';
import { Subscription, interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConversationMessage } from 'src/app/core/models/user/conversation/conversation-message.model';
import { AdminConversationService } from '../admin-conversation-service';
import { ConversationSignalRService } from 'src/app/core/services/realtime/conversation-signalr.service';

@Component({
  selector: 'app-admin-conversation-detail',
  templateUrl: './admin-conversation-details.html',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AdminConversationDetailComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit, AfterViewChecked {
  @Input() conversationId?: number;
  @ViewChild('chatContainer') chatContainer!: ElementRef;
  
  subject = '';
  status = '';
  messages: ConversationMessage[] = [];
  newMessage = '';
  isTyping = false;
  selectedMessageId?: number;

  private subscriptions: Subscription[] = [];
  private lastMessageCount = 0;
  private refreshInterval?: Subscription;
  private shouldScroll = true;

  constructor(
    private adminService: AdminConversationService,
    private signalRService: ConversationSignalRService,
    private cdr: ChangeDetectorRef
  ) {}

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
    if (this.conversationId) {
      this.signalRService.typing(this.conversationId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conversationId']) {
      const newId = this.conversationId;
      if (newId) {
        this.stopRefreshInterval();
        this.shouldScroll = true;
        this.selectedMessageId = undefined;
        this.initializeConversation();
        this.startRefreshInterval();
      }
    }
  }

  async ngOnInit(): Promise<void> {
    if (this.conversationId) {
      await this.initializeConversation();
      this.startRefreshInterval();
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
    this.stopRefreshInterval();
  }

  private startRefreshInterval(): void {
    // Poll for new messages every 3 seconds as a fallback when SignalR doesn't work
    this.refreshInterval = interval(3000).subscribe(() => {
      if (this.conversationId) {
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

  private cleanup(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    if (this.conversationId) {
      this.signalRService.leaveConversation(this.conversationId);
    }
  }

  private setupSignalRSubscriptions(): void {
    console.log('[AdminConversationDetail] Setting up SignalR subscriptions for conversation:', this.conversationId);
    
    const messageSub = this.signalRService.message$.subscribe(message => {
      console.log('[AdminConversationDetail] Received message via SignalR:', message);
      if (message && message.conversationId === this.conversationId) {
        console.log('[AdminConversationDetail] Adding message to conversation:', message);
        this.messages = [...this.messages, message];
        this.lastMessageCount = this.messages.length;
        this.shouldScroll = true;
        this.cdr.detectChanges();
        // Ensure scroll happens after DOM update
        setTimeout(() => this.doScroll(), 50);
      } else {
        console.log('[AdminConversationDetail] Message not for this conversation:', message?.conversationId, 'vs', this.conversationId);
      }
    });
    this.subscriptions.push(messageSub);

    // Subscribe to typing indicator
    const typingSub = this.signalRService.typing$.subscribe(isTyping => {
      console.log('[AdminConversationDetail] Typing indicator changed:', isTyping);
      this.isTyping = isTyping;
      this.cdr.detectChanges();
    });
    this.subscriptions.push(typingSub);

    const typingEventSub = this.signalRService.typing$.subscribe(() => {
      // Reset typing indicator after 2 seconds
      setTimeout(() => {
        this.isTyping = false;
        this.cdr.detectChanges();
      }, 2000);
    });
    this.subscriptions.push(typingEventSub);
  }

  private async initializeConversation(): Promise<void> {
    if (!this.conversationId) return;

    // Clean up previous subscriptions
    this.cleanup();

    try {
      await this.signalRService.connect();
      this.signalRService.joinConversation(this.conversationId);
      this.loadConversation();
      this.setupSignalRSubscriptions();
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    }
  }

  private loadConversation(): void {
    if (!this.conversationId) return;

    this.adminService.getConversation(this.conversationId).subscribe({
      next: (res) => {
        this.subject = res.subject || '';
        this.status = res.status || '';
        const newMessages = (res.messages ?? []).filter((m: any) => m != null);
        
        // Only update UI if message count changed (optimization)
        if (newMessages.length !== this.lastMessageCount) {
          this.messages = newMessages;
          this.lastMessageCount = newMessages.length;
          this.shouldScroll = true;
          this.cdr.detectChanges();
          setTimeout(() => this.doScroll(), 50);
        }
      },
      error: (error) => {
        console.error('Failed to load conversation:', error);
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.conversationId) return;

    const messageToSend = this.newMessage;
    this.newMessage = '';

    this.adminService.sendMessage(this.conversationId, messageToSend).subscribe({
      next: () => {
        // Reload conversation to get the updated messages
        this.loadConversation();
      },
      error: (error) => {
        console.error('Failed to send message:', error);
        this.newMessage = messageToSend;
      }
    });
  }

  closeConversation(): void {
    if (!this.conversationId) return;

    this.adminService.closeConversation(this.conversationId).subscribe({
      next: () => {
        this.status = 'Closed';
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to close conversation:', error);
      }
    });
  }

  refreshConversation(): void {
    if (this.conversationId) {
      this.loadConversation();
    }
  }
}
