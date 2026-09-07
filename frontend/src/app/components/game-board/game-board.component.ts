import { Component, DoCheck, OnInit, OnDestroy, HostListener } from '@angular/core';
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
          <i class="fa-solid text-amber" [class.fa-calculator]="state.game_type !== 'words'" [class.fa-font]="state.game_type === 'words'"></i>
          {{ state.game_type === 'words' ? 'CUVINTE 5' : 'CIFRE 4' }}
        </div>

        <!-- SCOREBOARD BADGE IN HEADER FOR CURRENT ROOM MATCH SERIES -->
        <div class="header-scoreboard" title="Scorul seriei de meciuri din această cameră">
          <span class="sc-item alina-sc">
            {{ getRoomSeriesScore().p1Name }} <strong>{{ getRoomSeriesScore().p1Wins }}</strong>
          </span>
          <span class="sc-divider">-</span>
          <span class="sc-item robabe-sc">
            <strong>{{ getRoomSeriesScore().p2Wins }}</strong> {{ getRoomSeriesScore().p2Name }}
          </span>
          <span *ngIf="getRoomSeriesScore().ties > 0" class="sc-ties">
            (🤝 {{ getRoomSeriesScore().ties }})
          </span>
        </div>

        <!-- MY SECRET (VISIBLE BY DEFAULT) -->
        <div class="top-secret-bar">
          <span class="secret-title">{{ state.game_type === 'words' ? 'Cuvântul tău secret:' : 'Numărul tău secret:' }}</span>
          <span class="secret-val-box">
            <strong *ngIf="showMySecretInGame" class="secret-digits">{{ myPlayerInfo?.secret || (state.game_type === 'words' ? '?????' : '????') }}</strong>
            <strong *ngIf="!showMySecretInGame" class="secret-masked">{{ state.game_type === 'words' ? '•••••' : '••••' }}</strong>
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
              <i class="fa-solid icon-amber" [class.fa-calculator]="state.game_type !== 'words'" [class.fa-font]="state.game_type === 'words'"></i>
              <h2>{{ state.game_type === 'words' ? 'Alege Cuvântul Tău Secret' : 'Alege Numărul Tău Secret' }}
                <span *ngIf="state.past_games_history && state.past_games_history.length > 0" class="game-num-tag">
                  (Meciul #{{ state.past_games_history.length + 1 }})
                </span>
              </h2>
              <p class="text-muted">
                {{ state.game_type === 'words' ? 'Alege un cuvânt din 5 litere (ex: SOARE, CARTE, CAFEA).' : 'Alege un număr din 4 cifre (0000 - 9999). Pe telefon se deschide tastatura numerică!' }}
              </p>
            </div>

            <div *ngIf="!myPlayerInfo?.has_secret; else waitingOpponentSecret" class="secret-form-box">
              <label class="form-label">{{ state.game_type === 'words' ? 'Introdu cele 5 litere secrete:' : 'Introdu cele 4 cifre secrete:' }}</label>
              <div class="secret-input-row">
                <div class="secret-input-wrapper">
                  <input 
                    [type]="showSecret ? 'text' : 'password'" 
                    [attr.inputmode]="state.game_type === 'words' ? 'text' : 'numeric'"
                    class="form-input secret-input-field" 
                    [placeholder]="state.game_type === 'words' ? 'SOARE' : '0000'" 
                    [(ngModel)]="mySecretInput" 
                    [maxlength]="state.game_type === 'words' ? 5 : 4"
                    (keyup.enter)="submitSecret()">
                  <button type="button" class="eye-toggle-btn" (click)="showSecret = !showSecret">
                    <i class="fa-solid" [class.fa-eye]="!showSecret" [class.fa-eye-slash]="showSecret"></i>
                  </button>
                </div>
                <button class="btn btn-primary btn-save-secret" (click)="submitSecret()" [disabled]="!isValidSecret(mySecretInput)">
                  <i class="fa-solid fa-check"></i> {{ state.game_type === 'words' ? 'Salvează Cuvântul Secret' : 'Salvează Numărul Secret' }}
                </button>
              </div>
            </div>

            <ng-template #waitingOpponentSecret>
              <div class="secret-ready-box animate-fade-in">
                <i class="fa-solid fa-circle-check text-green icon-ready"></i>
                <div class="ready-text">
                  <h3>{{ state.game_type === 'words' ? 'Cuvântul tău secret a fost salvat!' : 'Numărul tău secret a fost salvat!' }}</h3>
                  <p class="text-muted">În așteptare ca și celălalt jucător să își aleagă secretul...</p>
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
                      type="text"
                      [attr.inputmode]="state.game_type === 'words' ? 'text' : 'numeric'"
                      id="guessNumInput"
                      class="form-input guess-input" 
                      [placeholder]="state.game_type === 'words' ? 'SOARE' : '0000'" 
                      [(ngModel)]="guessInput" 
                      [maxlength]="state.game_type === 'words' ? 5 : 4"
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
                        <strong 
                          class="mg-num" 
                          [class.word-hoverable]="state.game_type === 'words'"
                          (mouseenter)="onWordHover(mg.guess)" 
                          (mouseleave)="onWordLeave()">
                          {{ mg.guess }}
                        </strong>
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
                        <strong 
                          class="mg-num opp-num" 
                          [class.word-hoverable]="state.game_type === 'words'"
                          (mouseenter)="onWordHover(og.guess)" 
                          (mouseleave)="onWordLeave()">
                          {{ og.guess }}
                        </strong>
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
                  Ambii jucători au ghicit secretul în aceeași rundă!
                </p>
              </div>

              <ng-template #playerWinnerBlock>
                <i class="fa-solid fa-trophy winner-trophy"></i>
                <h2>{{ state.winner_name }} a câștigat! 🎉</h2>
                <p class="winner-subtitle">
                  {{ state.game_type === 'words' ? 'Cuvântul secret a fost ghicit!' : 'Numărul secret a fost ghicit!' }}
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

          <!-- Notes Panel Component (Shown for both Numbers & Words Games) -->
          <app-notes-panel [gameType]="state.game_type || 'numbers'"></app-notes-panel>
        </div>

        <!-- Right Section: Chat at Top, Scoreboard from DB below -->
        <div class="right-section">
          
          <!-- 1. Live Chat Component (MOVED TO TOP OF RIGHT SECTION) -->
          <app-chat></app-chat>

          <!-- 2. SCOREBOARD DETAILED CARD (LOADED REAL-TIME FROM DB FOR CURRENT GAME TYPE) -->
          <div class="glass-panel scoreboard-card">
            <div class="sc-card-header">
              <h4>
                <i class="fa-solid fa-trophy text-amber"></i> 
                Evidență Meciuri ({{ state.game_type === 'words' ? 'Cuvinte 5' : 'Cifre 4' }})
              </h4>
            </div>

            <div *ngIf="getSortedDbStats().length > 0; else noDbStats" class="scoreboard-stats">
              <div *ngFor="let item of getSortedDbStats()" class="sc-player-row">
                <span class="sc-name">
                  <span class="p-emoji">{{ item.name.includes('Alina') ? '👩🏻‍🦱' : (item.name.includes('Robabe') ? '🧑🏽' : (item.name.includes('Egal') ? '🤝' : '👤')) }}</span>
                  {{ item.name }}
                </span>
                <strong class="sc-val">{{ item.wins }} {{ item.wins === 1 ? 'victorie' : 'victorii' }}</strong>
              </div>
            </div>

            <ng-template #noDbStats>
              <div class="sc-empty-text">Nicio victorie înregistrată încă în această categorie.</div>
            </ng-template>
          </div>

          <!-- 3. PAST GAMES CUMULATIVE HISTORY (IN ROOM) -->
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

      <!-- FLOATING DEXONLINE HOVER TOOLTIP BANNER -->
      <div *ngIf="hoveredWordDefinition" class="dex-hover-tooltip animate-fade-in">
        <div class="dex-tt-header">
          <i class="fa-solid fa-book-bookmark text-amber"></i>
          <strong>{{ hoveredWord }}</strong> &mdash; Definiție Dexonline:
        </div>
        <div class="dex-tt-body">
          {{ hoveredWordDefinition }}
        </div>
      </div>

    </div>
  `,
  styles: [`
    .word-hoverable {
      cursor: help;
      text-decoration: underline dotted var(--accent-amber);
      transition: color 0.15s ease;
    }
    .word-hoverable:hover {
      color: var(--accent-amber) !important;
    }

    .dex-hover-tooltip {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999999;
      background: rgba(15, 23, 42, 0.96);
      backdrop-filter: blur(16px);
      border: 2px solid var(--accent-amber);
      border-radius: var(--radius-md);
      padding: 12px 18px;
      max-width: 520px;
      width: 90%;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
      text-align: left;
      color: #ffffff;
    }

    .dex-tt-header {
      font-size: 0.9rem;
      color: #ffffff;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .dex-tt-body {
      font-size: 0.85rem;
      color: #cbd5e1;
      line-height: 1.4;
    }

    .board-wrapper {
      max-width: 1280px;
      margin: 0 auto;
      padding: 16px;
      position: relative;
    }

    /* FLOATING CORNER DOG ANNOUNCEMENT TOAST */
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
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(16px);
      border: 3px solid var(--accent-amber);
      border-radius: 18px;
      padding: 14px 22px;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
      margin-bottom: 8px;
      position: relative;
      max-width: 320px;
      color: #ffffff;
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
      color: #ffffff;
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
      filter: drop-shadow(0 6px 16px rgba(0,0,0,0.4));
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      margin-bottom: 16px;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-lg);
    }

    .brand {
      font-size: 1.3rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: #ffffff;
    }

    /* HEADER SCOREBOARD BADGE */
    .header-scoreboard {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid var(--accent-amber);
      border-radius: 20px;
      padding: 4px 14px;
      font-size: 0.88rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ffffff;
    }

    .alina-sc { color: #f472b6; }
    .robabe-sc { color: #cbd5e1; }
    .sc-divider { color: #94a3b8; }
    .sc-ties { color: #fef08a; font-size: 0.8rem; }

    .top-secret-bar {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.9rem;
      color: #ffffff;
    }

    .secret-title {
      font-weight: 600;
      color: #cbd5e1;
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
      color: #cbd5e1;
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
      background: rgba(255, 255, 255, 0.1);
      border: 1px dashed var(--accent-amber);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.9rem;
      color: #ffffff;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .room-code-badge:hover {
      background: rgba(255, 255, 255, 0.2);
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
      background: rgba(15, 23, 42, 0.78);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-warm);
      color: #ffffff;
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
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 20px;
      border-radius: var(--radius-md);
      color: #ffffff;
    }

    .form-label {
      display: block;
      font-weight: 700;
      font-size: 0.95rem;
      margin-bottom: 10px;
      color: #ffffff;
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
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fef08a;
      text-transform: uppercase;
    }

    .eye-toggle-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #94a3b8;
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
      color: #ffffff;
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
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 8px;
      color: #ffffff;
    }

    .guess-console-card.turn-mine-card {
      border-color: var(--accent-amber);
      background: rgba(245, 158, 11, 0.15);
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.25);
    }

    .turn-orange-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #fef08a !important;
      margin-bottom: 2px;
    }

    .round-indicator {
      font-size: 0.85rem;
      font-weight: 700;
      color: #cbd5e1;
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
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fef08a;
      padding: 8px;
      text-transform: uppercase;
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
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      color: #ffffff;
    }

    .dual-guesses-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }

    .col-head {
      font-size: 0.85rem;
      font-weight: 800;
      color: #ffffff;
    }

    .no-my-guesses {
      margin: auto;
      text-align: center;
      color: #cbd5e1;
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
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .dual-col {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1px 4px;
      border-radius: 4px;
    }

    .col-mine {
      opacity: 1;
    }

    .col-opponent {
      opacity: 0.75;
      background: rgba(255, 255, 255, 0.03);
    }

    .rg-num {
      font-size: 0.75rem;
      font-weight: 700;
      color: #cbd5e1;
      width: 20px;
    }

    .mg-num {
      font-family: 'Outfit', monospace;
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: 2px;
      color: #ffffff;
      flex: 1;
    }

    .opp-num {
      color: #cbd5e1;
    }

    .pending-text {
      color: #94a3b8;
      font-size: 0.85rem;
    }

    .mg-score-digit {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      font-size: 0.85rem;
      font-weight: 800;
      color: #ffffff;
    }

    .score-color-0 { background: #64748b; }
    .score-color-1 { background: #f59e0b; }
    .score-color-2 { background: #3b82f6; }
    .score-color-3 { background: #8b5cf6; }
    .score-color-4 { background: #10b981; }
    .score-color-5 { background: #059669; }

    .opp-score {
      opacity: 0.85;
    }

    /* WINNER CARD */
    .winner-card {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(16px);
      border: 2px solid var(--color-green);
      border-radius: var(--radius-lg);
      padding: 30px;
      text-align: center;
      color: #ffffff;
      box-shadow: 0 10px 35px rgba(16, 185, 129, 0.25);
    }

    .winner-card.tie-card {
      border-color: var(--accent-amber);
      box-shadow: 0 10px 35px rgba(245, 158, 11, 0.25);
    }

    .winner-trophy {
      font-size: 3.5rem;
      color: var(--color-green);
      margin-bottom: 12px;
    }

    .winner-subtitle {
      color: #cbd5e1;
      margin-bottom: 20px;
    }

    .secrets-summary {
      display: flex;
      justify-content: center;
      gap: 20px;
      background: rgba(255, 255, 255, 0.08);
      padding: 12px 20px;
      border-radius: var(--radius-md);
      margin-bottom: 20px;
      color: #ffffff;
    }

    .secret-item {
      font-size: 0.95rem;
      font-weight: 600;
    }

    .play-again-action {
      display: flex;
      justify-content: center;
    }

    .btn-play-again {
      padding: 12px 28px;
      font-size: 1.05rem;
    }

    /* SCOREBOARD CARD */
    .scoreboard-card {
      padding: 16px;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: var(--radius-lg);
      color: #ffffff;
    }

    .sc-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .sc-card-header h4 {
      font-size: 0.95rem;
      font-weight: 800;
      color: #ffffff;
    }

    .btn-reset-sc {
      background: none;
      border: none;
      color: #cbd5e1;
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
      padding: 6px 10px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 0.85rem;
      color: #ffffff;
    }

    .sc-name {
      font-weight: 700;
    }

    .sc-val {
      color: var(--accent-amber);
    }

    .p-emoji {
      margin-right: 4px;
    }

    .sc-empty-text {
      font-size: 0.82rem;
      color: #cbd5e1;
      font-style: italic;
      text-align: center;
      padding: 8px 0;
    }

    /* PLAYERS CARD */
    .players-card {
      padding: 16px;
    }

    .players-card h4 {
      font-size: 0.95rem;
      font-weight: 800;
      margin-bottom: 12px;
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
      border-radius: var(--radius-md);
      background: #fbf9f5;
      border: 1px solid transparent;
    }

    .player-item.is-active-turn {
      border-color: var(--accent-amber);
      background: #fffbf0;
    }

    .player-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #f1ece6;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent-amber);
    }

    .player-details {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .p-name {
      font-weight: 700;
      font-size: 0.9rem;
    }

    .you-badge {
      font-size: 0.75rem;
      color: var(--accent-amber);
      font-weight: 600;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .status-dot.green { background: var(--color-green); }
    .status-dot.orange { background: var(--accent-amber); }

    /* PAST GAMES HISTORY */
    .past-games-card {
      padding: 16px;
    }
    .past-games-card h4 {
      font-size: 0.95rem;
      font-weight: 800;
      margin-bottom: 10px;
    }
    .past-games-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .past-game-item {
      background: #fbf9f5;
      border: 1px solid var(--border-subtle);
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 0.82rem;
    }
    .pg-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .pg-winner-badge {
      color: var(--accent-amber);
      font-weight: 700;
    }
    .pg-details {
      color: var(--text-muted);
    }

    @media (max-width: 860px) {
      .game-grid {
        grid-template-columns: 1fr;
      }
      .play-split-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class GameBoardComponent implements OnInit, DoCheck, OnDestroy {
  mySecretInput: string = '';
  showSecret: boolean = false;
  showMySecretInGame: boolean = true;
  guessInput: string = '';
  copiedCode: boolean = false;

  hoveredWord: string | null = null;
  hoveredWordDefinition: string | null = null;
  definitionCacheMap: Map<string, string> = new Map();

  showMyTurnBanner: boolean = false;
  private previousIsMyTurn: boolean = false;
  private bannerTimer: any = null;

  dbStatsMap: { [winner_name: string]: number } = {};
  private dbStatsInterval: any = null;

  constructor(public gameSocket: GameSocketService) {}

  ngOnInit() {
    this.fetchDbStats();
    this.dbStatsInterval = setInterval(() => {
      this.fetchDbStats();
    }, 2500);
  }

  ngOnDestroy() {
    if (this.dbStatsInterval) {
      clearInterval(this.dbStatsInterval);
    }
  }

  ngDoCheck() {
    const currentIsMyTurn = this.isMyTurn();
    if (currentIsMyTurn && !this.previousIsMyTurn) {
      this.triggerTurnBanner();
    }
    this.previousIsMyTurn = currentIsMyTurn;
  }

  async fetchDbStats() {
    const state = this.gameSocket.gameState();
    const gameType = state?.game_type || 'numbers';
    try {
      this.dbStatsMap = await this.gameSocket.getGlobalStats(gameType);
    } catch (e) {}
  }

  getSortedDbStats(): { name: string; wins: number }[] {
    const map = this.dbStatsMap || {};
    const items = Object.keys(map).map(name => ({ name, wins: map[name] }));
    return items.sort((a, b) => b.wins - a.wins);
  }

  getRoomSeriesScore(): { p1Name: string; p1Wins: number; p2Name: string; p2Wins: number; ties: number } {
    const state = this.gameSocket.gameState();
    if (!state) {
      return { p1Name: 'Alina ❤️', p1Wins: 0, p2Name: 'Robabe 🤍', p2Wins: 0, ties: 0 };
    }

    const porder = state.player_order || [];
    const p1Id = porder[0];
    const p2Id = porder[1];

    const p1Name = p1Id ? state.players[p1Id]?.name : 'Jucător 1';
    const p2Name = p2Id ? state.players[p2Id]?.name : 'Jucător 2';

    let p1Wins = 0;
    let p2Wins = 0;
    let ties = 0;

    const history = state.past_games_history || [];
    history.forEach(g => {
      if (g.winner === 'TIE') {
        ties++;
      } else if (g.winner === p1Id || g.winner_name === p1Name) {
        p1Wins++;
      } else if (g.winner === p2Id || g.winner_name === p2Name) {
        p2Wins++;
      } else if (g.winner_name && g.winner_name.includes('Alina')) {
        if (p1Name.includes('Alina')) p1Wins++; else p2Wins++;
      } else if (g.winner_name && g.winner_name.includes('Robabe')) {
        if (p1Name.includes('Robabe')) p1Wins++; else p2Wins++;
      }
    });

    if (state.state === 'FINISHED' && state.winner) {
      if (state.winner === 'TIE') {
        ties++;
      } else if (state.winner === p1Id) {
        p1Wins++;
      } else if (state.winner === p2Id) {
        p2Wins++;
      }
    }

    return { p1Name, p1Wins, p2Name, p2Wins, ties };
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
    if (typeof val !== 'string') return false;
    const isWords = this.gameSocket.gameState()?.game_type === 'words';
    val = val.trim();
    if (isWords) {
      return val.length === 5 && /^[a-zA-ZăâîșțĂÂÎȘȚ]+$/.test(val);
    } else {
      return val.length === 4 && /^\d{4}$/.test(val);
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalKeyboard(event: KeyboardEvent) {
    const activeEl = document.activeElement;
    const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    const state = this.gameSocket.gameState();
    if (!state) return;

    const isWords = state.game_type === 'words';
    const maxLength = isWords ? 5 : 4;

    // STATE 1: WAITING_FOR_SECRETS
    if (state.state === 'WAITING_FOR_SECRETS' && !this.myPlayerInfo?.has_secret) {
      if (event.key === 'Enter') {
        this.submitSecret();
        return;
      }
      if (isInputFocused) {
        return; // Let standard input handle typing natively to prevent duplication
      }
      if (event.key === 'Backspace') {
        this.mySecretInput = this.mySecretInput.slice(0, -1);
      } else if (event.key.length === 1) {
        if (isWords && /^[a-zA-ZăâîșțĂÂÎȘȚ]$/.test(event.key)) {
          if (this.mySecretInput.length < maxLength) {
            this.mySecretInput += event.key.toUpperCase();
          }
        } else if (!isWords && /^\d$/.test(event.key)) {
          if (this.mySecretInput.length < maxLength) {
            this.mySecretInput += event.key;
          }
        }
      }
    }

    // STATE 2: PLAYING (MY TURN)
    else if (state.state === 'PLAYING' && this.isMyTurn()) {
      if (event.key === 'Enter') {
        this.submitGuess();
        return;
      }
      if (isInputFocused) {
        return; // Let standard input handle typing natively to prevent duplication
      }
      if (event.key === 'Backspace') {
        this.guessInput = this.guessInput.slice(0, -1);
      } else if (event.key.length === 1) {
        if (isWords && /^[a-zA-ZăâîșțĂÂÎȘȚ]$/.test(event.key)) {
          if (this.guessInput.length < maxLength) {
            this.guessInput += event.key.toUpperCase();
          }
        } else if (!isWords && /^\d$/.test(event.key)) {
          if (this.guessInput.length < maxLength) {
            this.guessInput += event.key;
          }
        }
      }
    }
  }

  submitSecret() {
    if (this.isValidSecret(this.mySecretInput)) {
      this.gameSocket.setSecret(this.mySecretInput.toUpperCase());
    }
  }

  submitGuess() {
    if (this.isMyTurn() && this.isValidSecret(this.guessInput)) {
      this.gameSocket.makeGuess(this.guessInput.toUpperCase());
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
      if (state.game_type === 'words') {
        return `Adversarul a ghicit ${count} ${count === 1 ? 'poziție' : 'poziții'}.`;
      } else {
        return `Adversarul a ghicit ${count} ${count === 1 ? 'cifră' : 'cifre'}.`;
      }
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

  async onWordHover(word: string) {
    if (!word || word.length !== 5 || this.gameSocket.gameState()?.game_type !== 'words') return;
    const cleanWord = word.toUpperCase();
    this.hoveredWord = cleanWord;

    if (this.definitionCacheMap.has(cleanWord)) {
      this.hoveredWordDefinition = this.definitionCacheMap.get(cleanWord) || '';
      return;
    }

    this.hoveredWordDefinition = 'Se încarcă definiția de pe Dexonline...';
    try {
      const def = await this.gameSocket.getWordDefinition(cleanWord);
      this.definitionCacheMap.set(cleanWord, def);
      if (this.hoveredWord === cleanWord) {
        this.hoveredWordDefinition = def;
      }
    } catch (e) {
      if (this.hoveredWord === cleanWord) {
        this.hoveredWordDefinition = 'Definiție indisponibilă pe Dexonline.';
      }
    }
  }

  onWordLeave() {
    this.hoveredWord = null;
    this.hoveredWordDefinition = null;
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
