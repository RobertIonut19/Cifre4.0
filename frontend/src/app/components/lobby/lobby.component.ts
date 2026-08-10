import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameSocketService } from '../../services/game-socket.service';

export interface WaitingRoomInfo {
  room_id: string;
  host_name: string;
  game_type?: string;
}

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="lobby-outer-wrapper animate-fade-in">
      <div class="lobby-layout">
        
        <!-- MAIN CENTER/LEFT CARD -->
        <div class="glass-panel main-lobby-card">
          <div class="top-row-header">
            <div class="lobby-badge">
              <i class="fa-solid fa-heart text-amber"></i> Best Couple 🖤
            </div>

            <!-- SEPARATE BOT MODE BUTTON -->
            <button class="btn-bot-launcher" (click)="openBotModal()">
              <i class="fa-solid fa-robot"></i> Antrenează-te cu Bot-ul 🤖
            </button>
          </div>

          <h1 class="lobby-title">Joacă împotriva iubitei/iubitului inimii tale 💖</h1>

          <!-- Player Name Selection -->
          <div class="form-group">
            <label for="nameSelect"><i class="fa-solid fa-user text-amber"></i> Numele tău de jucător:</label>
            
            <select 
              id="nameSelect" 
              class="form-input name-select" 
              [(ngModel)]="selectedPresetName"
              (change)="onPresetChange()">
              <option *ngFor="let pName of registeredPlayers" [value]="pName">
                {{ pName }}
              </option>
              <option value="CUSTOM">➕ Adaugă jucător nou...</option>
            </select>

            <!-- Custom Name Input -->
            <div *ngIf="selectedPresetName === 'CUSTOM'" class="custom-name-box animate-fade-in">
              <input 
                type="text" 
                class="form-input" 
                placeholder="Scrie numele noului jucător..." 
                [(ngModel)]="customPlayerName" 
                maxlength="18">
            </div>
          </div>

          <!-- LIST OF PUBLIC WAITING ROOMS (1-CLICK JOIN) -->
          <div *ngIf="waitingRooms.length > 0" class="waiting-section animate-fade-in">
            <div class="section-badge">
              <i class="fa-solid fa-door-open text-amber"></i> Camere deschise în așteptare:
            </div>

            <div class="waiting-rooms-list">
              <div *ngFor="let room of waitingRooms" class="waiting-room-card">
                <div class="room-host-info">
                  <i class="fa-solid" [class.fa-calculator]="room.game_type !== 'words'" [class.fa-font]="room.game_type === 'words'" class="text-amber"></i> 
                  <span>{{ room.game_type === 'words' ? 'Cuvinte 5' : 'Cifre 4' }} - cu <strong>{{ room.host_name }}</strong></span>
                </div>
                <button 
                  class="btn btn-primary btn-join-direct" 
                  (click)="joinDirectRoom(room.room_id)"
                  [disabled]="!finalPlayerName.trim() || isLoading">
                  <i class="fa-solid fa-right-to-bracket"></i> Intră
                </button>
              </div>
            </div>
          </div>

          <div class="divider"><span>Alege Jocul 1v1</span></div>

          <!-- GAME SELECTION CARDS (FOR 1v1 PvP LOVE MATCH) -->
          <div class="game-cards-grid">
            
            <!-- CARD 1: CIFRE 4 (YELLOW-ISH PASTEL) -->
            <div class="game-card card-cifre" (click)="createPvpRoom('numbers')">
              <div class="game-card-icon">
                <i class="fa-solid fa-calculator"></i>
              </div>
              <h3>Cifre 4</h3>
              <p class="game-card-desc">Ghicește numărul secret din 4 cifre ales de jumătatea ta!</p>
              
              <button 
                class="btn btn-neutral btn-block-love" 
                [disabled]="!finalPlayerName.trim() || isLoading">
                <i class="fa-solid fa-heart"></i> Joacă 1v1 cu Iubirea Ta
              </button>
            </div>

            <!-- CARD 2: CUVINTE 5 (PURPLE-ISH PASTEL) -->
            <div class="game-card card-cuvinte" (click)="createPvpRoom('words')">
              <div class="game-card-icon">
                <i class="fa-solid fa-font"></i>
              </div>
              <h3>Cuvinte 5</h3>
              <p class="game-card-desc">Ghicește cuvântul secret din 5 litere ales de jumătatea ta!</p>
              
              <button 
                class="btn btn-neutral btn-block-love" 
                [disabled]="!finalPlayerName.trim() || isLoading">
                <i class="fa-solid fa-heart"></i> Joacă 1v1 cu Iubirea Ta
              </button>
            </div>

          </div>

          <div *ngIf="gameSocket.errorMessage()" class="error-banner animate-fade-in">
            <i class="fa-solid fa-triangle-exclamation"></i> {{ gameSocket.errorMessage() }}
          </div>
        </div>

        <!-- RIGHT SIDEBAR: CLASAMENT VICTORII -->
        <aside class="glass-panel leaderboard-sidebar animate-fade-in">
          <div class="sidebar-header">
            <i class="fa-solid fa-trophy trophy-icon"></i>
            <h2>Clasament Victorii</h2>
          </div>

          <!-- Category Filter Tabs -->
          <div class="leaderboard-tabs">
            <button class="lb-tab" [class.active]="activeStatsTab === 'ALL'" (click)="setStatsTab('ALL')">General</button>
            <button class="lb-tab" [class.active]="activeStatsTab === 'numbers'" (click)="setStatsTab('numbers')">Cifre 4</button>
            <button class="lb-tab" [class.active]="activeStatsTab === 'words'" (click)="setStatsTab('words')">Cuvinte 5</button>
          </div>

          <!-- Ranking List -->
          <div *ngIf="hasStats()" class="leaderboard-list">
            <div *ngFor="let item of getSortedStats(); let idx = index" class="lb-item" [class.top-1]="idx === 0">
              <div class="lb-rank">
                <span *ngIf="idx === 0">🥇</span>
                <span *ngIf="idx === 1">🥈</span>
                <span *ngIf="idx === 2">🥉</span>
                <span *ngIf="idx > 2" class="rank-num">#{{ idx + 1 }}</span>
              </div>
              <div class="lb-player">
                <span class="p-name">{{ item.name }}</span>
              </div>
              <div class="lb-score">
                <strong>{{ item.wins }}</strong>
                <span class="score-label">{{ item.wins === 1 ? 'victorie' : 'victorii' }}</span>
              </div>
            </div>
          </div>

          <div *ngIf="!hasStats()" class="no-stats-placeholder">
            <i class="fa-solid fa-medal icon-empty"></i>
            <p>Nicio victorie înregistrată încă în această categorie.</p>
          </div>
        </aside>

      </div>
    </div>

    <!-- MODAL POPUP FOR SELECTING BOT GAME -->
    <div *ngIf="showBotModal" class="modal-backdrop animate-fade-in" (click)="closeBotModal()">
      <div class="modal-card animate-pop-in" (click)="$event.stopPropagation()">
        <button class="modal-close-btn" (click)="closeBotModal()">&times;</button>
        
        <div class="modal-header">
          <div class="bot-modal-icon">🤖</div>
          <h2>Antrenament vs AI Bot</h2>
          <p>Alege jocul pe care vrei să îl exersezi cu robotul:</p>
        </div>

        <div class="modal-game-options">
          <div class="bot-option-card card-cifre-opt" (click)="startBotGame('numbers')">
            <i class="fa-solid fa-calculator opt-icon text-amber"></i>
            <div class="opt-details">
              <h4>Cifre 4 vs Bot</h4>
              <p>Exersează ghicitul numărului secret din 4 cifre</p>
            </div>
            <i class="fa-solid fa-chevron-right arrow-icon"></i>
          </div>

          <div class="bot-option-card card-cuvinte-opt" (click)="startBotGame('words')">
            <i class="fa-solid fa-font opt-icon text-purple"></i>
            <div class="opt-details">
              <h4>Cuvinte 5 vs Bot</h4>
              <p>Exersează ghicitul cuvântului secret din 5 litere</p>
            </div>
            <i class="fa-solid fa-chevron-right arrow-icon"></i>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .lobby-outer-wrapper {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 90vh;
      padding: 30px 20px;
    }

    .lobby-layout {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 24px;
      width: 100%;
      max-width: 980px;
    }

    /* CENTER/LEFT MAIN CARD */
    .main-lobby-card {
      padding: 32px 28px;
      text-align: center;
      background: var(--bg-card);
      border-color: var(--border-color);
    }

    .top-row-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    .lobby-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      font-weight: 700;
      color: #78350f;
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 4px 14px;
      border-radius: 20px;
    }

    .btn-bot-launcher {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      color: #374151;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-bot-launcher:hover {
      background: #e5e7eb;
      color: #111827;
      transform: scale(1.02);
    }

    .lobby-title {
      font-size: 1.85rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: var(--text-main);
      margin-bottom: 24px;
    }

    .form-group {
      text-align: left;
      margin-bottom: 20px;
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

    /* PUBLIC WAITING ROOMS */
    .waiting-section {
      margin-bottom: 20px;
      text-align: left;
    }

    .section-badge {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .waiting-rooms-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .waiting-room-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      background: #faf8f5;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 10px 14px;
    }

    .room-host-info {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-join-direct {
      padding: 6px 14px;
      font-size: 0.85rem;
    }

    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.8rem;
      margin: 20px 0;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--border-color);
    }
    .divider span {
      padding: 0 10px;
    }

    /* GAME SELECTION CARDS - YELLOW-ISH (CIFRE 4) & PURPLE-ISH (CUVINTE 5) */
    .game-cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .game-card {
      border-radius: var(--radius-lg);
      padding: 24px 18px;
      text-align: center;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      cursor: pointer;
    }

    /* CARD 1: YELLOW-ISH / WARM GOLD (CIFRE 4) */
    .card-cifre {
      background: #fefce8;
      border: 2px solid #fef08a;
      box-shadow: 0 4px 15px rgba(217, 119, 6, 0.05);
    }
    .card-cifre .game-card-icon { color: #d97706; }
    .card-cifre h3 { color: #78350f; }
    .card-cifre:hover {
      border-color: #fde047;
      background: #fffdf0;
      transform: translateY(-3px);
      box-shadow: 0 10px 25px rgba(217, 119, 6, 0.12);
    }

    /* CARD 2: PURPLE-ISH / VIOLET (CUVINTE 5) */
    .card-cuvinte {
      background: #f5f3ff;
      border: 2px solid #ddd6fe;
      box-shadow: 0 4px 15px rgba(124, 58, 237, 0.05);
    }
    .card-cuvinte .game-card-icon { color: #7c3aed; }
    .card-cuvinte h3 { color: #4c1d95; }
    .card-cuvinte:hover {
      border-color: #a78bfa;
      background: #faf5ff;
      transform: translateY(-3px);
      box-shadow: 0 10px 25px rgba(124, 58, 237, 0.12);
    }

    .game-card-icon {
      font-size: 2.5rem;
      margin-bottom: 8px;
    }

    .game-card h3 {
      font-size: 1.3rem;
      font-weight: 800;
      margin-bottom: 6px;
    }

    .game-card-desc {
      font-size: 0.85rem;
      color: #64748b;
      margin-bottom: 18px;
      line-height: 1.35;
    }

    .btn-block-love {
      width: 100%;
      padding: 10px;
      font-size: 0.9rem;
      font-weight: 700;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .card-cifre .btn-neutral {
      background: #d97706;
      color: #ffffff;
      border: none;
    }
    .card-cifre .btn-neutral:hover {
      background: #b45309;
    }

    .card-cuvinte .btn-neutral {
      background: #7c3aed;
      color: #ffffff;
      border: none;
    }
    .card-cuvinte .btn-neutral:hover {
      background: #6d28d9;
    }

    .error-banner {
      margin-top: 16px;
      background: var(--color-red-bg);
      border: 1px solid var(--color-red-border);
      color: var(--color-red);
      padding: 10px;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      font-weight: 600;
    }

    /* RIGHT SIDEBAR: CLASAMENT */
    .leaderboard-sidebar {
      padding: 24px 20px;
      display: flex;
      flex-direction: column;
      background: #fdfcf9;
      border-color: var(--border-color);
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
    }

    .trophy-icon {
      font-size: 1.5rem;
      color: var(--accent-amber);
    }

    .sidebar-header h2 {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .leaderboard-tabs {
      display: flex;
      gap: 4px;
      background: #eae4dc;
      padding: 3px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .lb-tab {
      flex: 1;
      background: transparent;
      border: none;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 6px 4px;
      border-radius: 6px;
      cursor: pointer;
      color: var(--text-muted);
      transition: all 0.15s ease;
    }

    .lb-tab.active {
      background: #ffffff;
      color: var(--text-main);
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }

    .leaderboard-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .lb-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      transition: transform 0.15s ease;
    }

    .lb-item.top-1 {
      background: #fffdf5;
      border-color: #fde68a;
    }

    .lb-rank {
      font-size: 1.1rem;
      width: 28px;
      display: flex;
      align-items: center;
    }

    .rank-num {
      font-size: 0.85rem;
      font-weight: 800;
      color: var(--text-muted);
    }

    .lb-player {
      flex: 1;
      text-align: left;
      padding-left: 6px;
    }

    .p-name {
      font-weight: 700;
      font-size: 0.92rem;
      color: var(--text-main);
    }

    .lb-score {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .lb-score strong {
      font-size: 1rem;
      font-weight: 800;
      color: var(--accent-amber);
    }

    .score-label {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .no-stats-placeholder {
      padding: 30px 10px;
      text-align: center;
      color: var(--text-muted);
    }

    .icon-empty {
      font-size: 2.2rem;
      margin-bottom: 8px;
      opacity: 0.5;
    }

    .no-stats-placeholder p {
      font-size: 0.85rem;
      font-style: italic;
    }

    /* MODAL BOT SELECTOR STYLES */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(4px);
      z-index: 99999;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }

    .modal-card {
      background: #ffffff;
      border-radius: var(--radius-lg);
      padding: 32px 24px;
      width: 100%;
      max-width: 440px;
      position: relative;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      text-align: center;
    }

    .modal-close-btn {
      position: absolute;
      top: 14px;
      right: 18px;
      background: none;
      border: none;
      font-size: 1.8rem;
      color: #9ca3af;
      cursor: pointer;
    }
    .modal-close-btn:hover { color: #374151; }

    .bot-modal-icon {
      font-size: 3rem;
      margin-bottom: 8px;
    }

    .modal-header h2 {
      font-size: 1.4rem;
      font-weight: 800;
      color: #1f2937;
      margin-bottom: 4px;
    }

    .modal-header p {
      font-size: 0.85rem;
      color: #6b7280;
      margin-bottom: 20px;
    }

    .modal-game-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .bot-option-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: var(--radius-md);
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
    }

    .card-cifre-opt {
      background: #fefce8;
      border: 2px solid #fef08a;
    }
    .card-cifre-opt:hover {
      background: #fffdf0;
      border-color: #fde047;
      transform: translateX(4px);
    }

    .card-cuvinte-opt {
      background: #f5f3ff;
      border: 2px solid #ddd6fe;
    }
    .card-cuvinte-opt:hover {
      background: #faf5ff;
      border-color: #a78bfa;
      transform: translateX(4px);
    }

    .opt-icon {
      font-size: 1.8rem;
    }

    .text-amber { color: #d97706; }
    .text-purple { color: #7c3aed; }

    .opt-details {
      flex: 1;
    }

    .opt-details h4 {
      font-size: 1rem;
      font-weight: 800;
      color: #1f2937;
      margin-bottom: 2px;
    }

    .opt-details p {
      font-size: 0.78rem;
      color: #6b7280;
      margin: 0;
    }

    .arrow-icon {
      color: #9ca3af;
      font-size: 0.9rem;
    }

    @media (max-width: 820px) {
      .lobby-layout {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 540px) {
      .game-cards-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class LobbyComponent implements OnInit, OnDestroy {
  registeredPlayers: string[] = ['Alina ❤️', 'Robabe 🤍'];
  selectedPresetName: string = 'Alina ❤️';
  customPlayerName: string = '';
  activeStatsTab: string = 'ALL';
  showBotModal: boolean = false;
  isLoading: boolean = false;
  waitingRooms: WaitingRoomInfo[] = [];
  
  globalStatsAll: { [winner: string]: number } = {};
  globalStatsNumbers: { [winner: string]: number } = {};
  globalStatsWords: { [winner: string]: number } = {};
  
  private pollInterval: any = null;

  constructor(public gameSocket: GameSocketService) {}

  ngOnInit() {
    this.loadInitialData();
    this.pollInterval = setInterval(() => {
      this.fetchWaitingRooms();
      this.fetchAllStats();
    }, 2500);
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  async loadInitialData() {
    await this.fetchRegisteredPlayers();
    await this.fetchWaitingRooms();
    await this.fetchAllStats();
  }

  async fetchRegisteredPlayers() {
    try {
      const players = await this.gameSocket.getAllPlayers();
      if (players && players.length > 0) {
        this.registeredPlayers = players;
        if (!this.registeredPlayers.includes(this.selectedPresetName) && this.selectedPresetName !== 'CUSTOM') {
          this.selectedPresetName = this.registeredPlayers[0];
        }
      }
    } catch (e) {}
  }

  async fetchWaitingRooms() {
    try {
      this.waitingRooms = await this.gameSocket.getWaitingRooms();
    } catch (e) {}
  }

  async fetchAllStats() {
    try {
      this.globalStatsAll = await this.gameSocket.getGlobalStats();
      this.globalStatsNumbers = await this.gameSocket.getGlobalStats('numbers');
      this.globalStatsWords = await this.gameSocket.getGlobalStats('words');
    } catch (e) {}
  }

  get currentStatsMap(): { [winner: string]: number } {
    if (this.activeStatsTab === 'numbers') return this.globalStatsNumbers;
    if (this.activeStatsTab === 'words') return this.globalStatsWords;
    return this.globalStatsAll;
  }

  getSortedStats(): { name: string; wins: number }[] {
    const map = this.currentStatsMap || {};
    const items = Object.keys(map).map(name => ({ name, wins: map[name] }));
    return items.sort((a, b) => b.wins - a.wins);
  }

  hasStats(): boolean {
    return this.getSortedStats().length > 0;
  }

  setStatsTab(tab: string) {
    this.activeStatsTab = tab;
  }

  openBotModal() {
    this.showBotModal = true;
  }

  closeBotModal() {
    this.showBotModal = false;
  }

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

  async ensurePlayerSaved(name: string) {
    if (this.selectedPresetName === 'CUSTOM' && name) {
      try {
        const updated = await this.gameSocket.savePlayer(name);
        this.registeredPlayers = updated;
        this.selectedPresetName = name;
      } catch (e) {}
    }
  }

  async startBotGame(gameType: string) {
    const name = this.finalPlayerName.trim();
    if (!name) return;
    this.closeBotModal();
    this.isLoading = true;
    try {
      await this.ensurePlayerSaved(name);
      const roomId = await this.gameSocket.createRoom(true, gameType);
      this.gameSocket.connectSocket(roomId, name);
    } catch (err) {
      alert('A apărut o eroare la crearea jocului cu Bot-ul!');
    } finally {
      this.isLoading = false;
    }
  }

  async createPvpRoom(gameType: string) {
    const name = this.finalPlayerName.trim();
    if (!name) return;
    this.isLoading = true;
    try {
      await this.ensurePlayerSaved(name);
      const roomId = await this.gameSocket.createRoom(false, gameType);
      this.gameSocket.connectSocket(roomId, name);
    } catch (err) {
      alert('A apărut o eroare la crearea camerei PvP!');
    } finally {
      this.isLoading = false;
    }
  }

  async joinDirectRoom(roomId: string) {
    const name = this.finalPlayerName.trim();
    if (!name || !roomId) return;
    await this.ensurePlayerSaved(name);
    this.gameSocket.connectSocket(roomId, name);
  }
}
