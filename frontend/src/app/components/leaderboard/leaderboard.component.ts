import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameSocketService } from '../../services/game-socket.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="leaderboard-page-container animate-fade-in">
      <div class="glass-panel leaderboard-hero-card">
        
        <div class="hero-header">
          <div class="hero-icon-badge">
            <i class="fa-solid fa-trophy"></i>
          </div>
          <h1 class="hero-title">Clasament General & Statistici</h1>
          <p class="hero-subtitle">Evidență meciuri salvate permanent în baza de date PostgreSQL</p>
        </div>

        <!-- CATEGORY FILTER TABS -->
        <div class="category-tabs">
          <button 
            class="cat-tab-btn" 
            [class.active]="selectedTab === 'ALL'" 
            (click)="setTab('ALL')">
            <i class="fa-solid fa-globe"></i> General
          </button>
          <button 
            class="cat-tab-btn" 
            [class.active]="selectedTab === 'numbers'" 
            (click)="setTab('numbers')">
            <i class="fa-solid fa-calculator"></i> Cifre 4
          </button>
          <button 
            class="cat-tab-btn" 
            [class.active]="selectedTab === 'words'" 
            (click)="setTab('words')">
            <i class="fa-solid fa-font"></i> Cuvinte 5
          </button>
        </div>

        <!-- PODIUM FOR TOP 3 PLAYERS -->
        <div *ngIf="topThree.length > 0" class="podium-section">
          <!-- Rank 2 -->
          <div *ngIf="topThree[1]" class="podium-card rank-2">
            <div class="podium-avatar">🥈</div>
            <div class="podium-name">{{ topThree[1].name }}</div>
            <div class="podium-score">{{ topThree[1].wins }} victorii</div>
          </div>

          <!-- Rank 1 -->
          <div *ngIf="topThree[0]" class="podium-card rank-1">
            <div class="podium-crown">👑</div>
            <div class="podium-avatar">🥇</div>
            <div class="podium-name">{{ topThree[0].name }}</div>
            <div class="podium-score">{{ topThree[0].wins }} victorii</div>
          </div>

          <!-- Rank 3 -->
          <div *ngIf="topThree[2]" class="podium-card rank-3">
            <div class="podium-avatar">🥉</div>
            <div class="podium-name">{{ topThree[2].name }}</div>
            <div class="podium-score">{{ topThree[2].wins }} victorii</div>
          </div>
        </div>

        <!-- DETAILED PLAYERS RANKING LIST -->
        <div *ngIf="sortedStats.length > 0" class="ranking-list-container">
          <div class="ranking-list-header">
            <span>Poziție</span>
            <span>Jucător</span>
            <span class="text-right">Scor Victorii</span>
          </div>

          <div class="ranking-list-body">
            <div *ngFor="let item of sortedStats; let idx = index" class="ranking-row" [class.highlight-top]="idx < 3">
              <div class="rank-badge">
                <span *ngIf="idx === 0">🥇 #1</span>
                <span *ngIf="idx === 1">🥈 #2</span>
                <span *ngIf="idx === 2">🥉 #3</span>
                <span *ngIf="idx > 2">#{{ idx + 1 }}</span>
              </div>
              
              <div class="player-info-cell">
                <i class="fa-solid fa-user-circle player-icon"></i>
                <span class="player-name-text">{{ item.name }}</span>
              </div>

              <div class="score-cell text-right">
                <strong class="score-number">{{ item.wins }}</strong>
                <span class="score-unit">{{ item.wins === 1 ? 'victorie' : 'victorii' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="sortedStats.length === 0" class="empty-stats-card">
          <i class="fa-solid fa-medal empty-icon"></i>
          <h3>Nicio victorie înregistrată încă</h3>
          <p>Joacă meciuri 1v1 sau vs Bot pentru a urca în clasament!</p>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .leaderboard-page-container {
      display: flex;
      justify-content: center;
      padding: 30px 20px;
      min-height: 85vh;
    }

    .leaderboard-hero-card {
      width: 100%;
      max-width: 820px;
      padding: 36px 30px;
      background: rgba(15, 23, 42, 0.78);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: var(--radius-lg);
      color: #ffffff;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
    }

    .hero-header {
      text-align: center;
      margin-bottom: 24px;
    }

    .hero-icon-badge {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(245, 158, 11, 0.2);
      border: 2px solid #f59e0b;
      color: #fef08a;
      font-size: 1.8rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
    }

    .hero-title {
      font-size: 2.2rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 4px;
    }

    .hero-subtitle {
      font-size: 0.9rem;
      color: #cbd5e1;
    }

    .category-tabs {
      display: flex;
      justify-content: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.08);
      padding: 4px;
      border-radius: var(--radius-md);
      margin-bottom: 28px;
    }

    .cat-tab-btn {
      flex: 1;
      max-width: 200px;
      padding: 10px 16px;
      background: transparent;
      border: none;
      font-size: 0.95rem;
      font-weight: 700;
      color: #cbd5e1;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.15s ease;
    }

    .cat-tab-btn.active {
      background: #f59e0b;
      color: #ffffff;
      box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);
    }

    /* PODIUM STYLES */
    .podium-section {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 32px;
      padding: 10px 0;
    }

    .podium-card {
      flex: 1;
      max-width: 180px;
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-lg);
      padding: 18px 12px;
      text-align: center;
      position: relative;
      color: #ffffff;
      box-shadow: 0 8px 25px rgba(0,0,0,0.25);
    }

    .rank-1 {
      border-color: #f59e0b;
      background: rgba(245, 158, 11, 0.18);
      transform: scale(1.08);
      z-index: 2;
    }

    .podium-crown {
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 1.5rem;
    }

    .podium-avatar {
      font-size: 2rem;
      margin-bottom: 6px;
    }

    .podium-name {
      font-weight: 800;
      font-size: 1rem;
      color: #ffffff;
      margin-bottom: 4px;
    }

    .podium-score {
      font-size: 0.85rem;
      font-weight: 700;
      color: #f59e0b;
    }

    /* DETAILED LIST */
    .ranking-list-container {
      background: rgba(15, 23, 42, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: var(--radius-lg);
      overflow: hidden;
      color: #ffffff;
    }

    .ranking-list-header {
      display: grid;
      grid-template-columns: 90px 1fr 140px;
      padding: 12px 18px;
      background: rgba(255, 255, 255, 0.06);
      font-size: 0.85rem;
      font-weight: 800;
      color: #cbd5e1;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .ranking-list-body {
      display: flex;
      flex-direction: column;
    }

    .ranking-row {
      display: grid;
      grid-template-columns: 90px 1fr 140px;
      align-items: center;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      transition: background 0.15s ease;
      color: #ffffff;
    }

    .ranking-row:last-child {
      border-bottom: none;
    }

    .ranking-row.highlight-top {
      background: rgba(245, 158, 11, 0.12);
    }

    .rank-badge {
      font-size: 0.9rem;
      font-weight: 800;
      color: #ffffff;
    }

    .player-info-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .player-icon {
      font-size: 1.4rem;
      color: #f59e0b;
    }

    .player-name-text {
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
    }

    .score-cell {
      display: flex;
      flex-direction: column;
    }

    .text-right { text-align: right; }

    .score-number {
      font-size: 1.15rem;
      font-weight: 800;
      color: #f59e0b;
    }

    .score-unit {
      font-size: 0.75rem;
      color: #cbd5e1;
    }

    .empty-stats-card {
      padding: 40px 20px;
      text-align: center;
      color: #cbd5e1;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 10px;
      opacity: 0.4;
    }

    @media (max-width: 600px) {
      .podium-section {
        flex-direction: column;
        align-items: center;
      }
      .podium-card { width: 100%; max-width: 100%; }
      .rank-1 { transform: none; }
    }
  `]
})
export class LeaderboardComponent implements OnInit {
  selectedTab: string = 'ALL';
  statsAll: { [name: string]: number } = {};
  statsNumbers: { [name: string]: number } = {};
  statsWords: { [name: string]: number } = {};

  constructor(public gameSocket: GameSocketService) {}

  ngOnInit() {
    this.fetchStats();
  }

  async fetchStats() {
    try {
      this.statsAll = await this.gameSocket.getGlobalStats();
      this.statsNumbers = await this.gameSocket.getGlobalStats('numbers');
      this.statsWords = await this.gameSocket.getGlobalStats('words');
    } catch (e) {}
  }

  setTab(tab: string) {
    this.selectedTab = tab;
  }

  get currentStatsMap(): { [name: string]: number } {
    if (this.selectedTab === 'numbers') return this.statsNumbers;
    if (this.selectedTab === 'words') return this.statsWords;
    return this.statsAll;
  }

  get sortedStats(): { name: string; wins: number }[] {
    const map = this.currentStatsMap || {};
    const items = Object.keys(map).map(name => ({ name, wins: map[name] }));
    return items.sort((a, b) => b.wins - a.wins);
  }

  get topThree(): { name: string; wins: number }[] {
    return this.sortedStats.slice(0, 3);
  }
}
