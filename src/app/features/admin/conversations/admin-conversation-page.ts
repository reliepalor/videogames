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
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { ConversationMessage } from 'src/app/core/models/user/conversation/conversation-message.model';
import { AdminConversationService } from './admin-conversation-service';
import { ConversationSignalRService } from 'src/app/core/services/realtime/conversation-signalr.service';

@Component({
  selector: 'app-admin-conversation-page',
  standalone: true,
  imports: [CommonModule, FormsModule, UpperCasePipe],
  templateUrl: './admin-conversation-page.html'
})
export class AdminConversationsPageComponent implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked {
  @ViewChild('chatContainer') chatContainer?: ElementRef;

  // ================= RESPONSIVE STATE =================
  isMobileView = false;

  // ================= CONVERSATION LIST STATE =================
  readonly conversations = signal<any[]>([]);
  search = '';
  activeConversationId?: number;

  // ================= CONVERSATION DETAIL STATE =================
  subject = '';
  status = '';
  readonly messages = signal<ConversationMessage[]>([]);
  newMessage = '';
  readonly isTyping = signal(false);
  readonly selectedMessageId = signal<number | undefined>(undefined);
  reactionEmojis = ['👍', '❤️', '😂', '😮', '😭'];

  // ================= INTERNAL STATE =================
  private subscriptions: Subscription[] = [];
  private lastMessageCount = 0;
  private refreshInterval?: Subscription;
  private shouldScroll = true;

  constructor(
    private adminService: AdminConversationService,
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
    // Clean up current conversation
    if (this.activeConversationId) {
      this.signalRService.leaveConversation(this.activeConversationId);
    }
    
    this.stopRefreshInterval();
    this.activeConversationId = undefined;
    this.messages.set([]);
    this.newMessage = '';
    this.selectedMessageId.set(undefined);
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
    this.loadConversations();
    
    try {
      await this.signalRService.connect();
      
      const listUpdateSub = this.signalRService.conversationListUpdated$.subscribe(() => {
        console.log('[AdminConversations] List updated, reloading...');
        this.loadConversations();
        if (this.activeConversationId) {
          this.loadConversation();
        }
      });
      this.subscriptions.push(listUpdateSub);
    } catch (err) {
      console.error('[AdminConversations] SignalR connection failed:', err);
    }
  }

  loadConversations(): void {
    this.adminService.getAllConversations().subscribe({
      next: res => {
        const convos = res ?? [];
        this.conversations.set(convos);
      },
      error: err => {
        console.error('[AdminConversations] Failed to load conversations:', err);
        this.conversations.set([]);
      }
    });
  }

  filtered(): any[] {
    const conversations = this.conversations();
    if (!this.search.trim()) return conversations;

    const term = this.search.toLowerCase();
    return conversations.filter(c =>
      c.user.username.toLowerCase().includes(term)
    );
  }

  selectConversation(conversationId: number): void {
    if (this.activeConversationId === conversationId) return;

    // Clean up previous conversation
    if (this.activeConversationId) {
      this.signalRService.leaveConversation(this.activeConversationId);
    }

    this.stopRefreshInterval();
    this.activeConversationId = conversationId;
    this.shouldScroll = true;
    this.selectedMessageId.set(undefined);
    this.newMessage = '';
    
    this.initializeConversationDetail();
    this.startRefreshInterval();
  }

  isActive(convo: any): boolean {
    return this.activeConversationId === convo.id;
  }

  getActiveUsername(): string {
    const active = this.conversations().find(c => c.id === this.activeConversationId);
    return active?.user?.username || 'User';
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes < 1 ? 'Just now' : `${minutes}m`;
    }
    if (hours < 24) return `${hours}h`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ================= CONVERSATION DETAIL METHODS =================

  private async initializeConversationDetail(): Promise<void> {
    if (!this.activeConversationId) return;

    try {
      await this.signalRService.connect();
      this.signalRService.joinConversation(this.activeConversationId);
      this.loadConversation();
      this.setupSignalRSubscriptions();
    } catch (error) {
      console.error('[AdminConversations] Failed to initialize conversation:', error);
    }
  }

  private setupSignalRSubscriptions(): void {
    console.log('[AdminConversations] Setting up SignalR for conversation:', this.activeConversationId);
    
    const messageSub = this.signalRService.message$.subscribe(message => {
      if (message && message.conversationId === this.activeConversationId) {
        console.log('[AdminConversations] New message received:', message);
        this.messages.update(messages => [...messages, message]);
        this.lastMessageCount = this.messages().length;
        this.shouldScroll = true;
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
    this.subscriptions.push(messageSub);

    const typingSub = this.signalRService.typing$.subscribe(isTyping => {
      this.isTyping.set(isTyping);
    });
    this.subscriptions.push(typingSub);
  }

  private loadConversation(): void {
    if (!this.activeConversationId) return;

    this.adminService.getConversation(this.activeConversationId).subscribe({
      next: (res) => {
        this.subject = res.subject || '';
        this.status = res.status || '';
        const newMessages = (res.messages ?? []).filter((m: any) => m != null);
        
        this.messages.set(newMessages);
        this.lastMessageCount = newMessages.length;
        this.shouldScroll = true;
        setTimeout(() => this.scrollToBottom(), 50);
      },
      error: (error) => {
        console.error('[AdminConversations] Failed to load conversation:', error);
      }
    });
  }

  private startRefreshInterval(): void {
    this.refreshInterval = interval(3000).subscribe(() => {
      if (this.activeConversationId) {
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
    if (this.activeConversationId) {
      this.signalRService.leaveConversation(this.activeConversationId);
    }
  }

  private scrollToBottom(): void {
    if (this.chatContainer) {
      const container = this.chatContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
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
    console.log('[AdminConversations] Reacting to message:', msg.id, 'with emoji:', emoji);
    
    // Update locally for immediate feedback
    this.messages.update(messages =>
      messages.map(m =>
        m.id === msg.id ? { ...m, reaction: emoji, showReactions: false } : m
      )
    );
    
    // Save to database
    if (this.activeConversationId) {
      this.adminService.addReaction(this.activeConversationId, msg.id, emoji).subscribe({
        next: () => console.log('[AdminConversations] Reaction saved'),
        error: (err) => console.error('[AdminConversations] Failed to save reaction:', err)
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
    if (this.activeConversationId) {
      this.signalRService.typing(this.activeConversationId);
    }
  }

  onEnterMessage(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;
    keyboardEvent.preventDefault();
    this.sendMessage();
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.activeConversationId) return;

    const messageToSend = this.newMessage;
    this.newMessage = '';

    this.adminService.sendMessage(this.activeConversationId, messageToSend).subscribe({
      next: () => {
        this.loadConversation();
      },
      error: (error) => {
        console.error('[AdminConversations] Failed to send message:', error);
        this.newMessage = messageToSend;
      }
    });
  }

  closeConversation(): void {
    if (!this.activeConversationId) return;

    this.adminService.closeConversation(this.activeConversationId).subscribe({
      next: () => {
        this.status = 'Closed';
        this.loadConversations(); // Refresh list
      },
      error: (error) => {
        console.error('[AdminConversations] Failed to close conversation:', error);
      }
    });
  }
}
