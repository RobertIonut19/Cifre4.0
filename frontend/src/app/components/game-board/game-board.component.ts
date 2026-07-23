import { Component, DoCheck, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameSocketService } from '../../services/game-socket.service';
import { NotesPanelComponent } from '../notes-panel/notes-panel.component';
import { ChatComponent } from '../chat/chat.component';

export interface RoundGroup {
  roundNumber: number;
  p1Name: string;
  p1Guess?: { guess: string; exact_matches: number; is_win: boolean; time_taken_seconds?: number };
  p2Name: string;
  p2Guess?: { guess: string; exact_matches: number; is_win: boolean; time_taken_seconds?: number };
  isComplete: boolean;
}

export interface ScoreboardData {
  alinaWins: number;
  robabeWins: number;
  ties: number;
  otherWins: { [name: string]: number };
}

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule, FormsModule, NotesPanelComponent, ChatComponent],
  template: `
    <div *ngIf="gameSocket.gameState() as state" class="board-wrapper animate-fade-in">
      
      <!-- FLOATING CORNER DOG ANNOUNCEMENT TOAST (FIXED TO BROWSER VIEWPORT CORNER) -->
      <div *ngIf="showMyTurnBanner" class="dog-corner-toast animate-bounce-in" (click)="dismissTurnBanner()">
        <div class="speech-bubble-corner">
          <div class="bubble-title"><i class="fa-solid fa-bullseye text-amber"></i> E rândul tău! 🎯</div>
          <div class="bubble-text">{{ getOpponentLastGuessFeedback() }}</div>
        </div>
        <div class="dog-mascot-corner">
          <span class="dog-emoji">🐶</span>
        </div>
      </div>

      <!-- Top Navigation & Room Info Header -->
      <header class="glass-panel top-bar">
        <div class="brand">
          <i class="fa-solid fa-calculator text-amber"></i> CIFRE 4.0
        </div>

        <!-- SCOREBOARD PERSISTENT BADGE IN HEADER -->
        <div class="header-scoreboard" title="Scor General Memorat">
          <span class="sc-item alina-sc">Alina ❤️ <strong>{{ scoreboard.alinaWins }}</strong></span>
          <span class="sc-divider">-</span>
          <span class="sc-item robabe-sc"><strong>{{ scoreboard.robabeWins }}</strong> Robabe 🤍</span>
          <span *ngIf="scoreboard.ties > 0" class="sc-ties">(🤝 {{ scoreboard.ties }})</span>
        </div>

        <!-- MY SECRET NUMBER (VISIBLE BY DEFAULT) -->
        <div class="top-secret-bar">
          <span class="secret-title">Numărul tău secret:</span>
          <span class="secret-val-box">
            <strong *ngIf="showMySecretInGame" class="secret-digits">{{ myPlayerInfo?.secret || '????' }}</strong>
            <strong *ngIf="!showMySecretInGame" class="secret-masked">••••</strong>
            <button class="btn-toggle-eye" (click)="showMySecretInGame = !showMySecretInGame" title="Afișează/Ascunde">
              <i class="fa-solid" [class.fa-eye]="!showMySecretInGame" [class.fa-eye-slash]="showMySecretInGame"></i>
            </button>
          </span>
        </div>

        <div class="room-info">
          <span class="room-code-badge" (click)="copyRoomCode()" title="Click pentru a copia codul">
            <i class="fa-solid fa-key"></i> Cod: <strong>{{ state.room_id }}</strong>
            <i class="fa-solid fa-copy copy-icon"></i>
          </span>
          <span *ngIf="copiedCode" class="copied-toast">Copiat!</span>
        </div>

        <button class="btn btn-secondary btn-sm" (click)="gameSocket.disconnect()">
          <i class="fa-solid fa-right-from-bracket"></i> Ieși
        </button>
      </header>

      <!-- Main Layout Grid -->
      <div class="game-grid">
        <!-- Left / Core Section -->
        <div class="left-section">
          
          <!-- STATE 1: WAITING FOR PLAYERS -->
          <div *ngIf="state.state === 'WAITING_FOR_PLAYERS'" class="glass-panel state-card text-center">
            <i class="fa-solid fa-spinner fa-spin icon-large text-amber"></i>
            <h2>În așteptarea Jucătorului 2...</h2>
            <p class="text-muted">Trimite codul camerei <strong>{{ state.room_id }}</strong> prietenului tău pentru a se alătura!</p>
          </div>

          <!-- STATE 2: WAITING FOR SECRETS -->
          <div *ngIf="state.state === 'WAITING_FOR_SECRETS'" class="glass-panel state-card secret-selection-card">
            <div class="secret-card-header">
              <i class="fa-solid fa-user-lock icon-amber"></i>
              <h2>Alege Numărul Tău Secret
                <span *ngIf="state.past_games_history && state.past_games_history.length > 0" class="game-num-tag">
                  (Meciul #{{ state.past_games_history.length + 1 }})
                </span>
              </h2>
              <p class="text-muted">Alege un număr din 4 cifre (0000 - 9999). Pe telefon se deschide tastatura numerică!</p>
            </div>

            <div *ngIf="!myPlayerInfo?.has_secret; else waitingOpponentSecret" class="secret-form-box">
              <label class="form-label">Introdu cele 4 cifre secrete:</label>
              <div class="secret-input-row">
                <div class="secret-input-wrapper">
                  <input 
                    [type]="showSecret ? 'tel' : 'password'" 
                    inputmode="numeric"
                    pattern="[0-9]*"
                    class="form-input secret-input-field" 
                    placeholder="0000" 
                    [(ngModel)]="mySecretInput" 
                    maxlength="4"
                    (keyup.enter)="submitSecret()">
                  <button type="button" class="eye-toggle-btn" (click)="showSecret = !showSecret">
                    <i class="fa-solid" [class.fa-eye]="!showSecret" [class.fa-eye-slash]="showSecret"></i>
                  </button>
                </div>
                <button class="btn btn-primary btn-save-secret" (click)="submitSecret()" [disabled]="!isValidSecret(mySecretInput)">
                  <i class="fa-solid fa-check"></i> Salvează Numărul Secret
                </button>
              </div>
            </div>

            <ng-template #waitingOpponentSecret>
              <div class="secret-ready-box animate-fade-in">
                <i class="fa-solid fa-circle-check text-green icon-ready"></i>
                <div class="ready-text">
                  <h3>Numărul tău secret a fost salvat!</h3>
                  <p class="text-muted">În așteptare ca și celălalt jucător să își aleagă numărul...</p>
                </div>
              </div>
            </ng-template>
          </div>

          <!-- STATE 3 & 4: PLAYING & FINISHED -->
          <div *ngIf="state.state === 'PLAYING' || state.state === 'FINISHED'" class="main-play-container">
            
            <!-- SIDE-BY-SIDE CORE CONSOLE: GUESS INPUT (LEFT) + DUAL COLUMN TABLE (RIGHT - MOBILE OPTIMIZED) -->
            <div class="play-split-row">
              
              <!-- LEFT SUB-CARD: COMPACT GUESS INPUT CONSOLE -->
              <div class="glass-panel guess-console-card" [class.turn-mine-card]="isMyTurn()">
                <div class="turn-orange-title text-amber">
                  <span *ngIf="isMyTurn()"><i class="fa-solid fa-crosshair"></i> RÂNDUL TĂU SĂ GHICEȘTI!</span>
                  <span *ngIf="!isMyTurn()"><i class="fa-solid fa-hourglass-half fa-spin"></i> RÂNDUL ADVERSARULUI...</span>
                </div>
                
                <div class="round-indicator">Runda {{ getCurrentRoundNumber() }}</div>

                <div class="guess-input-box" [class.opacity-disabled]="!isMyTurn()">
                  <div class="guess-input-wrapper">
                    <input 
                      type="tel"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      id="guessNumInput"
                      class="form-input guess-input" 
                      placeholder="0000" 
                      [(ngModel)]="guessInput" 
                      maxlength="4"
                      [disabled]="!isMyTurn()"
                      (keyup.enter)="submitGuess()">
                    <button class="btn btn-primary btn-guess" (click)="submitGuess()" [disabled]="!isMyTurn() || !isValidSecret(guessInput)">
                      <i class="fa-solid fa-paper-plane"></i> Ghicește
                    </button>
                  </div>
                </div>
              </div>

              <!-- RIGHT SUB-CARD: DUAL COLUMN GUESSES TABLE (RESPONSIVE & MOBILE-OPTIMIZED) -->
              <div class="glass-panel dual-guesses-card">
                <div class="dual-guesses-header">
                  <div class="col-head my-head text-amber"><i class="fa-solid fa-user-check"></i> Tu</div>
                  <div class="col-head opp-head text-muted"><i class="fa-solid fa-user"></i> Adversar</div>
                </div>

                <div *ngIf="getRoundGroups().length === 0" class="no-my-guesses">
                  <p>Nicio încercare făcută încă.</p>
                </div>

                <div class="dual-guesses-body" *ngIf="getRoundGroups().length > 0">
                  <div *ngFor="let rg of getRoundGroups()" class="dual-row">
                    
                    <!-- Left Column: My Guess (Vibrant 5 Colors) -->
                    <div class="dual-col col-mine">
                      <span class="rg-num">{{ rg.roundNumber }}.</span>
                      <ng-container *ngIf="getMyGuessForRound(rg) as mg; else noMyGuess">
                        <strong class="mg-num">{{ mg.guess }}</strong>
                        <span class="mg-score-digit" [class]="'score-color-' + mg.exact_matches">{{ mg.exact_matches }}</span>
                      </ng-container>
                      <ng-template #noMyGuess>
                        <span class="pending-text">-</span>
                      </ng-template>
                    </div>

                    <!-- Right Column: Opponent Guess (Dimmed) -->
                    <div class="dual-col col-opponent">
                      <span class="rg-num">{{ rg.roundNumber }}.</span>
                      <ng-container *ngIf="getOpponentGuessForRound(rg) as og; else noOpponentGuess">
                        <strong class="mg-num opp-num">{{ og.guess }}</strong>
                        <span class="mg-score-digit opp-score" [class]="'score-color-' + og.exact_matches">{{ og.exact_matches }}</span>
                      </ng-container>
                      <ng-template #noOpponentGuess>
                        <span class="pending-text">-</span>
                      </ng-template>
                    </div>

                  </div>
                </div>
              </div>

            </div>

            <!-- GAME OVER / WINNER OR TIE BOX -->
            <div *ngIf="state.state === 'FINISHED'" class="winner-card animate-fade-in" [class.tie-card]="state.winner === 'TIE'">
              <div *ngIf="state.winner === 'TIE'; else playerWinnerBlock">
                <i class="fa-solid fa-handshake winner-trophy text-amber"></i>
                <h2>EGALITATE PERFECTĂ! 🤝</h2>
                <p class="winner-subtitle">
                  Ambii jucători au ghicit numărul secret în aceeași rundă!
                </p>
              </div>

              <ng-template #playerWinnerBlock>
                <i class="fa-solid fa-trophy winner-trophy"></i>
                <h2>{{ state.winner_name }} a câștigat! 🎉</h2>
                <p class="winner-subtitle">
                  Numărul secret ghicit a fost descoperit cu succes!
                </p>
              </ng-template>

              <div class="secrets-summary">
                <div *ngFor="let pid of state.player_order" class="secret-item">
                  <span>{{ state.players[pid].name }}:</span>
                  <strong class="text-amber">{{ state.players[pid].secret }}</strong>
                </div>
              </div>

              <!-- PLAY AGAIN BUTTON -->
              <div class="play-again-action">
                <button class="btn btn-primary btn-play-again" (click)="gameSocket.restartGame()">
                  <i class="fa-solid fa-rotate-right"></i> 🎮 Joacă din nou (Meci nou)
                </button>
              </div>
            </div>

          </div>

          <!-- Notes Panel Component (4 Columns in 1 Row) -->
          <app-notes-panel></app-notes-panel>
        </div>

        <!-- Right Section: Scoreboard, Chat & Players list -->
        <div class="right-section">
          
          <!-- SCOREBOARD DETAILED CARD PERSISTED IN LOCALSTORAGE -->
          <div class="glass-panel scoreboard-card">
            <div class="sc-card-header">
              <h4><i class="fa-solid fa-trophy text-amber"></i> Evidență Meciuri (Scor)</h4>
              <button class="btn-reset-sc" (click)="resetScoreboard()" title="Resetează Scor">
                <i class="fa-solid fa-rotate-left"></i>
              </button>
            </div>

            <div class="scoreboard-stats">
              <div class="sc-player-row alina-row">
                <span class="sc-name">Alina ❤️</span>
                <strong class="sc-val">{{ scoreboard.alinaWins }} victorii</strong>
              </div>
              <div class="sc-player-row robabe-row">
                <span class="sc-name">Robabe 🤍</span>
                <strong class="sc-val">{{ scoreboard.robabeWins }} victorii</strong>
              </div>
              <div class="sc-player-row tie-row">
                <span class="sc-name">Egalități 🤝</span>
                <strong class="sc-val">{{ scoreboard.ties }} remize</strong>
              </div>

              <div *ngFor="let name of getOtherWinnerNames()" class="sc-player-row other-row">
                <span class="sc-name">{{ name }}</span>
                <strong class="sc-val">{{ scoreboard.otherWins[name] }} victorii</strong>
              </div>
            </div>
          </div>

          <!-- Players Box ("Jucători") -->
          <div class="glass-panel players-card">
            <h4><i class="fa-solid fa-users text-amber"></i> Jucători</h4>
            <div class="players-list">
              <div *ngFor="let pid of state.player_order" class="player-item" [class.is-active-turn]="state.current_turn === pid">
                <div class="player-avatar">
                  <i class="fa-solid" [class.fa-robot]="pid === 'BOT_AGENT'" [class.fa-user]="pid !== 'BOT_AGENT'"></i>
                </div>
                <div class="player-details">
                  <span class="p-name">{{ state.players[pid].name }}</span>
                  <span *ngIf="pid === gameSocket.playerId()" class="you-badge">(Tu)</span>
                </div>
                <div class="p-status">
                  <span *ngIf="state.players[pid].has_secret" class="status-dot green" title="Număr secret gata"></span>
                  <span *ngIf="!state.players[pid].has_secret" class="status-dot orange" title="Se gândește la număr"></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Live Chat Component -->
          <app-chat></app-chat>

          <!-- PAST GAMES CUMULATIVE HISTORY -->
          <div *ngIf="state.past_games_history && state.past_games_history.length > 0" class="glass-panel past-games-card animate-fade-in">
            <h4><i class="fa-solid fa-clock-rotate-left text-amber"></i> Istoric Meciuri Cameră</h4>
            
            <div class="past-games-list">
              <div *ngFor="let g of state.past_games_history" class="past-game-item">
                <div class="pg-header">
                  <strong>Meciul #{{ g.game_number }}</strong>
                  <span class="pg-winner-badge">🏆 {{ g.winner_name }}</span>
                </div>
                <div class="pg-details">
                  <span>Durație: {{ g.total_rounds }} runde</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .board-wrapper {
      max-width: 1280px;
      margin: 0 auto;
      padding: 16px;
      position: relative;
    }

    /* FLOATING CORNER DOG ANNOUNCEMENT TOAST (FIXED TO BROWSER VIEWPORT CORNER) */
    .dog-corner-toast {
      position: fixed;
      bottom: 16px;
      right: 20px;
      z-index: 999999;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      animation: cornerPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    @keyframes cornerPop {
      0% { opacity: 0; transform: translateY(40px) scale(0.6); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }

    .speech-bubble-corner {
      background: #ffffff;
      border: 3px solid var(--accent-amber);
      border-radius: 18px;
      padding: 14px 22px;
      box-shadow: 0 12px 35px rgba(60, 45, 35, 0.25);
      margin-bottom: 8px;
      position: relative;
      max-width: 320px;
    }

    .speech-bubble-corner::after {
      content: '';
      position: absolute;
      bottom: -10px;
      right: 32px;
      border-width: 10px 10px 0;
      border-style: solid;
      border-color: var(--accent-amber) transparent;
      display: block;
      width: 0;
    }

    .bubble-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--accent-amber);
      margin-bottom: 4px;
    }

    .bubble-text {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .dog-mascot-corner {
      margin-right: 20px;
      animation: dogBounce 0.35s infinite alternate ease-in-out;
    }

    @keyframes dogBounce {
      from { transform: translateY(0); }
      to { transform: translateY(-8px); }
    }

    .dog-emoji {
      font-size: 5.5rem;
      line-height: 1;
      filter: drop-shadow(0 6px 16px rgba(0,0,0,0.25));
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      margin-bottom: 16px;
    }

    .brand {
      font-size: 1.3rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: var(--text-main);
    }

    /* HEADER SCOREBOARD BADGE */
    .header-scoreboard {
      background: #fff8ef;
      border: 1px solid var(--accent-amber);
      border-radius: 20px;
      padding: 4px 14px;
      font-size: 0.88rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .alina-sc { color: #be185d; }
    .robabe-sc { color: #475569; }
    .sc-divider { color: var(--text-muted); }
    .sc-ties { color: #854d0e; font-size: 0.8rem; }

    .top-secret-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #fbf9f5;
      border: 1px solid var(--border-color);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.9rem;
    }

    .secret-title {
      font-weight: 600;
      color: var(--text-muted);
    }

    .secret-val-box {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .secret-digits, .secret-masked {
      font-family: 'Outfit', monospace;
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: 3px;
      color: var(--accent-amber);
    }

    .btn-toggle-eye {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1rem;
    }

    .text-amber {
      color: var(--accent-amber);
    }

    .room-info {
      position: relative;
    }

    .room-code-badge {
      background: #f1ece6;
      border: 1px dashed var(--accent-amber);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.9rem;
      color: var(--text-main);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .room-code-badge:hover {
      background: #e6dfd4;
    }

    .copy-icon {
      font-size: 0.8rem;
      color: var(--accent-amber);
    }

    .copied-toast {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-green);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      margin-top: 4px;
    }

    .game-grid {
      display: grid;
      grid-template-columns: 1fr 340px;
      gap: 16px;
    }

    .left-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .right-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .state-card {
      padding: 30px;
      text-align: center;
    }

    .secret-selection-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-warm);
    }

    .secret-card-header {
      margin-bottom: 24px;
    }

    .game-num-tag {
      font-size: 0.9rem;
      color: var(--accent-amber);
      margin-left: 6px;
    }

    .icon-amber {
      font-size: 2.5rem;
      color: var(--accent-amber);
      margin-bottom: 12px;
    }

    .secret-form-box {
      max-width: 440px;
      margin: 0 auto;
      text-align: left;
      background: #fbf9f5;
      border: 1px solid var(--border-subtle);
      padding: 20px;
      border-radius: var(--radius-md);
    }

    .form-label {
      display: block;
      font-weight: 700;
      font-size: 0.95rem;
      margin-bottom: 10px;
      color: var(--text-main);
    }

    .secret-input-row {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .secret-input-wrapper {
      position: relative;
      width: 100%;
    }

    .secret-input-field {
      font-size: 1.8rem;
      letter-spacing: 6px;
      text-align: center;
      font-weight: 800;
      padding: 10px 40px 10px 16px;
      background: #ffffff;
      color: var(--accent-amber);
    }

    .eye-toggle-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1.1rem;
    }

    .btn-save-secret {
      width: 100%;
      padding: 12px;
      font-size: 1rem;
    }

    .secret-ready-box {
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--color-green-bg);
      border: 1px solid var(--color-green-border);
      padding: 20px;
      border-radius: var(--radius-md);
      text-align: left;
    }

    .icon-ready {
      font-size: 2.2rem;
    }

    .ready-text h3 {
      font-size: 1.1rem;
      color: var(--color-green);
      margin-bottom: 2px;
    }

    .main-play-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* PLAY SPLIT ROW: CONSOLE (LEFT) + DUAL COLUMN TABLE (RIGHT) */
    .play-split-row {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 16px;
    }

    /* ULTRA MINIMAL GUESS CONSOLE CARD */
    .guess-console-card {
      padding: 14px 16px;
      border: 2px solid var(--border-color);
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 8px;
    }

    .guess-console-card.turn-mine-card {
      border-color: var(--accent-amber);
      background: #fffdf9;
      box-shadow: 0 6px 20px rgba(217, 119, 6, 0.15);
    }

    .turn-orange-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--accent-amber) !important;
      margin-bottom: 2px;
    }

    .round-indicator {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .guess-input-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .guess-input {
      font-size: 1.8rem;
      font-weight: 800;
      letter-spacing: 6px;
      text-align: center;
      background: #ffffff;
      padding: 8px;
    }

    .btn-guess {
      width: 100%;
      padding: 10px;
      font-size: 0.95rem;
    }

    .opacity-disabled {
      opacity: 0.55;
      pointer-events: none;
    }

    /* DUAL GUESSES CARD WITH COMPACT ALIGNED NUMBERS */
    .dual-guesses-card {
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
    }

    .dual-guesses-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .col-head {
      font-size: 0.85rem;
      font-weight: 800;
    }

    .no-my-guesses {
      margin: auto;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-style: italic;
      padding: 16px 10px;
    }

    .dual-guesses-body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-height: 380px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .dual-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 2px 0;
      border-bottom: 1px solid var(--border-subtle);
    }

    .dual-col {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1px 4px;
      border-radius: 4px;
    }

    .col-mine {
      opacity: 1; /* VIBRANT FOR PLAYER */
    }

    .col-opponent {
      opacity: 0.65; /* DIMMED FOR OPPONENT */
      background: rgba(0, 0, 0, 0.02);
    }

    .rg-num {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      width: 20px;
    }

    .mg-num {
      font-family: 'Outfit', monospace;
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: 2px;
      color: var(--text-main);
      flex: 1;
    }

    .opp-num {
      color: #64748b;
    }

    .pending-text {
      color: var(--text-light);
      font-size: 0.75rem;
      font-style: italic;
    }

    /* 5 DYNAMIC SCORE COLORS (0=RED, 1=ORANGE, 2=YELLOW, 3=LIGHT GREEN, 4=DARK GREEN) */
    .mg-score-digit {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 0.8rem;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .score-color-0 {
      background: #fee2e2;
      color: #dc2626;
      border: 1px solid #fca5a5;
    }

    .score-color-1 {
      background: #ffedd5;
      color: #ea580c;
      border: 1px solid #fed7aa;
    }

    .score-color-2 {
      background: #fef9c3;
      color: #ca8a04;
      border: 1px solid #fef08a;
    }

    .score-color-3 {
      background: #ecfccb;
      color: #65a30d;
      border: 1px solid #bef264;
    }

    .score-color-4 {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #86efac;
    }

    .winner-card {
      text-align: center;
      padding: 30px 20px;
      background: #fef3c7;
      border: 2px solid #f59e0b;
      border-radius: var(--radius-md);
    }

    .winner-card.tie-card {
      background: #fefce8;
      border-color: #eab308;
    }

    .winner-trophy {
      font-size: 3rem;
      color: #d97706;
      margin-bottom: 10px;
    }

    .winner-subtitle {
      color: #78350f;
      margin-bottom: 16px;
    }

    .play-again-action {
      margin-top: 20px;
    }

    .btn-play-again {
      padding: 14px 28px;
      font-size: 1.1rem;
    }

    .secrets-summary {
      display: flex;
      justify-content: center;
      gap: 20px;
      font-size: 1rem;
    }

    /* SCOREBOARD CARD */
    .scoreboard-card {
      padding: 14px 16px;
    }

    .sc-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .sc-card-header h4 {
      font-size: 0.98rem;
      color: var(--text-main);
    }

    .btn-reset-sc {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.85rem;
    }

    .scoreboard-stats {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .sc-player-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.88rem;
      padding: 4px 8px;
      background: #fbf9f5;
      border-radius: 6px;
      border: 1px solid var(--border-subtle);
    }

    .sc-name {
      font-weight: 700;
    }

    .alina-row .sc-name { color: #be185d; }
    .robabe-row .sc-name { color: #334155; }
    .tie-row .sc-name { color: #854d0e; }

    .sc-val {
      font-size: 0.85rem;
      color: var(--text-main);
    }

    .players-card {
      padding: 16px;
    }

    .players-card h4 {
      font-size: 1.05rem;
      margin-bottom: 12px;
      color: var(--text-main);
    }

    .players-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .player-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: #fbf9f5;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
    }

    .player-item.is-active-turn {
      border-color: var(--accent-amber);
      background: #fef3c7;
    }

    .player-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--accent-amber);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 0.9rem;
    }

    .player-details {
      flex: 1;
    }

    .p-name {
      font-weight: 600;
      color: var(--text-main);
    }

    .you-badge {
      font-size: 0.75rem;
      color: var(--accent-amber);
      margin-left: 4px;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .status-dot.green { background: var(--color-green); box-shadow: 0 0 6px var(--color-green); }
    .status-dot.orange { background: #f59e0b; }

    /* PAST GAMES CUMULATIVE HISTORY */
    .past-games-card {
      padding: 16px;
    }

    .past-games-card h4 {
      font-size: 1.05rem;
      margin-bottom: 12px;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .past-games-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 180px;
      overflow-y: auto;
    }

    .past-game-item {
      background: #fbf9f5;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 8px 10px;
    }

    .pg-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
      margin-bottom: 2px;
    }

    .pg-winner-badge {
      font-weight: 700;
      color: var(--accent-amber);
      font-size: 0.8rem;
    }

    .pg-details {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* MOBILE PHONES OPTIMIZATION (< 768px & < 600px) */
    @media (max-width: 900px) {
      .game-grid {
        grid-template-columns: 1fr;
      }
      .top-bar {
        flex-direction: column;
        gap: 10px;
      }
    }

    @media (max-width: 768px) {
      .play-split-row {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }

    @media (max-width: 600px) {
      .board-wrapper {
        padding: 6px;
      }
      .top-bar {
        padding: 10px;
        gap: 8px;
      }
      .header-scoreboard {
        font-size: 0.78rem;
        padding: 3px 10px;
      }
      .top-secret-bar {
        padding: 4px 10px;
        font-size: 0.82rem;
      }
      .secret-digits, .secret-masked {
        font-size: 1.05rem;
        letter-spacing: 2px;
      }

      /* MOBILE GUESSES TABLE PERFECT RESPONSIVE FIT */
      .dual-guesses-card {
        padding: 10px;
      }
      .dual-guesses-header {
        gap: 6px;
        margin-bottom: 4px;
        padding-bottom: 4px;
      }
      .col-head {
        font-size: 0.82rem;
      }
      .dual-guesses-body {
        max-height: 330px;
        gap: 2px;
      }
      .dual-row {
        gap: 6px;
        padding: 2px 0;
      }
      .dual-col {
        padding: 1px 3px;
      }
      .rg-num {
        font-size: 0.7rem;
        width: 16px;
      }
      .mg-num {
        font-size: 0.88rem;
        letter-spacing: 1px;
      }
      .mg-score-digit {
        width: 20px;
        height: 20px;
        font-size: 0.75rem;
      }

      /* MOBILE CORNER TOAST */
      .speech-bubble-corner {
        max-width: 250px;
        padding: 10px 14px;
      }
      .bubble-title {
        font-size: 1.1rem;
      }
      .bubble-text {
        font-size: 0.9rem;
      }
      .dog-emoji {
        font-size: 4.2rem;
      }
    }
  `]
})
export class GameBoardComponent implements OnInit, DoCheck {
  mySecretInput: string = '';
  showSecret: boolean = false;
  showMySecretInGame: boolean = true;
  guessInput: string = '';
  copiedCode: boolean = false;

  showMyTurnBanner: boolean = false;
  private previousIsMyTurn: boolean = false;
  private bannerTimer: any = null;
  private processedGameIds: Set<number> = new Set();

  public scoreboard: ScoreboardData = {
    alinaWins: 0,
    robabeWins: 0,
    ties: 0,
    otherWins: {}
  };

  constructor(public gameSocket: GameSocketService) {}

  ngOnInit() {
    this.loadScoreboard();
  }

  ngDoCheck() {
    const currentIsMyTurn = this.isMyTurn();
    if (currentIsMyTurn && !this.previousIsMyTurn) {
      this.triggerTurnBanner();
    }
    this.previousIsMyTurn = currentIsMyTurn;

    this.checkAndRecordScoreboard();
  }

  loadScoreboard() {
    const saved = localStorage.getItem('cifre_scoreboard_v1');
    if (saved) {
      try {
        this.scoreboard = JSON.parse(saved);
      } catch (e) {}
    }
  }

  saveScoreboard() {
    localStorage.setItem('cifre_scoreboard_v1', JSON.stringify(this.scoreboard));
  }

  resetScoreboard() {
    this.scoreboard = {
      alinaWins: 0,
      robabeWins: 0,
      ties: 0,
      otherWins: {}
    };
    this.saveScoreboard();
  }

  checkAndRecordScoreboard() {
    const state = this.gameSocket.gameState();
    if (!state || state.state !== 'FINISHED' || !state.winner) return;

    const gameCount = (state.past_games_history?.length || 0) + 1;
    if (this.processedGameIds.has(gameCount)) return;

    this.processedGameIds.add(gameCount);

    if (state.winner === 'TIE') {
      this.scoreboard.ties++;
    } else {
      const winnerName = state.winner_name || '';
      if (winnerName.includes('Alina')) {
        this.scoreboard.alinaWins++;
      } else if (winnerName.includes('Robabe')) {
        this.scoreboard.robabeWins++;
      } else {
        this.scoreboard.otherWins[winnerName] = (this.scoreboard.otherWins[winnerName] || 0) + 1;
      }
    }
    this.saveScoreboard();
  }

  getOtherWinnerNames(): string[] {
    return Object.keys(this.scoreboard.otherWins || {});
  }

  triggerTurnBanner() {
    this.showMyTurnBanner = true;
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
    }
    this.bannerTimer = setTimeout(() => {
      this.showMyTurnBanner = false;
    }, 4000);
  }

  dismissTurnBanner() {
    this.showMyTurnBanner = false;
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
    }
  }

  get myPlayerInfo() {
    const state = this.gameSocket.gameState();
    const pid = this.gameSocket.playerId();
    if (state && pid) {
      return state.players[pid];
    }
    return null;
  }

  isMyTurn(): boolean {
    const state = this.gameSocket.gameState();
    const pid = this.gameSocket.playerId();
    return !!(state && pid && state.current_turn === pid && state.state === 'PLAYING');
  }

  isValidSecret(val: string): boolean {
    return typeof val === 'string' && val.length === 4 && /^\d{4}$/.test(val);
  }

  submitSecret() {
    if (this.isValidSecret(this.mySecretInput)) {
      this.gameSocket.setSecret(this.mySecretInput);
    }
  }

  submitGuess() {
    if (this.isMyTurn() && this.isValidSecret(this.guessInput)) {
      this.gameSocket.makeGuess(this.guessInput);
      this.guessInput = '';
      this.dismissTurnBanner();
    }
  }

  getCurrentRoundNumber(): number {
    const history = this.gameSocket.gameState()?.guesses_history || [];
    return Math.floor(history.length / 2) + 1;
  }

  getTurnInRound(): number {
    const history = this.gameSocket.gameState()?.guesses_history || [];
    return (history.length % 2) + 1;
  }

  getOpponentLastGuessFeedback(): string {
    const state = this.gameSocket.gameState();
    const myId = this.gameSocket.playerId();
    if (!state || !myId) return 'Adversarul a mutat. Este rândul tău!';

    const history = state.guesses_history || [];
    const oppGuesses = history.filter(g => g.player_id !== myId);
    if (oppGuesses.length > 0) {
      const lastOppGuess = oppGuesses[oppGuesses.length - 1];
      const count = lastOppGuess.exact_matches;
      return `Adversarul a ghicit ${count} ${count === 1 ? 'cifră' : 'cifre'}.`;
    }
    return 'Adversarul a mutat. Este rândul tău!';
  }

  getMyGuessForRound(rg: RoundGroup) {
    const state = this.gameSocket.gameState();
    const myId = this.gameSocket.playerId();
    if (!state || !myId) return null;

    const porder = state.player_order || [];
    const isP1 = porder[0] === myId;
    return isP1 ? rg.p1Guess : rg.p2Guess;
  }

  getOpponentGuessForRound(rg: RoundGroup) {
    const state = this.gameSocket.gameState();
    const myId = this.gameSocket.playerId();
    if (!state || !myId) return null;

    const porder = state.player_order || [];
    const isP1 = porder[0] === myId;
    return isP1 ? rg.p2Guess : rg.p1Guess;
  }

  getRoundGroups(): RoundGroup[] {
    const state = this.gameSocket.gameState();
    if (!state) return [];

    const history = state.guesses_history || [];
    const porder = state.player_order || [];
    const p1Id = porder[0];
    const p2Id = porder[1];

    const p1Name = p1Id ? state.players[p1Id]?.name : 'Jucător 1';
    const p2Name = p2Id ? state.players[p2Id]?.name : 'Jucător 2';

    const roundsMap: { [roundNum: number]: RoundGroup } = {};

    history.forEach((g) => {
      const rNum = g.round_number || Math.floor((g.turn_number - 1) / 2) + 1;
      if (!roundsMap[rNum]) {
        roundsMap[rNum] = {
          roundNumber: rNum,
          p1Name,
          p2Name,
          isComplete: false
        };
      }

      const guessData = {
        guess: g.guess,
        exact_matches: g.exact_matches,
        is_win: g.is_win,
        time_taken_seconds: g.time_taken_seconds
      };

      if (g.player_id === p1Id || g.turn_in_round === 1) {
        roundsMap[rNum].p1Guess = guessData;
      } else {
        roundsMap[rNum].p2Guess = guessData;
      }

      if (roundsMap[rNum].p1Guess && roundsMap[rNum].p2Guess) {
        roundsMap[rNum].isComplete = true;
      }
    });

    return Object.values(roundsMap).reverse();
  }

  copyRoomCode() {
    const roomId = this.gameSocket.gameState()?.room_id;
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      this.copiedCode = true;
      setTimeout(() => this.copiedCode = false, 2000);
    }
  }
}
