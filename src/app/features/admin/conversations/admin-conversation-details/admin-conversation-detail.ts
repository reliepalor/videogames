import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConversationMessage } from 'src/app/core/models/user/conversation/conversation-message.model';
import { AdminConversationService } from '../admin-conversation-service';
import { ConversationSignalRService } from 'src/app/core/services/realtime/conversation-signalr.service';

@Component({
  selector: 'app-admin-conversation-detail',
  templateUrl: './admin-conversation-details.html',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe]
})
export class AdminConversationDetailComponent implements OnInit, OnDestroy {
  conversationId!: number;
  subject = '';
  status = '';
  messages: ConversationMessage[] = [];
  newMessage = '';

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private adminService: AdminConversationService,
    private signalRService: ConversationSignalRService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    this.conversationId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.conversationId) {
      console.error('No conversation ID provided');
      return;
    }

    try {
      // 1️⃣ Connect to SignalR
      await this.signalRService.connect();
      this.signalRService.joinConversation(this.conversationId);

      // 2️⃣ Load initial conversation
      this.loadConversation();

      // 3️⃣ Listen for realtime messages
      this.setupSignalRSubscriptions();
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.conversationId) {
      this.signalRService.leaveConversation(this.conversationId);
    }
  }

  private setupSignalRSubscriptions(): void {
    // Message subscription
    const messageSub = this.signalRService.message$.subscribe(message => {
      if (message && message.conversationId === this.conversationId) {
        this.messages.push(message);
        this.cdr.detectChanges();
      }
    });
    this.subscriptions.push(messageSub);

    // Typing subscription
    const typingSub = this.signalRService.typing$.subscribe(isTyping => {
      // Handle typing indicator if needed
      this.cdr.detectChanges();
    });
    this.subscriptions.push(typingSub);
  }

  private loadConversation(): void {
    this.adminService.getConversation(this.conversationId).subscribe({
      next: (res) => {
        this.subject = res.subject || '';
        this.status = res.status || '';
        this.messages = res.messages?.filter((m: any): m is ConversationMessage =>
          m !== null && m !== undefined && typeof m.isAdmin === 'boolean'
        ) || [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load conversation:', error);
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.conversationId) return;

    this.adminService.sendMessage(this.conversationId, this.newMessage).subscribe({
      next: () => {
        this.newMessage = '';
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to send message:', error);
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
}
