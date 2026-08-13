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
    <div class="friv-hub-outer animate-pop-in">
      <div class="friv-hub-card glass-panel">
        
        <!-- FRIV HUB HERO HEADER -->
        <div class="friv-hero-header">
          <div class="player-selector-bar">
            <span class="p-label"><i class="fa-solid fa-users text-amber"></i> Alege jucătorul:</span>
            
            <div class="player-pills">
              <button 
                *ngFor="let pName of registeredPlayers" 
                class="player-pill" 
                [class.active]="selectedPresetName === pName" 
                (click)="selectPlayer(pName)">
                <span class="p-icon">{{ pName.includes('Alina') ? '👩🏻‍🦱' : '🧑🏽' }}</span>
                <span>{{ pName }}</span>
              </button>
            </div>
          </div>

          <!-- QUICK ACTION BAR: ENTER CODE OR BOT MATCH -->
          <div class="quick-action-bar">
            <button class="action-btn btn-code" (click)="openCodeModal()">
              <i class="fa-solid fa-key"></i> Introdu codul camerei
            </button>

            <button class="action-btn btn-bot" (click)="openBotModal()">
              <i class="fa-solid fa-robot"></i> Antrenament vs Bot AI
            </button>
          </div>
        </div>

        <!-- PUBLIC WAITING ROOMS (1-CLICK JOIN) -->
        <div *ngIf="waitingRooms.length > 0" class="friv-waiting-rooms animate-fade-in">
          <div class="waiting-title">
            <i class="fa-solid fa-door-open text-amber"></i> Camere live deschise (1-Click Join):
          </div>

          <div class="waiting-grid">
            <div *ngFor="let room of waitingRooms" class="waiting-card">
              <div class="room-info">
                <i class="fa-solid text-amber" [class.fa-calculator]="room.game_type !== 'words'" [class.fa-font]="room.game_type === 'words'"></i>
                <span>{{ room.game_type === 'words' ? 'Cuvinte 5' : 'Cifre 4' }} cu <strong>{{ room.host_name }}</strong></span>
              </div>
              <button 
                class="btn-join-fast" 
                (click)="joinDirectRoom(room.room_id)"
                [disabled]="!finalPlayerName.trim() || isLoading">
                <i class="fa-solid fa-play"></i> Intră Acum
              </button>
            </div>
          </div>
        </div>

        <!-- FRIV GAME TILES GRID (COLORFUL & INTERACTIVE) -->
        <div class="friv-tiles-header">
          <h2>🎮 Alege Jocul 1v1</h2>
        </div>

        <div class="friv-games-grid">

          <!-- GAME TILE 1: CIFRE 4 (AMBER / GOLDEN ARCADE) -->
          <div class="friv-tile tile-cifre">
            <div class="tile-badge">
              <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star-half-stroke"></i>
            </div>
            <div class="tile-icon-wrapper">
              <i class="fa-solid fa-calculator tile-icon"></i>
            </div>
            <h3 class="tile-title">Cifre 4</h3>
            <p class="tile-desc">Ghicește numărul secret din 4 cifre ales de iubirea ta!</p>

            <div class="tile-actions">
              <button 
                class="btn-tile-play play-cifre" 
                (click)="createPvpRoom('numbers')"
                [disabled]="!finalPlayerName.trim() || isLoading">
                <i class="fa-solid fa-heart"></i> Joacă cu iubirea ta
              </button>
            </div>
          </div>

          <!-- GAME TILE 2: CUVINTE 5 (PURPLE / VIOLET WIZARD) -->
          <div class="friv-tile tile-cuvinte">
            <div class="tile-badge purple-badge">
              <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i>
            </div>
            <div class="tile-icon-wrapper">
              <i class="fa-solid fa-font tile-icon"></i>
            </div>
            <h3 class="tile-title">Cuvinte 5</h3>
            <p class="tile-desc">
              Ghicește cuvântul secret din 5 litere ales de iubirea ta!<br>
              Validat pe Dexonline!
            </p>

            <div class="tile-actions">
              <button 
                class="btn-tile-play play-cuvinte" 
                (click)="createPvpRoom('words')"
                [disabled]="!finalPlayerName.trim() || isLoading">
                <i class="fa-solid fa-heart"></i> Joacă cu dragostea ta
              </button>
            </div>
          </div>

        </div>

        <!-- LEADERBOARD SECTION (GENERAL / CIFRE / CUVINTE BELOW GAME CARDS) -->
        <div class="friv-leaderboard-embed animate-fade-in">
          <div class="lb-embed-header">
            <div class="lb-embed-title">
              <i class="fa-solid fa-trophy text-amber"></i>
              <h3>Clasament Victorii & Statistici</h3>
            </div>

            <!-- CATEGORY FILTER TABS: General / Cifre / Cuvinte -->
            <div class="lb-category-tabs">
              <button 
                class="lb-tab-btn" 
                [class.active]="activeStatsTab === 'ALL'" 
                (click)="setStatsTab('ALL')">
                <i class="fa-solid fa-globe"></i> General
              </button>

              <button 
                class="lb-tab-btn" 
                [class.active]="activeStatsTab === 'numbers'" 
                (click)="setStatsTab('numbers')">
                <i class="fa-solid fa-calculator"></i> Cifre
              </button>

              <button 
                class="lb-tab-btn" 
                [class.active]="activeStatsTab === 'words'" 
                (click)="setStatsTab('words')">
                <i class="fa-solid fa-font"></i> Cuvinte
              </button>
            </div>
          </div>

          <!-- RANKING LIST -->
          <div *ngIf="hasStats()" class="lb-ranking-list">
            <div *ngFor="let item of getSortedStats(); let idx = index" class="lb-row" [class.gold-row]="idx === 0">
              <div class="lb-rank">
                <span *ngIf="idx === 0">🥇 #1</span>
                <span *ngIf="idx === 1">🥈 #2</span>
                <span *ngIf="idx === 2">🥉 #3</span>
                <span *ngIf="idx > 2" class="rank-num">#{{ idx + 1 }}</span>
              </div>
              <div class="lb-player">
                <span class="p-icon">{{ item.name.includes('Alina') ? '👩🏻‍🦱' : (item.name.includes('Robabe') ? '🧑🏽' : '👤') }}</span>
                <span class="p-name">{{ item.name }}</span>
              </div>
              <div class="lb-wins">
                <strong>{{ item.wins }}</strong>
                <span>{{ item.wins === 1 ? 'victorie' : 'victorii' }}</span>
              </div>
            </div>
          </div>

          <div *ngIf="!hasStats()" class="lb-empty">
            <i class="fa-solid fa-medal icon-empty"></i>
            <p>Nicio victorie înregistrată încă în această categorie.</p>
          </div>
        </div>

        <div *ngIf="gameSocket.errorMessage()" class="error-banner animate-fade-in">
          <i class="fa-solid fa-triangle-exclamation"></i> {{ gameSocket.errorMessage() }}
        </div>

      </div>
    </div>

    <!-- MODAL 1: ROOM CODE JOIN POPUP -->
    <div *ngIf="showCodeModal" class="modal-backdrop animate-fade-in" (click)="closeCodeModal()">
      <div class="modal-card animate-pop-in" (click)="$event.stopPropagation()">
        <button class="modal-close-btn" (click)="closeCodeModal()">&times;</button>

        <div class="modal-header">
          <div class="bot-modal-icon">🔑</div>
          <h2>Intră cu Cod de Cameră</h2>
          <p>Introdu codul privat din 6 caractere oferit de prietenul tău:</p>
        </div>

        <div class="code-modal-form">
          <input 
            type="text" 
            class="form-input code-modal-input" 
            placeholder="EX: A1B2C3" 
            [(ngModel)]="manualRoomCode"
            maxlength="6"
            style="text-transform: uppercase;">

          <button 
            class="btn btn-primary btn-submit-code" 
            (click)="joinByCode()"
            [disabled]="!finalPlayerName.trim() || !manualRoomCode.trim() || isLoading">
            <i class="fa-solid fa-right-to-bracket"></i> Intră în Cameră
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 2: BOT SELECTOR POPUP -->
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
    .friv-hub-outer {
      display: flex;
      justify-content: center;
      padding: 48px 20px 30px 20px;
      min-height: 88vh;
    }

    .friv-hub-card {
      width: 100%;
      max-width: 920px;
      padding: 32px 28px;
      background: rgba(15, 23, 42, 0.78);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: var(--radius-lg);
      color: #ffffff;
      box-shadow: 0 20px 50px rgba(0,0,0,0.4);
    }

    /* PLAYER SELECTOR BAR */
    .friv-hero-header {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .player-selector-bar {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .p-label {
      font-size: 0.9rem;
      font-weight: 800;
      color: #f8fafc;
    }

    .player-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .player-pill {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 8px 18px;
      border-radius: 20px;
      font-size: 0.95rem;
      font-weight: 700;
      color: #f8fafc;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
    }

    .player-pill:hover {
      background: rgba(255, 255, 255, 0.18);
    }

    .player-pill.active {
      background: rgba(245, 158, 11, 0.25);
      border-color: #f59e0b;
      color: #fef08a;
      box-shadow: 0 0 15px rgba(245, 158, 11, 0.35);
    }

    .custom-name-box {
      margin-top: 10px;
      width: 100%;
      max-width: 320px;
    }

    .quick-action-bar {
      display: flex;
      gap: 10px;
      margin-top: 24px;
      padding-top: 6px;
    }

    .action-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #f8fafc;
      font-size: 0.88rem;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .action-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-2px);
    }

    .btn-code { color: #f59e0b; }
    .btn-bot { color: #c084fc; }

    /* WAITING ROOMS */
    .friv-waiting-rooms {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(253, 224, 71, 0.3);
      border-radius: var(--radius-md);
      padding: 14px 18px;
      margin-bottom: 24px;
    }

    .waiting-title {
      font-size: 0.9rem;
      font-weight: 800;
      margin-bottom: 10px;
      color: #fef08a;
    }

    .waiting-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .waiting-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.7);
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }

    .room-info {
      font-size: 0.9rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-join-fast {
      background: var(--color-green);
      color: #ffffff;
      border: none;
      padding: 6px 14px;
      font-size: 0.85rem;
      font-weight: 800;
      border-radius: 6px;
      cursor: pointer;
    }

    /* FRIV GAME TILES GRID */
    .friv-tiles-header h2 {
      font-size: 1.4rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 16px;
    }

    .friv-games-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .friv-tile {
      border-radius: var(--radius-lg);
      padding: 28px 20px;
      text-align: center;
      position: relative;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
    }

    .tile-cifre {
      background: linear-gradient(135deg, rgba(30, 20, 10, 0.75) 0%, rgba(120, 53, 15, 0.88) 100%), 
                  url('/assets/cifre_background.jpg') center/cover no-repeat;
      border: 2px solid #fde047;
      color: #ffffff;
      position: relative;
      overflow: hidden;
    }
    .tile-cifre:hover {
      transform: translateY(-6px);
      box-shadow: 0 16px 36px rgba(217, 119, 6, 0.4);
      background: linear-gradient(135deg, rgba(30, 20, 10, 0.58) 0%, rgba(180, 83, 9, 0.75) 100%), 
                  url('/assets/cifre_background.jpg') center/cover no-repeat;
    }

    .tile-cuvinte {
      background: linear-gradient(135deg, rgba(20, 10, 45, 0.75) 0%, rgba(88, 28, 135, 0.88) 100%), 
                  url('/assets/keyboard_background.avif') center/cover no-repeat;
      border: 2px solid #ddd6fe;
      color: #ffffff;
      position: relative;
      overflow: hidden;
    }
    .tile-cuvinte:hover {
      transform: translateY(-6px);
      box-shadow: 0 16px 36px rgba(124, 58, 237, 0.4);
      background: linear-gradient(135deg, rgba(20, 10, 45, 0.58) 0%, rgba(126, 34, 206, 0.75) 100%), 
                  url('/assets/keyboard_background.avif') center/cover no-repeat;
    }

    .tile-badge {
      position: absolute;
      top: 14px;
      right: 14px;
      background: #d97706;
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 14px;
    }

    .purple-badge {
      background: #7c3aed;
    }

    .tile-icon-wrapper {
      margin-bottom: 12px;
    }

    .tile-cifre .tile-icon {
      font-size: 3.5rem;
      color: #fef08a;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6));
    }

    .tile-cuvinte .tile-icon {
      font-size: 3.5rem;
      color: #e9d5ff;
      filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6));
    }

    .tile-title {
      font-size: 1.55rem;
      font-weight: 800;
      color: #ffffff;
      text-shadow: 0 2px 8px rgba(0,0,0,0.8);
      margin-bottom: 6px;
    }

    .tile-desc {
      font-size: 0.88rem;
      color: #f1f5f9;
      text-shadow: 0 2px 6px rgba(0,0,0,0.8);
      margin-bottom: 12px;
    }

    .tile-rating {
      font-size: 0.85rem;
      margin-bottom: 20px;
    }

    .tile-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .btn-tile-play {
      width: 100%;
      padding: 12px;
      font-size: 1rem;
      font-weight: 800;
      border: none;
      border-radius: var(--radius-md);
      color: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transition: all 0.2s ease;
    }

    .play-cifre {
      background: linear-gradient(90deg, #f59e0b, #d97706);
    }
    .play-cuvinte {
      background: linear-gradient(90deg, #8b5cf6, #7c3aed);
    }

    .btn-tile-play:hover {
      transform: scale(1.02);
    }

    .btn-tile-sub {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      padding: 8px;
      font-size: 0.85rem;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
    }
    .btn-tile-sub:hover {
      background: rgba(255, 255, 255, 0.22);
    }

    /* CODE MODAL INPUT */
    .code-modal-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 14px;
    }

    .code-modal-input {
      font-size: 1.8rem;
      font-weight: 800;
      letter-spacing: 4px;
      text-align: center;
      padding: 12px;
      text-transform: uppercase;
      background: rgba(15, 23, 42, 0.8);
      border-color: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    .btn-submit-code {
      padding: 12px;
      font-size: 1rem;
    }

    /* MODAL BACKDROP & CARD - DARK THEME */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 99999;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }

    .modal-card {
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #ffffff;
      border-radius: var(--radius-lg);
      padding: 32px 24px;
      width: 100%;
      max-width: 440px;
      position: relative;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.6);
      text-align: center;
    }

    .modal-close-btn {
      position: absolute;
      top: 14px;
      right: 18px;
      background: none;
      border: none;
      font-size: 1.8rem;
      color: #94a3b8;
      cursor: pointer;
    }
    .modal-close-btn:hover { color: #ffffff; }

    .bot-modal-icon { font-size: 3rem; margin-bottom: 8px; }

    .modal-header h2 { font-size: 1.4rem; font-weight: 800; margin-bottom: 4px; color: #ffffff; }
    .modal-header p { font-size: 0.85rem; color: #cbd5e1; margin-bottom: 16px; }

    .modal-game-options { display: flex; flex-direction: column; gap: 12px; }

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
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: #ffffff;
    }
    .card-cifre-opt:hover { background: rgba(245, 158, 11, 0.22); }

    .card-cuvinte-opt {
      background: rgba(124, 58, 237, 0.12);
      border: 1px solid rgba(124, 58, 237, 0.3);
      color: #ffffff;
    }
    .card-cuvinte-opt:hover { background: rgba(124, 58, 237, 0.22); }

    .opt-icon { font-size: 1.8rem; }
    .opt-details { flex: 1; }
    .opt-details h4 { font-size: 1rem; font-weight: 800; margin-bottom: 2px; color: #ffffff; }
    .opt-details p { font-size: 0.78rem; color: #cbd5e1; margin: 0; }
    .arrow-icon { color: #94a3b8; font-size: 0.9rem; }

    /* EMBEDDED LEADERBOARD SECTION - DARK THEME */
    .friv-leaderboard-embed {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
    }

    .lb-embed-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }

    .lb-embed-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .lb-embed-title h3 {
      font-size: 1.25rem;
      font-weight: 800;
      color: #ffffff;
    }

    .lb-category-tabs {
      display: flex;
      gap: 4px;
      background: rgba(255, 255, 255, 0.08);
      padding: 4px;
      border-radius: 20px;
    }

    .lb-tab-btn {
      background: transparent;
      border: none;
      font-size: 0.85rem;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 16px;
      cursor: pointer;
      color: #cbd5e1;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .lb-tab-btn.active {
      background: #f59e0b;
      color: #ffffff;
      box-shadow: 0 2px 10px rgba(245, 158, 11, 0.4);
    }

    .lb-ranking-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .lb-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-md);
      color: #ffffff;
    }

    .lb-row.gold-row {
      background: rgba(245, 158, 11, 0.15);
      border-color: rgba(253, 224, 71, 0.4);
    }

    .lb-rank {
      font-size: 0.95rem;
      font-weight: 800;
      width: 60px;
    }

    .lb-player {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1rem;
      font-weight: 700;
      color: #ffffff;
    }

    .lb-wins {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .lb-wins strong {
      font-size: 1.1rem;
      font-weight: 800;
      color: #f59e0b;
    }

    .lb-wins span {
      font-size: 0.75rem;
      color: #cbd5e1;
    }

    .lb-empty {
      padding: 30px;
      text-align: center;
      color: #cbd5e1;
    }

    .error-banner {
      margin-top: 20px;
      background: var(--color-red-bg);
      border: 1px solid var(--color-red-border);
      color: var(--color-red);
      padding: 10px;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      font-weight: 600;
    }

    @media (max-width: 680px) {
      .friv-games-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class LobbyComponent implements OnInit, OnDestroy {
  registeredPlayers: string[] = ['Alina ❤️', 'Robabe 🤍'];
  selectedPresetName: string = 'Alina ❤️';
  manualRoomCode: string = '';
  activeStatsTab: string = 'ALL';
  showCodeModal: boolean = false;
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
    await this.fetchWaitingRooms();
    await this.fetchAllStats();
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

  selectPlayer(name: string) {
    this.selectedPresetName = name;
  }

  openCodeModal() {
    this.showCodeModal = true;
  }

  closeCodeModal() {
    this.showCodeModal = false;
  }

  openBotModal() {
    this.showBotModal = true;
  }

  closeBotModal() {
    this.showBotModal = false;
  }

  get finalPlayerName(): string {
    return this.selectedPresetName;
  }

  async ensurePlayerSaved(name: string) {
    // Registered preset players Alina and Robabe are pre-saved
  }

  joinByCode() {
    const name = this.finalPlayerName.trim();
    const code = this.manualRoomCode.trim().toUpperCase();
    if (!name || !code) return;
    this.closeCodeModal();
    this.ensurePlayerSaved(name);
    this.gameSocket.connectSocket(code, name);
  }

  async startBotGame(gameType: string) {
    const name = this.finalPlayerName.trim();
    if (!name) return;
    this.closeBotModal();
    this.isLoading = true;
    try {
      this.ensurePlayerSaved(name);
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
      this.ensurePlayerSaved(name);
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
    this.ensurePlayerSaved(name);
    this.gameSocket.connectSocket(roomId, name);
  }
}
