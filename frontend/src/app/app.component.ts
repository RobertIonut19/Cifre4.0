import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameSocketService } from './services/game-socket.service';
import { LobbyComponent } from './components/lobby/lobby.component';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { LeaderboardComponent } from './components/leaderboard/leaderboard.component';

export type ActiveView = 'HUB' | 'GAME' | 'LEADERBOARD';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LobbyComponent, GameBoardComponent, LeaderboardComponent],
  template: `
    <div class="friv-app-wrapper">
      
      <!-- FRIV-STYLE TOP FLOATING QUICK BAR (NO TEXT HEADER TABS) -->
      <div class="friv-top-bar">
        <div class="friv-brand" (click)="openView('HUB')">
          <span class="friv-logo-icon">🕹️</span>
          <span class="friv-brand-title">La joc cu dragostea mea, iubirea mea, viața mea</span>
        </div>

        <div class="friv-top-actions">
          <!-- LEADERBOARD OVERLAY BUTTON -->
          <button 
            class="friv-btn-pill btn-stats" 
            [class.active]="activeView === 'LEADERBOARD'"
            (click)="openView(activeView === 'LEADERBOARD' ? 'HUB' : 'LEADERBOARD')">
            <i class="fa-solid fa-trophy text-amber"></i> Clasament
          </button>
        </div>
      </div>

      <!-- MAIN VIEW DISPLAY -->
      <main class="friv-main-canvas">
        
        <!-- VIEW 1: FRIV ARCADE HUB (DEFAULT GAME SELECTION GRID) -->
        <div *ngIf="activeView === 'HUB'" class="friv-view-container animate-pop-in">
          <app-lobby></app-lobby>
        </div>

        <!-- VIEW 2: GAME ARENA (ACTIVE GAME PLAYING) -->
        <div *ngIf="activeView === 'GAME' && isInActiveGame" class="friv-view-container animate-fade-in">
          <div class="game-canvas-header">
            <button class="btn-back-hub" (click)="openView('HUB')">
              <i class="fa-solid fa-arrow-left"></i> Înapoi la Meniu
            </button>
          </div>
          <app-game-board></app-game-board>
        </div>

        <!-- VIEW 3: LEADERBOARD OVERLAY SCREEN -->
        <div *ngIf="activeView === 'LEADERBOARD'" class="friv-view-container animate-fade-in">
          <div class="game-canvas-header">
            <button class="btn-back-hub" (click)="openView('HUB')">
              <i class="fa-solid fa-arrow-left"></i> Înapoi la Jocuri
            </button>
          </div>
          <app-leaderboard></app-leaderboard>
        </div>

      </main>
    </div>
  `,
  styles: [`
    .friv-app-wrapper {
      min-height: 100vh;
      background: transparent;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    /* TOP MINIMALIST FLOATING BAR */
    .friv-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 24px;
      background: rgba(15, 12, 41, 0.7);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      position: sticky;
      top: 0;
      z-index: 9999;
    }

    .friv-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
    }

    .friv-logo-icon {
      font-size: 1.8rem;
      filter: drop-shadow(0 0 10px rgba(236, 72, 153, 0.8));
    }

    .friv-brand-title {
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: 0.3px;
      background: linear-gradient(90deg, #ec4899, #8b5cf6, #f59e0b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 2px 10px rgba(0,0,0,0.3);
    }

    .friv-tag {
      background: #ec4899;
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 12px;
      letter-spacing: 1px;
    }

    .friv-top-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .friv-btn-pill {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      font-size: 0.88rem;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 20px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .friv-btn-pill:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-2px);
    }

    .friv-btn-pill.active {
      background: #8b5cf6;
      border-color: #a78bfa;
      box-shadow: 0 0 15px rgba(139, 92, 246, 0.6);
    }

    .btn-live-game {
      background: #10b981;
      border-color: #34d399;

    }

    .pulse {
      animation: livePulse 1.5s infinite;
    }

    @keyframes livePulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.8); }
      70% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .friv-main-canvas {
      flex: 1;
      width: 100%;
    }

    .friv-view-container {
      width: 100%;
    }

    .game-canvas-header {
      padding: 16px 24px 0 24px;
      max-width: 1280px;
      margin: 0 auto;
    }

    .btn-back-hub {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #ffffff;
      font-size: 0.9rem;
      font-weight: 700;
      padding: 8px 18px;
      border-radius: 20px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;
    }

    .btn-back-hub:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateX(-3px);
    }

    .no-game-arcade-card {
      max-width: 480px;
      margin: 80px auto;
      padding: 40px 30px;
      text-align: center;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 24px;
    }

    .empty-ghost-icon {
      font-size: 3.5rem;
      color: #a78bfa;
      margin-bottom: 12px;
      opacity: 0.8;
    }

    .no-game-arcade-card h2 {
      font-size: 1.5rem;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .no-game-arcade-card p {
      color: #cbd5e1;
      margin-bottom: 24px;
    }

    .btn-arcade-go {
      background: linear-gradient(90deg, #ec4899, #8b5cf6);
      border: none;
      padding: 12px 28px;
      font-size: 1rem;
      font-weight: 800;
      border-radius: 12px;
      cursor: pointer;
    }

    @media (max-width: 600px) {
      .friv-top-bar {
        padding: 10px 14px;
      }
      .friv-brand-title {
        font-size: 0.75rem;
      }
      .friv-btn-pill {
        padding: 6px 12px;
        font-size: 0.8rem;
      }
    }
  `]
})
export class AppComponent {
  activeView: ActiveView = 'HUB';
  private autoSwitched: boolean = false;

  constructor(public gameSocket: GameSocketService) {
    // Automatically switch to GAME view when connected with state, or to HUB view when disconnected
    effect(() => {
      const isConnected = this.gameSocket.isConnected();
      const hasState = !!this.gameSocket.gameState();
      if (isConnected && hasState) {
        this.activeView = 'GAME';
      } else if (!isConnected || !hasState) {
        if (this.activeView === 'GAME') {
          this.activeView = 'HUB';
        }
      }
    });
  }

  get isInActiveGame(): boolean {
    return this.gameSocket.isConnected() && !!this.gameSocket.gameState();
  }

  openView(view: ActiveView) {
    this.activeView = view;
  }
}
