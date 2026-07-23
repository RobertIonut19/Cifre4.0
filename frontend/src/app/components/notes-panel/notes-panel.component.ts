import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type DigitState = 'NEUTRAL' | 'RED' | 'GREEN';

@Component({
  selector: 'app-notes-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="glass-panel notes-container animate-fade-in">
      <div class="notes-header">
        <h3><i class="fa-solid fa-clipboard-list text-amber"></i> Notițe & Matrice de Eliminare</h3>
        <button class="btn btn-secondary btn-sm" (click)="resetNotes()">
          <i class="fa-solid fa-rotate-left"></i> Resetează
        </button>
      </div>

      <p class="notes-hint">
        Bifează rapid cifrele per poziție: 
        <span class="legend-red"><i class="fa-solid fa-circle-xmark"></i> Roșu = Eliminat</span> | 
        <span class="legend-green"><i class="fa-solid fa-circle-check"></i> Verde = Posibil</span>
      </p>

      <!-- Matrix of 4 Positions Side-by-Side in 1 Row -->
      <div class="positions-grid">
        <div *ngFor="let posIdx of [0, 1, 2, 3]" class="position-card">
          <div class="position-title">
            <span>Poz {{ posIdx + 1 }}</span>
          </div>

          <!-- Quick Toggle Digit Buttons 0-9 -->
          <div class="digit-picker">
            <button 
              *ngFor="let digit of [0,1,2,3,4,5,6,7,8,9]" 
              class="digit-btn"
              [class.state-red]="matrix[posIdx][digit] === 'RED'"
              [class.state-green]="matrix[posIdx][digit] === 'GREEN'"
              (click)="toggleDigitState(posIdx, digit)"
              title="Click: Neutru -> Roșu -> Verde -> Neutru">
              {{ digit }}
            </button>
          </div>

          <!-- Two Columns: RED vs GREEN -->
          <div class="columns-split">
            <!-- Red Column -->
            <div class="column col-red">
              <div class="col-header"><i class="fa-solid fa-ban"></i> Eliminat</div>
              <div class="digits-list">
                <span *ngFor="let d of getDigitsInState(posIdx, 'RED')" class="tag tag-red">
                  {{ d }}
                </span>
                <span *ngIf="getDigitsInState(posIdx, 'RED').length === 0" class="empty-text">-</span>
              </div>
            </div>

            <!-- Green Column -->
            <div class="column col-green">
              <div class="col-header"><i class="fa-solid fa-check"></i> Posibil</div>
              <div class="digits-list">
                <span *ngFor="let d of getDigitsInState(posIdx, 'GREEN')" class="tag tag-green">
                  {{ d }}
                </span>
                <span *ngIf="getDigitsInState(posIdx, 'GREEN').length === 0" class="empty-text">-</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Freeform Text Scratchpad -->
      <div class="scratchpad-section">
        <label for="scratchNotes"><i class="fa-solid fa-pen-to-square"></i> Notițe Libere Text:</label>
        <textarea 
          id="scratchNotes"
          class="form-input scratchpad-textarea" 
          rows="2" 
          placeholder="Scrie deducțiile tale aici..."
          [(ngModel)]="freeTextNotes"
          (ngModelChange)="saveToLocalStorage()">
        </textarea>
      </div>
    </div>
  `,
  styles: [`
    .notes-container {
      padding: 14px 16px;
    }

    .notes-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .notes-header h3 {
      font-size: 1.05rem;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .text-amber {
      color: var(--accent-amber);
    }

    .btn-sm {
      padding: 4px 10px;
      font-size: 0.75rem;
    }

    .notes-hint {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-bottom: 10px;
    }

    .legend-red {
      color: var(--color-red);
      font-weight: 600;
    }

    .legend-green {
      color: var(--color-green);
      font-weight: 600;
    }

    /* 4 POSITIONS SIDE-BY-SIDE ON 1 SINGLE ROW */
    .positions-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }

    @media (max-width: 768px) {
      .positions-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .position-card {
      background: var(--bg-card-secondary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 8px;
    }

    .position-title {
      font-size: 0.8rem;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 6px;
      text-align: center;
    }

    .digit-picker {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 3px;
      margin-bottom: 6px;
    }

    .digit-btn {
      background: #f1ece6;
      border: 1px solid #e2d9cd;
      color: #574c43;
      border-radius: 4px;
      font-weight: 700;
      font-size: 0.8rem;
      padding: 3px 0;
      cursor: pointer;
      transition: all 0.12s ease;
    }

    .digit-btn:hover {
      background: #e6dfd4;
      color: var(--text-main);
    }

    .digit-btn.state-red {
      background: var(--color-red-bg);
      border-color: var(--color-red);
      color: var(--color-red);
    }

    .digit-btn.state-green {
      background: var(--color-green-bg);
      border-color: var(--color-green);
      color: var(--color-green);
    }

    .columns-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
    }

    .column {
      background: #ffffff;
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      padding: 4px;
      min-height: 34px;
    }

    .col-red {
      border-top: 2px solid var(--color-red);
    }

    .col-green {
      border-top: 2px solid var(--color-green);
    }

    .col-header {
      font-size: 0.65rem;
      font-weight: 700;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .col-red .col-header { color: var(--color-red); }
    .col-green .col-header { color: var(--color-green); }

    .digits-list {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
    }

    .tag {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
    }

    .tag-red {
      background: var(--color-red-bg);
      color: var(--color-red);
    }

    .tag-green {
      background: var(--color-green-bg);
      color: var(--color-green);
    }

    .empty-text {
      color: var(--text-light);
      font-size: 0.7rem;
    }

    .scratchpad-section {
      margin-top: 8px;
    }

    .scratchpad-section label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 4px;
      color: var(--text-main);
    }

    .scratchpad-textarea {
      resize: vertical;
      font-family: inherit;
      font-size: 0.85rem;
      padding: 6px 10px;
    }
  `]
})
export class NotesPanelComponent implements OnInit {
  matrix: DigitState[][] = [
    Array(10).fill('NEUTRAL'),
    Array(10).fill('NEUTRAL'),
    Array(10).fill('NEUTRAL'),
    Array(10).fill('NEUTRAL')
  ];

  freeTextNotes: string = '';

  ngOnInit() {
    this.loadFromLocalStorage();
  }

  toggleDigitState(posIdx: number, digit: number) {
    const currentState = this.matrix[posIdx][digit];
    let nextState: DigitState = 'NEUTRAL';
    if (currentState === 'NEUTRAL') {
      nextState = 'RED';
    } else if (currentState === 'RED') {
      nextState = 'GREEN';
    } else {
      nextState = 'NEUTRAL';
    }
    this.matrix[posIdx][digit] = nextState;
    this.saveToLocalStorage();
  }

  getDigitsInState(posIdx: number, state: DigitState): number[] {
    const res: number[] = [];
    for (let d = 0; d <= 9; d++) {
      if (this.matrix[posIdx][d] === state) {
        res.push(d);
      }
    }
    return res;
  }

  resetNotes() {
    this.matrix = [
      Array(10).fill('NEUTRAL'),
      Array(10).fill('NEUTRAL'),
      Array(10).fill('NEUTRAL'),
      Array(10).fill('NEUTRAL')
    ];
    this.freeTextNotes = '';
    localStorage.removeItem('game_notes_matrix');
    localStorage.removeItem('game_notes_text');
  }

  saveToLocalStorage() {
    localStorage.setItem('game_notes_matrix', JSON.stringify(this.matrix));
    localStorage.setItem('game_notes_text', this.freeTextNotes);
  }

  loadFromLocalStorage() {
    const savedMatrix = localStorage.getItem('game_notes_matrix');
    if (savedMatrix) {
      try {
        this.matrix = JSON.parse(savedMatrix);
      } catch (e) {}
    }
    const savedText = localStorage.getItem('game_notes_text');
    if (savedText) {
      this.freeTextNotes = savedText;
    }
  }
}
