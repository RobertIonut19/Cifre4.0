import { Component, DoCheck } from '@angular/core';
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

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule, FormsModule, NotesPanelComponent, ChatComponent],
  template: `
    <div *ngIf="gameSocket.gameState() as state" class="board-wrapper animate-fade-in">
      
      <!-- CUTE DOG RUNNING TURN ANNOUNCEMENT ANIMATION & DARK OVERLAY -->
      <div *ngIf="showMyTurnBanner" class="dog-turn-backdrop" (click)="dismissTurnBanner()">
        <div class="dog-runner-container">
          <div class="speech-bubble">
            <div class="bubble-title">
              <i class="fa-solid fa-bullseye text-amber"></i> ESTE RÂNDUL TĂU! 🎯
            </div>
            <div class="bubble-text">Adversarul a mutat. Introdu numărul din 4 cifre pentru a ghici!</div>
          </div>
          <!-- Animated Dog Mascot -->
          <div class="dog-mascot">
            <div class="dog-emoji">🐶</div>
            <div class="dog-paws">🐾 🐾</div>
          </div>
        </div>
      </div>

      <!-- Top Navigation & Room Info Header -->
      <header class="glass-panel top-bar">
        <div class="brand">
          <i class="fa-solid fa-calculator text-amber"></i> CIFRE 4.0
        </div>

        <div class="room-info">
          <span class="room-code-badge" (click)="copyRoomCode()" title="Click pentru a copia codul">
            <i class="fa-solid fa-key"></i> Cod Cameră: <strong>{{ state.room_id }}</strong>
            <i class="fa-solid fa-copy copy-icon"></i>
          </span>
          <span *ngIf="copiedCode" class="copied-toast">Copiat!</span>
        </div>

        <button class="btn btn-secondary btn-sm" (click)="gameSocket.disconnect()">
          <i class="fa-solid fa-right-from-bracket"></i> Părăsește Camera
        </button>
      </header>

      <!-- Main Layout Grid -->
      <div class="game-grid">
        <!-- Left Column: Main Game Console & History -->
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
              <p class="text-muted">Alege un număr din 4 cifre (ex: 0000 - 9999). Adversarul tău va încerca să îl ghicească!</p>
            </div>

            <div *ngIf="!myPlayerInfo?.has_secret; else waitingOpponentSecret" class="secret-form-box">
              <label class="form-label">Introdu cele 4 cifre secrete:</label>
              <div class="secret-input-row">
                <div class="secret-input-wrapper">
                  <input 
                    [type]="showSecret ? 'text' : 'password'" 
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
                  <h3>Numărul tău secret a fost înregistrat cu succes!</h3>
                  <p class="text-muted">În așteptare ca și celălalt jucător să își aleagă numărul...</p>
                </div>
              </div>
            </ng-template>
          </div>

          <!-- STATE 3 & 4: PLAYING & FINISHED -->
          <div *ngIf="state.state === 'PLAYING' || state.state === 'FINISHED'" class="main-play-container">
            
            <!-- SECTION 1 (TOP): MY SECRET NUMBER -->
            <div class="glass-panel section-card section-secret-status">
              <div class="section-badge"><i class="fa-solid fa-shield-halved"></i> SECTOR 1: NUMĂRUL TĂU SECRET</div>
              <div class="secret-display-box">
                <div class="secret-label">Numărul tău secret păstrat:</div>
                <div class="secret-value">
                  <span *ngIf="showMySecretInGame" class="secret-digits">{{ myPlayerInfo?.secret || '????' }}</span>
                  <span *ngIf="!showMySecretInGame" class="secret-masked">••••</span>
                  <button class="btn-toggle-eye" (click)="showMySecretInGame = !showMySecretInGame">
                    <i class="fa-solid" [class.fa-eye]="!showMySecretInGame" [class.fa-eye-slash]="showMySecretInGame"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- VISUAL DIVIDER -->
            <div class="section-divider">
              <span><i class="fa-solid fa-arrows-up-down"></i> CONSOLA INTERACTIVĂ DE JOC <i class="fa-solid fa-arrows-up-down"></i></span>
            </div>

            <!-- SECTION 2 (MIDDLE): GUESSING ACTION CONSOLE -->
            <div *ngIf="state.state === 'PLAYING'" class="glass-panel section-card section-guessing-console" [class.turn-mine-card]="isMyTurn()">
              <div class="section-badge badge-action"><i class="fa-solid fa-keyboard"></i> SECTOR 2: CONSOLĂ DE GHICIT (RUNDA {{ getCurrentRoundNumber() }})</div>
              
              <!-- Turn Status Header -->
              <div class="turn-status-header" [class.is-mine]="isMyTurn()">
                <div class="turn-title">
                  <span *ngIf="isMyTurn()"><i class="fa-solid fa-crosshair text-amber"></i> RÂNDUL TĂU SĂ GHICEȘTI!</span>
                  <span *ngIf="!isMyTurn()"><i class="fa-solid fa-hourglass-half fa-spin"></i> RÂNDUL LUI {{ state.current_turn_name?.toUpperCase() }}...</span>
                </div>
                <div class="turn-desc">
                  Runda {{ getCurrentRoundNumber() }} (Pasul {{ getTurnInRound() }}/2). Ambii jucători au ocazia să ghicească pe rundă.
                </div>
              </div>

              <!-- Guess Controls Form -->
              <div class="guess-input-box" [class.opacity-disabled]="!isMyTurn()">
                <label for="guessNumInput"><i class="fa-solid fa-lightbulb"></i> Introdu numărul din 4 cifre pentru adversar:</label>
                <div class="guess-controls">
                  <input 
                    type="text" 
                    id="guessNumInput"
                    class="form-input guess-input" 
                    placeholder="0000" 
                    [(ngModel)]="guessInput" 
                    maxlength="4"
                    [disabled]="!isMyTurn()"
                    (keyup.enter)="submitGuess()">
                  <button class="btn btn-primary btn-guess" (click)="submitGuess()" [disabled]="!isMyTurn() || !isValidSecret(guessInput)">
                    <i class="fa-solid fa-paper-plane"></i> Trimite Încercarea
                  </button>
                </div>
              </div>
            </div>

            <!-- GAME OVER / WINNER OR TIE BOX WITH "JOACĂ DIN NOU" BUTTON -->
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

            <!-- VISUAL DIVIDER BEFORE HISTORY -->
            <div class="section-divider">
              <span><i class="fa-solid fa-table-list"></i> ISTORIC PE RUNDE (TIMP DE GÂNDIRE & REZULTATE)</span>
            </div>

            <!-- SECTION 3 (BOTTOM): ROUND-BASED HISTORY WITH TIME TAKEN -->
            <div class="glass-panel section-card section-history-rounds">
              <div class="section-badge"><i class="fa-solid fa-list-check"></i> SECTOR 3: REZULTATE RUNDE SPILTUITE</div>
              
              <div *ngIf="getRoundGroups().length === 0" class="no-history">
                <p>Nicio rundă completată încă. Începe Runda 1!</p>
              </div>

              <!-- Round Cards Display -->
              <div class="rounds-container" *ngIf="getRoundGroups().length > 0">
                <div *ngFor="let rg of getRoundGroups()" class="round-card" [class.round-complete]="rg.isComplete">
                  <div class="round-card-header">
                    <span class="round-title"><i class="fa-solid fa-layer-group"></i> RUNDA {{ rg.roundNumber }}</span>
                    <span class="round-status-tag" [class.tag-done]="rg.isComplete">
                      {{ rg.isComplete ? 'Rundă Încheiată' : 'Rundă în Curs' }}
                    </span>
                  </div>

                  <!-- Pair of Guesses in this Round (Player 1 & Player 2) -->
                  <div class="round-pair-grid">
                    <!-- Player 1 Guess Column -->
                    <div class="player-guess-box">
                      <div class="p-header"><i class="fa-solid fa-user"></i> {{ rg.p1Name }}</div>
                      <div *ngIf="rg.p1Guess" class="p-body">
                        <div class="guess-digits-time">
                          <span class="guess-num-badge">{{ rg.p1Guess.guess }}</span>
                          <span *ngIf="rg.p1Guess.time_taken_seconds !== undefined" class="time-taken-badge" title="Timp de gândire pentru această mutare">
                            <i class="fa-solid fa-stopwatch"></i> {{ rg.p1Guess.time_taken_seconds }}s
                          </span>
                        </div>
                        <span class="badge" [class.badge-green]="rg.p1Guess.exact_matches > 0" [class.badge-red]="rg.p1Guess.exact_matches === 0">
                          {{ rg.p1Guess.exact_matches }} {{ rg.p1Guess.exact_matches === 1 ? 'cifră' : 'cifre' }} corect
                        </span>
                      </div>
                      <div *ngIf="!rg.p1Guess" class="p-waiting">În așteptarea mutării...</div>
                    </div>

                    <div class="vs-badge">VS</div>

                    <!-- Player 2 Guess Column -->
                    <div class="player-guess-box">
                      <div class="p-header"><i class="fa-solid fa-user"></i> {{ rg.p2Name }}</div>
                      <div *ngIf="rg.p2Guess" class="p-body">
                        <div class="guess-digits-time">
                          <span class="guess-num-badge">{{ rg.p2Guess.guess }}</span>
                          <span *ngIf="rg.p2Guess.time_taken_seconds !== undefined" class="time-taken-badge" title="Timp de gândire pentru această mutare">
                            <i class="fa-solid fa-stopwatch"></i> {{ rg.p2Guess.time_taken_seconds }}s
                          </span>
                        </div>
                        <span class="badge" [class.badge-green]="rg.p2Guess.exact_matches > 0" [class.badge-red]="rg.p2Guess.exact_matches === 0">
                          {{ rg.p2Guess.exact_matches }} {{ rg.p2Guess.exact_matches === 1 ? 'cifră' : 'cifre' }} corect
                        </span>
                      </div>
                      <div *ngIf="!rg.p2Guess" class="p-waiting">
                        <i class="fa-solid fa-clock"></i> Urmează să ghicească...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes Panel Component -->
          <app-notes-panel></app-notes-panel>
        </div>

        <!-- Right Section: Chat & Players list & Past Games History -->
        <div class="right-section">
          <!-- Players Box -->
          <div class="glass-panel players-card">
            <h4><i class="fa-solid fa-users text-amber"></i> Jucători în Cameră</h4>
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

          <!-- PAST GAMES CUMULATIVE HISTORY (CAND SE JOACA JOCUL 2, 3 ETC.) -->
          <div *ngIf="state.past_games_history && state.past_games_history.length > 0" class="glass-panel past-games-card animate-fade-in">
            <h4><i class="fa-solid fa-trophy text-amber"></i> Istoric Meciuri Anterioare</h4>
            
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

    /* DARK BACKDROP & RUNNING DOG ANIMATION */
    .dog-turn-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      z-index: 99999;
      cursor: pointer;
      overflow: hidden;
    }

    .dog-runner-container {
      position: absolute;
      top: 45%;
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: dogRunAcross 2.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    }

    @keyframes dogRunAcross {
      0% {
        left: -220px;
        opacity: 0;
        transform: translateY(-50%) scale(0.8);
      }
      35% {
        left: 50%;
        opacity: 1;
        transform: translate(-50%, -50%) scale(1.15);
      }
      70% {
        left: 50%;
        opacity: 1;
        transform: translate(-50%, -50%) scale(1.15);
      }
      100% {
        left: 125%;
        opacity: 0;
        transform: translate(0, -50%) scale(0.9);
      }
    }

    .speech-bubble {
      background: #ffffff;
      border: 3px solid var(--accent-amber);
      border-radius: 18px;
      padding: 14px 24px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      position: relative;
      margin-bottom: 12px;
      animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .speech-bubble::after {
      content: '';
      position: absolute;
      bottom: -12px;
      left: 50%;
      transform: translateX(-50%);
      border-width: 12px 12px 0;
      border-style: solid;
      border-color: var(--accent-amber) transparent;
      display: block;
      width: 0;
    }

    .bubble-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--accent-amber);
      margin-bottom: 4px;
    }

    .bubble-text {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-main);
    }

    .dog-mascot {
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: dogBounce 0.3s infinite alternate ease-in-out;
    }

    @keyframes dogBounce {
      from { transform: translateY(0); }
      to { transform: translateY(-10px); }
    }

    .dog-emoji {
      font-size: 5rem;
      line-height: 1;
      filter: drop-shadow(0 8px 16px rgba(0,0,0,0.3));
    }

    .dog-paws {
      font-size: 1.4rem;
      margin-top: 4px;
    }

    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 24px;
      margin-bottom: 20px;
    }

    .brand {
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: var(--text-main);
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
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.95rem;
      color: var(--text-main);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.2s;
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
      gap: 20px;
    }

    @media (max-width: 900px) {
      .game-grid {
        grid-template-columns: 1fr;
      }
    }

    .left-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .right-section {
      display: flex;
      flex-direction: column;
      gap: 20px;
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

    .section-card {
      padding: 20px;
      position: relative;
    }

    .section-badge {
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 1px;
      color: var(--text-muted);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .badge-action {
      color: var(--accent-amber);
    }

    .section-secret-status {
      background: #fbf9f5;
      border: 1px solid #e8e1d7;
    }

    .secret-display-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #ffffff;
      padding: 12px 20px;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
    }

    .secret-label {
      font-weight: 600;
      color: var(--text-main);
    }

    .secret-value {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.5rem;
      font-weight: 800;
      font-family: 'Outfit', monospace;
      color: var(--accent-amber);
      letter-spacing: 4px;
    }

    .btn-toggle-eye {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1.1rem;
    }

    .section-divider {
      text-align: center;
      margin: 4px 0;
      position: relative;
    }

    .section-divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      border-top: 2px dashed #e2d9ce;
      z-index: 1;
    }

    .section-divider span {
      position: relative;
      z-index: 2;
      background: var(--bg-primary);
      padding: 4px 16px;
      font-size: 0.75rem;
      font-weight: 800;
      color: #928377;
      letter-spacing: 1px;
    }

    .section-guessing-console {
      background: #ffffff;
      border: 2px solid var(--border-color);
      box-shadow: 0 10px 25px rgba(60, 45, 35, 0.08);
      transition: all 0.3s;
    }

    .section-guessing-console.turn-mine-card {
      border-color: var(--accent-amber);
      background: #fffdf9;
      box-shadow: 0 10px 30px rgba(217, 119, 6, 0.15);
    }

    .turn-status-header {
      padding: 12px 16px;
      background: #f1ece6;
      border-radius: var(--radius-md);
      margin-bottom: 16px;
    }

    .turn-status-header.is-mine {
      background: #fef3c7;
      border: 1px solid #fde68a;
    }

    .turn-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 2px;
    }

    .turn-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .guess-input-box label {
      display: block;
      font-weight: 700;
      margin-bottom: 8px;
      color: var(--text-main);
    }

    .guess-controls {
      display: flex;
      gap: 12px;
    }

    .guess-input {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: 6px;
      max-width: 200px;
      text-align: center;
      background: #ffffff;
    }

    .btn-guess {
      padding: 12px 24px;
      font-size: 1rem;
    }

    .opacity-disabled {
      opacity: 0.55;
      pointer-events: none;
    }

    .rounds-container {
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: 380px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .round-card {
      background: #fbf9f5;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 14px;
    }

    .round-card.round-complete {
      background: #ffffff;
      border-color: #dcd4c9;
    }

    .round-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .round-title {
      font-size: 0.95rem;
      font-weight: 800;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .round-status-tag {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 12px;
      background: #f1ece6;
      color: var(--text-muted);
    }

    .round-status-tag.tag-done {
      background: var(--color-green-bg);
      color: var(--color-green);
    }

    .round-pair-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 12px;
    }

    .player-guess-box {
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 10px 14px;
    }

    .p-header {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .p-body {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .guess-digits-time {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .guess-num-badge {
      font-family: 'Outfit', monospace;
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: 2px;
      color: var(--accent-amber);
    }

    .time-taken-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #92400e;
      background: #fef3c7;
      padding: 2px 6px;
      border-radius: 6px;
    }

    .p-waiting {
      font-size: 0.85rem;
      color: var(--text-light);
      font-style: italic;
    }

    .vs-badge {
      font-size: 0.75rem;
      font-weight: 800;
      color: #b0a396;
      background: #f1ece6;
      padding: 4px 8px;
      border-radius: 50%;
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
      max-height: 220px;
      overflow-y: auto;
    }

    .past-game-item {
      background: #fbf9f5;
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      padding: 10px 12px;
    }

    .pg-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.9rem;
      margin-bottom: 4px;
    }

    .pg-winner-badge {
      font-weight: 700;
      color: var(--accent-amber);
      font-size: 0.85rem;
    }

    .pg-details {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
  `]
})
export class GameBoardComponent implements DoCheck {
  mySecretInput: string = '';
  showSecret: boolean = false;
  showMySecretInGame: boolean = false;
  guessInput: string = '';
  copiedCode: boolean = false;

  showMyTurnBanner: boolean = false;
  private previousIsMyTurn: boolean = false;
  private bannerTimer: any = null;

  constructor(public gameSocket: GameSocketService) {}

  ngDoCheck() {
    const currentIsMyTurn = this.isMyTurn();
    if (currentIsMyTurn && !this.previousIsMyTurn) {
      this.triggerTurnBanner();
    }
    this.previousIsMyTurn = currentIsMyTurn;
  }

  triggerTurnBanner() {
    this.showMyTurnBanner = true;
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
    }
    // Auto-hide dog animation pop-up after 2.3 seconds
    this.bannerTimer = setTimeout(() => {
      this.showMyTurnBanner = false;
    }, 2300);
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
