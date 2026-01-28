import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminConversationService } from '../admin-conversation-service';

@Component({
  selector: 'app-admin-conversation-list',
  standalone: true,
  imports: [CommonModule, FormsModule, UpperCasePipe],
  templateUrl: './admin-conversation-list.html'
})
export class AdminConversationListComponent implements OnInit {

  @Output() selectConversation = new EventEmitter<number>();

  conversations: any[] = [];
  search = '';

  constructor(private adminService: AdminConversationService) {}

  ngOnInit(): void {
    this.adminService.getAllConversations().subscribe(res => {
      this.conversations = res;
    });
  }

  filtered() {
    return this.conversations.filter(c =>
      c.user.username.toLowerCase().includes(this.search.toLowerCase())
    );
  }

  open(convo: any) {
    this.selectConversation.emit(convo.id);
  }
}
