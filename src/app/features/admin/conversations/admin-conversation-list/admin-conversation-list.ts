import { Component, EventEmitter, OnInit, Output, Input, OnDestroy } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AdminConversationService } from '../admin-conversation-service';
import { ConversationSignalRService } from '../../../../core/services/realtime/conversation-signalr.service';

@Component({
  selector: 'app-admin-conversation-list',
  standalone: true,
  imports: [CommonModule, FormsModule, UpperCasePipe],
  templateUrl: './admin-conversation-list.html'
})
export class AdminConversationListComponent implements OnInit, OnDestroy {

  @Input() activeConversationId?: number;
  @Output() selectConversation = new EventEmitter<number>();
  @Output() refreshConversation = new EventEmitter<void>();

  conversations: any[] = [];
  search = '';

  private subs: Subscription[] = [];

  constructor(
    private adminService: AdminConversationService,
    private signalR: ConversationSignalRService
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadConversations();
    
    try {
      await this.signalR.connect();
      
      const listUpdateSub = this.signalR.conversationListUpdated$.subscribe(() => {
        console.log('[AdminConversationList] Conversation list updated, reloading...');
        this.loadConversations();
        // Also trigger conversation detail refresh if there's an active conversation
        if (this.activeConversationId) {
          this.refreshConversation.emit();
        }
      });
      this.subs.push(listUpdateSub);
    } catch (err) {
      console.error('[AdminConversationList] SignalR connection failed:', err);
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadConversations(): void {
    this.adminService.getAllConversations().subscribe({
      next: res => this.conversations = res ?? [],
      error: err => {
        console.error(err);
        this.conversations = [];
      }
    });
  }

  filtered() {
    if (!this.search.trim()) return this.conversations;

    return this.conversations.filter(c =>
      c.user.username.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  open(convo: any) {
    this.selectConversation.emit(convo.id);
  }

  isActive(convo: any): boolean {
    return this.activeConversationId === convo.id;
  }
}
