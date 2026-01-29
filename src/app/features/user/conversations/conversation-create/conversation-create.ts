import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConversationService } from '../../../../core/services/user/conversation.service';

@Component({
  selector: 'app-conversation-create',
  templateUrl: './conversation-create.html',
  standalone: true,
  imports: [FormsModule]
})
export class ConversationCreateComponent {
  message = '';
  submitting = false;

  constructor(
    private convoService: ConversationService,
    private router: Router
  ) {}

  submit() {
    if (!this.message) return;

    this.submitting = true;

    this.convoService.createConversation({
      Message: this.message
    }).subscribe(res => {
      this.router.navigate(['/user/conversations', res.conversationId]);
    });
  }
}
