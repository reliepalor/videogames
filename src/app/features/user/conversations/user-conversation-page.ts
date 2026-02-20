import { 
  Component, 
  OnInit, 
  OnDestroy, 
  ViewChild, 
  ElementRef, 
  AfterViewInit, 
  AfterViewChecked,
  signal,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { ConversationMessage } from 'src/app/core/models/user/conversation/conversation-message.model';
import { Conversations, ConversationsStatus } from 'src/app/core/models/user/conversation/conversation.model';
import { ConversationService } from 'src/app/core/services/user/conversation.service';
import { ConversationSignalRService } from 'src/app/core/services/realtime/conversation-signalr.service';

@Component({
  selector: 'app-user-conversations-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-conversation-page.html'
})
export class UserConversationsPageComponent implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer?: ElementRef;

  // ================= RESPONSIVE STATE =================
  isMobileView = false;
  showChatView = false;

  // ================= CONVERSATION STATE =================
  readonly conversation = signal<Conversations | null>(null);
  conversationId?: number;
  
  // ================= MESSAGE STATE =================
  readonly messages = signal<ConversationMessage[]>([]);
  newMessage = '';
  subject = '';
  isNewConversation = false;
  readonly isTyping = signal(false);
  readonly selectedMessageId = signal<number | undefined>(undefined);
  reactionEmojis = ['👍', '❤️', '😂', '😮', '😭'];

  // ================= INTERNAL STATE =================
  private subscriptions: Subscription[] = [];
  private shouldScroll = true;
  private lastMessageCount = 0;
  private refreshInterval?: Subscription;

  constructor(
    private conversationService: ConversationService,
    private signalRService: ConversationSignalRService
  ) {}

  // ================= RESPONSIVE HANDLING =================

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkMobileView();
  }

  private checkMobileView(): void {
    this.isMobileView = window.innerWidth < 768;
  }

  goBackToList(): void {
    this.showChatView = false;
    if (this.conversationId) {
      this.signalRService.leaveConversation(this.conversationId);
    }
  }

  // ================= LIFECYCLE HOOKS =================

  async ngOnInit(): Promise<void> {
    this.checkMobileView();
    await this.initializeConversations();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.scrollToBottom(), 50);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.chatContainer) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
    this.stopRefreshInterval();
  }

  // ================= CONVERSATION LIST METHODS =================

  private async initializeConversations(): Promise<void> {
    this.loadConversation();
    this.startConversationRefresh();
    
    try {
      await this.signalRService.connect();
      
      // Subscribe to new messages
      const messageSub = this.signalRService.message$.subscribe(msg => {
        if (!msg) return;
        
        const current = this.conversation();
        if (current && current.id === msg.conversationId) {
          // Add message to current conversation
          this.messages.update(messages => [...messages, msg]);
          this.shouldScroll = true;
          setTimeout(() => this.scrollToBottom(), 50);
          
          // Update conversation last message
          this.conversation.set({
            ...current,
            lastMessage: msg.message
          });
        }
      });
      this.subscriptions.push(messageSub);

      // Subscribe to typing indicator
      const typingSub = this.signalRService.typing$.subscribe(isTyping => {
        this.isTyping.set(isTyping);
      });
      this.subscriptions.push(typingSub);

      // Subscribe to conversation list updates
      const listUpdateSub = this.signalRService.conversationListUpdated$.subscribe(() => {
        this.loadConversation();
      });
      this.subscriptions.push(listUpdateSub);
      
    } catch (err) {
      console.error('[UserConversations] SignalR connection failed:', err);
    }
  }

  private startConversationRefresh(): void {
    this.refreshInterval = interval(5000).subscribe(() => {
      this.loadConversation();
    });
  }

  private stopRefreshInterval(): void {
    if (this.refreshInterval) {
      this.refreshInterval.unsubscribe();
      this.refreshInterval = undefined;
    }
  }

  private loadConversation(): void {
    this.conversationService.getMyConversations().subscribe({
      next: (res: any) => {
        const fetchedConversation = Array.isArray(res) ? res[0] : res;
        this.conversation.set(fetchedConversation ?? null);
        
        // If we have a conversation and chat is open, load its messages
        if (fetchedConversation && this.showChatView) {
          this.loadMessages(fetchedConversation.id);
        }
      },
      error: err => {
        console.error('[UserConversations] Failed to fetch conversation:', err);
        this.conversation.set(null);
      }
    });
  }

  hasActiveConversation(): boolean {
    return !!this.conversation();
  }

  getConversationSubtext(): string {
    const conv = this.conversation();
    if (!conv) return 'Click to start chatting';
    if (conv.lastMessage) return conv.lastMessage;
    return 'Active conversation';
  }

  async openConversation(): Promise<void> {
    const current = this.conversation();
    
    if (!current) {
      // Create new conversation
      this.isNewConversation = true;
      this.showChatView = true;
      this.messages.set([]);
      return;
    }

    // Open existing conversation
    this.conversationId = current.id;
    this.isNewConversation = false;
    this.showChatView = true;
    
    try {
      await this.signalRService.connect();
      await this.signalRService.joinConversation(current.id);
      this.loadMessages(current.id);
    } catch (err) {
      console.error('[UserConversations] Failed to join conversation:', err);
      this.loadMessages(current.id);
    }
  }

  // ================= MESSAGE METHODS =================

  private loadMessages(conversationId: number): void {
    this.conversationService.getConversation(conversationId).subscribe({
      next: (res) => {
        const newMessages = (res.messages ?? []).filter((m: any) => m != null);
        this.messages.set(newMessages);
        this.lastMessageCount = newMessages.length;
        this.shouldScroll = true;
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (err) => {
        console.error('[UserConversations] Failed to load messages:', err);
      }
    });
  }

  private scrollToBottom(): void {
    if (this.chatContainer) {
      const container = this.chatContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  private cleanup(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
    if (this.conversationId) {
      this.signalRService.leaveConversation(this.conversationId);
    }
  }

  // ================= MESSAGE INTERACTION METHODS =================

  trackByMessageId(index: number, item: ConversationMessage): number {
    return item.id || index;
  }

  toggleTimestamp(msg: ConversationMessage): void {
    if (this.selectedMessageId() === msg.id) {
      this.selectedMessageId.set(undefined);
    } else {
      this.selectedMessageId.set(msg.id);
    }
  }

  toggleReactionPicker(msg: ConversationMessage): void {
    this.messages.update(messages =>
      messages.map(m => ({
        ...m,
        showReactions: m.id === msg.id ? !m.showReactions : false
      }))
    );
  }

  reactToMessage(msg: ConversationMessage, emoji: string): void {
    console.log('[UserConversations] Reacting to message:', msg.id, 'with emoji:', emoji);
    
    // Update locally for immediate feedback
    this.messages.update(messages =>
      messages.map(m =>
        m.id === msg.id ? { ...m, reaction: emoji, showReactions: false } : m
      )
    );
    
    // Save to database
    if (this.conversationId) {
      this.conversationService.addReaction(this.conversationId, msg.id, { reaction: emoji }).subscribe({
        next: () => console.log('[UserConversations] Reaction saved'),
        error: (err) => console.error('[UserConversations] Failed to save reaction:', err)
      });
    }
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

  onEnterMessage(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;
    keyboardEvent.preventDefault();
    this.send();
  }

  send(): void {
    if (!this.newMessage.trim()) return;

    const messageToSend = this.newMessage;
    this.newMessage = '';

    // Handle new conversation creation
    if (this.isNewConversation) {
      this.conversationService.createConversation({
        Subject: this.subject || 'Chat with Support',
        Message: messageToSend
      }).subscribe({
        next: async (res) => {
          this.conversationId = res.conversationId;
          this.isNewConversation = false;
          
          // Set the conversation
          this.conversation.set({
            id: res.conversationId,
            subject: this.subject || 'Support',
            status: ConversationsStatus.Open,
            createdAt: new Date().toISOString(),
            lastMessage: messageToSend,
            unreadCount: 0
          });
          
          // Join via SignalR
          await this.signalRService.joinConversation(res.conversationId);
          
          // Load messages
          this.loadMessages(res.conversationId);
        },
        error: (err) => {
          console.error('[UserConversations] Failed to create conversation:', err);
          this.newMessage = messageToSend;
        }
      });
      return;
    }

    // Handle sending message to existing conversation
    if (!this.conversationId) return;

    this.conversationService.sendMessage(this.conversationId, {
      message: messageToSend
    }).subscribe({
      next: () => {
        if (this.conversationId) {
          this.loadMessages(this.conversationId);
        }
      },
      error: (err) => {
        console.error('[UserConversations] Failed to send message:', err);
        this.newMessage = messageToSend;
      }
    });
  }
}
