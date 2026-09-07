import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameSocketService } from '../../services/game-socket.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="glass-panel chat-container animate-fade-in">
      <div class="chat-header">
        <h4><i class="fa-solid fa-comments text-amber"></i> Live Chat</h4>
      </div>

      <div #chatMessagesContainer class="chat-messages">
        <div *ngIf="gameSocket.chatMessages().length === 0" class="no-messages">
          <p>Niciun mesaj încă. Trimite un salut adversarului!</p>
        </div>

        <div 
          *ngFor="let msg of gameSocket.chatMessages()" 
          class="chat-bubble"
          [class.own-message]="msg.sender_id === gameSocket.playerId()">
          <div class="msg-author">
            {{ msg.sender_name }} 
            <span class="msg-time">{{ msg.timestamp }}</span>
          </div>
          <div class="msg-text">{{ msg.text }}</div>
        </div>
      </div>

      <div class="chat-input-row">
        <input 
          type="text" 
          class="form-input chat-input" 
          placeholder="Scrie un mesaj..."
          [(ngModel)]="messageText"
          (keyup.enter)="sendMessage()">
        <button class="btn btn-primary btn-icon" (click)="sendMessage()" [disabled]="!messageText.trim()">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 380px;
      padding: 16px;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: var(--radius-lg);
      color: #ffffff;
    }

    .chat-header {
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }

    .chat-header h4 {
      font-size: 1.1rem;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .text-amber {
      color: var(--accent-amber);
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 4px 6px 14px 4px;
      margin-bottom: 8px;
    }

    .no-messages {
      margin: auto;
      text-align: center;
      color: #cbd5e1;
      font-size: 0.85rem;
      font-style: italic;
    }

    .chat-bubble {
      align-self: flex-start;
      max-width: 80%;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px 12px 12px 2px;
      padding: 8px 12px;
      color: #ffffff;
    }

    .chat-bubble.own-message {
      align-self: flex-end;
      background: rgba(245, 158, 11, 0.2);
      border-color: rgba(245, 158, 11, 0.4);
      border-radius: 12px 12px 2px 12px;
      color: #ffffff;
    }

    .msg-author {
      font-size: 0.75rem;
      font-weight: 700;
      color: #fef08a;
      margin-bottom: 2px;
    }

    .msg-time {
      font-size: 0.7rem;
      color: #cbd5e1;
      font-weight: 400;
      margin-left: 6px;
    }

    .msg-text {
      font-size: 0.9rem;
      color: #ffffff;
      word-break: break-word;
    }

    .chat-input-row {
      display: flex;
      gap: 8px;
    }

    .chat-input {
      font-size: 0.9rem;
      padding: 10px 14px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    .btn-icon {
      padding: 10px 16px;
    }
  `]
})
export class ChatComponent implements AfterViewChecked {
  @ViewChild('chatMessagesContainer') private chatContainer!: ElementRef;
  messageText: string = '';

  constructor(public gameSocket: GameSocketService) {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  sendMessage() {
    if (this.messageText.trim()) {
      this.gameSocket.sendChat(this.messageText);
      this.messageText = '';
    }
  }

  private scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}
