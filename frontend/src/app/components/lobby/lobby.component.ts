import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameSocketService } from '../../services/game-socket.service';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="lobby-container animate-fade-in">
      <div class="glass-panel lobby-card">
        <div class="lobby-badge">
          <i class="fa-solid fa-gamepad"></i> Multi-Player & Bot
        </div>

        <h1 class="lobby-title">CIFRE 4.0</h1>

        <!-- Player Name Dropdown & Custom Input -->
        <div class="form-group">
          <label for="nameSelect"><i class="fa-solid fa-user"></i> Numele tău de jucător:</label>
          
          <select 
            id="nameSelect" 
            class="form-input name-select" 
            [(ngModel)]="selectedPresetName"
            (change)="onPresetChange()">
            <option value="Alina ❤️">Alina ❤️</option>
            <option value="Robabe 🤍">Robabe 🤍</option>
            <option value="CUSTOM">Altu' (Scrie alt nume...)</option>
          </select>

          <!-- Custom Name Input if CUSTOM selected -->
          <div *ngIf="selectedPresetName === 'CUSTOM'" class="custom-name-box animate-fade-in">
            <input 
              type="text" 
              class="form-input" 
              placeholder="Scrie numele tău dorit..." 
              [(ngModel)]="customPlayerName" 
              maxlength="18">
          </div>
        </div>

        <div class="divider"><span>Alege modul de joc</span></div>

        <!-- Mode Buttons -->
        <div class="mode-actions">
          <!-- Play vs Bot -->
          <button 
            class="btn btn-purple btn-block" 
            (click)="startBotGame()" 
            [disabled]="!finalPlayerName.trim() || isLoading">
            <i class="fa-solid fa-robot"></i> Joacă vs Bot (Single Player)
          </button>

          <!-- Create PvP Room -->
          <button 
            class="btn btn-primary btn-block" 
            (click)="createPvpRoom()" 
            [disabled]="!finalPlayerName.trim() || isLoading">
            <i class="fa-solid fa-plus-circle"></i> Creează Cameră PvP nouă
          </button>

          <!-- Join Existing Room -->
          <div class="join-room-box">
            <input 
              type="text" 
              class="form-input room-code-input" 
              placeholder="Cod Cameră (Ex: A1B2C3)" 
              [(ngModel)]="roomCodeToJoin"
              maxlength="6"
              style="text-transform: uppercase;">
            <button 
              class="btn btn-secondary" 
              (click)="joinPvpRoom()" 
              [disabled]="!finalPlayerName.trim() || !roomCodeToJoin.trim() || isLoading">
              <i class="fa-solid fa-right-to-bracket"></i> Intră
            </button>
          </div>
        </div>

        <div *ngIf="gameSocket.errorMessage()" class="error-banner animate-fade-in">
          <i class="fa-solid fa-triangle-exclamation"></i> {{ gameSocket.errorMessage() }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .lobby-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 20px;
    }

    .lobby-card {
      width: 100%;
      max-width: 480px;
      padding: 40px 30px;
      text-align: center;
      background: var(--bg-card);
      border-color: var(--border-color);
    }

    .lobby-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--accent-amber);
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 4px 14px;
      border-radius: 20px;
      margin-bottom: 16px;
    }

    .lobby-title {
      font-size: 2.8rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: var(--text-main);
      margin-bottom: 24px;
    }

    .form-group {
      text-align: left;
      margin-bottom: 24px;
    }

    .form-group label {
      display: block;
      font-size: 0.9rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--text-main);
    }

    .name-select {
      font-weight: 700;
      font-size: 1.05rem;
      cursor: pointer;
    }

    .custom-name-box {
      margin-top: 10px;
    }

    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8rem;
      margin: 24px 0;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--border-color);
    }
    .divider span {
      padding: 0 10px;
    }

    .mode-actions {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .btn-block {
      width: 100%;
      padding: 14px;
      font-size: 1.05rem;
    }

    .join-room-box {
      display: flex;
      gap: 8px;
      margin-top: 4px;
    }

    .room-code-input {
      font-weight: 700;
      letter-spacing: 2px;
      text-align: center;
    }

    .error-banner {
      margin-top: 20px;
      background: var(--color-red-bg);
      border: 1px solid var(--color-red-border);
      color: var(--color-red);
      padding: 12px;
      border-radius: var(--radius-md);
      font-size: 0.9rem;
      font-weight: 600;
    }
  `]
})
export class LobbyComponent {
  selectedPresetName: string = 'Alina ❤️';
  customPlayerName: string = '';
  roomCodeToJoin: string = '';
  isLoading: boolean = false;

  constructor(public gameSocket: GameSocketService) {}

  get finalPlayerName(): string {
    if (this.selectedPresetName === 'CUSTOM') {
      return this.customPlayerName;
    }
    return this.selectedPresetName;
  }

  onPresetChange() {
    if (this.selectedPresetName !== 'CUSTOM') {
      this.customPlayerName = '';
    }
  }

  async startBotGame() {
    const name = this.finalPlayerName.trim();
    if (!name) return;
    this.isLoading = true;
    try {
      const roomId = await this.gameSocket.createRoom(true);
      this.gameSocket.connectSocket(roomId, name);
    } catch (err) {
      alert('A apărut o eroare la crearea jocului cu Bot-ul!');
    } finally {
      this.isLoading = false;
    }
  }

  async createPvpRoom() {
    const name = this.finalPlayerName.trim();
    if (!name) return;
    this.isLoading = true;
    try {
      const roomId = await this.gameSocket.createRoom(false);
      this.gameSocket.connectSocket(roomId, name);
    } catch (err) {
      alert('A apărut o eroare la crearea camerei PvP!');
    } finally {
      this.isLoading = false;
    }
  }

  joinPvpRoom() {
    const name = this.finalPlayerName.trim();
    if (!name || !this.roomCodeToJoin.trim()) return;
    this.gameSocket.connectSocket(this.roomCodeToJoin.trim().toUpperCase(), name);
  }
}
